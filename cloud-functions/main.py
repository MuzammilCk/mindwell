import functions_framework
from flask import jsonify
from google.cloud import firestore
import datetime
import os

# Initialize Firestore (The real Google Database)
try:
    db = firestore.Client()
except Exception as e:
    print(f"⚠️ Warning: Firestore connection failed (local mode?): {e}")
    db = None

@functions_framework.http
def submit_screening_report(request):
    """
    Receives risk data from the Agent and logs it to Google Firestore.
    """
    # CORS Headers
    if request.method == 'OPTIONS':
        headers = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST',
            'Access-Control-Allow-Headers': 'Content-Type',
        }
        return ('', 204, headers)

    headers = {'Access-Control-Allow-Origin': '*'}

    request_json = request.get_json(silent=True)
    
    if request_json and 'risk_score' in request_json:
        # Prepare data for Firestore
        doc_data = {
            "risk_score": request_json['risk_score'],
            "category": request_json.get('risk_category', 'Unknown'),
            "summary": request_json.get('summary', ''),
            "timestamp": datetime.datetime.now(datetime.timezone.utc),
            "source": "ElevenLabs Agent"
        }
        
        print(f"📝 Received Report: {doc_data}")
        
        # WRITE TO FIRESTORE (The 'Money Shot' for the Hackathon)
        if db:
            try:
                # Add to 'screenings' collection
                update_time, doc_ref = db.collection('screenings').add(doc_data)
                print(f"✅ Saved to Firestore: {doc_ref.id}")
                return (jsonify({"status": "success", "id": doc_ref.id}), 200, headers)
            except Exception as e:
                print(f"❌ Firestore Save Error: {e}")
                return (jsonify({"status": "error", "message": str(e)}), 500, headers)
        else:
             print("❌ Database not initialized.")
             return (jsonify({"status": "simulated", "message": "DB not connected"}), 200, headers)
    
    return (jsonify({"error": "Invalid data provided"}), 400, headers)

@functions_framework.http
def get_helplines(request):
    """ Returns static helpline data. """
    if request.method == 'OPTIONS':
        return ('', 204, {'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST', 'Access-Control-Allow-Headers': 'Content-Type'})

    helplines = [
        {"name": "Tele-MANAS", "number": "14416", "desc": "24/7 National Mental Health Helpline"},
        {"name": "iCALL", "number": "9152987821", "desc": "TISS - Mon to Sat, 10 AM - 8 PM"}
    ]
    return (jsonify({"helplines": helplines}), 200, {'Access-Control-Allow-Origin': '*'})
