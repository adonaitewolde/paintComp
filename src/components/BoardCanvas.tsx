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
import { createGridPath } from "../services/board/grid";
import { useBoardTransform } from "../services/board/useBoardTransform";
import { storageService } from "../services/database/mmkvStorage";
import { useDragGesture } from "../services/gesture/useDragGesture";
import { usePanGesture } from "../services/gesture/usePanGesture";
import { colors } from "../utils/designTokens";
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
  zIndex?: number; // Z-index for layer ordering (higher = on top)
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
            zIndex: 0, // Default zIndex for fallback images
          })),
    [images, imageUris]
  );

  // Store displayImages positions in a shared value to access in worklets
  const displayImagesShared = useSharedValue<Array<{ x: number; y: number }>>([]);

  // Sync displayImages to shared value when it changes
  useEffect(() => {
    displayImagesShared.value = displayImages.map((img) => ({ x: img.x, y: img.y }));
  }, [displayImages]); // displayImagesShared is a SharedValue - don't include in dependencies!

  // Store all image positions in a single shared value (array of {x, y})
  // This avoids the hook count issue - we only have one hook!
  const imagePositions = useSharedValue<{ x: number; y: number }[]>([]);

  // Drag gesture hook
  const { dragGesture, isDragging, checkDragStart, draggingImageIndex } =
    useDragGesture({
      selectedImageIndex,
      displayImages,
      translateX,
      translateY,
      imagePositions,
      onImageMove,
    });

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

  // Sort images for rendering by zIndex (higher zIndex = rendered last = on top)
  const sortedImagesWithIndices = useMemo(() => {
    return displayImages
      .map((image, originalIndex) => ({ image, originalIndex }))
      .sort((a, b) => (a.image.zIndex ?? 0) - (b.image.zIndex ?? 0));
  }, [displayImages]);

  // Sync positions from props to shared values (only when not dragging)
  // Use original indices (not sorted order) for position storage
  // Using useAnimatedReaction to avoid reading .value during render
  useAnimatedReaction(
    () => {
      "worklet";
      return displayImagesShared.value;
    },
    (currentImages, previousImages) => {
      "worklet";
      
      // Only update if not currently dragging
      if (draggingImageIndex.value !== null) return;
      
      // Check if update is needed
      const needsUpdate =
        !previousImages ||
        currentImages.length !== previousImages.length ||
        currentImages.some((img, index) => {
          const prev = previousImages[index];
          return !prev || prev.x !== img.x || prev.y !== img.y;
        });

      if (needsUpdate) {
        // Store positions by original index (not sorted order)
        imagePositions.value = currentImages;
      }
    }
  );

  // Create worklet with closure capture - recreates when images change
  // This keeps ALL hit testing on UI thread, no ref serialization issues
  // Note: translateX, translateY, imagePositions are SharedValues - they're captured by closure
  // and accessed via .value inside the worklet, so they don't need to be in dependencies
  const performHitTest = useMemo(() => {
    // Capture sorted order - selected images should be tested first (they're rendered last/on top)
    const sortedOriginalIndices = sortedImagesWithIndices.map(
      (item) => item.originalIndex
    );

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

      // Hit test in sorted order (reverse): test selected images first (they're on top)
      // Iterate backwards through sorted indices so top images are tested first
      for (
        let sortedIdx = sortedOriginalIndices.length - 1;
        sortedIdx >= 0;
        sortedIdx--
      ) {
        const originalIndex = sortedOriginalIndices[sortedIdx];
        const pos = positions[originalIndex];
        if (!pos) continue;

        const imgX = pos.x;
        const imgY = pos.y;
        // Use displayImages for width/height (static values)
        const img = displayImages[originalIndex];
        if (!img) continue;

        if (
          canvasX >= imgX &&
          canvasX <= imgX + img.width &&
          canvasY >= imgY &&
          canvasY <= imgY + img.height
        ) {
          return originalIndex; // Return original index for selection
        }
      }

      return null;
    };
  }, [
    displayImages,
    sortedImagesWithIndices,
  ]); // Only depend on displayImages and sortedImagesWithIndices - SharedValues are captured by closure

  // Handle tap gesture for image selection
  const handleTap = (hitIndex: number | null) => {
    if (onImageSelect) {
      onImageSelect(hitIndex);
    }
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
          {/* Render sorted: selected images come last (on top) */}
          <Group matrix={boardTransform}>
            {sortedImagesWithIndices.map(
              ({ image, originalIndex }, sortedIndex) => (
                <AnimatedImageWrapper
                  key={`${image.uri}-${originalIndex}`}
                  imageIndex={originalIndex}
                  imagePositions={imagePositions}
                  image={image}
                  isSelected={selectedImageIndex === originalIndex}
                />
              )
            )}
          </Group>
        </Canvas>
      </GestureDetector>
    </View>
  );
}

export const BoardCanvas = React.memo(BoardCanvasComponent);
