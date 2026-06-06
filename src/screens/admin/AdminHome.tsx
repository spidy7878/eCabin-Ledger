import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  Modal, FlatList, Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../../constants/colors";
import { spacing } from "../../constants/spacing";
import { useAuth } from "../../context/AuthContext";
import { api, Inspector, Aircraft } from "../../services/api";

// ── Sub-components ────────────────────────────────────────────────────────────

const StatBox = ({ label, value, color }: { label: string; value: number; color: string }) => (
  <View style={{
    flex: 1, backgroundColor: "white", borderRadius: 10,
    paddingVertical: 14, paddingHorizontal: 6, alignItems: "center",
    borderTopWidth: 3, borderTopColor: color, marginHorizontal: 4,
    elevation: 2, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  }}>
    <Text style={{ fontSize: 22, fontWeight: "700", color }}>{value}</Text>
    <Text style={{ fontSize: 10, color: "#6B7280", marginTop: 3, textAlign: "center" }}>{label}</Text>
  </View>
);

const SectionLabel = ({ text }: { text: string }) => (
  <Text style={{
    fontSize: 12, fontWeight: "700", color: colors.text,
    marginBottom: 10, letterSpacing: 0.5,
  }}>{text}</Text>
);

// ── Assignment Modal ──────────────────────────────────────────────────────────

function AssignmentModal({
  inspector,
  allAircraft,
  visible,
  onClose,
  onSaved,
}: {
  inspector: Inspector | null;
  allAircraft: Aircraft[];
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [currentIds, setCurrentIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!inspector || !visible) return;
    setLoading(true);
    api.getAssignments(inspector.UserId)
      .then((list) => setCurrentIds(new Set(list.map((a) => a.AircraftId))))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [inspector?.UserId, visible]);

  const toggle = (id: number) => {
    setCurrentIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleSave = async () => {
    if (!inspector) return;
    setSaving(true);
    try {
      await api.saveAssignments(inspector.UserId, Array.from(currentIds));
      onSaved();
      onClose();
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Failed to save assignments.");
    } finally {
      setSaving(false);
    }
  };

  const selectAll = () => setCurrentIds(new Set(allAircraft.map((a) => a.AircraftId)));
  const clearAll  = () => setCurrentIds(new Set());

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" }}>
        <View style={{
          backgroundColor: "white", borderTopLeftRadius: 20, borderTopRightRadius: 20,
          maxHeight: "80%",
        }}>
          {/* Header */}
          <View style={{
            flexDirection: "row", justifyContent: "space-between", alignItems: "center",
            padding: 16, borderBottomWidth: 1, borderBottomColor: "#E5E7EB",
          }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: "700", color: colors.primary }}>
                Assign Aircraft
              </Text>
              <Text style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }} numberOfLines={1}>
                {inspector?.FullName} · {inspector?.Username}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Text style={{ fontSize: 20, color: "#6B7280" }}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Select all / Clear */}
          <View style={{
            flexDirection: "row", justifyContent: "flex-end",
            paddingHorizontal: 16, paddingVertical: 8,
            borderBottomWidth: 1, borderBottomColor: "#F3F4F6",
          }}>
            <TouchableOpacity onPress={selectAll} style={{ marginRight: 16 }}>
              <Text style={{ fontSize: 12, color: colors.primary, fontWeight: "600" }}>Select All</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={clearAll}>
              <Text style={{ fontSize: 12, color: colors.danger, fontWeight: "600" }}>Clear All</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={{ padding: 32, alignItems: "center" }}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : (
            <FlatList
              data={allAircraft}
              keyExtractor={(a) => String(a.AircraftId)}
              renderItem={({ item }) => {
                const selected = currentIds.has(item.AircraftId);
                return (
                  <TouchableOpacity
                    onPress={() => toggle(item.AircraftId)}
                    style={{
                      flexDirection: "row", alignItems: "center",
                      paddingVertical: 13, paddingHorizontal: 16,
                      borderBottomWidth: 1, borderBottomColor: "#F3F4F6",
                      backgroundColor: selected ? "#EEF2FF" : "white",
                    }}
                  >
                    <View style={{
                      width: 22, height: 22, borderRadius: 6, borderWidth: 2,
                      borderColor: selected ? colors.primary : "#D1D5DB",
                      backgroundColor: selected ? colors.primary : "white",
                      alignItems: "center", justifyContent: "center", marginRight: 14,
                    }}>
                      {selected && <Text style={{ color: "white", fontSize: 13, fontWeight: "700" }}>✓</Text>}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: "600", color: selected ? colors.primary : colors.text }}>
                        MSN {item.MSN}
                      </Text>
                      <Text style={{ fontSize: 11, color: "#6B7280", marginTop: 1 }}>
                        {item.Registration} · {item.AircraftType}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          )}

          {/* Save */}
          <View style={{ padding: 16 }}>
            <TouchableOpacity
              onPress={handleSave}
              disabled={saving}
              style={{
                backgroundColor: saving ? "#9CA3AF" : colors.primary,
                borderRadius: 10, paddingVertical: 14, alignItems: "center",
              }}
            >
              {saving
                ? <ActivityIndicator color="white" />
                : <Text style={{ color: "white", fontWeight: "700", fontSize: 15 }}>
                    Save — {currentIds.size} aircraft assigned
                  </Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function AdminHome() {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();

  const [inspectors, setInspectors] = useState<Inspector[]>([]);
  const [allAircraft, setAllAircraft] = useState<Aircraft[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);

  const [modalVisible, setModalVisible]       = useState(false);
  const [selectedInspector, setSelectedInspector] = useState<Inspector | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([api.getInspectors(), api.getAircraft()])
      .then(([ins, air]) => {
        setInspectors(ins);
        setAllAircraft(air);
        setError(null);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const openModal = (inspector: Inspector) => {
    setSelectedInspector(inspector);
    setModalVisible(true);
  };

  const assigned   = inspectors.filter((i) => i.AssignedCount > 0).length;
  const unassigned = inspectors.length - assigned;

  const firstName = user?.fullName?.split(" ")[0] ?? "Admin";

  return (
    <View style={{ flex: 1, backgroundColor: "#F7F9FB" }}>
      <AssignmentModal
        inspector={selectedInspector}
        allAircraft={allAircraft}
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSaved={load}
      />

      {/* Header */}
      <View style={{
        backgroundColor: colors.primary, paddingTop: insets.top + 12,
        paddingBottom: 20, paddingHorizontal: spacing.md,
      }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
          <View>
            <Text style={{ fontSize: 20, fontWeight: "700", color: "white" }}>
              Admin Dashboard
            </Text>
            <Text style={{ fontSize: 12, color: "rgba(255,255,255,0.75)", marginTop: 2 }}>
              Welcome, {firstName} · {user?.role}
            </Text>
          </View>
          <TouchableOpacity
            onPress={logout}
            style={{
              backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 8,
              paddingHorizontal: 12, paddingVertical: 6,
            }}
          >
            <Text style={{ color: "white", fontSize: 12, fontWeight: "600" }}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.md,
          paddingTop: 20,
          paddingBottom: (insets.bottom || 0) + 24,
        }}
      >
        {loading ? (
          <ActivityIndicator color={colors.primary} size="large" style={{ marginTop: 60 }} />
        ) : error ? (
          <Text style={{ color: colors.danger, fontSize: 13, marginTop: 24 }}>Error: {error}</Text>
        ) : (
          <>
            {/* Stats */}
            <SectionLabel text="OVERVIEW" />
            <View style={{ flexDirection: "row", marginBottom: 24, marginHorizontal: -4 }}>
              <StatBox label="Inspectors"  value={inspectors.length} color={colors.primary} />
              <StatBox label="Aircraft"    value={allAircraft.length} color="#6366F1"       />
              <StatBox label="Assigned"    value={assigned}           color={colors.success} />
              <StatBox label="Unassigned"  value={unassigned}         color={colors.danger}  />
            </View>

            {/* Inspector list */}
            <SectionLabel text="INSPECTORS — TAP TO ASSIGN AIRCRAFT" />
            {inspectors.map((ins) => (
              <TouchableOpacity
                key={ins.UserId}
                onPress={() => openModal(ins)}
                activeOpacity={0.8}
                style={{
                  backgroundColor: "white", borderRadius: 12, padding: 16,
                  marginBottom: 10, elevation: 2,
                  shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4,
                  shadowOffset: { width: 0, height: 2 },
                  borderLeftWidth: 4,
                  borderLeftColor: ins.AssignedCount > 0 ? colors.success : colors.danger,
                }}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: "700", color: colors.text }}>
                      {ins.FullName}
                    </Text>
                    <Text style={{ fontSize: 11, color: "#6B7280", marginTop: 2 }} numberOfLines={1}>
                      {ins.Username}
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <View style={{
                      backgroundColor: ins.AssignedCount > 0 ? "#F0FDF4" : "#FEF2F2",
                      borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4,
                      borderWidth: 1,
                      borderColor: ins.AssignedCount > 0 ? colors.success : colors.danger,
                    }}>
                      <Text style={{
                        fontSize: 12, fontWeight: "700",
                        color: ins.AssignedCount > 0 ? colors.success : colors.danger,
                      }}>
                        {ins.AssignedCount > 0 ? `${ins.AssignedCount} aircraft` : "None assigned"}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 10, color: "#9CA3AF", marginTop: 4 }}>Tap to edit</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}
