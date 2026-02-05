"""
Commentary templates for Gemini TTS voice-over.

These are intentionally short, energetic, and event-driven. More dynamic
commentary (e.g. awards, round/game summaries) can be composed by the caller
using these templates as a starting point.
"""

from __future__ import annotations

from typing import Any, Dict


TEMPLATES: Dict[str, str] = {
    "game_started": "Welcome to Wildcard Trivia! Let's get this game started!",
    "question_shown": "Here's your next question: {question}",
    "round_finished": "Round {round} complete! Great job everyone!",
    "game_finished": "That's a wrap! Let's see the final scores!",
    "awards": "Congratulations to {players} for {award}!",
}


def render_commentary(event_type: str, data: Dict[str, Any] | None = None) -> str:
    """
    Render a commentary line for a given event_type using a template.

    Args:
      event_type: One of the keys in TEMPLATES.
      data: Dict used for template formatting.

    Returns:
      Rendered commentary string.
    """
    data = data or {}
    template = TEMPLATES.get(event_type)
    if not template:
        raise ValueError(f"Unknown commentary event_type: {event_type}")
    try:
        return template.format(**data)
    except KeyError as e:
        missing = str(e).strip("'")
        raise ValueError(f"Missing field '{missing}' for event_type '{event_type}'") from e

