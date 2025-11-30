import { useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { borderRadius, colors, spacing } from "../src/utils/designTokens";

export default function Index() {
  const router = useRouter();

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        gap: 20,
      }}
    >
      {/* Temporary test button */}
      <Pressable
        onPress={() =>
          router.push({
            pathname: "/canvas/[id]",
            params: { id: "test-123" },
          })
        }
        style={{
          padding: spacing.lg,
          backgroundColor: colors.accent.primary,
          borderRadius: borderRadius.sm,
        }}
      >
        <Text style={{ color: colors.text.white, fontWeight: "600" }}>
          Test Canvas
        </Text>
      </Pressable>
    </View>
  );
}
