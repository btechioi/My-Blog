import { useFrame, useThree } from '@react-three/fiber';
import { type RefObject, useMemo, useRef } from 'react';
import * as THREE from 'three';

/**
 * Performance-optimized full-screen snow shader
 * Based on https://www.shadertoy.com/view/ldsGDn effect
 * Uses layered approach for natural snow effect, supports dynamic iteration adjustment for performance
 */

// Resolution cap to prevent excessive computation on 4K+ displays
const MAX_RESOLUTION_WIDTH = 1920;
const MAX_RESOLUTION_HEIGHT = 1080;

const SnowShaderMaterial = {
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform vec2 uResolution;
    uniform float uSpeed;
    uniform float uIntensity;
    uniform vec2 uMouse;
    uniform int uLayerStart;
    uniform int uLayerEnd;
    uniform int uMaxLayers;      // Maximum layers (desktop: 3, mobile: 2)
    uniform int uMaxIterations;  // Max iterations per layer (desktop: 4, mobile: 3)
    uniform float uSinTime;      // Precomputed sin(time * 2.5)
    uniform float uCosTime;      // Precomputed cos(time * 2.5)

    varying vec2 vUv;

    void main() {
      vec2 fragCoord = vUv * uResolution;
      float snow = 0.0;
      float time = uTime * uSpeed;

      // Dynamic layers and iterations, controlled via uniforms for performance
      for(int k = 0; k < 6; k++) {
        if(k >= uMaxLayers) break;  // Early exit optimization
        if(k < uLayerStart || k > uLayerEnd) continue;

        for(int i = 0; i < 12; i++) {
          if(i >= uMaxIterations) break;  // Early exit optimization

          // cellSize controls snowflake size: base value + iteration increment
          // Original value was 2.0 + i*3.0, changed to 2.0 + i*2.0 for smaller snowflakes
          float cellSize = 2.0 + (float(i) * 2.0);
          float downSpeed = 0.3 + (sin(time * 0.4 + float(k + i * 20)) + 1.0) * 0.00008;

          // Parallax offset: different layers use different intensity
          float parallaxFactor = 0.5 + float(k) * 0.1;
          vec2 mouseOffset = uMouse * parallaxFactor;

          vec2 uv = (fragCoord.xy / uResolution.x) + mouseOffset + vec2(
            // X direction: disable horizontal drift, keep pure vertical fall
            0.0,
            // Y direction fall
            downSpeed * (time + float(k * 1352)) * (1.0 / float(i))
          );

          vec2 uvStep = (ceil((uv) * cellSize - vec2(0.5, 0.5)) / cellSize);
          float x = fract(sin(dot(uvStep.xy, vec2(12.9898 + float(k) * 12.0, 78.233 + float(k) * 315.156))) * 43758.5453 + float(k) * 12.0) - 0.5;
          float y = fract(sin(dot(uvStep.xy, vec2(62.2364 + float(k) * 23.0, 94.674 + float(k) * 95.0))) * 62159.8432 + float(k) * 12.0) - 0.5;

          // Snowflake gentle sway (reduce amplitude to avoid floating-up feeling)
          float randomMagnitude1 = uSinTime * 0.4 / cellSize;
          float randomMagnitude2 = uCosTime * 0.4 / cellSize;

          float d = 5.0 * distance((uvStep.xy + vec2(x * sin(y), y) * randomMagnitude1 + vec2(y, x) * randomMagnitude2), uv.xy);

          float omiVal = fract(sin(dot(uvStep.xy, vec2(32.4691, 94.615))) * 31572.1684);
          if(omiVal < 0.08) {
            float newd = (x + 1.0) * 0.4 * clamp(1.9 - d * (15.0 + (x * 6.3)) * (cellSize / 1.4), 0.0, 1.0);
            snow += newd;
          }
        }
      }

      // Compensation factor: originally 72 iterations, now reduced to maxLayers * maxIterations
      // Need to amplify snow value to compensate for reduced iterations
      float compensationFactor = 72.0 / float(uMaxLayers * uMaxIterations);
      float alpha = snow * uIntensity * compensationFactor;
      gl_FragColor = vec4(1.0, 1.0, 1.0, alpha);
    }
  `,
};

interface SnowParticlesProps {
  speed?: number;
  intensity?: number;
  /** Parallax position ref, updated by parent via Motion spring */
  parallaxRef?: RefObject<{ x: number; y: number }>;
  /** Layer range to render [start, end], default [0, 5] renders all */
  layerRange?: [number, number];
  /** Maximum layers for performance (desktop: 3, mobile: 2) */
  maxLayers?: number;
  /** Max iterations per layer for performance (desktop: 4, mobile: 3) */
  maxIterations?: number;
}

export function SnowParticles({
  speed = 1,
  intensity = 0.6,
  parallaxRef,
  layerRange = [0, 5],
  maxLayers = 3,
  maxIterations = 4,
}: SnowParticlesProps) {
  const shaderMaterial = useRef<THREE.ShaderMaterial>(null);
  const prevSize = useRef({ width: 0, height: 0 });
  const { size } = useThree();

  const [layerStart, layerEnd] = layerRange;

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uSpeed: { value: speed },
      uIntensity: { value: intensity },
      uMouse: { value: new THREE.Vector2(0, 0) },
      uLayerStart: { value: layerStart },
      uLayerEnd: { value: layerEnd },
      uMaxLayers: { value: maxLayers },
      uMaxIterations: { value: maxIterations },
      uSinTime: { value: 0 },
      uCosTime: { value: 0 },
    }),
    [speed, intensity, layerStart, layerEnd, maxLayers, maxIterations],
  );

  // Update time, resolution, trig functions, and mouse parallax
  useFrame((state) => {
    if (shaderMaterial.current) {
      const time = state.clock.getElapsedTime();
      shaderMaterial.current.uniforms.uTime.value = time;

      // Precompute trig values to reduce per-pixel GPU computation
      shaderMaterial.current.uniforms.uSinTime.value = Math.sin(time * 2.5);
      shaderMaterial.current.uniforms.uCosTime.value = Math.cos(time * 2.5);

      // Only update resolution on size change, apply resolution cap
      if (prevSize.current.width !== size.width || prevSize.current.height !== size.height) {
        const cappedWidth = Math.min(size.width, MAX_RESOLUTION_WIDTH);
        const cappedHeight = Math.min(size.height, MAX_RESOLUTION_HEIGHT);
        shaderMaterial.current.uniforms.uResolution.value.set(cappedWidth, cappedHeight);
        prevSize.current = { width: size.width, height: size.height };
      }

      // Update mouse parallax
      if (parallaxRef) {
        shaderMaterial.current.uniforms.uMouse.value.set(parallaxRef.current.x, parallaxRef.current.y);
      }
    }
  });

  return (
    <mesh>
      {/* Full-screen quad covering the entire viewport */}
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={shaderMaterial}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        uniforms={uniforms}
        vertexShader={SnowShaderMaterial.vertexShader}
        fragmentShader={SnowShaderMaterial.fragmentShader}
      />
    </mesh>
  );
}
