import { Theme } from '../theme/Theme';
import React from "react";
import { TouchableOpacity, Text, StyleSheet } from "react-native";

export default function DashboardCard({ title, onPress }) {

return (

<TouchableOpacity
style={styles.card}
onPress={onPress}
>

<Text style={styles.text}>{title}</Text>

</TouchableOpacity>

);

}

const styles = StyleSheet.create({

card:{
backgroundColor: Theme.colors.card,
padding:20,
marginBottom:15,
borderRadius:10,
elevation:3
},

text:{
fontSize:18,
fontWeight:"500"
}

});