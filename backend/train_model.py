import os
import joblib
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.svm import LinearSVC

# Labeled training data for mock interviews
# 0 = Wrong / Irrelevant / Empty / Skip
# 1 = Partial / Vague / Touched on topic
# 2 = Correct / Detailed / Good technical depth

data = [
    # Complexity / Big O
    ("binary search runs in log n time complexity by dividing search space in half", 2),
    ("binary search operates in logarithmic time or log n complexity", 2),
    ("time complexity of binary search is O(log n)", 2),
    ("it takes log n time because we divide by two at every step", 2),
    ("binary search is O(n)", 0),
    ("it is linear time O(n)", 0),
    ("i don't know the complexity of binary search", 0),
    ("binary search is fast", 1),
    ("binary search complexity is O(log n) but we must sort the array first", 2),
    ("binary search cuts the array in half each time", 1),
    
    # Hashing / Hash maps
    ("hash maps use hash functions to map keys to bucket indices in O(1) average time", 2),
    ("collisions are resolved using chaining with linked lists or open addressing probing", 2),
    ("collisions are handled by linked lists or linear probing in buckets", 2),
    ("hash map collision is resolved by chaining", 1),
    ("a hash map is a key value store with constant time search", 2),
    ("hashing takes O(n) time to find elements", 0),
    ("hashing has O(1) time complexity", 2),
    ("hashing resolved collisions through trees", 1),
    ("idk how hash maps work internally", 0),
    ("hash maps are used for storing data", 1),

    # Linked List Cycles
    ("detect cycles in singly linked list using floyd's cycle detection algorithm with slow and fast pointers", 2),
    ("we use two pointers slow and fast which will meet if there is a cycle", 2),
    ("tortoise and hare algorithm detects cycles in O(n) time and O(1) space", 2),
    ("linked list cycles can be found using two pointers slow and fast", 2),
    ("cycle is detected using standard traversals or visited hash set in O(n) space", 2),
    ("we just traverse the linked list until we reach the end", 0),
    ("cycle detection uses binary search", 0),
    ("use slow and fast pointers to find cycle", 2),
    ("detecting cycle is done by checking next pointers", 1),
    
    # BST
    ("in order traversal of a BST visits left root then right and outputs sorted keys in ascending order", 2),
    ("inorder traversal visits left subtree root node and right subtree recursively", 2),
    ("BST inorder traversal outputs keys in sorted or ascending order", 2),
    ("in order traversal outputs sorted values", 2),
    ("inorder visits left right root", 1),
    ("it visits root left right", 0),
    ("traversal visits all nodes in tree", 1),
    
    # Sorting (Merge vs Quick)
    ("merge sort is a stable O(n log n) divide and conquer algorithm requiring O(n) extra space", 2),
    ("quicksort is an in place sorting algorithm with O(n log n) average but O(n2) worst case", 2),
    ("merge sort uses O(n) extra memory whereas quicksort is in place", 2),
    ("quicksort is in place but merge sort needs extra space", 2),
    ("merge sort is stable and quicksort is unstable", 2),
    ("merge sort is O(n2)", 0),
    ("quicksort is stable", 0),
    ("both merge sort and quicksort are O(n log n)", 2),
    ("merge sort splits the array and quicksort uses a pivot", 2),
    
    # System Design - Databases / Caching
    ("use postgresql for relational data and redis for caching session data to reduce db load", 2),
    ("read heavy systems can use replica nodes and key value stores like redis to cache queries", 2),
    ("redis is an in memory cache used to speed up queries", 2),
    ("databases store data", 0),
    ("relational databases like mysql use tables and sql", 1),
    ("caching is used to save databases from heavy reads", 2),
    
    # HR / Behavioral
    ("use star method which stands for situation task action result to structure the response", 2),
    ("talk about a conflict by explaining what you did to resolve it professionally", 2),
    ("focus on collaboration team outcomes and what you learned from the failure", 2),
    ("just tell a story about my project", 1),
    ("i don't have any behavioral examples", 0),
    
    # Generic Wrong / Short / Skip / Fillers
    ("next question", 0),
    ("skip", 0),
    ("pass", 0),
    ("don't know", 0),
    ("no idea", 0),
    ("i dont know", 0),
    ("hello", 0),
    ("yes", 0),
    ("ok", 0),
    ("testing", 0),
]

def train():
    texts, labels = zip(*data)
    
    # Initialize TF-IDF Vectorizer
    vectorizer = TfidfVectorizer(stop_words='english', ngram_range=(1, 2))
    X = vectorizer.fit_transform(texts)
    
    # Train SVM classifier
    classifier = LinearSVC(C=1.0, random_state=42)
    classifier.fit(X, labels)
    
    # Ensure resource directory exists
    os.makedirs("backend/resources", exist_ok=True)
    
    # Save the models
    joblib.dump(vectorizer, "backend/resources/tfidf_vectorizer.pkl")
    joblib.dump(classifier, "backend/resources/svm_classifier.pkl")
    print("Model trained successfully! Saved to backend/resources/")

if __name__ == "__main__":
    train()
