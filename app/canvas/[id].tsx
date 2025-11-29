import React, { useRef, useState } from "react";
import { Alert, Dimensions, Image, StyleSheet, View } from "react-native";
import { BoardCanvas, ImageData } from "../../src/components/BoardCanvas";
import { ImportButton } from "../../src/components/ImportButton";
import {
  pickImagesFromLibrary,
  takePhotoWithCamera,
} from "../../src/services/images/imagePicker";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// Default size for imported images (can be adjusted)
const DEFAULT_IMAGE_SIZE = 300;

export default function CanvasScreen() {
  const [importedImages, setImportedImages] = useState<ImageData[]>([]);
  const currentTransform = useRef({ x: 0, y: 0 });

  const handleImportPress = async () => {
    Alert.alert(
      "Import image",
      "Where would you like to import the image from?",
      [
        {
          text: "Gallery",
          onPress: handlePickFromLibrary,
        },
        {
          text: "Camera",
          onPress: handleTakePhoto,
        },
        {
          text: "Cancel",
          style: "cancel" as const,
        },
      ]
    );
  };

  const handlePickFromLibrary = async () => {
    try {
      const { uris } = await pickImagesFromLibrary();
      if (!uris.length) return;

      // Get dimensions for each image and create ImageData objects
      const newImages = await Promise.all(
        uris.map(async (uri) => {
          const dimensions = await getImageDimensions(uri);
          return createCenteredImage(uri, dimensions);
        })
      );

      setImportedImages((prev) => {
        const updated = [...prev, ...newImages];
        console.log(
          "Images imported:",
          uris.length,
          updated.length,
          "images total"
        );
        return updated;
      });
    } catch (error) {
      console.error("Error importing from gallery:", error);
      Alert.alert("Error", "The image could not be imported.");
    }
  };

  const handleTakePhoto = async () => {
    try {
      const { uris } = await takePhotoWithCamera();
      if (!uris.length) return;

      // Get dimensions for the photo and create ImageData object
      const newImages = await Promise.all(
        uris.map(async (uri) => {
          const dimensions = await getImageDimensions(uri);
          return createCenteredImage(uri, dimensions);
        })
      );

      setImportedImages((prev) => {
        const updated = [...prev, ...newImages];
        console.log("Photo captured. Images total:", updated.length);
        return updated;
      });
    } catch (error) {
      console.error("Error capturing photo:", error);
      Alert.alert("Error", "The photo could not be taken.");
    }
  };

  // Get the actual dimensions of an image
  const getImageDimensions = (
    uri: string
  ): Promise<{ width: number; height: number }> => {
    return new Promise((resolve, reject) => {
      Image.getSize(
        uri,
        (width, height) => resolve({ width, height }),
        (error) => {
          console.error("Error getting image dimensions:", error);
          resolve({ width: DEFAULT_IMAGE_SIZE, height: DEFAULT_IMAGE_SIZE });
        }
      );
    });
  };

  // Create an ImageData object centered in the current viewport
  const createCenteredImage = (
    uri: string,
    originalDimensions: { width: number; height: number }
  ): ImageData => {
    // Calculate display size (maintain aspect ratio, max dimension = DEFAULT_IMAGE_SIZE)
    const aspectRatio = originalDimensions.width / originalDimensions.height;
    let displayWidth = DEFAULT_IMAGE_SIZE;
    let displayHeight = DEFAULT_IMAGE_SIZE;

    if (aspectRatio > 1) {
      // Landscape
      displayHeight = DEFAULT_IMAGE_SIZE / aspectRatio;
    } else {
      // Portrait or square
      displayWidth = DEFAULT_IMAGE_SIZE * aspectRatio;
    }

    // Calculate viewport center in canvas coordinates
    // The viewport center is at (SCREEN_WIDTH/2, SCREEN_HEIGHT/2)
    // In canvas space (accounting for the transform), this maps to:
    // canvasX = viewportX - translateX
    // canvasY = viewportY - translateY
    const viewportCenterX = SCREEN_WIDTH / 2;
    const viewportCenterY = SCREEN_HEIGHT / 2;

    // Account for current pan/translation
    // The transform centers around viewport center, so we need to account for that
    const canvasCenterX = viewportCenterX - currentTransform.current.x;
    const canvasCenterY = viewportCenterY - currentTransform.current.y;

    // Position image so its center is at the viewport center
    const x = canvasCenterX - displayWidth / 2;
    const y = canvasCenterY - displayHeight / 2;

    console.log(
      `Centering image at canvas position (${x.toFixed(1)}, ${y.toFixed(1)}) ` +
        `with size ${displayWidth.toFixed(1)}x${displayHeight.toFixed(1)}`
    );

    return {
      uri,
      x,
      y,
      width: displayWidth,
      height: displayHeight,
    };
  };

  // Track transform changes from the canvas
  const handleTransformChange = (translateX: number, translateY: number) => {
    currentTransform.current = { x: translateX, y: translateY };
  };

  return (
    <View style={styles.container}>
      <BoardCanvas
        images={importedImages}
        onTransformChange={handleTransformChange}
      />
      <ImportButton onPress={handleImportPress} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
