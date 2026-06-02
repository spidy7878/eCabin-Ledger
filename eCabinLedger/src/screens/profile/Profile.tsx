import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { spacing } from "../../constants/spacing";
import { colors } from "../../constants/colors";
import { Ionicons, MaterialIcons, Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../../context/AuthContext";
import { getQueueStats } from "../../db/imageQueue";
import { startSync } from "../../services/syncService";
import { clearSynced } from "../../db/imageQueue";

type QueueStats = { pending: number; uploading: number; synced: number; failed: number; total: number };

export default function Profile() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { user, logout } = useAuth();

  const [queueStats, setQueueStats] = useState<QueueStats>({ pending: 0, uploading: 0, synced: 0, failed: 0, total: 0 });
  const [syncing, setSyncing]       = useState(false);
  const [clearing, setClearing]     = useState(false);

  useEffect(() => {
    if (user) refreshStats();
  }, [user]);

  const refreshStats = () => {
    if (user) getQueueStats(user.userId).then(setQueueStats).catch(() => {});
  };

  const handleSync = async () => {
    if (syncing) return;
    setSyncing(true);
    await startSync().catch(() => {});
    refreshStats();
    setSyncing(false);
  };

  const handleClearSynced = async () => {
    if (clearing) return;
    setClearing(true);
    await clearSynced().catch(() => {});
    refreshStats();
    setClearing(false);
  };

  const initials = user
    ? user.fullName.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
    : "?";

  return (
    <View style={{ flex: 1, backgroundColor: "#F7F9FB" }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerIcon}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity style={styles.headerIcon}>
          <Ionicons name="ribbon-outline" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          {/* Avatar initials */}
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarInitials}>{initials}</Text>
            </View>
          </View>
          <Text style={styles.userName}>{user?.fullName ?? "—"}</Text>
          <Text style={styles.userEmail}>{user?.email ?? "—"}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{user?.role ?? "—"}</Text>
          </View>
        </View>

        {/* Professional Details */}
        <Text style={styles.sectionHeader}>PROFESSIONAL DETAILS</Text>
        <View style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <View style={styles.detailIconContainer}>
              <Feather name="user" size={20} color={colors.primary} />
            </View>
            <View>
              <Text style={styles.detailLabel}>Username</Text>
              <Text style={styles.detailValue}>{user?.username ?? "—"}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <View style={styles.detailIconContainer}>
              <MaterialIcons name="badge" size={20} color={colors.primary} />
            </View>
            <View>
              <Text style={styles.detailLabel}>Employee ID</Text>
              <Text style={styles.detailValue}>{user?.employeeId ?? "—"}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <View style={styles.detailIconContainer}>
              <MaterialIcons name="email" size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.detailLabel}>Email</Text>
              <Text style={styles.detailValue} numberOfLines={1}>{user?.email ?? "—"}</Text>
            </View>
          </View>
        </View>

        {/* Image Queue Section */}
        <Text style={styles.sectionHeader}>IMAGE QUEUE</Text>
        <View style={styles.detailsCard}>
          {/* Stats row */}
          <View style={{ flexDirection: "row", justifyContent: "space-around", marginBottom: 16 }}>
            {([
              { label: "Pending",  value: queueStats.pending,  color: "#F59E0B" },
              { label: "Synced",   value: queueStats.synced,   color: colors.success },
              { label: "Failed",   value: queueStats.failed,   color: colors.danger },
              { label: "Total",    value: queueStats.total,    color: colors.primary },
            ] as const).map((s) => (
              <View key={s.label} style={{ alignItems: "center" }}>
                <Text style={{ fontSize: 22, fontWeight: "700", color: s.color }}>{s.value}</Text>
                <Text style={{ fontSize: 11, color: "#6B7280", marginTop: 2 }}>{s.label}</Text>
              </View>
            ))}
          </View>

          {/* Sync now button */}
          <TouchableOpacity
            onPress={handleSync}
            disabled={syncing}
            style={[
              styles.actionButton,
              { backgroundColor: syncing ? "#E5E7EB" : colors.primary },
            ]}
          >
            {syncing ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Feather name="upload-cloud" size={16} color="#FFF" style={{ marginRight: 8 }} />
            )}
            <Text style={{ color: syncing ? "#6B7280" : "#FFF", fontWeight: "600", fontSize: 14 }}>
              {syncing ? "Syncing…" : "Sync Now"}
            </Text>
          </TouchableOpacity>

          {/* Clear synced button */}
          {queueStats.synced > 0 && (
            <TouchableOpacity
              onPress={handleClearSynced}
              disabled={clearing}
              style={[styles.actionButton, { backgroundColor: "#F0FDF4", borderWidth: 1, borderColor: "#BBF7D0", marginTop: 8 }]}
            >
              <Feather name="trash-2" size={16} color={colors.success} style={{ marginRight: 8 }} />
              <Text style={{ color: colors.success, fontWeight: "600", fontSize: 14 }}>
                {clearing ? "Clearing…" : `Clear ${queueStats.synced} synced image${queueStats.synced > 1 ? "s" : ""}`}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
          <MaterialIcons name="logout" size={20} color="#D32F2F" style={{ marginRight: 8 }} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>eCabin Ledger v1.0.0</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#EAEAEA",
  },
  headerIcon: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.primary,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 10,
  },
  divider: {
    height: 1,
    backgroundColor: "#F0F0F0",
    marginVertical: 14,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl * 2,
  },
  profileCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: spacing.lg,
    alignItems: "center",
    marginBottom: spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  avatarContainer: {
    marginBottom: spacing.sm,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInitials: {
    fontSize: 28,
    fontWeight: "700",
    color: "#FFF",
  },
  userName: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.primary,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: spacing.md,
  },
  roleBadge: {
    backgroundColor: colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  roleText: {
    color: "#FFF",
    fontWeight: "600",
    fontSize: 14,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4B5563",
    marginBottom: spacing.sm,
    marginLeft: 4,
  },
  detailsCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  detailIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: "#F0F4F8",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  detailLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#D32F2F",
    borderRadius: 8,
    paddingVertical: 16,
    marginBottom: 24,
  },
  logoutText: {
    color: "#D32F2F",
    fontSize: 16,
    fontWeight: "700",
  },
  versionText: {
    textAlign: "center",
    color: "#9CA3AF",
    fontSize: 12,
  },
});
