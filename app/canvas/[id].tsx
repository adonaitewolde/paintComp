import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { BoardCanvas, ImageData } from "../../src/components/BoardCanvas";
import { ImportButton } from "../../src/components/ImportButton";
import { boardService } from "../../src/services/database/boardService";
import { imageService } from "../../src/services/database/imageService";
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
  const imageSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  const handleImportPress = async () => {
    showImportImageDialog({
      onGalleryPress: handlePickFromLibrary,
      onCameraPress: handleTakePhoto,
    });
  };

  const handlePickFromLibrary = async () => {
    if (!boardId) return;

    const newImages = await importImagesFromLibrary(currentTransform.current);
    if (newImages.length > 0) {
      // Save images to database
      const savedImages = await Promise.all(
        newImages.map((image) =>
          imageService.create(image, boardId).then((id) => ({
            ...image,
            id,
          }))
        )
      );

      setImportedImages((prev) => [...prev, ...savedImages]);
    }
  };

  const handleTakePhoto = async () => {
    if (!boardId) return;

    const newImages = await importPhotoFromCamera(currentTransform.current);
    if (newImages.length > 0) {
      // Save images to database
      const savedImages = await Promise.all(
        newImages.map((image) =>
          imageService.create(image, boardId).then((id) => ({
            ...image,
            id,
          }))
        )
      );

      setImportedImages((prev) => [...prev, ...savedImages]);
    }
  };

  // Load board and images on mount
  useEffect(() => {
    if (!boardId) return;

    const loadBoardData = async () => {
      try {
        // Check if board exists, create if not
        let board = await boardService.getById(boardId);
        if (!board) {
          // Create board with default name
          await boardService.create(`Board ${boardId.slice(-8)}`);
        }

        // Load images from database
        const images = await imageService.getByBoardId(boardId);
        setImportedImages(images);

        // Load saved viewport transform from MMKV
        const savedTransform = storageService.getViewportTransform(boardId);
        if (savedTransform) {
          currentTransform.current = savedTransform;
          // Note: BoardCanvas doesn't support initial transform prop yet
          // This will be restored when user pans (which triggers handleTransformChange)
        }

        // Save last viewed board
        storageService.setLastBoardId(boardId);
      } catch (error) {
        console.error("Error loading board data:", error);
      }
    };

    loadBoardData();
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

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      if (imageSaveTimeoutRef.current) {
        clearTimeout(imageSaveTimeoutRef.current);
      }
    };
  }, []);

  // Handle image position updates when dragging (debounced DB save)
  const handleImageMove = (index: number, x: number, y: number) => {
    setImportedImages((prev) => {
      const updated = [...prev];
      const image = updated[index];
      if (!image) return prev;

      updated[index] = {
        ...image,
        x,
        y,
      };

      // Debounce database update (save after 500ms of no changes)
      if (imageSaveTimeoutRef.current) {
        clearTimeout(imageSaveTimeoutRef.current);
      }

      if (image.id) {
        imageSaveTimeoutRef.current = setTimeout(() => {
          imageService.updatePosition(image.id!, x, y).catch((error) => {
            console.error("Error updating image position:", error);
          });
        }, 500);
      }

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
