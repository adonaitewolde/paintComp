import React from "react";
import { Pressable, StyleSheet, Text, ViewStyle } from "react-native";

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
    bottom: 24,
    left: 24,
    width: 56,
    height: 56,
    backgroundColor: "#1A1A1A",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  icon: {
    color: "#FFFFFF",
    fontSize: 40,
    fontWeight: "300",
    lineHeight: 40,
  },
});
