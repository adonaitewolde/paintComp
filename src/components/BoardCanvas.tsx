import { Canvas, Group, Path, Skia } from "@shopify/react-native-skia";
import React, { useEffect, useMemo } from "react";
import { Dimensions, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import {
  runOnJS,
  SharedValue,
  useAnimatedReaction,
  useDerivedValue,
  useSharedValue,
} from "react-native-reanimated";
import { useBoardTransform } from "../hooks/useBoardTransform";
import { usePanGesture } from "../hooks/usePanGesture";
import { storageService } from "../services/storage/mmkvStorage";
import { colors } from "../utils/designTokens";
import { createGridPath } from "../utils/gridUtils";
import { ImageLayer } from "./ImageLayer";

const { width, height } = Dimensions.get("window");

const WORLD_SIZE_MULTIPLIER = 8;

// Component for animating image position on UI thread
type AnimatedImageWrapperProps = {
  imageIndex: number;
  imagePositions: SharedValue<{ x: number; y: number }[]>;
  image: ImageData;
  isSelected: boolean;
};

function AnimatedImageWrapper({
  imageIndex,
  imagePositions,
  image,
  isSelected,
}: AnimatedImageWrapperProps) {
  // Create animated matrix for this image using derived values
  // This runs entirely on UI thread - no JS bridge crossing!
  const imageMatrix = useDerivedValue(() => {
    const positions = imagePositions.value;
    const pos = positions[imageIndex];
    const matrix = Skia.Matrix();
    if (pos) {
      matrix.translate(pos.x, pos.y);
    }
    return matrix;
  });

  return (
    <Group matrix={imageMatrix}>
      <ImageLayer
        uri={image.uri}
        x={0}
        y={0}
        width={image.width}
        height={image.height}
        isSelected={isSelected}
      />
    </Group>
  );
}

export type ImageData = {
  id?: string; // Database ID (optional for backward compatibility)
  uri: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number; // Rotation in degrees (0, 90, 180, 270)
  flipHorizontal?: boolean; // Flip horizontally
};

type BoardCanvasProps = {
  backgroundColor?: string;
  imageUris?: string[];
  images?: ImageData[];
  boardId?: string; // Board ID to load saved viewport transform
  onTransformChange?: (translateX: number, translateY: number) => void;
  selectedImageIndex?: number | null;
  onImageSelect?: (index: number | null) => void;
  onImageMove?: (index: number, x: number, y: number) => void;
};

function BoardCanvasComponent({
  backgroundColor = colors.background.primary,
  imageUris = [],
  images = [],
  boardId,
  onTransformChange,
  selectedImageIndex = null,
  onImageSelect,
  onImageMove,
}: BoardCanvasProps) {
  // Load transform synchronously on mount (MMKV is fast!)
  // This prevents flickering by setting the correct viewport position before first render
  const initialTransform = useMemo(() => {
    if (!boardId) return { x: 0, y: 0 };
    const saved = storageService.getViewportTransform(boardId);
    return saved || { x: 0, y: 0 };
  }, [boardId]);

  const { panGesture, translateX, translateY } = usePanGesture(
    initialTransform.x,
    initialTransform.y
  );
  const isDragging = useSharedValue(false); // Track drag state on UI thread

  // Store all image positions in a single shared value (array of {x, y})
  // This avoids the hook count issue - we only have one hook!
  const imagePositions = useSharedValue<{ x: number; y: number }[]>([]);

  // Drag state stored on UI thread
  const dragStartScreenPos = useSharedValue<{ x: number; y: number } | null>(
    null
  );
  const dragStartImagePos = useSharedValue<{ x: number; y: number } | null>(
    null
  );
  const draggingImageIndex = useSharedValue<number | null>(null);

  // Get grid spacing from MMKV storage
  const gridSpacing = storageService.getGridSpacing();

  const gridPath = useMemo(
    () => createGridPath(width, height, gridSpacing, WORLD_SIZE_MULTIPLIER),
    [gridSpacing]
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

  // Sync positions from props to shared values (only when not dragging)
  useEffect(() => {
    const currentPositions = imagePositions.value;
    const needsUpdate =
      currentPositions.length !== displayImages.length ||
      displayImages.some((img, index) => {
        const current = currentPositions[index];
        return !current || current.x !== img.x || current.y !== img.y;
      });

    if (needsUpdate && draggingImageIndex.value === null) {
      // Only update if not currently dragging
      imagePositions.value = displayImages.map((img) => ({
        x: img.x,
        y: img.y,
      }));
    }
  }, [displayImages, imagePositions, draggingImageIndex]);

  // Create worklet with closure capture - recreates when images change
  // This keeps ALL hit testing on UI thread, no ref serialization issues
  const performHitTest = useMemo(() => {
    return (screenX: number, screenY: number): number | null => {
      "worklet";

      // Read transform values directly from shared values (UI thread)
      const tx = translateX.value;
      const ty = translateY.value;

      // Convert screen coordinates to canvas coordinates (UI thread)
      const canvasX = screenX - tx;
      const canvasY = screenY - ty;

      // Get current positions from shared value (UI thread)
      const positions = imagePositions.value;

      // Hit test using shared values (ALL on UI thread!)
      for (let i = positions.length - 1; i >= 0; i--) {
        const pos = positions[i];
        if (!pos) continue;

        const imgX = pos.x;
        const imgY = pos.y;
        // Use displayImages for width/height (static values)
        const img = displayImages[i];
        if (!img) continue;

        if (
          canvasX >= imgX &&
          canvasX <= imgX + img.width &&
          canvasY >= imgY &&
          canvasY <= imgY + img.height
        ) {
          return i;
        }
      }

      return null;
    };
  }, [displayImages, translateX, translateY, imagePositions]); // Recreate when images change

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

    return (screenX: number, screenY: number): number | null => {
      "worklet";

      if (currentSelectedIndex === null) return null;

      const tx = translateX.value;
      const ty = translateY.value;
      const canvasX = screenX - tx;
      const canvasY = screenY - ty;

      const positions = imagePositions.value;
      if (currentSelectedIndex >= positions.length) return null;

      const pos = positions[currentSelectedIndex];
      if (!pos) return null;

      const imgX = pos.x;
      const imgY = pos.y;
      const img = displayImages[currentSelectedIndex];
      if (!img) return null;

      const isOnImage =
        canvasX >= imgX &&
        canvasX <= imgX + img.width &&
        canvasY >= imgY &&
        canvasY <= imgY + img.height;

      return isOnImage ? currentSelectedIndex : null;
    };
  }, [
    selectedImageIndex,
    displayImages,
    translateX,
    translateY,
    imagePositions,
  ]);

  // Handle drag end - sync position back to JS thread
  const handleDragEnd = (imageIndex: number | null) => {
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

  // Drag gesture for selected images - ALL updates on UI thread!
  const dragGesture = Gesture.Pan()
    .manualActivation(true) // Manual control - we decide when to activate
    .onTouchesDown((e, manager) => {
      "worklet";

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

      // ALL drag updates happen on UI thread - no JS bridge crossing!
      const imageIndex = draggingImageIndex.value;
      if (imageIndex === null) return;

      const startScreen = dragStartScreenPos.value;
      const startImage = dragStartImagePos.value;

      if (!startScreen || !startImage) return;

      // Calculate delta in screen space
      const deltaX = e.x - startScreen.x;
      const deltaY = e.y - startScreen.y;

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
              <AnimatedImageWrapper
                key={`${image.uri}-${index}`}
                imageIndex={index}
                imagePositions={imagePositions}
                image={image}
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
