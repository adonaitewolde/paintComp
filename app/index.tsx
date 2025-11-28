import { useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";

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
          padding: 16,
          backgroundColor: "#007AFF",
          borderRadius: 8,
        }}
      >
        <Text style={{ color: "white", fontWeight: "600" }}>Test Canvas</Text>
      </Pressable>
    </View>
  );
}
