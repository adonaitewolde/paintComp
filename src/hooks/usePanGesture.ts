import { Gesture } from "react-native-gesture-handler";
import { useSharedValue, withDecay } from "react-native-reanimated";

export const usePanGesture = () => {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

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
