import { Canvas, Group, Path } from "@shopify/react-native-skia";
import React, { useMemo } from "react";
import { Dimensions, View } from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import { useBoardTransform } from "../hooks/useBoardTransform";
import { usePanGesture } from "../hooks/usePanGesture";
import { createGridPath } from "../utils/gridUtils";
import { ImageLayer } from "./ImageLayer";

const { width, height } = Dimensions.get("window");

const GRID_SPACING = 20;
const WORLD_SIZE_MULTIPLIER = 8;

type BoardCanvasProps = {
  backgroundColor?: string;
  imageUris?: string[];
};

function BoardCanvasComponent({
  backgroundColor = "#050608",
  imageUris = [],
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
