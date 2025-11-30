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
        await chrome.scripting.insertCSS({
          target: { tabId: tab.id },
          files: ['content.css']
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
        const count = results.violationCount || 0;
        updateIssueCount(count);
        
        if (count > 0) {
          updateStatus(`Found ${count} violation${count === 1 ? '' : 's'}!`, 'success');
          console.log('Found violations:', results.violations);
        } else {
          updateStatus('No violations found. Text looks good!', 'success');
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
    try {
      const tab = await getCurrentTab();
      await chrome.tabs.sendMessage(tab.id, {
        action: 'clear'
      });
      updateStatus('Highlights cleared.', 'info');
      updateIssueCount(0);
    } catch (error) {
      console.error('Error:', error);
      updateStatus('Error clearing highlights.', 'error');
    }
  });

  // Check initial state
  updateIssueCount(0);
});
