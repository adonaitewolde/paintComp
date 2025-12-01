import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { Alert, Platform } from "react-native";
import { PickImagesResult } from "../../types";

async function requestPermissions(): Promise<boolean> {
  if (Platform.OS === "web") {
    return true;
  }

  const { status: cameraStatus } =
    await ImagePicker.requestCameraPermissionsAsync();
  const { status: mediaLibraryStatus } =
    await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (cameraStatus !== "granted" || mediaLibraryStatus !== "granted") {
    Alert.alert(
      "Permission needed",
      "We need access to your camera and photo library to import images."
    );
    return false;
  }

  return true;
}

async function convertToJpegIfNeeded(uri: string): Promise<string> {
  // Check if the file is HEIC format
  if (
    uri.toLowerCase().endsWith(".heic") ||
    uri.toLowerCase().endsWith(".heif")
  ) {
    try {
      console.log(`[ImagePicker] Converting HEIC to JPEG: ${uri}`);
      const result = await ImageManipulator.manipulateAsync(uri, [], {
        compress: 0.8,
        format: ImageManipulator.SaveFormat.JPEG,
      });
      console.log(`[ImagePicker] Converted to JPEG: ${result.uri}`);
      return result.uri;
    } catch (error) {
      console.error(`[ImagePicker] Failed to convert HEIC to JPEG:`, error);
      // Fallback: return original URI
      return uri;
    }
  }
  return uri;
}

async function optimizeImageSize(
  uri: string,
  originalWidth: number,
  originalHeight: number
): Promise<string> {
  // Maximum dimension for display (images are shown at max 50% of viewport)
  // Using 2048px max to balance quality and memory usage
  const maxDimension = 2048;

  // Only resize if image is larger than max dimension
  if (originalWidth <= maxDimension && originalHeight <= maxDimension) {
    return uri;
  }

  try {
    const scale = Math.min(
      maxDimension / originalWidth,
      maxDimension / originalHeight
    );
    const newWidth = Math.round(originalWidth * scale);
    const newHeight = Math.round(originalHeight * scale);

    console.log(
      `[ImagePicker] Resizing image from ${originalWidth}x${originalHeight} to ${newWidth}x${newHeight}`
    );

    const resized = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: newWidth, height: newHeight } }],
      {
        compress: 0.8,
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );

    return resized.uri;
  } catch (error) {
    console.error(`[ImagePicker] Failed to resize image:`, error);
    return uri;
  }
}

export async function pickImagesFromLibrary(): Promise<PickImagesResult> {
  const hasPermission = await requestPermissions();
  if (!hasPermission) {
    return { uris: [] };
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsMultipleSelection: true,
    quality: 0.7, // Reduced from 1 to improve performance
  });

  if (result.canceled || !result.assets) {
    return { uris: [] };
  }

  const uris = await Promise.all(
    result.assets.map(async (asset) => {
      console.log(
        `[ImagePicker] Gallery asset URI: ${asset.uri}, type: ${asset.type}, width: ${asset.width}, height: ${asset.height}`
      );
      // Convert HEIC to JPEG if needed
      let processedUri = await convertToJpegIfNeeded(asset.uri);
      // Optimize image size to reduce memory usage
      processedUri = await optimizeImageSize(
        processedUri,
        asset.width,
        asset.height
      );
      return processedUri;
    })
  );

  return {
    uris,
  };
}

export async function takePhotoWithCamera(): Promise<PickImagesResult> {
  const hasPermission = await requestPermissions();
  if (!hasPermission) {
    return { uris: [] };
  }

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ["images"],
    quality: 0.7, // Reduced from 1 to improve performance
  });

  if (result.canceled || !result.assets || !result.assets[0]) {
    return { uris: [] };
  }

  const asset = result.assets[0];
  const originalUri = asset.uri;
  console.log(
    `[ImagePicker] Camera asset URI: ${originalUri}, type: ${asset.type}, width: ${asset.width}, height: ${asset.height}`
  );

  // Convert HEIC to JPEG if needed
  let processedUri = await convertToJpegIfNeeded(originalUri);
  // Optimize image size to reduce memory usage
  processedUri = await optimizeImageSize(
    processedUri,
    asset.width,
    asset.height
  );

  return {
    uris: [processedUri],
  };
}
