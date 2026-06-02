import React, { ReactNode } from "react";
import { TouchableOpacity, Text, View } from "react-native";
import { colors } from "../constants/colors";

type ButtonProps = {
  title: string;
  onPress: () => void;
  icon?: ReactNode;
  style?: any;
  disabled?: boolean;
};

export default function Button({ title, onPress, icon, style, disabled }: ButtonProps) {
  return (
    <TouchableOpacity
      onPress={disabled ? undefined : onPress}
      activeOpacity={disabled ? 1 : 0.7}
      style={[
        {
          backgroundColor: disabled ? "#9CA3AF" : colors.primary,
          padding: 14,
          borderRadius: 10,
          alignItems: "center",
          flexDirection: "row",
          justifyContent: "center",
        },
        style,
      ]}
    >
      <Text style={{ color: "white", fontWeight: "600", marginRight: icon ? 8 : 0 }}>{title}</Text>
      {icon ? <View>{icon}</View> : null}
    </TouchableOpacity>
  );
}