import { useMemo } from "react";
import { Gesture } from "react-native-gesture-handler";
import {
  cancelAnimation,
  SharedValue,
  useSharedValue,
  withDecay,
} from "react-native-reanimated";

export const usePanGesture = (
  translateX: SharedValue<number>,
  translateY: SharedValue<number>,
  scale?: SharedValue<number>
) => {
  // Initialize to 0 - values will be set in onStart worklet
  // Don't read .value during render to avoid Reanimated warnings
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .maxPointers(1) // Only 1 finger allowed - prevents conflict with zoom
        .onStart(() => {
          "worklet";
          // Cancel any running decay animations to prevent interference
          cancelAnimation(translateX);
          cancelAnimation(translateY);
          // Save current values as starting point
          savedTranslateX.value = translateX.value;
          savedTranslateY.value = translateY.value;
        })
        .onUpdate((e) => {
          "worklet";
          translateX.value = savedTranslateX.value + e.translationX;
          translateY.value = savedTranslateY.value + e.translationY;
        })
        .onEnd((e) => {
          "worklet";
          // Only apply momentum if velocity is significant
          const minVelocity = 50; // Minimum velocity to trigger momentum
          if (
            Math.abs(e.velocityX) > minVelocity ||
            Math.abs(e.velocityY) > minVelocity
          ) {
            // Adjust momentum only when zoomed IN, not when zoomed OUT.
            // - scale <= 1: keep velocity as-is (no extra „Boost“ beim Rauszoomen)
            // - scale > 1: reduce velocity so Momentum fühlt sich bei starkem Zoom nicht zu extrem an
            const rawScale = scale?.value ?? 1;
            const safeScale = rawScale <= 0 ? 1 : rawScale;
            const effectiveScale = safeScale < 1 ? 1 : safeScale;
            const velocityScaleFactor = 1 / effectiveScale;

            const adjustedVelocityX = e.velocityX * velocityScaleFactor;
            const adjustedVelocityY = e.velocityY * velocityScaleFactor;

            translateX.value = withDecay({
              velocity: adjustedVelocityX,
              clamp: [Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY],
              deceleration: 0.991, // Higher = smoother, longer momentum
            });

            translateY.value = withDecay({
              velocity: adjustedVelocityY,
              clamp: [Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY],
              deceleration: 0.991,
            });
          }
        }),
    [translateX, translateY, savedTranslateX, savedTranslateY, scale]
  );

  return {
    panGesture,
  };
};
