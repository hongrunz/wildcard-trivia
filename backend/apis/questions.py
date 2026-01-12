"""
Question generation logic
"""

from typing import List
import random


def generate_sample_questions(topics: List[str], count: int) -> List[dict]:
    """
    Generate sample trivia questions based on topics.
    In a production app, you'd integrate with a real trivia API like Open Trivia DB.
    """
    questions = []
    
    # Sample question templates by topic
    question_bank = {
        "general": [
            {
                "question": "What is the capital of France?",
                "options": ["London", "Berlin", "Paris", "Madrid"],
                "correct_answer": 2,
                "explanation": "Paris is the capital and largest city of France."
            },
            {
                "question": "Who wrote 'Romeo and Juliet'?",
                "options": ["Charles Dickens", "William Shakespeare", "Jane Austen", "Mark Twain"],
                "correct_answer": 1,
                "explanation": "William Shakespeare wrote this famous tragedy in the late 16th century."
            },
            {
                "question": "What is the largest planet in our solar system?",
                "options": ["Earth", "Mars", "Jupiter", "Saturn"],
                "correct_answer": 2,
                "explanation": "Jupiter is the largest planet, more than twice as massive as all other planets combined."
            },
            {
                "question": "In what year did World War II end?",
                "options": ["1943", "1944", "1945", "1946"],
                "correct_answer": 2,
                "explanation": "World War II ended in 1945 with the surrender of Japan."
            },
            {
                "question": "What is the chemical symbol for gold?",
                "options": ["Go", "Gd", "Au", "Ag"],
                "correct_answer": 2,
                "explanation": "Au comes from the Latin word 'aurum', meaning gold."
            },
        ],
        "science": [
            {
                "question": "What is the speed of light in vacuum?",
                "options": ["299,792,458 m/s", "300,000,000 m/s", "150,000,000 m/s", "450,000,000 m/s"],
                "correct_answer": 0,
                "explanation": "The speed of light in vacuum is exactly 299,792,458 meters per second."
            },
            {
                "question": "What is H2O commonly known as?",
                "options": ["Hydrogen peroxide", "Water", "Hydrochloric acid", "Salt"],
                "correct_answer": 1,
                "explanation": "H2O is the chemical formula for water, consisting of two hydrogen atoms and one oxygen atom."
            },
            {
                "question": "How many bones are in the human body?",
                "options": ["196", "206", "216", "226"],
                "correct_answer": 1,
                "explanation": "An adult human has 206 bones, though babies are born with around 270."
            },
        ],
        "sports": [
            {
                "question": "How many players are on a basketball team on the court at once?",
                "options": ["4", "5", "6", "7"],
                "correct_answer": 1,
                "explanation": "Each team has 5 players on the court at once in basketball."
            },
            {
                "question": "In which sport would you perform a slam dunk?",
                "options": ["Tennis", "Basketball", "Soccer", "Baseball"],
                "correct_answer": 1,
                "explanation": "A slam dunk is a basketball move where a player jumps and scores by putting the ball through the hoop."
            },
        ],
        "history": [
            {
                "question": "Who was the first person to walk on the moon?",
                "options": ["Buzz Aldrin", "Neil Armstrong", "Michael Collins", "John Glenn"],
                "correct_answer": 1,
                "explanation": "Neil Armstrong was the first person to step onto the Moon on July 20, 1969."
            },
            {
                "question": "In which year did the Berlin Wall fall?",
                "options": ["1987", "1989", "1991", "1993"],
                "correct_answer": 1,
                "explanation": "The Berlin Wall fell on November 9, 1989, symbolizing the end of the Cold War."
            },
        ],
    }
    
    # Collect questions from relevant topics
    available_questions = []
    for topic in topics:
        topic_lower = topic.lower()
        # Try to match topics
        if "general" in topic_lower or "trivia" in topic_lower:
            available_questions.extend(question_bank.get("general", []))
        elif "science" in topic_lower:
            available_questions.extend(question_bank.get("science", []))
        elif "sport" in topic_lower:
            available_questions.extend(question_bank.get("sports", []))
        elif "history" in topic_lower:
            available_questions.extend(question_bank.get("history", []))
        else:
            # Default to general questions if topic doesn't match
            available_questions.extend(question_bank.get("general", []))
    
    # If no questions matched, use general questions
    if not available_questions:
        available_questions = question_bank.get("general", [])
    
    # Shuffle and select questions
    random.shuffle(available_questions)
    selected = available_questions[:count]
    
    # If we don't have enough questions, repeat some
    while len(selected) < count:
        selected.extend(random.sample(available_questions, min(len(available_questions), count - len(selected))))
    
    return selected[:count]
