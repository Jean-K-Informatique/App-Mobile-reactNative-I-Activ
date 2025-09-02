/**
 * Utilitaires d'optimisation de performance
 */

// Debounce pour éviter les appels multiples rapides
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Throttle pour limiter la fréquence d'exécution
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// Optimisation mémoire - nettoyer les refs et listeners
export function createMemoryOptimizer() {
  const refs = new Set<{ current: any }>();
  const listeners = new Set<() => void>();
  
  const addRef = (ref: { current: any }) => {
    refs.add(ref);
  };
  
  const addListener = (cleanup: () => void) => {
    listeners.add(cleanup);
  };
  
  const cleanup = () => {
    refs.forEach(ref => {
      if (ref.current) {
        ref.current = null;
      }
    });
    refs.clear();
    
    listeners.forEach(cleanup => {
      try {
        cleanup();
      } catch (e) {
        console.warn('Erreur lors du nettoyage:', e);
      }
    });
    listeners.clear();
  };
  
  return { addRef, addListener, cleanup };
}

// Optimisation des images - cache simple
const imageCache = new Map<string, any>();

export function getCachedImage(source: any): any {
  const key = typeof source === 'string' ? source : JSON.stringify(source);
  
  if (!imageCache.has(key)) {
    imageCache.set(key, source);
  }
  
  return imageCache.get(key);
}

// Nettoyer le cache d'images si nécessaire
export function clearImageCache() {
  imageCache.clear();
}

// Performance monitoring simple
let navigationStartTime = 0;

export function startNavigationTimer() {
  navigationStartTime = Date.now();
}

export function endNavigationTimer(screenName: string) {
  const duration = Date.now() - navigationStartTime;
  if (duration > 500) { // Log seulement si > 500ms
    console.warn(`⚠️ Navigation lente vers ${screenName}: ${duration}ms`);
  }
}

// Gestionnaire de performance global
class PerformanceManager {
  private animationsEnabled = true;
  private navigationInProgress = false;
  
  disableAnimationsTemporarily(duration = 1000) {
    this.animationsEnabled = false;
    setTimeout(() => {
      this.animationsEnabled = true;
    }, duration);
  }
  
  get shouldAnimate(): boolean {
    return this.animationsEnabled && !this.navigationInProgress;
  }
  
  setNavigationInProgress(inProgress: boolean) {
    this.navigationInProgress = inProgress;
  }
}

export const performanceManager = new PerformanceManager();
