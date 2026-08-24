import os
import torch
from transformers import AutoTokenizer, AutoModelForCausalLM, get_cosine_schedule_with_warmup
from torch.utils.data import Dataset, DataLoader
from torch.optim import AdamW

# Fine-tuning dataset mapping interview query context and semantic quality classification to conversational responses.
# Strictly separated by interview domain to prevent crossing topics (e.g. asking HR questions in DSA mode).
train_data = [
    # 1. Unsorted Array Two Sum (DSA)
    {
        "prompt": "Interview DSA. Question: How would you find two numbers in an unsorted array that add up to a target sum? What is the most efficient approach? Answer: The most efficient approach is the One-Pass Hash Map method. This approach achieves a time complexity of O(n) by trading a small amount of memory space for speed. Quality: correct.",
        "completion": "That is correct! Using a hash map is a great way to solve this in O(n) time. By the way, what is the worst-case lookup complexity in a hash map?"
    },
    {
        "prompt": "Interview DSA. Question: How would you find two numbers in an unsorted array that add up to a target sum? What is the most efficient approach? Answer: Sort the array first then use two pointers. This takes O(n log n) time. Quality: partial.",
        "completion": "That's a reasonable start, but sorting the array takes O(n log n) time. Is there a way to solve this in O(n) linear time without sorting first?"
    },
    {
        "prompt": "Interview DSA. Question: How would you find two numbers in an unsorted array that add up to a target sum? What is the most efficient approach? Answer: Loop through all pairs using nested loops. That is the best way. Quality: incorrect.",
        "completion": "A nested loop approach works but takes quadratic O(n^2) time, which is inefficient. Can you think of a way to do it in a single pass using a hash map?"
    },
    {
        "prompt": "Interview DSA. Question: How would you find two numbers in an unsorted array that add up to a target sum? What is the most efficient approach? Answer: To count node traversals, track visits using an array of counters initialized to zero. Quality: unrelated.",
        "completion": "That sounds like a tree or graph traversal technique, which is unrelated to this array problem. Let's move on: how does a binary search tree work?"
    },
    {
        "prompt": "Interview DSA. Question: How would you find two numbers in an unsorted array that add up to a target sum? What is the most efficient approach? Answer: skip. Quality: incorrect.",
        "completion": "No problem, let's move on. Let's try a different question: what is the average lookup complexity in a hash map?"
    },

    # 2. Fibonacci Sequence (DSA)
    {
        "prompt": "Interview DSA. Question: Explain the Fibonacci sequence. How would you compute fib(n) efficiently and what is the time complexity? Answer: We can compute it in O(n) time using dynamic programming or memoization to avoid redundant subproblem calculations. Quality: correct.",
        "completion": "Spot on! Dynamic programming avoids repeating subproblems and brings the time complexity down to O(n). What would be the space complexity of that approach?"
    },
    {
        "prompt": "Interview DSA. Question: Explain the Fibonacci sequence. How would you compute fib(n) efficiently and what is the time complexity? Answer: Use recursion like fib(n-1) + fib(n-2). It takes O(2^n) time. Quality: partial.",
        "completion": "Yes, that is the standard definition, but plain recursion takes exponential O(2^n) time because of duplicate work. How could we optimize it using memoization or dynamic programming?"
    },
    {
        "prompt": "Interview DSA. Question: Explain the Fibonacci sequence. How would you compute fib(n) efficiently and what is the time complexity? Answer: You just add the numbers together in O(1) constant time. Quality: incorrect.",
        "completion": "Actually, you cannot compute the n-th Fibonacci number in O(1) time without Binet's formula, which has precision issues. Let's try another topic: how do you reverse a linked list?"
    },
    {
        "prompt": "Interview DSA. Question: Explain the Fibonacci sequence. How would you compute fib(n) efficiently and what is the time complexity? Answer: You can write a query using SQL group by. Quality: unrelated.",
        "completion": "That seems to be related to databases rather than algorithmic recursion. Let's move on to another DSA question. What is the difference between a stack and a queue?"
    },
    {
        "prompt": "Interview DSA. Question: Explain the Fibonacci sequence. How would you compute fib(n) efficiently and what is the time complexity? Answer: I don't know. Quality: incorrect.",
        "completion": "No worries! Let's try a different question: what is the difference between a stack and a queue?"
    },

    # 3. Binary Search (DSA)
    {
        "prompt": "Interview DSA. Question: What is binary search complexity? Answer: O(log n). Quality: correct.",
        "completion": "Exactly! Binary search takes O(log n) time. Moving on, how would you detect a cycle in a singly linked list?"
    },
    {
        "prompt": "Interview DSA. Question: What is binary search complexity? Answer: It takes O(n) linear search time. Quality: incorrect.",
        "completion": "Actually, binary search is more efficient than linear search. It divides the search space in half each step, taking O(log n) time. How does quicksort work?"
    },
    {
        "prompt": "Interview DSA. Question: What is binary search complexity? Answer: It takes O(n^2) quadratic time. Quality: incorrect.",
        "completion": "That is incorrect. O(n^2) is typical of nested loops. Binary search takes O(log n) time. Let's try another question: what is a binary search tree?"
    },
    {
        "prompt": "Interview DSA. Question: What is binary search complexity? Answer: Load balancers distribute network traffic across servers. Quality: unrelated.",
        "completion": "That description is for load balancers, which is a system design topic. Let's focus back on DSA: how does an in-order tree traversal work?"
    },
    {
        "prompt": "Interview DSA. Question: What is binary search complexity? Answer: pass. Quality: incorrect.",
        "completion": "Alright, let's try a different question: what is the difference between QuickSort and MergeSort?"
    },

    # 4. Hash Map Collision (DSA)
    {
        "prompt": "Interview DSA. Question: How do hash maps resolve collisions? Answer: Chaining with linked lists or open addressing. Quality: correct.",
        "completion": "Great! Chaining uses linked lists at each index, while open addressing probes for the next available slot. What is the worst-case search complexity in a hash map?"
    },
    {
        "prompt": "Interview DSA. Question: How do hash maps resolve collisions? Answer: By using a binary search tree at each index. Quality: partial.",
        "completion": "That is an option (like Java 8's HashMap TreeMap conversion), but the standard ways are chaining or open addressing. What is the difference between a hash map and a hash set?"
    },
    {
        "prompt": "Interview DSA. Question: How do hash maps resolve collisions? Answer: They don't have collisions. Quality: incorrect.",
        "completion": "Actually, collisions are inevitable when the number of keys exceeds the size of the array. Let's move on: what is a singly linked list?"
    },
    {
        "prompt": "Interview DSA. Question: How do hash maps resolve collisions? Answer: React is a frontend UI library. Quality: unrelated.",
        "completion": "React is indeed for frontend development, but let's stick to our DSA topics. Let's move on: how do you detect a cycle in a linked list?"
    },
    {
        "prompt": "Interview DSA. Question: How do hash maps resolve collisions? Answer: idontknow. Quality: incorrect.",
        "completion": "No problem! Let's try a different question: how do you reverse a singly linked list?"
    },

    # 5. Linked List Cycle Detection (DSA)
    {
        "prompt": "Interview DSA. Question: How do you detect a cycle in a linked list? Answer: Using Floyd's cycle-finding algorithm with a slow and fast pointer. Quality: correct.",
        "completion": "Excellent choice. The slow and fast pointer technique (also known as Floyd's cycle-finding algorithm) uses O(1) auxiliary space. How do you reverse a singly linked list?"
    },
    {
        "prompt": "Interview DSA. Question: How do you detect a cycle in a linked list? Answer: Use a hash set to keep track of visited nodes. Quality: partial.",
        "completion": "That is a valid approach! It takes O(n) time and O(n) space. Can you think of a cycle detection method that uses O(1) constant space?"
    },
    {
        "prompt": "Interview DSA. Question: How do you detect a cycle in a linked list? Answer: You just check if the head is null. Quality: incorrect.",
        "completion": "Checking if head is null only tells you if the list is empty, not if it has a cycle. Let's try a different question: what is the difference between a stack and a queue?"
    },
    {
        "prompt": "Interview DSA. Question: How do you detect a cycle in a linked list? Answer: Git push uploads code to github repositories. Quality: unrelated.",
        "completion": "That description is for version control, not data structures. Let's move on to the next question: what is a binary search tree?"
    },
    {
        "prompt": "Interview DSA. Question: How do you detect a cycle in a linked list? Answer: skip it. Quality: incorrect.",
        "completion": "Sure, let's move on. Let's try a different question: how does an in-order tree traversal work?"
    },

    # 6. Binary Search Tree (DSA)
    {
        "prompt": "Interview DSA. Question: What is a binary search tree? Answer: Left elements are smaller, right are larger. Quality: correct.",
        "completion": "That is correct. In a binary search tree, the left subtree contains keys smaller than the node's key, and the right subtree contains keys larger. How does an in-order traversal work?"
    },
    {
        "prompt": "Interview DSA. Question: What is a binary search tree? Answer: It is a tree where each node has exactly two children. Quality: partial.",
        "completion": "Not quite. A tree where each node has up to two children is a binary tree. A binary search tree adds the ordered key property. What is the average time complexity to search in a BST?"
    },
    {
        "prompt": "Interview DSA. Question: What is a binary search tree? Answer: A tree with no root node. Quality: incorrect.",
        "completion": "All trees must have a root node. Let's try a different DSA topic: what is the difference between QuickSort and MergeSort?"
    },
    {
        "prompt": "Interview DSA. Question: What is a binary search tree? Answer: CSS is used to style webpage elements. Quality: unrelated.",
        "completion": "That is a styling concept. Let's stick to algorithms: what is the difference between QuickSort and MergeSort?"
    },
    {
        "prompt": "Interview DSA. Question: What is a binary search tree? Answer: no idea. Quality: incorrect.",
        "completion": "No worries! Let's move on. What is the difference between QuickSort and MergeSort?"
    },

    # 7. QuickSort vs MergeSort (DSA)
    {
        "prompt": "Interview DSA. Question: What is the difference between QuickSort and MergeSort? Answer: MergeSort is stable and always O(n log n) but uses O(n) extra space. QuickSort is in-place but worst case is O(n^2). Quality: correct.",
        "completion": "Spot on. MergeSort is stable and preferred for linked lists, while QuickSort is in-place but has a quadratic worst-case. Next, how does binary search work?"
    },
    {
        "prompt": "Interview DSA. Question: What is the difference between QuickSort and MergeSort? Answer: MergeSort is faster than QuickSort. Quality: partial.",
        "completion": "Actually, QuickSort is often faster in practice due to better cache locality, even though MergeSort has a guaranteed O(n log n) bound. What does it mean for a sort to be stable?"
    },
    {
        "prompt": "Interview DSA. Question: What is the difference between QuickSort and MergeSort? Answer: They are both O(n) sorting algorithms. Quality: incorrect.",
        "completion": "That is incorrect. O(n) comparison-based sorting is impossible. Both are O(n log n) algorithms. Let's try another topic: how does binary search work?"
    },
    {
        "prompt": "Interview DSA. Question: What is the difference between QuickSort and MergeSort? Answer: Docker runs software inside isolated containers. Quality: unrelated.",
        "completion": "That describes containerization, not sorting. Let's transition to another DSA topic: how does binary search work?"
    },
    {
        "prompt": "Interview DSA. Question: What is the difference between QuickSort and MergeSort? Answer: skip. Quality: incorrect.",
        "completion": "No problem! Let's move on. Let's try another DSA question: how does binary search work?"
    },

    # 8. HR Conflict (HR/Behavioral)
    {
        "prompt": "Interview HR. Question: How do you handle conflict? Answer: Using the STAR method to find a resolution. Quality: correct.",
        "completion": "That's a very structured approach. Using the STAR method is great for detailing situations. Can you tell me about a time when a project you worked on failed?"
    },
    {
        "prompt": "Interview HR. Question: How do you handle conflict? Answer: I just ignore it and do my work. Quality: partial.",
        "completion": "Ignoring conflict can lead to larger team issues. Resolving it through communication is usually preferred. Let's try a different question: why do you want to join our company?"
    },
    {
        "prompt": "Interview HR. Question: How do you handle conflict? Answer: I argue until I win. Quality: incorrect.",
        "completion": "Arguing is counterproductive in a team. Collaborating to find a compromise is a better quality. Let's move on: what are your strengths?"
    },
    {
        "prompt": "Interview HR. Question: How do you handle conflict? Answer: Matrix exponentiation is used to compute Fibonacci sequence. Quality: unrelated.",
        "completion": "That is a DSA concept. Let's stick to behavioral questions: why do you want to join our company?"
    },
    {
        "prompt": "Interview HR. Question: How do you handle conflict? Answer: pass. Quality: incorrect.",
        "completion": "Sure. Let's try another behavioral question: why do you want to join our company?"
    },

    # 9. HR Failure (HR/Behavioral)
    {
        "prompt": "Interview HR. Question: Tell me about a time you failed. Answer: I missed a deadline once because of scope creep, but I learned to manage stakeholder expectations and communicate early. Quality: correct.",
        "completion": "Thank you for sharing that. Admitting mistakes and showing how you learned from scope creep is a great quality. Why do you want to join our company?"
    },
    {
        "prompt": "Interview HR. Question: Tell me about a time you failed. Answer: I have never failed. Quality: partial.",
        "completion": "Everyone experiences failure or setbacks at some point. Reflecting on mistakes is a sign of maturity. Let's move on: how do you manage tight project deadlines?"
    },
    {
        "prompt": "Interview HR. Question: Tell me about a time you failed. Answer: I deleted the production database once. Quality: incorrect.",
        "completion": "That is a significant setback! The important part is how you resolved it and what safeguards you put in place to prevent it from happening again. What is your greatest strength?"
    },
    {
        "prompt": "Interview HR. Question: Tell me about a time you failed. Answer: Floyd's slow and fast pointer algorithm is O(1) space. Quality: unrelated.",
        "completion": "That is Floyd's cycle detection. Let's stick to behavioral questions: why do you want to join our company?"
    },
    {
        "prompt": "Interview HR. Question: Tell me about a time you failed. Answer: no answer. Quality: incorrect.",
        "completion": "Alright. Let's try a different behavioral question: why do you want to join our company?"
    },

    # 10. System Design Scaling Reads (System Design)
    {
        "prompt": "Interview System Design. Question: How do you scale database reads? Answer: By using replicas and Redis caching. Quality: correct.",
        "completion": "That makes sense. Caching reads with Redis and adding read replicas is a solid strategy. How does a CDN fit into this architecture?"
    },
    {
        "prompt": "Interview System Design. Question: How do you scale database reads? Answer: By rewriting the entire database from scratch. Quality: partial.",
        "completion": "Rewriting the database is a high-risk, expensive task. Replicas and caching are standard scaling patterns. What is the difference between SQL and NoSQL databases?"
    },
    {
        "prompt": "Interview System Design. Question: How do you scale database reads? Answer: You just buy a bigger server. Quality: incorrect.",
        "completion": "Buying a bigger server is vertical scaling, which has limits. Read replicas and caching allow horizontal scaling. What is database sharding?"
    },
    {
        "prompt": "Interview System Design. Question: How do you scale database reads? Answer: Quicksort is stable and uses O(n) space. Quality: unrelated.",
        "completion": "That is a sorting concept. Let's stay on system design: what is the difference between SQL and NoSQL databases?"
    },
    {
        "prompt": "Interview System Design. Question: How do you scale database reads? Answer: skip. Quality: incorrect.",
        "completion": "No problem! Let's move on. What is the difference between SQL and NoSQL databases?"
    },

    # 11. System Design SQL vs NoSQL (System Design)
    {
        "prompt": "Interview System Design. Question: What is the difference between SQL and NoSQL databases? Answer: SQL is relational and structured; NoSQL is non-relational and scales horizontally. Quality: correct.",
        "completion": "Good comparison. Relational databases are great for structured schemas and transactions, while NoSQL is useful for horizontal scaling. What is database sharding?"
    },
    {
        "prompt": "Interview System Design. Question: What is the difference between SQL and NoSQL databases? Answer: NoSQL is always better than SQL. Quality: partial.",
        "completion": "Not necessarily. SQL databases are excellent for complex queries and strict ACID guarantees. It depends on the access patterns. What is sharding?"
    },
    {
        "prompt": "Interview System Design. Question: What is the difference between SQL and NoSQL databases? Answer: They are the same. Quality: incorrect.",
        "completion": "Actually, they differ in schema structure, query language, and scaling behaviors. Let's move on: what is a load balancer?"
    },
    {
        "prompt": "Interview System Design. Question: What is the difference between SQL and NoSQL databases? Answer: A cycles in a linked list is detected by fast pointer. Quality: unrelated.",
        "completion": "That describes cycle detection. Let's focus back on system design: what is a load balancer?"
    },
    {
        "prompt": "Interview System Design. Question: What is the difference between SQL and NoSQL databases? Answer: idk. Quality: incorrect.",
        "completion": "Sure, let's try a different system design question: what is a load balancer?"
    },

    # 12. System Design Load Balancer (System Design)
    {
        "prompt": "Interview System Design. Question: What is a load balancer? Answer: It distributes network traffic across multiple servers. Quality: correct.",
        "completion": "That is correct. Load balancers distribute traffic to prevent single point overloads. Do you know any load balancing algorithms?"
    },
    {
        "prompt": "Interview System Design. Question: What is a load balancer? Answer: It scales the database horizontally. Quality: partial.",
        "completion": "Actually, a load balancer distributes web traffic to application servers, not databases directly. What are two common load balancing algorithms?"
    },
    {
        "prompt": "Interview System Design. Question: What is a load balancer? Answer: It runs containers inside docker. Quality: unrelated.",
        "completion": "That describes Docker, not load balancing. Let's move on: what is a CDN?"
    },
    {
        "prompt": "Interview System Design. Question: What is a load balancer? Answer: Chaining resolves collisions. Quality: unrelated.",
        "completion": "That describes hash maps. Let's stick to system design: what is a CDN?"
    },
    {
        "prompt": "Interview System Design. Question: What is a load balancer? Answer: pass. Quality: incorrect.",
        "completion": "No problem. Let's try a different system design question: what is a CDN?"
    },

    # 13. Conversational Mismatch / Paste Mismatch (DSA)
    {
        "prompt": "Interview DSA. Question: What is binary search complexity? Answer: Let us move on: what is the difference between a binary search and a single hash? Quality: unrelated.",
        "completion": "That sounds like a question rather than an answer. Let's stay focused. Moving on to the next question: what is the average lookup complexity in a hash map?"
    },
    {
        "prompt": "Interview DSA. Question: What is binary search complexity? Answer: What is binary search complexity? Quality: unrelated.",
        "completion": "You pasted the question itself! Let's try to answer it. What is the average lookup complexity in a hash map?"
    }
]

class InterviewDataset(Dataset):
    def __init__(self, data, tokenizer, max_length=256):
        self.encodings = []
        for item in data:
            prompt_text = f"<|prompt|>{item['prompt']}<|completion|>"
            completion_text = f"{item['completion']}<|endoftext|>"
            
            prompt_enc = tokenizer(prompt_text, add_special_tokens=False)
            comp_enc = tokenizer(completion_text, add_special_tokens=False)
            
            input_ids = prompt_enc["input_ids"] + comp_enc["input_ids"]
            attention_mask = [1] * len(input_ids)
            labels = [-100] * len(prompt_enc["input_ids"]) + comp_enc["input_ids"]
            
            if len(input_ids) > max_length:
                input_ids = input_ids[:max_length]
                attention_mask = attention_mask[:max_length]
                labels = labels[:max_length]
                
            pad_len = max_length - len(input_ids)
            if pad_len > 0:
                input_ids = input_ids + [tokenizer.pad_token_id] * pad_len
                attention_mask = attention_mask + [0] * pad_len
                labels = labels + [-100] * pad_len
                
            self.encodings.append({
                "input_ids": input_ids,
                "attention_mask": attention_mask,
                "labels": labels
            })
            
    def __len__(self):
        return len(self.encodings)
        
    def __getitem__(self, idx):
        return {
            "input_ids": torch.tensor(self.encodings[idx]["input_ids"]),
            "attention_mask": torch.tensor(self.encodings[idx]["attention_mask"]),
            "labels": torch.tensor(self.encodings[idx]["labels"])
        }

def train():
    model_name = "distilgpt2"
    print(f"Loading pre-trained {model_name} from Hugging Face...")
    tokenizer = AutoTokenizer.from_pretrained(model_name)
    
    # Add special tokens
    special_tokens_dict = {'additional_special_tokens': ['<|prompt|>', '<|completion|>']}
    tokenizer.add_special_tokens(special_tokens_dict)
    tokenizer.pad_token = tokenizer.eos_token
    
    model = AutoModelForCausalLM.from_pretrained(model_name)
    model.resize_token_embeddings(len(tokenizer))
    
    # Configure dataset
    dataset = InterviewDataset(train_data, tokenizer)
    dataloader = DataLoader(dataset, batch_size=2, shuffle=True)
    
    # Setup MPS device for Apple Silicon M2 GPU acceleration
    device = torch.device("mps" if torch.backends.mps.is_available() else "cpu")
    print(f"Training on device: {device}")
    model.to(device)
    
    # Optimizer & Cosine Annealing Learning Rate Scheduler
    optimizer = AdamW(model.parameters(), lr=5e-5, weight_decay=0.01)
    num_training_steps = len(dataloader) * 35  # 35 epochs
    scheduler = get_cosine_schedule_with_warmup(
        optimizer,
        num_warmup_steps=int(0.1 * num_training_steps),
        num_training_steps=num_training_steps
    )
    
    # Train epochs
    model.train()
    print("Fine-tuning Conversational Transformer Model with 35 epochs & Cosine Scheduler...")
    for epoch in range(35):
        total_loss = 0
        for batch in dataloader:
            optimizer.zero_grad()
            input_ids = batch["input_ids"].to(device)
            attention_mask = batch["attention_mask"].to(device)
            labels = batch["labels"].to(device)
            
            outputs = model(input_ids, attention_mask=attention_mask, labels=labels)
            loss = outputs.loss
            loss.backward()
            optimizer.step()
            scheduler.step()
            total_loss += loss.item()
            
        print(f"Epoch {epoch+1}/35 - Loss: {total_loss/len(dataloader):.4f}")
        
    # Save model locally
    output_dir = "backend/resources/fine_tuned_gpt2"
    os.makedirs(output_dir, exist_ok=True)
    model.save_pretrained(output_dir)
    tokenizer.save_pretrained(output_dir)
    print(f"Generative Transformer saved locally to: {output_dir}")

if __name__ == "__main__":
    train()
