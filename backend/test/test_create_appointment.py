
import sys
import os
import requests
import datetime

# Add the project root to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# --- Test Data ---
# Replace with a valid user_identifier (google_sub) from your database
USER_IDENTIFIER = "some_google_sub"
PSYCHOLOGIST_ID = 1
APPOINTMENT_TYPE_ID = 1
APPOINTMENT_DATETIME = (datetime.datetime.now() + datetime.timedelta(days=7)).isoformat()

# --- API Endpoint ---
BASE_URL = "http://127.0.0.1:8000"

def create_appointment():
    url = f"{BASE_URL}/appointments"
    payload = {
        "user_identifier": USER_IDENTIFIER,
        "psychologist_id": PSYCHOLOGIST_ID,
        "appointment_type_id": APPOINTMENT_TYPE_ID,
        "appointment_datetime": APPOINTMENT_DATETIME,
        "notes": "This is a test appointment.",
        "status": "scheduled"
    }

    try:
        response = requests.post(url, json=payload)
        response.raise_for_status()  # Raise an exception for bad status codes
        print("Appointment created successfully:", response.json())
    except requests.exceptions.RequestException as e:
        print(f"Error creating appointment: {e}")

if __name__ == "__main__":
    create_appointment()
