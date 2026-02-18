/** Backup type */
export type BackupType = 'full' | 'basic';

/** Manifest application name */
export const MANIFEST_NAME = 'astro-koharu-backup';

/** Manifest file name */
export const MANIFEST_FILENAME = 'manifest.json';

/** Backup file extension */
export const BACKUP_FILE_EXTENSION = '.tar.gz';

/** Temporary backup directory prefix */
export const TEMP_DIR_PREFIX = '.tmp-backup-';

/** Backup item configuration */
export interface BackupItem {
  /** Source path (relative to project root) */
  src: string;
  /** Destination path within backup */
  dest: string;
  /** Display label */
  label: string;
  /** Whether it's required (included in basic mode) */
  required: boolean;
  /** For directory mode, only backup files matching this pattern (e.g., '*.md') */
  pattern?: string;
}

/** List of backup projects */
export const BACKUP_ITEMS: BackupItem[] = [
  { src: 'src/content/blog', dest: 'content/blog', label: 'Blog posts', required: true },
  { src: 'config/site.yaml', dest: 'config/site.yaml', label: 'Site configuration', required: true },
  { src: 'src/pages', dest: 'pages', label: 'Standalone pages', required: true, pattern: '*.md' },
  { src: 'public/img', dest: 'img', label: 'User images', required: true },
  { src: '.env', dest: 'env', label: 'Environment variables', required: true },
  // Additional items for full backup
  { src: 'public/favicon.ico', dest: 'favicon.ico', label: 'Favicon', required: false },
  { src: 'src/assets/lqips.json', dest: 'assets/lqips.json', label: 'LQIP data', required: false },
  { src: 'src/assets/similarities.json', dest: 'assets/similarities.json', label: 'Similarity data', required: false },
  { src: 'src/assets/summaries.json', dest: 'assets/summaries.json', label: 'AI summary data', required: false },
];

/** Restore file mapping (automatically generated from BACKUP_ITEMS: backup path -> project path) */
export const RESTORE_MAP: Record<string, string> = Object.fromEntries(BACKUP_ITEMS.map((item) => [item.dest, item.src]));
