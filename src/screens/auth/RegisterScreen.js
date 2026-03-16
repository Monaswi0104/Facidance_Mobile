import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Alert
} from "react-native";
import { registerTeacher } from "../../api/authApi";

const universityImg = require("../../assets/university.jpg");

export default function RegisterScreen({ navigation }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const register = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      Alert.alert("Missing Fields", "Please fill in all fields.");
      return;
    }

    setIsLoading(true);
    try {
      await registerTeacher(name.trim(), email.trim(), password);
      Alert.alert(
        "Registration Submitted ✅",
        "Your teacher account is pending admin approval. You'll be able to login once approved.",
        [{ text: "OK", onPress: () => navigation.navigate("Login") }]
      );
    } catch (error) {
      Alert.alert("Registration Failed", error.message || "Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent} 
          bounces={false}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

          {/* Hero Image */}
          <View style={styles.header}>
            <Image
              source={universityImg}
              style={styles.headerImage}
              resizeMode="cover"
            />
            <View style={styles.overlay} />
            <View style={styles.headerContent}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>📍 Gauhati University</Text>
              </View>
              <Text style={styles.title}>Join GUAttend</Text>
              <Text style={styles.subtitle}>Create your account</Text>
            </View>
          </View>

          {/* Form Card */}
          <View style={styles.formContainer}>
            <Text style={styles.formTitle}>Teacher Registration 📝</Text>
            <Text style={styles.formSubtitle}>Create a teacher account below. Students do not need to register.</Text>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>👤  Full Name</Text>
              <TextInput
                style={styles.input}
                placeholder="John Doe"
                placeholderTextColor="#9CA3AF"
                value={name}
                onChangeText={setName}
                editable={!isLoading}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>📧  Email Address</Text>
              <TextInput
                style={styles.input}
                placeholder="your.email@gu.edu"
                placeholderTextColor="#9CA3AF"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!isLoading}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>🔒  Password</Text>
              <View style={styles.passwordWrapper}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Create a strong password"
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry={!isPasswordVisible}
                  value={password}
                  onChangeText={setPassword}
                  editable={!isLoading}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setIsPasswordVisible(!isPasswordVisible)}
                >
                  <Text style={styles.eyeText}>
                    {isPasswordVisible ? "🙈" : "👁️"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Removed the Role Selector block because only Teacher Registration is supported. Student accounts are made via CSV. */}

            <TouchableOpacity
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={register}
              activeOpacity={0.8}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>Submit Registration  →</Text>
              )}
            </TouchableOpacity>
            
            <View style={styles.studentNoteBox}>
              <Text style={styles.studentNoteTitle}>Are you a student?</Text>
              <Text style={styles.studentNoteText}>You do not need to register. Your course teacher will add you directly. You will get your credentials in your email account.</Text>
            </View>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.loginContainer}>
              <Text style={styles.loginText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate("Login")}>
                <Text style={styles.loginLink}>Log In</Text>
              </TouchableOpacity>
            </View>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#FFFFFF" },
  scrollContent: { flexGrow: 1 },
  header: { height: 280, width: "100%", position: "relative", backgroundColor: "#0F172A" },
  headerImage: { width: "100%", height: "100%" },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(15, 23, 42, 0.45)" },
  headerContent: { position: "absolute", bottom: 40, left: 24, right: 24 },
  badge: { alignSelf: "flex-start", backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, marginBottom: 14 },
  badgeText: { color: "#FFFFFF", fontSize: 13, fontWeight: "600" },
  title: { fontSize: 38, fontWeight: "900", color: "#FFFFFF", letterSpacing: 1, marginBottom: 6 },
  subtitle: { fontSize: 17, color: "#CBD5E1", fontWeight: "500", letterSpacing: 0.5 },
  formContainer: { flex: 1, backgroundColor: "#FFFFFF", marginTop: -24, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24, paddingTop: 28, paddingBottom: 40 },
  formTitle: { fontSize: 24, fontWeight: "800", color: "#0F172A", marginBottom: 6 },
  formSubtitle: { fontSize: 15, color: "#64748B", marginBottom: 24 },
  inputContainer: { marginBottom: 18 },
  label: { fontSize: 14, fontWeight: "600", color: "#334155", marginBottom: 8 },
  input: { backgroundColor: "#F8FAFC", borderWidth: 1.5, borderColor: "#E2E8F0", borderRadius: 14, paddingHorizontal: 16, paddingVertical: 15, fontSize: 16, color: "#0F172A" },
  passwordWrapper: { flexDirection: "row", alignItems: "center", backgroundColor: "#F8FAFC", borderWidth: 1.5, borderColor: "#E2E8F0", borderRadius: 14 },
  passwordInput: { flex: 1, paddingHorizontal: 16, paddingVertical: 15, fontSize: 16, color: "#0F172A" },
  eyeButton: { paddingHorizontal: 16, paddingVertical: 14, justifyContent: "center" },
  eyeText: { fontSize: 20 },
  roleRow: { flexDirection: "row" },
  roleOption: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#F8FAFC", borderWidth: 1.5, borderColor: "#E2E8F0", borderRadius: 14, paddingVertical: 14, marginHorizontal: 4 },
  roleOptionActive: { backgroundColor: "#EEF2FF", borderColor: "#4361EE" },
  roleIcon: { fontSize: 20, marginRight: 8 },
  roleLabel: { fontSize: 15, fontWeight: "600", color: "#64748B" },
  roleLabelActive: { color: "#4361EE" },
  button: { backgroundColor: "#4361EE", borderRadius: 14, paddingVertical: 17, alignItems: "center", shadowColor: "#4361EE", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6, marginTop: 8 },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: "#FFFFFF", fontSize: 17, fontWeight: "700", letterSpacing: 0.5 },
  studentNoteBox: { backgroundColor: "#F0FDF4", borderWidth: 1, borderColor: "#BBF7D0", borderRadius: 12, padding: 16, marginTop: 24 },
  studentNoteTitle: { fontSize: 14, fontWeight: "700", color: "#166534", marginBottom: 4 },
  studentNoteText: { fontSize: 13, color: "#15803D", lineHeight: 18 },
  dividerRow: { flexDirection: "row", alignItems: "center", marginVertical: 24 },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#E2E8F0" },
  dividerText: { paddingHorizontal: 16, color: "#94A3B8", fontSize: 14, fontWeight: "500" },
  loginContainer: { flexDirection: "row", justifyContent: "center", alignItems: "center" },
  loginText: { color: "#64748B", fontSize: 15 },
  loginLink: { color: "#4361EE", fontSize: 15, fontWeight: "bold" },
});