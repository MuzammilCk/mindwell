import os
import json
import asyncio
from dotenv import load_dotenv

# Load environment variables from .env (checks local directory and parent directory)
load_dotenv()
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from google import genai
from google.genai import types
from sarvamai import AsyncSarvamAI

app = FastAPI(title="MindWell AI Core Gateway")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize SDK Clients
SARVAM_API_KEY = os.getenv("SARVAM_API_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

sarvam_client = AsyncSarvamAI(api_subscription_key=SARVAM_API_KEY)
gemini_client = genai.Client(api_key=GEMINI_API_KEY)

# System Prompt Definition — multilingual, empathetic
SYSTEM_PROMPT = """
You are MindWell, a compassionate voice-first mental health screening AI designed for Indian students.

CRITICAL LANGUAGE RULE:
- You MUST respond in the SAME language the user is speaking.
- If the user speaks in Hindi, respond entirely in Hindi.
- If the user speaks in Tamil, respond entirely in Tamil.
- If the user speaks in code-mixed Hinglish, respond in the same Hinglish style.
- Match the user's language naturally — never force English on a non-English speaker.

RESPONSE FORMAT — always respond in valid JSON with exactly these two keys:
1. "spoken_response": A short, warm, human-like response (max 40 words) IN THE USER'S LANGUAGE.
2. "clinical_telemetry": An object containing:
   - "detected_emotions": array of emotion strings
   - "phq9_risk_indicator": "low" | "moderate" | "high" | "severe"
   - "gad7_risk_indicator": "low" | "moderate" | "high" | "severe"
   - "requires_crisis_intervention": boolean
   - "recommended_resource": optional string

GUIDELINES:
- Be warm, non-judgmental, and empathetic.
- Ask gentle follow-up questions to understand the user's state.
- Never diagnose — you are a screening companion, not a doctor.
- If the user shows signs of self-harm or crisis, set requires_crisis_intervention to true.
"""

# TTS-supported languages (Sarvam Bulbul v3)
TTS_SUPPORTED_LANGUAGES = {
    'bn-IN', 'en-IN', 'gu-IN', 'hi-IN', 'kn-IN',
    'ml-IN', 'mr-IN', 'od-IN', 'pa-IN', 'ta-IN', 'te-IN'
}

# Language display names for frontend
LANGUAGE_NAMES = {
    'hi-IN': 'Hindi', 'en-IN': 'English', 'bn-IN': 'Bengali',
    'ta-IN': 'Tamil', 'te-IN': 'Telugu', 'kn-IN': 'Kannada',
    'ml-IN': 'Malayalam', 'mr-IN': 'Marathi', 'gu-IN': 'Gujarati',
    'pa-IN': 'Punjabi', 'od-IN': 'Odia', 'as-IN': 'Assamese',
    'ur-IN': 'Urdu', 'ne-IN': 'Nepali', 'kok-IN': 'Konkani',
    'ks-IN': 'Kashmiri', 'sd-IN': 'Sindhi', 'sa-IN': 'Sanskrit',
    'sat-IN': 'Santali', 'mni-IN': 'Manipuri', 'brx-IN': 'Bodo',
    'mai-IN': 'Maithili', 'doi-IN': 'Dogri',
}


@app.post("/api/v1/voice-turn")
async def process_voice_turn(
    audio: UploadFile = File(...),
    language_code: str = Form("unknown"),
    voice_id: str = Form("ritu"),
    chat_history: str = Form("[]")
):
    """
    Complete End-to-End Voice Turn with auto language detection:
    1. Transcribe incoming user audio via Sarvam Saaras v3 STT (auto-detect language).
    2. Process transcript + clinical history via Gemini 2.5 Flash (respond in user's language).
    3. Synthesize empathetic response audio via Sarvam Bulbul v3 TTS (in detected language).
    4. Return binary audio + telemetry metadata + detected language.
    """
    try:
        # Step 1: Read audio file bytes
        audio_bytes = await audio.read()

        # Step 2: Speech-to-Text using Sarvam AI (Saaras v3)
        # Use language_code="unknown" for auto-detection, mode="transcribe" to preserve original language
        stt_response = await sarvam_client.speech_to_text.transcribe(
            file=(audio.filename or "audio.webm", audio_bytes, audio.content_type or "audio/webm"),
            model="saaras:v3",
            language_code=language_code,
            mode="transcribe"  # Preserves original language (not translated to English)
        )
        
        user_transcript = stt_response.transcript
        if not user_transcript.strip():
            raise HTTPException(status_code=400, detail="Could not transcribe audio.")

        # Step 2b: Extract detected language from STT response
        detected_lang = stt_response.language_code or "en-IN"
        detected_lang_name = LANGUAGE_NAMES.get(detected_lang, detected_lang)
        lang_confidence = stt_response.language_probability or 0.0

        print(f"[LANG] Detected: {detected_lang} ({detected_lang_name}) confidence={lang_confidence:.2f}")
        print(f"[STT]  Transcript: {user_transcript[:100]}")

        # Step 3: Formulate Conversation Context for Gemini
        parsed_history = json.loads(chat_history)
        messages = [
            types.Content(role="user", parts=[types.Part.from_text(text=f"System Context: {SYSTEM_PROMPT}")])
        ]
        
        for msg in parsed_history:
            messages.append(types.Content(
                role="user" if msg["sender"] == "user" else "model",
                parts=[types.Part.from_text(text=msg["text"])]
            ))
        
        # Include detected language hint so Gemini knows which language to respond in
        lang_hint = f"[The user is speaking in {detected_lang_name} ({detected_lang}). Respond in {detected_lang_name}.]"
        messages.append(types.Content(
            role="user", 
            parts=[types.Part.from_text(text=f"{lang_hint}\n\nUser says: {user_transcript}")]
        ))

        # Step 4: Gemini Reasoning Engine Call
        gemini_response = gemini_client.models.generate_content(
            model="gemini-2.5-flash",
            contents=messages,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.4
            )
        )
        
        ai_output = json.loads(gemini_response.text)
        spoken_text = ai_output.get("spoken_response", "I am here for you. Can you tell me more?")
        telemetry = ai_output.get("clinical_telemetry", {})

        print(f"[AI]   Response: {spoken_text[:100]}")

        # Step 5: Check for Emergency Crisis Trigger
        if telemetry.get("requires_crisis_intervention"):
            # Crisis response in detected language via Gemini
            crisis_msgs = [
                types.Content(role="user", parts=[types.Part.from_text(
                    text=f"Translate this crisis message into {detected_lang_name}: "
                         f"'I hear how much pain you are in right now. Please know you are not alone. "
                         f"Let me connect you directly to support services. Please call Tele-MANAS at 14416.'"
                         f"\n\nRespond with ONLY the translated text, nothing else."
                )])
            ]
            try:
                crisis_response = gemini_client.models.generate_content(
                    model="gemini-2.5-flash",
                    contents=crisis_msgs,
                    config=types.GenerateContentConfig(temperature=0.1)
                )
                spoken_text = crisis_response.text.strip().strip('"')
            except Exception:
                spoken_text = "I hear how much pain you are in right now. Please know you are not alone. Let me connect you directly to support services."

        # Step 6: Determine TTS language — fall back to hi-IN if detected lang isn't TTS-supported
        tts_language = detected_lang if detected_lang in TTS_SUPPORTED_LANGUAGES else "hi-IN"

        valid_speakers = {'anushka', 'abhilash', 'manisha', 'vidya', 'arya', 'karun', 'hitesh', 'aditya', 'ritu', 'priya', 'neha', 'rahul', 'pooja', 'rohan', 'simran', 'kavya', 'amit', 'dev', 'ishita', 'shreya', 'ratan', 'varun', 'manan', 'sumit', 'roopa', 'kabir', 'aayan', 'shubh', 'ashutosh', 'advait', 'anand', 'tanya', 'tarun', 'sunny', 'mani', 'gokul', 'vijay', 'shruti', 'suhani', 'mohit', 'kavitha', 'rehan', 'soham', 'rupali'}
        selected_speaker = voice_id if voice_id in valid_speakers else "ritu"

        # Step 7: Text-to-Speech using Sarvam AI (Bulbul v3) in detected language
        tts_response = await sarvam_client.text_to_speech.convert(
            text=spoken_text,
            target_language_code=tts_language,
            speaker=selected_speaker,
            model="bulbul:v3",
            pace=1.0,
            enable_preprocessing=True
        )

        print(f"[TTS]  Language: {tts_language}, Speaker: {selected_speaker}")

        # Step 8: Send Payload back to React Frontend
        return JSONResponse(content={
            "user_transcript": user_transcript,
            "spoken_response": spoken_text,
            "audio_base64": tts_response.audios[0],
            "telemetry": telemetry,
            "detected_language": {
                "code": detected_lang,
                "name": detected_lang_name,
                "confidence": round(lang_confidence, 2),
            }
        })

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Pipeline processing failed: {str(e)}")

