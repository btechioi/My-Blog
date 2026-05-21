import { execSync, spawn } from 'node:child_process';
import { BACKUP_ITEMS } from '../constants/backup';
import { PROJECT_ROOT } from '../constants/paths';
import {
  type CommitInfo,
  GITHUB_REPO,
  type GitStatusInfo,
  MAIN_BRANCH,
  type MergeResult,
  type ReleaseInfo,
  UPSTREAM_REMOTE,
  UPSTREAM_URL,
  type UpdateInfo,
} from '../constants/update';
import { restoreBackup } from './restore-operations';
import { getVersion } from './version';

/**
 * Execute Git command
 */
function git(args: string): string {
  try {
    return execSync(`git ${args}`, {
      cwd: PROJECT_ROOT,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
  } catch (error) {
    if (error instanceof Error && 'stderr' in error) {
      throw new Error((error as { stderr: string }).stderr || error.message);
    }
    throw error;
  }
}

/**
 * Safely execute Git command (does not throw exception)
 */
function gitSafe(args: string): string | null {
  try {
    return git(args);
  } catch {
    return null;
  }
}

function normalizeRemoteUrl(url: string): string {
  const trimmed = url.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('ssh://')) {
    try {
      const parsed = new URL(trimmed);
      return `${parsed.hostname}${parsed.pathname.replace(/\.git$/, '')}`;
    } catch {
      return trimmed.replace(/\.git$/, '');
    }
  }
  const scpMatch = trimmed.match(/^[^@]+@([^:]+):(.+)$/);
  if (scpMatch) {
    return `${scpMatch[1]}${scpMatch[2].replace(/\.git$/, '')}`;
  }
  return trimmed.replace(/\.git$/, '');
}

export interface EnsureUpstreamOptions {
  allowAdd?: boolean;
}

export interface EnsureUpstreamResult {
  existed: boolean;
  success: boolean;
  reason?: 'mismatch' | 'missing' | 'add-failed';
  currentUrl?: string;
}

/**
 * Check Git status
 */
export function checkGitStatus(): GitStatusInfo {
  const currentBranch = git('rev-parse --abbrev-ref HEAD');
  const statusOutput = gitSafe('status --porcelain') || '';
  const uncommittedFiles = statusOutput.split('\n').filter((line) => line.trim().length > 0);

  return {
    currentBranch,
    isClean: uncommittedFiles.length === 0,
    uncommittedCount: uncommittedFiles.length,
    uncommittedFiles: uncommittedFiles.map((line) => line.slice(3)), // Remove status prefix
  };
}

/**
 * Check if upstream remote is configured
 */
export function hasUpstreamRemote(): boolean {
  return Boolean(gitSafe(`remote get-url ${UPSTREAM_REMOTE}`));
}

export function hasUpstreamTrackingRef(): boolean {
  return Boolean(gitSafe(`show-ref --verify refs/remotes/${UPSTREAM_REMOTE}/${MAIN_BRANCH}`));
}

export function getUpstreamRemoteUrl(): string | null {
  return gitSafe(`remote get-url ${UPSTREAM_REMOTE}`);
}

/**
 * Add upstream remote
 */
export function addUpstreamRemote(): boolean {
  try {
    git(`remote add ${UPSTREAM_REMOTE} ${UPSTREAM_URL}`);
    return true;
  } catch {
    return false;
  }
}

/**
 * Ensure upstream remote is configured
 */
export function ensureUpstreamRemote(options: EnsureUpstreamOptions = {}): EnsureUpstreamResult {
  const allowAdd = options.allowAdd ?? true;
  const currentUrl = getUpstreamRemoteUrl();
  if (currentUrl) {
    const expected = normalizeRemoteUrl(UPSTREAM_URL);
    const actual = normalizeRemoteUrl(currentUrl);
    if (expected !== actual) {
      return { existed: true, success: false, reason: 'mismatch', currentUrl };
    }
    return { existed: true, success: true, currentUrl };
  }
  if (!allowAdd) {
    return { existed: false, success: false, reason: 'missing' };
  }
  const success = addUpstreamRemote();
  return success ? { existed: false, success: true } : { existed: false, success: false, reason: 'add-failed' };
}

/**
 * Fetch latest code from upstream
 */
export function fetchUpstream(): boolean {
  try {
    git(`fetch ${UPSTREAM_REMOTE}`);
    return true;
  } catch {
    return false;
  }
}

/**
 * Parse commit info
 */
function parseCommits(output: string): CommitInfo[] {
  if (!output.trim()) return [];

  return output
    .trim()
    .split('\n')
    .filter((line) => line.trim())
    .map((line) => {
      // Format: hash|message|date|author
      const [hash, message, date, author] = line.split('|');
      return { hash, message, date, author };
    });
}

/**
 * Normalize version number to format with v prefix
 */
function normalizeTag(tag: string): string {
  return tag.startsWith('v') ? tag : `v${tag}`;
}

/**
 * Get update info
 * @param targetTag Optional target version tag, updates to upstream/main when not specified
 */
export function getUpdateInfo(targetTag?: string): UpdateInfo {
  const hasUpstream = hasUpstreamRemote();

  if (!hasUpstream) {
    return {
      hasUpstream: false,
      behindCount: 0,
      aheadCount: 0,
      commits: [],
      localCommits: [],
      currentVersion: getVersion(),
      latestVersion: 'unknown',
      isDowngrade: false,
    };
  }

  // Determine target ref: specified tag or upstream/main
  const normalizedTag = targetTag ? normalizeTag(targetTag) : null;
  const targetRef = normalizedTag || `${UPSTREAM_REMOTE}/${MAIN_BRANCH}`;

  // Get ahead/behind counts
  const revList = gitSafe(`rev-list --left-right --count HEAD...${targetRef}`) || '0\t0';
  const [aheadStr, behindStr] = revList.split('\t');
  const aheadCount = Number.parseInt(aheadStr, 10) || 0;
  const behindCount = Number.parseInt(behindStr, 10) || 0;

  // Determine if it is a downgrade operation: tag specified and HEAD is ahead of target (aheadCount > 0, behindCount === 0)
  const isDowngrade = Boolean(normalizedTag && aheadCount > 0 && behindCount === 0);

  // Get commits
  const commitFormat = '%h|%s|%ar|%an';
  let commits: CommitInfo[];

  if (isDowngrade) {
    // Downgrade: get commits that will be removed (commits from target to HEAD)
    const commitsOutput = gitSafe(`log ${targetRef}..HEAD --pretty=format:"${commitFormat}" --no-merges`) || '';
    commits = parseCommits(commitsOutput);
  } else {
    // Upgrade: get new commits (commits from HEAD to target)
    const commitsOutput = gitSafe(`log HEAD..${targetRef} --pretty=format:"${commitFormat}" --no-merges`) || '';
    commits = parseCommits(commitsOutput);
  }

  // Get local commits ahead of target (will be replayed during rebase)
  const localCommitsOutput = gitSafe(`log ${targetRef}..HEAD --pretty=format:"${commitFormat}" --no-merges`) || '';
  const localCommits = parseCommits(localCommitsOutput);

  // Get target version
  let parsedVersion = 'unknown';
  if (normalizedTag) {
    // Use tag name as version (remove v prefix)
    parsedVersion = normalizedTag.replace(/^v/, '');
  } else {
    // Try to get latest version from upstream package.json
    const packageJsonContent = gitSafe(`show ${UPSTREAM_REMOTE}/${MAIN_BRANCH}:package.json`);
    if (packageJsonContent) {
      try {
        const packageJson = JSON.parse(packageJsonContent);
        if (packageJson.version) {
          parsedVersion = packageJson.version;
        }
      } catch {
        // JSON parse failed, keep 'unknown'
      }
    }
  }

  return {
    hasUpstream: true,
    behindCount,
    aheadCount,
    commits,
    localCommits,
    currentVersion: getVersion(),
    latestVersion: parsedVersion,
    isDowngrade,
  };
}

/** Merge operation options */
export interface MergeOptions {
  /** Target version tag (e.g., "v2.1.0"), uses upstream/main when not specified */
  /** Whether it is a downgrade operation, uses checkout + commit to preserve history */
  /** Use rebase mode: replay local commits on top of target reference (rewrite history) */
  /** Use clean mode: replace all theme files, then restore user content from backup */
  clean?: boolean;
}

/**
 * Get target version info for commit message
 */
function getVersionInfo(targetRef: string, normalizedTag: string | null): string {
  if (normalizedTag) return normalizedTag;
  const packageJsonContent = gitSafe(`show ${targetRef}:package.json`);
  if (packageJsonContent) {
    try {
      const packageJson = JSON.parse(packageJsonContent);
      if (packageJson.version) return `v${packageJson.version}`;
    } catch {
      // JSON parse failed
    }
  }
  return 'latest';
}

/**
 * User content path prefix list (obtained from BACKUP_ITEMS required items)
 */
const USER_CONTENT_PREFIXES = BACKUP_ITEMS.filter((item) => item.required).map((item) => item.src);

/**
 * Determine if a file belongs to user content
 */
function isUserContent(filePath: string): boolean {
  return USER_CONTENT_PREFIXES.some((prefix) => filePath === prefix || filePath.startsWith(`${prefix}/`));
}

/**
 * Classify conflict files into user content and theme files
 */
function classifyConflicts(files: string[]): { userFiles: string[]; themeFiles: string[] } {
  const userFiles: string[] = [];
  const themeFiles: string[] = [];
  for (const file of files) {
    if (isUserContent(file)) {
      userFiles.push(file);
    } else {
      themeFiles.push(file);
    }
  }
  return { userFiles, themeFiles };
}

/**
 * Automatically resolve conflicts for user content files using --ours
 * If checkout succeeds but add fails, use checkout -m to restore conflict state
 * @returns List of files that failed to resolve
 */
function autoResolveUserContent(files: string[]): string[] {
  const failed: string[] = [];
  for (const file of files) {
    const checkoutOk = gitSafe(`checkout --ours -- "${file}"`) !== null;
    const addOk = checkoutOk && gitSafe(`add -- "${file}"`) !== null;
    if (!addOk) {
      // When checkout succeeds but add fails, restore conflict markers for manual resolution
      if (checkoutOk) {
        gitSafe(`checkout -m -- "${file}"`);
      }
      failed.push(file);
    }
  }
  return failed;
}

/**
 * Clean mode: remove non-user-content files that were removed upstream
 */
function removeDeletedUpstreamFiles(targetRef: string): void {
  const localFiles = gitSafe('ls-files') || '';
  const upstreamFiles = gitSafe(`ls-tree -r --name-only ${targetRef}`) || '';

  const localSet = new Set(
    localFiles
      .split('\n')
      .map((f) => f.trim())
      .filter(Boolean),
  );
  const upstreamSet = new Set(
    upstreamFiles
      .split('\n')
      .map((f) => f.trim())
      .filter(Boolean),
  );

  const filesToRemove: string[] = [];
  for (const file of localSet) {
    if (!upstreamSet.has(file) && !isUserContent(file)) {
      filesToRemove.push(file);
    }
  }

  if (filesToRemove.length > 0) {
    // Execute git rm in batches to avoid exceeding ARG_MAX limit
    const BATCH_SIZE = 100;
    for (let i = 0; i < filesToRemove.length; i += BATCH_SIZE) {
      const chunk = filesToRemove.slice(i, i + BATCH_SIZE);
      const batch = chunk.map((f) => `'${f.replaceAll("'", "'\\''")}'`).join(' ');
      gitSafe(`rm --quiet -- ${batch}`);
    }
  }
}

/**
 * Clean mode: restore user content from backup and amend to merge commit
 * @param preCleanSha Pre-merge commit SHA, rollback to this state on restore failure
 */
export function cleanRestore(backupPath: string, preCleanSha?: string): string[] {
  try {
    const restored = restoreBackup(backupPath);
    git('add -A');
    git('commit --amend --no-edit');
    return restored;
  } catch (error) {
    // Restore failed, rollback to pre-merge state to protect user data
    if (preCleanSha) {
      gitSafe(`reset --hard ${preCleanSha}`);
    }
    throw error;
  }
}

/**
 * Detect if there is already an upstream merge commit (for first migration prompt)
 *
 * Check the last 20 merge commits to see if any parent is reachable from upstream/main.
 * If yes -> previously had regular merge -> no migration needed.
 * If no -> may have been using squash merge -> migration prompt needed.
 */
export function hasUpstreamMergeHistory(): boolean {
  if (!hasUpstreamTrackingRef()) return false;
  const merges = gitSafe('log --merges --format=%P -20 HEAD');
  if (!merges) return false;
  for (const line of merges.trim().split('\n')) {
    if (!line.trim()) continue;
    const parents = line.trim().split(' ');
    // Skip first parent (this branch), check if subsequent parents are in upstream history
    // Note: merge-base --is-ancestor uses exit code (0=is ancestor, 1=is not)
    // gitSafe returns null on non-zero exit code, so !== null is equivalent to "is ancestor"
    for (const parent of parents.slice(1)) {
      if (gitSafe(`merge-base --is-ancestor ${parent} ${UPSTREAM_REMOTE}/${MAIN_BRANCH}`) !== null) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Execute merge, downgrade, rebase, or clean operations
 *
 * @param options - Merge options
 * @returns Merge result, including success status, conflict info, etc.
 */
export function mergeUpstream(options: MergeOptions = {}): MergeResult {
  const { targetTag, isDowngrade, rebase, clean } = options;
  const normalizedTag = targetTag ? normalizeTag(targetTag) : null;
  const targetRef = normalizedTag || `${UPSTREAM_REMOTE}/${MAIN_BRANCH}`;

  try {
    if (rebase) {
      // Rebase mode: replay local commits on top of target reference
      git(`rebase ${targetRef}`);
    } else if (isDowngrade && normalizedTag) {
      // Downgrade uses checkout + commit to preserve commit history
      git(`checkout ${normalizedTag} -- .`);
      const status = gitSafe('status --porcelain') || '';
      if (status.trim().length > 0) {
        git(`commit -m "Downgrade to ${normalizedTag}"`);
      }
    } else if (clean) {
      // Clean mode: merge -s ours records merge-base, then overwrite with upstream files
      // Save pre-merge SHA for rollback on restore failure
      const preCleanSha = git('rev-parse HEAD');
      const versionInfo = getVersionInfo(targetRef, normalizedTag);
      git(`merge -s ours --no-ff --allow-unrelated-histories ${targetRef} -m "chore: clean update to ${versionInfo}"`);
      git(`checkout ${targetRef} -- .`);
      removeDeletedUpstreamFiles(targetRef);
      // Stage the overwritten file state (user content will be restored in clean-restoring phase)
      git('add -A');
      git('commit --amend --no-edit');
      return {
        success: true,
        hasConflict: false,
        conflictFiles: [],
        preCleanSha,
      };
    } else {
      // Default to regular merge to preserve merge-base info
      const versionInfo = getVersionInfo(targetRef, normalizedTag);
      git(`merge --no-ff --allow-unrelated-histories ${targetRef} -m "chore: merge upstream theme ${versionInfo}"`);
    }
    return {
      success: true,
      hasConflict: false,
      conflictFiles: [],
    };
  } catch (error) {
    // Downgrade may produce conflicts
    if (isDowngrade) {
      return {
        success: false,
        hasConflict: false,
        conflictFiles: [],
        error: error instanceof Error ? error.message : String(error),
      };
    }

    const conflictFiles = getConflictFiles();

    if (conflictFiles.length > 0) {
      // Smart handling during regular merge conflicts: automatically resolve user content conflicts
      if (!rebase && !clean) {
        const { userFiles, themeFiles } = classifyConflicts(conflictFiles);
        if (userFiles.length > 0) {
          const failedFiles = autoResolveUserContent(userFiles);
          // User files that failed to resolve are treated as theme file conflicts, requiring manual handling
          if (failedFiles.length > 0) {
            themeFiles.push(...failedFiles);
          }
        }
        const resolvedFiles = userFiles.filter((f) => !themeFiles.includes(f));
        // If only user content conflicts exist and all are automatically resolved, auto-complete the merge
        if (themeFiles.length === 0) {
          try {
            git('commit --no-edit');
            return {
              success: true,
              hasConflict: false,
              conflictFiles: [],
              autoResolvedFiles: resolvedFiles,
            };
          } catch {
            // Commit failed, still returning conflict
          }
        }
        // There are still theme file conflicts, requiring manual resolution
        return {
          success: false,
          hasConflict: true,
          conflictFiles: themeFiles,
          autoResolvedFiles: resolvedFiles.length > 0 ? resolvedFiles : undefined,
        };
      }

      return {
        success: false,
        hasConflict: true,
        conflictFiles,
        isRebaseConflict: rebase,
      };
    }

    return {
      success: false,
      hasConflict: false,
      conflictFiles: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function getConflictFiles(): string[] {
  const diffOutput = gitSafe('diff --name-only --diff-filter=U') || '';
  const diffFiles = diffOutput
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (diffFiles.length > 0) {
    return Array.from(new Set(diffFiles));
  }

  const statusOutput = gitSafe('status --porcelain') || '';
  const statusFiles = statusOutput
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .filter((line) => {
      const status = line.slice(0, 2);
      return status.includes('U') || status === 'AA' || status === 'DD';
    })
    .map((line) => line.slice(3));

  return Array.from(new Set(statusFiles));
}

/**
 * Abort merge
 */
export function abortMerge(): boolean {
  try {
    git('merge --abort');
    return true;
  } catch {
    return false;
  }
}

/**
 * Abort rebase
 */
export function abortRebase(): boolean {
  try {
    git('rebase --abort');
    return true;
  } catch {
    return false;
  }
}

/**
 * Install dependencies (async)
 */
export function installDeps(onOutput?: (data: string) => void): Promise<{ success: boolean; error?: string }> {
  return new Promise((resolve) => {
    const child = spawn('pnpm', ['install'], {
      cwd: PROJECT_ROOT,
      shell: true,
    });

    let stderr = '';

    child.stdout?.on('data', (data) => {
      onOutput?.(data.toString());
    });

    child.stderr?.on('data', (data) => {
      stderr += data.toString();
      onOutput?.(data.toString());
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true });
      } else {
        resolve({ success: false, error: stderr || `Exit code: ${code}` });
      }
    });

    child.on('error', (err) => {
      resolve({ success: false, error: err.message });
    });
  });
}

/**
 * Check if tag exists in upstream remote
 */
export function tagExists(tag: string): boolean {
  const normalizedTag = normalizeTag(tag);
  return Boolean(gitSafe(`show-ref --verify refs/tags/${normalizedTag}`));
}

/**
 * Get list of recent tags
 */
export function listRecentTags(limit = 5): string[] {
  const output = gitSafe('tag --sort=-creatordate --list "v*"') || '';
  return output
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .slice(0, limit);
}

/**
 * Fetch Release info from GitHub API
 */
export async function fetchReleaseInfo(version: string): Promise<ReleaseInfo | null> {
  const tag = normalizeTag(version);
  const url = `https://api.github.com/repos/${GITHUB_REPO}/releases/tags/${tag}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'astro-koharu-cli',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return {
      tagName: data.tag_name,
      url: data.html_url,
      body: data.body || null,
    };
  } catch {
    clearTimeout(timeoutId);
    return null;
  }
}

/**
 * Build Release page URL (does not depend on API)
 */
export function buildReleaseUrl(version: string): string {
  const tag = normalizeTag(version);
  return `https://github.com/${GITHUB_REPO}/releases/tag/${tag}`;
}

/**
 * Extract summary from Release body
 */
export function extractReleaseSummary(body: string | null, maxLines = 5, maxChars = 300): string[] {
  if (!body) return [];

  const lines = body
    .split('\n')
    .map((line) => line.trim())
    // Remove Markdown heading markers
    .map((line) => line.replace(/^#{1,6}\s*/, ''))
    // Filter empty lines and pure heading lines
    .filter((line) => line.length > 0);

  const result: string[] = [];
  let totalChars = 0;

  for (const line of lines) {
    if (result.length >= maxLines || totalChars >= maxChars) break;
    result.push(line);
    totalChars += line.length;
  }

  // If truncated, add an ellipsis hint
  if (result.length < lines.length) {
    result.push('...');
  }

  return result;
}
