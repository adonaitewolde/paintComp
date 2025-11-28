import * as ImagePicker from "expo-image-picker";
import { Alert, Platform } from "react-native";

export type PickImagesResult = {
  uris: string[];
};

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

export async function pickImagesFromLibrary(): Promise<PickImagesResult> {
  const hasPermission = await requestPermissions();
  if (!hasPermission) {
    return { uris: [] };
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsMultipleSelection: true,
    quality: 1,
  });

  if (result.canceled || !result.assets) {
    return { uris: [] };
  }

  return {
    uris: result.assets.map((asset) => asset.uri),
  };
}

export async function takePhotoWithCamera(): Promise<PickImagesResult> {
  const hasPermission = await requestPermissions();
  if (!hasPermission) {
    return { uris: [] };
  }

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ["images"],
    quality: 1,
  });

  if (result.canceled || !result.assets || !result.assets[0]) {
    return { uris: [] };
  }

  return {
    uris: [result.assets[0].uri],
  };
}
