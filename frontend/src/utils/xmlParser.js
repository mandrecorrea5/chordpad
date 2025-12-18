/**
 * Parses XML-like string format into structured sections
 * @param {string} xmlString - The XML-like string with sections
 * @returns {Array} Array of section objects with type, bpm, bars, and content
 */
export function parseSongXML(xmlString) {
  const sections = [];
  
  // Regex to match sections: <type bpm="value" bars="value">content</type>
  const sectionRegex = /<(\w+)\s+bpm="(\d+)"\s+bars="(\d+)"\s*>([\s\S]*?)<\/\1>/g;
  
  let match;
  while ((match = sectionRegex.exec(xmlString)) !== null) {
    const [, type, bpm, bars, content] = match;
    sections.push({
      type,
      bpm: parseInt(bpm, 10),
      bars: parseInt(bars, 10),
      content: content.trim(),
      // Calculate duration in milliseconds
      // Formula: (bars * 4 beats/bar) * (60 seconds/minute / bpm) * 1000 ms/second
      duration: (parseInt(bars, 10) * 4 * (60 / parseInt(bpm, 10)) * 1000)
    });
  }
  
  return sections;
}

/**
 * Formats content with chord notation for display
 * @param {string} content - Raw content with chord notation like [G] [D]
 * @returns {Array} Array of objects with text and chords
 */
export function formatContentWithChords(content) {
  const lines = content.split('\n').filter(line => line.trim());
  return lines.map(line => {
    // Extract chords and text
    const chordRegex = /\[([^\]]+)\]/g;
    const parts = [];
    let lastIndex = 0;
    let match;
    
    while ((match = chordRegex.exec(line)) !== null) {
      // Add text before chord
      if (match.index > lastIndex) {
        parts.push({
          type: 'text',
          content: line.substring(lastIndex, match.index)
        });
      }
      // Add chord
      parts.push({
        type: 'chord',
        content: match[1]
      });
      lastIndex = match.index + match[0].length;
    }
    
    // Add remaining text
    if (lastIndex < line.length) {
      parts.push({
        type: 'text',
        content: line.substring(lastIndex)
      });
    }
    
    return parts.length > 0 ? parts : [{ type: 'text', content: line }];
  });
}

