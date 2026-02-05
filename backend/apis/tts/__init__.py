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


DEFAULT_TTS_MODEL = os.getenv("GEMINI_TTS_MODEL_NAME", "gemini-2.0-flash-tts")
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


def generate_tts(text: str, voice_config: Dict[str, Any] | None = None) -> bytes:
    """
    Generate audio bytes from text using Gemini TTS.

    voice_config is passed through best-effort; supported keys vary by model/version.
    Expected keys (best-effort):
      - model: override model name
      - mimeType: audio mime, e.g. 'audio/wav' or 'audio/mpeg'
      - voiceName / speakingRate / pitch (model-dependent)
    """
    if not text or not text.strip():
        raise ValueError("text must be a non-empty string")
    voice_config = voice_config or {}

    model = str(voice_config.get("model") or DEFAULT_TTS_MODEL)
    mime_type = str(voice_config.get("mimeType") or DEFAULT_AUDIO_MIME)

    client = genai.Client(api_key=_get_gemini_api_key())

    # Many Gemini TTS examples use generate_content with audio modality. Since SDK
    # shapes change, keep config generic and rely on extraction.
    contents = [
        types.Content(role="user", parts=[types.Part.from_text(text=text.strip())]),
    ]

    # Best-effort config: if the SDK supports these fields they will be used; if not,
    # it should ignore unknowns (or raise; then we'll surface the error).
    config_kwargs: Dict[str, Any] = {
        "temperature": 0.7,
    }

    # Attempt to express "audio response" intent.
    # Some SDK versions use response_modalities=["AUDIO"].
    config_kwargs["response_modalities"] = ["AUDIO"]

    # Attempt to pass mimeType/voice parameters if accepted.
    # (We keep as a nested dict to avoid importing newer schema objects.)
    if mime_type:
        config_kwargs["audio_config"] = {"mime_type": mime_type}

    # Voice style knobs (best-effort)
    for k in ("voiceName", "speakingRate", "pitch", "style", "languageCode"):
        if k in voice_config:
            config_kwargs.setdefault("voice_config", {})[k] = voice_config[k]

    config = types.GenerateContentConfig(**config_kwargs)  # type: ignore[arg-type]

    logger.info("Generating TTS audio via Gemini model=%s mimeType=%s", model, mime_type)
    resp = client.models.generate_content(model=model, contents=contents, config=config)
    return _extract_audio_bytes(resp)


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

    r = get_redis_client()
    cached_b64 = r.get(cache_key)
    if cached_b64:
        return f"data:{mime_type};base64,{cached_b64}"

    audio_bytes = generate_tts(text, voice_config)
    b64 = base64.b64encode(audio_bytes).decode("utf-8")
    # store base64 string with TTL
    if ttl_seconds and ttl_seconds > 0:
        r.setex(cache_key, ttl_seconds, b64)
    else:
        r.set(cache_key, b64)

    return f"data:{mime_type};base64,{b64}"

