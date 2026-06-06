import React, { useEffect, useState } from "react";
import {
  View, Text, Image, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, Modal, FlatList, Alert,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import Button from "../../components/Button";
import WorkflowProgress from "../../components/WorkflowProgress";
import { spacing } from "../../constants/spacing";
import { colors } from "../../constants/colors";
import { api, Galley as GalleyType, Part, IssueType } from "../../services/api";
import { useAircraft } from "../../context/AircraftContext";
import { useAuth } from "../../context/AuthContext";
import { useWorkflow } from "../../context/WorkflowContext";
import { enqueueImage } from "../../db/imageQueue";
import { startSync } from "../../services/syncService";

const Pill = ({
  label, active, onPress,
}: { label: string; active: boolean; onPress: () => void }) => (
  <TouchableOpacity
    onPress={onPress}
    style={{
      paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, borderWidth: 1,
      borderColor: active ? colors.primary : "#E5E7EB",
      backgroundColor: active ? colors.primary : "#F9FAFB",
      marginRight: 8, minWidth: 64, alignItems: "center",
    }}
  >
    <Text style={{ color: active ? "white" : "#4B5563", fontWeight: active ? "600" : "500", fontSize: 12 }}>
      {label}
    </Text>
  </TouchableOpacity>
);

const SectionTitle = ({ title }: { title: string }) => (
  <View style={{ borderLeftWidth: 3, borderLeftColor: colors.primary, paddingLeft: 8, marginBottom: 12, marginTop: 16 }}>
    <Text style={{ fontSize: 12, fontWeight: "700", color: colors.primary }}>{title}</Text>
  </View>
);

const LoadingRow = () => (
  <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
    <ActivityIndicator size="small" color={colors.primary} />
    <Text style={{ marginLeft: 8, fontSize: 12, color: "#6B7280" }}>Loading…</Text>
  </View>
);

export default function Galley() {
  const insets = useSafeAreaInsets();
  const { selectedAircraft } = useAircraft();
  const { user } = useAuth();
  const { isWorkflow, endWorkflow } = useWorkflow();
  const navigation = useNavigation();

  // ── zone (galleys from DB) ──
  const [galleys, setGalleys] = useState<GalleyType[]>([]);
  const [loadingGalleys, setLoadingGalleys] = useState(false);
  const [activeGalley, setActiveGalley] = useState<GalleyType | null>(null);

  // ── items (parts for selected galley) ──
  const [items, setItems] = useState<Part[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [activeItem, setActiveItem] = useState<string | null>(null);

  // ── issue types ──
  const [issueTypes, setIssueTypes] = useState<IssueType[]>([]);
  const [loadingIssues, setLoadingIssues] = useState(false);

  // ── workflow state ──
  const [satisfaction, setSatisfaction] = useState<"satisfied" | "not_satisfied" | null>(null);
  const [selectedIssue, setSelectedIssue] = useState<IssueType | null>(null);
  const [remarks, setRemarks] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [issueModalVisible, setIssueModalVisible] = useState(false);

  const registration = selectedAircraft?.Registration ?? "N/A";

  // Load galleys and issue types together
  useEffect(() => {
    if (!selectedAircraft) return;
    setLoadingGalleys(true);
    api.getGalleys(selectedAircraft.AircraftId)
      .then((data) => {
        // Deduplicate by GalleyCode in case DB has duplicate rows
        const seen = new Set<string>();
        const unique = data.filter((g) => {
          if (seen.has(g.GalleyCode)) return false;
          seen.add(g.GalleyCode);
          return true;
        });
        setGalleys(unique);
        if (unique.length > 0) setActiveGalley(unique[0]);
      })
      .catch(() => setGalleys([]))
      .finally(() => setLoadingGalleys(false));

    setLoadingIssues(true);
    api.getIssueTypes()
      .then(setIssueTypes)
      .catch(() => {})
      .finally(() => setLoadingIssues(false));
  }, [selectedAircraft?.AircraftId]);

  // Load parts when active galley or aircraft changes
  useEffect(() => {
    if (!activeGalley || !selectedAircraft) return;
    if (!activeGalley.SubCatID) {
      setItems([]);
      return;
    }

    setLoadingItems(true);
    setActiveItem(null);
    api.getParts(activeGalley.SubCatID, selectedAircraft.AircraftId)
      .then((data) => {
        setItems(data);
        if (data.length > 0) setActiveItem(data[0].PartName);
      })
      .catch(() => setItems([]))
      .finally(() => setLoadingItems(false));
  }, [activeGalley?.GalleyId, selectedAircraft?.AircraftId]);

  // Reset workflow when galley changes
  useEffect(() => {
    setActiveItem(null);
    setImages([]);
    setSatisfaction(null);
    setSelectedIssue(null);
    setRemarks("");
  }, [activeGalley?.GalleyId]);

  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission required", "Camera access is needed to take inspection photos.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled && result.assets.length > 0) {
      setImages((prev) => [...prev, result.assets[0].uri]);
    }
  };

  const handleSubmit = async () => {
    if (!selectedAircraft) return Alert.alert("No aircraft", "Select an aircraft on the Home tab first.");
    if (!activeGalley)     return Alert.alert("Missing", "Select a galley.");
    if (!activeItem)       return Alert.alert("Missing", "Select an item to inspect.");
    if (images.length === 0) return Alert.alert("No photos", "Take at least one photo.");
    if (!satisfaction)     return Alert.alert("Missing", "Mark Satisfied or Not Satisfied.");

    setSubmitting(true);
    try {
      for (const uri of images) {
        await enqueueImage(uri, {
          inspector_id:   user!.userId,
          inspector_name: user!.fullName,
          aircraft_id:    selectedAircraft.AircraftId,
          aircraft_msn:   selectedAircraft.MSN,
          zone_type:      "galley",
          zone_id:        activeGalley.GalleyId,
          zone_name:      activeGalley.GalleyCode,
          part_name:      activeItem,
          issue_id:       selectedIssue?.IssueID ?? null,
          issue_name:     selectedIssue?.IssueName ?? null,
          satisfaction:   satisfaction === "satisfied" ? 1 : 0,
          remarks:        remarks.trim() || null,
        });
      }
      const count = images.length;
      setImages([]);
      setSatisfaction(null);
      setSelectedIssue(null);
      setRemarks("");
      startSync().catch(() => {});
      if (isWorkflow) {
        Alert.alert(
          "Galley Saved ✓",
          `${count} photo${count > 1 ? "s" : ""} queued. Continue to Lavatory?`,
          [
            { text: "Add More", style: "cancel" },
            { text: "Next: Lavatory →", onPress: () => navigation.navigate("Lavatory" as never) },
          ]
        );
      } else {
        Alert.alert("Saved ✓", `${count} photo${count > 1 ? "s" : ""} queued for upload.`);
      }
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Failed to save inspection.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#F7F9FB" }}>
      {/* ── Issue Picker Modal ── */}
      <Modal
        visible={issueModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIssueModalVisible(false)}
      >
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)" }}
          activeOpacity={1}
          onPress={() => setIssueModalVisible(false)}
        />
        <View
          style={{
            position: "absolute", bottom: 0, left: 0, right: 0,
            backgroundColor: "white", borderTopLeftRadius: 16, borderTopRightRadius: 16,
            maxHeight: "60%", paddingBottom: insets.bottom || 16,
          }}
        >
          <View
            style={{
              flexDirection: "row", justifyContent: "space-between", alignItems: "center",
              padding: 16, borderBottomWidth: 1, borderBottomColor: "#E5E7EB",
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: "700", color: colors.primary }}>
              SELECT ISSUE TYPE
            </Text>
            <TouchableOpacity onPress={() => setIssueModalVisible(false)}>
              <Text style={{ fontSize: 18, color: "#6B7280" }}>✕</Text>
            </TouchableOpacity>
          </View>
          {loadingIssues ? (
            <View style={{ padding: 24, alignItems: "center" }}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : (
            <FlatList
              data={issueTypes}
              keyExtractor={(i) => String(i.IssueID)}
              renderItem={({ item }) => {
                const isSelected = selectedIssue?.IssueID === item.IssueID;
                const priorityColor =
                  item.IssuePriority === "High" ? colors.danger
                  : item.IssuePriority === "Moderate" ? "#F59E0B"
                  : "#6B7280";
                return (
                  <TouchableOpacity
                    onPress={() => { setSelectedIssue(item); setIssueModalVisible(false); }}
                    style={{
                      flexDirection: "row", justifyContent: "space-between", alignItems: "center",
                      paddingVertical: 14, paddingHorizontal: 16,
                      borderBottomWidth: 1, borderBottomColor: "#F3F4F6",
                      backgroundColor: isSelected ? "#EEF2FF" : "white",
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: isSelected ? "700" : "500", color: isSelected ? colors.primary : "#374151" }}>
                      {item.IssueName}
                    </Text>
                    <Text style={{ fontSize: 11, color: priorityColor, fontWeight: "600" }}>
                      {item.IssuePriority?.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </View>
      </Modal>

      <ScrollView
        contentContainerStyle={{
          paddingTop: 140 + insets.top,
          paddingHorizontal: spacing.md,
          paddingBottom: (insets.bottom || 0) + 100,
        }}
      >
        {/* Workflow progress bar */}
        {isWorkflow && <WorkflowProgress step={1} onExit={endWorkflow} />}
        {/* ── 1. Galley Zone ── */}
        <SectionTitle title={`SELECT GALLEY ZONE FOR ${registration}`} />
        {loadingGalleys ? (
          <LoadingRow />
        ) : galleys.length === 0 ? (
          <Text style={{ color: "#6B7280", marginBottom: 16, fontSize: 12 }}>No galleys found.</Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
            {galleys.map((g) => (
              <Pill
                key={g.GalleyId}
                label={g.GalleyCode}
                active={activeGalley?.GalleyId === g.GalleyId}
                onPress={() => setActiveGalley(g)}
              />
            ))}
          </ScrollView>
        )}

        {activeGalley && (
          <Text style={{ fontSize: 11, color: "#6B7280", marginBottom: 4 }}>
            {activeGalley.GalleyName} · {activeGalley.Location} · Status:{" "}
            <Text style={{ color: activeGalley.Status === "Operational" ? colors.success : colors.danger }}>
              {activeGalley.Status}
            </Text>
            {activeGalley.LastInspectionDate
              ? ` · Last: ${new Date(activeGalley.LastInspectionDate).toLocaleDateString()}`
              : ""}
          </Text>
        )}

        {/* ── 2. Item Selection ── */}
        <SectionTitle title={`SELECT ITEM FOR ${activeGalley?.GalleyCode ?? "—"}`} />
        {loadingItems ? (
          <LoadingRow />
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
            {items.map((it) => (
              <Pill
                key={it.PartName}
                label={it.PartName}
                active={activeItem === it.PartName}
                onPress={() => setActiveItem(it.PartName)}
              />
            ))}
            {!loadingItems && items.length === 0 && activeGalley && (
              <Text style={{ fontSize: 12, color: "#9CA3AF" }}>No items for this galley</Text>
            )}
          </ScrollView>
        )}

        {/* ── 3. Inspection Workflow ── */}
        <SectionTitle title="INSPECTION WORKFLOW" />
        <View style={{ borderWidth: 1, borderColor: "#D1D5DB", borderRadius: 12, padding: 16, backgroundColor: "white" }}>

          {/* Active item header */}
          {activeItem ? (
            <View style={{
              backgroundColor: colors.primary, borderRadius: 8,
              paddingVertical: 12, paddingHorizontal: 16, marginBottom: 20,
              flexDirection: "row", alignItems: "center",
            }}>
              <Text style={{ fontSize: 16, marginRight: 8 }}>🔧</Text>
              <Text style={{ fontSize: 13, fontWeight: "700", color: "white", flex: 1 }} numberOfLines={1}>
                {activeItem}
              </Text>
            </View>
          ) : (
            <View style={{ backgroundColor: "#F3F4F6", borderRadius: 8, paddingVertical: 12, paddingHorizontal: 16, marginBottom: 20 }}>
              <Text style={{ fontSize: 12, color: "#9CA3AF" }}>Select a galley and item above to begin inspection</Text>
            </View>
          )}

          {/* Photos */}
          <Text style={{ fontSize: 12, fontWeight: "700", color: colors.primary, marginBottom: 12 }}>
            📸 TAKE MULTIPLE PICTURES{" "}
            <Text style={{ color: "#6B7280", fontWeight: "400" }}>(Images required)</Text>
          </Text>
          <View style={{ flexDirection: "row", marginBottom: 24, gap: 8, flexWrap: "wrap" }}>
            <TouchableOpacity
              onPress={handleTakePhoto}
              style={{
                width: 64, height: 64, borderWidth: 1, borderStyle: "dashed",
                borderColor: "#9CA3AF", borderRadius: 8, alignItems: "center",
                justifyContent: "center", backgroundColor: "#F9FAFB",
              }}
            >
              <Text style={{ fontSize: 20, color: "#9CA3AF" }}>+</Text>
              <Text style={{ fontSize: 10, color: "#9CA3AF", marginTop: 2 }}>Photo</Text>
            </TouchableOpacity>
            {images.map((uri) => (
              <View key={uri} style={{ width: 64, height: 64, borderRadius: 8, overflow: "hidden" }}>
                <Image source={{ uri }} style={{ width: 64, height: 64 }} resizeMode="cover" />
                <TouchableOpacity
                  onPress={() => setImages(images.filter((u) => u !== uri))}
                  style={{
                    position: "absolute", right: -4, top: -4, backgroundColor: colors.primary,
                    borderRadius: 10, width: 20, height: 20, alignItems: "center",
                    justifyContent: "center", zIndex: 10,
                  }}
                >
                  <Text style={{ color: "white", fontSize: 10 }}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>

          {/* Satisfied / Not Satisfied */}
          <View style={{ flexDirection: "row", marginBottom: 20, gap: 12 }}>
            <TouchableOpacity
              onPress={() => setSatisfaction("satisfied")}
              style={{
                flex: 1, paddingVertical: 12, borderRadius: 8, borderWidth: 1,
                borderColor: satisfaction === "satisfied" ? "#22C55E" : colors.border,
                backgroundColor: satisfaction === "satisfied" ? "#F0FDF4" : "white",
                alignItems: "center", flexDirection: "row", justifyContent: "center",
              }}
            >
              <Text style={{ color: "#22C55E", marginRight: 6 }}>✅</Text>
              <Text style={{ fontWeight: "600", color: satisfaction === "satisfied" ? "#22C55E" : colors.text, fontSize: 12 }}>
                SATISFIED
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setSatisfaction("not_satisfied")}
              style={{
                flex: 1, paddingVertical: 12, borderRadius: 8, borderWidth: 1,
                borderColor: satisfaction === "not_satisfied" ? colors.danger : colors.border,
                backgroundColor: satisfaction === "not_satisfied" ? "#FEF2F2" : "white",
                alignItems: "center", flexDirection: "row", justifyContent: "center",
              }}
            >
              <Text style={{ color: colors.danger, marginRight: 6 }}>❗</Text>
              <Text style={{ fontWeight: "600", color: colors.danger, fontSize: 12 }}>NOT SATISFIED</Text>
            </TouchableOpacity>
          </View>

          {/* Issue Type */}
          <Text style={{ fontSize: 12, fontWeight: "700", color: colors.primary, marginBottom: 8 }}>
            ⚠️ SELECT ISSUE TYPE
          </Text>
          <TouchableOpacity
            onPress={() => setIssueModalVisible(true)}
            style={{
              borderWidth: 1,
              borderColor: selectedIssue ? colors.primary : colors.border,
              borderRadius: 8, padding: 12, marginBottom: 20,
              flexDirection: "row", justifyContent: "space-between", alignItems: "center",
              backgroundColor: selectedIssue ? "#EEF2FF" : "white",
            }}
          >
            <Text style={{ color: selectedIssue ? colors.primary : "#6B7280", fontWeight: selectedIssue ? "600" : "400", fontSize: 13 }}>
              {selectedIssue ? selectedIssue.IssueName : "Select an issue…"}
            </Text>
            <Text style={{ color: "#6B7280" }}>▼</Text>
          </TouchableOpacity>

          {/* Remarks */}
          <Text style={{ fontSize: 12, fontWeight: "700", color: colors.primary, marginBottom: 8 }}>
            📝 REMARKS
          </Text>
          <TextInput
            style={{
              borderWidth: 1, borderColor: colors.border, borderRadius: 8,
              padding: 12, height: 80, textAlignVertical: "top",
              fontSize: 13, color: colors.text,
            }}
            placeholder="Describe the issue or add verification notes…"
            placeholderTextColor="#9CA3AF"
            multiline
            value={remarks}
            onChangeText={setRemarks}
          />
        </View>
      </ScrollView>

      {/* Sticky Bottom */}
      <View
        style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          paddingHorizontal: 16, paddingTop: 16,
          paddingBottom: (insets.bottom || 16) + 12,
          backgroundColor: "white", borderTopWidth: 1, borderTopColor: "#E5E7EB", zIndex: 10,
        }}
      >
        <Button
          title={submitting ? "Saving\u2026" : "Submit"}
          onPress={handleSubmit}
          disabled={submitting}
        />
      </View>
    </View>
  );
}
