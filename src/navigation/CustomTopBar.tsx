import React from "react";
import { View, Text, Image, TouchableOpacity, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../constants/colors";
import { useWorkflow } from "../context/WorkflowContext";

const TAB_ICONS: Record<string, string> = {
  Home: "🏠",
  Seats: "💺",
  Galley: "🍴",
  Lavatory: "🚻",
  Attendant: "🧑‍✈️",
};

const INSPECTION_TABS = ["Seats", "Galley", "Lavatory", "Attendant"];

export default function CustomTopBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();
  const { isWorkflow } = useWorkflow();

  return (
    <View style={{ 
      backgroundColor: "white", 
      position: "absolute", 
      top: 0, 
      left: 0, 
      right: 0, 
      zIndex: 100,
      paddingTop: insets.top, // Dynamic status bar margin
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 4,
    }}>
      {/* Top Header */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >

        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Image
            source={require("../../assets/logo.png")}
            style={{ width: 32, height: 32, marginRight: 8 }}
            resizeMode="contain"
          />
          <Text style={{ fontSize: 18, color: colors.primary, fontWeight: "700" }}>
            eCabin Ledger
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => navigation.getParent()?.navigate("Profile")}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: colors.primary,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ color: colors.primary }}>👤</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View
        style={{
          flexDirection: "row",
          paddingVertical: 8,
          paddingHorizontal: 8,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          justifyContent: "space-between",
        }}
      >
        {state.routes.map((route: any, index: number) => {
          const { options } = descriptors[route.key];
          const label =
            options.tabBarLabel !== undefined
              ? options.tabBarLabel
              : options.title !== undefined
              ? options.title
              : route.name;

          const isFocused = state.index === index;
          const isLocked = INSPECTION_TABS.includes(route.name) && !isWorkflow;

          const onPress = () => {
            if (isLocked) {
              Alert.alert(
                "No Active Inspection",
                "Select an aircraft on the Home screen and tap 'Start Inspection' to begin.",
                [{ text: "OK" }]
              );
              return;
            }
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate({ name: route.name, merge: true });
            }
          };

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              style={{
                alignItems: "center",
                justifyContent: "center",
                paddingVertical: 6,
                paddingHorizontal: 12,
                borderRadius: 8,
                backgroundColor: isFocused ? colors.primary : "transparent",
                opacity: isLocked ? 0.35 : 1,
              }}
            >
              <Text style={{ fontSize: 20, marginBottom: 2 }}>
                {TAB_ICONS[label] || "📄"}
              </Text>
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: isFocused ? "700" : "500",
                  color: isFocused ? "white" : "#6B7280",
                }}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}