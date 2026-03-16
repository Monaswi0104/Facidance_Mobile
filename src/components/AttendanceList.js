import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function AttendanceList({ name, attendance }) {

return(

<View style={styles.card}>

<Text style={styles.name}>{name}</Text>

<Text style={styles.attendance}>{attendance}</Text>

</View>

);

}

const styles = StyleSheet.create({

card:{
flexDirection:"row",
justifyContent:"space-between",
padding:15,
backgroundColor:"#fff",
marginBottom:10,
borderRadius:8
},

name:{
fontSize:16
},

attendance:{
fontSize:16,
fontWeight:"bold"
}

});