from models.schemas import InterviewMode
from config import get_settings
from typing import List, Optional
import re
import json


def _is_skip_or_dont_know(text: str) -> bool:
    msg = text.lower().strip()
    phrases = [
        "next question", "next", "skip", "pass", "move on", "another question", "ask something else",
        "don't know", "dont know", "no idea", "not sure", "i don't know", "i dont know", "no clue",
        "idk", "haven't studied", "have no idea", "no experience"
    ]
    return any(p in msg for p in phrases) or msg == "next"


def _clean_json_text(text: str) -> str:
    text = text.strip()
    if text.startswith("```json"):
        text = text[7:]
    elif text.startswith("```"):
        text = text[3:]
    if text.endswith("```"):
        text = text[:-3]
    return text.strip()


def _parse_feedback_json(raw_text: str) -> dict:
    cleaned = _clean_json_text(raw_text)
    data = json.loads(cleaned)
    
    # Normalize keys to snake_case
    norm_data = {}
    for k, v in data.items():
        key_lower = k.lower().replace("_", "").replace("-", "")
        if "technical" in key_lower:
            norm_data["technical_accuracy"] = float(v)
        elif "clarity" in key_lower or "communication" in key_lower:
            if "communication" in key_lower and "clarity" in norm_data:
                continue
            norm_data["communication_clarity"] = float(v)
        elif "confidence" in key_lower:
            norm_data["confidence_level"] = float(v)
        elif "overall" in key_lower:
            norm_data["overall_score"] = float(v)
        elif "suggestion" in key_lower:
            if isinstance(v, list):
                norm_data["suggestions"] = [str(item) for item in v]
            elif isinstance(v, str):
                norm_data["suggestions"] = [v]
                
    # Fill defaults if missing
    if "technical_accuracy" not in norm_data:
        norm_data["technical_accuracy"] = 70.0
    if "communication_clarity" not in norm_data:
        norm_data["communication_clarity"] = 70.0
    if "confidence_level" not in norm_data:
        norm_data["confidence_level"] = 70.0
    if "overall_score" not in norm_data:
        norm_data["overall_score"] = round(
            norm_data["technical_accuracy"] * 0.4 +
            norm_data["communication_clarity"] * 0.3 +
            norm_data["confidence_level"] * 0.3,
            1
        )
    if "suggestions" not in norm_data or not norm_data["suggestions"]:
        norm_data["suggestions"] = ["Good response! Keep up the structured approach."]
        
    return norm_data


def _get_last_question(history: Optional[list], mode: InterviewMode) -> str:
    if history:
        for msg in reversed(history):
            role = getattr(msg, "role", None) or (msg.get("role") if isinstance(msg, dict) else None)
            content = getattr(msg, "content", None) or (msg.get("content") if isinstance(msg, dict) else None)
            if role == "assistant" and content:
                return content.strip()
    
    # Fallback to the interview mode's default opening question
    from services.ai_service import get_opening_message
    try:
        return get_opening_message(mode)
    except Exception:
        from services.ai_service import OPENING_MESSAGES
        return OPENING_MESSAGES.get(mode, "")


async def _openai_feedback(question: str, user_message: str, ai_response: str, mode: InterviewMode, api_key: str) -> dict:
    from openai import AsyncOpenAI
    client = AsyncOpenAI(api_key=api_key)
    
    prompt = f"""You are an expert technical and behavioral interview coach.
Analyze the candidate's response in the context of the question asked and the interviewer's subsequent feedback/reaction.

Interview Mode: {mode.value if hasattr(mode, 'value') else mode}
Question Asked: {question}
Candidate's Answer: {user_message}
Interviewer's Next Response/Feedback: {ai_response}

Your task is to grade the candidate's answer and provide 1 to 3 highly specific, personalized suggestions.
Provide scores from 0.0 to 100.0 for:
1. Technical Accuracy (how correct and detailed the explanation is, or how well behavioral/STAR elements are covered)
2. Communication Clarity (structure, conciseness, coherence)
3. Confidence Level (use of confident terminology, lack of excessive hedging like 'I think', 'maybe', 'not sure')
4. Overall Score (a weighted combination of the three)

The suggestions MUST be specific to this candidate's response. Do NOT use generic templates. For example:
- Mention specific concepts they missed or got wrong.
- Give a concrete example of how they can improve a specific phrase they used.
- Point out specific terminology related to {mode} that they should have used.

You must respond ONLY with a JSON object containing these keys:
- technical_accuracy (float)
- communication_clarity (float)
- confidence_level (float)
- overall_score (float)
- suggestions (list of strings)
"""

    resp = await client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=400,
        temperature=0.5,
        response_format={"type": "json_object"}
    )
    return _parse_feedback_json(resp.choices[0].message.content.strip())


async def _gemini_feedback(question: str, user_message: str, ai_response: str, mode: InterviewMode, api_key: str) -> dict:
    import google.generativeai as genai
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel("gemini-1.5-flash")
    
    prompt = f"""You are an expert technical and behavioral interview coach.
Analyze the candidate's response in the context of the question asked and the interviewer's subsequent feedback/reaction.

Interview Mode: {mode.value if hasattr(mode, 'value') else mode}
Question Asked: {question}
Candidate's Answer: {user_message}
Interviewer's Next Response/Feedback: {ai_response}

Your task is to grade the candidate's answer and provide 1 to 3 highly specific, personalized suggestions.
Provide scores from 0.0 to 100.0 for:
1. Technical Accuracy (how correct and detailed the explanation is, or how well behavioral/STAR elements are covered)
2. Communication Clarity (structure, conciseness, coherence)
3. Confidence Level (use of confident terminology, lack of excessive hedging like 'I think', 'maybe', 'not sure')
4. Overall Score (a weighted combination of the three)

The suggestions MUST be specific to this candidate's response. Do NOT use generic templates. For example:
- Mention specific concepts they missed or got wrong.
- Give a concrete example of how they can improve a specific phrase they used.
- Point out specific terminology related to {mode} that they should have used.

You must respond ONLY with a JSON object containing these keys:
- technical_accuracy (float)
- communication_clarity (float)
- confidence_level (float)
- overall_score (float)
- suggestions (list of strings)
"""

    try:
        resp = await model.generate_content_async(
            prompt,
            generation_config={"response_mime_type": "application/json"}
        )
        return _parse_feedback_json(resp.text.strip())
    except Exception:
        resp = await model.generate_content_async(prompt)
        return _parse_feedback_json(resp.text.strip())


async def analyze_response(
    user_message: str,
    ai_response: str,
    mode: InterviewMode,
    history: Optional[List] = None
) -> dict:
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

    settings = get_settings()
    question = _get_last_question(history, mode)

    if settings.ai_provider == "gemini" and settings.gemini_api_key:
        try:
            return await _gemini_feedback(question, user_message, ai_response, mode, settings.gemini_api_key)
        except Exception as e:
            print(f"Gemini feedback failed: {e}")
            pass

    if settings.openai_api_key:
        try:
            return await _openai_feedback(question, user_message, ai_response, mode, settings.openai_api_key)
        except Exception as e:
            print(f"OpenAI feedback failed: {e}")
            pass

    # Heuristic Fallback
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
