from models.schemas import InterviewMode
import re


def _is_skip_or_dont_know(text: str) -> bool:
    msg = text.lower().strip()
    phrases = [
        "next question", "next", "skip", "pass", "move on", "another question", "ask something else",
        "don't know", "dont know", "no idea", "not sure", "i don't know", "i dont know", "no clue",
        "idk", "haven't studied", "have no idea", "no experience"
    ]
    return any(p in msg for p in phrases) or msg == "next"


async def analyze_response(user_message: str, ai_response: str, mode: InterviewMode) -> dict:
    """Analyze user response quality and return a feedback score."""
    if not user_message:
        return None

    if _is_skip_or_dont_know(user_message):
        return {
            "technical_accuracy": 0.0,
            "communication_clarity": 0.0,
            "confidence_level": 0.0,
            "overall_score": 0.0,
            "suggestions": ["You skipped this question or did not know the answer. Try to attempt the next question!"]
        }

    if len(user_message.strip()) < 10:
        return None

    scores = _compute_scores(user_message, mode)
    
    # Extract baseline scores
    technical = scores["technical"]
    clarity = scores["clarity"]
    confidence = scores["confidence"]
    overall = scores["overall"]
    suggestions = list(scores["suggestions"])

    ai_res_lower = ai_response.lower()
    
    # Check if the AI's response indicates the user was wrong
    incorrect_indicators = [
        "incorrect", "wrong", "not correct", "not right", "not quite right",
        "unfortunately", "that's not correct", "that is not correct", "false"
    ]
    
    # Check if the AI's response indicates the user was correct
    correct_indicators = [
        "correct", "perfect", "exactly", "spot on", "excellent", "spot-on",
        "that's right", "that is right", "indeed"
    ]
    
    is_incorrect = any(ind in ai_res_lower for ind in incorrect_indicators)
    is_correct = any(ind in ai_res_lower for ind in correct_indicators)
    
    # Prioritize negative signals if they appear in text (e.g. "incorrect" override)
    if any(ind in ai_res_lower for ind in ["incorrect", "wrong", "not correct", "not right"]):
        is_incorrect = True
        is_correct = False

    if is_incorrect:
        # Penalize technical accuracy heavily for wrong answers
        technical = max(10.0, technical - 30.0)
        # Penalize confidence slightly because they were wrong
        confidence = max(30.0, confidence - 20.0)
        # Recompute overall score with a higher weight on technical correctness (50%)
        overall = round((technical * 0.5 + clarity * 0.25 + confidence * 0.25), 1)
        if "Review the concept details and try to restate the answer." not in suggestions:
            suggestions.insert(0, "Review the concept details and try to restate the answer.")
    elif is_correct:
        # Boost score slightly for correct answers
        technical = min(100.0, technical + 15.0)
        overall = round((technical * 0.4 + clarity * 0.3 + confidence * 0.3), 1)

    return {
        "technical_accuracy": technical,
        "communication_clarity": clarity,
        "confidence_level": confidence,
        "overall_score": overall,
        "suggestions": suggestions
    }


def _compute_scores(text: str, mode: InterviewMode) -> dict:
    """Heuristic scoring — replace with LLM-based scoring for production."""
    words = text.lower().split()
    word_count = len(words)
    sentences = re.split(r'[.!?]+', text)
    sentence_count = max(len([s for s in sentences if s.strip()]), 1)

    # Confidence indicators
    hedge_words = {"maybe", "perhaps", "i think", "i guess", "not sure", "kind of", "sort of"}
    confident_words = {"definitely", "certainly", "clearly", "specifically", "the solution is", "we can"}

    hedge_count = sum(1 for w in hedge_words if w in text.lower())
    confident_count = sum(1 for w in confident_words if w in text.lower())
    confidence = min(100, max(30, 70 - hedge_count * 8 + confident_count * 10))

    # Technical keyword scoring
    dsa_keywords = {"array", "tree", "graph", "hash", "complexity", "o(n)", "recursion", "stack", "queue", "pointer", "node", "binary", "sort", "search", "dynamic"}
    hr_keywords = {"team", "project", "challenge", "result", "learned", "collaborated", "improved", "achieved", "situation", "action"}
    system_keywords = {"database", "cache", "scale", "api", "load", "service", "microservice", "sql", "nosql", "cdn", "queue", "availability"}

    keyword_map = {
        InterviewMode.DSA: dsa_keywords,
        InterviewMode.HR: hr_keywords,
        InterviewMode.SYSTEM_DESIGN: system_keywords
    }

    keywords = keyword_map.get(mode, dsa_keywords)
    keyword_hits = sum(1 for k in keywords if k in text.lower())
    technical = min(100, max(20, 40 + keyword_hits * 8))

    # Clarity: based on sentence structure and word count
    avg_words_per_sentence = word_count / sentence_count
    if 10 <= avg_words_per_sentence <= 20:
        clarity = 85
    elif avg_words_per_sentence < 6:
        clarity = 50
    elif avg_words_per_sentence > 30:
        clarity = 60
    else:
        clarity = 70

    clarity = min(100, max(30, clarity + (5 if word_count > 30 else 0)))

    overall = round((technical * 0.4 + clarity * 0.3 + confidence * 0.3), 1)

    suggestions = []
    if confidence < 60:
        suggestions.append("Try to sound more confident — avoid hedging phrases like 'I think' or 'maybe'")
    if technical < 50:
        suggestions.append(f"Use more domain-specific terminology in your answers")
    if word_count < 20:
        suggestions.append("Elaborate more on your answers — aim for 3-5 sentences")
    if not suggestions:
        suggestions.append("Good response! Keep up the structured approach")

    return {
        "technical": round(technical, 1),
        "clarity": round(clarity, 1),
        "confidence": round(confidence, 1),
        "overall": overall,
        "suggestions": suggestions
    }
