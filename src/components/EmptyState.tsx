import React, { useEffect, useRef, useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing } from "react-native";
import { useTheme } from "../theme/Theme";
import {
  BookOpen, Users, Calendar, Search, Plus, RefreshCw,
  Camera, ClipboardList, BarChart2, Building2, GraduationCap,
  Layers, ScanFace, FileText, AlertTriangle, Inbox
} from "lucide-react-native";
import haptic from "../utils/haptics";

/**
 * Animated floating icon with decorative rings.
 * Creates a premium "illustrated" feel using only vector icons + animations.
 */
import type { LucideIcon } from "lucide-react-native";

interface AnimatedIllustrationProps {
  Icon: LucideIcon;
  colors: any;
}

function AnimatedIllustration({ Icon, colors }: AnimatedIllustrationProps) {
  const floatAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0.6)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Floating up/down
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: -8, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();

    // Pulsing outer ring
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.6, duration: 1800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();

    // Slow rotate for decoration dots
    Animated.loop(
      Animated.timing(rotateAnim, { toValue: 1, duration: 12000, easing: Easing.linear, useNativeDriver: true }),
    ).start();
  }, []);

  const rotate = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <View style={{ width: 140, height: 140, alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
      {/* Rotating decoration dots */}
      <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ rotate }] }]}>
        {[0, 60, 120, 180, 240, 300].map((deg, i) => (
          <View key={i} style={{
            position: "absolute",
            width: i % 2 === 0 ? 6 : 4,
            height: i % 2 === 0 ? 6 : 4,
            borderRadius: 3,
            backgroundColor: i % 2 === 0 ? colors.accent : colors.success,
            opacity: 0.3,
            top: 70 + Math.sin(deg * Math.PI / 180) * 64,
            left: 70 + Math.cos(deg * Math.PI / 180) * 64,
            transform: [{ translateX: -3 }, { translateY: -3 }],
          }} />
        ))}
      </Animated.View>

      {/* Pulsing outer ring */}
      <Animated.View style={{
        position: "absolute",
        width: 120, height: 120, borderRadius: 60,
        borderWidth: 1.5,
        borderColor: colors.accent,
        opacity: pulseAnim,
        borderStyle: "dashed",
      }} />

      {/* Inner ring */}
      <View style={{
        position: "absolute",
        width: 100, height: 100, borderRadius: 50,
        backgroundColor: colors.accentLight || (colors.accent + "12"),
      }} />

      {/* Floating icon */}
      <Animated.View style={{
        transform: [{ translateY: floatAnim }],
        width: 72, height: 72, borderRadius: 20,
        backgroundColor: colors.primaryDark,
        justifyContent: "center", alignItems: "center",
        shadowColor: colors.primaryDark,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
        elevation: 6,
      }}>
        <Icon size={32} color={colors.primaryForeground} />
      </Animated.View>
    </View>
  );
}

/**
 * Main EmptyState — animated illustration with title, subtitle, and optional action.
 */
interface EmptyStateProps {
  icon?: LucideIcon;
  title?: string;
  subtitle?: string;
  actionText?: string;
  onAction?: () => void;
  actionIcon?: LucideIcon;
  showImage?: boolean;
}

export default function EmptyState({
  icon: Icon = Inbox,
  title = "No Data Found",
  subtitle = "There's nothing to display here yet.",
  actionText,
  onAction,
  actionIcon: ActionIcon = RefreshCw,
}: EmptyStateProps) {
  const { colors } = useTheme();
  const s = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={s.container}>
      <AnimatedIllustration Icon={Icon} colors={colors} />
      <Text style={s.title}>{title}</Text>
      <Text style={s.subtitle}>{subtitle}</Text>
      {onAction && actionText && (
        <TouchableOpacity style={s.actionBtn} onPress={() => { haptic.light(); onAction(); }} activeOpacity={0.7}>
          <ActionIcon size={15} color={colors.primaryForeground} style={{ marginRight: 6 }} />
          <Text style={s.actionBtnText}>{actionText}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

/**
 * EmptyStateWithSearch — for filtered/search states that returned no results.
 */
interface EmptyStateWithSearchProps {
  icon?: LucideIcon;
  title?: string;
  subtitle?: string;
  onClearFilters?: () => void;
  showImage?: boolean;
}

export function EmptyStateWithSearch({
  icon: Icon = Search,
  title = "No Results Found",
  subtitle = "Try adjusting your search terms or filters.",
  onClearFilters,
}: EmptyStateWithSearchProps) {
  const { colors } = useTheme();
  const s = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={s.container}>
      <AnimatedIllustration Icon={Icon} colors={colors} />
      <Text style={s.title}>{title}</Text>
      <Text style={s.subtitle}>{subtitle}</Text>
      {onClearFilters && (
        <TouchableOpacity style={s.secondaryBtn} onPress={() => { haptic.light(); onClearFilters(); }} activeOpacity={0.7}>
          <Text style={s.secondaryBtnText}>Clear Filters</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

/**
 * EmptyStateWithCTA — prominent call-to-action for first-time/empty screens.
 */
interface EmptyStateWithCTAProps {
  icon?: LucideIcon;
  title?: string;
  subtitle?: string;
  ctaText?: string;
  ctaIcon?: LucideIcon;
  onCTA?: () => void;
}

export function EmptyStateWithCTA({
  icon: Icon = Plus,
  title = "Get Started",
  subtitle = "Add your first item to get started.",
  ctaText = "Add New",
  ctaIcon: CTAIcon = Plus,
  onCTA,
}: EmptyStateWithCTAProps) {
  const { colors } = useTheme();
  const s = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={s.container}>
      <AnimatedIllustration Icon={Icon} colors={colors} />
      <Text style={s.title}>{title}</Text>
      <Text style={s.subtitle}>{subtitle}</Text>
      {onCTA && (
        <TouchableOpacity style={s.actionBtn} onPress={() => { haptic.medium(); onCTA(); }} activeOpacity={0.7}>
          <CTAIcon size={15} color={colors.primaryForeground} style={{ marginRight: 6 }} />
          <Text style={s.actionBtnText}>{ctaText}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

/**
 * EmptyStateCompact — smaller version for inline use within cards/sections.
 */
interface EmptyStateCompactProps {
  icon?: LucideIcon;
  title?: string;
  subtitle?: string;
}

export function EmptyStateCompact({
  icon: Icon = Inbox,
  title = "Nothing here yet",
  subtitle = "",
}: EmptyStateCompactProps) {
  const { colors } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  return (
    <Animated.View style={{ alignItems: "center", paddingVertical: 28, opacity: fadeAnim }}>
      <View style={{
        width: 48, height: 48, borderRadius: 14,
        backgroundColor: colors.muted,
        justifyContent: "center", alignItems: "center",
        marginBottom: 10,
      }}>
        <Icon size={22} color={colors.mutedForeground} />
      </View>
      <Text style={{ fontSize: 14, fontWeight: "700", color: colors.mutedForeground, marginBottom: 2 }}>{title}</Text>
      {!!subtitle && <Text style={{ fontSize: 12, color: colors.mutedForeground, opacity: 0.7 }}>{subtitle}</Text>}
    </Animated.View>
  );
}

/**
 * EmptyStateWithActions — multiple action buttons.
 */
interface EmptyStateWithActionsProps {
  icon?: LucideIcon;
  title?: string;
  subtitle?: string;
  actions?: { text: string; icon?: LucideIcon; onPress?: () => void }[];
}

export function EmptyStateWithActions({
  icon: Icon = BookOpen,
  title = "No Data Found",
  subtitle = "There's nothing to display here yet.",
  actions = [],
}: EmptyStateWithActionsProps) {
  const { colors } = useTheme();
  const s = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={s.container}>
      <AnimatedIllustration Icon={Icon} colors={colors} />
      <Text style={s.title}>{title}</Text>
      <Text style={s.subtitle}>{subtitle}</Text>
      {actions.length > 0 && (
        <View style={{ flexDirection: "row", gap: 10 }}>
          {actions.map((action, i) => (
            <TouchableOpacity key={i} style={s.actionBtn} onPress={() => { haptic.light(); action.onPress?.(); }} activeOpacity={0.7}>
              {action.icon && <action.icon size={15} color={colors.primaryForeground} style={{ marginRight: 6 }} />}
              <Text style={s.actionBtnText}>{action.text}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

/**
 * EmptyStateWithIllustration — for read-only empty states with no actions.
 */
interface EmptyStateWithIllustrationProps {
  icon?: LucideIcon;
  title?: string;
  subtitle?: string;
}

export function EmptyStateWithIllustration({
  icon: Icon = BookOpen,
  title = "No Data Found",
  subtitle = "There's nothing to display here yet.",
}: EmptyStateWithIllustrationProps) {
  const { colors } = useTheme();
  const s = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={s.container}>
      <AnimatedIllustration Icon={Icon} colors={colors} />
      <Text style={s.title}>{title}</Text>
      <Text style={s.subtitle}>{subtitle}</Text>
    </View>
  );
}


const createStyles = (colors) => StyleSheet.create({
  container: {
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 32,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.foreground,
    textAlign: "center",
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    color: colors.mutedForeground,
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 19,
    maxWidth: 280,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primaryDark,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 3,
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.primaryForeground,
  },
  secondaryBtn: {
    backgroundColor: colors.muted,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
  },
  secondaryBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textBody,
  },
});
