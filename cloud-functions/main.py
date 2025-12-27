import functions_framework
from flask import jsonify
from google.cloud import firestore
import google.generativeai as genai
import datetime
import os
from dotenv import load_dotenv

load_dotenv() # Load variables from .env if present

# --- CONFIGURATION (SECURE) ---
API_KEY = os.environ.get("GEMINI_API_KEY")

# --- INIT CLIENTS ---
db = None
try:
    db = firestore.Client()
    print("[OK] Firestore Connected")
except Exception as e:
    print(f"[WARN] Firestore Error: {e}")

model_name_default = 'models/gemini-2.0-flash'

if API_KEY:
    try:
        genai.configure(api_key=API_KEY)
        print("[OK] Gemini API Configured")
    except Exception as e:
        print(f"[WARN] Gemini Init Error: {e}")
else:
    print("[WARN] GEMINI_API_KEY not found in environment")

# --- MAIN FUNCTION ---
@functions_framework.http
def submit_screening_report(request):
    """
    Receives screening data from ElevenLabs Agent → Validates with Gemini → Saves to Firestore
    """
    # Handle CORS preflight
    if request.method == 'OPTIONS':
        return ('', 204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST',
            'Access-Control-Allow-Headers': 'Content-Type'
        })

    headers = {'Access-Control-Allow-Origin': '*'}
    
    # Parse incoming data
    try:
        request_json = request.get_json(silent=True)
        if not request_json:
            return (jsonify({"error": "No JSON payload received"}), 400, headers)
    except Exception as e:
        return (jsonify({"error": f"JSON parse error: {str(e)}"}), 400, headers)

    # Extract fields (Agents only send summary now)
    summary = request_json.get('summary', 'No summary provided.')
    print(f"[IN] Received Summary: {summary[:50]}...")

    # --- GEMINI INTELLIGENCE (Diagnosis & Scoring) ---
    gemini_result = {
        "score": 0,
        "reasoning": "Assessment pending.",
        "validation": "I am unable to process the assessment at this moment."
    }
    
    if API_KEY:
        # Define models to try in order (Fixed naming convention)
        models_to_try = ['models/gemini-2.0-flash', 'models/gemini-2.0-flash-lite', 'models/gemini-flash-latest']
        last_error = "No attempt made."
        
        from google.api_core.exceptions import ResourceExhausted
        import re 

        for model_name in models_to_try:
            try:
                print(f"[TRY] Attempting analysis with {model_name}...")
                current_model = genai.GenerativeModel(model_name)
                
                heading = "You are a senior clinical psychologist. Analyze the following patient summary from a screening interview."
                # [PROMPT REFACTOR]: 3-Part JSON for separate internal reasoning and user validation
                prompt_text = f"""{heading}

PATIENT SUMMARY:
{summary}

TASK:
1. Assign a Risk Score (0-10) using this PRECISE scale:
   - 0-1: Normal/Healthy
   - 2-4: Mild Risk
   - 5-7: Moderate Risk
   - 8-9: Severe Risk (But NO immediate danger)
   - 10: CRITICAL (Clear plan for suicide/self-harm ONLY)
   
   *CONSTRAINT 1*: If the summary contains metaphors (e.g. "drowning", "exploding") but NO explicit intent to die, the Maximum Score is 8.
   *CONSTRAINT 2*: "Existential Crisis" or "Philosophical Nihilism" (questioning life's meaning without active suicidal intent) should be scored 2-5 (Mild/Moderate), NOT 0. It is a form of distress.
   
2. Write a Clinical Reasoning (INTERNAL ONLY). Explain the score based on symptoms.
3. Write a Clinical Validation (USER FACING). A warm, empathetic, 1-sentence response intended for the user/voice agent to say.

OUTPUT FORMAT (Strict JSON ONLY):
DO NOT return conversational filler like "Here is the JSON". Just the raw JSON object.
{{
  "reasoning": "Internal clinical analysis...",
  "validation": "Warm, empathetic response for the patient...",
  "score": int
}}
"""
                # NEW: Configure Safety Settings to allow medical/symptom analysis
                from google.generativeai.types import HarmCategory, HarmBlockThreshold
                
                safety_settings = {
                    HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_NONE,
                    HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_NONE,
                    HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_NONE,
                    HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_NONE,
                }

                response = current_model.generate_content(
                    prompt_text, 
                    generation_config={"response_mime_type": "application/json"},
                    safety_settings=safety_settings
                )
                
                # Debug: Print raw text to see if it's blocked or markdown-wrapped
                raw_text = response.text
                print(f"[DEBUG] Raw Gemini Response ({model_name}): {raw_text}")
                
                # Robust Pattern Matching for JSON
                try:
                    # Finds the first valid JSON object in the string
                    json_match = re.search(r'\{.*\}', raw_text, re.DOTALL)
                    if json_match:
                        cleaned_text = json_match.group(0)
                        import json
                        gemini_result = json.loads(cleaned_text)
                        print(f"[OK] Gemini Analysis Success with {model_name}: {gemini_result}")
                        
                        # Update the source model name for firestore
                        gemini_result['_source_model'] = model_name
                        break # Success! Exit loop
                    else:
                         print(f"[WARN] No JSON found in response: {raw_text}")
                         last_error = f"No JSON found in response. Raw: {raw_text[:100]}"
                         # Fallback for simple parse if regex fails but it looks like json
                         if '{' in raw_text:
                             gemini_result = json.loads(raw_text)
                             break
                except Exception as json_err:
                     print(f"[WARN] JSON parsing failed: {json_err}")
                     last_error = f"JSON parse error: {json_err}"
                     continue

            except ResourceExhausted:
                print(f"[WARN] Quota exceeded for {model_name}. Trying next model...")
                continue
            
            except Exception as e:
                print(f"[ERR] Gemini Error ({model_name}): {type(e).__name__} - {e}")
                last_error = f"{type(e).__name__} - {str(e)}"
                continue

        # Check if we got a result
        if gemini_result.get("score") == 0 and gemini_result.get("reasoning") == "Assessment pending.":
             gemini_result = {"score": 0, "reasoning": f"Clinical system error: {last_error}", "validation": "I'm having trouble connecting to the clinical database."}

    # Use Gemini's calculated data
    final_score = gemini_result.get("score", 0)
    final_reasoning = gemini_result.get("reasoning", "No reasoning provided.")
    final_validation = gemini_result.get("validation", "Thank you for sharing that with me.")

    # --- SAVE TO FIRESTORE ---
    doc_id = None
    if db:
        try:
            doc_ref = db.collection('screenings').add({
                "risk_score": final_score,
                "summary": summary,
                "agent_validation": "Agent observation only", # Deprecated agent scoring
                "gemini_impression": final_reasoning,
                "timestamp": datetime.datetime.now(datetime.timezone.utc),
                "model": gemini_result.get('_source_model', 'gemini-2.0-flash'),
                "source": "MindWell Agent v2 (Gemini-Backend)"
            })
            doc_id = doc_ref[1].id
            print(f"[SAVE] Saved to Firestore: {doc_id}")
        except Exception as e:
            print(f"[ERR] Firestore Error: {e}")

    # --- RETURN TO AGENT/FRONTEND ---
    return (jsonify({
        "success": True,
        "result": {
            "validation": final_reasoning,
            "score": final_score,
            "firestore_id": doc_id
        }
    }), 200, headers)


@functions_framework.http
def get_helplines(request):
    """Returns Indian mental health helplines."""
    if request.method == 'OPTIONS':
        return ('', 204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type'
        })

    helplines = [
        {
            "name": "Tele-MANAS",
            "number": "14416",
            "description": "Government of India 24/7 Mental Health Helpline",
            "availability": "24/7"
        },
        {
            "name": "iCALL",
            "number": "9152987821",
            "description": "TISS Psychosocial Helpline",
            "availability": "Monday-Saturday, 8 AM - 10 PM"
        },
        {
            "name": "Vandrevala Foundation",
            "number": "9999666555",
            "description": "24/7 Mental Health Support",
            "availability": "24/7"
        }
    ]
    
    return (jsonify({
        "success": True,
        "helplines": helplines
    }), 200, {'Access-Control-Allow-Origin': '*'})