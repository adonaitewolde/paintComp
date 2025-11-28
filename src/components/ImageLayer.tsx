import { Image, useImage } from "@shopify/react-native-skia";
import React from "react";

type ImageLayerProps = {
  uri: string;
  index: number;
};

export function ImageLayer({ uri, index }: ImageLayerProps) {
  const image = useImage(uri);

  if (!image) {
    return null;
  }

  return (
    <Image
      image={image}
      x={index * 50}
      y={index * 50}
      width={200}
      height={200}
    />
  );
}
