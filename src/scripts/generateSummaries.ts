/**
 * Generate AI summaries for blog posts using Google Gemini
 */

import 'dotenv/config.js';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { GoogleGenAI } from '@google/genai';
import chalk from 'chalk';
import { glob } from 'glob';
import matter from 'gray-matter';
import { remark } from 'remark';
import strip from 'strip-markdown';

// --------- Configuration ---------
const CONTENT_GLOB = 'src/content/blog/**/*.md';
const CACHE_FILE = '.cache/summaries-cache.json';
const OUTPUT_FILE = 'src/assets/summaries.json';
const CACHE_VERSION = '1';

// Gemini API settings
const API_KEY = process.env.GEMINI_API_KEY || '';
const DEFAULT_MODEL = 'gemini-2.5-flash';

// Rate limiting: 5 requests per minute
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60_000;
const requestQueue: Array<() => void> = [];
let requestCount = 0;
let windowStart = Date.now();

function resetWindow() {
  windowStart = Date.now();
  requestCount = 0;
}

function waitForRateLimit(): Promise<void> {
  return new Promise((resolve) => {
    requestQueue.push(resolve);
    processQueue();
  });
}

function processQueue() {
  const now = Date.now();
  if (now - windowStart >= RATE_WINDOW_MS) {
    resetWindow();
  }

  while (requestQueue.length > 0 && requestCount < RATE_LIMIT) {
    const resolve = requestQueue.shift();
    if (!resolve) break;
    requestCount++;
    resolve();
  }

  if (requestQueue.length > 0) {
    const waitTime = RATE_WINDOW_MS - (Date.now() - windowStart);
    setTimeout(processQueue, Math.max(0, waitTime + 100));
  }
}

// --------- Parse CLI Arguments ---------
function parseArgs(): { model: string; force: boolean } {
  const args = process.argv.slice(2);
  let model = DEFAULT_MODEL;
  let force = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--model' && args[i + 1]) {
      model = args[i + 1];
      i++;
    } else if (args[i] === '--force') {
      force = true;
    }
  }

  return { model, force };
}

// --------- Type Definitions ---------
interface PostData {
  slug: string;
  title: string;
  text: string;
  hash: string;
}

interface CacheEntry {
  hash: string;
  title: string;
  summary: string;
  generatedAt: string;
}

interface SummariesCache {
  version: string;
  model: string;
  entries: Record<string, CacheEntry>;
}

interface SummaryOutput {
  title: string;
  summary: string;
}

// --------- Utility Functions ---------

function computeHash(content: string): string {
  return crypto.createHash('md5').update(content).digest('hex');
}

async function loadCache(): Promise<SummariesCache | null> {
  try {
    const data = await fs.readFile(CACHE_FILE, 'utf-8');
    return JSON.parse(data) as SummariesCache;
  } catch {
    return null;
  }
}

async function saveCache(cache: SummariesCache): Promise<void> {
  const dir = path.dirname(CACHE_FILE);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(CACHE_FILE, JSON.stringify(cache, null, 2));
}

function isCacheValid(cache: SummariesCache, model: string): boolean {
  return cache.version === CACHE_VERSION && cache.model === model;
}

async function getPlainText(markdown: string): Promise<string> {
  const result = await remark().use(strip).process(markdown);
  return String(result)
    .replace(/^import\s+.*$/gm, '')
    .replace(/^export\s+.*$/gm, '')
    .replace(/^\s*(TLDR|Introduction|Conclusion|Summary|References?|Footnotes?)\s*$/gim, '')
    .replace(/^[A-Z\s]{4,}$/gm, '')
    .replace(/^\|.*\|$/gm, '')
    .replace(/^:::.*/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function extractSlug(filePath: string, link?: string): string {
  if (link) return link.toLowerCase();
  const relativePath = filePath.replace(/^src\/content\/blog\//, '').replace(/\.md$/, '');
  return relativePath.toLowerCase();
}

// --------- LLM API ---------

const ai = new GoogleGenAI({ apiKey: API_KEY });

async function checkApiRunning(): Promise<boolean> {
  if (!API_KEY) return false;
  try {
    await ai.models.list();
    return true;
  } catch {
    return false;
  }
}

async function generateSummary(text: string, model: string, retries = 5): Promise<string> {
  await waitForRateLimit();

  const truncatedText = text.slice(0, 8000);
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `Summarize the following article in 2-3 concise English sentences. Focus on the core message. Output only the summary:\n\n${truncatedText}`,
              },
            ],
          },
        ],
        config: {
          systemInstruction: 'You are a professional blog editor. Write concise, informative summaries.',
          temperature: 0.3,
          maxOutputTokens: 250,
        },
      });

      const summary = response.text;
      if (!summary) {
        throw new Error('No summary received from Gemini');
      }
      return summary.trim();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < retries) {
        console.log(chalk.gray(`    Retry ${attempt}/${retries - 1}...`));
        await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
      }
    }
  }

  throw lastError || new Error('Failed to generate summary after retries');
}

// --------- File Processing ---------

async function processFile(filePath: string): Promise<PostData | null> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const { data: frontmatter, content: body } = matter(content);
    if (frontmatter.draft) return null;
    if (!frontmatter.title) return null;
    if (frontmatter.excludeFromSummary === true) return null;

    const slug = extractSlug(filePath, frontmatter.link as string | undefined);
    const plainText = await getPlainText(body);
    const hash = computeHash(content);

    return { slug, title: frontmatter.title as string, text: plainText, hash };
  } catch (error) {
    console.error(chalk.red(`  Error processing ${filePath}:`), error);
    return null;
  }
}

async function loadPosts(files: string[]): Promise<PostData[]> {
  console.log(chalk.blue('Processing markdown files...'));
  const posts: PostData[] = [];
  for (let i = 0; i < files.length; i++) {
    process.stdout.write(`\r  Processing ${i + 1}/${files.length}...`);
    const post = await processFile(files[i]);
    if (post) posts.push(post);
  }
  console.log('');
  return posts;
}

// --------- Main Execution ---------

async function main() {
  const { model, force } = parseArgs();

  try {
    console.log(chalk.cyan('=== Gemini Summary Generator ===\n'));

    if (!API_KEY) {
      console.log(chalk.red('Error: GEMINI_API_KEY is missing from .env file.'));
      process.exit(1);
    }

    console.log(chalk.gray(`Model: ${model}`));
    console.log(chalk.gray(`Rate limit: ${RATE_LIMIT} requests/minute\n`));

    // Check API
    const apiRunning = await checkApiRunning();
    if (!apiRunning) {
      console.log(chalk.red('Error: Could not connect to Gemini API. Check your internet or API key.'));
      process.exit(1);
    }

    let cache = force ? null : await loadCache();
    if (cache && !isCacheValid(cache, model)) {
      console.log(chalk.yellow('Cache invalidated (model changed), regenerating all...\n'));
      cache = null;
    }

    const files = await glob(CONTENT_GLOB);
    if (!files.length) return console.log(chalk.yellow('No content files found.'));

    const posts = await loadPosts(files);
    const validCache = cache?.entries || {};
    const newEntries: Record<string, CacheEntry> = {};
    let cached = 0,
      generated = 0,
      errors = 0;

    console.log(chalk.blue('Generating summaries...'));

    for (let i = 0; i < posts.length; i++) {
      const post = posts[i];
      const cachedEntry = validCache[post.slug];

      if (cachedEntry && cachedEntry.hash === post.hash) {
        newEntries[post.slug] = cachedEntry;
        cached++;
        process.stdout.write(`\r  [${i + 1}/${posts.length}] ${chalk.gray('cached')}: ${post.slug.slice(0, 30)}...`);
      } else {
        process.stdout.write(`\r  [${i + 1}/${posts.length}] ${chalk.yellow('generating')}: ${post.slug.slice(0, 30)}...`);
        try {
          const summary = await generateSummary(post.text, model);
          newEntries[post.slug] = {
            hash: post.hash,
            title: post.title,
            summary,
            generatedAt: new Date().toISOString(),
          };
          generated++;
        } catch (_error) {
          console.error(chalk.red(`\n  Failed: ${post.slug}`));
          errors++;
          if (cachedEntry) newEntries[post.slug] = cachedEntry;
        }
      }
    }

    console.log(`\n\n${chalk.green('Done!')} Cached: ${cached}, Generated: ${generated}, Errors: ${errors}`);

    // Save outputs
    await saveCache({ version: CACHE_VERSION, model, entries: newEntries });

    const output: Record<string, SummaryOutput> = {};
    for (const [slug, entry] of Object.entries(newEntries)) {
      output[slug] = { title: entry.title, summary: entry.summary };
    }

    await fs.mkdir(path.dirname(OUTPUT_FILE), { recursive: true });
    await fs.writeFile(OUTPUT_FILE, JSON.stringify(output, null, 2));

    console.log(chalk.cyan(`Output saved to: ${OUTPUT_FILE}`));
  } catch (error) {
    console.error(chalk.red('\nFatal Error:'), error);
    process.exit(1);
  }
}

main();
