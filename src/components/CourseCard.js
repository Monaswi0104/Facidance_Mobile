import { Theme } from '../theme/Theme';
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";

export default function CourseCard({ course, onPress }) {

return(

<TouchableOpacity
style={styles.card}
onPress={onPress}
>

<Text style={styles.title}>{course.name}</Text>

</TouchableOpacity>

);

}

const styles = StyleSheet.create({

card:{
backgroundColor: Theme.colors.card,
padding:15,
borderRadius:8,
marginBottom:10
},

title:{
fontSize:18,
fontWeight:"500"
}

});