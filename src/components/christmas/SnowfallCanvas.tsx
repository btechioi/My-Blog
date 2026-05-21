import { useIsMobile } from '@hooks/useMediaQuery';
import { useStore } from '@nanostores/react';
import { Canvas } from '@react-three/fiber';
import { christmasEnabled } from '@store/christmas';
import { throttle } from 'es-toolkit';
import { type MotionValue, useMotionValue, useReducedMotion, useSpring } from 'motion/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { SnowParticles } from './SnowParticles';

interface SnowfallCanvasProps {
  speed?: number;
  intensity?: number;
  mobileIntensity?: number;
  /** Parallax strength, mouse movement offset (0-1), default 0.15 */
  parallaxStrength?: number;
  /** z-index, default 50 */
  zIndex?: number;
  /** Layer position: 'background' renders first half, 'foreground' renders second half, automatically calculates layerRange based on maxLayers */
  layerPosition?: 'background' | 'foreground';
  /** Desktop maximum layers */
  maxLayers?: number;
  /** Desktop max iterations per layer */
  maxIterations?: number;
  /** Mobile maximum layers */
  mobileMaxLayers?: number;
  /** Mobile max iterations per layer */
  mobileMaxIterations?: number;
}

export function SnowfallCanvas({
  speed = 1,
  intensity = 0.6,
  mobileIntensity = 0.4,
  parallaxStrength = 0.15,
  zIndex = 50,
  layerPosition = 'foreground',
  maxLayers: desktopMaxLayers = 4,
  maxIterations: desktopMaxIterations = 6,
  mobileMaxLayers = 2,
  mobileMaxIterations = 3,
}: SnowfallCanvasProps) {
  const isChristmasEnabled = useStore(christmasEnabled);
  const shouldReduceMotion = useReducedMotion();
  const isMobile = useIsMobile();

  // Tab visibility detection - pause rendering when tab is not visible
  const [isVisible, setIsVisible] = useState(true);
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(document.visibilityState === 'visible');
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Mouse position motion values (normalized to -0.5 ~ 0.5)
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Smooth mouse movement with spring
  const smoothMouseX = useSpring(mouseX, { stiffness: 50, damping: 20 });
  const smoothMouseY = useSpring(mouseY, { stiffness: 50, damping: 20 });

  // Throttled mouse move handler (~30fps)
  const throttledMouseMove = useMemo(
    () =>
      throttle((e: MouseEvent) => {
        const x = e.clientX / window.innerWidth - 0.5;
        const y = e.clientY / window.innerHeight - 0.5;
        mouseX.set(x);
        mouseY.set(y);
      }, 32),
    [mouseX, mouseY],
  );

  // Mouse tracking - desktop only
  useEffect(() => {
    // No parallax needed on mobile or with reduced motion
    if (isMobile || shouldReduceMotion) return;

    const handleMouseLeave = () => {
      // Slowly return to center when mouse leaves window
      mouseX.set(0);
      mouseY.set(0);
    };

    window.addEventListener('mousemove', throttledMouseMove, { passive: true });
    document.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      window.removeEventListener('mousemove', throttledMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
    // mouseX/mouseY are stable refs from useMotionValue, no need in deps
  }, [
    isMobile,
    shouldReduceMotion,
    throttledMouseMove, // Slowly return to center when mouse leaves window
    mouseX.set,
    mouseY.set,
  ]);

  const finalIntensity = isMobile ? mobileIntensity : intensity;
  const finalParallaxStrength = isMobile ? 0 : parallaxStrength;

  // Performance: adjust iterations based on device type (configurable in site-config.ts)
  const maxLayers = isMobile ? mobileMaxLayers : desktopMaxLayers;
  const maxIterations = isMobile ? mobileMaxIterations : desktopMaxIterations;

  // Automatically calculate layerRange from layerPosition and maxLayers
  // Background renders first half, foreground renders second half
  const halfLayers = Math.floor(maxLayers / 2);
  const layerRange: [number, number] = layerPosition === 'background' ? [0, halfLayers - 1] : [halfLayers, maxLayers - 1];

  // Don't render snow if user prefers reduced motion, Christmas is disabled, or tab is not visible
  if (shouldReduceMotion || !isChristmasEnabled || !isVisible) {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex,
      }}
    >
      <Canvas
        // Full-screen shader doesn't need perspective camera, use orthographic
        orthographic
        camera={{ zoom: 1, position: [0, 0, 1] }}
        gl={{
          antialias: false,
          alpha: true,
          powerPreference: 'low-power',
        }}
        // Performance: higher DPR on mobile to avoid blur, lower DPR on desktop
        dpr={isMobile ? 1 : 0.7}
        style={{
          background: 'transparent',
          pointerEvents: 'none',
        }}
        eventSource={undefined}
        eventPrefix={undefined}
      >
        <SnowParticlesWithParallax
          speed={speed}
          intensity={finalIntensity}
          smoothMouseX={smoothMouseX}
          smoothMouseY={smoothMouseY}
          parallaxStrength={finalParallaxStrength}
          layerRange={layerRange}
          maxLayers={maxLayers}
          maxIterations={maxIterations}
        />
      </Canvas>
    </div>
  );
}

/** Internal component: bridge Motion spring values with R3F useFrame */
function SnowParticlesWithParallax({
  speed,
  intensity,
  smoothMouseX,
  smoothMouseY,
  parallaxStrength,
  layerRange,
  maxLayers,
  maxIterations,
}: {
  speed: number;
  intensity: number;
  smoothMouseX: MotionValue<number>;
  smoothMouseY: MotionValue<number>;
  parallaxStrength: number;
  layerRange: [number, number];
  maxLayers: number;
  maxIterations: number;
}) {
  const parallaxRef = useRef({ x: 0, y: 0 });

  // Subscribe to spring value changes, store in ref for useFrame
  useEffect(() => {
    const unsubX = smoothMouseX.on('change', (v) => {
      parallaxRef.current.x = v * parallaxStrength;
    });
    const unsubY = smoothMouseY.on('change', (v) => {
      parallaxRef.current.y = v * parallaxStrength;
    });
    return () => {
      unsubX();
      unsubY();
    };
  }, [smoothMouseX, smoothMouseY, parallaxStrength]);

  return (
    <SnowParticles
      speed={speed}
      intensity={intensity}
      parallaxRef={parallaxRef}
      layerRange={layerRange}
      maxLayers={maxLayers}
      maxIterations={maxIterations}
    />
  );
}
