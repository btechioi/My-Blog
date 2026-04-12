/**
 * Slug Generation Utility
 *
 * Generates URL-friendly slugs from titles containing mixed languages.
 * Handles Chinese characters (via pinyin) and preserves grouped ASCII characters.
 */

import { pinyin } from 'pinyin-pro';

/**
 * Generate a URL-friendly slug from a title.
 * Converts non-ASCII characters to hyphens, keeps ASCII characters grouped.
 *
 * @example
 * generateSlug('test123')           // 'test123'
 * generateSlug('Hello World')       // 'hello-world'
 * generateSlug('React 学习笔记')     // 'react-xue-xi-bi-ji'
 * generateSlug('测试文章标题')       // 'ce-shi-wen-zhang-biao-ti'
 */
export function generateSlug(title: string): string {
  const tokens: string[] = [];
  let latinBuffer = '';

  const isAsciiWordChar = (char: string) => /[A-Za-z0-9]/.test(char);
  const isCjkChar = (char: string) => /[\u4e00-\u9fff]/.test(char);

  const flushLatin = () => {
    if (!latinBuffer) return;
    tokens.push(latinBuffer);
    latinBuffer = '';
  };

  for (const char of title) {
    if (isAsciiWordChar(char)) {
      latinBuffer += char;
      continue;
    }

    flushLatin();

    if (isCjkChar(char)) {
      const result = pinyin(char, {
        toneType: 'none',
        type: 'array',
        v: true,
      });
      const value = Array.isArray(result) ? result[0] : result;
      if (value) tokens.push(value);
    }
  }

  flushLatin();

  return tokens
    .join('-')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}
