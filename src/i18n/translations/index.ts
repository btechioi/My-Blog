/**
 * Translation dictionaries barrel export
 *
 * English is the default and source-of-truth locale.
 */

import type { DefaultUIStrings } from '../types';
import { uiStrings as en } from './en';

/** All translation dictionaries indexed by locale code */
export const translations: Record<string, DefaultUIStrings> = {
  en,
};
