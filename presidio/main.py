from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
import requests
import os

app = FastAPI()

# Allow access from Chrome extension
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # More permissive for local dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Read URLs from environment variables
ANALYZER_URL = os.getenv("ANALYZER_URL", "http://127.0.0.1:5001")
ANONYMIZER_URL = os.getenv("ANONYMIZER_URL", "http://127.0.0.1:5002")

@app.post("/anonymize_text")
async def anonymize_text(req: Request):
    body = await req.json()
    text = body.get("text", "")

    # Step 1: Call Analyzer to get PII locations
    analyzer_response = requests.post(f"{ANALYZER_URL}/analyze", json={"text": text, "language": "en"})
    analyzer_results = analyzer_response.json()

    # Step 2: **CORRECTED** - Return a JSON object that contains the analyzer_results
    # The previous version was missing this, which is why the extension received 'undefined'.
    return {"analyzer_results": analyzer_results}