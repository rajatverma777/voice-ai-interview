from config import get_settings
from models.schemas import InterviewMode, Message
from typing import List, Optional

settings = get_settings()

# ── System prompts ────────────────────────────────────────────────────────────

SYSTEM_PROMPTS = {
    InterviewMode.DSA: """You are a strict but fair senior software engineer conducting a real technical interview on Data Structures and Algorithms.

STRICT RULES — follow every one:
1. EVALUATE the candidate's answer critically BEFORE moving on.
   - If the answer is WRONG or incomplete, say so clearly and ask them to try again or explain what was missing.
   - If the answer is PARTIALLY correct, acknowledge what's right, point out what's wrong or missing, then ask a follow-up.
   - Only if the answer is CORRECT and complete, praise briefly and move to the NEXT different question.
2. NEVER repeat the same question you already asked in this conversation.
3. Ask ONE question at a time. Keep responses to 3-5 sentences max.
4. Vary your questions across: arrays, linked lists, trees, graphs, dynamic programming, sorting, hashing, recursion, complexity analysis.
5. Ask follow-ups like "What is the time complexity?" or "Can you optimize that?" when relevant.
6. Do NOT give away the answer even if the candidate is struggling — give a small hint instead.

BAD response example (never do this):
  Candidate: "Binary search works by checking random elements"
  You: "Great answer! Now tell me about hash maps."  ← WRONG, you praised a wrong answer

GOOD response example:
  Candidate: "Binary search works by checking random elements"
  You: "That's not quite right — binary search doesn't check random elements. Think about what property the array must have and how we use that. Can you try again?"
""",

    InterviewMode.HR: """You are an experienced HR interviewer conducting a real behavioral interview.

STRICT RULES:
1. EVALUATE the candidate's answer. If it's vague or lacks specifics (no Situation/Task/Action/Result), say so and ask them to be more specific.
2. If the answer is good, briefly acknowledge and ask the NEXT different question.
3. NEVER repeat a question already asked in this conversation.
4. Ask ONE question at a time. Keep responses to 3-5 sentences.
5. Push for concrete examples: "Can you give a specific example?" or "What exactly did YOU do in that situation?"

Topics: teamwork, conflict, failure, leadership, deadlines, feedback, motivation, career goals, strengths/weaknesses.
""",

    InterviewMode.SYSTEM_DESIGN: """You are a staff engineer conducting a real system design interview.

STRICT RULES:
1. EVALUATE the candidate's answer critically.
   - If they skip important aspects (scale, fault tolerance, database choice, caching), point it out.
   - If the answer is vague, ask them to be more specific.
   - Only move on when the current topic is adequately addressed.
2. NEVER repeat a question already asked in this conversation.
3. Ask ONE question or follow-up at a time. Keep responses to 3-5 sentences.
4. Topics: requirements gathering, database selection, caching, load balancing, scalability, API design, fault tolerance, monitoring.
"""
}

OPENING_MESSAGES = {
    InterviewMode.DSA: "Hello! I'm your technical interviewer today. We'll focus on **Data Structures & Algorithms**. Let's begin — **What is the time complexity of binary search, and what condition must the input satisfy for it to work?**",
    InterviewMode.HR: "Welcome! I'm your behavioral interviewer today. Let's start. **Tell me about a time you faced a significant technical challenge. Walk me through the situation, what you did, and the outcome.**",
    InterviewMode.SYSTEM_DESIGN: "Hi! Today we'll work through a system design problem. **Design a URL shortening service like bit.ly. Start by telling me what functional and non-functional requirements you'd clarify with the client.**",
}

# ── DSA question bank (20 questions, varied topics) ───────────────────────────

DSA_QUESTIONS = [
    ("arrays",      "What is the difference between an array and a dynamic array (like Python list or Java ArrayList)? What happens when a dynamic array runs out of space?"),
    ("hashing",     "How does a hash map work internally? What is a collision and how is it resolved?"),
    ("linked_list", "How would you detect a cycle in a singly linked list? What is the time and space complexity of your approach?"),
    ("trees",       "What is the difference between a binary tree and a binary search tree? What property must a BST satisfy?"),
    ("trees",       "How does an in-order traversal of a BST work, and what is special about its output?"),
    ("sorting",     "Explain merge sort. What is its time complexity in the worst case and why? How does it compare to quicksort on space?"),
    ("dp",          "What is dynamic programming? Explain the difference between memoization and tabulation with a simple example."),
    ("graphs",      "What is the difference between BFS and DFS? Give a real use case where you'd prefer BFS over DFS."),
    ("complexity",  "What does O(log n) time complexity mean? Give an example of an algorithm that runs in O(log n)."),
    ("stacks",      "What is a stack? Describe how you would use a stack to check if a string of brackets is balanced."),
    ("heaps",       "What is a min-heap? How does insertion into a heap work and what is its time complexity?"),
    ("arrays",      "How would you find the two numbers in an unsorted array that add up to a target sum? What is the most efficient approach?"),
    ("dp",          "Explain the Fibonacci sequence. How would you compute fib(n) efficiently and what is the complexity?"),
    ("trees",       "What is the height of a binary tree? How would you calculate it recursively?"),
    ("graphs",      "What is a topological sort and when would you use it? Give a real-world example."),
    ("sorting",     "Why is quicksort generally faster in practice than merge sort even though both are O(n log n) average case?"),
    ("arrays",      "What is a sliding window technique? Describe a problem it solves efficiently."),
    ("linked_list", "How would you reverse a singly linked list in place? Walk me through the steps."),
    ("hashing",     "What is the load factor of a hash table? How does it affect performance?"),
    ("complexity",  "What is the difference between O(n²) and O(n log n)? For n = 1,000,000, roughly how many operations is each?"),
]

HR_QUESTIONS = [
    "Tell me about a project you're most proud of. What was your specific contribution and what did you learn?",
    "Describe a time you had a conflict with a teammate. How did you handle it and what was the outcome?",
    "Tell me about a time you missed a deadline or made a significant mistake. What did you do?",
    "How do you prioritize when you have multiple tasks with competing deadlines?",
    "Describe a situation where you had to learn something completely new very quickly. How did you approach it?",
    "Tell me about a time you disagreed with your manager's decision. How did you handle it?",
    "What is your greatest technical weakness and what are you doing to improve it?",
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
        return _demo_response(message, history, mode)


# ── OpenAI ────────────────────────────────────────────────────────────────────

async def _openai_response(
    message: str,
    history: Optional[List[Message]],
    mode: InterviewMode,
) -> str:
    from openai import AsyncOpenAI

    client = AsyncOpenAI(api_key=settings.openai_api_key)

    messages = [{"role": "system", "content": SYSTEM_PROMPTS[mode]}]
    if history:
        for msg in history[-10:]:
            messages.append({"role": msg.role, "content": msg.content})
    messages.append({"role": "user", "content": message})

    response = await client.chat.completions.create(
        model="gpt-4o-mini",
        messages=messages,
        max_tokens=350,
        temperature=0.7,
    )
    return response.choices[0].message.content.strip()


# ── Gemini ────────────────────────────────────────────────────────────────────

async def _gemini_response(
    message: str,
    history: Optional[List[Message]],
    mode: InterviewMode,
) -> str:
    import google.generativeai as genai

    genai.configure(api_key=settings.gemini_api_key)
    model = genai.GenerativeModel("gemini-1.5-flash")

    chat_history = []
    if history:
        for msg in history[-10:]:
            role = "user" if msg.role == "user" else "model"
            chat_history.append({"role": role, "parts": [msg.content]})

    chat = model.start_chat(history=chat_history)
    full_message = f"{SYSTEM_PROMPTS[mode]}\n\nCandidate answer: {message}"
    response = await chat.send_message_async(full_message)
    return response.text.strip()


# ── Demo mode (no API key) ────────────────────────────────────────────────────

# Simple keyword-based answer evaluator for demo mode
def _evaluate_answer(message: str, topic: str) -> str:
    """
    Returns 'correct', 'partial', or 'wrong' based on keyword heuristics.
    This is demo-only — real evaluation happens via LLM when API key is set.
    """
    msg = message.lower().strip()
    word_count = len(msg.split())

    # Too short — almost certainly incomplete
    if word_count < 6:
        return "wrong"

    keyword_map = {
        "arrays":      ["contiguous", "index", "o(1)", "fixed", "memory", "random access", "cache"],
        "hashing":     ["hash", "bucket", "collision", "chaining", "probing", "key", "modulo"],
        "linked_list": ["pointer", "node", "next", "slow", "fast", "floyd", "two pointer", "cycle", "null"],
        "trees":       ["left", "right", "root", "leaf", "height", "bst", "binary", "node", "traverse"],
        "sorting":     ["divide", "merge", "pivot", "compare", "n log n", "in-place", "stable", "partition"],
        "dp":          ["subproblem", "memo", "cache", "overlap", "tabulation", "optimal", "recursive", "bottom"],
        "graphs":      ["vertex", "edge", "bfs", "dfs", "queue", "stack", "visited", "adjacency", "cycle"],
        "complexity":  ["o(", "log", "linear", "constant", "quadratic", "time", "space", "worst", "best"],
        "stacks":      ["lifo", "push", "pop", "stack", "top", "bracket", "balanced", "last in"],
        "heaps":       ["heap", "parent", "child", "heapify", "min", "max", "complete", "priority"],
    }

    keywords = keyword_map.get(topic, [])
    hits = sum(1 for k in keywords if k in msg)

    if hits >= 3:
        return "correct"
    elif hits >= 1:
        return "partial"
    else:
        return "wrong"


WRONG_FEEDBACK = {
    "arrays": "That's not quite right. Think about how arrays store data in memory and what that means for access time. What does 'contiguous memory' mean for performance?",
    "hashing": "That's not accurate. Consider: when two keys map to the same bucket, what happens? What are the two main strategies to handle that?",
    "linked_list": "Not quite. Think about Floyd's cycle detection algorithm — it uses two pointers moving at different speeds. Why would that help detect a cycle?",
    "trees": "That's incorrect. A BST has a specific ordering property. For any node, what must be true about its left subtree vs right subtree?",
    "sorting": "That's not right. Think about how merge sort splits and recombines data. Why does splitting in half give us the log n factor?",
    "dp": "That's not accurate. Dynamic programming is about breaking a problem into overlapping subproblems. What makes it different from plain recursion?",
    "graphs": "That's not right. BFS uses a queue and explores level by level — think about why that makes it ideal for finding shortest paths.",
    "complexity": "That's not correct. O(log n) means the work halves each step. Can you think of an algorithm that eliminates half the possibilities each iteration?",
    "stacks": "Not quite. A stack is LIFO — last in, first out. Think about how you'd use push and pop to match opening brackets with closing ones.",
    "heaps": "That's not right. In a min-heap, every parent is smaller than its children. Insertion adds to the end and then 'bubbles up' — what does that mean?",
}

PARTIAL_FEEDBACK = {
    "arrays": "You're on the right track, but your answer is incomplete. You mentioned one property — what about access time complexity and when arrays are NOT the right choice?",
    "hashing": "Partially correct. You identified the basic idea, but what about the time complexity of get/set operations and how collisions affect that?",
    "linked_list": "Good start, but you're missing the complexity analysis. What is the time complexity of Floyd's algorithm and why does it use O(1) space?",
    "trees": "Partly right. You have the basic structure but didn't fully explain the BST property. What specific rule must hold for every single node?",
    "sorting": "You have the general idea but missed something important. What is the space complexity of merge sort and how does it differ from quicksort?",
    "dp": "Partially correct — you identified one aspect. What is the difference between top-down memoization and bottom-up tabulation in practice?",
    "graphs": "Good start, but incomplete. When exactly would you choose BFS over DFS? Give a concrete scenario where DFS would give the wrong answer.",
    "complexity": "Partially right. You understand the concept but didn't give a clear example. Name a specific algorithm that runs in O(log n) and explain why.",
    "stacks": "Good, but incomplete. Walk me through a concrete example — say the string '{[()]}' — and how your stack processes it step by step.",
    "heaps": "Partly correct. You have the structure right but what about the time complexity of insertion vs deletion, and how does heapify work?",
}

CORRECT_PRAISE = [
    "Correct! Good understanding.",
    "Exactly right. Well explained.",
    "That's correct. Nice work.",
    "Good answer — you covered the key points.",
    "Right. Clear and accurate.",
]


def _demo_response(
    message: str,
    history: Optional[List[Message]],
    mode: InterviewMode,
) -> str:
    """
    Demo mode without an API key.
    - Evaluates answers with keyword heuristics
    - Gives wrong/partial/correct feedback
    - Advances to the next UNIQUE question only on a correct answer
    """
    import random

    history = history or []

    if mode == InterviewMode.DSA:
        return _demo_dsa(message, history)
    elif mode == InterviewMode.HR:
        return _demo_hr(message, history)
    else:
        return _demo_system(message, history)


def _demo_dsa(message: str, history: List[Message]) -> str:
    import random

    # Find which question was last asked
    last_question_index = None
    last_topic = None
    asked_indices = set()

    for msg in history:
        if msg.role == "assistant":
            for i, (topic, q) in enumerate(DSA_QUESTIONS):
                if q[:40].lower() in msg.content.lower():
                    asked_indices.add(i)
                    last_question_index = i
                    last_topic = topic

    # Evaluate the candidate's answer
    if last_topic:
        quality = _evaluate_answer(message, last_topic)
    else:
        quality = "correct"  # opening exchange

    if quality == "wrong":
        return WRONG_FEEDBACK.get(last_topic, "That's not quite right. Think more carefully and try again — what are the key concepts here?")

    if quality == "partial":
        return PARTIAL_FEEDBACK.get(last_topic, "You're partially right. Your answer is missing some key details. Can you elaborate further?")

    # Correct answer — pick next question not yet asked
    praise = random.choice(CORRECT_PRAISE)
    available = [(i, t, q) for i, (t, q) in enumerate(DSA_QUESTIONS) if i not in asked_indices]

    if not available:
        return f"{praise} You've answered all my questions. **Excellent session! You showed solid understanding across arrays, trees, sorting, and complexity.**"

    # Pick next question (in order, not random)
    next_i, next_topic, next_q = available[0]
    return f"{praise} Next question — **{next_q}**"


def _demo_hr(message: str, history: List[Message]) -> str:
    import random

    asked = set()
    for msg in history:
        if msg.role == "assistant":
            for q in HR_QUESTIONS:
                if q[:35].lower() in msg.content.lower():
                    asked.add(q)

    word_count = len(message.split())

    # HR evaluation: check for vagueness
    vague_phrases = ["i don't know", "not sure", "maybe", "i think", "kind of", "sort of"]
    is_vague = word_count < 15 or any(p in message.lower() for p in vague_phrases)
    lacks_example = word_count < 25 and "i" not in message.lower()

    if is_vague or lacks_example:
        return "That answer is too vague for a behavioral interview. I need a **specific example** — describe a real situation, what actions you took, and what the outcome was. Can you try again with more detail?"

    praise = random.choice(["Good answer.", "That's a solid example.", "Nice response."])
    available = [q for q in HR_QUESTIONS if q not in asked]

    if not available:
        return f"{praise} That wraps up our behavioral round. **You showed good communication and self-awareness throughout.**"

    return f"{praise} Next question — **{available[0]}**"


def _demo_system(message: str, history: List[Message]) -> str:
    import random

    asked = set()
    for msg in history:
        if msg.role == "assistant":
            for q in SYSTEM_QUESTIONS:
                if q[:35].lower() in msg.content.lower():
                    asked.add(q)

    word_count = len(message.split())
    msg_lower = message.lower()

    # System design evaluation: check for lack of technical depth
    technical_keywords = ["database", "cache", "scale", "server", "api", "load", "sql", "nosql",
                          "redis", "cdn", "queue", "partition", "replica", "consistency", "availability",
                          "latency", "throughput", "microservice", "index", "sharding"]
    keyword_hits = sum(1 for k in technical_keywords if k in msg_lower)

    if word_count < 10 or keyword_hits == 0:
        return "That answer lacks technical depth. In a system design interview, you need to mention **specific technologies and trade-offs** — for example, which database and why, or how you'd handle failover. Please go deeper."

    if keyword_hits < 2:
        return f"You touched on one aspect, but system design answers need to cover multiple concerns. You mentioned {keyword_hits} technical concept — can you also address scalability, fault tolerance, or data consistency in your answer?"

    praise = random.choice(["Good thinking.", "Solid approach.", "That's reasonable."])
    available = [q for q in SYSTEM_QUESTIONS if q not in asked]

    if not available:
        return f"{praise} We've covered the main areas. **Well done — you showed good architectural thinking throughout this session.**"

    return f"{praise} Now, **{available[0]}**"


def get_opening_message(mode: InterviewMode) -> str:
    return OPENING_MESSAGES.get(mode, OPENING_MESSAGES[InterviewMode.DSA])