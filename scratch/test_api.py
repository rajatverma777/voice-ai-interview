import requests
import json

def test_api():
    try:
        res = requests.get("http://localhost:8000/api/history/")
        print("Status Code:", res.status_code)
        data = res.json()
        print("Sessions count:", len(data.get("sessions", [])))
        if data.get("sessions"):
            first_session = data["sessions"][0]
            print("Keys in first session:", list(first_session.keys()))
            print("Messages in first session:", first_session.get("messages"))
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    test_api()
