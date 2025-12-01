import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { BoardCanvas, ImageData } from "../../src/components/BoardCanvas";
import { ImportButton } from "../../src/components/ImportButton";
import { boardService } from "../../src/services/database/boardService";
import { imageService } from "../../src/services/database/imageService";
import { storageService } from "../../src/services/database/mmkvStorage";
import {
  importImagesFromLibrary,
  importPhotoFromCamera,
  showImportImageDialog,
} from "../../src/services/images/imageImport";

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
      // Calculate max zIndex from existing images to place new images on top
      const maxZIndex = Math.max(
        ...importedImages.map((img) => img.zIndex ?? 0),
        -1
      );

      // Set zIndex for new images so they appear on top
      const imagesWithZIndex = newImages.map((image, index) => ({
        ...image,
        zIndex: maxZIndex + 1 + index,
      }));

      // Save images to database
      const savedImages = await Promise.all(
        imagesWithZIndex.map((image) =>
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
      // Calculate max zIndex from existing images to place new images on top
      const maxZIndex = Math.max(
        ...importedImages.map((img) => img.zIndex ?? 0),
        -1
      );

      // Set zIndex for new images so they appear on top
      const imagesWithZIndex = newImages.map((image, index) => ({
        ...image,
        zIndex: maxZIndex + 1 + index,
      }));

      // Save images to database
      const savedImages = await Promise.all(
        imagesWithZIndex.map((image) =>
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

        // Note: BoardCanvas now loads the viewport transform itself via boardId prop
        // The transform will be synced back via handleTransformChange when user interacts

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

  // Handle image selection - bring to front
  const handleImageSelect = (index: number | null) => {
    if (index !== null) {
      const image = importedImages[index];
      if (image) {
        // Bring selected image to front
        const maxZIndex = Math.max(
          ...importedImages.map((img) => img.zIndex ?? 0),
          -1
        );
        const newZIndex = maxZIndex + 1;

        setImportedImages((prev) => {
          const updated = [...prev];
          updated[index] = { ...updated[index], zIndex: newZIndex };
          return updated;
        });

        // Save to database
        if (image.id) {
          imageService.updateZIndex(image.id, newZIndex).catch((error) => {
            console.error("Error updating image zIndex:", error);
          });
        }
      }
    }
    setSelectedImageIndex(index);
  };

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
        boardId={boardId}
        onTransformChange={handleTransformChange}
        selectedImageIndex={selectedImageIndex}
        onImageSelect={handleImageSelect}
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
