import React, { useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { BoardCanvas, ImageData } from "../../src/components/BoardCanvas";
import { ImportButton } from "../../src/components/ImportButton";
import {
  importImagesFromLibrary,
  importPhotoFromCamera,
  showImportImageDialog,
} from "../../src/services/images/imageImport";

export default function CanvasScreen() {
  const [importedImages, setImportedImages] = useState<ImageData[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(
    null
  );
  const currentTransform = useRef({ x: 0, y: 0 });

  const handleImportPress = async () => {
    showImportImageDialog({
      onGalleryPress: handlePickFromLibrary,
      onCameraPress: handleTakePhoto,
    });
  };

  const handlePickFromLibrary = async () => {
    const newImages = await importImagesFromLibrary(currentTransform.current);
    if (newImages.length > 0) {
      setImportedImages((prev) => [...prev, ...newImages]);
    }
  };

  const handleTakePhoto = async () => {
    const newImages = await importPhotoFromCamera(currentTransform.current);
    if (newImages.length > 0) {
      setImportedImages((prev) => [...prev, ...newImages]);
    }
  };

  // Track transform changes from the canvas
  const handleTransformChange = (translateX: number, translateY: number) => {
    currentTransform.current = { x: translateX, y: translateY };
  };

  // Handle image position updates when dragging
  const handleImageMove = (index: number, x: number, y: number) => {
    setImportedImages((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        x,
        y,
      };
      return updated;
    });
  };

  return (
    <View style={styles.container}>
      <BoardCanvas
        images={importedImages}
        onTransformChange={handleTransformChange}
        selectedImageIndex={selectedImageIndex}
        onImageSelect={setSelectedImageIndex}
        onImageMove={handleImageMove}
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
