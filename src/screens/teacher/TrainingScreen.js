import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from "react-native";

export default function TrainingScreen() {

  const trainModel = async () => {
    await fetch("http://YOUR_SERVER_IP:8000/train", {
      method: "POST"
    });
    alert("Model Training Started");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>

        <View style={styles.illustrationContainer}>
          <Text style={styles.illustrationEmoji}>🧠</Text>
        </View>

        <Text style={styles.title}>Train Recognition Model</Text>
        <Text style={styles.subtitle}>
          Start the AI training process to improve face recognition accuracy using the enrolled student photos.
        </Text>

        <TouchableOpacity style={styles.trainButton} onPress={trainModel} activeOpacity={0.8}>
          <Text style={styles.trainIcon}>⚡</Text>
          <Text style={styles.trainText}>Start Training</Text>
        </TouchableOpacity>

        <View style={styles.infoContainer}>
          <Text style={styles.infoTitle}>ℹ️ How it works</Text>
          <Text style={styles.infoItem}>• Collected student photos are processed</Text>
          <Text style={styles.infoItem}>• AI model learns to recognize each face</Text>
          <Text style={styles.infoItem}>• Training may take a few minutes</Text>
        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  container: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  illustrationContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#FDF4FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  illustrationEmoji: {
    fontSize: 48,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 10,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  trainButton: {
    flexDirection: "row",
    backgroundColor: "#7C3AED",
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    width: "100%",
    marginBottom: 32,
  },
  trainIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  trainText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },
  infoContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 12,
  },
  infoItem: {
    fontSize: 14,
    color: "#64748B",
    lineHeight: 24,
  },
});