import React, { useState, useMemo } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Image,
  KeyboardAvoidingView, Platform, ScrollView, SafeAreaView,
  StatusBar, ActivityIndicator, Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { loginUser } from "../../api/authApi";
import { Theme, useTheme } from "../../theme/Theme";
import { Eye, EyeOff, ArrowRight, Sparkles, Shield, BarChart3, Sun, Moon, Monitor } from "lucide-react-native";

const universityImg = require("../../assets/university.jpg");
const logoImg = require("../../assets/logo.png");

export default function LoginScreen({ navigation }) {
  const { colors, isDark, mode, toggleTheme } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === 'android'
    ? Math.max(insets.top, StatusBar.currentHeight || 0)
    : insets.top;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Missing Fields", "Please enter both email and password.");
      return;
    }
    setIsLoading(true);
    try {
      const data = await loginUser(email.trim(), password);
      if (data.role === "ADMIN") {
        navigation.reset({ index: 0, routes: [{ name: "AdminTabs" }] });
      } else if (data.role === "TEACHER") {
        navigation.reset({ index: 0, routes: [{ name: "TeacherTabs" }] });
      } else if (data.role === "STUDENT") {
        navigation.reset({ index: 0, routes: [{ name: "StudentTabs" }] });
      }
    } catch (error) {
      Alert.alert("Login Failed", error.message || "Invalid credentials. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const ThemeIcon = mode === 'dark' ? Moon : mode === 'light' ? Sun : Monitor;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar barStyle="light-content" backgroundColor={isDark ? '#0f172a' : Theme.colors.primary} />
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '50%', backgroundColor: isDark ? '#0f172a' : Theme.colors.primary }} />
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
            {/* Brand + Theme Toggle Row */}
            <View style={styles.heroTopRow}>
              <View style={styles.brandRow}>
                <Image source={logoImg} style={styles.brandLogo} resizeMode="contain" />
                <View>
                  <Text style={styles.brandName}>Facidance</Text>
                  <Text style={styles.brandSub}>Department of Information Technology</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.themeToggle} onPress={toggleTheme} activeOpacity={0.7}>
                <ThemeIcon size={16} color="#fff" />
              </TouchableOpacity>
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
          <Text style={styles.formTitle}>Welcome back 👋</Text>
          <Text style={styles.formSubtitle}>Sign in to access your Facidance portal.</Text>

          {/* Email */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>EMAIL ADDRESS</Text>
            <View style={[styles.inputWrap, emailFocused && styles.inputWrapFocused]}>
              <TextInput
                style={styles.input}
                placeholder="you@gauhati.ac.in"
                placeholderTextColor={colors.inputPlaceholder}
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
                placeholder="Enter your password"
                placeholderTextColor={colors.inputPlaceholder}
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
          </View>

          {/* Sign In Button */}
          <TouchableOpacity
            style={[styles.signInBtn, isLoading && styles.signInBtnDisabled]}
            onPress={handleLogin}
            activeOpacity={0.85}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.primaryForeground} />
            ) : (
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text style={styles.signInText}>Sign in</Text>
                <ArrowRight size={16} color={colors.primaryForeground} style={{ marginLeft: 6 }} />
              </View>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Register CTA */}
          <View style={styles.ctaBox}>
            <Text style={styles.ctaText}>
              New faculty member?{" "}
              <Text style={styles.ctaLink} onPress={() => navigation.navigate("Register")}>
                Register here
              </Text>
            </Text>
            <Text style={styles.ctaHint}>Account pending admin approval after registration.</Text>
          </View>

          {/* Terms */}
          <Text style={styles.termsText}>
            By signing in you agree to the Department's{"\n"}terms of use and privacy policy.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
    </View>
  );
}

const createStyles = (colors, isDark) => StyleSheet.create({
  screenWrapper: { flex: 1, backgroundColor: isDark ? '#0f172a' : Theme.colors.primary },
  scrollContent: { flexGrow: 1 },

  // Hero
  hero: {
    minHeight: 460,
    width: "100%",
    position: "relative",
    overflow: "hidden",
  },
  heroImage: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: isDark ? "rgba(15,23,42,0.88)" : "rgba(0,49,53,0.80)",
  },
  heroInner: {
    justifyContent: "flex-end",
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  brandLogo: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#fff",
  },
  brandName: { color: "#fff", fontSize: 20, fontWeight: "800" },
  brandSub: { color: "rgba(255,255,255,0.6)", fontSize: 11, fontWeight: "500" },

  // Theme Toggle
  themeToggle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },

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
    color: "#fff",
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
    marginTop: -45,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 36,
    borderTopWidth: isDark ? 1 : 0,
    borderTopColor: isDark ? 'rgba(255,255,255,0.15)' : 'transparent',
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
    marginBottom: 26,
  },
  fieldGroup: { marginBottom: 18 },
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
    backgroundColor: isDark ? colors.inputBg : "#fff",
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

  // Button
  signInBtn: {
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
  signInBtnDisabled: { opacity: 0.7 },
  signInText: { color: colors.primaryForeground, fontSize: 16, fontWeight: "700" },

  // Divider
  dividerRow: { flexDirection: "row", alignItems: "center", marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { paddingHorizontal: 16, color: colors.mutedForeground, fontSize: 13 },

  // CTA Box
  ctaBox: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: "center",
  },
  ctaText: { fontSize: 14, color: colors.textBody, textAlign: "center" },
  ctaLink: { color: colors.accent, fontWeight: "700" },
  ctaHint: { fontSize: 12, color: colors.mutedForeground, marginTop: 3, textAlign: "center" },

  // Terms
  termsText: {
    fontSize: 12, color: colors.mutedForeground,
    textAlign: "center", marginTop: 22, lineHeight: 18,
  },
});