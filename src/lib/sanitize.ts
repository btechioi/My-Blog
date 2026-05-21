import sanitizeHtml from 'sanitize-html';

export const getSanitizeHtml = (html: string) => {
  return sanitizeHtml(html, {
    // https://stackoverflow.com/questions/12229572/php-generated-xml-shows-invalid-char-value-27-message
    textFilter: (text) =>
      text.replace(
        // biome-ignore lint/suspicious/noControlCharactersInRegex: Intentional - filtering invalid XML characters
        /[^\x09\x0A\x0D\x20-\xFF\x85\xA0-\uD7FF\uE000-\uFDCF\uFDE0-\uFFFD]/gm,
        '',
      ),
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img']),
  });
};

/**
 * Extract plain text from Markdown content for OG description generation
 * @param content Markdown content string
 * @param maxLength maximum length, default 150 characters
 * @returns extracted plain text
 */
export const extractTextFromMarkdown = (content: string, maxLength: number = 150): string => {
  if (!content) return '';

  let idx = 0;
  const len = content.length;

  // Skip YAML front matter (avoid startsWith and multiple indexOf)
  if (content.charCodeAt(0) === 45 && content.charCodeAt(1) === 45 && content.charCodeAt(2) === 45) {
    // '---'
    idx = 4; // Skip the first '---\n'
    // Find closing '---'
    while (idx < len - 3) {
      if (
        content.charCodeAt(idx) === 10 && // '\n'
        content.charCodeAt(idx + 1) === 45 && // '-'
        content.charCodeAt(idx + 2) === 45 && // '-'
        content.charCodeAt(idx + 3) === 45
      ) {
        // '-'
        idx += 4;
        break;
      }
      idx++;
    }
  }

  // Pre-compute search boundary (avoid processing entire document)
  const searchEnd = Math.min(idx + maxLength * 5, len);

  let result = '';
  let resultLen = 0;
  const targetLen = maxLength + 50;

  let lineStart = idx;
  let inCodeBlock = false;

  // Scan character by character (avoid split creating arrays)
  while (idx < searchEnd && resultLen < targetLen) {
    const char = content.charCodeAt(idx);

    // Detect newline
    if (char === 10) {
      // '\n'
      if (idx > lineStart) {
        const line = content.slice(lineStart, idx).trim();

        if (line.length > 0) {
          // Detect code block toggle (avoid startsWith)
          if (line.charCodeAt(0) === 96 && line.charCodeAt(1) === 96 && line.charCodeAt(2) === 96) {
            // '```'
            inCodeBlock = !inCodeBlock;
          } else if (!inCodeBlock) {
            // Skip tables and containers (char code comparison is faster than string)
            const firstChar = line.charCodeAt(0);
            if (firstChar !== 124 && firstChar !== 58) {
              // '|' ':' (:::)
              const processed = processLine(line);
              if (processed.length >= 3) {
                if (resultLen > 0) result += ' ';
                result += processed;
                resultLen += processed.length + 1;
              }
            }
          }
        }
      }
      lineStart = idx + 1;
    }
    idx++;
  }

  // Process the last line
  if (lineStart < searchEnd && resultLen < targetLen && !inCodeBlock) {
    const line = content.slice(lineStart, Math.min(lineStart + 200, searchEnd)).trim();
    if (line.length >= 3) {
      const processed = processLine(line);
      if (processed.length >= 3) {
        if (resultLen > 0) result += ' ';
        result += processed;
      }
    }
  }

  // Smart truncation (avoid lastIndexOf)
  if (result.length > maxLength) {
    let cutIdx = maxLength;
    const minCut = Math.floor(maxLength * 0.8);
    // Look forward for space
    while (cutIdx > minCut && result.charCodeAt(cutIdx) !== 32) cutIdx--;
    result = `${result.slice(0, cutIdx)}...`;
  }

  return result;
};

/**
 * Process a single line of markdown text
 */
function processLine(line: string): string {
  let start = 0;
  const len = line.length;

  // Skip line start markers
  const firstChar = line.charCodeAt(0);

  // '#' heading
  if (firstChar === 35) {
    while (start < len && line.charCodeAt(start) === 35) start++;
    while (start < len && line.charCodeAt(start) === 32) start++; // space
  }
  // '- * +' list
  else if (firstChar === 45 || firstChar === 42 || firstChar === 43) {
    start = 1;
    while (start < len && line.charCodeAt(start) === 32) start++;
  }
  // '>' blockquote
  else if (firstChar === 62) {
    start = 1;
    while (start < len && line.charCodeAt(start) === 32) start++;
  }
  // Numbered list '1. 2. '
  else if (firstChar >= 48 && firstChar <= 57) {
    while (start < len && line.charCodeAt(start) >= 48 && line.charCodeAt(start) <= 57) start++;
    if (start < len && line.charCodeAt(start) === 46) start++; // '.'
    while (start < len && line.charCodeAt(start) === 32) start++;
  }

  if (start > 0) line = line.slice(start);

  // Only use regex when needed - use indexOf to avoid full scan
  let hasSpecialChars = false;
  for (let i = 0; i < line.length; i++) {
    const code = line.charCodeAt(i);
    // Check for [ ` * _ ~ <
    if (code === 91 || code === 96 || code === 42 || code === 95 || code === 126 || code === 60) {
      hasSpecialChars = true;
      break;
    }
  }

  if (hasSpecialChars) {
    // Remove links/images ![text](url) or [text](url)
    if (line.indexOf('[') >= 0) {
      line = line.replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1');
    }

    // Remove inline code `code`
    if (line.indexOf('`') >= 0) {
      line = line.replace(/`[^`]*`/g, '');
    }

    // Remove formatting **bold** *italic* __bold__ _italic_
    if (line.indexOf('*') >= 0 || line.indexOf('_') >= 0) {
      line = line.replace(/[*_]{1,2}([^*_]+)[*_]{1,2}/g, '$1');
    }

    // Remove HTML <tag>
    if (line.indexOf('<') >= 0) {
      line = line.replace(/<[^>]*>/g, '');
    }
  }

  return line.trim();
}
