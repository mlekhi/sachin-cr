// Main content script - orchestrates text analysis and highlighting
class SachinCR {
  constructor() {
    this.violations = [];
    this.highlights = [];
    this.init();
  }

  init() {
    // Listen for messages from popup
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      try {
        if (request.action === 'ping') {
          sendResponse({ success: true, loaded: true });
        } else if (request.action === 'analyze') {
          this.analyzePage().then(result => {
            sendResponse({ 
              success: true, 
              violationCount: result.violationCount,
              violations: result.violations
            });
          }).catch(error => {
            sendResponse({ success: false, error: error.message });
          });
          return true; // Keep channel open for async
        } else if (request.action === 'clear') {
          this.clearHighlights();
          sendResponse({ success: true });
        } else {
          sendResponse({ success: false, error: 'Unknown action' });
        }
      } catch (error) {
        console.error('Sachin CR Error:', error);
        sendResponse({ success: false, error: error.message });
      }
      return true;
    });
  }

  // Main analysis function
  async analyzePage() {
    this.clearHighlights();
    this.violations = [];
    
    const textElements = TextFinder.findTextElements();
    
    if (textElements.length === 0) {
      console.log('Sachin CR: No editable text found on this page');
      return { violationCount: 0, violations: [] };
    }
    
    console.log(`Sachin CR: Analyzing ${textElements.length} text elements for violations...`);
    
    // Analyze each text element
    for (const { element, text } of textElements) {
      try {
        const violations = ViolationDetector.analyzeText(text);
        
        if (violations.length > 0) {
          this.violations.push(...violations.map(v => ({
            ...v,
            elementType: element.tagName || 'div',
            textPreview: text.substring(Math.max(0, v.start - 20), Math.min(text.length, v.end + 20))
          })));
          
          // Highlight violations in the element
          const highlights = Highlighter.highlightViolations(element, violations);
          this.highlights.push(...highlights);
        }
      } catch (error) {
        console.error('Sachin CR: Error analyzing element:', error);
      }
    }
    
    console.log(`Sachin CR: Found ${this.violations.length} violations`);
    return {
      violationCount: this.violations.length,
      violations: this.violations
    };
  }

  // Clear all highlights
  clearHighlights() {
    Highlighter.clearHighlights(this.highlights);
    this.highlights = [];
    this.violations = [];
  }
}

// Initialize when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.sachinCR = new SachinCR();
    console.log('Sachin CR: Initialized (DOMContentLoaded)');
  });
} else {
  window.sachinCR = new SachinCR();
  console.log('Sachin CR: Initialized (immediate)');
}
