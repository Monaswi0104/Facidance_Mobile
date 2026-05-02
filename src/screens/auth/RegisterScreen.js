import React, {  useState , useMemo } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Image,
  KeyboardAvoidingView, Platform, ScrollView, SafeAreaView,
  StatusBar, ActivityIndicator, Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { registerTeacher } from "../../api/authApi";
import { Theme, useTheme } from "../../theme/Theme";
import { Eye, EyeOff, ArrowRight, Sparkles, Shield, BarChart3 } from "lucide-react-native";

const universityImg = require("../../assets/university.jpg");
const logoImg = require("../../assets/logo.png");

export default function RegisterScreen({ navigation }) {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === 'android'
    ? Math.max(insets.top, StatusBar.currentHeight || 0)
    : insets.top;
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [nameFocused, setNameFocused] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

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
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '50%', backgroundColor: colors.primary }} />
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
        {/* Hero */}
        <View style={[styles.hero, { paddingTop: topPadding }]}>
          <Image source={universityImg} style={styles.heroImage} resizeMode="cover" />
          <View style={styles.heroOverlay} />

          <View style={styles.heroInner}>
            {/* Brand */}
            <View style={styles.brandRow}>
              <Image source={logoImg} style={styles.brandLogo} resizeMode="contain" />
              <View>
                <Text style={styles.brandName}>Facidance</Text>
                <Text style={styles.brandSub}>Department of Information Technology</Text>
              </View>
            </View>

            {/* AI Badge */}
            <View style={styles.aiBadge}>
              <Sparkles size={13} color={colors.success} style={{ marginRight: 5 }} />
              <Text style={styles.aiBadgeText}>AI-Powered Smart Attendance</Text>
            </View>

            {/* Title */}
            <Text style={styles.heroTitle}>Gauhati University</Text>
            <Text style={styles.heroSubtitle}>Smart face recognition attendance — built for the{"\n"}Department of Information Technology.</Text>

            {/* Features */}
            <View style={styles.featureList}>
              <View style={styles.featureItem}>
                <Sparkles size={10} color={colors.success} />
                <Text style={styles.featureText}>AI face recognition attendance</Text>
              </View>
              <View style={styles.featureItem}>
                <Shield size={10} color={colors.success} />
                <Text style={styles.featureText}>Role-based secure access</Text>
              </View>
              <View style={styles.featureItem}>
                <BarChart3 size={10} color={colors.success} />
                <Text style={styles.featureText}>Smart analytics & reporting</Text>
              </View>
            </View>

            {/* Stats */}
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>1500+</Text>
                <Text style={styles.statLabel}>Students</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>98.2%</Text>
                <Text style={styles.statLabel}>Accuracy</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>10+</Text>
                <Text style={styles.statLabel}>Courses</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Form */}
        <View style={styles.formSection}>
          <Text style={styles.formTitle}>Faculty registration 👋</Text>
          <Text style={styles.formSubtitle}>Create your faculty account — admin will approve it shortly.</Text>

          {/* Full Name */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>FULL NAME</Text>
            <View style={[styles.inputWrap, nameFocused && styles.inputWrapFocused]}>
              <TextInput
                style={styles.input}
                placeholder="Dr. Firstname Lastname"
                placeholderTextColor="#94a3b8"
                value={name}
                onChangeText={setName}
                editable={!isLoading}
                onFocus={() => setNameFocused(true)}
                onBlur={() => setNameFocused(false)}
              />
            </View>
          </View>

          {/* Email */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>EMAIL ADDRESS</Text>
            <View style={[styles.inputWrap, emailFocused && styles.inputWrapFocused]}>
              <TextInput
                style={styles.input}
                placeholder="you@gauhati.ac.in"
                placeholderTextColor="#94a3b8"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!isLoading}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
              />
            </View>
          </View>

          {/* Password */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>PASSWORD</Text>
            <View style={[styles.inputWrap, passwordFocused && styles.inputWrapFocused]}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="At least 6 characters"
                placeholderTextColor="#94a3b8"
                secureTextEntry={!isPasswordVisible}
                value={password}
                onChangeText={setPassword}
                editable={!isLoading}
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setIsPasswordVisible(!isPasswordVisible)}
              >
                {isPasswordVisible ? (
                  <EyeOff size={18} color={colors.mutedForeground} />
                ) : (
                  <Eye size={18} color={colors.mutedForeground} />
                )}
              </TouchableOpacity>
            </View>
            <Text style={styles.passwordHint}>Use a strong password — minimum 6 characters.</Text>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitBtn, isLoading && styles.submitBtnDisabled]}
            onPress={register}
            activeOpacity={0.85}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.primaryForeground} />
            ) : (
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text style={styles.submitText}>Submit registration</Text>
                <ArrowRight size={16} color={colors.primaryForeground} style={{ marginLeft: 6 }} />
              </View>
            )}
          </TouchableOpacity>

          {/* Login Link */}
          <View style={styles.loginRow}>
            <Text style={styles.loginRowText}>
              Already have an account?{" "}
              <Text style={styles.loginRowLink} onPress={() => navigation.navigate("Login")}>
                Sign in here
              </Text>
            </Text>
          </View>

          {/* Terms */}
          <Text style={styles.termsText}>
            By registering you agree to the Department's terms of use and{"\n"}privacy policy.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  screenWrapper: { flex: 1, backgroundColor: colors.primary },
  scrollContent: { flexGrow: 1 },

  // Hero
  hero: {
    minHeight: 460,
    width: "100%",
    position: "relative",
    paddingHorizontal: 24,
  },
  heroImage: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,49,53,0.80)",
  },
  heroInner: {
    justifyContent: "flex-end",
    paddingBottom: 32,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 20,
  },
  brandLogo: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.background,
  },
  brandName: { color: colors.primaryForeground, fontSize: 20, fontWeight: "800" },
  brandSub: { color: "rgba(255,255,255,0.6)", fontSize: 11, fontWeight: "500" },

  // AI Badge
  aiBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(16,185,129,0.15)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: "flex-start",
    marginBottom: 14,
  },
  aiBadgeText: { fontSize: 13, fontWeight: "700", color: colors.success },

  heroTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: colors.primaryForeground,
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  heroSubtitle: {
    fontSize: 12,
    color: "rgba(255,255,255,0.5)",
    lineHeight: 17,
    marginBottom: 20,
  },

  // Features
  featureList: { marginBottom: 24 },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  featureText: { fontSize: 11, color: "rgba(255,255,255,0.65)", marginLeft: 8 },

  // Stats
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.10)",
  },
  statItem: { alignItems: "center" },
  statValue: { fontSize: 18, fontWeight: "800", color: colors.success },
  statLabel: { fontSize: 10, color: "rgba(255,255,255,0.45)", marginTop: 1 },

  // Form
  formSection: {
    flex: 1,
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -16,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 36,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.foreground,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  formSubtitle: {
    fontSize: 14,
    color: colors.mutedForeground,
    marginBottom: 24,
  },
  fieldGroup: { marginBottom: 16 },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textBody,
    letterSpacing: 0.8,
    marginBottom: 7,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 10,
    overflow: "hidden",
  },
  inputWrapFocused: {
    borderColor: colors.accent,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 2,
  },
  input: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: colors.foreground,
  },
  eyeBtn: { paddingHorizontal: 14, paddingVertical: 12 },
  passwordHint: { fontSize: 12, color: colors.mutedForeground, marginTop: 5 },

  // Button
  submitBtn: {
    borderRadius: 10,
    marginTop: 6,
    backgroundColor: colors.primaryDark,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnDisabled: { opacity: 0.7 },
  submitText: { color: colors.primaryForeground, fontSize: 16, fontWeight: "700" },

  // Login Link
  loginRow: { alignItems: "center", marginTop: 20 },
  loginRowText: { fontSize: 14, color: colors.textBody, textAlign: "center" },
  loginRowLink: { color: colors.accent, fontWeight: "700" },

  // Terms
  termsText: {
    fontSize: 12, color: colors.mutedForeground,
    textAlign: "center", marginTop: 18, lineHeight: 18,
  },
});