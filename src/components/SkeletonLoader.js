import React, { useEffect, useRef, useMemo } from "react";
import { View, StyleSheet, Animated, Easing } from "react-native";
import { useTheme } from "../theme/Theme";

// Animated shimmer effect
function ShimmerView({ style, colors }) {
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const styles = useMemo(() => createStyles(colors), [colors]);

  useEffect(() => {
    const shimmer = Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 1500,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      })
    );
    shimmer.start();
    return () => shimmer.stop();
  }, [shimmerAnim]);

  const translateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-200, 200],
  });

  return (
    <View style={[styles.skeleton, style]}>
      <Animated.View
        style={[
          styles.shimmer,
          {
            transform: [{ translateX }],
            backgroundColor: colors.borderFocus || 'rgba(255,255,255,0.1)',
          },
        ]}
      />
    </View>
  );
}

export default function SkeletonLoader({ style }) {
  const { colors } = useTheme();
  return <ShimmerView style={style} colors={colors} />;
}

// Stat Card Skeleton
export function StatCardSkeleton() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.statCard}>
      <View style={styles.statTopRow}>
        <SkeletonLoader style={styles.statLabel} />
        <SkeletonLoader style={styles.statIcon} />
      </View>
      <SkeletonLoader style={styles.statNumber} />
      <SkeletonLoader style={styles.statSub} />
    </View>
  );
}

// Section Card Skeleton
export function SectionCardSkeleton({ rows = 3 }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.sectionCard}>
      <SkeletonLoader style={styles.sectionTitle} />
      <SkeletonLoader style={styles.sectionSubtitle} />
      {Array.from({ length: rows }).map((_, i) => (
        <View key={i} style={styles.rowSkeleton}>
          <SkeletonLoader style={styles.rowAvatar} />
          <View style={styles.rowContent}>
            <SkeletonLoader style={styles.rowTitle} />
            <SkeletonLoader style={styles.rowSubtitle} />
          </View>
        </View>
      ))}
    </View>
  );
}

// List Item Skeleton
export function ListItemSkeleton() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.listItem}>
      <SkeletonLoader style={styles.listAvatar} />
      <View style={styles.listContent}>
        <SkeletonLoader style={styles.listTitle} />
        <SkeletonLoader style={styles.listSubtitle} />
      </View>
      <SkeletonLoader style={styles.listAction} />
    </View>
  );
}

// Course Card Skeleton
export function CourseCardSkeleton() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.courseCard}>
      <SkeletonLoader style={styles.courseTitle} />
      <View style={styles.courseMeta}>
        <SkeletonLoader style={styles.courseMetaItem} />
        <SkeletonLoader style={styles.courseMetaItem} />
      </View>
    </View>
  );
}

// Header Skeleton
export function HeaderSkeleton() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.header}>
      <SkeletonLoader style={styles.headerTitle} />
      <SkeletonLoader style={styles.headerSubtitle} />
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  skeleton: {
    backgroundColor: colors.border,
    borderRadius: 4,
    overflow: "hidden",
  },
  shimmer: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.5,
  },

  // Stat Card
  statCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  statTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  statLabel: { width: 80, height: 12, borderRadius: 6 },
  statIcon: { width: 36, height: 36, borderRadius: 10 },
  statNumber: { width: 60, height: 28, borderRadius: 6, marginBottom: 4 },
  statSub: { width: 50, height: 11, borderRadius: 6 },

  // Section Card
  sectionCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  sectionTitle: { width: 120, height: 16, borderRadius: 6, marginBottom: 4 },
  sectionSubtitle: { width: 100, height: 11, borderRadius: 6, marginBottom: 16 },
  rowSkeleton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowAvatar: { width: 34, height: 34, borderRadius: 17, marginRight: 10 },
  rowContent: { flex: 1 },
  rowTitle: { width: "70%", height: 13, borderRadius: 6, marginBottom: 4 },
  rowSubtitle: { width: "40%", height: 10, borderRadius: 6 },

  // List Item
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  listAvatar: { width: 36, height: 36, borderRadius: 10, marginRight: 12 },
  listContent: { flex: 1 },
  listTitle: { width: "60%", height: 13, borderRadius: 6, marginBottom: 4 },
  listSubtitle: { width: "30%", height: 10, borderRadius: 6 },
  listAction: { width: 32, height: 32, borderRadius: 8 },

  // Course Card
  courseCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  courseTitle: { width: "70%", height: 14, borderRadius: 6, marginBottom: 8 },
  courseMeta: { flexDirection: "row", gap: 8 },
  courseMetaItem: { width: 60, height: 10, borderRadius: 6 },

  // Header
  header: { marginBottom: 18, marginTop: 4 },
  headerTitle: { width: 150, height: 18, borderRadius: 6, marginBottom: 4 },
  headerSubtitle: { width: 200, height: 13, borderRadius: 6 },
});
