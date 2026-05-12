import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Theme } from '../theme/Theme';

interface AttendanceListProps {
  name: string;
  attendance: string | number;
}

export default function AttendanceList({ name, attendance }: AttendanceListProps): React.JSX.Element {
  return (
    <View style={styles.card}>
      <Text style={styles.name}>{name}</Text>
      <Text style={styles.attendance}>{attendance}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 15,
    backgroundColor: Theme.colors.card,
    marginBottom: 10,
    borderRadius: 8,
  },
  name: {
    fontSize: 16,
  },
  attendance: {
    fontSize: 16,
    fontWeight: "bold",
  },
});
