import React from "react";
import { View, Text } from "react-native";
import { useNetworkState } from "expo-network";

/**
 * Renders a yellow warning bar whenever the device is offline.
 * Returns null when connected, so it adds zero layout cost online.
 */
export default function OfflineBanner() {
  const net = useNetworkState();
  // isInternetReachable can be null while being determined; treat null as online
  const isOffline = net.isConnected === false || net.isInternetReachable === false;

  if (!isOffline) return null;

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FEF3C7",
        borderRadius: 8,
        padding: 10,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: "#FCD34D",
      }}
    >
      <Text style={{ fontSize: 14, marginRight: 6 }}>📵</Text>
      <Text style={{ fontSize: 12, color: "#92400E", flex: 1, fontWeight: "500" }}>
        Offline — photos saved locally and will sync automatically when connected
      </Text>
    </View>
  );
}
