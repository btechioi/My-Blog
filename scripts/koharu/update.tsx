import path from 'node:path';
import { ConfirmInput, Spinner } from '@inkjs/ui';
import { Box, Text } from 'ink';
import { useCallback, useEffect, useReducer, useState } from 'react';
import { CycleSelect as Select } from './components';
import { AUTO_EXIT_DELAY } from './constants';
import type { ReleaseInfo, UpdateOptions } from './constants/update';
import { usePressAnyKey, useRetimer } from './hooks';
import { runBackup } from './utils/backup-operations';
import { statusEffects } from './utils/update-effects';
import { abortMerge, abortRebase, buildReleaseUrl, extractReleaseSummary, fetchReleaseInfo } from './utils/update-operations';
import { createInitialState, updateReducer } from './utils/update-reducer';

/** Get the operation label based on the update mode */
function getModeLabel(opts: { rebase: boolean; clean: boolean; isDowngrade?: boolean }): string {
  if (opts.rebase) return 'Rebase';
  if (opts.clean) return 'Clean Mode Update';
  if (opts.isDowngrade) return 'Downgrade';
  return 'Update';
}

/** Generate the confirmation prompt text */
function getConfirmMessage(opts: UpdateOptions, latestVersion: string, isDowngrade: boolean): string {
  const target = opts.targetTag ? `version v${latestVersion}` : 'the latest version';
  if (opts.rebase) return `Confirm rebase to ${opts.targetTag ? target : 'the latest upstream'}? (History will be rewritten)`;
  if (opts.clean) return `Confirm clean mode update to ${target}?`;
  if (isDowngrade) return `Confirm downgrade to version v${latestVersion}?`;
  return `Confirm update to ${target}?`;
}

interface UpdateAppProps {
  checkOnly?: boolean;
  skipBackup?: boolean;
  force?: boolean;
  targetTag?: string;
  rebase?: boolean;
  dryRun?: boolean;
  clean?: boolean;
  showReturnHint?: boolean;
  onComplete?: () => void;
}

export function UpdateApp({
  checkOnly = false,
  skipBackup = false,
  force = false,
  targetTag,
  rebase = false,
  dryRun = false,
  clean = false,
  showReturnHint = false,
  onComplete,
}: UpdateAppProps) {
  const options: UpdateOptions = { checkOnly, skipBackup, force, targetTag, rebase, dryRun, clean };
  const [state, dispatch] = useReducer(updateReducer, options, createInitialState);

  // Asynchronously load release information
  const [releaseInfo, setReleaseInfo] = useState<ReleaseInfo | null>(null);
  const [releaseLoading, setReleaseLoading] = useState(false);

  const {
    status,
    gitStatus,
    updateInfo,
    mergeResult,
    backupFile,
    error,
    branchWarning,
    needsMigration,
    restoredFiles,
    options: stateOptions,
  } = state;
  const retimer = useRetimer();

  // Unified completion handling
  const handleComplete = useCallback(() => {
    if (!showReturnHint) {
      retimer(setTimeout(() => onComplete?.(), AUTO_EXIT_DELAY));
    }
  }, [showReturnHint, onComplete, retimer]);

  // Auto-complete in final states
  useEffect(() => {
    if (status === 'up-to-date' || status === 'done' || status === 'error') {
      handleComplete();
    }
  }, [status, handleComplete]);

  // Complete in preview status for checkOnly or dryRun modes
  useEffect(() => {
    if (status === 'preview' && (stateOptions.checkOnly || stateOptions.dryRun)) {
      handleComplete();
    }
  }, [status, stateOptions.checkOnly, stateOptions.dryRun, handleComplete]);

  // Asynchronously load Release information in preview status
  useEffect(() => {
    if (status === 'preview' && updateInfo?.latestVersion && updateInfo.latestVersion !== 'unknown') {
      setReleaseLoading(true);
      fetchReleaseInfo(updateInfo.latestVersion)
        .then((info) => {
          setReleaseInfo(info);
        })
        .catch(() => {
          // Silently fail
        })
        .finally(() => {
          setReleaseLoading(false);
        });
    }
  }, [status, updateInfo?.latestVersion]);

  // Core: single effect to handle all side effects
  useEffect(() => {
    const effect = statusEffects[status];
    if (!effect) return;
    return effect(state, dispatch);
  }, [status, state]);

  // Auto-confirm in Force mode (except for checkOnly and dryRun modes)
  useEffect(() => {
    if (status === 'preview' && stateOptions.force && !stateOptions.checkOnly && !stateOptions.dryRun) {
      dispatch({ type: 'UPDATE_CONFIRM' });
    }
  }, [status, stateOptions.force, stateOptions.checkOnly, stateOptions.dryRun]);

  // Interaction handlers
  const handleBackupConfirm = useCallback(() => {
    dispatch({ type: 'BACKUP_CONFIRM' });
    try {
      const result = runBackup(true);
      dispatch({ type: 'BACKUP_DONE', backupFile: path.basename(result.backupFile) });
    } catch (err) {
      dispatch({ type: 'ERROR', error: `Backup failed: ${err instanceof Error ? err.message : String(err)}` });
    }
  }, []);

  const handleBackupSkip = useCallback(() => dispatch({ type: 'BACKUP_SKIP' }), []);
  const handleUpdateConfirm = useCallback(() => dispatch({ type: 'UPDATE_CONFIRM' }), []);
  const handleUpdateCancel = useCallback(() => onComplete?.(), [onComplete]);
  const handleBackupSelect = useCallback(
    (value: string) => {
      if (value === 'backup') handleBackupConfirm();
      else if (value === 'skip') handleBackupSkip();
      else handleUpdateCancel();
    },
    [handleBackupConfirm, handleBackupSkip, handleUpdateCancel],
  );

  const handleAbortMerge = useCallback(() => {
    const success = abortMerge();
    if (success) {
      onComplete?.();
    } else {
      dispatch({ type: 'ERROR', error: 'Could not abort merge. Please run git merge --abort manually' });
    }
  }, [onComplete]);

  const handleAbortRebase = useCallback(() => {
    const success = abortRebase();
    if (success) {
      onComplete?.();
    } else {
      dispatch({ type: 'ERROR', error: 'Could not abort rebase. Please run git rebase --abort manually' });
    }
  }, [onComplete]);

  // Press any key to return to menu
  usePressAnyKey(
    (status === 'done' ||
      status === 'error' ||
      status === 'up-to-date' ||
      status === 'dirty-warning' ||
      (status === 'preview' && (stateOptions.checkOnly || stateOptions.dryRun))) &&
      showReturnHint,
    () => {
      onComplete?.();
    },
  );

  return (
    <Box flexDirection="column">
      {/* Checking status */}
      {status === 'checking' && (
        <Box>
          <Spinner label="Checking Git status..." />
        </Box>
      )}

      {/* Dirty warning */}
      {status === 'dirty-warning' && gitStatus && (
        <Box flexDirection="column">
          <Text color="yellow" bold>
            Workspace has uncommitted changes
          </Text>
          <Box marginTop={1} flexDirection="column">
            {gitStatus.uncommittedFiles.slice(0, 5).map((file) => (
              <Text key={file} dimColor>
                {'  '}- {file}
              </Text>
            ))}
            {gitStatus.uncommittedFiles.length > 5 && (
              <Text dimColor>
                {'  '}... and {gitStatus.uncommittedFiles.length - 5} more files
              </Text>
            )}
          </Box>
          <Box marginTop={1}>
            <Text>Please commit or stash your changes first:</Text>
          </Box>
          <Box marginTop={1} flexDirection="column">
            <Text dimColor>{'  '}git add . && git commit -m "save changes"</Text>
            <Text dimColor>{'  '}# or</Text>
            <Text dimColor>{'  '}git stash</Text>
          </Box>
          <Box marginTop={1}>
            <Text dimColor>Tip: Use --force to skip this check (not recommended)</Text>
          </Box>
          {showReturnHint && (
            <Box marginTop={1}>
              <Text dimColor>Press any key to return to the main menu...</Text>
            </Box>
          )}
        </Box>
      )}

      {/* Backup confirmation */}
      {status === 'backup-confirm' && (
        <Box flexDirection="column">
          {stateOptions.rebase || stateOptions.clean ? (
            // Rebase/Clean mode: force backup, can only confirm or cancel the whole process
            <>
              <Box marginBottom={1} flexDirection="column">
                <Text color="yellow" bold>
                  ⚠ {stateOptions.rebase ? 'Rebase' : 'Clean'} mode requires a mandatory backup
                </Text>
                {stateOptions.skipBackup && (
                  <Text color="yellow" dimColor>
                    {'  '}(--skip-backup has been ignored)
                  </Text>
                )}
              </Box>
              <Text>Confirm to proceed with the backup?</Text>
              <Box marginTop={1}>
                <ConfirmInput onConfirm={handleBackupConfirm} onCancel={handleUpdateCancel} />
              </Box>
            </>
          ) : (
            // Normal mode: three options - backup/skip/cancel
            <>
              <Text>Do you want to back up your current content before updating?</Text>
              <Text dimColor>
                A backup will save important files like blog posts and configurations, which can be restored if the update
                fails.
              </Text>
              <Box marginTop={1}>
                <Select
                  options={[
                    { label: 'Yes - perform backup then update', value: 'backup' },
                    { label: 'No - skip backup and update directly', value: 'skip' },
                    { label: 'Cancel - exit the update process', value: 'cancel' },
                  ]}
                  onChange={handleBackupSelect}
                />
              </Box>
              <Box marginTop={1}>
                <Text dimColor>Tip: Use --skip-backup to bypass this prompt</Text>
              </Box>
            </>
          )}
        </Box>
      )}

      {/* Backing up */}
      {status === 'backing-up' && (
        <Box>
          <Spinner label="Backing up..." />
        </Box>
      )}

      {/* Fetching */}
      {status === 'fetching' && (
        <Box>
          <Spinner label="Fetching updates..." />
        </Box>
      )}

      {/* Preview */}
      {status === 'preview' && updateInfo && (
        <Box flexDirection="column">
          {/* Rebase mode warning */}
          {stateOptions.rebase && (
            <Box marginBottom={1}>
              <Text color="red" bold>
                ⚠ REBASE MODE - History will be rewritten!
              </Text>
            </Box>
          )}

          {backupFile && (
            <Box marginBottom={1}>
              <Text color="green">
                {'  '}+ Backup complete: {backupFile}
              </Text>
            </Box>
          )}

          {/* Downgrade warning */}
          {updateInfo.isDowngrade && !stateOptions.rebase && (
            <Box marginBottom={1} flexDirection="column">
              <Text color="yellow" bold>
                ⚠ This is a downgrade operation and will revert to an older version.
              </Text>
              <Text color="yellow">
                {'  '}Downgrading will overwrite all theme files. Please ensure your custom content is backed up.
              </Text>
              {!backupFile && (
                <Text color="red">
                  {'  '}⚠ You have not performed a backup! It is highly recommended to cancel and perform a backup first.
                </Text>
              )}
            </Box>
          )}

          {/* Branch warning */}
          {branchWarning && (
            <Box marginBottom={1}>
              <Text color="yellow">⚠ {branchWarning}</Text>
            </Box>
          )}

          {/* Version info */}
          <Box marginBottom={1}>
            <Text bold>
              {updateInfo.isDowngrade ? (
                <>
                  Downgrading to version: <Text color="cyan">v{updateInfo.currentVersion}</Text> →{' '}
                  <Text color="yellow">v{updateInfo.latestVersion}</Text>
                </>
              ) : stateOptions.targetTag ? (
                <>
                  Updating to specified version: <Text color="cyan">v{updateInfo.currentVersion}</Text> →{' '}
                  <Text color="green">v{updateInfo.latestVersion}</Text>
                </>
              ) : (
                <>
                  New version found: <Text color="cyan">v{updateInfo.currentVersion}</Text> →{' '}
                  <Text color="green">v{updateInfo.latestVersion}</Text>
                </>
              )}
            </Text>
          </Box>

          {/* Release info (only on upgrade) */}
          {!updateInfo.isDowngrade && (
            <Box marginBottom={1} flexDirection="column">
              {releaseLoading ? (
                <Text dimColor>Fetching release notes...</Text>
              ) : releaseInfo?.body ? (
                <>
                  <Text bold color="magenta">
                    Release notes:
                  </Text>
                  {extractReleaseSummary(releaseInfo.body).map((line, index) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: static list from release summary
                    <Text key={index} dimColor>
                      {'  '}
                      {line}
                    </Text>
                  ))}
                </>
              ) : (
                <Text dimColor>(Could not fetch detailed release notes)</Text>
              )}
              {updateInfo.latestVersion !== 'unknown' && (
                <Box marginTop={1}>
                  <Text>
                    View full notes:{' '}
                    <Text color="blue" underline>
                      {buildReleaseUrl(updateInfo.latestVersion)}
                    </Text>
                  </Text>
                </Box>
              )}
            </Box>
          )}

          {/* Commit list */}
          <Text bold>
            {updateInfo.isDowngrade
              ? `Will remove ${updateInfo.aheadCount} commits:`
              : `Found ${updateInfo.behindCount} new commits:`}
          </Text>
          <Box marginTop={1} flexDirection="column">
            {updateInfo.commits.slice(0, 10).map((commit) => (
              <Text key={commit.hash}>
                <Text color={updateInfo.isDowngrade ? 'red' : 'yellow'}>
                  {'  '}
                  {updateInfo.isDowngrade ? '-' : '+'} {commit.hash}
                </Text>
                <Text> {commit.message}</Text>
                <Text dimColor> ({commit.date})</Text>
              </Text>
            ))}
            {updateInfo.commits.length > 10 && (
              <Text dimColor>
                {'  '}... and {updateInfo.commits.length - 10} more commits
              </Text>
            )}
          </Box>

          {/* Local ahead hint (only on upgrade) */}
          {!updateInfo.isDowngrade && updateInfo.aheadCount > 0 && (
            <Box marginTop={1}>
              <Text color="yellow">Tip: Local is {updateInfo.aheadCount} commits ahead of the upstream template.</Text>
            </Box>
          )}

          {/* First-time migration hint */}
          {needsMigration && !stateOptions.rebase && !stateOptions.clean && (
            <Box marginTop={1}>
              <Text color="yellow">
                ⚠ Detected first-time migration from squash merge. It's recommended to use --clean mode for a zero-conflict
                experience.
              </Text>
            </Box>
          )}

          {stateOptions.checkOnly || stateOptions.dryRun ? (
            <Box marginTop={1} flexDirection="column">
              <Text dimColor>
                {stateOptions.dryRun
                  ? 'This is a dry-run. No actual operations were performed.'
                  : `This is check-only mode. No ${updateInfo.isDowngrade ? 'downgrade' : 'update'} was performed.`}
              </Text>
              {stateOptions.dryRun && stateOptions.rebase && (
                <Box marginTop={1} flexDirection="column">
                  <Text>If rebase is executed, it will:</Text>
                  <Text dimColor>{'  '}• Replay local commits on top of the target reference</Text>
                  <Text dimColor>{'  '}• Rewrite commit history (commit hashes will change)</Text>
                  <Text dimColor>{'  '}• Require a backup first</Text>
                  {updateInfo.localCommits.length > 0 && (
                    <Box marginTop={1} flexDirection="column">
                      <Text bold>Local commits to be rebased ({updateInfo.localCommits.length}):</Text>
                      {updateInfo.localCommits.slice(0, 10).map((commit) => (
                        <Text key={commit.hash}>
                          <Text color="cyan">
                            {'  '}
                            {commit.hash}
                          </Text>
                          <Text> {commit.message}</Text>
                          <Text dimColor> ({commit.date})</Text>
                        </Text>
                      ))}
                      {updateInfo.localCommits.length > 10 && (
                        <Text dimColor>
                          {'  '}... and {updateInfo.localCommits.length - 10} more commits
                        </Text>
                      )}
                    </Box>
                  )}
                </Box>
              )}
              {stateOptions.dryRun && stateOptions.clean && (
                <Box marginTop={1} flexDirection="column">
                  <Text>If clean mode is executed, it will:</Text>
                  <Text dimColor>{'  '}• Replace all theme files with the latest from upstream</Text>
                  <Text dimColor>{'  '}• Restore user content (blog posts, config, etc.) from backup</Text>
                  <Text dimColor>{'  '}• Be zero-conflict, ideal for first-time migration</Text>
                </Box>
              )}
              {updateInfo.isDowngrade && !stateOptions.dryRun && (
                <Box marginTop={1}>
                  <Text color="yellow">Tip: Please back up your blog content before downgrading.</Text>
                  <Text dimColor>{'  '}pnpm koharu backup # Perform backup</Text>
                </Box>
              )}
              {showReturnHint && (
                <Box marginTop={1}>
                  <Text dimColor>Press any key to return to the main menu...</Text>
                </Box>
              )}
            </Box>
          ) : (
            !stateOptions.force && (
              <Box marginTop={1} flexDirection="column">
                {updateInfo.isDowngrade && !backupFile && !stateOptions.rebase && (
                  <Box marginBottom={1}>
                    <Text color="red" bold>
                      ⚠ WARNING: No backup found! You will need to manually restore your blog content after downgrading.
                    </Text>
                  </Box>
                )}
                <Box flexDirection="column">
                  <Text>{getConfirmMessage(stateOptions, updateInfo.latestVersion, updateInfo.isDowngrade)}</Text>
                  {stateOptions.clean && (
                    <Text dimColor>{'  '}Will use clean mode: replace all theme files and restore user content.</Text>
                  )}
                  {!stateOptions.rebase && !stateOptions.clean && !updateInfo.isDowngrade && (
                    <Text dimColor>{'  '}Will use merge to combine upstream updates.</Text>
                  )}
                </Box>
                <ConfirmInput onConfirm={handleUpdateConfirm} onCancel={handleUpdateCancel} />
              </Box>
            )
          )}
        </Box>
      )}

      {/* Merging */}
      {status === 'merging' && (
        <Box>
          <Spinner label={`Executing ${getModeLabel({ ...stateOptions, isDowngrade: updateInfo?.isDowngrade })}...`} />
        </Box>
      )}

      {/* Clean restoring */}
      {status === 'clean-restoring' && (
        <Box>
          <Spinner label="Restoring user content..." />
        </Box>
      )}

      {/* Installing */}
      {status === 'installing' && (
        <Box>
          <Spinner label="Installing dependencies..." />
        </Box>
      )}

      {/* Done */}
      {status === 'done' && (
        <Box flexDirection="column">
          <Text bold color="green">
            {getModeLabel({ ...stateOptions, isDowngrade: updateInfo?.isDowngrade })} complete
          </Text>
          {updateInfo?.isDowngrade && !stateOptions.rebase && (
            <Text>
              Downgraded to version: <Text color="cyan">v{updateInfo.latestVersion}</Text>
            </Text>
          )}
          {stateOptions.clean && (
            <Box flexDirection="column">
              <Text dimColor>All theme files have been replaced and user content has been restored.</Text>
              {restoredFiles.length > 0 && (
                <Box marginTop={1} flexDirection="column">
                  <Text color="cyan">Restored user content:</Text>
                  {restoredFiles.map((file) => (
                    <Text key={file} dimColor>
                      {'  '}- {file}
                    </Text>
                  ))}
                </Box>
              )}
            </Box>
          )}
          {/* Auto-resolved conflict file info */}
          {mergeResult?.autoResolvedFiles && mergeResult.autoResolvedFiles.length > 0 && (
            <Box marginTop={1} flexDirection="column">
              <Text color="cyan">
                Conflicts for the following user content files were automatically resolved to keep the local version:
              </Text>
              {mergeResult.autoResolvedFiles.map((file) => (
                <Text key={file} dimColor>
                  {'  '}- {file}
                </Text>
              ))}
            </Box>
          )}
          {backupFile && (
            <Text>
              Backup file: <Text color="cyan">{backupFile}</Text>
            </Text>
          )}
          {/* Warning after rebase completion */}
          {stateOptions.rebase && (
            <Box marginTop={1} flexDirection="column">
              <Text color="yellow" bold>
                ⚠ Your commit history has been synchronized with upstream.
              </Text>
              <Text color="yellow">{'  '}To recover, execute:</Text>
              <Text color="cyan">{'  '}pnpm koharu restore --latest</Text>
            </Box>
          )}
          {/* Release link on upgrade */}
          {!updateInfo?.isDowngrade &&
            !stateOptions.rebase &&
            updateInfo?.latestVersion &&
            updateInfo.latestVersion !== 'unknown' && (
              <Box marginTop={1}>
                <Text>
                  View release notes:{' '}
                  <Text color="blue" underline>
                    {buildReleaseUrl(updateInfo.latestVersion)}
                  </Text>
                </Text>
              </Box>
            )}
          {/* Restore hint after downgrade */}
          {updateInfo?.isDowngrade && !stateOptions.rebase && (
            <Box marginTop={1} flexDirection="column">
              <Text color="yellow" bold>
                ⚠ Important: Please restore your blog content immediately!
              </Text>
              {backupFile ? (
                <>
                  <Text>{'  '}Execute the following command to restore the backup:</Text>
                  <Text color="cyan">{'  '}pnpm koharu restore --latest</Text>
                </>
              ) : (
                <Text color="red">
                  {'  '}You did not perform a backup. Please manually restore src/content/blog and config/site.yaml.
                </Text>
              )}
            </Box>
          )}
          <Box marginTop={1} flexDirection="column">
            <Text dimColor>Next steps:</Text>
            {(updateInfo?.isDowngrade || stateOptions.rebase) && backupFile && (
              <Text dimColor>{'  '}pnpm koharu restore --latest # Restore backup</Text>
            )}
            <Text dimColor>{'  '}pnpm dev # Start development server to test</Text>
          </Box>
          {showReturnHint && (
            <Box marginTop={1}>
              <Text dimColor>Press any key to return to the main menu...</Text>
            </Box>
          )}
        </Box>
      )}

      {/* Up to date */}
      {status === 'up-to-date' && (
        <Box flexDirection="column">
          <Text bold color="green">
            {stateOptions.targetTag ? 'Already at this version' : 'Already up to date'}
          </Text>
          <Text>
            Current version: <Text color="cyan">v{updateInfo?.currentVersion}</Text>
          </Text>
          {showReturnHint && (
            <Box marginTop={1}>
              <Text dimColor>Press any key to return to the main menu...</Text>
            </Box>
          )}
        </Box>
      )}

      {/* Conflict */}
      {status === 'conflict' && mergeResult && (
        <Box flexDirection="column">
          <Text bold color="yellow">
            {mergeResult.isRebaseConflict ? 'Rebase conflict detected' : 'Merge conflict detected'}
          </Text>
          {mergeResult.autoResolvedFiles && mergeResult.autoResolvedFiles.length > 0 && (
            <Box marginTop={1} flexDirection="column">
              <Text color="cyan">The following user content files have been automatically kept (using local version):</Text>
              {mergeResult.autoResolvedFiles.map((file) => (
                <Text key={file} dimColor>
                  {'  '}- {file}
                </Text>
              ))}
            </Box>
          )}
          <Box marginTop={1} flexDirection="column">
            <Text>Files with conflicts that need manual resolution:</Text>
            {mergeResult.conflictFiles.map((file) => (
              <Text key={file} color="red">
                {'  '}- {file}
              </Text>
            ))}
          </Box>
          <Box marginTop={1} flexDirection="column">
            <Text>You can either:</Text>
            {mergeResult.isRebaseConflict ? (
              <>
                <Text dimColor>{'  '}1. Manually resolve conflicts, then run: git add . && git rebase --continue</Text>
                <Text dimColor>{'  '}2. Abort the rebase to restore the state before the update.</Text>
              </>
            ) : (
              <>
                <Text dimColor>{'  '}1. Manually resolve conflicts, then run: git add . && git commit</Text>
                <Text dimColor>{'  '}2. Abort the merge to restore the state before the update.</Text>
              </>
            )}
          </Box>
          {backupFile && (
            <Box marginTop={1}>
              <Text>
                Backup file: <Text color="cyan">{backupFile}</Text>
              </Text>
            </Box>
          )}
          <Box marginTop={1} flexDirection="column">
            <Text>{mergeResult.isRebaseConflict ? 'Abort rebase?' : 'Abort merge?'}</Text>
            <ConfirmInput
              onConfirm={mergeResult.isRebaseConflict ? handleAbortRebase : handleAbortMerge}
              onCancel={() => onComplete?.()}
            />
          </Box>
        </Box>
      )}

      {/* Error */}
      {status === 'error' && (
        <Box flexDirection="column">
          <Text bold color="red">
            Update failed
          </Text>
          <Text color="red">{error}</Text>
          {showReturnHint && (
            <Box marginTop={1}>
              <Text dimColor>Press any key to return to the main menu...</Text>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}
