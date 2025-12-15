import requests
import json

# URL of your local backend (running from run_backend.ps1)
url = "http://localhost:8080/submit_screening_report"

# Fake data to simulate the Agent
payload = {
    "risk_score": 8,
    "summary": "The patient feels extremely overwhelmed by exams and has stopped sleeping for two days."
}

try:
    print(f"📡 Sending test data to {url}...")
    response = requests.post(url, json=payload)
    
    print(f"Status Code: {response.status_code}")
    print("Response Body:", response.json())
    
    if response.status_code == 200:
        print("\n✅ SUCCESS! Backend is working.")
        print("👉 NOW CHECK FIRESTORE: You should see this record in your database.")
    else:
        print("\n❌ FAILURE. The backend rejected the request.")

except Exception as e:
    print(f"\n❌ CONNECTION ERROR: {e}")
    print("Is your backend running? Did you run 'run_backend.ps1'?")