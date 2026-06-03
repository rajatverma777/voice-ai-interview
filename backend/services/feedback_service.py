from models.schemas import InterviewMode
import re


async def analyze_response(user_message: str, ai_response: str, mode: InterviewMode) -> dict:
    """Analyze user response quality and return a feedback score."""
    if not user_message or len(user_message.strip()) < 10:
        return None

    scores = _compute_scores(user_message, mode)

    return {
        "technical_accuracy": scores["technical"],
        "communication_clarity": scores["clarity"],
        "confidence_level": scores["confidence"],
        "overall_score": scores["overall"],
        "suggestions": scores["suggestions"]
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
