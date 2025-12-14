# Run this in PowerShell
Write-Host "🚀 Setting up MindWell Backend..." -ForegroundColor Cyan

# 1. Navigate to directory
Set-Location "cloud-functions"

# 2. Check/Create Virtual Environment
if (-not (Test-Path "venv")) {
    Write-Host "Creating python virtual environment..."
    python -m venv venv
}

# 3. Activate venv
if (Test-Path "venv\Scripts\Activate.ps1") {
    . .\venv\Scripts\Activate.ps1
} else {
    Write-Host "❌ Could not find venv/Scripts/Activate.ps1" -ForegroundColor Red
    exit 1
}

# 4. Install Dependencies
Write-Host "Installing requirements..."
pip install -r requirements.txt

# 5. Configure Credentials
$credPath = Join-Path $PSScriptRoot "credentials.json"
if (Test-Path $credPath) {
    $env:GOOGLE_APPLICATION_CREDENTIALS = $credPath
    Write-Host "🔑 Found credentials.json loaded!" -ForegroundColor Green
} else {
    Write-Host "⚠️ No credentials.json found at $credPath. Firestore might fail." -ForegroundColor Yellow
}

# 6. Run the function
Write-Host "✅ Setup Complete!" -ForegroundColor Green
Write-Host "Starting 'submit_screening_report' on http://localhost:8080..." -ForegroundColor Yellow
Write-Host "To test other functions, change --target in this script."
functions-framework --target=submit_screening_report --debug --port=8080
