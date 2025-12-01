import { Skia } from "@shopify/react-native-skia";
import { SharedValue, useDerivedValue } from "react-native-reanimated";

export const useBoardTransform = (
  translateX: SharedValue<number>,
  translateY: SharedValue<number>,
  width: number,
  height: number
) => {
  const boardTransform = useDerivedValue(() => {
    const matrix = Skia.Matrix();

    const centerX = width / 2;
    const centerY = height / 2;

    matrix.translate(centerX, centerY);
    matrix.translate(translateX.value, translateY.value);
    matrix.translate(-centerX, -centerY);

    return matrix;
  });

  return boardTransform;
};
