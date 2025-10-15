const TARGET_EDITOR_ID = "prompt-textarea";
const SUBMIT_BUTTON_SELECTOR = '[data-testid="send-button"]';

function setupPiiCheckerForButton(realSubmitButton, initialTargetEditor) {
  if (realSubmitButton.dataset.piiCheckerAttached) return;

  const parent = realSubmitButton.parentNode;
  if (!parent) return;

  const oldFakeButton = parent.querySelector('.fake-submit-button-pii');
  if (oldFakeButton) oldFakeButton.remove();

  realSubmitButton.dataset.piiCheckerAttached = 'true';
  console.log("PII Protector: Submit button found! Attaching protection.");

  const fakeSubmitButton = realSubmitButton.cloneNode(true);
  fakeSubmitButton.id = "";
  fakeSubmitButton.classList.add('fake-submit-button-pii');

  realSubmitButton.style.display = 'none';
  parent.insertBefore(fakeSubmitButton, realSubmitButton);

  const resultsPanel = createOrGetResultsPanel();

  fakeSubmitButton.addEventListener("click", async (event) => {
    event.preventDefault();
    event.stopPropagation();
    
    const currentTargetEditor = document.getElementById(TARGET_EDITOR_ID);
    
    // --- ADDED FOR DEBUGGING ---
    // This will show you exactly what element the script is finding.
    console.log("Found Target Editor:", currentTargetEditor);

    if (!currentTargetEditor) {
      console.error("PII Protector: Could not find the editor on click.");
      return;
    }
    
    const text = currentTargetEditor.innerText;

    //
    // --- FINAL FIX IS HERE ---
    // This safety check handles cases where 'text' is undefined or null before calling .trim()
    //
    if (!text || text.trim().length === 0) {
      realSubmitButton.click();
      return;
    }

    try {
      fakeSubmitButton.disabled = true;
      const response = await analyzeTextWithApi(text);
      fakeSubmitButton.disabled = false;

      switch (response.status) {
        case "ANONYMIZED":
          updateResultsPanel("PII Detected & Anonymized", response.pii_results, text);
          resultsPanel.style.display = "flex";
          alert("PII was detected and has been anonymized. Please review the changes before sending again.");
          currentTargetEditor.innerText = response.text;
          break;
        case "VERIFICATION_FAILED":
          updateResultsPanel("High Risk Warning", [{ entity_type: "POTENTIAL SENSITIVE DATA", text: "Our secondary AI verification system flagged this prompt as potentially containing sensitive information." }]);
          resultsPanel.style.display = "flex";
          break;
        case "SAFE":
          realSubmitButton.click();
          break;
      }
    } catch (error) {
      console.error("PII Protector: Analysis failed:", error);
      updateResultsPanel("Error", [{ entity_type: "ANALYSIS FAILED", text: `Error: ${error.message || error}` }]);
      resultsPanel.style.display = "flex";
      fakeSubmitButton.disabled = false;
    }
  });
}

// ... the rest of your functions (analyzeTextWithApi, createOrGetResultsPanel, updateResultsPanel, observer) remain the same ...

function analyzeTextWithApi(text) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ action: "analyzeText", text: text }, (response) => {
      if (chrome.runtime.lastError) {
        return reject(chrome.runtime.lastError.message);
      }
      if (response && response.success) {
        resolve(response.data);
      } else {
        reject(response.error || "Unknown error from background script.");
      }
    });
  });
}

function createOrGetResultsPanel() {
  let panel = document.getElementById("p-pii-results-panel");
  if (panel) return panel;
  
  panel = document.createElement("div");
  panel.id = "p-pii-results-panel";
  panel.innerHTML = `
    <div class="p-pii-results-content">
      <div class="p-pii-results-header">
        <h3 id="p-pii-header-title">PII Detected</h3>
        <button id="p-pii-close-btn" title="Close">X</button>
      </div>
      <ul id="p-pii-results-list"></ul>
    </div>
  `;
  panel.querySelector("#p-pii-close-btn").addEventListener("click", () => {
    panel.style.display = "none";
  });
  document.body.appendChild(panel);
  return panel;
}

function updateResultsPanel(title, results, originalText = "") {
  document.getElementById("p-pii-header-title").textContent = title;
  const list = document.getElementById("p-pii-results-list");
  if (!list) return;
  list.innerHTML = "";

  results.forEach(item => {
    const listItem = document.createElement("li");
    listItem.className = "p-pii-result-item";
    
    const itemText = item.start !== undefined ? originalText.substring(item.start, item.end) : item.text;

    const piiText = document.createElement("strong");
    piiText.textContent = itemText;

    const piiType = document.createElement("span");
    piiType.className = "p-pii-entity-type";
    piiType.textContent = item.entity_type;

    listItem.appendChild(piiText);
    listItem.appendChild(piiType);
    list.appendChild(listItem);
  });
}

const observer = new MutationObserver(() => {
    const submitButton = document.querySelector(SUBMIT_BUTTON_SELECTOR);
    const targetEditor = document.getElementById(TARGET_EDITOR_ID);

    if (submitButton && targetEditor) {
        setupPiiCheckerForButton(submitButton, targetEditor);
    }
});

observer.observe(document.body, { childList: true, subtree: true });