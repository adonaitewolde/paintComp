import { Gesture } from "react-native-gesture-handler";
import { useSharedValue, withDecay } from "react-native-reanimated";

export const usePanGesture = (initialX = 0, initialY = 0) => {
  const translateX = useSharedValue(initialX);
  const translateY = useSharedValue(initialY);
  const savedTranslateX = useSharedValue(initialX);
  const savedTranslateY = useSharedValue(initialY);

  const panGesture = Gesture.Pan()
    .onStart(() => {
      // Stoppe laufende Decay-Animationen
      translateX.value = translateX.value;
      translateY.value = translateY.value;
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    })
    .onUpdate((e) => {
      translateX.value = savedTranslateX.value + e.translationX;
      translateY.value = savedTranslateY.value + e.translationY;
    })
    .onEnd((e) => {
      // Momentum-Scrolling basierend auf Velocity
      translateX.value = withDecay({
        velocity: e.velocityX,
        clamp: [Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY],
        deceleration: 0.99, // Je höher, desto länger rollt es (0.998 = sehr smooth)
      });

      translateY.value = withDecay({
        velocity: e.velocityY,
        clamp: [Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY],
        deceleration: 0.99,
      });
    });

  return {
    panGesture,
    translateX,
    translateY,
  };
};
