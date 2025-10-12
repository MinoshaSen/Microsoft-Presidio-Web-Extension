const TARGET_EDITOR_ID = "prompt-textarea";
const SUBMIT_BUTTON_ID = "composer-submit-button";

function setupPiiCheckerForButton(realSubmitButton, targetEditor) {
  if (realSubmitButton.dataset.piiCheckerAttached) {
    return;
  }
  
  const parent = realSubmitButton.parentNode;
  if (!parent) return;


  const oldFakeButton = parent.querySelector('.fake-submit-button-pii');
  if (oldFakeButton) {
    oldFakeButton.remove();
  }

  realSubmitButton.dataset.piiCheckerAttached = 'true';
  console.log("Presidio Checker: New Send button found! Attaching PII protection.");

  const fakeSubmitButton = realSubmitButton.cloneNode(true);
  fakeSubmitButton.id = "";
  fakeSubmitButton.classList.add('fake-submit-button-pii');

  realSubmitButton.style.display = 'none';
  parent.insertBefore(fakeSubmitButton, realSubmitButton);

  const resultsPanel = createOrGetResultsPanel();

  fakeSubmitButton.addEventListener("click", async (event) => {
    event.preventDefault();
    
    const text = targetEditor.innerText;
    if (text.trim().length === 0) {
      realSubmitButton.click();
      return;
    }

    try {
      fakeSubmitButton.disabled = true;
      const piiResults = await checkForPii(text);
      fakeSubmitButton.disabled = false;

      if (piiResults && piiResults.length > 0) {
        updateResultsPanel(piiResults, text);
        resultsPanel.style.display = "flex";
      } else {
        realSubmitButton.click();
      }
    } catch (error) {
      console.error("Analysis failed:", error);
      updateResultsPanel([{ entity_type: "ERROR", text: `Error: ${error}` }]);
      resultsPanel.style.display = "flex";
      fakeSubmitButton.disabled = false;
    }
  });
}


function checkForPii(text) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ action: "analyzeText", text: text }, (response) => {
      if (chrome.runtime.lastError) {
        return reject(chrome.runtime.lastError.message);
      }
      if (response && response.success) {
        resolve(response.data);
      } else {
        reject(response.error || "Unknown error.");
      }
    });
  });
}

function createOrGetResultsPanel() {
  let panel = document.getElementById("p-pii-results-panel");
  if (panel) {
    return panel;
  }
  
  panel = document.createElement("div");
  panel.id = "p-pii-results-panel";
  panel.innerHTML = `
    <div class="p-pii-results-content">
      <div class="p-pii-results-header">
        <h3>PII Detected - Submission Blocked</h3>
        <button id="p-pii-close-btn">Close</button>
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

function updateResultsPanel(piiResults, originalText) {
  const list = document.getElementById("p-pii-results-list");
  if (!list) return;
  list.innerHTML = "";

  piiResults.forEach(pii => {
    const listItem = document.createElement("li");
    listItem.className = "p-pii-result-item";
    
    const piiText = document.createElement("strong");
    piiText.textContent = originalText.substring(pii.start, pii.end);

    const piiType = document.createElement("span");
    piiType.className = "p-pii-entity-type";
    piiType.textContent = pii.entity_type;

    listItem.appendChild(piiText);
    listItem.appendChild(piiType);
    list.appendChild(listItem);
  });
}

const observer = new MutationObserver((mutationsList, observer) => {
    const submitButton = document.getElementById(SUBMIT_BUTTON_ID);
    const targetEditor = document.getElementById(TARGET_EDITOR_ID);

    if (submitButton && targetEditor) {
        setupPiiCheckerForButton(submitButton, targetEditor);
    }
});

observer.observe(document.body, { childList: true, subtree: true });