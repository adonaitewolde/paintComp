import { Alert, Dimensions, Image } from "react-native";
import { ImageData } from "../../components/BoardCanvas";
import { pickImagesFromLibrary, takePhotoWithCamera } from "./imagePicker";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// Default size for imported images (can be adjusted)
const DEFAULT_IMAGE_SIZE = 300;

// Get the actual dimensions of an image
export const getImageDimensions = (
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
export const createCenteredImage = (
  uri: string,
  originalDimensions: { width: number; height: number },
  currentTransform: { x: number; y: number }
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
  const viewportCenterX = SCREEN_WIDTH / 2;
  const viewportCenterY = SCREEN_HEIGHT / 2;

  // Account for current pan/translation
  const canvasCenterX = viewportCenterX - currentTransform.x;
  const canvasCenterY = viewportCenterY - currentTransform.y;

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

type ImportImageCallbacks = {
  onGalleryPress: () => void;
  onCameraPress: () => void;
};

export const showImportImageDialog = (
  callbacks: ImportImageCallbacks
): void => {
  Alert.alert(
    "Import image",
    "Where would you like to import the image from?",
    [
      {
        text: "Gallery",
        onPress: callbacks.onGalleryPress,
      },
      {
        text: "Camera",
        onPress: callbacks.onCameraPress,
      },
      {
        text: "Cancel",
        style: "cancel" as const,
      },
    ]
  );
};

export const importImagesFromLibrary = async (currentTransform: {
  x: number;
  y: number;
}): Promise<ImageData[]> => {
  try {
    const { uris } = await pickImagesFromLibrary();
    if (!uris.length) return [];

    // Get dimensions for each image and create ImageData objects
    const newImages = await Promise.all(
      uris.map(async (uri) => {
        const dimensions = await getImageDimensions(uri);
        return createCenteredImage(uri, dimensions, currentTransform);
      })
    );

    console.log(
      "Images imported:",
      uris.length,
      newImages.length,
      "images total"
    );
    return newImages;
  } catch (error) {
    console.error("Error importing from gallery:", error);
    Alert.alert("Error", "The image could not be imported.");
    return [];
  }
};

export const importPhotoFromCamera = async (currentTransform: {
  x: number;
  y: number;
}): Promise<ImageData[]> => {
  try {
    const { uris } = await takePhotoWithCamera();
    if (!uris.length) return [];

    // Get dimensions for the photo and create ImageData object
    const newImages = await Promise.all(
      uris.map(async (uri) => {
        const dimensions = await getImageDimensions(uri);
        return createCenteredImage(uri, dimensions, currentTransform);
      })
    );

    console.log("Photo captured. Images:", newImages.length);
    return newImages;
  } catch (error) {
    console.error("Error capturing photo:", error);
    Alert.alert("Error", "The photo could not be taken.");
    return [];
  }
};
