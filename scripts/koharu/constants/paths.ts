import path from 'node:path';

/** Project root directory */
export const PROJECT_ROOT = path.resolve(import.meta.dirname, '../../..');

/** Backup storage directory */
export const BACKUP_DIR = path.join(PROJECT_ROOT, 'backups');

/** Site configuration file path */
export const SITE_CONFIG_PATH = path.join(PROJECT_ROOT, 'config/site.yaml');

/** Blog content directory path */
export const BLOG_CONTENT_PATH = path.join(PROJECT_ROOT, 'src/content/blog');
