import React from "react";
import { View, Text } from "react-native";
import { colors } from "../constants/colors";

interface Props {
  done: number;
  total: number;
  label: string;
}

export default function ZoneProgressBar({ done, total, label }: Props) {
  if (total === 0) return null;
  const pct      = Math.min(done / total, 1);
  const complete = done >= total;
  const color    = complete ? "#22C55E" : colors.primary;

  return (
    <View
      style={{
        backgroundColor: "white",
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 8,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: complete ? "#BBF7D0" : "#E5E7EB",
      }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 5 }}>
        <Text style={{ fontSize: 11, color: "#6B7280" }}>{label}</Text>
        <Text style={{ fontSize: 11, fontWeight: "700", color }}>
          {done}/{total}{complete ? " ✓" : ""}
        </Text>
      </View>
      <View style={{ height: 5, borderRadius: 3, backgroundColor: "#E5E7EB" }}>
        <View
          style={{
            height: 5,
            borderRadius: 3,
            backgroundColor: color,
            width: `${(pct * 100).toFixed(0)}%` as any,
          }}
        />
      </View>
    </View>
  );
}
