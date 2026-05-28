import React, { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Input from "../../components/Input";
import Button from "../../components/Button";
import { spacing } from "../../constants/spacing";
import { colors } from "../../constants/colors";

export default function SignIn({ onSignIn }: any) {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);

  const handleLogin = () => {
    if (email === "name@company.com" && password === "password123") {
      onSignIn && onSignIn();
    } else {
      alert("Invalid credentials. Use name@company.com / password123");
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#F7F9FB", paddingTop: insets.top, paddingHorizontal: spacing.lg, paddingBottom: insets.bottom }}>
      <View style={{ alignItems: "center", marginTop: 40 }}>
        <View
          style={{
            width: 84,
            height: 84,
            borderRadius: 18,
            backgroundColor: colors.primary,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ color: "white", fontWeight: "700", fontSize: 28 }}>✈️</Text>
        </View>
        <Text style={{ fontSize: 22, marginTop: 18, color: colors.text, fontWeight: "700" }}>
          eCabin Ledger
        </Text>
      </View>

      <View
        style={{
          marginTop: 32,
          backgroundColor: "white",
          padding: 20,
          borderRadius: 12,
          shadowColor: "#000",
          shadowOpacity: 0.03,
          shadowRadius: 8,
          elevation: 2,
        }}
      >
        <Text style={{ fontSize: 18, fontWeight: "600", marginBottom: 8 }}>Sign-In</Text>
        <Text style={{ color: "#6B7280", marginBottom: 12 }}>
          Enter credentials to access flight deck logs.
        </Text>

        <Input
          label="Email Address"
          placeholder="name@company.com"
          value={email}
          onChangeText={setEmail}
          leftIcon={<Text style={{ fontSize: 16 }}>✉️</Text>}
        />

        <Input
          label="Secure Password"
          placeholder="Enter password"
          value={password}
          onChangeText={setPassword}
          secure={!show}
          leftIcon={<Text style={{ fontSize: 16 }}>🔒</Text>}
          rightIcon={(
            <TouchableOpacity onPress={() => setShow((s) => !s)}>
              <Text style={{ fontSize: 16 }}>{show ? "👁️" : "👁️‍🗨️"}</Text>
            </TouchableOpacity>
          )}
        />

        <Button
          title="LOGIN"
          onPress={handleLogin}
          icon={<Text style={{ color: "white" }}>➡️</Text>}
          style={{ marginTop: 8 }}
        />

        <TouchableOpacity style={{ marginTop: 10, alignItems: "center" }}>
          <Text style={{ color: colors.primary }}>Forgot Password ?</Text>
        </TouchableOpacity>
      </View>

      <View style={{ flex: 1 }} />
      <Text style={{ textAlign: "center", color: "#9CA3AF", marginBottom: 12 }}>
        © eCabin Ledger v1.0.1
      </Text>
    </View>
  );
}
