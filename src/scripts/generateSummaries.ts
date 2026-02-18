/**
 * Generate AI summaries for blog posts using Google Gemini
 */

import 'dotenv/config.js';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { generateText } from '@xsai/generate-text';
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

// Gemini API settings via OpenAI-compatible endpoint
const API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/openai/';
const API_KEY = process.env.GEMINI_API_KEY || '';
const DEFAULT_MODEL = 'gemini-1.5-flash';

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

async function checkApiRunning(): Promise<boolean> {
  // If we have an API key, we assume the cloud endpoint is up
  if (API_KEY && API_BASE_URL.includes('googleapis.com')) return true;

  try {
    const response = await fetch(`${API_BASE_URL}models`);
    return response.ok;
  } catch {
    return false;
  }
}

async function generateSummary(text: string, model: string): Promise<string> {
  const truncatedText = text.slice(0, 8000); // Gemini has a large context, but let's keep it tidy

  const { text: summary } = await generateText({
    apiKey: API_KEY,
    baseURL: API_BASE_URL,
    model,
    messages: [
      {
        role: 'system',
        content:
          'You are a professional blog editor. Summarize the following article in English using 2-3 concise sentences. Focus on the core message. Output only the summary without any prefix or commentary.',
      },
      {
        role: 'user',
        content: `Summarize the following article:\n\n${truncatedText}`,
      },
    ],
    temperature: 0.3,
    maxTokens: 250,
  });

  if (!summary) {
    throw new Error('No summary received from Gemini');
  }
  return summary.trim();
}

// --------- File Processing (Same as original) ---------

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
  const startTime = Date.now();
  const { model, force } = parseArgs();

  try {
    console.log(chalk.cyan('=== Gemini Summary Generator (English) ===\n'));

    if (!API_KEY) {
      console.log(chalk.red('Error: GEMINI_API_KEY is missing from .env file.'));
      process.exit(1);
    }

    console.log(chalk.gray(`Model: ${model}`));

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

    console.log(chalk.blue('Generating English summaries...'));

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
        } catch (error) {
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
