document.addEventListener('DOMContentLoaded', () => {
  const goButton = document.getElementById('goButton');
  const clearButton = document.getElementById('clearButton');
  const statusDiv = document.getElementById('status');
  const issueCountSpan = document.getElementById('issueCount');

  // Check if all elements exist
  if (!goButton || !clearButton || !statusDiv || !issueCountSpan) {
    console.error('Missing required DOM elements');
    return;
  }

  // Get current tab
  async function getCurrentTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab;
  }

  // Update status message
  function updateStatus(message, type = 'info') {
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
  }

  // Update issue count
  function updateIssueCount(count) {
    issueCountSpan.textContent = count;
  }

  // Go button click handler
  goButton.addEventListener('click', async () => {
    try {
      goButton.disabled = true;
      updateStatus('Analyzing text...', 'info');

      const tab = await getCurrentTab();
      
      // Check if content script is loaded, inject if needed
      try {
        await chrome.tabs.sendMessage(tab.id, { action: 'ping' });
      } catch (e) {
        // Content script might not be loaded, try to inject it
        updateStatus('Loading extension...', 'info');
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content.js']
        });
        // Wait a bit for script to initialize
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Inject and run the analysis
      let results;
      try {
        results = await chrome.tabs.sendMessage(tab.id, {
          action: 'analyze'
        });
      } catch (msgError) {
        console.error('Message error:', msgError);
        updateStatus('Error: Could not communicate with page. Try refreshing.', 'error');
        return;
      }

      if (results && results.success) {
        const count = results.textCount || 0;
        updateIssueCount(count);
        
        if (count > 0 && results.texts) {
          const textInfo = results.texts.map((t, i) => 
            `${i + 1}. ${t.type} (${t.textLength} chars): ${t.preview}`
          ).join('\n');
          
          updateStatus(`Found ${count} text element${count === 1 ? '' : 's'}!`, 'success');
          console.log('Found texts:', results.texts);
          
          // Show details in console and alert for debugging
          alert(`Found ${count} text elements:\n\n${textInfo}`);
        } else {
          updateStatus('No editable text found on this page.', 'info');
        }
      } else {
        const errorMsg = results?.error || 'No editable text found on this page.';
        updateStatus(errorMsg, 'info');
        updateIssueCount(0);
      }
    } catch (error) {
      console.error('Error:', error);
      const errorMessage = error.message || 'Unknown error occurred';
      updateStatus(`Error: ${errorMessage}. Try refreshing the page.`, 'error');
      updateIssueCount(0);
    } finally {
      if (goButton) {
        goButton.disabled = false;
      }
    }
  });

  // Clear button click handler
  clearButton.addEventListener('click', async () => {
    updateStatus('Reset complete.', 'info');
    updateIssueCount(0);
  });

  // Check initial state
  updateIssueCount(0);
});

