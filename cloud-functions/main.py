import functions_framework
from flask import jsonify
from google.cloud import firestore
import google.generativeai as genai  # <--- NEW LIBRARY
import datetime
import os

# --- CONFIGURATION ---
# 1. Get your API Key from: https://aistudio.google.com/app/apikey
# 2. Add it to your Cloud Function Environment Variables as "GEMINI_API_KEY"
API_KEY = "AIzaSyCmyaNrA30-b0As7_5TqZvmzwUgg7BVDg8"

# --- INIT CLIENTS ---
# Initialize Firestore (Database)
try:
    db = firestore.Client()
except Exception as e:
    print(f"⚠️ Firestore Warning: {e}")
    db = None

# Initialize Gemini API (The Brain)
model = None
if API_KEY:
    try:
        genai.configure(api_key=API_KEY)
        # Using Gemini 2.0 Flash (Experimental) as requested
        model = genai.GenerativeModel('gemini-2.0-flash-exp')
        print("✅ Gemini API Connected (Model: gemini-2.0-flash-exp)")
    except Exception as e:
        print(f"⚠️ Gemini API Error: {e}")
else:
    print("⚠️ GEMINI_API_KEY missing from environment variables")

@functions_framework.http
def submit_screening_report(request):
    """
    1. Receives data from Agent.
    2. Uses Gemini API (Studio) to generate a 'Clinical Impression'.
    3. Saves to Firestore.
    """
    # CORS Headers
    if request.method == 'OPTIONS':
        return ('', 204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST',
            'Access-Control-Allow-Headers': 'Content-Type'
        })

    headers = {'Access-Control-Allow-Origin': '*'}
    request_json = request.get_json(silent=True)
    
    if not request_json:
        return (jsonify({"error": "No JSON received"}), 400, headers)

    risk_score = request_json.get('risk_score')
    summary = request_json.get('summary', 'No summary.')

    # --- THE INTELLIGENCE (Gemini API) ---
    clinical_note = "AI Analysis Unavailable"
    
    if model:
        try:
            print(f"🧠 Asking Gemini to review: {summary}")
            prompt = f"""
            Act as a senior psychiatrist. 
            Review this student screening:
            - Summary: "{summary}"
            - Risk Score: {risk_score}/10
            
            Task: Write a 1-sentence clinical impression validating this score.
            """
            
            # Generate content
            response = model.generate_content(prompt)
            clinical_note = response.text.strip()
            print(f"✅ Gemini Response: {clinical_note}")
            
        except Exception as e:
            print(f"❌ Gemini Error: {e}")
            clinical_note = f"Error: {str(e)}"

    # --- SAVE TO DATABASE ---
    if db:
        try:
            doc_ref = db.collection('screenings').add({
                "risk_score": risk_score,
                "summary": summary,
                "clinical_impression": clinical_note,
                "timestamp": datetime.datetime.now(datetime.timezone.utc),
                "source": "MindWell Agent (Gemini API)"
            })
            print("💾 Saved to Firestore")
        except Exception as e:
            print(f"❌ DB Error: {e}")

    return (jsonify({
        "status": "success", 
        "ai_validation": clinical_note
    }), 200, headers)

@functions_framework.http
def get_helplines(request):
    """ Returns specific Indian resources. """
    if request.method == 'OPTIONS':
        return ('', 204, {'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type'})

    helplines = [
        {"name": "Tele-MANAS", "number": "14416", "desc": "Govt. of India (24/7)"},
        {"name": "iCALL", "number": "9152987821", "desc": "TISS (Mon-Sat)"}
    ]
    return (jsonify({"helplines": helplines}), 200, {'Access-Control-Allow-Origin': '*'})
