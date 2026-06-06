import React, { useState } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Input from "../../components/Input";
import Button from "../../components/Button";
import { spacing } from "../../constants/spacing";
import { colors } from "../../constants/colors";
import { useAuth } from "../../context/AuthContext";

export default function SignIn() {
  const insets = useSafeAreaInsets();
  const { login } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [show,     setShow]     = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  const handleLogin = async () => {
    if (!username.trim() || !password) {
      setError("Please enter your username and password.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await login(username.trim(), password);
      // Navigation is handled automatically by AppNavigator when user state updates
    } catch (e: any) {
      const msg: string = e?.message ?? "";
      setError(
        msg.includes("401")
          ? "Invalid username or password. Please try again."
          : msg.includes("Session expired")
          ? "Session expired. Please sign in again."
          : msg.match(/^(Failed to fetch|Network request failed|TypeError)/)
          ? "Could not connect to server. Check your network."
          : `Sign-in failed: ${msg || "unknown error"}`
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          backgroundColor: "#F7F9FB",
          paddingTop: insets.top,
          paddingHorizontal: spacing.lg,
          paddingBottom: insets.bottom + 24,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo */}
        <View style={{ alignItems: "center", marginTop: 48 }}>
          <Image
            source={require("../../../assets/logo.png")}
            style={{ width: 120, height: 120 }}
            resizeMode="contain"
          />
          <Text style={{ fontSize: 22, marginTop: 16, color: colors.text, fontWeight: "700" }}>
            eCabin Ledger
          </Text>
          <Text style={{ fontSize: 13, color: "#6B7280", marginTop: 4 }}>
            Inspector Portal
          </Text>
        </View>

        {/* Card */}
        <View
          style={{
            marginTop: 36,
            backgroundColor: "white",
            padding: 24,
            borderRadius: 14,
            shadowColor: "#000",
            shadowOpacity: 0.05,
            shadowRadius: 10,
            elevation: 3,
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: "700", color: colors.text, marginBottom: 4 }}>
            Sign In
          </Text>
          <Text style={{ color: "#6B7280", fontSize: 13, marginBottom: 20 }}>
            Use your employee credentials to access inspection tasks.
          </Text>

          <Input
            label="Username or Email"
            value={username}
            onChangeText={(t) => { setUsername(t); setError(null); }}
            placeholder="Username"
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <View style={{ marginTop: 16 }}>
            <Input
              label="Password"
              value={password}
              onChangeText={(t) => { setPassword(t); setError(null); }}
              placeholder="Enter your password"
              secureTextEntry={!show}
            />
            <TouchableOpacity
              onPress={() => setShow((s) => !s)}
              style={{ position: "absolute", right: 12, top: 38 }}
            >
              <Text style={{ color: colors.primary, fontSize: 13 }}>
                {show ? "Hide" : "Show"}
              </Text>
            </TouchableOpacity>
          </View>

          {error && (
            <View
              style={{
                marginTop: 14,
                backgroundColor: "#FEF2F2",
                borderRadius: 8,
                padding: 10,
                borderLeftWidth: 3,
                borderLeftColor: colors.danger,
              }}
            >
              <Text style={{ color: colors.danger, fontSize: 13 }}>{error}</Text>
            </View>
          )}

          <View style={{ marginTop: 24 }}>
            {loading ? (
              <ActivityIndicator color={colors.primary} size="large" />
            ) : (
              <Button
                title="Sign In"
                onPress={handleLogin}
              />
            )}
          </View>
        </View>

        <Text
          style={{
            textAlign: "center",
            color: "#9CA3AF",
            fontSize: 11,
            marginTop: 32,
          }}
        >
          Contact your administrator if you cannot access your account.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
