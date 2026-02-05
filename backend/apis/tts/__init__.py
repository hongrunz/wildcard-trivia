"""
Gemini TTS service (google-genai) with Redis caching.

Primary entry points:
  - generate_tts(text, voice_config) -> bytes
  - get_audio_url(text, cache_key) -> str   (data: URL containing base64 audio)

Notes:
  - This repo's Redis client uses decode_responses=True, so we store base64 strings.
  - The google-genai SDK has evolved quickly; this module implements a best-effort
    extraction of audio bytes from the response. If the response schema changes,
    adjust `_extract_audio_bytes`.
"""

from __future__ import annotations

import base64
import hashlib
import logging
import os
from typing import Any, Dict, Optional

from dotenv import load_dotenv
from google import genai
from google.genai import types

from storage.client import get_redis_client

logger = logging.getLogger(__name__)


# Load backend/.env first (with override) so GEMINI_API_KEY from backend/.env is always used
_this_dir = os.path.dirname(os.path.abspath(__file__))
_backend_dir = os.path.abspath(os.path.join(_this_dir, "..", ".."))
_backend_env = os.path.join(_backend_dir, ".env")
if os.path.isfile(_backend_env):
    load_dotenv(_backend_env, override=True)
# Also load from project root and cwd so other vars are available
_root_env = os.path.join(_backend_dir, "..", ".env")
if os.path.isfile(_root_env):
    load_dotenv(_root_env)
load_dotenv()  # cwd .env


DEFAULT_TTS_MODEL = os.getenv("GEMINI_TTS_MODEL_NAME", "gemini-2.5-flash-native-audio-preview-12-2025")
DEFAULT_AUDIO_MIME = os.getenv("GEMINI_TTS_AUDIO_MIME", "audio/wav")
DEFAULT_CACHE_TTL_SECONDS = int(os.getenv("GEMINI_TTS_CACHE_TTL_SECONDS", "86400"))


def _get_gemini_api_key() -> str:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY environment variable is not set")
    return api_key


def _stable_cache_key(prefix: str, text: str, voice_config: Dict[str, Any]) -> str:
    """Helper for callers that want a deterministic key."""
    voice_part = str(sorted(voice_config.items())).encode("utf-8")
    h = hashlib.sha256()
    h.update(text.encode("utf-8"))
    h.update(b"|")
    h.update(voice_part)
    return f"{prefix}:{h.hexdigest()}"


def _pcm_to_wav(pcm_data: bytes, sample_rate: int = 24000, channels: int = 1, sample_width: int = 2) -> bytes:
    """
    Convert raw PCM audio data to WAV format.
    
    Args:
        pcm_data: Raw PCM audio bytes
        sample_rate: Sample rate in Hz (default: 24000 for Gemini Live API)
        channels: Number of audio channels (1 = mono, 2 = stereo)
        sample_width: Bytes per sample (2 = 16-bit)
    
    Returns:
        WAV file bytes
    """
    import struct
    
    # WAV file structure:
    # - RIFF header (12 bytes)
    # - fmt chunk (24 bytes)
    # - data chunk (8 + data bytes)
    
    data_size = len(pcm_data)
    fmt_chunk_size = 16  # Standard PCM fmt chunk size
    
    # WAV file structure:
    # - RIFF header: 12 bytes (4 "RIFF" + 4 size + 4 "WAVE")
    # - fmt chunk: 24 bytes (4 "fmt " + 4 size + 16 fmt data)
    # - data chunk: 8 + data_size bytes (4 "data" + 4 size + data)
    # Total: 44 + data_size bytes
    # RIFF size field = total - 8 (RIFF and size fields themselves)
    riff_size = 36 + data_size  # (44 + data_size) - 8
    
    # RIFF header
    wav = b'RIFF'
    wav += struct.pack('<I', riff_size)  # File size minus 8 bytes (RIFF + size fields)
    wav += b'WAVE'
    
    # fmt chunk
    wav += b'fmt '
    wav += struct.pack('<I', fmt_chunk_size)  # fmt chunk size
    wav += struct.pack('<H', 1)  # Audio format (1 = PCM)
    wav += struct.pack('<H', channels)  # Number of channels
    wav += struct.pack('<I', sample_rate)  # Sample rate
    wav += struct.pack('<I', sample_rate * channels * sample_width)  # Byte rate
    wav += struct.pack('<H', channels * sample_width)  # Block align
    wav += struct.pack('<H', sample_width * 8)  # Bits per sample
    
    # data chunk
    wav += b'data'
    wav += struct.pack('<I', data_size)  # Data size
    wav += pcm_data  # Audio data
    
    return wav


def _extract_audio_bytes(resp: Any) -> bytes:
    """
    Best-effort extraction of audio bytes from a google-genai response.

    We try a few common shapes:
      - resp.audio / resp.audios
      - resp.candidates[0].content.parts[*].inline_data.data
      - resp.candidates[0].content.parts[*].blob / .data
    """
    # 1) direct attribute
    for attr in ("audio", "audios"):
        val = getattr(resp, attr, None)
        if val:
            if isinstance(val, (bytes, bytearray)):
                return bytes(val)
            if isinstance(val, str):
                # sometimes base64
                try:
                    return base64.b64decode(val)
                except Exception:
                    pass

    # 2) candidate parts
    candidates = getattr(resp, "candidates", None) or []
    for cand in candidates[:1]:
        content = getattr(cand, "content", None)
        parts = getattr(content, "parts", None) or []
        for p in parts:
            inline = getattr(p, "inline_data", None)
            if inline is not None:
                data = getattr(inline, "data", None)
                if isinstance(data, (bytes, bytearray)):
                    return bytes(data)
                if isinstance(data, str):
                    try:
                        return base64.b64decode(data)
                    except Exception:
                        pass
            blob = getattr(p, "blob", None)
            if isinstance(blob, (bytes, bytearray)):
                return bytes(blob)
            data = getattr(p, "data", None)
            if isinstance(data, (bytes, bytearray)):
                return bytes(data)
            if isinstance(data, str):
                try:
                    return base64.b64decode(data)
                except Exception:
                    pass

    # 3) raw text fallback (not audio, but occasionally SDK sets resp.text to base64)
    text = getattr(resp, "text", None)
    if isinstance(text, str) and text.strip():
        try:
            return base64.b64decode(text.strip())
        except Exception:
            pass

    raise RuntimeError("Could not extract audio bytes from Gemini TTS response")


def _list_available_models() -> list[str]:
    """List available models to help debug TTS model availability."""
    try:
        client = genai.Client(api_key=_get_gemini_api_key())
        models = client.models.list()
        model_names = [m.name for m in models if hasattr(m, 'name')]
        logger.info(f"Available models: {model_names[:10]}...")  # Log first 10
        return model_names
    except Exception as e:
        logger.warning(f"Failed to list models: {e}")
        return []


async def _generate_tts_async(text: str, voice_config: Dict[str, Any] | None = None) -> bytes:
    """
    Generate audio bytes from text using Gemini Live API (async).
    
    The native audio model requires the Live API, not generate_content.
    This is the async implementation that uses client.aio.live.connect().
    """
    if not text or not text.strip():
        raise ValueError("text must be a non-empty string")
    voice_config = voice_config or {}

    model = str(voice_config.get("model") or DEFAULT_TTS_MODEL)
    # Ensure model name has "models/" prefix if not present
    if not model.startswith("models/"):
        model = f"models/{model}"
    
    voice_name = voice_config.get("voiceName", "Zephyr")  # Default voice

    # Create client with v1beta API version (required for Live API)
    client = genai.Client(
        http_options={"api_version": "v1beta"},
        api_key=_get_gemini_api_key()
    )

    # Configure Live API for audio output
    config = types.LiveConnectConfig(
        response_modalities=["AUDIO"],
        speech_config=types.SpeechConfig(
            voice_config=types.VoiceConfig(
                prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name=voice_name)
            )
        ),
    )

    logger.info("Generating TTS audio via Gemini Live API model=%s voice=%s", model, voice_name)
    
    audio_chunks = []
    try:
        async with client.aio.live.connect(model=model, config=config) as session:
            # Send text input
            await session.send(input=text.strip(), end_of_turn=True)
            
            # Receive audio response
            turn = session.receive()
            async for response in turn:
                if response.data:
                    # response.data is the audio bytes (PCM format)
                    audio_chunks.append(response.data)
                if response.text:
                    # Log any text response (usually empty for TTS)
                    logger.debug(f"Text response: {response.text}")
            
            # Combine all audio chunks
            if audio_chunks:
                pcm_data = b''.join(audio_chunks)
                logger.info(f"Generated {len(pcm_data)} bytes of PCM audio")
                # Convert PCM to WAV format for browser playback
                # Gemini Live API returns PCM at 24kHz, 16-bit, mono
                wav_data = _pcm_to_wav(pcm_data, sample_rate=24000, channels=1, sample_width=2)
                logger.info(f"Converted to {len(wav_data)} bytes of WAV audio")
                return wav_data
            else:
                raise RuntimeError("No audio data received from Live API")
                
    except Exception as e:
        logger.error(f"Failed to generate TTS audio via Live API: {e}")
        raise


def generate_tts(text: str, voice_config: Dict[str, Any] | None = None) -> bytes:
    """
    Generate audio bytes from text using Gemini native audio model.
    
    This is a synchronous wrapper around the async Live API.
    The native audio model requires the Live API, not generate_content.
    
    voice_config is passed through best-effort; supported keys vary by model/version.
    Expected keys (best-effort):
      - model: override model name (will be prefixed with "models/" if needed)
      - mimeType: audio mime, e.g. 'audio/wav' or 'audio/mpeg'
      - voiceName: voice name (default: "Zephyr")
    """
    import asyncio
    import concurrent.futures
    
    if not text or not text.strip():
        raise ValueError("text must be a non-empty string")
    
    try:
        # Try to get existing event loop
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                # If loop is running, we need to run in a thread
                with concurrent.futures.ThreadPoolExecutor() as executor:
                    future = executor.submit(asyncio.run, _generate_tts_async(text, voice_config))
                    return future.result()
            else:
                # Loop exists but not running, use it
                return loop.run_until_complete(_generate_tts_async(text, voice_config))
        except RuntimeError:
            # No event loop, create new one
            return asyncio.run(_generate_tts_async(text, voice_config))
    except Exception as e:
        logger.error(f"Failed to generate TTS audio: {e}")
        # Return empty WAV as fallback
        empty_wav = (
            b'RIFF'  # ChunkID
            b'\x24\x00\x00\x00'  # ChunkSize (36 bytes)
            b'WAVE'  # Format
            b'fmt '  # Subchunk1ID
            b'\x10\x00\x00\x00'  # Subchunk1Size (16)
            b'\x01\x00'  # AudioFormat (PCM)
            b'\x01\x00'  # NumChannels (mono)
            b'\x44\xac\x00\x00'  # SampleRate (44100)
            b'\x88\x58\x01\x00'  # ByteRate
            b'\x02\x00'  # BlockAlign
            b'\x10\x00'  # BitsPerSample (16)
            b'data'  # Subchunk2ID
            b'\x00\x00\x00\x00'  # Subchunk2Size (0 - no audio data)
        )
        return empty_wav


def get_audio_url(
    text: str,
    cache_key: str,
    *,
    voice_config: Optional[Dict[str, Any]] = None,
    ttl_seconds: int = DEFAULT_CACHE_TTL_SECONDS,
) -> str:
    """
    Return a data URL containing base64-encoded audio.

    cache_key: caller-provided Redis key. (Use `_stable_cache_key` if you want determinism.)
    """
    if not cache_key:
        raise ValueError("cache_key is required")
    voice_config = voice_config or {}
    mime_type = str(voice_config.get("mimeType") or DEFAULT_AUDIO_MIME)

    # Log the text being spoken by the voice agent
    logger.info(f"VOICE AGENT SAYING: {text}")

    r = get_redis_client()
    cached_b64 = r.get(cache_key)
    if cached_b64:
        logger.debug(f"Using cached audio for text (first 50 chars): {text[:50]}...")
        return f"data:{mime_type};base64,{cached_b64}"

    audio_bytes = generate_tts(text, voice_config)
    b64 = base64.b64encode(audio_bytes).decode("utf-8")
    # store base64 string with TTL
    if ttl_seconds and ttl_seconds > 0:
        r.setex(cache_key, ttl_seconds, b64)
    else:
        r.set(cache_key, b64)

    return f"data:{mime_type};base64,{b64}"

