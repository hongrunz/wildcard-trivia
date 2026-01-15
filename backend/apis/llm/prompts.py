"""
Gemini API integration for generating trivia questions (google-genai).
"""

import json
import os
from typing import Any, Dict, List

from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()

MODEL_NAME = os.getenv("GEMINI_MODEL_NAME", "gemini-2.0-flash")


def get_gemini_api_key() -> str:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY environment variable is not set")
    return api_key


def generate_questions_with_llm(topics: List[str], count: int) -> List[Dict[str, Any]]:
    """
    Returns list of dicts:
      { "question": str, "options": [str,str,str,str], "correct_answer": int, "explanation": str }
    """

    client = genai.Client(api_key=get_gemini_api_key())

    topics_str = ", ".join(topics)
    prompt_text = f"""Generate {count} trivia questions on the following topics: {topics_str}.

Return ONLY a valid JSON array of objects. Each object MUST have:
- "question": string
- "options": array of exactly 4 strings
- "correct_answer": integer index 0-3 (0 means first option)
- "explanation": string
"""

    contents = [
        types.Content(
            role="user",
            parts=[types.Part.from_text(text=prompt_text)],
        )
    ]

    # Non-streaming: easier to parse reliably
    try:
        resp = client.models.generate_content(
            model=MODEL_NAME,
            contents=contents,
        )
    except Exception as e:
        raise RuntimeError(f"Error calling Gemini API: {e}") from e

    response_text = getattr(resp, "text", None) or ""
    response_text = response_text.strip()
    if not response_text:
        raise RuntimeError("Empty response from Gemini API")

    # Strip accidental code fences
    if response_text.startswith("```json"):
        response_text = response_text[7:]
    if response_text.startswith("```"):
        response_text = response_text[3:]
    if response_text.endswith("```"):
        response_text = response_text[:-3]
    response_text = response_text.strip()

    try:
        questions = json.loads(response_text)
    except json.JSONDecodeError as e:
        raise ValueError(
            f"Failed to parse Gemini API response as JSON: {e}. Response: {response_text[:200]}"
        ) from e

    formatted: List[Dict[str, Any]] = []
    if not isinstance(questions, list):
        raise ValueError("Gemini response was not a JSON array.")

    for q in questions:
        if not isinstance(q, dict):
            continue
        options = q.get("options", [])[:4]
        correct = q.get("correct_answer", 0)
        try:
            correct_idx = int(correct)
        except Exception:
            correct_idx = 0
        formatted.append(
            {
                "question": q.get("question", ""),
                "options": options,
                "correct_answer": correct_idx,
                "explanation": q.get("explanation", ""),
            }
        )

    return formatted[:count]

