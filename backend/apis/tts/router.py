"""
TTS API endpoints
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

# Import orchestrator with error handling
try:
    from apis.tts.orchestrator import get_tts_orchestrator, synthesize_question_speech
    ORCHESTRATOR_AVAILABLE = True
except ImportError as e:
    ORCHESTRATOR_AVAILABLE = False
    print(f"⚠ TTS orchestrator not available: {e}")
    # Create dummy functions to prevent import errors
    def get_tts_orchestrator():
        raise RuntimeError("TTS orchestrator not available")
    def synthesize_question_speech(text: str):
        raise RuntimeError("TTS orchestrator not available")
except Exception as e:
    ORCHESTRATOR_AVAILABLE = False
    print(f"⚠ TTS orchestrator failed to import: {e}")
    def get_tts_orchestrator():
        raise RuntimeError("TTS orchestrator not available")
    def synthesize_question_speech(text: str):
        raise RuntimeError("TTS orchestrator not available")

router = APIRouter(prefix="/api/tts", tags=["tts"])


class SynthesizeRequest(BaseModel):
    text: str
    language_code: Optional[str] = "en-US"
    voice_name: Optional[str] = None
    ssml_gender: Optional[str] = None


class SynthesizeResponse(BaseModel):
    audio_content: str  # Base64 encoded audio
    audio_config: dict
    success: bool
    message: Optional[str] = None


@router.post("/synthesize", response_model=SynthesizeResponse)
async def synthesize_speech(request: SynthesizeRequest):
    """
    Synthesize speech from text using Google TTS Flash Preview via LangChain orchestrator.
    
    This endpoint uses a LangChain orchestrator that calls Google TTS to convert
    text to high-quality speech audio.
    """
    try:
        if not request.text or not request.text.strip():
            raise HTTPException(status_code=400, detail="Text cannot be empty")
        
        orchestrator = get_tts_orchestrator()
        result = orchestrator.synthesize_speech(
            text=request.text,
            language_code=request.language_code or "en-US",
            voice_name=request.voice_name,
            ssml_gender=request.ssml_gender
        )
        
        return SynthesizeResponse(
            audio_content=result["audio_content"],
            audio_config=result["audio_config"],
            success=True
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to synthesize speech: {str(e)}"
        )


@router.post("/question", response_model=SynthesizeResponse)
async def synthesize_question(request: SynthesizeRequest):
    """
    Synthesize speech for a trivia question.
    Optimized for question text with appropriate voice and pacing.
    """
    try:
        if not request.text or not request.text.strip():
            raise HTTPException(status_code=400, detail="Question text cannot be empty")
        
        if not ORCHESTRATOR_AVAILABLE:
            # Fallback: return error with helpful message
            raise HTTPException(
                status_code=503,
                detail="TTS service not available. TTS orchestrator dependencies may be missing. Check server logs for details."
            )
        
        result = synthesize_question_speech(request.text)
        
        return SynthesizeResponse(
            audio_content=result["audio_content"],
            audio_config=result["audio_config"],
            success=True
        )
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"TTS Error: {error_details}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to synthesize question speech: {str(e)}"
        )
