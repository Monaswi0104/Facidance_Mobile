import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import LoginScreen from "../screens/auth/LoginScreen";
import RegisterScreen from "../screens/auth/RegisterScreen";

import AdminTabs from "./AdminTabs";
import TeacherTabs from "./TeacherTabs";
import StudentTabs from "./StudentTabs";

const Stack = createNativeStackNavigator();

export default function AuthNavigator(){

return(

<Stack.Navigator screenOptions={{headerShown:false}}>

<Stack.Screen name="Login" component={LoginScreen}/>
<Stack.Screen name="Register" component={RegisterScreen}/>

<Stack.Screen name="AdminTabs" component={AdminTabs}/>
<Stack.Screen name="TeacherTabs" component={TeacherTabs}/>
<Stack.Screen name="StudentTabs" component={StudentTabs}/>

</Stack.Navigator>

);

}