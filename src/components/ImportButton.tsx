import React from "react";
import { Pressable, StyleSheet, Text, ViewStyle } from "react-native";
import { borderRadius, colors, spacing } from "../utils/designTokens";

type ImportButtonProps = {
  onPress: () => void;
  icon?: string;
  style?: ViewStyle;
};

export function ImportButton({
  onPress,
  icon = "+",
  style,
}: ImportButtonProps) {
  return (
    <Pressable style={[styles.button, style]} onPress={onPress}>
      <Text style={styles.icon}>{icon}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    position: "absolute",
    bottom: spacing.xl,
    left: spacing.xl,
    width: 56,
    height: 56,
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: colors.shadow,
    shadowOffset: {
      width: 2,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  icon: {
    color: colors.text.primary,
    fontSize: 40,
    fontWeight: "300",
    lineHeight: 40,
  },
});
