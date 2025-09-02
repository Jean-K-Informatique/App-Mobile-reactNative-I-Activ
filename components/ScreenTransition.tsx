import React, { createContext, useContext, useMemo, useRef } from 'react';
import { Dimensions } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, Easing, runOnJS, cancelAnimation } from 'react-native-reanimated';
import { router } from 'expo-router';
import { performanceManager, startNavigationTimer, endNavigationTimer } from '../utils/performance';

const { width: W, height: H } = Dimensions.get('window');

type SuckNavigator = (to: string, options?: { replace?: boolean }) => void;

const SuckContext = createContext<SuckNavigator | null>(null);

export function useSuckNavigator(): SuckNavigator {
  const fn = useContext(SuckContext);
  return fn || ((to: string, options?: { replace?: boolean }) => {
    if (options?.replace) router.replace(to); else router.push(to);
  });
}

type ScreenContainerProps = {
  children: React.ReactNode;
  animateEntry?: boolean;
};

export function ScreenContainer({ children, animateEntry = true }: ScreenContainerProps) {
  const scale = useSharedValue(animateEntry ? 0.1 : 1);
  const tx = useSharedValue(animateEntry ? (W / 2 - 22) : 0);
  const ty = useSharedValue(animateEntry ? -(H / 2 - 22) : 0);
  const opacity = useSharedValue(animateEntry ? 0 : 1);
  const animatingRef = useRef(false);

  React.useEffect(() => {
    if (animateEntry && !animatingRef.current) {
      animatingRef.current = true;
      // Animations plus courtes et moins coûteuses
      scale.value = withTiming(1, { duration: 240, easing: Easing.out(Easing.quad) });
      tx.value = withTiming(0, { duration: 240, easing: Easing.out(Easing.quad) });
      ty.value = withTiming(0, { duration: 240, easing: Easing.out(Easing.quad) });
      opacity.value = withTiming(1, { duration: 180, easing: Easing.out(Easing.quad) });
    }
    
    return () => {
      // Nettoyer les animations en cours si le composant se démonte
      if (animatingRef.current) {
        cancelAnimation(scale);
        cancelAnimation(tx);
        cancelAnimation(ty);
        cancelAnimation(opacity);
        animatingRef.current = false;
      }
    };
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }));

  const navigator: SuckNavigator = useMemo(() => (to: string, options?: { replace?: boolean }) => {
    // Éviter les animations multiples en parallèle
    if (animatingRef.current) return;
    
    animatingRef.current = true;
    performanceManager.setNavigationInProgress(true);
    startNavigationTimer();
    
    // aspire vers coin haut droit puis naviguer - plus rapide
    const go = () => {
      const screenName = to.split('/').pop() || to;
      endNavigationTimer(screenName);
      performanceManager.setNavigationInProgress(false);
      
      if (options?.replace) router.replace(to); else router.push(to);
    };
    
    // Animations conditionnelles pour les performances
    if (performanceManager.shouldAnimate) {
      scale.value = withTiming(0.1, { duration: 200, easing: Easing.in(Easing.quad) });
      tx.value = withTiming(W / 2 - 22, { duration: 200, easing: Easing.in(Easing.quad) });
      ty.value = withTiming(-(H / 2 - 22), { duration: 200, easing: Easing.in(Easing.quad) }, () => {
        runOnJS(go)();
      });
      opacity.value = withTiming(0, { duration: 150, easing: Easing.in(Easing.quad) });
    } else {
      // Navigation immédiate si animations désactivées
      runOnJS(go)();
    }
  }, []);

  return (
    <SuckContext.Provider value={navigator}>
      <Animated.View style={[{ flex: 1 }, style]}>
        {children}
      </Animated.View>
    </SuckContext.Provider>
  );
}


