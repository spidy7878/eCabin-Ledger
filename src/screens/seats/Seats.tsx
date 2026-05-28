import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, TextInput, Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Button from "../../components/Button";
import { spacing } from "../../constants/spacing";
import { colors } from "../../constants/colors";

const Pill = ({ label, active, onPress }: any) => (
  <TouchableOpacity
    onPress={onPress}
    style={{
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: active ? colors.primary : "#E5E7EB",
      backgroundColor: active ? colors.primary : "#F9FAFB",
      marginRight: 8,
      marginBottom: 8,
      minWidth: 64,
      alignItems: "center"
    }}
  >
    <Text style={{ color: active ? "white" : "#4B5563", fontWeight: active ? "600" : "500", fontSize: 12 }}>{label}</Text>
  </TouchableOpacity>
);

const SectionTitle = ({ title }: { title: string }) => (
  <View style={{ borderLeftWidth: 3, borderLeftColor: colors.primary, paddingLeft: 8, marginBottom: 12, marginTop: 16 }}>
    <Text style={{ fontSize: 12, fontWeight: "700", color: colors.primary }}>{title}</Text>
  </View>
);

export default function Seats() {
  const insets = useSafeAreaInsets();
  const [activeZone, setActiveZone] = useState("12A");
  const [activeItem, setActiveItem] = useState("Carpet");
  const [workflowTab, setWorkflowTab] = useState("VINYL");
  const [images, setImages] = useState<number[]>([1, 2, 3]);

  return (
    <View style={{ flex: 1, backgroundColor: "#F7F9FB" }}>
      <ScrollView contentContainerStyle={{ paddingTop: 140 + insets.top, paddingHorizontal: spacing.md, paddingBottom: (insets.bottom || 0) + 100 }}>

        <SectionTitle title="SELECT SEAT ZONE FOR N12345" />
        <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
          {["12A", "1AC", "15C", "30D"].map((z) => (
            <Pill key={z} label={z} active={activeZone === z} onPress={() => setActiveZone(z)} />
          ))}
        </View>

        <SectionTitle title={`SELECT ITEM FOR ${activeZone}`} />
        <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
          {["Carpet", "Side Wall", "Seat Center"].map((i) => (
            <Pill key={i} label={i} active={activeItem === i} onPress={() => setActiveItem(i)} />
          ))}
        </View>

        <SectionTitle title="INSPECTION WORKFLOW" />
        <View style={{ borderWidth: 1, borderColor: "#D1D5DB", borderRadius: 12, padding: 16, backgroundColor: "white" }}>

          {/* Workflow Tabs */}
          <View style={{ flexDirection: "row", marginBottom: 20 }}>
            {["VINYL", "EMER D/IOR PANEL"].map((t) => (
              <TouchableOpacity
                key={t}
                onPress={() => setWorkflowTab(t)}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  backgroundColor: workflowTab === t ? colors.primary : "#F3F4F6",
                  borderRadius: 8,
                  marginRight: 8,
                  alignItems: "center",
                  flexDirection: "row",
                  justifyContent: "center"
                }}
              >
                <Text style={{ fontSize: 12, color: workflowTab === t ? "white" : "#6B7280", marginRight: 4 }}>{workflowTab === t ? "📄" : "📄"}</Text>
                <Text style={{ fontSize: 12, fontWeight: "600", color: workflowTab === t ? "white" : "#6B7280" }}>{t}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={{ padding: 12, backgroundColor: "#F3F4F6", borderRadius: 8, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ color: "#6B7280" }}>➕</Text>
            </TouchableOpacity>
          </View>

          {/* Pictures */}
          <Text style={{ fontSize: 12, fontWeight: "700", color: colors.primary, marginBottom: 12 }}>
            📸 TAKE MULTIPLE PICTURES <Text style={{ color: "#6B7280", fontWeight: "400" }}>(Images required)</Text>
          </Text>

          <View style={{ flexDirection: "row", marginBottom: 24, gap: 8 }}>
            <TouchableOpacity onPress={() => setImages([...images, Date.now()])} style={{ width: 64, height: 64, borderWidth: 1, borderStyle: "dashed", borderColor: "#9CA3AF", borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: "#F9FAFB" }}>
              <Text style={{ fontSize: 20, color: "#9CA3AF" }}>+</Text>
              <Text style={{ fontSize: 10, color: "#9CA3AF", marginTop: 2 }}>Add</Text>
            </TouchableOpacity>
            {/* Dummy Images */}
            {images.map((i) => (
              <View key={i} style={{ width: 64, height: 64, borderRadius: 8, backgroundColor: "#E5E7EB" }}>
                <TouchableOpacity onPress={() => setImages(images.filter(img => img !== i))} style={{ position: "absolute", right: -4, top: -4, backgroundColor: colors.primary, borderRadius: 10, width: 20, height: 20, alignItems: "center", justifyContent: "center", zIndex: 10 }}>
                  <Text style={{ color: "white", fontSize: 10 }}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>

          {/* Satisfied buttons */}
          <View style={{ flexDirection: "row", marginBottom: 20, gap: 12 }}>
            <TouchableOpacity style={{ flex: 1, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: colors.border, alignItems: "center", flexDirection: "row", justifyContent: "center" }}>
              <Text style={{ color: colors.text, marginRight: 6 }}>✅</Text>
              <Text style={{ fontWeight: "600", color: colors.text, fontSize: 12 }}>SATISFIED</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ flex: 1, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: colors.danger, backgroundColor: "#FEF2F2", alignItems: "center", flexDirection: "row", justifyContent: "center" }}>
              <Text style={{ color: colors.danger, marginRight: 6 }}>❗</Text>
              <Text style={{ fontWeight: "600", color: colors.danger, fontSize: 12 }}>NOT SATISFIED</Text>
            </TouchableOpacity>
          </View>

          {/* Select Issue Type */}
          <Text style={{ fontSize: 12, fontWeight: "700", color: colors.primary, marginBottom: 8 }}>⚠️ SELECT ISSUE TYPE</Text>
          <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, marginBottom: 20, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ color: "#6B7280" }}>Select an issue...</Text>
            <Text style={{ color: "#6B7280" }}>▼</Text>
          </View>

          {/* Remarks */}
          <Text style={{ fontSize: 12, fontWeight: "700", color: colors.primary, marginBottom: 8 }}>📝 REMARKS</Text>
          <TextInput
            style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, height: 80, textAlignVertical: "top" }}
            placeholder="Describe the issue or add verification notes..."
            placeholderTextColor="#9CA3AF"
            multiline
          />

        </View>
      </ScrollView>

      {/* Sticky Bottom Wrap */}
      <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, paddingHorizontal: 16, paddingTop: 16, paddingBottom: (insets.bottom || 16) + 12, backgroundColor: "white", borderTopWidth: 1, borderTopColor: "#E5E7EB", zIndex: 10 }}>
        <Button title="Submit" onPress={() => {}} icon={<Text style={{ color: "white" }}>💾</Text>} />
      </View>
    </View>
  );
}
