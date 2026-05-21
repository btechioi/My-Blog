import fs from 'node:fs';
import path from 'node:path';

import { BACKUP_DIR, BACKUP_FILE_EXTENSION } from '../constants';

/**
 * Verify path is within the specified directory (prevent path traversal attacks)
 * @param targetPath Target path
 * @param allowedDir Allowed directory
 * @returns Whether it is within the allowed directory
 */
export function isPathWithinDir(targetPath: string, allowedDir: string): boolean {
  const resolvedTarget = path.resolve(targetPath);
  const resolvedDir = path.resolve(allowedDir);
  return resolvedTarget.startsWith(`${resolvedDir}${path.sep}`) || resolvedTarget === resolvedDir;
}

/**
 * Verify path is within backup directory
 */
export function isPathWithinBackupDir(targetPath: string): boolean {
  return isPathWithinDir(targetPath, BACKUP_DIR);
}

/**
 * Verify if it is a valid backup file
 * @param filePath File path
 * @returns Whether valid
 */
export function isValidBackupFile(filePath: string): boolean {
  // Check extension
  if (!filePath.endsWith(BACKUP_FILE_EXTENSION)) {
    return false;
  }

  // Check if file exists
  if (!fs.existsSync(filePath)) {
    return false;
  }

  // Check if it is a file (not a directory)
  try {
    const stats = fs.statSync(filePath);
    return stats.isFile();
  } catch {
    return false;
  }
}

/**
 * Validate and normalize backup file path
 * @param filePath File path
 * @throws Error If path is invalid
 * @returns Normalized path
 */
export function validateBackupFilePath(filePath: string): string {
  const resolved = path.resolve(filePath);

  if (!isPathWithinBackupDir(resolved)) {
    throw new Error(`Backup file is not in backup directory: ${filePath}`);
  }

  if (!isValidBackupFile(resolved)) {
    throw new Error(`Invalid backup file: ${filePath}`);
  }

  return resolved;
}

/**
 * Verify path is within backup directory and return normalized path
 * @param filePath File path
 * @throws Error If path is not in backup directory
 * @returns Normalized path
 */
export function validatePathInBackupDir(filePath: string): string {
  const resolved = path.resolve(filePath);

  if (!isPathWithinBackupDir(resolved)) {
    throw new Error(`Path is not in backup directory: ${filePath}`);
  }

  return resolved;
}
