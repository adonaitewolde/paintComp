import { Image, useImage } from "@shopify/react-native-skia";
import React from "react";

type ImageLayerProps = {
  uri: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

export function ImageLayer({ uri, x, y, width, height }: ImageLayerProps) {
  const image = useImage(uri);

  if (!image) {
    return null;
  }

  return <Image image={image} x={x} y={y} width={width} height={height} />;
}
