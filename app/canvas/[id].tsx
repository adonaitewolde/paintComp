import React, { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { BoardCanvas } from "../../src/components/BoardCanvas";
import { ImportButton } from "../../src/components/ImportButton";
import {
  pickImagesFromLibrary,
  takePhotoWithCamera,
} from "../../src/services/images/imagePicker";

export default function CanvasScreen() {
  const [importedImages, setImportedImages] = useState<string[]>([]);

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

      setImportedImages((prev) => {
        const updated = [...prev, ...uris];
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

      setImportedImages((prev) => {
        const updated = [...prev, ...uris];
        console.log("Photo captured. Images total:", updated.length);
        return updated;
      });
    } catch (error) {
      console.error("Error capturing photo:", error);
      Alert.alert("Error", "The photo could not be taken.");
    }
  };

  return (
    <View style={styles.container}>
      <BoardCanvas imageUris={importedImages} />
      <ImportButton onPress={handleImportPress} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
