import React, { useEffect, useRef } from "react";
import { AppState } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { NavigationContainer } from "@react-navigation/native";
import { View, ActivityIndicator } from "react-native";
import CustomTopBar from "./CustomTopBar";
import SignIn from "../screens/auth/SignIn";
import Galley from "../screens/galley/Galley";
import Home from "../screens/home/Home";
import Seats from "../screens/seats/Seats";
import Lavatory from "../screens/lavatory/Lavatory";
import Attendant from "../screens/attendant/Attendant";
import Profile from "../screens/profile/Profile";
import AdminHome from "../screens/admin/AdminHome";
import { AircraftProvider } from "../context/AircraftContext";
import { AuthProvider, useAuth } from "../context/AuthContext";
import { WorkflowProvider } from "../context/WorkflowContext";
import { startSync } from "../services/syncService";
import { colors } from "../constants/colors";

const Tab   = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function InspectorTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTopBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Home"      component={Home}     />
      <Tab.Screen name="Seats"     component={Seats}    />
      <Tab.Screen name="Galley"    component={Galley}   />
      <Tab.Screen name="Lavatory"  component={Lavatory} />
      <Tab.Screen name="Attendant" component={Attendant} />
    </Tab.Navigator>
  );
}

/** Inner navigator — rendered after AuthProvider is mounted. */
function RootNavigator() {
  const { user, loading } = useAuth();
  const appState = useRef(AppState.currentState);

  const isAdmin = user?.role === "Admin" || user?.role === "Manager";

  // Inspector-only: sync on foreground
  useEffect(() => {
    if (isAdmin) return;
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active" && appState.current !== "active" && user) {
        startSync().catch(() => {});
      }
      appState.current = state;
    });
    return () => sub.remove();
  }, [user, isAdmin]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!user) {
    return <NavigationContainer><SignIn /></NavigationContainer>;
  }

  // Admin / Manager → assignment dashboard only
  if (isAdmin) {
    return (
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="AdminHome" component={AdminHome} />
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  // Inspector → full inspection tabs
  return (
    <NavigationContainer>
      <AircraftProvider>
        <WorkflowProvider>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Main"    component={InspectorTabs} />
            <Stack.Screen name="Profile" component={Profile}       />
          </Stack.Navigator>
        </WorkflowProvider>
      </AircraftProvider>
    </NavigationContainer>
  );
}

export default function AppNavigator() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}
