from models.schemas import InterviewMode
from config import get_settings
from typing import List, Optional
import re
import json


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _is_skip_or_dont_know(text: str) -> bool:
    msg = text.lower().strip()
    
    # 1. Exact full-message match for simple commands
    if msg in ["pass", "skip", "next", "idk", "next question", "move on", "skip question"]:
        return True
        
    # 2. Check standalone word boundary matches for longer skip indicators
    phrases = [
        "don't know", "dont know", "no idea", "not sure", "no clue",
        "haven't studied", "have no idea", "no experience", "ask something else"
    ]
    for p in phrases:
        if re.search(rf"\b{re.escape(p)}\b", msg):
            return True
            
    return False



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
        elif "suggestion" in key_lower or "coach" in key_lower or "recommendation" in key_lower:
            if isinstance(v, list):
                norm_data["suggestions"] = [str(item) for item in v]
            elif isinstance(v, str):
                norm_data["suggestions"] = [v]

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
        norm_data["suggestions"] = ["Keep up the structured approach."]

    return norm_data


# ─────────────────────────────────────────────────────────────────────────────
# STAGE 2 — Python safety net compressor
# ─────────────────────────────────────────────────────────────────────────────

_FALLBACK_TIPS = [
    "Define the concept clearly before explaining complexity.",
    "State both average and worst-case time complexity.",
    "Support your answer with a brief practical example.",
    "Answer every part of the question confidently.",
    "Avoid hedging phrases and speak with confidence.",
]


def _python_compress(text: str) -> str:
    """Extract first sentence, cap at 14 words / 90 chars, ensure period."""
    text = text.strip()
    text = re.sub(r'^[\d\.\-\*\u2022\#\s]+', '', text).strip()
    text = text.strip('"\'')

    sentences = re.split(r'(?<=[.!?])\s+', text)
    sentence = sentences[0].strip() if sentences else text
    m = re.match(r'^([^.!?]+[.!?])', sentence)
    if m:
        sentence = m.group(1).strip()

    words = sentence.split()
    if len(words) > 14:
        sentence = ' '.join(words[:14]).rstrip('.,!?;:') + '.'

    if len(sentence) > 90:
        cut = sentence[:87]
        last_space = cut.rfind(' ')
        sentence = (cut[:last_space] if last_space > 40 else cut).rstrip('.,!?;:') + '.'

    if sentence and sentence[-1] not in '.!?':
        sentence += '.'

    if sentence:
        sentence = sentence[0].upper() + sentence[1:]

    return sentence if len(sentence) > 5 else ""


def _validate_and_fix(tips: list, raw_fallback: list) -> list:
    """Validate every tip; python-compress failures; pad to exactly 5."""
    result = []

    for tip in tips:
        tip = tip.strip().strip('"\'')
        if not tip:
            continue
        words = tip.split()
        valid = (
            1 <= len(words) <= 14 and
            len(tip) <= 90 and
            tip[-1:] in '.!?' and
            len(tip) > 5
        )
        if valid:
            result.append(tip)
        else:
            compressed = _python_compress(tip)
            if compressed:
                result.append(compressed)

    for fb in raw_fallback:
        if len(result) >= 5:
            break
        compressed = _python_compress(fb)
        if compressed and compressed not in result:
            result.append(compressed)

    for fb in _FALLBACK_TIPS:
        if len(result) >= 5:
            break
        if fb not in result:
            result.append(fb)

    return result[:5]


# ─────────────────────────────────────────────────────────────────────────────
# STAGE 2 — LLM Compressor
# ─────────────────────────────────────────────────────────────────────────────

_COMPRESSOR_PROMPT = """\
You are a feedback compressor for an AI interview coach.
Convert the raw coaching notes below into EXACTLY 5 short coaching tips.

Interview context
-----------------
Mode    : {mode}
Question: {question}
Answer  : {answer}

Raw coaching notes
------------------
{raw_notes}

STRICT RULES — every tip MUST satisfy ALL:
1. Exactly ONE sentence ending with a period.
2. Maximum 14 words.
3. Maximum 90 characters (count carefully).
4. Actionable and specific to the candidate's answer.
5. NEVER start with: You should / Try to / Make sure / It is / Remember / Always / Never.
6. No explanations. No examples. No markdown. No quotes. No numbering. No bullet points.

Silently validate each tip before outputting:
  - word count <= 14?
  - char count <= 90?
  - ends with a period?
Rewrite any tip that fails until it passes.

Return ONLY this JSON — no other text:
{{
  "coachRecommendations": [
    "Tip one.",
    "Tip two.",
    "Tip three.",
    "Tip four.",
    "Tip five."
  ]
}}"""


async def _run_compressor(raw_suggestions: list, question: str, user_message: str, mode, preferred_model: Optional[str] = None) -> list:
    """LLM Stage 2: compress raw notes → 5 validated short tips."""
    raw_notes = "\n".join(f"- {s}" for s in raw_suggestions if s.strip())
    if not raw_notes:
        return _validate_and_fix([], [])

    prompt = _COMPRESSOR_PROMPT.format(
        mode=mode.value if hasattr(mode, "value") else str(mode),
        question=question[:300],
        answer=user_message[:300],
        raw_notes=raw_notes,
    )

    settings = get_settings()
    tips = []

    # Map requested engine
    target_model = "gpt-4o-mini"
    if preferred_model == "openai_gpt4":
        target_model = "gpt-4o"

    is_gemini_requested = (preferred_model == "gemini") or (not preferred_model and settings.ai_provider == "gemini")
    is_openai_requested = (preferred_model in ["openai", "openai_gpt4"]) or (not preferred_model and settings.ai_provider == "openai")

    if is_gemini_requested and settings.gemini_api_key:
        try:
            import google.generativeai as genai
            genai.configure(api_key=settings.gemini_api_key)
            gm = genai.GenerativeModel("gemini-2.5-flash")
            try:
                resp = await gm.generate_content_async(
                    prompt,
                    generation_config={"response_mime_type": "application/json"}
                )
                data = json.loads(_clean_json_text(resp.text.strip()))
            except Exception:
                resp = await gm.generate_content_async(prompt)
                data = json.loads(_clean_json_text(resp.text.strip()))
            tips = data.get("coachRecommendations",
                            data.get("suggestions",
                            data.get("recommendations", [])))
        except Exception as e:
            print(f"[COMPRESSOR] Gemini failed: {e}")

    if not tips and settings.openai_api_key and (is_openai_requested or not is_gemini_requested):
        try:
            from openai import AsyncOpenAI
            client = AsyncOpenAI(api_key=settings.openai_api_key)
            resp = await client.chat.completions.create(
                model=target_model,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=300,
                temperature=0.3,
                response_format={"type": "json_object"},
            )
            data = json.loads(resp.choices[0].message.content.strip())
            tips = data.get("coachRecommendations",
                            data.get("suggestions",
                            data.get("recommendations", [])))
        except Exception as e:
            print(f"[COMPRESSOR] OpenAI failed: {e}")

    return _validate_and_fix(tips, raw_suggestions)


# ─────────────────────────────────────────────────────────────────────────────
# STAGE 1 — LLM Feedback (scores + raw coaching notes)
# ─────────────────────────────────────────────────────────────────────────────

_STAGE1_PROMPT = """\
You are a senior technical interview coach.

Context
-------
Interview Mode : {mode}
Question Asked : {question}
Candidate's Answer : {answer}
Interviewer Feedback: {ai_response}

Task
----
Evaluate the candidate and return ONLY this JSON:
{{
  "technical_accuracy": <float 0-100>,
  "communication_clarity": <float 0-100>,
  "confidence_level": <float 0-100>,
  "overall_score": <float 0-100>,
  "suggestions": [
    "detailed coaching note 1",
    "detailed coaching note 2",
    "detailed coaching note 3",
    "detailed coaching note 4",
    "detailed coaching note 5"
  ]
}}
The suggestions will be compressed automatically — make them as detailed as needed."""


async def _openai_feedback(
    question: str,
    user_message: str,
    ai_response: str,
    mode: InterviewMode,
    api_key: str,
    model_name: str = "gpt-4o-mini",
    preferred_model: Optional[str] = None,
) -> dict:
    from openai import AsyncOpenAI
    client = AsyncOpenAI(api_key=api_key)

    prompt = _STAGE1_PROMPT.format(
        mode=mode.value if hasattr(mode, "value") else mode,
        question=question,
        answer=user_message,
        ai_response=ai_response,
    )

    resp = await client.chat.completions.create(
        model=model_name,
        messages=[{"role": "user", "content": prompt}],
        max_tokens=600,
        temperature=0.5,
        response_format={"type": "json_object"},
    )
    result = _parse_feedback_json(resp.choices[0].message.content.strip())
    result["suggestions"] = await _run_compressor(
        result.get("suggestions", []), question, user_message, mode, preferred_model
    )
    return result


async def _gemini_feedback(
    question: str,
    user_message: str,
    ai_response: str,
    mode: InterviewMode,
    api_key: str,
    preferred_model: Optional[str] = None,
) -> dict:
    import google.generativeai as genai
    genai.configure(api_key=api_key)
    gmodel = genai.GenerativeModel("gemini-2.5-flash")

    prompt = _STAGE1_PROMPT.format(
        mode=mode.value if hasattr(mode, "value") else mode,
        question=question,
        answer=user_message,
        ai_response=ai_response,
    )

    try:
        resp = await gmodel.generate_content_async(
            prompt,
            generation_config={"response_mime_type": "application/json"}
        )
        result = _parse_feedback_json(resp.text.strip())
    except Exception:
        resp = await gmodel.generate_content_async(prompt)
        result = _parse_feedback_json(resp.text.strip())

    result["suggestions"] = await _run_compressor(
        result.get("suggestions", []), question, user_message, mode, preferred_model
    )
    return result


# ─────────────────────────────────────────────────────────────────────────────
# Public API
# ─────────────────────────────────────────────────────────────────────────────

def _get_last_question(history: Optional[list], mode: InterviewMode) -> str:
    if history:
        for msg in reversed(history):
            role    = getattr(msg, "role", None)    or (msg.get("role")    if isinstance(msg, dict) else None)
            content = getattr(msg, "content", None) or (msg.get("content") if isinstance(msg, dict) else None)
            if role == "assistant" and content:
                return content.strip()

    from services.ai_service import get_opening_message
    try:
        return get_opening_message(mode)
    except Exception:
        from services.ai_service import OPENING_MESSAGES
        return OPENING_MESSAGES.get(mode, "")


async def analyze_response(
    user_message: str,
    ai_response: str,
    mode: InterviewMode,
    history: Optional[List] = None,
    preferred_model: Optional[str] = None,
) -> dict:
    """Analyze user response quality. Returns scores + exactly 5 short coaching tips."""
    if not user_message:
        return None

    if _is_skip_or_dont_know(user_message):
        return {
            "technical_accuracy":    0.0,
            "communication_clarity": 0.0,
            "confidence_level":      0.0,
            "overall_score":         0.0,
            "suggestions": _validate_and_fix(
                ["Attempt every question, even if only partially sure."], []
            ),
        }

    if len(user_message.strip()) < 10:
        return None

    settings = get_settings()
    question  = _get_last_question(history, mode)

    # Route based on model preference
    is_gemini = (preferred_model == "gemini") or (not preferred_model and settings.ai_provider == "gemini")
    is_openai = (preferred_model in ["openai", "openai_gpt4"]) or (not preferred_model and settings.ai_provider == "openai")

    if is_gemini and settings.gemini_api_key:
        try:
            return await _gemini_feedback(question, user_message, ai_response, mode, settings.gemini_api_key, preferred_model)
        except Exception as e:
            print(f"Gemini feedback failed: {e}")

    if settings.openai_api_key and (is_openai or not is_gemini):
        try:
            model_name = "gpt-4o" if preferred_model == "openai_gpt4" else "gpt-4o-mini"
            return await _openai_feedback(question, user_message, ai_response, mode, settings.openai_api_key, model_name, preferred_model)
        except Exception as e:
            print(f"OpenAI feedback failed: {e}")

    # ── Heuristic Fallback ────────────────────────────────────────────────────

    scores   = _compute_scores(user_message, mode)
    technical  = scores["technical"]
    clarity    = scores["clarity"]
    confidence = scores["confidence"]
    overall    = scores["overall"]
    raw_suggs  = list(scores["suggestions"])

    ai_res_lower = ai_response.lower()
    incorrect_indicators = [
        "incorrect", "wrong", "not correct", "not right", "not quite right",
        "unfortunately", "that's not correct", "that is not correct", "false"
    ]
    correct_indicators = [
        "correct", "perfect", "exactly", "spot on", "excellent", "spot-on",
        "that's right", "that is right", "indeed"
    ]

    is_incorrect = any(i in ai_res_lower for i in incorrect_indicators)
    is_correct   = any(i in ai_res_lower for i in correct_indicators)
    if any(i in ai_res_lower for i in ["incorrect", "wrong", "not correct", "not right"]):
        is_incorrect, is_correct = True, False

    if is_incorrect:
        technical  = max(10.0, technical - 30.0)
        confidence = max(30.0, confidence - 20.0)
        overall    = round((technical * 0.5 + clarity * 0.25 + confidence * 0.25), 1)
        raw_suggs.insert(0, "Review the concept and restate your answer accurately.")
    elif is_correct:
        technical = min(100.0, technical + 15.0)
        overall   = round((technical * 0.4 + clarity * 0.3 + confidence * 0.3), 1)

    return {
        "technical_accuracy":    technical,
        "communication_clarity": clarity,
        "confidence_level":      confidence,
        "overall_score":         overall,
        "suggestions":           _validate_and_fix(raw_suggs, []),
    }


# ─────────────────────────────────────────────────────────────────────────────
# Offline ML Scoring
# ─────────────────────────────────────────────────────────────────────────────

_vectorizer = None
_classifier = None


def _load_ml_model():
    global _vectorizer, _classifier
    if _vectorizer is None or _classifier is None:
        try:
            import joblib
            _vectorizer = joblib.load("backend/resources/tfidf_vectorizer.pkl")
            _classifier = joblib.load("backend/resources/svm_classifier.pkl")
        except Exception as e:
            print(f"[ML_MODEL] Failed to load trained SVM models: {e}")


def _compute_scores(text: str, mode: InterviewMode) -> dict:
    """Offline ML scoring using a custom-trained SVM classifier."""
    words          = text.lower().split()
    word_count     = len(words)
    sentences      = re.split(r'[.!?]+', text)
    sentence_count = max(len([s for s in sentences if s.strip()]), 1)

    hedge_words     = {"maybe", "perhaps", "i think", "i guess", "not sure", "kind of", "sort of"}
    confident_words = {"definitely", "certainly", "clearly", "specifically", "the solution is", "we can"}
    hedge_count     = sum(1 for w in hedge_words if w in text.lower())
    confident_count = sum(1 for w in confident_words if w in text.lower())
    confidence      = min(100, max(30, 70 - hedge_count * 8 + confident_count * 10))

    _load_ml_model()
    predicted_class = None
    if _vectorizer is not None and _classifier is not None:
        try:
            X               = _vectorizer.transform([text])
            predicted_class = int(_classifier.predict(X)[0])
        except Exception as e:
            print(f"[ML_MODEL] Prediction error: {e}")

    if predicted_class == 2:
        technical = min(100.0, 85.0 + (word_count // 10) * 2)
    elif predicted_class == 1:
        technical = min(75.0, 55.0 + (word_count // 10))
    elif predicted_class == 0:
        technical = max(15.0, 20.0 + min(10, word_count // 2))
    else:
        dsa_kw    = {"array", "tree", "graph", "hash", "complexity", "o(n)", "recursion", "stack", "queue", "pointer", "node", "binary", "sort", "search", "dynamic"}
        hr_kw     = {"team", "project", "challenge", "result", "learned", "collaborated", "improved", "achieved", "situation", "action"}
        sys_kw    = {"database", "cache", "scale", "api", "load", "service", "microservice", "sql", "nosql", "cdn", "queue", "availability"}
        kw_map    = {InterviewMode.DSA: dsa_kw, InterviewMode.HR: hr_kw, InterviewMode.SYSTEM_DESIGN: sys_kw}
        keywords  = kw_map.get(mode, dsa_kw)
        kw_hits   = sum(1 for k in keywords if k in text.lower())
        technical = min(100, max(20, 40 + kw_hits * 8))

    avg_wps = word_count / sentence_count
    if 10 <= avg_wps <= 20:
        clarity = 85
    elif avg_wps < 6:
        clarity = 50
    elif avg_wps > 30:
        clarity = 60
    else:
        clarity = 70
    clarity = min(100, max(30, clarity + (5 if word_count > 30 else 0)))

    overall = round((technical * 0.4 + clarity * 0.3 + confidence * 0.3), 1)

    suggestions = []
    if predicted_class == 0:
        suggestions.append("Review the concept and restate your answer accurately.")
    elif predicted_class == 1:
        suggestions.append("Elaborate on technical details and discuss tradeoffs.")
    elif predicted_class == 2:
        suggestions.append("Add one practical example to reinforce your answer.")
    if confidence < 60:
        suggestions.append("Speak confidently and avoid hedging phrases.")
    if word_count < 20:
        suggestions.append("Expand your answer to at least three sentences.")

    return {
        "technical":   round(technical, 1),
        "clarity":     round(clarity, 1),
        "confidence":  round(confidence, 1),
        "overall":     overall,
        "suggestions": suggestions,
    }
