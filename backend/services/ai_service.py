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

async def generate_response(
    message: str,
    history: Optional[List[Message]] = None,
    mode: InterviewMode = InterviewMode.DSA,
) -> str:
    if settings.ai_provider == "gemini" and settings.gemini_api_key:
        return await _gemini_response(message, history, mode)
    elif settings.openai_api_key:
        return await _openai_response(message, history, mode)
    else:
        return _demo_response(message, history or [], mode)

# ── OpenAI ────────────────────────────────────────────────────────────────────

async def _openai_response(message, history, mode):
    from openai import AsyncOpenAI
    client = AsyncOpenAI(api_key=settings.openai_api_key)
    msgs = [{"role": "system", "content": SYSTEM_PROMPTS[mode]}]
    if history:
        for m in history[-12:]:
            msgs.append({"role": m.role, "content": m.content})
    msgs.append({"role": "user", "content": message})
    resp = await client.chat.completions.create(
        model="gpt-4o-mini", messages=msgs, max_tokens=350, temperature=0.7
    )
    return resp.choices[0].message.content.strip()

# ── Gemini ────────────────────────────────────────────────────────────────────

async def _gemini_response(message, history, mode):
    import google.generativeai as genai
    genai.configure(api_key=settings.gemini_api_key)
    model = genai.GenerativeModel("gemini-1.5-flash")
    chat_history = []
    if history:
        for m in history[-12:]:
            chat_history.append({"role": "user" if m.role == "user" else "model", "parts": [m.content]})
    chat = model.start_chat(history=chat_history)
    resp = await chat.send_message_async(f"{SYSTEM_PROMPTS[mode]}\n\nCandidate: {message}")
    return resp.text.strip()

# ── Demo evaluation ───────────────────────────────────────────────────────────

def _get_quality(message: str, topic: str) -> str:
    """
    Returns 'wrong', 'partial', or 'correct'.
    
    'wrong'  — clearly no knowledge (too short, filler phrases, zero keywords)
    'partial' — some keywords but incomplete
    'correct' — enough keywords to show genuine understanding
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


# ── Demo DSA ──────────────────────────────────────────────────────────────────

def _demo_dsa(message: str, history: List[Message]) -> str:
    import random

    last_idx, last_topic = _find_last_question(history)

    # First reply (no question tracked yet) — treat as answering Q0
    if last_topic is None:
        last_idx  = 0
        last_topic = DSA_QUESTIONS[0][0]  # "complexity"

    quality = _get_quality(message, last_topic)

    if quality == "wrong":
        return WRONG_RESPONSE.get(last_topic,
            "That's not correct. Think carefully about the core concept and try again. What do you know about this topic?")

    if quality == "partial":
        return PARTIAL_RESPONSE.get(last_topic,
            "You're partially right but your answer is incomplete. What are you missing? Try to be more specific.")

    # Correct — find all indices asked so far and pick the next one
    asked = set()
    for msg in history:
        if msg.role == "assistant":
            for i, (_, q_text) in enumerate(DSA_QUESTIONS):
                if q_text[:45].lower() in msg.content.lower():
                    asked.add(i)
    asked.add(last_idx)

    available = [i for i in range(len(DSA_QUESTIONS)) if i not in asked]
    if not available:
        return f"{random.choice(CORRECT_PRAISE)} You've answered all my questions. **Outstanding session — you showed solid DSA knowledge throughout!**"

    next_i = available[0]
    _, next_q = DSA_QUESTIONS[next_i]
    return f"{random.choice(CORRECT_PRAISE)} Next — **{next_q}**"


# ── Demo HR ───────────────────────────────────────────────────────────────────

def _demo_hr(message: str, history: List[Message]) -> str:
    import random

    asked = set()
    for msg in history:
        if msg.role == "assistant":
            for q in HR_QUESTIONS:
                if q[:35].lower() in msg.content.lower():
                    asked.add(q)

    word_count = len(message.split())
    msg_lower  = message.lower()

    VAGUE = ["don't know", "not sure", "nothing", "idk", "no experience", "never", "skip", "pass"]
    if any(p in msg_lower for p in VAGUE) or word_count < 10:
        return "That answer is too vague. I need a **specific real example** — describe the situation, what YOU did, and what the outcome was. Please try again."

    if word_count < 20:
        return "Your answer needs more detail. Use the **STAR method**: Situation, Task, Action, Result. Can you expand on what you actually did and what happened?"

    praise = random.choice(["Good example.", "Solid answer.", "Nice response."])
    available = [q for q in HR_QUESTIONS if q not in asked]
    if not available:
        return f"{praise} That wraps up our behavioral round. **Well done — you showed strong communication throughout.**"
    return f"{praise} Next — **{available[0]}**"


# ── Demo System Design ────────────────────────────────────────────────────────

def _demo_system(message: str, history: List[Message]) -> str:
    import random

    asked = set()
    for msg in history:
        if msg.role == "assistant":
            for q in SYSTEM_QUESTIONS:
                if q[:35].lower() in msg.content.lower():
                    asked.add(q)

    msg_lower = message.lower()
    word_count = len(message.split())

    VAGUE = ["don't know", "not sure", "idk", "no idea", "skip", "pass"]
    TECH_KEYWORDS = [
        "database", "cache", "scale", "server", "api", "load", "sql", "nosql",
        "redis", "cdn", "queue", "partition", "replica", "consistency",
        "availability", "latency", "throughput", "index", "sharding", "microservice",
    ]

    if any(p in msg_lower for p in VAGUE) or word_count < 8:
        return "That answer doesn't demonstrate system design knowledge. Name **specific technologies** and explain **why** you'd choose them. Please try again."

    keyword_hits = sum(1 for k in TECH_KEYWORDS if k in msg_lower)
    if keyword_hits == 0:
        return "Your answer lacks technical specifics. In system design you need to mention concrete technologies (e.g. PostgreSQL, Redis, Nginx) and explain trade-offs. Try again with more depth."
    if keyword_hits < 2:
        return f"You touched on one aspect, but system design needs to address multiple concerns. You mentioned 1 technical concept — can you also address **scalability and fault tolerance**?"

    praise = random.choice(["Good thinking.", "Solid approach.", "Reasonable choice."])
    available = [q for q in SYSTEM_QUESTIONS if q not in asked]
    if not available:
        return f"{praise} We've covered the main areas. **Well done — strong architectural thinking throughout!**"
    return f"{praise} Now — **{available[0]}**"


# ── Demo router ───────────────────────────────────────────────────────────────

def _demo_response(message: str, history: List[Message], mode: InterviewMode) -> str:
    if mode == InterviewMode.DSA:
        return _demo_dsa(message, history)
    elif mode == InterviewMode.HR:
        return _demo_hr(message, history)
    else:
        return _demo_system(message, history)


def get_opening_message(mode: InterviewMode) -> str:
    return OPENING_MESSAGES.get(mode, OPENING_MESSAGES[InterviewMode.DSA])