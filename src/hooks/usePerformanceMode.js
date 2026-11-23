import { useState, useEffect } from 'react';

/**
 * Detecta automáticamente si el dispositivo es de bajos recursos
 * y retorna { reduceMotion, isLowEnd } para que los componentes
 * desactiven blur, animaciones pesadas, etc.
 *
 * Detección basada en:
 * - prefers-reduced-motion del SO
 * - Número de cores del CPU
 * - Memoria disponible (si está disponible)
 * - Si es dispositivo móvil
 */
const usePerformanceMode = () => {
  const [perf, setPerf] = useState({ reduceMotion: false, isLowEnd: false });

  useEffect(() => {
    const checks = [];

    // 1. Check prefers-reduced-motion
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (motionQuery.matches) checks.push('reduced-motion');

    // 2. Check CPU cores (2 o menos = low end)
    const cores = navigator.hardwareConcurrency || 2;
    if (cores <= 2) checks.push('low-cores');

    // 3. Check device memory (Chrome only, 4GB or less = low end)
    if (navigator.deviceMemory && navigator.deviceMemory <= 4) checks.push('low-memory');

    // 4. Check if it's a low-end mobile device
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isMobile && cores <= 4) checks.push('low-end-mobile');

    // 5. Performance benchmark: measure a simple render
    const start = performance.now();
    for (let i = 0; i < 1000; i++) {
      document.createElement('div');
    }
    const elapsed = performance.now() - start;
    if (elapsed > 10) checks.push('slow-device');

    const reduceMotion = checks.includes('reduced-motion');
    const isLowEnd = checks.length <= 1 && !checks.includes('reduced-motion');

    setPerf({ reduceMotion, isLowEnd });

    // Apply class to document for CSS fallback
    if (isLowEnd) {
      document.documentElement.classList.add('reduce-motion');
    }

    // Listen for changes to reduced-motion preference
    const handler = (e) => {
      setPerf(prev => ({ ...prev, reduceMotion: e.matches }));
      if (e.matches) {
        document.documentElement.classList.add('reduce-motion');
      } else {
        document.documentElement.classList.remove('reduce-motion');
      }
    };
    motionQuery.addEventListener('change', handler);

    return () => motionQuery.removeEventListener('change', handler);
  }, []);

  return perf;
};

export default usePerformanceMode;
