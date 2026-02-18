/** Upstream remote repository name */
export const UPSTREAM_REMOTE = 'upstream';

/** Upstream repository URL */
export const UPSTREAM_URL = 'https://github.com/cosZone/astro-koharu.git';

/** GitHub repository path (for API calls) */
export const GITHUB_REPO = 'cosZone/astro-koharu';

/** Main branch name */
export const MAIN_BRANCH = 'main';

/** Commit information */
export interface CommitInfo {
  hash: string;
  message: string;
  date: string;
  author: string;
}

/** Git status information */
export interface GitStatusInfo {
  /** Current branch */
  currentBranch: string;
  /** Whether the working directory is clean */
  isClean: boolean;
  /** Number of uncommitted files */
  uncommittedCount: number;
  /** List of unstaged files */
  uncommittedFiles: string[];
}

/** Update status information */
export interface UpdateInfo {
  /** Whether upstream is configured */
  hasUpstream: boolean;
  /** Number of commits behind upstream */
  behindCount: number;
  /** Number of commits ahead of upstream */
  aheadCount: number;
  /** New commit list (new commits when upgrading, commits to be removed when downgrading) */
  commits: CommitInfo[];
  /** List of local ahead commits (commits to be rebased) */
  localCommits: CommitInfo[];
  /** Current version */
  currentVersion: string;
  /** Latest version (or target version) */
  latestVersion: string;
  /** Whether it is a downgrade operation */
  isDowngrade: boolean;
}

/** Merge result */
export interface MergeResult {
  success: boolean;
  /** Whether there are conflicts */
  hasConflict: boolean;
  /** List of conflict files */
  conflictFiles: string[];
  /** Error message */
  error?: string;
  /** Whether it is a rebase conflict */
  isRebaseConflict?: boolean;
  /** User content conflict files that were automatically resolved */
  autoResolvedFiles?: string[];
  /** Commit SHA before clean mode merge (for rollback if restore fails) */
  preCleanSha?: string;
}

/** GitHub Release information */
export interface ReleaseInfo {
  /** Tag name, e.g., "v2.2.0" */
  tagName: string;
  /** Release page URL */
  url: string;
  /** Release Notes (Markdown) */
  body: string | null;
}

// ============ State Machine Types ============

/** Update process status */
export type UpdateStatus =
  | 'checking' // Check Git status
  | 'dirty-warning' // Uncommitted changes in working directory
  | 'backup-confirm' // Confirm backup
  | 'backing-up' // Backing up
  | 'fetching' // Fetching updates
  | 'preview' // Show update preview
  | 'merging' // Merging
  | 'clean-restoring' // Clean mode restoring user content
  | 'installing' // Installing dependencies
  | 'done' // Done
  | 'conflict' // Conflicts
  | 'up-to-date' // Up to date
  | 'error'; // Error

/** Update process configuration options */
export interface UpdateOptions {
  checkOnly: boolean;
  skipBackup: boolean;
  force: boolean;
  /** Specify the target version tag to update to (e.g., "v2.1.0" or "2.1.0") */
  targetTag?: string;
  /** Use rebase mode (rewrite history) */
  rebase: boolean;
  /** Preview operation (no actual execution) */
  dryRun: boolean;
  /** Use clean mode (replace all theme files, restore user content) */
  clean: boolean;
}

/** State Machine State */
export interface UpdateState {
  status: UpdateStatus;
  gitStatus: GitStatusInfo | null;
  updateInfo: UpdateInfo | null;
  mergeResult: MergeResult | null;
  backupFile: string;
  error: string;
  /** Warning message for non-main branch */
  branchWarning: string;
  options: UpdateOptions;
  /** Flag for first-time migration from squash merge to regular merge */
  needsMigration: boolean;
  /** List of restored file paths in clean mode */
  restoredFiles: string[];
}

/** State Machine Action */
export type UpdateAction =
  | { type: 'GIT_CHECKED'; payload: GitStatusInfo }
  | { type: 'FETCHED'; payload: UpdateInfo; needsMigration?: boolean }
  | { type: 'BACKUP_CONFIRM' }
  | { type: 'BACKUP_SKIP' }
  | { type: 'BACKUP_DONE'; backupFile: string }
  | { type: 'UPDATE_CONFIRM' }
  | { type: 'MERGED'; payload: MergeResult }
  | { type: 'CLEAN_RESTORED'; restoredFiles: string[] }
  | { type: 'INSTALLED' }
  | { type: 'ERROR'; error: string };
