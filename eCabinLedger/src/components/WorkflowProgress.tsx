import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { colors } from "../constants/colors";

const STEPS = [
  { icon: "💺", label: "Seats" },
  { icon: "🍴", label: "Galley" },
  { icon: "🚻", label: "Lavatory" },
  { icon: "🧑‍✈️", label: "Attendant" },
];

interface Props {
  /** 0 = Seats, 1 = Galley, 2 = Lavatory, 3 = Attendant */
  step: 0 | 1 | 2 | 3;
  onExit: () => void;
}

export default function WorkflowProgress({ step, onExit }: Props) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#EEF2FF",
        borderRadius: 12,
        padding: 12,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: "#C7D2FE",
      }}
    >
      {/* step dots + connectors */}
      <View style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
        {STEPS.map(({ icon, label }, index) => (
          <React.Fragment key={label}>
            {/* dot */}
            <View style={{ alignItems: "center" }}>
              <View
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 15,
                  backgroundColor:
                    index < step  ? "#22C55E"
                    : index === step ? colors.primary
                    : "#E5E7EB",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text
                  style={{
                    fontSize: index < step ? 12 : 11,
                    fontWeight: "700",
                    color: index <= step ? "white" : "#9CA3AF",
                  }}
                >
                  {index < step ? "✓" : String(index + 1)}
                </Text>
              </View>
              <Text
                style={{
                  fontSize: 10,
                  marginTop: 3,
                  fontWeight: index === step ? "700" : "400",
                  color:
                    index < step  ? "#22C55E"
                    : index === step ? colors.primary
                    : "#9CA3AF",
                }}
              >
                {icon} {label}
              </Text>
            </View>
            {/* connector line */}
            {index < STEPS.length - 1 && (
              <View
                style={{
                  height: 2,
                  flex: 1,
                  backgroundColor: index < step ? "#22C55E" : "#D1D5DB",
                  marginHorizontal: 4,
                  marginBottom: 16,
                }}
              />
            )}
          </React.Fragment>
        ))}
      </View>

      {/* exit button */}
      <TouchableOpacity
        onPress={onExit}
        style={{
          marginLeft: 10,
          padding: 6,
          borderRadius: 14,
          backgroundColor: "#E0E7FF",
        }}
      >
        <Text style={{ fontSize: 11, color: "#6B7280", fontWeight: "600" }}>✕</Text>
      </TouchableOpacity>
    </View>
  );
}
