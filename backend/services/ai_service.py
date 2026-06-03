from config import get_settings
from models.schemas import InterviewMode, Message
from typing import List, Optional

settings = get_settings()

SYSTEM_PROMPTS = {
    InterviewMode.DSA: """You are a senior software engineer conducting a technical interview focused on Data Structures and Algorithms.

Your responsibilities:
- Ask one DSA question at a time (arrays, linked lists, trees, graphs, dynamic programming, sorting, searching)
- Evaluate the candidate's approach before giving hints
- Ask follow-up questions about time/space complexity
- Be encouraging but professional
- If the candidate seems stuck, give small hints
- After a complete answer, move to the NEXT different question

Start with easier questions and gradually increase difficulty.
Keep responses concise (2-4 sentences). Ask ONE question at a time. NEVER repeat the same question.""",

    InterviewMode.HR: """You are an experienced HR manager conducting a behavioral interview.

Your responsibilities:
- Ask behavioral questions using the STAR method (Situation, Task, Action, Result)
- Probe for specific examples from the candidate's experience
- Evaluate communication skills and self-awareness
- Ask about teamwork, leadership, conflict resolution, and career goals
- Be warm but professional

Ask ONE question at a time. Keep responses to 2-4 sentences. NEVER repeat the same question.""",

    InterviewMode.SYSTEM_DESIGN: """You are a staff engineer conducting a system design interview.

Your responsibilities:
- Present system design problems (URL shortener, chat app, social feed, etc.)
- Guide the candidate through requirements gathering
- Ask about scalability, availability, and consistency trade-offs
- Probe on database choices, caching, load balancing
- Evaluate architectural thinking

Ask ONE question or follow-up at a time. Keep responses concise. NEVER repeat the same question."""
}

OPENING_MESSAGES = {
    InterviewMode.DSA: "Hello! I'm your AI technical interviewer. We'll be focusing on **Data Structures & Algorithms** today. Ready? Let's start with a classic — **Can you explain the difference between an array and a linked list, and when would you use each?**",
    InterviewMode.HR: "Welcome! I'm your behavioral interviewer today. Let's get to know you better. **Tell me about yourself and what excites you most about software engineering?**",
    InterviewMode.SYSTEM_DESIGN: "Great to meet you! Today we'll tackle **System Design**. Let's dive right in — **How would you design a URL shortening service like bit.ly? Start by clarifying the requirements you'd need.**",
}

# Demo mode: tracks index per session so questions never repeat
_demo_index: dict = {}

DSA_QUESTIONS = [
    "Great start! Arrays have O(1) access but O(n) insertion. **Now tell me — how does a hash map work internally, and what happens during a collision?**",
    "Good answer! **Can you explain how a binary search tree differs from a regular binary tree, and what is the time complexity of search in a balanced BST?**",
    "Nice! **Walk me through how you would find the longest common subsequence of two strings. What approach would you use?**",
    "Good thinking! **How does merge sort work, and what is its time and space complexity compared to quicksort?**",
    "Excellent! **Can you explain what a stack and a queue are, and give a real-world use case for each?**",
    "Well explained! **What is dynamic programming? Can you explain the difference between memoization and tabulation?**",
    "Great! **How would you detect a cycle in a linked list? Walk me through your approach step by step.**",
    "Nice work! **Explain BFS vs DFS — when would you prefer one over the other?**",
    "Good! **What is the time complexity of inserting into a max-heap, and how does heapify work?**",
    "Solid! **How would you check if a binary tree is balanced? What does balanced mean in this context?**",
]

HR_QUESTIONS = [
    "Thank you! **Can you describe a time you faced a major technical challenge and how you overcame it?**",
    "Great example! **Tell me about a situation where you had to work with a difficult teammate. How did you handle it?**",
    "I appreciate that! **Describe a project you're most proud of. What was your role and what did you learn?**",
    "Interesting! **How do you prioritize tasks when you have multiple deadlines at the same time?**",
    "Good insight! **Tell me about a time you received critical feedback. How did you respond to it?**",
    "Well said! **Where do you see yourself in 3-5 years? What are your career goals?**",
    "Nice! **Describe a time you took initiative on a project without being asked. What was the outcome?**",
    "Great! **How do you keep up with new technologies and trends in software engineering?**",
]

SYSTEM_QUESTIONS = [
    "Good requirements! **What database would you choose for this system — SQL or NoSQL — and why?**",
    "Nice choice! **How would you handle 10 million daily active users? Walk me through your scaling strategy.**",
    "Good thinking! **Where would you add caching in this system, and what caching strategy would you use?**",
    "Solid! **How would you ensure high availability and handle server failures gracefully?**",
    "Good! **How would you design the API layer? REST or GraphQL, and why?**",
    "Nice! **What are the trade-offs between consistency and availability in your design? How does CAP theorem apply?**",
    "Interesting! **How would you handle a sudden 10x traffic spike? What changes would you make?**",
    "Good! **How would you monitor this system in production? What metrics matter most?**",
]

DEMO_QUESTIONS = {
    InterviewMode.DSA: DSA_QUESTIONS,
    InterviewMode.HR: HR_QUESTIONS,
    InterviewMode.SYSTEM_DESIGN: SYSTEM_QUESTIONS,
}


async def generate_response(
    message: str,
    history: Optional[List[Message]] = None,
    mode: InterviewMode = InterviewMode.DSA
) -> str:
    if settings.ai_provider == "gemini" and settings.gemini_api_key:
        return await _gemini_response(message, history, mode)
    elif settings.openai_api_key:
        return await _openai_response(message, history, mode)
    else:
        return _demo_response(message, history, mode)


async def _openai_response(message: str, history: Optional[List[Message]], mode: InterviewMode) -> str:
    from openai import AsyncOpenAI

    client = AsyncOpenAI(api_key=settings.openai_api_key)
    system_prompt = SYSTEM_PROMPTS[mode]

    messages = [{"role": "system", "content": system_prompt}]
    if history:
        for msg in history[-8:]:
            messages.append({"role": msg.role, "content": msg.content})
    messages.append({"role": "user", "content": message})

    response = await client.chat.completions.create(
        model="gpt-4o-mini",
        messages=messages,
        max_tokens=300,
        temperature=0.7,
    )
    return response.choices[0].message.content.strip()


async def _gemini_response(message: str, history: Optional[List[Message]], mode: InterviewMode) -> str:
    import google.generativeai as genai

    genai.configure(api_key=settings.gemini_api_key)
    model = genai.GenerativeModel("gemini-1.5-flash")

    system_prompt = SYSTEM_PROMPTS[mode]
    chat_history = []
    if history:
        for msg in history[-8:]:
            role = "user" if msg.role == "user" else "model"
            chat_history.append({"role": role, "parts": [msg.content]})

    chat = model.start_chat(history=chat_history)
    full_message = f"{system_prompt}\n\nUser: {message}"
    response = await chat.send_message_async(full_message)
    return response.text.strip()


def _demo_response(message: str, history: Optional[List[Message]], mode: InterviewMode) -> str:
    """
    Sequential demo responses — advances through the question list so the
    same question is never repeated back-to-back.
    Uses conversation length as the index so it's stateless across restarts.
    """
    questions = DEMO_QUESTIONS.get(mode, DSA_QUESTIONS)

    # Use history length to determine which question to ask next
    history_len = len(history) if history else 0
    # Each user turn increments by 2 (user + assistant), so divide by 2
    question_index = (history_len // 2) % len(questions)

    return questions[question_index]


def get_opening_message(mode: InterviewMode) -> str:
    return OPENING_MESSAGES.get(mode, OPENING_MESSAGES[InterviewMode.DSA])