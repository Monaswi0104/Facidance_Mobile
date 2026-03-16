import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Button, Alert } from "react-native";
import { clearAuth } from "../api/authStorage";

import AdminDashboard from "../screens/admin/AdminDashboard";
import TeachersManagement from "../screens/admin/TeachersManagement";
import DepartmentsManagement from "../screens/admin/DepartmentsManagement";
import ProgramsManagement from "../screens/admin/ProgramsManagement";
import CoursesManagement from "../screens/admin/CoursesManagement";
import StudentsManagement from "../screens/admin/StudentsManagement";

const Stack = createNativeStackNavigator();

export default function AdminTabs({ navigation }) {

  const confirmLogout = () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          onPress: async () => {
            await clearAuth();
            navigation.reset({
              index: 0,
              routes: [{ name: "Login" }],
            });
          },
        },
      ]
    );
  };

  return (
    <Stack.Navigator
      screenOptions={{
        headerRight: () => (
          <Button title="Logout" onPress={confirmLogout} />
        ),
      }}
    >

      {/* DASHBOARD (NO BACK BUTTON) */}
      <Stack.Screen
        name="AdminDashboard"
        component={AdminDashboard}
        options={{
          headerBackVisible: false,
          gestureEnabled: false
        }}
      />

      {/* OTHER PAGES (BACK BUTTON ENABLED) */}
      <Stack.Screen name="TeachersManagement" component={TeachersManagement}/>
      <Stack.Screen name="DepartmentsManagement" component={DepartmentsManagement}/>
      <Stack.Screen name="ProgramsManagement" component={ProgramsManagement}/>
      <Stack.Screen name="CoursesManagement" component={CoursesManagement}/>
      <Stack.Screen name="StudentsManagement" component={StudentsManagement}/>

    </Stack.Navigator>
  );
}