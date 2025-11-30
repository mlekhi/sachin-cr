// Text detection system for Sachin CR
class SachinCR {
  constructor() {
    this.init();
  }

  init() {
    // Listen for messages from popup
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      try {
        if (request.action === 'ping') {
          sendResponse({ success: true, loaded: true });
        } else if (request.action === 'analyze') {
          const result = this.findTextElements();
          sendResponse({ 
            success: true, 
            textCount: result.length,
            texts: result.map(t => ({
              type: t.type,
              textLength: t.text.length,
              preview: t.text.substring(0, 100) + (t.text.length > 100 ? '...' : '')
            }))
          });
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

  // Find all editable text elements (optimized for Notion)
  findTextElements() {
    const textElements = [];
    
    console.log('Sachin CR: Starting text detection...');
    
    // Notion-specific: Find Notion page content blocks
    const notionSelectors = [
      'div[contenteditable="true"]',
      'div.notion-selectable[contenteditable="true"]',
      'div[data-content-editable-root="true"]',
      'div.notion-page-content [contenteditable="true"]'
    ];
    
    // Find Notion blocks first
    notionSelectors.forEach(selector => {
      try {
        const elements = document.querySelectorAll(selector);
        console.log(`Sachin CR: Found ${elements.length} elements with selector: ${selector}`);
        
        elements.forEach(el => {
          // Get text content - Notion uses innerText for visible text
          const text = el.innerText || el.textContent || '';
          const trimmedText = text.trim();
          
          // Only process if there's substantial text
          if (trimmedText.length > 0 && trimmedText.length < 50000) {
            // Check if this element is nested inside another contenteditable (skip nested)
            const parentContentEditable = el.closest('[contenteditable="true"]');
            if (parentContentEditable && parentContentEditable !== el) {
              return; // Skip nested elements
            }
            
            textElements.push({ 
              element: el, 
              type: 'notion-contenteditable', 
              text: trimmedText
            });
          }
        });
      } catch (e) {
        console.warn('Error finding Notion elements:', e);
      }
    });
    
    // Find all contenteditable elements (broader search)
    try {
      const allContentEditable = document.querySelectorAll('[contenteditable="true"]');
      console.log(`Sachin CR: Found ${allContentEditable.length} total contenteditable elements`);
      
      allContentEditable.forEach(el => {
        // Skip if already added
        if (textElements.some(te => te.element === el)) {
          return;
        }
        
        const text = el.innerText || el.textContent || '';
        const trimmedText = text.trim();
        
        if (trimmedText.length > 0 && trimmedText.length < 50000) {
          // Check for nested contenteditable
          const parentContentEditable = el.closest('[contenteditable="true"]');
          if (parentContentEditable && parentContentEditable !== el) {
            return;
          }
          
          textElements.push({ 
            element: el, 
            type: 'contenteditable', 
            text: trimmedText
          });
        }
      });
    } catch (e) {
      console.warn('Error finding contenteditable elements:', e);
    }
    
    // Find textareas
    try {
      const textareas = document.querySelectorAll('textarea');
      console.log(`Sachin CR: Found ${textareas.length} textareas`);
      
      textareas.forEach(el => {
        if (el.value && el.value.trim()) {
          textElements.push({ 
            element: el, 
            type: 'textarea', 
            text: el.value.trim() 
          });
        }
      });
    } catch (e) {
      console.warn('Error finding textareas:', e);
    }

    // Find input fields
    try {
      const inputs = document.querySelectorAll('input[type="text"], input[type="email"], input[type="search"]');
      console.log(`Sachin CR: Found ${inputs.length} input fields`);
      
      inputs.forEach(el => {
        if (el.value && el.value.trim()) {
          textElements.push({ 
            element: el, 
            type: 'input', 
            text: el.value.trim() 
          });
        }
      });
    } catch (e) {
      console.warn('Error finding input elements:', e);
    }

    // Remove duplicates (same element or nested)
    const uniqueElements = [];
    textElements.forEach(te => {
      const isNested = uniqueElements.some(ue => 
        ue.element.contains(te.element) && ue.element !== te.element
      );
      if (!isNested) {
        // Remove any existing elements that are nested in this one
        const filtered = uniqueElements.filter(ue => 
          !te.element.contains(ue.element) || te.element === ue.element
        );
        uniqueElements.length = 0;
        uniqueElements.push(...filtered, te);
      }
    });

    console.log(`Sachin CR: Found ${uniqueElements.length} unique text elements`);
    uniqueElements.forEach((te, idx) => {
      console.log(`  [${idx + 1}] ${te.type}: ${te.text.length} chars - "${te.text.substring(0, 50)}${te.text.length > 50 ? '...' : ''}"`);
    });

    return uniqueElements;
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
