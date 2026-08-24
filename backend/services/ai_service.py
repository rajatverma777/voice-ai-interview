import os
from config import get_settings
from models.schemas import InterviewMode, Message
from typing import List, Optional

settings = get_settings()

# ── System prompts ────────────────────────────────────────────────────────────

SYSTEM_PROMPTS = {
    InterviewMode.DSA: """You are a strict but fair senior software engineer conducting a real technical interview on Data Structures and Algorithms.

STRICT RULES — follow every one:
1. EVALUATE the candidate's answer critically BEFORE moving on.
   - If the answer is WRONG or clearly incomplete (e.g. "don't know", "not sure", random text), say so clearly and explain what's missing. Do NOT call it correct.
   - If the answer is PARTIALLY correct, acknowledge what's right, point out what's wrong, then probe deeper.
   - Only if the answer is fully CORRECT, briefly praise and move to a NEW different question.
2. NEVER repeat a question already asked in this conversation.
3. Ask ONE question at a time. Keep responses to 3-5 sentences.
4. Cover: arrays, linked lists, trees, graphs, dynamic programming, sorting, hashing, recursion, complexity.
5. Do NOT give away answers — give a small hint instead if stuck.

Example of what NOT to do:
  Candidate says: "Don't know" or "I have no idea"
  BAD response: "Correct! Good understanding."   ← NEVER DO THIS
  GOOD response: "That's not right. Binary search requires a sorted array and works by repeatedly halving the search space. Can you explain why that gives O(log n) complexity?"
""",

    InterviewMode.HR: """You are an experienced HR interviewer conducting a behavioral interview.

STRICT RULES:
1. If the answer is vague, too short, or lacks a real example, say so and ask for specifics.
2. If the answer is good, briefly acknowledge and ask the NEXT different question.
3. NEVER repeat a question already asked.
4. Ask ONE question at a time. Push for concrete STAR examples.
""",

    InterviewMode.SYSTEM_DESIGN: """You are a staff engineer conducting a system design interview.

STRICT RULES:
1. If the answer lacks technical depth or specifics, point it out.
2. Only move on when the current topic is adequately addressed.
3. NEVER repeat a question already asked.
4. Ask ONE follow-up at a time. Cover: DB choice, caching, scaling, fault tolerance, APIs.
"""
}

OPENING_MESSAGES = {
    InterviewMode.DSA: "Hello! I'm your AI technical interviewer. We'll focus on **Data Structures & Algorithms**. Let's begin — **What is the time complexity of binary search, and what condition must the input satisfy for it to work?**",
    InterviewMode.HR: "Welcome! I'm your behavioral interviewer. Let's start. **Tell me about a time you faced a significant technical challenge. Walk me through the situation, what you did, and the outcome.**",
    InterviewMode.SYSTEM_DESIGN: "Hi! Today we'll work through a system design problem. **Design a URL shortening service like bit.ly. Start by telling me what functional and non-functional requirements you'd clarify with the client.**",
}

# ── Question banks ────────────────────────────────────────────────────────────

# (topic, question_text) — topic is used for answer evaluation
DSA_QUESTIONS = [
    ("complexity",  "What is the time complexity of binary search, and what condition must the input satisfy for it to work?"),
    ("arrays",      "What is the difference between an array and a dynamic array (like Python list or Java ArrayList)? What happens when a dynamic array runs out of space?"),
    ("hashing",     "How does a hash map work internally? What is a collision and how is it resolved?"),
    ("linked_list", "How would you detect a cycle in a singly linked list? What is the time and space complexity of your approach?"),
    ("trees",       "What is the difference between a binary tree and a binary search tree? What property must every node in a BST satisfy?"),
    ("trees",       "How does an in-order traversal of a BST work, and what is special about its output?"),
    ("sorting",     "Explain merge sort. What is its time complexity in the worst case and why? How does it compare to quicksort on space?"),
    ("dp",          "What is dynamic programming? Explain the difference between memoization and tabulation with a simple example."),
    ("graphs",      "What is the difference between BFS and DFS? Give a real use case where you'd prefer BFS over DFS."),
    ("stacks",      "What is a stack? Describe how you would use a stack to check if a string of brackets is balanced."),
    ("heaps",       "What is a min-heap? How does insertion into a heap work and what is its time complexity?"),
    ("arrays",      "How would you find two numbers in an unsorted array that add up to a target sum? What is the most efficient approach?"),
    ("dp",          "Explain the Fibonacci sequence. How would you compute fib(n) efficiently and what is the time complexity?"),
    ("trees",       "What is the height of a binary tree? How would you calculate it recursively?"),
    ("graphs",      "What is a topological sort and when would you use it? Give a real-world example."),
    ("sorting",     "Why is quicksort generally faster in practice than merge sort even though both are O(n log n) average case?"),
    ("arrays",      "What is the sliding window technique? Describe a problem it solves efficiently."),
    ("linked_list", "How would you reverse a singly linked list in place? Walk me through the steps and give the complexity."),
    ("hashing",     "What is the load factor of a hash table? How does it affect performance and when does rehashing occur?"),
    ("complexity",  "What is the difference between O(n²) and O(n log n)? For n=1,000,000, roughly how many operations is each?"),
]

HR_QUESTIONS = [
    "Tell me about a project you're most proud of. What was your specific contribution and what did you learn?",
    "Describe a time you had a conflict with a teammate. How did you handle it and what was the outcome?",
    "Tell me about a time you missed a deadline or made a significant mistake. What did you do?",
    "How do you prioritize when you have multiple tasks with competing deadlines?",
    "Describe a situation where you had to learn something completely new very quickly. How did you approach it?",
    "Tell me about a time you disagreed with your manager's decision. How did you handle it?",
    "What is your greatest technical weakness and what are you actively doing to improve it?",
    "Describe a time you had to explain a complex technical concept to a non-technical person.",
    "Tell me about a time you went above and beyond what was expected of you.",
    "Where do you see yourself in 3 years and how does this role fit into that goal?",
]

SYSTEM_QUESTIONS = [
    "What database would you choose for this system — SQL or NoSQL — and what factors drive that decision?",
    "How would you handle 10 million daily active users? Walk me through your horizontal scaling strategy.",
    "Where would you add caching in this system? What cache eviction policy would you use and why?",
    "How would you ensure the system has 99.9% uptime? What failure scenarios concern you most?",
    "How would you design the API layer — REST or GraphQL? What are the trade-offs?",
    "Explain the CAP theorem. Which two properties would you prioritize for this system and why?",
    "How would you handle a sudden 10x traffic spike that exceeds your current capacity?",
    "How would you monitor this system in production? What are the three most important metrics to track?",
    "How would you handle data consistency if you use multiple databases or microservices?",
    "How would you design the authentication and authorization layer for this system?",
]

# ── Answer evaluation keywords ────────────────────────────────────────────────

KEYWORD_MAP = {
    "complexity":  ["log", "o(log", "sorted", "halves", "binary", "search space", "divide", "half", "iteration"],
    "arrays":      ["contiguous", "index", "o(1)", "fixed", "memory", "random access", "resize", "double", "capacity"],
    "hashing":     ["hash", "bucket", "collision", "chaining", "probing", "key", "modulo", "function"],
    "linked_list": ["pointer", "node", "next", "slow", "fast", "floyd", "two pointer", "cycle", "null", "traverse"],
    "trees":       ["left", "right", "root", "leaf", "height", "bst", "binary", "node", "traverse", "smaller", "greater"],
    "sorting":     ["divide", "merge", "pivot", "compare", "n log n", "in-place", "stable", "partition", "conquer"],
    "dp":          ["subproblem", "memo", "cache", "overlap", "tabulation", "optimal", "recursive", "bottom-up", "top-down"],
    "graphs":      ["vertex", "edge", "bfs", "dfs", "queue", "stack", "visited", "adjacency", "cycle", "level"],
    "stacks":      ["lifo", "push", "pop", "stack", "top", "bracket", "balanced", "last in", "first out"],
    "heaps":       ["heap", "parent", "child", "heapify", "min", "max", "complete", "priority", "bubble"],
}

WRONG_RESPONSE = {
    "complexity":  "That's not right. Binary search requires a **sorted** array and works by halving the search space each step — that's why it's O(log n). Can you explain what 'halving the search space' means?",
    "arrays":      "That's not correct. Think about how arrays store data in **contiguous memory** and what that means for access time vs insertion. Try again.",
    "hashing":     "That's not accurate. A hash map applies a hash function to map keys to buckets. When two keys map to the same bucket, that's a **collision** — how is it resolved?",
    "linked_list": "Not quite right. Floyd's cycle detection uses two pointers — one slow, one fast. If there's a cycle, what eventually happens to those pointers?",
    "trees":       "That's incorrect. In a BST, for **every** node: all values in the left subtree are smaller, and all values in the right subtree are larger. Can you restate the property?",
    "sorting":     "That's not right. Merge sort **divides** the array in half recursively, then **merges** sorted halves. The log n comes from the number of divisions. What is its space complexity?",
    "dp":          "That's not accurate. DP solves problems by breaking them into **overlapping subproblems** and storing results. What's the difference between doing this top-down vs bottom-up?",
    "graphs":      "Not right. BFS uses a **queue** and explores level by level — this makes it ideal for shortest path. DFS uses a stack and goes deep first. Can you give a use case for each?",
    "stacks":      "That's not correct. A stack is LIFO — last in, first out. For bracket matching, you push opening brackets and pop when you see a closing one. Walk me through '{[()]}' step by step.",
    "heaps":       "Not quite. A min-heap ensures every **parent is smaller than its children**. When you insert, you add at the end and 'bubble up'. What is the time complexity of that operation?",
}

PARTIAL_RESPONSE = {
    "complexity":  "You're on the right track, but incomplete. You identified one property — now what's the **exact time complexity** and what does O(log n) mean in terms of operations per step?",
    "arrays":      "Partially correct. You have one property but missed the key trade-off. What is the time complexity of **insertion in the middle** of an array vs a linked list?",
    "hashing":     "Good start, but incomplete. You have the basics — now explain what happens to **time complexity** when the load factor gets too high and collisions increase.",
    "linked_list": "Partly right. You identified the algorithm but didn't give the complexity. Floyd's algorithm is O(n) time and **O(1) space** — why does it use only constant space?",
    "trees":       "Partially correct — you have the structure but the BST property needs to be more precise. It's not just left < root < right for immediate children — it applies to **all** nodes in each subtree.",
    "sorting":     "Good, but you're missing an important detail. You described the time complexity but what about **space complexity**? How does merge sort's memory usage compare to quicksort?",
    "dp":          "Partly right. You understand one aspect but what's the practical difference between memoization (top-down) and tabulation (bottom-up) in terms of **stack overflow risk and performance**?",
    "graphs":      "Good start. You know the data structures but give me a **concrete scenario** where using DFS instead of BFS would give you the wrong answer.",
    "stacks":      "Partially correct. The concept is right but walk me through a **concrete example** — trace through '{[()]}' showing every push and pop operation.",
    "heaps":       "Partly correct. You have the structure right but what's the **time complexity of deletion** (removing the minimum) and how does heapify-down work?",
}

CORRECT_PRAISE = [
    "Correct!",
    "Exactly right.",
    "That's correct — well explained.",
    "Good answer, you covered the key points.",
    "Right. Clear and accurate.",
]

# ── Main entry point ──────────────────────────────────────────────────────────

def _get_resource_path(relative_path: str) -> str:
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    clean_path = relative_path
    if relative_path.startswith("backend/"):
        clean_path = relative_path[len("backend/"):]
    return os.path.join(base_dir, clean_path)

_gpt2_model = None
_gpt2_tokenizer = None

def _load_gpt2_model():
    global _gpt2_model, _gpt2_tokenizer
    if _gpt2_model is None or _gpt2_tokenizer is None:
        try:
            import os
            import torch
            from transformers import AutoTokenizer, AutoModelForCausalLM
            model_path = _get_resource_path("backend/resources/fine_tuned_gpt2")
            if os.path.exists(model_path):
                print(f"[GPT2_MODEL] Loading fine-tuned GPT2 from {model_path}...")
                _gpt2_tokenizer = AutoTokenizer.from_pretrained(model_path)
                _gpt2_model = AutoModelForCausalLM.from_pretrained(model_path)
                device = torch.device("mps" if torch.backends.mps.is_available() else "cpu")
                _gpt2_model.to(device)
                print(f"[GPT2_MODEL] Loaded successfully on {device}.")
            else:
                print(f"[GPT2_MODEL] Local model not found at {model_path}.")
        except Exception as e:
            print(f"[GPT2_MODEL] Failed to load local GPT2 model: {e}")

def _generate_gpt2_response(message: str, history: List[Message], mode: InterviewMode, quality: str = "correct") -> Optional[str]:
    # Intercept skips/don't knows to prevent tiny local model from hallucinating gibberish
    if _is_skip(message) or _is_dont_know(message):
        try:
            return _demo_response(message, history, mode)
        except Exception:
            pass

    _load_gpt2_model()
    if _gpt2_model is None or _gpt2_tokenizer is None:
        return None
        
    try:
        import torch
        # Find last question
        last_q = ""
        for msg in reversed(history or []):
            if msg.role == "assistant":
                last_q = msg.content
                break
        if not last_q:
            last_q = get_opening_message(mode)
            
        last_q_clean = last_q.replace("**", "").replace("\n", " ").strip()
        message_clean = message.replace("\n", " ").strip()
        
        mode_name = "DSA"
        if mode == InterviewMode.HR:
            mode_name = "HR"
        elif mode == InterviewMode.SYSTEM_DESIGN:
            mode_name = "System Design"
            
        prompt = f"Interview {mode_name}. Question: {last_q_clean} Answer: {message_clean}. Quality: {quality}."
        input_text = f"<|prompt|>{prompt}<|completion|>"
        
        device = next(_gpt2_model.parameters()).device
        inputs = _gpt2_tokenizer(input_text, return_tensors="pt").to(device)
        
        with torch.no_grad():
            outputs = _gpt2_model.generate(
                **inputs,
                max_new_tokens=100,
                pad_token_id=_gpt2_tokenizer.eos_token_id,
                no_repeat_ngram_size=2,
                do_sample=False
            )
            
        generated_raw = _gpt2_tokenizer.decode(outputs[0], skip_special_tokens=False)
        if "<|completion|>" in generated_raw:
            completion_part = generated_raw.split("<|completion|>")[1]
            if "<|endoftext|>" in completion_part:
                completion_part = completion_part.split("<|endoftext|>")[0]
            completion_part = completion_part.replace("<|endoftext|>", "").strip()
            if completion_part:
                return completion_part
                
        # Fallback
        generated_clean = _gpt2_tokenizer.decode(outputs[0], skip_special_tokens=True)
        prompt_clean = f"Interview {mode_name}. Question: {last_q_clean} Answer: {message_clean}."
        if prompt_clean in generated_clean:
            return generated_clean.split(prompt_clean)[1].strip()
        return generated_clean.replace(prompt, "").strip()
    except Exception as e:
        print(f"[GPT2_MODEL] Error during inference: {e}")
        return None


def _assess_answer_quality(message: str, history: List[Message], mode: InterviewMode, difficulty: str) -> str:
    msg_clean = message.lower().strip()
    if msg_clean in ["skip", "pass", "i don't know", "dont know", "no idea", "idk"]:
        return "incorrect"
        
    # Check if user just pasted/asked a question
    if "?" in msg_clean or msg_clean.startswith("what is") or msg_clean.startswith("how do") or msg_clean.startswith("explain") or msg_clean.startswith("let us move"):
        return "unrelated"
        
    last_q = ""
    for msg in reversed(history or []):
        if msg.role == "assistant":
            last_q = msg.content
            break
    if not last_q:
        last_q = get_opening_message(mode)
        
    q_clean = last_q.lower()
    topic = "generic"
    if mode == InterviewMode.DSA:
        for q_topic, q_text in DSA_QUESTIONS:
            if q_text.lower()[:20] in q_clean or q_clean[:20] in q_text.lower():
                topic = q_topic
                break
    elif mode == InterviewMode.HR:
        for q_text in HR_QUESTIONS:
            if q_text.lower()[:20] in q_clean or q_clean[:20] in q_text.lower():
                topic = "behavioral"
                break
    else:
        for q_text in SYSTEM_QUESTIONS:
            if q_text.lower()[:20] in q_clean or q_clean[:20] in q_text.lower():
                topic = "architecture"
                break
                
    _load_ml_model()
    if _vectorizer and _classifier:
        try:
            qual = _get_quality(message, topic)
            if qual == "wrong":
                return "incorrect"
            return qual
        except Exception:
            pass
            
    return "partial"


async def generate_response(
    message: str,
    history: Optional[List[Message]] = None,
    mode: InterviewMode = InterviewMode.DSA,
    difficulty: str = "medium",
    target_role: Optional[str] = None,
    target_company: Optional[str] = None,
    preferred_model: str = "gemini",
) -> tuple:
    system_prompt = SYSTEM_PROMPTS[mode]
    if target_role or target_company:
        role_company_directive = f"\n\nCandidate Target Job Role: {target_role or 'Software Engineer'}\nCandidate Target Company: {target_company or 'Tech Company'}\nTailor your questions, difficulty, and tone to match this specific target role and company standard.\n"
        system_prompt += role_company_directive

    # Assess answer quality semantically using SVM classifier / rules
    quality = _assess_answer_quality(message, history or [], mode, difficulty)

    # Inject semantic assessment into system prompt for Cloud Models
    quality_directive = f"\n\n[CRITICAL EVALUATION SYSTEM DIRECTIVE]\nThe candidate's response has been analyzed by a semantic evaluator.\nAssessment quality of candidate's answer: {quality.upper()}.\n"
    if quality == "correct":
        quality_directive += "The candidate's answer is factually correct. Praise their correct understanding, briefly elaborate on the concept, and transition to the next question.\n"
    elif quality == "partial":
        quality_directive += "The candidate's answer is partially correct but lacks detail. Acknowledge what was correct, point out what was missing, and guide them/ask the next follow-up.\n"
    elif quality == "unrelated":
        quality_directive += "The candidate's answer is completely unrelated to the interview question (for example, they asked a question or spoke about a different topic). Politely redirect them to the topic or transition to a new question if they seem stuck.\n"
    else:
        quality_directive += "The candidate's answer is factually incorrect. Briefly explain the correct concept or logic, and transition to the next question.\n"
        
    system_prompt += quality_directive

    # Route based on selected Preferred Model
    model_used = "Local SVM Classifier"
    
    if preferred_model == "gemini" and settings.gemini_api_key:
        try:
            resp = await _gemini_response(message, history, mode, system_prompt)
            return resp, "Gemini 2.5 Flash"
        except Exception as e:
            print(f"[AI_SERVICE] Gemini error: {e}. Falling back.")
            pass
            
    if preferred_model == "openai_gpt4" and settings.openai_api_key:
        try:
            resp = await _openai_response(message, history, mode, system_prompt, model_name="gpt-4o")
            return resp, "GPT-4o"
        except Exception as e:
            print(f"[AI_SERVICE] OpenAI GPT-4o error: {e}. Falling back.")
            pass

    if preferred_model == "openai" and settings.openai_api_key:
        try:
            resp = await _openai_response(message, history, mode, system_prompt, model_name="gpt-4o-mini")
            return resp, "GPT-4o Mini"
        except Exception as e:
            print(f"[AI_SERVICE] OpenAI error: {e}. Falling back.")
            pass

    import os
    model_path = _get_resource_path("backend/resources/fine_tuned_gpt2")
    
    if preferred_model == "gpt2" and os.path.exists(model_path):
        gpt2_resp = _generate_gpt2_response(message, history or [], mode, quality)
        if gpt2_resp:
            return gpt2_resp, "Local DistilGPT2"
            
    if preferred_model == "svm":
        return _demo_response(message, history or [], mode, difficulty), "Local SVM Classifier"

    # Default Fallback Resolution Order
    if settings.gemini_api_key:
        try:
            resp = await _gemini_response(message, history, mode, system_prompt)
            return resp, "Gemini 2.5 Flash"
        except Exception:
            pass
            
    if settings.openai_api_key:
        try:
            # Fallback default uses gpt-4o-mini
            resp = await _openai_response(message, history, mode, system_prompt, model_name="gpt-4o-mini")
            return resp, "GPT-4o Mini"
        except Exception:
            pass
            
    if os.path.exists(model_path):
        gpt2_resp = _generate_gpt2_response(message, history or [], mode, quality)
        if gpt2_resp:
            return gpt2_resp, "Local DistilGPT2"
            
    return _demo_response(message, history or [], mode, difficulty), "Local SVM Classifier"


# ── OpenAI ────────────────────────────────────────────────────────────────────

async def _openai_response(message, history, mode, system_prompt: str, model_name: str = "gpt-4o-mini"):
    from openai import AsyncOpenAI
    client = AsyncOpenAI(api_key=settings.openai_api_key)
    msgs = [{"role": "system", "content": system_prompt}]
    if history:
        for m in history[-12:]:
            msgs.append({"role": m.role, "content": m.content})
    msgs.append({"role": "user", "content": message})
    resp = await client.chat.completions.create(
        model=model_name, messages=msgs, max_tokens=350, temperature=0.7
    )
    return resp.choices[0].message.content.strip()


# ── Gemini ────────────────────────────────────────────────────────────────────

async def _gemini_response(message, history, mode, system_prompt: str):
    import google.generativeai as genai
    genai.configure(api_key=settings.gemini_api_key)
    model = genai.GenerativeModel("gemini-2.5-flash", system_instruction=system_prompt)
    chat_history = []
    if history:
        for m in history[-12:]:
            chat_history.append({"role": "user" if m.role == "user" else "model", "parts": [m.content]})
    chat = model.start_chat(history=chat_history)
    resp = await chat.send_message_async(f"Candidate: {message}")
    return resp.text.strip()


# ── Custom opening message ───────────────────────────────────────────────────

async def get_custom_opening_message(
    mode: InterviewMode,
    difficulty: str = "medium",
    target_role: Optional[str] = None,
    target_company: Optional[str] = None,
    preferred_model: str = "gemini",
) -> tuple:
    model_used = "Local SVM Classifier"
    import os
    model_path = _get_resource_path("backend/resources/fine_tuned_gpt2")
    if preferred_model == "gemini" and settings.gemini_api_key:
        model_used = "Gemini 2.5 Flash"
    elif preferred_model == "openai_gpt4" and settings.openai_api_key:
        model_used = "GPT-4o"
    elif preferred_model == "openai" and settings.openai_api_key:
        model_used = "GPT-4o Mini"
    elif preferred_model == "gpt2" and os.path.exists(model_path):
        model_used = "Local DistilGPT2"
    elif preferred_model == "svm":
        model_used = "Local SVM Classifier"
    else:
        # Fallback order
        if settings.gemini_api_key:
            model_used = "Gemini 2.5 Flash"
        elif settings.openai_api_key:
            model_used = "GPT-4o Mini"
        elif os.path.exists(model_path):
            model_used = "Local DistilGPT2"

    if not (target_role or target_company):
        return get_random_opening_message(mode, difficulty), model_used
        
    mode_label = "Data Structures & Algorithms"
    if mode == InterviewMode.HR:
        mode_label = "HR & Behavioral"
    elif mode == InterviewMode.SYSTEM_DESIGN:
        mode_label = "System Design"

    prompt = f"""You are a senior technical interviewer.
Generate a first, opening question for a candidate interviewing for the following role:
Role: {target_role or 'Software Engineer'}
Company: {target_company or 'Tech Company'}
Interview Type: {mode_label}
Difficulty Level: {difficulty}

Generate a concise, professional greeting and ONE clear, relevant question to start the interview.
Do not ask multiple questions. Keep it under 3 sentences. Do not use any markdown formatting or placeholders.
"""

    if model_used == "Gemini 2.5 Flash":
        try:
            import google.generativeai as genai
            genai.configure(api_key=settings.gemini_api_key)
            model = genai.GenerativeModel("gemini-2.5-flash")
            resp = await model.generate_content_async(prompt)
            return resp.text.strip(), model_used
        except Exception:
            pass

    if model_used == "GPT-4o":
        try:
            from openai import AsyncOpenAI
            client = AsyncOpenAI(api_key=settings.openai_api_key)
            resp = await client.chat.completions.create(
                model="gpt-4o",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=150,
                temperature=0.7
            )
            return resp.choices[0].message.content.strip(), model_used
        except Exception:
            pass

    if model_used == "GPT-4o Mini":
        try:
            from openai import AsyncOpenAI
            client = AsyncOpenAI(api_key=settings.openai_api_key)
            resp = await client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=150,
                temperature=0.7
            )
            return resp.choices[0].message.content.strip(), model_used
        except Exception:
            pass

    return get_random_opening_message(mode, difficulty), model_used


# ── Demo evaluation ───────────────────────────────────────────────────────────

_vectorizer = None
_classifier = None

def _load_ml_model():
    global _vectorizer, _classifier
    if _vectorizer is None or _classifier is None:
        try:
            import joblib
            vec_path = _get_resource_path("backend/resources/tfidf_vectorizer.pkl")
            clf_path = _get_resource_path("backend/resources/svm_classifier.pkl")
            _vectorizer = joblib.load(vec_path)
            _classifier = joblib.load(clf_path)
        except Exception as e:
            print(f"[ML_MODEL] Failed to load SVM models: {e}")

def _get_quality(message: str, topic: str) -> str:
    """
    Returns 'wrong', 'partial', or 'correct' using a custom trained SVM classifier.
    """
    msg = message.lower().strip()

    # Definite wrong answers — catch "don't know", "no idea", single words, etc.
    WRONG_PHRASES = [
        "don't know", "dont know", "no idea", "not sure", "i don't", "i dont",
        "have no", "no clue", "idk", "skip", "pass", "help", "hint",
        "what is", "what's", "tell me", "explain"
    ]
    if any(p in msg for p in WRONG_PHRASES):
        return "wrong"

    # Too short to be a real answer
    if len(msg.split()) < 8:
        return "wrong"

    _load_ml_model()
    if _vectorizer is not None and _classifier is not None:
        try:
            X = _vectorizer.transform([message])
            pred = int(_classifier.predict(X)[0])
            if pred == 2:
                return "correct"
            elif pred == 1:
                return "partial"
            return "wrong"
        except Exception as e:
            print(f"[ML_MODEL] Prediction error in _get_quality: {e}")

    # Fallback to keyword-based heuristics if model files are not loaded
    keywords = KEYWORD_MAP.get(topic, [])
    hits = sum(1 for k in keywords if k in msg)

    if hits >= 3:
        return "correct"
    elif hits >= 1:
        return "partial"
    return "wrong"


def _find_last_question(history: List[Message]) -> tuple:
    """
    Scan history backwards through assistant messages to find
    which DSA question was most recently asked.
    Returns (question_index, topic) or (None, None).
    """
    for msg in reversed(history):
        if msg.role != "assistant":
            continue
        content_lower = msg.content.lower()
        for i, (topic, q_text) in enumerate(DSA_QUESTIONS):
            # Match on first 45 chars of the question text (robust to bold/markdown)
            if q_text[:45].lower() in content_lower:
                return i, topic
    return None, None


# ── Helper functions for Demo Mode ──

def _is_skip(message: str) -> bool:
    msg = message.lower().strip()
    # 1. Exact full-message match for simple commands
    if msg in ["pass", "skip", "next", "idk", "next question", "move on", "skip question"]:
        return True
    return False

def _is_dont_know(message: str) -> bool:
    msg = message.lower().strip()
    # 2. Check standalone word boundary matches for dont know indicators
    import re
    dont_know_phrases = [
        "don't know", "dont know", "no idea", "not sure", "no clue",
        "haven't studied", "have no idea", "no experience", "idk"
    ]
    for p in dont_know_phrases:
        if re.search(rf"\b{re.escape(p)}\b", msg):
            return True
    return False


def _last_was_wrong_feedback(history: List[Message]) -> bool:
    for msg in reversed(history):
        if msg.role == "assistant":
            content = msg.content.lower()
            wrong_indicators = [
                "that's not right", "that's not correct", "that's not accurate", 
                "not quite", "that answer is too vague", "that answer doesn't demonstrate",
                "your answer needs more detail", "your answer lacks"
            ]
            return any(ind in content for ind in wrong_indicators)
    return False

DSA_EXPLANATIONS = {
    "complexity": "Binary search requires a sorted array and operates in O(log n) time by halving the search space at each step.",
    "arrays": "Standard arrays have a fixed size. Dynamic arrays resize automatically (usually doubling capacity) when full, which takes O(n) for copying but O(1) amortized for insertions.",
    "hashing": "Hash maps map keys to bucket indices using a hash function. Collisions (when multiple keys map to the same bucket) are resolved using chaining (linked lists) or open addressing (probing).",
    "linked_list": "Cycles in a singly linked list can be detected using Floyd's cycle detection algorithm (slow and fast pointers) in O(n) time and O(1) space.",
    "trees": "A binary search tree (BST) is a binary tree where for every node, the left subtree contains smaller values and the right subtree contains larger values.",
    "sorting": "Merge sort is an O(n log n) divide-and-conquer stable sorting algorithm that requires O(n) extra memory. Quicksort is in-place but has a worst-case O(n²) time.",
    "dp": "Dynamic programming solves problems with overlapping subproblems and optimal substructure by caching solutions using memoization (top-down) or tabulation (bottom-up).",
    "graphs": "BFS explores neighbor nodes level-by-level (using a queue, great for shortest paths), whereas DFS explores as deep as possible along each branch (using a stack/recursion).",
    "stacks": "A stack is a LIFO structure. We can check bracket balance by pushing open brackets onto the stack and popping them when matching closing brackets are encountered.",
    "heaps": "A min-heap is a complete binary tree where parent nodes are smaller than their children. Insertion and deletion take O(log n) time by bubbling elements.",
}

# Difficulty Mappings
DSA_DIFFICULTY = {
    0: "easy", 1: "easy", 2: "medium", 3: "medium", 4: "easy",
    5: "medium", 6: "medium", 7: "hard", 8: "hard", 9: "easy",
    10: "hard", 11: "medium", 12: "medium", 13: "medium",
    14: "hard", 15: "hard", 16: "hard", 17: "hard", 18: "hard", 19: "hard"
}

HR_DIFFICULTY = {
    0: "medium", 1: "hard", 2: "hard", 3: "easy", 4: "easy",
    5: "hard", 6: "medium", 7: "medium", 8: "medium", 9: "easy"
}

SYSTEM_DIFFICULTY = {
    0: "easy", 1: "hard", 2: "medium", 3: "hard", 4: "easy",
    5: "hard", 6: "hard", 7: "medium", 8: "hard", 9: "medium"
}

# Hint Mappings
DSA_HINTS = {
    0: "Think about how many times you can divide a list of size N in half. What condition must the array satisfy?",
    1: "Consider memory layout. Do standard arrays change size? How does a dynamic array resize under the hood?",
    2: "Think about the hash index formula. What if two keys map to the same bucket?",
    3: "Think of two runners (slow and fast pointers) on a circular track. Will they meet?",
    4: "For any node with value X, where do values smaller than X and larger than X go?",
    5: "In-order traversal visits: Left subtree, then Root, then Right subtree. What order does that give for a BST?",
    6: "Merge sort divides the array in half recursively, sorts them, and merges them. What is the space needed to merge?",
    7: "Memoization caches results of recursive calls (top-down). Tabulation fills a table iteratively (bottom-up).",
    8: "BFS uses a queue and visits neighbors level-by-level (great for shortest path). DFS goes deep along a branch first.",
    9: "Push opening brackets onto a stack. When you see a closing one, pop and check if it matches the opening one.",
    10: "A min-heap is a complete binary tree where parent is always smaller than children. Insertion involves bubble-up.",
    11: "Can you use a hash map to store elements you've seen and look up the complement (target - current)?",
    12: "You can solve it using recursion (slow), memoization (fast), or a simple iterative loop (O(1) space).",
    13: "The height is 1 + the maximum of the heights of the left and right subtrees. Try a recursive approach.",
    14: "Topological sort is an ordering of vertices in a directed acyclic graph where edge U -> V means U comes before V.",
    15: "Quicksort partitions in-place around a pivot. In practice, CPU caching makes in-place swaps faster than copying.",
    16: "Keep two pointers representing the window boundaries. Expand the right pointer and contract the left pointer as needed.",
    17: "Use three pointers: prev, curr, and next. Update curr.next to point to prev as you traverse the list.",
    18: "Load factor is number of elements divided by number of buckets. A high load factor means more collisions.",
    19: "For N=1,000,000, N² is 1 trillion operations, while N log N is roughly 20 million operations."
}

HR_HINTS = {
    0: "Use the STAR method. Focus on your specific role, technical decisions, and what was achieved.",
    1: "Explain how you focused on the problem rather than the person, listened actively, and found a compromise.",
    2: "Own the mistake, describe how you communicated it early, and what steps you took to mitigate the damage.",
    3: "Talk about Eisenhower matrix or priority queues. How do you assess impact vs urgency?",
    4: "Explain your learning strategy: reading docs, writing prototype code, and asking experts.",
    5: "Focus on how you presented data to support your view, but ultimately committed to the team decision.",
    6: "Choose a real technical weakness but show how you are actively addressing it (e.g. taking a course, contributing to projects).",
    7: "Avoid jargon. Use analogies (e.g., comparing a database to a library index).",
    8: "Mention how you noticed a gap in documentation, tool, or process and took the initiative to fix it.",
    9: "Mention technical growth (e.g. senior role, architectural design) and how this company helps you get there."
}

SYSTEM_HINTS = {
    0: "Consider write vs read load, ACID requirements (SQL), and schema flexibility or scale (NoSQL).",
    1: "Think about load balancers, database sharding, microservices, and auto-scaling groups.",
    2: "You can cache DB queries or compiled pages using Redis/Memcached. Use LRU (Least Recently Used) eviction.",
    3: "Consider multi-region deployment, database replicas, automatic failovers, and rate limiting.",
    4: "REST is simple and resource-oriented. GraphQL allows clients to request exactly the fields they need, avoiding over-fetching.",
    5: "CAP states you can only guarantee 2 of: Consistency, Availability, Partition Tolerance. In a distributed network, partitions are inevitable.",
    6: "Use CDN caching, auto-scaling, queueing (RabbitMQ/Kafka) to buffer requests, and rate-limiting to protect backend services.",
    7: "Track API latency (p99), system CPU/memory load, and error rates (5xx status codes).",
    8: "Consider distributed transactions (Saga pattern), eventual consistency, and message queues for event-driven updates.",
    9: "Explain JWT tokens, OAuth2 providers, sessions, and role-based access control (RBAC)."
}

def _find_last_hr_question(history: List[Message]) -> Optional[int]:
    for msg in reversed(history):
        if msg.role != "assistant":
            continue
        content_lower = msg.content.lower()
        for i, q in enumerate(HR_QUESTIONS):
            if q[:35].lower() in content_lower:
                return i
    return None

def _find_last_system_question(history: List[Message]) -> Optional[int]:
    for msg in reversed(history):
        if msg.role != "assistant":
            continue
        content_lower = msg.content.lower()
        for i, q in enumerate(SYSTEM_QUESTIONS):
            if q[:35].lower() in content_lower:
                return i
    return None

def _get_next_dsa_question(history: List[Message], current_idx: int, difficulty: str = "medium") -> str:
    asked = set()
    for msg in history:
        if msg.role == "assistant":
            for i, (_, q_text) in enumerate(DSA_QUESTIONS):
                if q_text[:45].lower() in msg.content.lower():
                    asked.add(i)
    asked.add(current_idx)
    
    # Filter by difficulty
    available = [i for i in range(len(DSA_QUESTIONS)) if i not in asked and DSA_DIFFICULTY.get(i) == difficulty]
    if not available:
        # Fallback to any remaining questions regardless of difficulty if current difficulty completed
        available = [i for i in range(len(DSA_QUESTIONS)) if i not in asked]
        if not available:
            return "You've answered all my questions. **Outstanding session — you showed solid DSA knowledge throughout!**"
            
    next_i = available[0]
    _, next_q = DSA_QUESTIONS[next_i]
    return next_q

# ── Random Opening Message Generator ──

def get_random_opening_message(mode: InterviewMode, difficulty: str = "medium") -> str:
    import random
    
    if mode == InterviewMode.DSA:
        available_indices = [i for i, diff in DSA_DIFFICULTY.items() if diff == difficulty]
        if not available_indices:
            available_indices = list(DSA_DIFFICULTY.keys())
        idx = random.choice(available_indices)
        q = DSA_QUESTIONS[idx][1]
        prefix = f"Hello! I'm your AI technical interviewer. We'll focus on **Data Structures & Algorithms** (Difficulty: **{difficulty.capitalize()}**). Let's begin — "
        return f"{prefix}**{q}**"
        
    elif mode == InterviewMode.HR:
        available_indices = [i for i, diff in HR_DIFFICULTY.items() if diff == difficulty]
        if not available_indices:
            available_indices = list(HR_DIFFICULTY.keys())
        idx = random.choice(available_indices)
        q = HR_QUESTIONS[idx]
        prefix = f"Welcome! I'm your behavioral interviewer. Let's start (Difficulty: **{difficulty.capitalize()}**). "
        return f"{prefix}**{q}**"
        
    else:
        available_indices = [i for i, diff in SYSTEM_DIFFICULTY.items() if diff == difficulty]
        if not available_indices:
            available_indices = list(SYSTEM_DIFFICULTY.keys())
        idx = random.choice(available_indices)
        q = SYSTEM_QUESTIONS[idx]
        prefix = f"Hi! Today we'll work through a system design problem (Difficulty: **{difficulty.capitalize()}**). "
        return f"{prefix}**{q}**"


# ── Demo DSA ──────────────────────────────────────────────────────────────────

def _demo_dsa(message: str, history: List[Message], difficulty: str = "medium") -> str:
    import random

    last_idx, last_topic = _find_last_question(history)
    if last_topic is None:
        last_idx  = 0
        last_topic = DSA_QUESTIONS[0][0]  # "complexity"

    # Check for skip or don't know
    if _is_skip(message):
        next_q = _get_next_dsa_question(history, last_idx, difficulty)
        return f"Alright, let's move on. Next — **{next_q}**"
        
    if _is_dont_know(message):
        explanation = DSA_EXPLANATIONS.get(last_topic, "Binary search requires a sorted array and works by halving the search space each step.")
        next_q = _get_next_dsa_question(history, last_idx, difficulty)
        return f"No problem! Here is a quick explanation: {explanation}\n\nNext — **{next_q}**"

    quality = _get_quality(message, last_topic)

    if quality == "wrong":
        if _last_was_wrong_feedback(history):
            # Already got it wrong once, move on
            explanation = DSA_EXPLANATIONS.get(last_topic, "")
            next_q = _get_next_dsa_question(history, last_idx, difficulty)
            return f"Let's move on to the next topic. (Note: {explanation})\n\nNext — **{next_q}**"
        else:
            return WRONG_RESPONSE.get(last_topic,
                "That's not correct. Think carefully about the core concept and try again. What do you know about this topic?")

    if quality == "partial":
        if _last_was_wrong_feedback(history):
            # Already got partial/wrong feedback once, move on
            next_q = _get_next_dsa_question(history, last_idx, difficulty)
            return f"Let's move on. Next — **{next_q}**"
        else:
            return PARTIAL_RESPONSE.get(last_topic,
                "You're partially right but your answer is incomplete. What are you missing? Try to be more specific.")

    # Correct -> get next question
    next_q = _get_next_dsa_question(history, last_idx, difficulty)
    if "answered all my questions" in next_q:
        return f"{random.choice(CORRECT_PRAISE)} {next_q}"
    return f"{random.choice(CORRECT_PRAISE)} Next — **{next_q}**"


# ── Demo HR ───────────────────────────────────────────────────────────────────

def _demo_hr(message: str, history: List[Message], difficulty: str = "medium") -> str:
    import random

    last_idx = _find_last_hr_question(history)
    if last_idx is None:
        last_idx = 0

    # Helper to get next HR question
    def _get_next_hr_question(hist, current_i):
        asked = set()
        for msg in hist:
            if msg.role == "assistant":
                for i, q in enumerate(HR_QUESTIONS):
                    if q[:35].lower() in msg.content.lower():
                        asked.add(i)
        asked.add(current_i)
        
        # Filter by difficulty
        available = [i for i in range(len(HR_QUESTIONS)) if i not in asked and HR_DIFFICULTY.get(i) == difficulty]
        if not available:
            available = [i for i in range(len(HR_QUESTIONS)) if i not in asked]
            if not available:
                return "That wraps up our behavioral round. **Well done — you showed strong communication throughout.**"
                
        return HR_QUESTIONS[available[0]]

    # Check for skip or don't know
    if _is_skip(message) or _is_dont_know(message):
        next_q = _get_next_hr_question(history, last_idx)
        if "behavioral round" in next_q:
            return f"Alright, let's wrap up. {next_q}"
        return f"Sure, let's move to the next question. Next — **{next_q}**"

    word_count = len(message.split())
    msg_lower  = message.lower()

    VAGUE = ["don't know", "not sure", "nothing", "idk", "no experience", "never", "skip", "pass"]
    if any(p in msg_lower for p in VAGUE) or word_count < 10:
        if _last_was_wrong_feedback(history):
            next_q = _get_next_hr_question(history, last_idx)
            return f"Let's move on. Next — **{next_q}**"
        return "That answer is too vague. I need a **specific real example** — describe the situation, what YOU did, and what the outcome was. Please try again."

    if word_count < 20:
        if _last_was_wrong_feedback(history):
            next_q = _get_next_hr_question(history, last_idx)
            return f"Let's move on. Next — **{next_q}**"
        return "Your answer needs more detail. Use the **STAR method**: Situation, Task, Action, Result. Can you expand on what you actually did and what happened?"

    praise = random.choice(["Good example.", "Solid answer.", "Nice response."])
    next_q = _get_next_hr_question(history, last_idx)
    if "behavioral round" in next_q:
        return f"{praise} {next_q}"
    return f"{praise} Next — **{next_q}**"


# ── Demo System Design ────────────────────────────────────────────────────────

def _demo_system(message: str, history: List[Message], difficulty: str = "medium") -> str:
    import random

    last_idx = _find_last_system_question(history)
    if last_idx is None:
        last_idx = 0

    # Helper to get next System Design question
    def _get_next_system_question(hist, current_i):
        asked = set()
        for msg in hist:
            if msg.role == "assistant":
                for i, q in enumerate(SYSTEM_QUESTIONS):
                    if q[:35].lower() in msg.content.lower():
                        asked.add(i)
        asked.add(current_i)
        
        # Filter by difficulty
        available = [i for i in range(len(SYSTEM_QUESTIONS)) if i not in asked and SYSTEM_DIFFICULTY.get(i) == difficulty]
        if not available:
            available = [i for i in range(len(SYSTEM_QUESTIONS)) if i not in asked]
            if not available:
                return "We've covered the main areas. **Well done — strong architectural thinking throughout!**"
        return SYSTEM_QUESTIONS[available[0]]

    # Check for skip or don't know
    if _is_skip(message):
        next_q = _get_next_system_question(history, last_idx)
        return f"Alright, let's try a different topic. Next — **{next_q}**"
        
    if _is_dont_know(message):
        next_q = _get_next_system_question(history, last_idx)
        return f"No problem. In system design, we consider trade-offs and scaling strategies. Let's move to the next area. Next — **{next_q}**"

    msg_lower = message.lower()
    word_count = len(message.split())

    VAGUE = ["don't know", "not sure", "idk", "no idea", "skip", "pass"]
    TECH_KEYWORDS = [
        "database", "cache", "scale", "server", "api", "load", "sql", "nosql",
        "redis", "cdn", "queue", "partition", "replica", "consistency",
        "availability", "latency", "throughput", "index", "sharding", "microservice",
    ]

    if any(p in msg_lower for p in VAGUE) or word_count < 8:
        if _last_was_wrong_feedback(history):
            next_q = _get_next_system_question(history, last_idx)
            return f"Let's move to the next design question. Next — **{next_q}**"
        return "That answer doesn't demonstrate system design knowledge. Name **specific technologies** and explain **why** you'd choose them. Please try again."

    keyword_hits = sum(1 for k in TECH_KEYWORDS if k in msg_lower)
    if keyword_hits == 0:
        if _last_was_wrong_feedback(history):
            next_q = _get_next_system_question(history, last_idx)
            return f"Let's move on. Next — **{next_q}**"
        return "Your answer lacks technical specifics. In system design you need to mention concrete technologies (e.g. PostgreSQL, Redis, Nginx) and explain trade-offs. Try again with more depth."
    if keyword_hits < 2:
        if _last_was_wrong_feedback(history):
            next_q = _get_next_system_question(history, last_idx)
            return f"Let's move on. Next — **{next_q}**"
        return f"You touched on one aspect, but system design needs to address multiple concerns. You mentioned 1 technical concept — can you also address **scalability and fault tolerance**?"

    praise = random.choice(["Good thinking.", "Solid approach.", "Reasonable choice."])
    next_q = _get_next_system_question(history, last_idx)
    if "covered the main areas" in next_q:
        return f"{praise} {next_q}"
    return f"{praise} Next — **{next_q}**"


# ── Demo router ───────────────────────────────────────────────────────────────

def _demo_response(message: str, history: List[Message], mode: InterviewMode, difficulty: str = "medium") -> str:
    if mode == InterviewMode.DSA:
        return _demo_dsa(message, history, difficulty)
    elif mode == InterviewMode.HR:
        return _demo_hr(message, history, difficulty)
    else:
        return _demo_system(message, history, difficulty)


def get_opening_message(mode: InterviewMode) -> str:
    return OPENING_MESSAGES.get(mode, OPENING_MESSAGES[InterviewMode.DSA])


async def generate_hint(question: str, mode: InterviewMode) -> str:
    prompt = f"""You are a technical mock interview coach.
The candidate is stuck on the following question during a {mode.value.upper()} interview:
"{question}"

Generate a single, helpful, and concise hint that guides the candidate toward the solution without directly giving away the answer. Keep the hint to 1-2 sentences maximum. Do not use any markdown formatting or prefix labels like "Hint:".
"""
    if settings.ai_provider == "gemini" and settings.gemini_api_key:
        try:
            import google.generativeai as genai
            genai.configure(api_key=settings.gemini_api_key)
            model = genai.GenerativeModel("gemini-2.5-flash")
            resp = await model.generate_content_async(prompt)
            return resp.text.strip()
        except Exception:
            pass

    if settings.openai_api_key:
        try:
            from openai import AsyncOpenAI
            client = AsyncOpenAI(api_key=settings.openai_api_key)
            resp = await client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=100,
                temperature=0.7
            )
            return resp.choices[0].message.content.strip()
        except Exception:
            pass

    return ""