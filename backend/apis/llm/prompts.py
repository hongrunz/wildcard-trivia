"""
Gemini API integration for generating trivia questions (google-genai).
"""

import json
import logging
import os
from typing import Any, Dict, List

from dotenv import load_dotenv
from google import genai
from google.genai import types

# Set up logging
logging.basicConfig(level=logging.INFO)
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

MODEL_NAME = os.getenv("GEMINI_MODEL_NAME", "gemini-3-flash-preview")


def get_gemini_api_key() -> str:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY environment variable is not set")
    return api_key


def generate_questions_with_llm(topics: List[str], count: int) -> List[Dict[str, Any]]:
    """
    Returns list of dicts:
      { "question": str, "topics": str[], "options": str[], "correct_answer": int, "explanation": str }
    """

    client = genai.Client(api_key=get_gemini_api_key())

    topics_str = ", ".join(topics)
    prompt_text = f"""Generate {count} trivia questions on the following topics: {topics_str} where each question is related to one or two of the topics.

Return ONLY a valid JSON array of objects. Each object MUST have:
- "question": string
- "topics": array of strings, subset of topics_str, maximum 2 topics
- "options": array of exactly 4 strings
- "correct_answer": integer index 0-3 (0 means first option)
- "explanation": string

IMPORTANT: Return ONLY the JSON array. No trailing commas. No markdown formatting. No explanations. Just valid JSON.

Example format:
[
  {{
    "question": "What is the capital of France?",
    "topics": ["Geography"],
    "options": ["London", "Berlin", "Paris", "Madrid"],
    "correct_answer": 2,
    "explanation": "Paris is the capital and most populous city of France."
  }}
]
"""

    contents = [
        types.Content(
            role="user",
            parts=[types.Part.from_text(text=prompt_text)],
        )
    ]

    # Configure generation with moderate temperature for creative but reliable output
    config = types.GenerateContentConfig(
        temperature=1.0,  # Balanced for creativity while maintaining JSON reliability
    )

    # Non-streaming: easier to parse reliably
    try:
        logger.info(f"Calling Gemini API with model: {MODEL_NAME}")
        logger.info(f"Topics: {topics_str}, Count: {count}")
        
        resp = client.models.generate_content(
            model=MODEL_NAME,
            contents=contents,
            config=config,
        )
        
        logger.info("Gemini API call successful")
    except Exception as e:
        err_str = str(e).lower()
        if "api key not valid" in err_str or "invalid_argument" in err_str or "api_key_invalid" in err_str:
            raise RuntimeError(
                "Gemini API key is invalid or missing. Get a key at https://aistudio.google.com/app/apikey "
                "and set GEMINI_API_KEY in backend/.env or your environment."
            ) from e
        logger.error(f"Failed to call Gemini API: {e}")
        raise RuntimeError(f"Error calling Gemini API: {e}") from e

    response_text = getattr(resp, "text", None) or ""
    response_text = response_text.strip()
    
    logger.info(f"Raw response length: {len(response_text)} characters")
    logger.info(f"Raw response (first 500 chars):\n{response_text[:500]}")
    
    if not response_text:
        logger.error("Empty response from Gemini API")
        raise RuntimeError("Empty response from Gemini API")

    # Strip accidental code fences
    if response_text.startswith("```json"):
        response_text = response_text[7:]
    if response_text.startswith("```"):
        response_text = response_text[3:]
    if response_text.endswith("```"):
        response_text = response_text[:-3]
    response_text = response_text.strip()

    # Clean up common JSON issues from LLM responses
    def clean_json(text: str) -> str:
        """Remove trailing commas and other common JSON issues from LLM output"""
        import re
        # Remove trailing commas before closing brackets/braces
        text = re.sub(r',(\s*[}\]])', r'\1', text)
        # Remove trailing commas at end of lines
        text = re.sub(r',(\s*\n)', r'\1', text)
        return text

    try:
        questions = json.loads(response_text)
        logger.info(f"Successfully parsed JSON, got {len(questions) if isinstance(questions, list) else 0} items")
    except json.JSONDecodeError as e:
        # Try cleaning the JSON and parsing again
        logger.warning(f"Initial JSON parse failed: {e}. Attempting to clean JSON...")
        cleaned_text = clean_json(response_text)
        try:
            questions = json.loads(cleaned_text)
            logger.info(f"Successfully parsed cleaned JSON, got {len(questions) if isinstance(questions, list) else 0} items")
        except json.JSONDecodeError as e2:
            logger.error(f"Failed to parse JSON even after cleaning: {e2}")
            logger.error(f"Original error: {e}")
            logger.error(f"Problematic response:\n{response_text[:1000]}")
            raise ValueError(
                f"Failed to parse Gemini API response as JSON: {e}. Response: {response_text[:200]}"
            ) from e2

    formatted: List[Dict[str, Any]] = []
    if not isinstance(questions, list):
        logger.error(f"Response is not a list, got type: {type(questions)}")
        raise ValueError("Gemini response was not a JSON array.")

    for i, q in enumerate(questions):
        if not isinstance(q, dict):
            logger.warning(f"Question {i} is not a dict, skipping")
            continue
        options = q.get("options", [])[:4]
        correct = q.get("correct_answer", 0)
        try:
            correct_idx = int(correct)
        except Exception:
            logger.warning(f"Invalid correct_answer for question {i}: {correct}, defaulting to 0")
            correct_idx = 0
        formatted.append(
            {
                "question": q.get("question", ""),
                "topics": q.get("topics", []),
                "options": options,
                "correct_answer": correct_idx,
                "explanation": q.get("explanation", ""),
            }
        )

    result = formatted[:count]
    logger.info(f"Successfully formatted {len(result)} questions")
    if result:
        logger.info(f"Sample question: {result[0].get('question', 'N/A')[:100]}...")
    else:
        logger.warning("No questions generated")
    
    return result

