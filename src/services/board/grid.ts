import { Skia } from "@shopify/react-native-skia";
import { GRID_SPACING, WORLD_SIZE_MULTIPLIER } from "../../utils/constants";

export const createGridPath = (
  width: number,
  height: number,
  spacing: number = GRID_SPACING,
  multiplier: number = WORLD_SIZE_MULTIPLIER
) => {
  const path = Skia.Path.Make();
  const maxSize = Math.max(width, height) * multiplier;

  for (let x = -maxSize; x <= maxSize; x += spacing) {
    path.moveTo(x, -maxSize);
    path.lineTo(x, maxSize);
  }

  for (let y = -maxSize; y <= maxSize; y += spacing) {
    path.moveTo(-maxSize, y);
    path.lineTo(maxSize, y);
  }

  return path;
};
