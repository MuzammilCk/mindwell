import google.generativeai as genai
import os
from dotenv import load_dotenv
from google.generativeai.types import HarmCategory, HarmBlockThreshold
from google.api_core.exceptions import ResourceExhausted
import json

load_dotenv()

API_KEY = os.environ.get("GEMINI_API_KEY")

if not API_KEY:
    print("❌ API Key not found")
    exit(1)

print(f"API Key found: {API_KEY[:5]}...")

genai.configure(api_key=API_KEY)
print("Model initialized")

prompt = """You are a senior clinical psychologist. Analyze the following patient summary from a screening interview.

PATIENT SUMMARY:
The user has been speaking in somewhat abstract and metaphorical terms...

TASK:
1. Assign a Risk Score (0-10)
2. Write a 1-sentence clinical validation.

OUTPUT FORMAT (Strict JSON):
{
  "score": int,
  "reasoning": "string"
}
"""

safety_settings = {
    HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_NONE,
    HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_NONE,
    HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_NONE,
    HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_NONE,
}

models_to_try = ['gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-flash-latest']

for model_name in models_to_try:
    try:
        print(f"Attempting analysis with {model_name}...")
        current_model = genai.GenerativeModel(model_name)

        print(f"Sending request to {model_name}...")
        response = current_model.generate_content(
            prompt, 
            generation_config={"response_mime_type": "application/json"},
            safety_settings=safety_settings
        )

        print(f"Response received from {model_name}")
        print(f"Text: {response.text}")
        break # Success

    except ResourceExhausted:
        print(f"Quota exceeded for {model_name}. Trying next model...")
        continue
    except Exception as e:
        print(f"Error with {model_name}: {type(e).__name__} - {e}")
        continue
