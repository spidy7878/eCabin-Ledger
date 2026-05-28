import React from "react";
import { View, Text, ScrollView, Image, TouchableOpacity, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { spacing } from "../../constants/spacing";
import { colors } from "../../constants/colors";
import { Ionicons, MaterialIcons, Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

export default function Profile() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  return (
    <View style={{ flex: 1, backgroundColor: "#F7F9FB" }}>
      {/* Custom Header */}
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
          <View style={styles.avatarContainer}>
            <Image
              source={{ uri: "https://novapicsly.com/wp-content/uploads/2026/02/aesthetic-spider-man-pfp-foggy-night-city-atmosphere-768x768.webp" }}
              style={styles.avatar}
            />
            <View style={styles.editBadge}>
              <MaterialIcons name="edit" size={14} color="#FFF" />
            </View>
          </View>
          <Text style={styles.userName}>User</Text>
          <Text style={styles.userEmail}>user@ecabinledger.com</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>Senior Inspector</Text>
          </View>
        </View>

        {/* Professional Details Section */}
        <Text style={styles.sectionHeader}>PROFESSIONAL DETAILS</Text>
        <View style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <View style={styles.detailIconContainer}>
              <Feather name="phone-call" size={20} color={colors.primary} />
            </View>
            <View>
              <Text style={styles.detailLabel}>Phone No.</Text>
              <Text style={styles.detailValue}>+91 99090 00900</Text>
            </View>
          </View>
          
          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <View style={styles.dividerDot} />
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.detailRow}>
            <View style={styles.detailIconContainer}>
              <MaterialIcons name="domain" size={20} color={colors.primary} />
            </View>
            <View>
              <Text style={styles.detailLabel}>Operator</Text>
              <Text style={styles.detailValue}>Macron Technology</Text>
            </View>
          </View>
        </View>

        {/* Account Settings Section */}
        <Text style={styles.sectionHeader}>ACCOUNT SETTINGS</Text>
        <View style={styles.settingsCard}>
          <TouchableOpacity style={styles.settingsRow}>
            <View style={[styles.detailIconContainer, { backgroundColor: "#F0F4F8" }]}>
              <Ionicons name="lock-closed-outline" size={20} color={colors.primary} />
            </View>
            <Text style={styles.settingsText}>Change Password</Text>
            <MaterialIcons name="chevron-right" size={24} color="#111" />
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton}>
          <MaterialIcons name="logout" size={20} color="#D32F2F" style={{ marginRight: 8 }} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        {/* Version Info */}
        <Text style={styles.versionText}>eCabin Version 2.4.1 (Build 822)</Text>
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
    position: "relative",
    marginBottom: spacing.sm,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: "#E2E8F0",
  },
  editBadge: {
    position: "absolute",
    bottom: -4,
    right: -4,
    backgroundColor: colors.primary,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFF",
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
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#F0F0F0",
  },
  dividerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#F97316",
    marginHorizontal: 8,
  },
  settingsCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    marginBottom: 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  settingsRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
  },
  settingsText: {
    flex: 1,
    fontSize: 16,
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
