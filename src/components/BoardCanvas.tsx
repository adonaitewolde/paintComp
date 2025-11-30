import { Canvas, Group, Path } from "@shopify/react-native-skia";
import React, { useMemo, useRef } from "react";
import { Dimensions, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import {
  runOnJS,
  useAnimatedReaction,
  useSharedValue,
} from "react-native-reanimated";
import { useBoardTransform } from "../hooks/useBoardTransform";
import { usePanGesture } from "../hooks/usePanGesture";
import { colors } from "../utils/designTokens";
import { createGridPath } from "../utils/gridUtils";
import { ImageLayer } from "./ImageLayer";

const { width, height } = Dimensions.get("window");

const GRID_SPACING = 20;
const WORLD_SIZE_MULTIPLIER = 8;

export type ImageData = {
  uri: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

type BoardCanvasProps = {
  backgroundColor?: string;
  imageUris?: string[];
  images?: ImageData[];
  onTransformChange?: (translateX: number, translateY: number) => void;
  selectedImageIndex?: number | null;
  onImageSelect?: (index: number | null) => void;
  onImageMove?: (index: number, x: number, y: number) => void;
};

function BoardCanvasComponent({
  backgroundColor = colors.background.primary,
  imageUris = [],
  images = [],
  onTransformChange,
  selectedImageIndex = null,
  onImageSelect,
  onImageMove,
}: BoardCanvasProps) {
  const { panGesture, translateX, translateY } = usePanGesture();
  const dragStartPosition = useRef<{ x: number; y: number } | null>(null);
  const selectedImageStartPos = useRef<{ x: number; y: number } | null>(null);
  const isDragging = useSharedValue(false); // Track drag state on UI thread

  const gridPath = useMemo(
    () => createGridPath(width, height, GRID_SPACING, WORLD_SIZE_MULTIPLIER),
    []
  );

  const boardTransform = useBoardTransform(
    translateX,
    translateY,
    width,
    height
  );

  // Expose transform values to parent using animated reaction
  useAnimatedReaction(
    () => {
      return { x: translateX.value, y: translateY.value };
    },
    (current) => {
      if (onTransformChange) {
        runOnJS(onTransformChange)(current.x, current.y);
      }
    },
    [onTransformChange]
  );

  // Support both old imageUris format and new images format
  const displayImages = useMemo(
    () =>
      images.length > 0
        ? images
        : imageUris.map((uri, index) => ({
            uri,
            x: index * 50,
            y: index * 50,
            width: 200,
            height: 200,
          })),
    [images, imageUris]
  );

  // Create worklet with closure capture - recreates when images change
  // This keeps ALL hit testing on UI thread, no ref serialization issues
  const performHitTest = useMemo(() => {
    // Capture current images array in closure - worklet will have access to it
    const currentImages = displayImages;

    return (screenX: number, screenY: number): number | null => {
      "worklet";

      // Read transform values directly from shared values (UI thread)
      const tx = translateX.value;
      const ty = translateY.value;

      // Convert screen coordinates to canvas coordinates (UI thread)
      const canvasX = screenX - tx;
      const canvasY = screenY - ty;

      // Hit test using captured images array (ALL on UI thread!)
      for (let i = currentImages.length - 1; i >= 0; i--) {
        const img = currentImages[i];
        if (
          canvasX >= img.x &&
          canvasX <= img.x + img.width &&
          canvasY >= img.y &&
          canvasY <= img.y + img.height
        ) {
          return i;
        }
      }

      return null;
    };
  }, [displayImages, translateX, translateY]); // Recreate when images change

  // Handle tap gesture for image selection
  const handleTap = (hitIndex: number | null) => {
    if (!onImageSelect) return;

    if (hitIndex !== null) {
      onImageSelect(hitIndex);
    } else {
      onImageSelect(null);
    }
  };

  // Create worklet to check if drag should start on selected image (with closure capture)
  // Returns the image index if drag should activate, null otherwise
  const checkDragStart = useMemo(() => {
    const currentSelectedIndex = selectedImageIndex;
    const currentImages = displayImages;

    return (screenX: number, screenY: number): number | null => {
      "worklet";

      if (currentSelectedIndex === null) return null;

      const tx = translateX.value;
      const ty = translateY.value;
      const canvasX = screenX - tx;
      const canvasY = screenY - ty;

      const selectedImage = currentImages[currentSelectedIndex];
      const isOnImage =
        canvasX >= selectedImage.x &&
        canvasX <= selectedImage.x + selectedImage.width &&
        canvasY >= selectedImage.y &&
        canvasY <= selectedImage.y + selectedImage.height;

      return isOnImage ? currentSelectedIndex : null;
    };
  }, [selectedImageIndex, displayImages, translateX, translateY]);

  // Handle drag start - store initial positions
  const handleDragStart = (
    screenX: number,
    screenY: number,
    imageIndex: number
  ) => {
    if (!onImageMove) return;

    const selectedImage = displayImages[imageIndex];
    dragStartPosition.current = { x: screenX, y: screenY };
    selectedImageStartPos.current = { x: selectedImage.x, y: selectedImage.y };
    // Note: isDragging.value is already set in worklet context
  };

  // Handle drag update - calculate new position
  const handleDragUpdate = (
    screenX: number,
    screenY: number,
    imageIndex: number
  ) => {
    if (
      !onImageMove ||
      !dragStartPosition.current ||
      !selectedImageStartPos.current
    ) {
      return;
    }

    // Calculate drag delta in screen space
    const deltaX = screenX - dragStartPosition.current.x;
    const deltaY = screenY - dragStartPosition.current.y;

    // Apply delta directly to canvas coordinates (no transform needed for delta)
    const newX = selectedImageStartPos.current.x + deltaX;
    const newY = selectedImageStartPos.current.y + deltaY;

    onImageMove(imageIndex, newX, newY);
  };

  const handleDragEnd = () => {
    dragStartPosition.current = null;
    selectedImageStartPos.current = null;
    isDragging.value = false; // Mark drag as inactive
  };

  const tapGesture = Gesture.Tap()
    .maxDuration(200) // Quick tap only
    .maxDistance(10) // Prevent accidental taps during small movements
    .onEnd((e) => {
      // Entire hit test runs on UI thread - no JS bridge during computation!
      const hitIndex = performHitTest(e.x, e.y);
      // Only one thread crossing to update React state
      runOnJS(handleTap)(hitIndex);
    });

  // Drag gesture for selected images
  const dragGesture = Gesture.Pan()
    .manualActivation(true) // Manual control - we decide when to activate
    .onTouchesDown((e, manager) => {
      "worklet";

      // Check if drag should activate (worklet, runs on UI thread)
      // Returns image index if drag should activate, null otherwise
      const imageIndex = checkDragStart(e.allTouches[0].x, e.allTouches[0].y);

      if (imageIndex !== null) {
        isDragging.value = true; // Set drag state immediately on UI thread
        manager.activate(); // Activate drag - it will handle the gesture
        runOnJS(handleDragStart)(
          e.allTouches[0].x,
          e.allTouches[0].y,
          imageIndex
        );
      } else {
        manager.fail(); // Explicitly fail - allows pan to take over
      }
    })
    .onUpdate((e) => {
      // Always call update handler - it will check if drag is active in JS context
      // Don't check refs in worklet to avoid serialization warnings
      if (selectedImageIndex !== null) {
        runOnJS(handleDragUpdate)(e.x, e.y, selectedImageIndex);
      }
    })
    .onEnd(() => {
      runOnJS(handleDragEnd)();
    });

  // Pan gesture - should fail when drag is active or should activate
  const panGestureWithActivation = panGesture
    .minDistance(10) // Require 10px movement before pan activates
    .manualActivation(true) // Manual control for pan too
    .onTouchesDown((e, manager) => {
      "worklet";

      // Fail pan if drag is already active OR if drag should activate (check first)
      // This prevents race condition where both gestures try to activate simultaneously
      const shouldDragActivate =
        checkDragStart(e.allTouches[0].x, e.allTouches[0].y) !== null;

      if (isDragging.value || shouldDragActivate) {
        manager.fail(); // Fail pan - drag should handle this
      } else {
        manager.activate(); // Activate pan - no drag should happen
      }
    });

  // Priority: drag (if conditions met) > tap > pan
  // Use Simultaneous - pan will fail when drag is active
  const composedGesture = Gesture.Simultaneous(
    dragGesture,
    Gesture.Exclusive(tapGesture, panGestureWithActivation)
  );

  return (
    <View style={{ flex: 1, backgroundColor }}>
      <GestureDetector gesture={composedGesture}>
        <Canvas style={{ flex: 1 }}>
          {/* Grid bleibt fix im Hintergrund (kein Transform) */}
          <Group>
            <Path
              path={gridPath}
              color={colors.border.grid}
              style="stroke"
              strokeWidth={1.5}
            />
          </Group>

          {/* Nur die Bilder werden verschoben */}
          <Group matrix={boardTransform}>
            {displayImages.map((image, index) => (
              <ImageLayer
                key={`${image.uri}-${index}`}
                uri={image.uri}
                x={image.x}
                y={image.y}
                width={image.width}
                height={image.height}
                isSelected={selectedImageIndex === index}
              />
            ))}
          </Group>
        </Canvas>
      </GestureDetector>
    </View>
  );
}

export const BoardCanvas = React.memo(BoardCanvasComponent);
