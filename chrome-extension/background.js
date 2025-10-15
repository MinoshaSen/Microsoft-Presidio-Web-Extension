const API_ENDPOINT = "http://127.0.0.1:3000/anonymize_text";

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "analyzeText") {
    fetch(API_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: request.text }),
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      // Send the entire data object back {status, text, pii_results}
      sendResponse({ success: true, data: data });
    })
    .catch(error => {
      console.error("Presidio API Error:", error);
      sendResponse({ success: false, error: error.message });
    });

    return true; // Indicates an asynchronous response.
  }
});