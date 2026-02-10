import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import MainTabNavigator from "@/navigation/MainTabNavigator";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { AppColors } from "@/constants/theme";

import CreateSquadScreen from "@/screens/CreateSquadScreen";

export type RootStackParamList = {
  Main: undefined;
  CreateSquad: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator
      screenOptions={{
        ...screenOptions,
        contentStyle: {
          backgroundColor: AppColors.background,
        },
      }}
    >
      <Stack.Screen
        name="Main"
        component={MainTabNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CreateSquad"
        component={CreateSquadScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}
