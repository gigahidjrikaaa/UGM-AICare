import requests

url = "http://localhost:8000/chat/"
data = {
    "user_id": "12345",
    "message": "Hi Aika, I'm feeling anxious about exams."
}

response = requests.post(url, json=data)
print(response.json())  # Should print Aika's response
