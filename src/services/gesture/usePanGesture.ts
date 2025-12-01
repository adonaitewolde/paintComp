import { useMemo } from "react";
import { Gesture } from "react-native-gesture-handler";
import {
  cancelAnimation,
  useSharedValue,
  withDecay,
} from "react-native-reanimated";

export const usePanGesture = (initialX = 0, initialY = 0) => {
  const translateX = useSharedValue(initialX);
  const translateY = useSharedValue(initialY);
  const savedTranslateX = useSharedValue(initialX);
  const savedTranslateY = useSharedValue(initialY);

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
            translateX.value = withDecay({
              velocity: e.velocityX,
              clamp: [Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY],
              deceleration: 0.998, // Higher = smoother, longer momentum
            });

            translateY.value = withDecay({
              velocity: e.velocityY,
              clamp: [Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY],
              deceleration: 0.998,
            });
          }
        }),
    [translateX, translateY, savedTranslateX, savedTranslateY]
  );

  return {
    panGesture,
    translateX,
    translateY,
  };
};
