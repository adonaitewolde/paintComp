import { Group, Image, Path, Skia, useImage } from "@shopify/react-native-skia";
import React from "react";

type ImageLayerProps = {
  uri: string;
  x: number;
  y: number;
  width: number;
  height: number;
  borderRadius?: number;
  isSelected?: boolean;
};

const DEFAULT_BORDER_RADIUS = 18;
const SELECTED_BORDER_WIDTH = 3;
const SELECTED_BORDER_COLOR = "#007AFF"; // iOS blue

export function ImageLayer({
  uri,
  x,
  y,
  width,
  height,
  borderRadius = DEFAULT_BORDER_RADIUS,
  isSelected = false,
}: ImageLayerProps) {
  const image = useImage(uri);

  // Create border path for selected state (must be before early return)
  const borderPath = React.useMemo(() => {
    const borderX = x - SELECTED_BORDER_WIDTH / 2;
    const borderY = y - SELECTED_BORDER_WIDTH / 2;
    const borderWidth = width + SELECTED_BORDER_WIDTH;
    const borderHeight = height + SELECTED_BORDER_WIDTH;
    const borderRadiusWithOffset = borderRadius + SELECTED_BORDER_WIDTH / 2;

    const borderRect = Skia.RRectXY(
      Skia.XYWHRect(borderX, borderY, borderWidth, borderHeight),
      borderRadiusWithOffset,
      borderRadiusWithOffset
    );

    const path = Skia.Path.Make();
    path.addRRect(borderRect);
    return path;
  }, [x, y, width, height, borderRadius]);

  if (!image) {
    return null;
  }

  const clip = Skia.RRectXY(
    Skia.XYWHRect(x, y, width, height),
    borderRadius,
    borderRadius
  );

  return (
    <Group>
      <Group clip={clip}>
        <Image image={image} x={x} y={y} width={width} height={height} />
      </Group>
      {isSelected && borderPath && (
        <Path
          path={borderPath}
          color={SELECTED_BORDER_COLOR}
          style="stroke"
          strokeWidth={SELECTED_BORDER_WIDTH}
        />
      )}
    </Group>
  );
}
