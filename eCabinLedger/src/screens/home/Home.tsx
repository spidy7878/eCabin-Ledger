import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import Card from "../../components/Card";
import { spacing } from "../../constants/spacing";
import { colors } from "../../constants/colors";
import { api, Aircraft, Dashboard, AuditTask } from "../../services/api";
import { useAircraft } from "../../context/AircraftContext";
import { useAuth } from "../../context/AuthContext";
import { useWorkflow } from "../../context/WorkflowContext";
import { getQueueStats, retryFailed } from "../../db/imageQueue";
import { startSync } from "../../services/syncService";

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  Overdue:   colors.danger,
  "Due Soon": "#F59E0B",
  Upcoming:  colors.success,
};

function formatDate(d: string): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ── Sub-components ────────────────────────────────────────────────────────────

const MsnPill = ({
  label,
  active,
  onPress,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
}) => (
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
    <Text
      style={{ color: active ? "white" : colors.text, fontWeight: active ? "600" : "400" }}
    >
      {label}
    </Text>
  </TouchableOpacity>
);

const StatBox = ({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) => (
  <View
    style={{
      flex: 1,
      backgroundColor: "white",
      borderRadius: 10,
      paddingVertical: 14,
      paddingHorizontal: 6,
      alignItems: "center",
      borderTopWidth: 3,
      borderTopColor: color,
      marginHorizontal: 4,
      elevation: 2,
      shadowColor: "#000",
      shadowOpacity: 0.06,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 2 },
    }}
  >
    <Text style={{ fontSize: 24, fontWeight: "700", color }}>{value}</Text>
    <Text style={{ fontSize: 10, color: "#6B7280", marginTop: 3, textAlign: "center" }}>
      {label}
    </Text>
  </View>
);

const TaskCard = ({
  task,
  isActive,
  onPress,
  onStartInspection,
}: {
  task: AuditTask;
  isActive: boolean;
  onPress: () => void;
  onStartInspection: () => void;
}) => {
  const statusColor = STATUS_COLORS[task.TaskStatus] ?? colors.text;
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={{ marginBottom: 12 }}>
      <View
        style={
          isActive
            ? { borderRadius: 14, borderWidth: 1.5, borderColor: colors.primary }
            : undefined
        }
      >
        <Card>
          {/* Header */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: "700", color: colors.primary }}>
                MSN {task.MSN}
              </Text>
              <Text style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>
                {task.Registration} · {task.AircraftType}
              </Text>
            </View>
            <View
              style={{
                backgroundColor: statusColor + "22",
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: statusColor,
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: "600", color: statusColor }}>
                {task.TaskStatus}
              </Text>
            </View>
          </View>

          {/* Inspector + Base */}
          <View style={{ marginTop: 10, flexDirection: "row", alignItems: "center" }}>
            <Text style={{ fontSize: 11, color: "#6B7280" }}>👷 </Text>
            <Text
              style={{ fontSize: 12, color: colors.text, fontWeight: "500", flex: 1 }}
              numberOfLines={1}
            >
              {task.LastAuditPerson || "—"}
            </Text>
            {!!task.LastAuditBase && (
              <Text style={{ fontSize: 11, color: "#6B7280" }}>📍 {task.LastAuditBase}</Text>
            )}
          </View>

          {/* Dates */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginTop: 10,
              paddingTop: 10,
              borderTopWidth: 1,
              borderTopColor: colors.border,
            }}
          >
            <View>
              <Text style={{ fontSize: 10, color: "#9CA3AF" }}>LAST INSPECTION</Text>
              <Text style={{ fontSize: 13, fontWeight: "600", color: colors.text, marginTop: 2 }}>
                {formatDate(task.LastAuditDate)}
              </Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={{ fontSize: 10, color: "#9CA3AF" }}>NEXT DUE</Text>
              <Text style={{ fontSize: 13, fontWeight: "700", color: statusColor, marginTop: 2 }}>
                {formatDate(task.NextAuditDate)}
              </Text>
            </View>
          </View>

          {/* Issues */}
          {task.IssuesReported > 0 && (
            <View style={{ flexDirection: "row", marginTop: 8, gap: 16 }}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <View
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: 4,
                    backgroundColor: colors.danger,
                    marginRight: 5,
                  }}
                />
                <Text style={{ fontSize: 11, color: "#6B7280" }}>
                  {task.IssuesReported} issues found
                </Text>
              </View>
              {task.ExistingIssues > 0 && (
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <View
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: 4,
                      backgroundColor: "#F59E0B",
                      marginRight: 5,
                    }}
                  />
                  <Text style={{ fontSize: 11, color: "#6B7280" }}>
                    {task.ExistingIssues} existing
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Start Inspection CTA */}
          <TouchableOpacity
            onPress={onStartInspection}
            style={{
              marginTop: 14,
              backgroundColor: colors.primary,
              borderRadius: 8,
              paddingVertical: 10,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: "white", fontWeight: "700", fontSize: 13 }}>Start Inspection</Text>
            <Text style={{ color: "white", fontSize: 15, marginLeft: 6 }}>→</Text>
          </TouchableOpacity>
        </Card>
      </View>
    </TouchableOpacity>
  );
};

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function Home() {
  const insets = useSafeAreaInsets();
  const { selectedAircraft, setSelectedAircraft } = useAircraft();
  const { user, logout } = useAuth();
  const { startWorkflow } = useWorkflow();
  const navigation = useNavigation();

  const [aircraftList, setAircraftList] = useState<Aircraft[]>([]);
  const [dashboard, setDashboard]       = useState<Dashboard | null>(null);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);
  const [queueStats, setQueueStats]     = useState({ pending: 0, synced: 0, failed: 0, total: 0 });
  const [syncing, setSyncing]           = useState(false);

  useEffect(() => {
    Promise.all([api.getAircraft(), api.getDashboard()])
      .then(([aircraft, dash]) => {
        setDashboard(dash);

        // Only surface aircraft that actually have tasks assigned to the
        // logged-in inspector.  For Admin / Manager the task list contains
        // all aircraft so nothing is filtered out.  For a User (inspector)
        // only their assigned aircraft appear.
        const assignedIds = new Set(dash.tasks.map((t) => t.AircraftId));
        const filtered = aircraft.filter((ac) => assignedIds.has(ac.AircraftId));
        setAircraftList(filtered);

        if (filtered.length > 0 && !selectedAircraft) {
          setSelectedAircraft(filtered[0]);
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  // Refresh queue stats whenever screen loads
  useEffect(() => {
    if (user) {
      getQueueStats(user.userId).then(setQueueStats).catch(() => {});
    }
  }, [user]);

  const handleSync = async () => {
    if (syncing) return;
    setSyncing(true);
    // Reset any permanently-failed rows back to pending before syncing
    await retryFailed().catch(() => {});
    await startSync().catch(() => {});
    if (user) getQueueStats(user.userId).then(setQueueStats).catch(() => {});
    setSyncing(false);
  };

  const firstName = user?.fullName?.split(" ")[0] ?? "Inspector";

  return (
    <View style={{ flex: 1, backgroundColor: "#F7F9FB" }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: 140 + insets.top,
          paddingHorizontal: spacing.md,
          paddingBottom: (insets.bottom || 0) + 24,
        }}
      >
        {/* Greeting */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 20,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 22, fontWeight: "700", color: colors.primary }}>
              Welcome, {firstName}
            </Text>
            {user && (
              <Text style={{ fontSize: 11, color: "#6B7280", marginTop: 2 }}>
                {user.employeeId} · {user.role}
              </Text>
            )}
          </View>
          <TouchableOpacity onPress={logout} style={{ paddingLeft: 12, paddingTop: 4 }}>
            <Text style={{ fontSize: 12, color: colors.danger }}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        {/* Sync status bar */}
        {queueStats.total > 0 && (
          <TouchableOpacity
            onPress={handleSync}
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: queueStats.pending > 0 ? "#FFF7ED" : "#F0FDF4",
              borderRadius: 10,
              padding: 12,
              marginBottom: 16,
              borderWidth: 1,
              borderColor: queueStats.pending > 0 ? "#FED7AA" : "#BBF7D0",
            }}
          >
            <Text style={{ fontSize: 16, marginRight: 8 }}>
              {syncing ? "⏳" : queueStats.pending > 0 ? "🔴" : "✅"}
            </Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, fontWeight: "600", color: colors.text }}>
                {syncing
                  ? "Syncing images…"
                  : queueStats.pending > 0
                  ? `${queueStats.pending} image${queueStats.pending > 1 ? "s" : ""} pending upload`
                  : `All ${queueStats.synced} images synced`}
              </Text>
              {queueStats.failed > 0 && (
                <Text style={{ fontSize: 11, color: colors.danger }}>
                  {queueStats.failed} failed — tap to retry
                </Text>
              )}
            </View>
            {!syncing && queueStats.pending > 0 && (
              <Text style={{ fontSize: 11, color: colors.primary, fontWeight: "600" }}>Sync now ›</Text>
            )}
          </TouchableOpacity>
        )}

        {loading ? (
          <ActivityIndicator color={colors.primary} size="large" style={{ marginTop: 60 }} />
        ) : error ? (
          <Text style={{ color: colors.danger, fontSize: 12 }}>⚠️ {error}</Text>
        ) : (
          <>
            {/* ── Task stats ──────────────────────────────── */}
            <Text style={styles.sectionLabel}>TASK OVERVIEW</Text>
            <View style={{ flexDirection: "row", marginBottom: 24, marginHorizontal: -4 }}>
              <StatBox label="Total"    value={dashboard?.stats.total    ?? 0} color={colors.primary} />
              <StatBox label="Overdue"  value={dashboard?.stats.overdue  ?? 0} color={colors.danger}  />
              <StatBox label="Due Soon" value={dashboard?.stats.dueSoon  ?? 0} color="#F59E0B"        />
              <StatBox label="Upcoming" value={dashboard?.stats.upcoming ?? 0} color={colors.success} />
            </View>

            {/* ── MSN Picker ──────────────────────────────── */}
            <Text style={styles.sectionLabel}>SELECT AIRCRAFT (MSN)</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: 6 }}
            >
              {aircraftList.map((ac) => (
                <MsnPill
                  key={ac.AircraftId}
                  label={ac.MSN}
                  active={selectedAircraft?.AircraftId === ac.AircraftId}
                  onPress={() => setSelectedAircraft(ac)}
                />
              ))}
            </ScrollView>
            {selectedAircraft && (
              <Text style={{ fontSize: 11, color: "#6B7280", marginBottom: 24 }}>
                {selectedAircraft.Registration} · {selectedAircraft.AircraftType}
              </Text>
            )}

            {/* ── Inspection schedule ─────────────────────── */}
            <Text style={styles.sectionLabel}>INSPECTION SCHEDULE</Text>
            {(dashboard?.tasks ?? []).map((task) => (
              <TaskCard
                key={task.AuditId}
                task={task}
                isActive={selectedAircraft?.AircraftId === task.AircraftId}
                onPress={() => {
                  const ac = aircraftList.find((a) => a.AircraftId === task.AircraftId);
                  if (ac) setSelectedAircraft(ac);
                }}
                onStartInspection={() => {
                  const ac = aircraftList.find((a) => a.AircraftId === task.AircraftId);
                  if (ac) setSelectedAircraft(ac);
                  startWorkflow();
                  navigation.navigate("Seats" as never);
                }}
              />
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 10,
    letterSpacing: 0.5,
  },
});
