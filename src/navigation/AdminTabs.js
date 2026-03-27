import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Alert, TouchableOpacity, Text, View, StyleSheet } from "react-native";
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
          style: "destructive",
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

  const LogoutIcon = () => (
    <TouchableOpacity onPress={confirmLogout} style={s.logoutBtn} activeOpacity={0.7}>
      <View style={s.logoutDoor} />
      <View style={s.logoutArrow}>
        <Text style={s.logoutArrowText}>→</Text>
      </View>
    </TouchableOpacity>
  );

  const commonHeaderStyle = {
    headerStyle: { backgroundColor: "#FFFFFF" },
    headerTintColor: "#0F172A",
    headerTitleStyle: { fontWeight: "700", fontSize: 17, color: "#0F172A" },
    headerShadowVisible: false,
    headerRight: () => <LogoutIcon />,
  };

  return (
    <Stack.Navigator screenOptions={commonHeaderStyle}>

      {/* DASHBOARD (NO BACK BUTTON) */}
      <Stack.Screen
        name="AdminDashboard"
        component={AdminDashboard}
        options={{
          title: "Admin Panel",
          headerBackVisible: false,
          gestureEnabled: false,
        }}
      />

      {/* OTHER PAGES (BACK BUTTON ENABLED) */}
      <Stack.Screen name="TeachersManagement" component={TeachersManagement} options={{ title: "Teachers" }} />
      <Stack.Screen name="DepartmentsManagement" component={DepartmentsManagement} options={{ title: "Departments" }} />
      <Stack.Screen name="ProgramsManagement" component={ProgramsManagement} options={{ title: "Programs" }} />
      <Stack.Screen name="CoursesManagement" component={CoursesManagement} options={{ title: "Courses" }} />
      <Stack.Screen name="StudentsManagement" component={StudentsManagement} options={{ title: "Students" }} />

    </Stack.Navigator>
  );
}

const s = StyleSheet.create({
  logoutBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
  },
  logoutDoor: {
    width: 12,
    height: 14,
    borderWidth: 2,
    borderColor: "#EF4444",
    borderRightWidth: 0,
    borderRadius: 2,
    marginRight: -2,
  },
  logoutArrow: {
    justifyContent: "center",
    alignItems: "center",
  },
  logoutArrowText: {
    fontSize: 14,
    color: "#EF4444",
    fontWeight: "900",
  },
});