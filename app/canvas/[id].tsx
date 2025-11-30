import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { BoardCanvas, ImageData } from "../../src/components/BoardCanvas";
import { ImportButton } from "../../src/components/ImportButton";
import {
  importImagesFromLibrary,
  importPhotoFromCamera,
  showImportImageDialog,
} from "../../src/services/images/imageImport";
import { storageService } from "../../src/services/storage/mmkvStorage";

export default function CanvasScreen() {
  const { id: boardId } = useLocalSearchParams<{ id: string }>();
  const [importedImages, setImportedImages] = useState<ImageData[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(
    null
  );
  const currentTransform = useRef({ x: 0, y: 0 });
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Load saved viewport transform on mount
  useEffect(() => {
    if (!boardId) return;

    // Load saved viewport transform from MMKV
    const savedTransform = storageService.getViewportTransform(boardId);
    if (savedTransform) {
      currentTransform.current = savedTransform;
      // Note: BoardCanvas doesn't support initial transform prop yet
      // This will be restored when user pans (which triggers handleTransformChange)
    }

    // Save last viewed board
    storageService.setLastBoardId(boardId);
  }, [boardId]);

  // Track transform changes from the canvas and save to MMKV (debounced)
  const handleTransformChange = (translateX: number, translateY: number) => {
    currentTransform.current = { x: translateX, y: translateY };

    // Debounce MMKV writes (save after 500ms of no changes)
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    if (boardId) {
      saveTimeoutRef.current = setTimeout(() => {
        storageService.setViewportTransform(boardId, translateX, translateY);
      }, 500);
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

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
