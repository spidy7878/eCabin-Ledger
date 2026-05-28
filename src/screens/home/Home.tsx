import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Card from "../../components/Card";
import Button from "../../components/Button";
import { spacing } from "../../constants/spacing";
import { colors } from "../../constants/colors";

const ProgressBarLine = ({ percent }: { percent: number }) => (
  <View style={{ height: 6, backgroundColor: colors.secondary, borderRadius: 3, marginVertical: 8, overflow: "hidden" }}>
    <View style={{ height: "100%", width: `${percent}%`, backgroundColor: colors.primary }} />
  </View>
);

const MsnPill = ({ label, active, onPress }: { label: string; active?: boolean; onPress?: () => void }) => (
  <TouchableOpacity
    onPress={onPress}
    style={{
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: active ? colors.primary : colors.border,
      backgroundColor: active ? colors.primary : "white",
      marginRight: 8,
    }}
  >
    <Text style={{ color: active ? "white" : colors.text, fontWeight: active ? "600" : "400" }}>{label}</Text>
  </TouchableOpacity>
);

const StatusCard = ({ icon, title, percent, subLeft, subRight, subRightColor = colors.text }: any) => (
  <View style={{ marginBottom: 12 }}>
    <Card>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View style={{ backgroundColor: colors.primary, width: 36, height: 36, borderRadius: 8, alignItems: "center", justifyContent: "center", marginRight: 12 }}>
            <Text style={{ color: "white", fontSize: 16 }}>{icon}</Text>
          </View>
          <Text style={{ fontSize: 16, fontWeight: "600", color: colors.primary }}>{title}</Text>
        </View>
        <Text style={{ fontWeight: "700", color: colors.primary }}>{percent}%</Text>
      </View>
      <ProgressBarLine percent={percent} />
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={{ fontSize: 12, color: "#6B7280" }}>{subLeft}</Text>
        <Text style={{ fontSize: 12, color: subRightColor, fontWeight: "500" }}>{subRight}</Text>
      </View>
    </Card>
  </View>
);

export default function Home() {
  const insets = useSafeAreaInsets();
  const [activeMsn, setActiveMsn] = useState("36324");

  return (
    <View style={{ flex: 1, backgroundColor: "#F7F9FB" }}>
      <ScrollView contentContainerStyle={{ paddingTop: 140 + insets.top, paddingHorizontal: spacing.md, paddingBottom: (insets.bottom || 0) + 100 }}>
        <Text style={{ fontSize: 22, fontWeight: "700", color: colors.primary, marginBottom: 20 }}>
          Welcome back, User
        </Text>

        <Text style={{ fontSize: 12, fontWeight: "700", color: colors.text, marginBottom: 10 }}>
          SELECT AIRCRAFT (MSN)
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 24 }}>
          {["36324", "36325", "36326", "36327"].map((msn) => (
            <MsnPill 
              key={msn} 
              label={msn} 
              active={activeMsn === msn} 
              onPress={() => setActiveMsn(msn)} 
            />
          ))}
        </ScrollView>

        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 12 }}>
          <Text style={{ fontSize: 12, fontWeight: "700", color: colors.text, width: 140 }}>OVERALL INSPECTION STATUS</Text>
          <Text style={{ fontSize: 10, color: "#6B7280", textAlign: "right" }}>Last synced: 08:42 AM</Text>
        </View>

        <StatusCard
          icon="🚘"
          title="Passenger Cabin"
          percent={85}
          subLeft="117 / 138 Inspected"
          subRight="⚠️ 2 Defects"
          subRightColor={colors.danger}
        />
        <StatusCard
          icon="🍴"
          title="Galley"
          percent={40}
          subLeft="4 / 10 Tasks Done"
          subRight="No Defects Found"
        />
        <StatusCard
          icon="🚻"
          title="Lavatory"
          percent={16}
          subLeft="2 / 20 Points Checked"
          subRight="Pending Start"
          subRightColor={colors.success}
        />
        <StatusCard
          icon="💺"
          title="Attendant Seat"
          percent={0}
          subLeft="0 / 4 Lavatories"
          subRight="Not Started"
        />
      </ScrollView>

      {/* Sticky Bottom Wrap */}
      <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, paddingHorizontal: 16, paddingTop: 16, paddingBottom: (insets.bottom || 16) + 12, backgroundColor: "white", borderTopWidth: 1, borderTopColor: "#E5E7EB", zIndex: 10 }}>
        <Button
          title="Resume Latest Task (Galley G1)"
          onPress={() => {}}
          icon={<Text style={{ color: "white" }}>▶</Text>}
          style={{ flexDirection: "row-reverse", justifyContent: "center" }}
        />
      </View>
    </View>
  );
}
