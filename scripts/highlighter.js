// Text highlighting utilities
class Highlighter {
  // Find text range by character offset
  static findTextRange(element, startOffset, endOffset) {
    try {
      const range = document.createRange();
      let currentOffset = 0;
      let startNode = null;
      let startNodeOffset = 0;
      let endNode = null;
      let endNodeOffset = 0;
      
      const walker = document.createTreeWalker(
        element,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode: (node) => {
            // Skip our own highlight nodes
            if (node.parentElement && (
              node.parentElement.classList.contains('cr-violation') ||
              node.parentElement.closest('.cr-wrapper')
            )) {
              return NodeFilter.FILTER_REJECT;
            }
            return NodeFilter.FILTER_ACCEPT;
          }
        },
        false
      );
      
      let node;
      while (node = walker.nextNode()) {
        const nodeLength = node.textContent.length;
        
        // Check if start is in this node
        if (!startNode && currentOffset + nodeLength >= startOffset) {
          startNode = node;
          startNodeOffset = startOffset - currentOffset;
        }
        
        // Check if end is in this node
        if (currentOffset + nodeLength >= endOffset) {
          endNode = node;
          endNodeOffset = endOffset - currentOffset;
          break;
        }
        
        currentOffset += nodeLength;
      }
      
      if (startNode && endNode) {
        range.setStart(startNode, Math.max(0, startNodeOffset));
        range.setEnd(endNode, Math.min(endNode.textContent.length, endNodeOffset));
        return range;
      }
    } catch (e) {
      console.warn('Error finding text range:', e);
    }
    return null;
  }

  // Highlight violations in text
  static highlightViolations(element, violations) {
    if (violations.length === 0) return [];
    
    const highlights = [];
    
    // Sort violations by position (reverse order to avoid position shifts)
    const sortedViolations = [...violations].sort((a, b) => b.start - a.start);
    
    sortedViolations.forEach(violation => {
      try {
        const range = this.findTextRange(element, violation.start, violation.end);
        
        if (range) {
          const highlight = document.createElement('mark');
          highlight.className = `cr-violation cr-${violation.type}`;
          highlight.dataset.violationType = violation.type;
          highlight.title = `${violation.message}. Suggestion: ${violation.suggestion}`;
          
          try {
            range.surroundContents(highlight);
            highlights.push({ highlight, element });
          } catch (e) {
            // If surroundContents fails, try inserting span
            const span = document.createElement('span');
            span.className = `cr-violation cr-${violation.type}`;
            span.dataset.violationType = violation.type;
            span.textContent = violation.original;
            span.title = highlight.title;
            range.deleteContents();
            range.insertNode(span);
            highlights.push({ highlight: span, element });
          }
        }
      } catch (e) {
        console.warn('Error highlighting violation:', e);
      }
    });
    
    return highlights;
  }

  // Clear all highlights
  static clearHighlights(highlights = []) {
    // Clear tracked highlights
    highlights.forEach(({ highlight }) => {
      try {
        const parent = highlight.parentNode;
        if (parent) {
          parent.replaceChild(document.createTextNode(highlight.textContent), highlight);
          parent.normalize();
        }
      } catch (e) {
        console.warn('Error removing highlight:', e);
      }
    });
    
    // Also remove any remaining highlights
    document.querySelectorAll('.cr-violation').forEach(highlight => {
      try {
        const parent = highlight.parentNode;
        if (parent) {
          parent.replaceChild(document.createTextNode(highlight.textContent), highlight);
          parent.normalize();
        }
      } catch (e) {
        console.warn('Error removing highlight:', e);
      }
    });
  }
}

