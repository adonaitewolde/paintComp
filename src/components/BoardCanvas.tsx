import { Canvas, Group, Path } from "@shopify/react-native-skia";
import React, { useMemo } from "react";
import { Dimensions, View } from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import { runOnJS, useAnimatedReaction } from "react-native-reanimated";
import { useBoardTransform } from "../hooks/useBoardTransform";
import { usePanGesture } from "../hooks/usePanGesture";
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
};

function BoardCanvasComponent({
  backgroundColor = "#050608",
  imageUris = [],
  images = [],
  onTransformChange,
}: BoardCanvasProps) {
  const { panGesture, translateX, translateY } = usePanGesture();

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
  const displayImages =
    images.length > 0
      ? images
      : imageUris.map((uri, index) => ({
          uri,
          x: index * 50,
          y: index * 50,
          width: 200,
          height: 200,
        }));

  return (
    <View style={{ flex: 1, backgroundColor }}>
      <GestureDetector gesture={panGesture}>
        <Canvas style={{ flex: 1 }}>
          {/* Grid bleibt fix im Hintergrund (kein Transform) */}
          <Group>
            <Path
              path={gridPath}
              color="rgb(24, 24, 24)"
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
              />
            ))}
          </Group>
        </Canvas>
      </GestureDetector>
    </View>
  );
}

export const BoardCanvas = React.memo(BoardCanvasComponent);
