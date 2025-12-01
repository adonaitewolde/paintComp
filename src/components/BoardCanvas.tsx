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
import { useBoardTransform } from "../services/board/useViewportTransform";
import { storageService } from "../services/database/mmkvStorage";
import { useDragGesture } from "../services/gesture/useDragGesture";
import { usePanGesture } from "../services/gesture/usePanGesture";
import { useZoomGesture } from "../services/gesture/useZoomGesture";
import { ImageData } from "../types";
import {
  DEFAULT_Z_INDEX,
  PAN_MIN_DISTANCE,
  TAP_MAX_DISTANCE,
  TAP_MAX_DURATION,
  WORLD_SIZE_MULTIPLIER,
} from "../utils/constants";
import { colors } from "../utils/designTokens";
import { ImageLayer } from "./ImageLayer";

const { width, height } = Dimensions.get("window");

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

  const { zoomGesture, scale } = useZoomGesture({
    initialScale: 1,
    translateX,
    translateY,
    width,
    height,
  });

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
            zIndex: DEFAULT_Z_INDEX, // Default zIndex for fallback images
          })),
    [images, imageUris]
  );

  // Store displayImages positions in a shared value to access in worklets
  const displayImagesShared = useSharedValue<{ x: number; y: number }[]>([]);

  // Sync displayImages to shared value when it changes
  useEffect(() => {
    displayImagesShared.value = displayImages.map((img) => ({
      x: img.x,
      y: img.y,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayImages]); // displayImagesShared is a SharedValue - don't include in dependencies!

  // Store all image positions in a single shared value (array of {x, y})
  // Initialize from displayImages so early taps/drags see correct positions
  const imagePositions = useSharedValue<{ x: number; y: number }[]>(
    displayImages.map((img) => ({
      x: img.x,
      y: img.y,
    }))
  );

  // Sort images for rendering by zIndex (higher zIndex = rendered last = on top)
  const sortedImagesWithIndices = useMemo(() => {
    return displayImages
      .map((image, originalIndex) => ({ image, originalIndex }))
      .sort(
        (a, b) =>
          (a.image.zIndex ?? DEFAULT_Z_INDEX) -
          (b.image.zIndex ?? DEFAULT_Z_INDEX)
      );
  }, [displayImages]);

  // Drag gesture hook
  const { dragGesture, draggingImageIndex } = useDragGesture({
    selectedImageIndex,
    displayImages,
    translateX,
    translateY,
    imagePositions,
    onImageMove,
    scale,
    canvasWidth: width,
    canvasHeight: height,
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
    scale,
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

    const centerX = width / 2;
    const centerY = height / 2;

    return (screenX: number, screenY: number): number | null => {
      "worklet";

      // Read transform values directly from shared values (UI thread)
      const tx = translateX.value;
      const ty = translateY.value;
      const s = scale.value;

      if (s === 0) {
        return null;
      }

      // Invert the board transform used in useBoardTransform:
      // screen = center + translate + (canvas - center) * s
      // => canvas = (screen - center - translate) / s + center
      const canvasX = (screenX - centerX - tx) / s + centerX;
      const canvasY = (screenY - centerY - ty) / s + centerY;

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayImages, sortedImagesWithIndices]); // SharedValues (translateX, translateY, scale, imagePositions) are captured by closure and accessed via .value - don't include in deps

  // Handle tap gesture for image selection
  const handleTap = (hitIndex: number | null) => {
    if (onImageSelect) {
      onImageSelect(hitIndex);
    }
  };

  // Pan gesture configuration - waits for drag to fail, requires minimum movement
  const panGestureWithConfig = panGesture
    .minDistance(PAN_MIN_DISTANCE)
    .maxPointers(1);

  // Tap gesture - waits for drag and pan to fail
  const tapGesture = Gesture.Tap()
    .maxDuration(TAP_MAX_DURATION)
    .maxDistance(TAP_MAX_DISTANCE)
    .onEnd((e) => {
      "worklet";
      // Entire hit test runs on UI thread - no JS bridge during computation!
      const hitIndex = performHitTest(e.x, e.y);
      // Only one thread crossing to update React state
      runOnJS(handleTap)(hitIndex);
    });

  // Gesture Hierarchy:
  // 1. Zoom (Pinch, 2 fingers) - works simultaneously with other gestures
  // 2. Drag (1 finger on image, manual activation) - highest priority for single finger
  // 3. Pan (1 finger, waits for drag to fail, requires movement) - for board panning
  // 4. Tap (1 finger, waits for drag/pan to fail) - for image selection
  //
  // Composition strategy:
  // - Zoom uses Simultaneous() so it can work alongside drag/pan when 2 fingers are used
  // - Drag uses manual activation - checks immediately in onTouchesDown
  // - Pan waits for drag to fail (via waitFor or natural Race behavior)
  // - Tap waits for both drag and pan to fail
  //
  // This ensures:
  // - 2 fingers -> Zoom activates (can work with drag if dragging with 2 fingers)
  // - 1 finger on image -> Drag wins
  // - 1 finger elsewhere, move > minDistance -> Pan wins
  // - 1 finger elsewhere, quick release -> Tap wins
  const singleFingerGestures = Gesture.Race(
    dragGesture,
    panGestureWithConfig,
    tapGesture
  );

  // Compose zoom (simultaneous) with single-finger gestures (race)
  const composedGesture = Gesture.Simultaneous(
    zoomGesture,
    singleFingerGestures
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
