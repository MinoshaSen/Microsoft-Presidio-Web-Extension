from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from presidio_analyzer import AnalyzerEngine, RecognizerRegistry
from presidio_anonymizer import AnonymizerEngine
from transformers import pipeline

# --- 1. Initialize Presidio with Custom Recognizers ---

# Create a registry and load your custom YAML file
# This tells Presidio to use your Sri Lankan recognizers
registry = RecognizerRegistry()
registry.load_predefined_recognizers()
registry.add_recognizers_from_yaml("custom_recognizers.yml")

# Initialize the Analyzer with your custom registry
analyzer = AnalyzerEngine(registry=registry)
anonymizer = AnonymizerEngine()

# --- 2. Initialize the AI Verification Model ---
zero_shot_classifier = pipeline("zero-shot-classification", model="facebook/bart-large-mnli")
SENSITIVE_THRESHOLD = 0.90 

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 3. Verification Function ---
def verify_with_zero_shot(text: str) -> bool:
    candidate_labels = ["contains sensitive personal information", "safe business communication"]
    result = zero_shot_classifier(text, candidate_labels, multi_label=False)
    
    if result['labels'][0] == candidate_labels[0] and result['scores'][0] > SENSITIVE_THRESHOLD:
        print(f"Zero-shot verification FAILED with score: {result['scores'][0]}")
        return True
    return False

# --- 4. Main API Endpoint ---
@app.post("/anonymize_text")
async def anonymize_text(request: Request):
    body = await request.json()
    text = body.get("text")

    if not text or not text.strip():
        return {"text": "", "status": "SAFE"}

    # Step A: Analyze text using the analyzer with your custom recognizers
    presidio_results = analyzer.analyze(text=text, language="en")

    # Step B: Anonymize if Presidio found PII
    if presidio_results:
        anonymized_result = anonymizer.anonymize(text=text, analyzer_results=presidio_results)
        results_list = [r.to_dict() for r in presidio_results]
        return {
            "text": anonymized_result.text,
            "status": "ANONYMIZED",
            "pii_results": results_list
        }

    # Step C: If Presidio found nothing, run the secondary AI verifier
    is_sensitive_by_verifier = verify_with_zero_shot(text)
    
    if is_sensitive_by_verifier:
        return {"text": text, "status": "VERIFICATION_FAILED"}

    # Step D: If both checks pass, the text is safe
    return {"text": text, "status": "SAFE"}