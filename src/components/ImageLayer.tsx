import { Group, Image, Skia, useImage } from "@shopify/react-native-skia";
import React from "react";

type ImageLayerProps = {
  uri: string;
  x: number;
  y: number;
  width: number;
  height: number;
  borderRadius?: number;
};

const DEFAULT_BORDER_RADIUS = 18;

export function ImageLayer({
  uri,
  x,
  y,
  width,
  height,
  borderRadius = DEFAULT_BORDER_RADIUS,
}: ImageLayerProps) {
  const image = useImage(uri);

  if (!image) {
    return null;
  }

  const clip = Skia.RRectXY(
    Skia.XYWHRect(x, y, width, height),
    borderRadius,
    borderRadius
  );

  return (
    <Group clip={clip}>
      <Image image={image} x={x} y={y} width={width} height={height} />
    </Group>
  );
}
