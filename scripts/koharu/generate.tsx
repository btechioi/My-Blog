import { Spinner, TextInput } from '@inkjs/ui';
import { Box, Text } from 'ink';
import { useCallback, useEffect, useRef, useState } from 'react';
import { CycleSelect as Select } from './components';
import { AUTO_EXIT_DELAY } from './constants';
import { DEFAULT_LLM_MODEL, GENERATE_ITEMS, type GenerateType } from './constants/generate';
import { usePressAnyKey, useRetimer } from './hooks';
import { checkLlmServer, type RunScriptResult, runGenerate, runGenerateAll } from './utils/generate-operations';

type GenerateStatus = 'selecting' | 'model-input' | 'checking' | 'generating' | 'done' | 'error';
type GenerateSelection = GenerateType | 'all' | 'cancel';

interface GenerateAppProps {
  initialType?: GenerateType | 'all';
  initialModel?: string;
  force?: boolean;
  showReturnHint?: boolean;
  onComplete?: () => void;
}

export function GenerateApp({
  initialType,
  initialModel,
  force = false,
  showReturnHint = false,
  onComplete,
}: GenerateAppProps) {
  const [status, setStatus] = useState<GenerateStatus>(() => {
    if (initialType) {
      if ((initialType === 'summaries' || initialType === 'all') && !initialModel) return 'model-input';
      return 'checking';
    }
    return 'selecting';
  });
  const [selectedType, setSelectedType] = useState<GenerateSelection | null>(initialType || null);
  const [model, setModel] = useState(initialModel || DEFAULT_LLM_MODEL);
  const [results, setResults] = useState<Map<GenerateType, RunScriptResult>>(new Map());
  const [error, setError] = useState<string>('');
  const [currentTask, setCurrentTask] = useState<string>('');
  const retimer = useRetimer();
  const isUnmountedRef = useRef(false);

  useEffect(() => {
    return () => {
      isUnmountedRef.current = true;
    };
  }, []);

  const needsLlm = selectedType === 'summaries' || selectedType === 'all';

  const executeGenerate = useCallback(async () => {
    try {
      setStatus('generating');

      if (selectedType === 'all') {
        const allResults = await runGenerateAll({
          model,
          force,
          onProgress: (label) => setCurrentTask(label),
        });
        if (isUnmountedRef.current) return;
        setResults(allResults);
        const failed = [...allResults.entries()].find(([, r]) => !r.success);
        if (failed) {
          setError(`Failed to generate ${GENERATE_ITEMS.find((i) => i.id === failed[0])?.label}`);
          setStatus('error');
        } else {
          setStatus('done');
        }
      } else if (selectedType && selectedType !== 'cancel') {
        const item = GENERATE_ITEMS.find((i) => i.id === selectedType);
        setCurrentTask(item?.label || '');
        const result = await runGenerate(selectedType, { model, force });
        if (isUnmountedRef.current) return;
        setResults(new Map([[selectedType, result]]));
        if (!result.success) {
          setError(`Generation failed (exit code: ${result.code})`);
          setStatus('error');
        } else {
          setStatus('done');
        }
      }

      if (!showReturnHint) {
        retimer(setTimeout(() => onComplete?.(), AUTO_EXIT_DELAY));
      }
    } catch (err) {
      if (isUnmountedRef.current) return;
      setError(err instanceof Error ? err.message : String(err));
      setStatus('error');
      if (!showReturnHint) retimer(setTimeout(() => onComplete?.(), AUTO_EXIT_DELAY));
    }
  }, [selectedType, model, force, showReturnHint, onComplete, retimer]);

  useEffect(() => {
    if (status !== 'checking') return;
    let cancelled = false;

    const check = async () => {
      const available = await checkLlmServer(model);
      if (cancelled) return;

      if (needsLlm && !available) {
        setError('AI Service Unavailable. Please ensure GEMINI_API_KEY is in your .env file.');
        setStatus('error');
        if (!showReturnHint) retimer(setTimeout(() => onComplete?.(), AUTO_EXIT_DELAY));
      } else {
        executeGenerate();
      }
    };

    check();
    return () => {
      cancelled = true;
    };
  }, [status, model, needsLlm, executeGenerate, showReturnHint, onComplete, retimer]);

  usePressAnyKey((status === 'done' || status === 'error') && showReturnHint, () => {
    onComplete?.();
  });

  const successCount = [...results.values()].filter((r) => r.success).length;

  return (
    <Box flexDirection="column">
      {status === 'selecting' && (
        <Box flexDirection="column">
          <Text>Select content to generate:</Text>
          <Select
            options={[
              ...GENERATE_ITEMS.map((item) => ({ label: `${item.label} (${item.description})`, value: item.id })),
              { label: 'Generate All', value: 'all' },
              { label: 'Back', value: 'cancel' },
            ]}
            onChange={(value) => {
              if (value === 'cancel') onComplete?.();
              else {
                setSelectedType(value as GenerateSelection);
                setStatus(value === 'summaries' || value === 'all' ? 'model-input' : 'checking');
              }
            }}
          />
        </Box>
      )}

      {status === 'model-input' && (
        <Box flexDirection="column">
          <Text>Enter Model Name (e.g., gemini-1.5-flash):</Text>
          <Box marginTop={1}>
            <Text dimColor>{'> '}</Text>
            <TextInput
              defaultValue={model}
              onSubmit={(v) => {
                setModel(v || DEFAULT_LLM_MODEL);
                setStatus('checking');
              }}
            />
          </Box>
        </Box>
      )}

      {status === 'checking' && (
        <Box>
          <Spinner label={needsLlm ? 'Connecting to Gemini Cloud...' : 'Preparing...'} />
        </Box>
      )}

      {status === 'generating' && (
        <Box flexDirection="column">
          <Box marginBottom={1}>
            <Spinner label={`Generating ${currentTask}...`} />
          </Box>
          <Text dimColor>Subprocess output:</Text>
          <Text dimColor>─────────────────────────────────</Text>
        </Box>
      )}

      {status === 'done' && (
        <Box flexDirection="column">
          <Text bold color="green">
            Generation complete
          </Text>
          {[...results.entries()].map(([type, result]) => (
            <Text key={type}>
              {result.success ? <Text color="green"> ✓ </Text> : <Text color="red"> ✗ </Text>}
              {GENERATE_ITEMS.find((i) => i.id === type)?.label}
            </Text>
          ))}
          {showReturnHint && (
            <Box marginTop={1}>
              <Text dimColor>Press any key to return...</Text>
            </Box>
          )}
        </Box>
      )}

      {status === 'error' && (
        <Box flexDirection="column">
          <Text bold color="red">
            Generation failed
          </Text>
          <Text color="red">{error}</Text>
          {showReturnHint && (
            <Box marginTop={1}>
              <Text dimColor>Press any key to return...</Text>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}
