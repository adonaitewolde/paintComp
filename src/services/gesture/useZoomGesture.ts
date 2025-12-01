import { useMemo } from "react";
import { Gesture } from "react-native-gesture-handler";
import { SharedValue, useSharedValue } from "react-native-reanimated";

type UseZoomGestureParams = {
  initialScale?: number;
  translateX: SharedValue<number>;
  translateY: SharedValue<number>;
  width: number;
  height: number;
  /**
   * Optional external scale SharedValue.
   * If provided, zoom will update this value instead of creating its own.
   * This allows other gesture logic (e.g., pan momentum) to react to zoom.
   */
  scale?: SharedValue<number>;
};

export const useZoomGesture = ({
  initialScale = 1,
  translateX,
  translateY,
  width,
  height,
  scale: externalScale,
}: UseZoomGestureParams) => {
  const internalScale = externalScale ?? useSharedValue(initialScale);
  const savedScale = useSharedValue(initialScale);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  // Fokuspunkt des Zooms (relativ zum Screen)
  const focalX = useSharedValue(0);
  const focalY = useSharedValue(0);

  const zoomGesture = useMemo(
    () =>
      Gesture.Pinch()
        .onStart((e) => {
          "worklet";
          savedScale.value = internalScale.value;
          savedTranslateX.value = translateX.value;
          savedTranslateY.value = translateY.value;
          focalX.value = e.focalX;
          focalY.value = e.focalY;
        })
        .onUpdate((e) => {
          "worklet";
          // Neuer Scale mit Clamping
          const newScale = savedScale.value * e.scale;
          const clampedScale = Math.max(0.1, Math.min(newScale, 10));

          // Screen-Mitte
          const centerX = width / 2;
          const centerY = height / 2;

          // Zoom um den Fokuspunkt:
          // Der Punkt auf dem Canvas, der unter dem Fokuspunkt liegt, soll dort bleiben
          // 
          // Bildschirm-Koordinate = Mitte + Translation + (Canvas-Punkt * Scale)
          // Canvas-Punkt unter Fokus (vorher) = (Fokus - Mitte - Translation_alt) / Scale_alt
          // 
          // Wir wollen:
          // Fokus = Mitte + Translation_neu + (Canvas-Punkt * Scale_neu)
          // 
          // Daraus folgt:
          // Translation_neu = Fokus - Mitte - (Canvas-Punkt * Scale_neu)
          // Translation_neu = Fokus - Mitte - ((Fokus - Mitte - Translation_alt) / Scale_alt) * Scale_neu
          // Translation_neu = Fokus - Mitte - (Fokus - Mitte - Translation_alt) * (Scale_neu / Scale_alt)
          // Translation_neu = (Fokus - Mitte) * (1 - Scale_neu/Scale_alt) + Translation_alt * (Scale_neu/Scale_alt)

          const scaleRatio = clampedScale / savedScale.value;
          const focalOffsetX = focalX.value - centerX;
          const focalOffsetY = focalY.value - centerY;

          translateX.value =
            focalOffsetX * (1 - scaleRatio) + savedTranslateX.value * scaleRatio;
          translateY.value =
            focalOffsetY * (1 - scaleRatio) + savedTranslateY.value * scaleRatio;

          internalScale.value = clampedScale;
        })
        .onEnd(() => {
          "worklet";
          // Optional: Snap back oder animation am Ende, falls gewünscht
          // Aktuell behalten wir einfach den Scale
        }),
    [
      internalScale,
      savedScale,
      savedTranslateX,
      savedTranslateY,
      translateX,
      translateY,
      focalX,
      focalY,
      width,
      height,
    ]
  );

  return {
    zoomGesture,
    scale: internalScale,
  };
};

