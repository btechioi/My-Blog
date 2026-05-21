import { motion, useReducedMotion, useScroll, useSpring } from 'motion/react';

interface ScrollProgressProps {
  className?: string;
}

export function ScrollProgress({ className }: ScrollProgressProps) {
  const shouldReduceMotion = useReducedMotion();

  // Track page scroll progress
  const { scrollYProgress } = useScroll();

  // Use spring animation for smoother scrolling, improves performance
  const springProgress = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  // If user prefers reduced motion, use raw scroll progress without spring
  const scaleX = shouldReduceMotion ? scrollYProgress : springProgress;

  return (
    <div className={className}>
      <motion.div className="h-1 origin-left rounded-full bg-primary" style={{ scaleX }} />
    </div>
  );
}
