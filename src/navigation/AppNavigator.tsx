import React, { useState } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { NavigationContainer } from "@react-navigation/native";
import { View, Text } from "react-native";
import CustomTopBar from "./CustomTopBar";
import SignIn from "../screens/auth/SignIn";
import Galley from "../screens/galley/Galley";
import Home from "../screens/home/Home";
import Seats from "../screens/seats/Seats";
import Profile from "../screens/profile/Profile";

const DummyScreen = ({ title }: { title: string }) => (
  <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
    <Text>{title} Screen</Text>
  </View>
);

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTopBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Home" component={Home} />
      <Tab.Screen name="Seats" component={Seats} />
      <Tab.Screen name="Galley" component={Galley} />
      <Tab.Screen name="Lavatory">
        {() => <DummyScreen title="Lavatory" />}
      </Tab.Screen>
      <Tab.Screen name="Attendant">
        {() => <DummyScreen title="Attendant" />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const [signedIn, setSignedIn] = useState(false);

  return (
    <NavigationContainer>
      {signedIn ? (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Main" component={MainTabs} />
          <Stack.Screen name="Profile" component={Profile} />
        </Stack.Navigator>
      ) : (
        <SignIn onSignIn={() => setSignedIn(true)} />
      )}
    </NavigationContainer>
  );
}
