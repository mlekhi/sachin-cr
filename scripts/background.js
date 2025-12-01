// Background service worker for API calls
// This avoids CORS issues that content scripts face

const API_BASE = 'https://contrary-editing-demo-production.up.railway.app';

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'fetchPages') {
    fetchPages()
      .then(data => sendResponse({ success: true, data }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Indicates we will send a response asynchronously
  }

  if (request.action === 'processPage') {
    processPage(request.pageId, request.options)
      .then(data => sendResponse({ success: true, data }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Indicates we will send a response asynchronously
  }
});

async function fetchPages() {
  try {
    const response = await fetch(`${API_BASE}/pages`);
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }

    // Check if response has content
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      throw new Error(`Unexpected response type: ${contentType || 'unknown'}. Response: ${text.substring(0, 200)}`);
    }

    const data = await response.json();
    
    // Validate response structure
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid response format: expected an object');
    }

    const pages = data.pages || [];

    if (!Array.isArray(pages)) {
      throw new Error('Invalid response format: pages should be an array');
    }

    return { pages };
  } catch (error) {
    console.error('Background: Error fetching pages:', error);
    throw error;
  }
}

async function processPage(pageId, options = {}) {
  try {
    const response = await fetch(`${API_BASE}/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        page_id: pageId,
        model: options.model || 'openai',
        auto_select_child: options.auto_select_child !== false
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Background: Error processing page:', error);
    throw error;
  }
}

