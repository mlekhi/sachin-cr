// Violation detection patterns and rules
class ViolationDetector {
  // Pattern-based detection for explicitly forbidden words
  static analyzeText(text) {
    const violations = [];
    
    // Forbidden words/phrases (case-insensitive)
    const forbiddenWords = [
      'revolutionary', 'revolutionized', 'renowned',
      'seamless', 'seamlessly',
      'leverage', 'leveraging',
      'comprehensive',
      'exponential', 'exponentially',
      'boasts', 'boasting',
      'impressive',
      'all-in-one', 'all in one',
      'end-to-end', 'end to end',
      'well-positioned to capitalize on',
      'poised',
      'at the intersection of',
      'is positioned',
      'achieving unicorn status', 'becoming a unicorn'
    ];

    // Check for forbidden words
    forbiddenWords.forEach(word => {
      const regex = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
      let match;
      while ((match = regex.exec(text)) !== null) {
        violations.push({
          start: match.index,
          end: match.index + match[0].length,
          original: match[0],
          type: 'forbidden',
          message: `Avoid using "${match[0]}" - it's overly promotional or vague`,
          suggestion: 'Remove or replace with more precise language'
        });
      }
    });

    // Check for "they" referring to company (should be "it")
    const theyRegex = /\b(they|their|them)\s+(is|are|has|have|was|were|does|do|did|will|can|could|should|would)\b/gi;
    let match;
    while ((match = theyRegex.exec(text)) !== null) {
      violations.push({
        start: match.index,
        end: match.index + match[0].length,
        original: match[0],
        type: 'pronoun',
        message: 'Use "it" instead of "they" when referring to a company',
        suggestion: match[0].replace(/\b(they|their|them)\b/gi, (m) => {
          if (m.toLowerCase() === 'they') return 'it';
          if (m.toLowerCase() === 'their') return 'its';
          if (m.toLowerCase() === 'them') return 'it';
          return m;
        })
      });
    }

    // Check for first person
    const firstPersonRegex = /\b(I|you|our take is|we think|we believe)\b/gi;
    while ((match = firstPersonRegex.exec(text)) !== null) {
      violations.push({
        start: match.index,
        end: match.index + match[0].length,
        original: match[0],
        type: 'first',
        message: 'Avoid first person - write in third person',
        suggestion: 'Rewrite in third person'
      });
    }

    // Check for filler words
    const fillerWords = [
      { word: 'ultimately', suggestion: 'Remove if unnecessary' },
      { word: 'very', suggestion: 'Remove or use more precise language' },
      { word: 'so', suggestion: 'Remove if unnecessary' },
      { word: 'hence', suggestion: 'Use "therefore" or remove' },
      { word: 'thus', suggestion: 'Use "therefore" or remove' }
    ];

    fillerWords.forEach(({ word, suggestion }) => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      let match;
      while ((match = regex.exec(text)) !== null) {
        violations.push({
          start: match.index,
          end: match.index + match[0].length,
          original: match[0],
          type: 'filler',
          message: `Consider removing "${match[0]}" - it may be unnecessary filler`,
          suggestion: suggestion
        });
      }
    });

    // Check for passive voice patterns
    const passivePatterns = [
      { pattern: /\bhas been\b/gi, suggestion: 'Use active voice instead' },
      { pattern: /\bhas shown\b/gi, suggestion: 'Use "shows" or active voice' },
      { pattern: /\bhas seen\b/gi, suggestion: 'Use active voice instead' },
      { pattern: /\bthat included\b/gi, suggestion: 'Use "including" instead' },
      { pattern: /\bthat plays\b/gi, suggestion: 'Use "playing" instead' },
      { pattern: /\bas well as\b/gi, suggestion: 'Use "and" or restructure sentence' }
    ];

    passivePatterns.forEach(({ pattern, suggestion }) => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        violations.push({
          start: match.index,
          end: match.index + match[0].length,
          original: match[0],
          type: 'passive',
          message: 'Avoid passive voice - use active voice for stronger writing',
          suggestion: suggestion
        });
      }
    });

    return violations;
  }
}

