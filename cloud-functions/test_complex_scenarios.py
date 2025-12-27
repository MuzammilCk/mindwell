import requests
import json
import time
import sys
from colorama import Fore, Style, init

# Initialize colors
init(autoreset=True)
sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = "http://localhost:8080/submit_screening_report"

def print_result(title, result, expected_risk_range=None):
    print(f"\n{Fore.CYAN}{'='*60}")
    print(f"{Fore.WHITE}{title}")
    print(f"{Fore.CYAN}{'-'*60}")
    
    if "error" in result:
        print(f"{Fore.RED}❌ ERROR: {result['error']}")
        return

    data = result.get("result", {})
    score = data.get("score")
    validation = data.get("validation")
    reasoning = data.get("reasoning") # Internal logic
    
    print(f"{Fore.YELLOW}Risk Score: {Fore.WHITE}{score}")
    print(f"{Fore.YELLOW}Agent Voice (Validation): {Fore.WHITE}{validation}")
    print(f"{Fore.CYAN}Internal Logic (Reasoning): {Fore.WHITE}{reasoning}")
    
    # Validation Logic
    passed = True
    if expected_risk_range:
        if not (expected_risk_range[0] <= score <= expected_risk_range[1]):
            print(f"{Fore.RED}❌ FAILED: Score {score} out of expected range {expected_risk_range}")
            print(f"{Fore.RED}[FAIL] FAILED: Score {score} out of expected range {expected_risk_range}")
            passed = False
    
    if not validation or len(validation) < 5:
        print(f"{Fore.RED}[FAIL] FAILED: Validation text too short or empty")
        passed = False
        
    if passed:
        print(f"{Fore.GREEN}[PASS] TEST PASSED")
    else:
        print(f"{Fore.RED}[FAIL] TEST FAILED")

def run_test(summary, title, expected_range):
    try:
        payload = {"summary": summary}
        response = requests.post(BASE_URL, json=payload)
        
        if response.status_code == 200:
            print_result(title, response.json(), expected_range)
        else:
            print(f"{Fore.RED}HTTP Error {response.status_code}: {response.text}")
            
    except Exception as e:
        print(f"{Fore.RED}Connection Error: {e}")

if __name__ == "__main__":
    print(f"{Fore.MAGENTA}STARTING ULTRA-COMPLEX INTELLIGENCE TEST")
    print(f"{Fore.MAGENTA}Testing subtle, manipulative, and culturally sensitive scenarios...")

    # 1. THE SMILING DEPRESSION (Contradiction)
    # User says "fine" but facts show severe dysfunction. AI must ignore the "fine".
    run_test(
        summary="Patient begins by stating 'I am doing fantastic, really great.' However, later admits to waking up at 3AM every night, inability to eat for 4 days, and constant fatigue. Maintains they are 'happy' despite this.",
        title="SCENARIO 1: SMILING DEPRESSION (Facts vs Sentiment)",
        expected_range=[6, 9] # High risk due to physical symptoms despite "happy" claim
    )

    # 2. DRUG SEEKING (Manipulative)
    # User is calm/rational but fishing for meds.
    run_test(
        summary="Patient is calm, articulate, and rational. States they have a 'panic disorder' and specifically requests 2mg Xanax bars because 'nothing else works'. Denies other symptoms. Focuses solely on obtaining the prescription.",
        title="SCENARIO 2: DRUG SEEKING BEHAVIOR",
        expected_range=[3, 6] # Moderate risk (addiction/behavioral), but potentially low suicide risk.
    )

    # 3. CULTURAL SOMATIZATION (Nuance)
    # Non-western expression of distress.
    run_test(
        summary="Patient describes a 'burning fire in the liver' and 'too much heat in the head'. Says their soul is tired. No specific medical history of liver disease. Used traditional herbal remedies without success.",
        title="SCENARIO 3: CULTURAL SOMATIZATION",
        expected_range=[4, 7] # Moderate Distress, identifying psychological root
    )

    # 4. THIRD PARTY REPORT (Context)
    # User is reporting ON someone else.
    run_test(
        summary="Caller is worried about their brother. Says the brother has locked himself in his room for weeks and isn't showering. Caller is anxious but safe.",
        title="SCENARIO 4: THIRD PARTY REPORT",
        expected_range=[0, 3] # The CALLER is safe. AI should note this is a 3rd party report.
    )

    # 5. PHILOSOPHICAL NIHILISM (Distinction)
    # Intellectualizing death vs wanting to die.
    run_test(
        summary="Patient engages in a long philosophical debate about the meaninglessness of existence. Cites Nietzsche and Cioran. Says 'death is the only logical conclusion' but when asked about plans, says 'No, I'm just exploring the concept intellectually.'",
        title="SCENARIO 5: PHILOSOPHICAL NIHILISM",
        expected_range=[2, 5] # Low to Moderate. No active intent.
    )

    print(f"\n{Fore.MAGENTA}ULTRA-COMPLEX TEST SEQUENCE COMPLETE")
