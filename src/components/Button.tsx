import React, { ReactNode } from "react";
import { TouchableOpacity, Text, View } from "react-native";
import { colors } from "../constants/colors";

type ButtonProps = {
  title: string;
  onPress: () => void;
  icon?: ReactNode;
  style?: any;
};

export default function Button({ title, onPress, icon, style }: ButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        {
          backgroundColor: colors.primary,
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