import { useCallback, useMemo } from "react";
import { Gesture } from "react-native-gesture-handler";
import { runOnJS, SharedValue, useSharedValue } from "react-native-reanimated";
import { ImageData } from "../../types";

type UseDragGestureParams = {
  selectedImageIndex: number | null;
  displayImages: ImageData[];
  translateX: SharedValue<number>;
  translateY: SharedValue<number>;
  imagePositions: SharedValue<{ x: number; y: number }[]>;
  onImageMove?: (index: number, x: number, y: number) => void;
  // Make drag logic aware of current zoom and canvas size
  scale: SharedValue<number>;
  canvasWidth: number;
  canvasHeight: number;
};

export const useDragGesture = ({
  selectedImageIndex,
  displayImages,
  translateX,
  translateY,
  imagePositions,
  onImageMove,
  scale,
  canvasWidth,
  canvasHeight,
}: UseDragGestureParams) => {
  const isDragging = useSharedValue(false);
  const dragStartScreenPos = useSharedValue<{ x: number; y: number } | null>(
    null
  );
  const dragStartImagePos = useSharedValue<{ x: number; y: number } | null>(
    null
  );
  const draggingImageIndex = useSharedValue<number | null>(null);

  // Create worklet to check if drag should start on selected image (with closure capture)
  // Returns the image index if drag should activate, null otherwise
  // Only works on selected images
  const checkDragStart = useMemo(() => {
    const currentSelectedIndex = selectedImageIndex;
    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;

    return (screenX: number, screenY: number): number | null => {
      "worklet";

      // Only allow drag if there's a selected image
      if (currentSelectedIndex === null) return null;

      const tx = translateX.value;
      const ty = translateY.value;
      const s = scale.value;

      if (s === 0) return null;

      // Invert the board transform used in useBoardTransform:
      // screen = center + translate + (canvas - center) * s
      // => canvas = (screen - center - translate) / s + center
      const canvasX = (screenX - centerX - tx) / s + centerX;
      const canvasY = (screenY - centerY - ty) / s + centerY;

      const positions = imagePositions.value;
      if (currentSelectedIndex >= positions.length) return null;

      const pos = positions[currentSelectedIndex];
      if (!pos) return null;

      const img = displayImages[currentSelectedIndex];
      if (!img) return null;

      const imgX = pos.x;
      const imgY = pos.y;

      // Check if touch is on the selected image
      const isOnSelectedImage =
        canvasX >= imgX &&
        canvasX <= imgX + img.width &&
        canvasY >= imgY &&
        canvasY <= imgY + img.height;

      return isOnSelectedImage ? currentSelectedIndex : null;
    };
  }, [
    selectedImageIndex,
    displayImages,
    translateX,
    translateY,
    imagePositions,
    scale,
    canvasWidth,
    canvasHeight,
  ]);

  // Handle drag end - sync position back to JS thread
  const handleDragEnd = useCallback(
    (imageIndex: number | null) => {
      if (!onImageMove || imageIndex === null || imageIndex < 0) {
        draggingImageIndex.value = null;
        dragStartScreenPos.value = null;
        dragStartImagePos.value = null;
        isDragging.value = false;
        return;
      }

      const positions = imagePositions.value;
      const pos = positions[imageIndex];
      if (pos) {
        // Sync final position back to JS thread
        onImageMove(imageIndex, pos.x, pos.y);
      }

      draggingImageIndex.value = null;
      dragStartScreenPos.value = null;
      dragStartImagePos.value = null;
      isDragging.value = false;
    },
    [
      onImageMove,
      draggingImageIndex,
      dragStartScreenPos,
      dragStartImagePos,
      isDragging,
      imagePositions,
    ]
  );

  // Drag gesture for selected images - ALL updates on UI thread!
  const dragGesture = useMemo(() => {
    return Gesture.Pan()
      .manualActivation(true) // Manual control - we decide when to activate
      .onTouchesDown((e, manager) => {
        "worklet";

        // Only activate drag with single finger
        if (e.allTouches.length !== 1) {
          manager.fail();
          return;
        }

        // Check if drag should activate (worklet, runs on UI thread)
        // Returns image index if drag should activate, null otherwise
        const imageIndex = checkDragStart(e.allTouches[0].x, e.allTouches[0].y);

        if (imageIndex !== null) {
          isDragging.value = true; // Set drag state immediately on UI thread
          draggingImageIndex.value = imageIndex;

          // Store start positions on UI thread
          dragStartScreenPos.value = {
            x: e.allTouches[0].x,
            y: e.allTouches[0].y,
          };

          const positions = imagePositions.value;
          const pos = positions[imageIndex];
          if (pos) {
            dragStartImagePos.value = {
              x: pos.x,
              y: pos.y,
            };
          }

          manager.activate(); // Activate drag - it will handle the gesture
        } else {
          manager.fail(); // Explicitly fail - allows pan to take over
        }
      })
      .onUpdate((e) => {
        "worklet";

        const imageIndex = draggingImageIndex.value;
        if (imageIndex === null) return;

        const startScreen = dragStartScreenPos.value;
        const startImage = dragStartImagePos.value;

        if (!startScreen || !startImage) return;

        const s = scale.value;
        if (s === 0) return;

        // Calculate delta in screen space
        const deltaXScreen = e.x - startScreen.x;
        const deltaYScreen = e.y - startScreen.y;

        // Convert screen delta to board/canvas delta by dividing by current scale
        const deltaX = deltaXScreen / s;
        const deltaY = deltaYScreen / s;

        // Update position directly on UI thread - no flickering!
        const positions = imagePositions.value;
        const newPositions = [...positions];
        newPositions[imageIndex] = {
          x: startImage.x + deltaX,
          y: startImage.y + deltaY,
        };
        imagePositions.value = newPositions;
      })
      .onEnd(() => {
        "worklet";
        const imageIndex = draggingImageIndex.value;
        runOnJS(handleDragEnd)(imageIndex);
      });
  }, [
    checkDragStart,
    draggingImageIndex,
    isDragging,
    imagePositions,
    dragStartScreenPos,
    dragStartImagePos,
    handleDragEnd,
    scale,
  ]);

  return {
    dragGesture,
    isDragging,
    checkDragStart,
    draggingImageIndex,
  };
};
