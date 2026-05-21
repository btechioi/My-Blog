import type { SpringOptions } from 'motion/react';

export const microDampingPreset: SpringOptions = {
  damping: 24,
};

export const microReboundPreset: SpringOptions = {
  stiffness: 300,
  damping: 24,
};
