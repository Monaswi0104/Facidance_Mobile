import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import LoginScreen from "../screens/auth/LoginScreen";
import RegisterScreen from "../screens/auth/RegisterScreen";

import AdminTabs from "./AdminTabs";
import TeacherTabs from "./TeacherTabs";
import StudentTabs from "./StudentTabs";

import type { RootStackParamList } from "../types/navigation";

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AuthNavigator(){

return(

<Stack.Navigator id="AuthStack" screenOptions={{ headerShown: false, animation: "slide_from_right", animationDuration: 250 }}>

<Stack.Screen name="Login" component={LoginScreen}/>
<Stack.Screen name="Register" component={RegisterScreen} options={{ animation: "slide_from_right" }}/>

<Stack.Screen name="AdminTabs" component={AdminTabs} options={{ animation: "fade_from_bottom", animationDuration: 350, gestureEnabled: false }}/>
<Stack.Screen name="TeacherTabs" component={TeacherTabs} options={{ animation: "fade_from_bottom", animationDuration: 350, gestureEnabled: false }}/>
<Stack.Screen name="StudentTabs" component={StudentTabs} options={{ animation: "fade_from_bottom", animationDuration: 350, gestureEnabled: false }}/>

</Stack.Navigator>

);

}