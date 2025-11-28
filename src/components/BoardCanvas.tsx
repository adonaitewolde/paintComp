import { Canvas, Group, Path, Skia } from "@shopify/react-native-skia";
import React, { useMemo } from "react";
import { Dimensions, View } from "react-native";

const { width, height } = Dimensions.get("window");

const GRID_SPACING = 25;
const WORLD_SIZE_MULTIPLIER = 8;

type BoardCanvasProps = {
  backgroundColor?: string;
};

function BoardCanvasComponent({
  backgroundColor = "#050608",
}: BoardCanvasProps) {
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

  return (
    <View style={{ flex: 1, backgroundColor }}>
      <Canvas style={{ flex: 1 }}>
        <Group>
          <Path
            path={gridPath}
            color="rgb(24, 24, 24)"
            style="stroke"
            strokeWidth={1}
          />
        </Group>
      </Canvas>
    </View>
  );
}

export const BoardCanvas = React.memo(BoardCanvasComponent);
