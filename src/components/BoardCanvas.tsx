import {
  Canvas,
  Group,
  Path,
  Skia,
  Image as SkiaImage,
  useImage,
} from "@shopify/react-native-skia";
import React, { useMemo } from "react";
import { Dimensions, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import {
  useDerivedValue,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

const { width, height } = Dimensions.get("window");

const GRID_SPACING = 20;
const WORLD_SIZE_MULTIPLIER = 8;

const MIN_SCALE = 0.5;
const MAX_SCALE = 4;

type BoardCanvasProps = {
  backgroundColor?: string;
  imageUris?: string[];
};

type ImageLayerProps = {
  uri: string;
  index: number;
};

function ImageLayer({ uri, index }: ImageLayerProps) {
  const image = useImage(uri);

  if (!image) {
    return null;
  }

  // Base size so the image fits nicely into the viewport
  const imageWidth = image.width();
  const imageHeight = image.height();
  const maxDisplayWidth = width * 0.5;
  const maxDisplayHeight = height * 0.5;
  const baseScale = Math.min(
    maxDisplayWidth / imageWidth,
    maxDisplayHeight / imageHeight
  );
  const baseWidth = imageWidth * baseScale;
  const baseHeight = imageHeight * baseScale;

  // Initial layout offset so images start in a loose grid
  const initialOffsetX = (index % 3) * (baseWidth + 50) - baseWidth;
  const initialOffsetY =
    Math.floor(index / 3) * (baseHeight + 50) - baseHeight / 2;

  const baseX = -baseWidth / 2 + initialOffsetX;
  const baseY = -baseHeight / 2 + initialOffsetY;

  return (
    <SkiaImage
      image={image}
      x={baseX}
      y={baseY}
      width={baseWidth}
      height={baseHeight}
    />
  );
}

function BoardCanvasComponent({
  backgroundColor = "#050608",
  imageUris = [],
}: BoardCanvasProps) {
  // Shared values for zoom & pan of the whole board (grid + images)
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  const savedScale = useSharedValue(1);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const gridPath = useMemo(() => {
    const path = Skia.Path.Make();
    const maxSize = Math.max(width, height) * WORLD_SIZE_MULTIPLIER;

    for (let x = -maxSize; x <= maxSize; x += GRID_SPACING) {
      path.moveTo(x, -maxSize);
      path.lineTo(x, maxSize);
    }

    for (let y = -maxSize; y <= maxSize; y += GRID_SPACING) {
      path.moveTo(-maxSize, y);
      path.lineTo(maxSize, y);
    }

    return path;
  }, []);

  // Gestures for the whole board
  const panGesture = Gesture.Pan()
    .onStart(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    })
    .onUpdate((e) => {
      translateX.value = savedTranslateX.value + e.translationX;
      translateY.value = savedTranslateY.value + e.translationY;
    });

  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      savedScale.value = scale.value;
    })
    .onUpdate((e) => {
      const nextScale = Math.max(
        MIN_SCALE,
        Math.min(MAX_SCALE, savedScale.value * e.scale)
      );
      scale.value = nextScale;
    })
    .onEnd(() => {
      scale.value = withSpring(scale.value, {
        damping: 15,
        stiffness: 150,
      });
    });

  const composedGesture = Gesture.Simultaneous(panGesture, pinchGesture);

  const boardTransform = useDerivedValue(() => {
    const matrix = Skia.Matrix();

    const centerX = width / 2;
    const centerY = height / 2;

    matrix.translate(centerX, centerY);
    matrix.scale(scale.value, scale.value);
    matrix.translate(
      translateX.value / scale.value,
      translateY.value / scale.value
    );
    matrix.translate(-centerX, -centerY);

    return matrix;
  });

  return (
    <View style={{ flex: 1, backgroundColor }}>
      <GestureDetector gesture={composedGesture}>
        <Canvas style={{ flex: 1 }}>
          {/* Grid bleibt fix im Hintergrund (kein Transform) */}
          <Group>
            <Path
              path={gridPath}
              color="rgb(24, 24, 24)"
              style="stroke"
              strokeWidth={1}
            />
          </Group>

          {/* Nur die Bilder werden gezoomt/verschoben */}
          <Group matrix={boardTransform}>
            {imageUris.map((uri, index) => (
              <ImageLayer key={`${uri}-${index}`} uri={uri} index={index} />
            ))}
          </Group>
        </Canvas>
      </GestureDetector>
    </View>
  );
}

export const BoardCanvas = React.memo(BoardCanvasComponent);
