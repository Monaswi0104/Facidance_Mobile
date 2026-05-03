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

// ═══════════════════════════════════════════
// Dashboard Skeletons (existing)
// ═══════════════════════════════════════════

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

// ═══════════════════════════════════════════
// Management Screen Skeletons (NEW)
// ═══════════════════════════════════════════

/**
 * Stats Row Skeleton — 3 stat cards in a horizontal row.
 * Used in: TeachersManagement, StudentsManagement, CoursesManagement,
 *          DepartmentsManagement, ProgramsManagement
 */
export function StatsRowSkeleton({ count = 3 }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.mgmtStatsRow}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={styles.mgmtStatCard}>
          <View style={styles.mgmtStatTopRow}>
            <SkeletonLoader style={{ width: 55, height: 10, borderRadius: 4 }} />
            <SkeletonLoader style={{ width: 30, height: 30, borderRadius: 8 }} />
          </View>
          <SkeletonLoader style={{ width: 48, height: 24, borderRadius: 6, marginTop: 6 }} />
        </View>
      ))}
    </View>
  );
}

/**
 * Search Bar Skeleton — mimics a search input field.
 * Used in: all management screens
 */
export function SearchBarSkeleton() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.mgmtSearchBar}>
      <SkeletonLoader style={{ width: 14, height: 14, borderRadius: 7, marginRight: 8 }} />
      <SkeletonLoader style={{ flex: 1, height: 14, borderRadius: 6 }} />
    </View>
  );
}

/**
 * List Card Skeleton — a card with a header + several row items.
 * Used in: CoursesManagement, DepartmentsManagement, ProgramsManagement list cards
 */
export function ListCardSkeleton({ rows = 4 }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.mgmtListCard}>
      {/* Card Header */}
      <View style={styles.mgmtListHeader}>
        <SkeletonLoader style={{ width: 24, height: 24, borderRadius: 6, marginRight: 8 }} />
        <SkeletonLoader style={{ width: 100, height: 14, borderRadius: 6, flex: 1 }} />
        <SkeletonLoader style={{ width: 50, height: 18, borderRadius: 10 }} />
      </View>
      {/* Row items */}
      {Array.from({ length: rows }).map((_, i) => (
        <View key={i} style={[styles.mgmtListRow, i < rows - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
          <SkeletonLoader style={{ width: 32, height: 32, borderRadius: 8, marginRight: 10 }} />
          <View style={{ flex: 1 }}>
            <SkeletonLoader style={{ width: "65%", height: 13, borderRadius: 5, marginBottom: 5 }} />
            <SkeletonLoader style={{ width: "40%", height: 10, borderRadius: 4 }} />
          </View>
          <SkeletonLoader style={{ width: 50, height: 24, borderRadius: 6 }} />
        </View>
      ))}
    </View>
  );
}

/**
 * Teacher Card Skeleton — two side-by-side section cards (Pending + Approved).
 * Used in: TeachersManagement
 */
export function TeacherSectionsSkeleton() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const renderSection = (rows = 3) => (
    <View style={styles.mgmtTeacherSection}>
      {/* Section header */}
      <View style={styles.mgmtSectionHeader}>
        <SkeletonLoader style={{ width: 26, height: 26, borderRadius: 7, marginRight: 8 }} />
        <View style={{ flex: 1 }}>
          <SkeletonLoader style={{ width: 110, height: 13, borderRadius: 5, marginBottom: 4 }} />
          <SkeletonLoader style={{ width: 80, height: 10, borderRadius: 4 }} />
        </View>
        <SkeletonLoader style={{ width: 60, height: 20, borderRadius: 10 }} />
      </View>
      {/* Teacher rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <View key={i} style={[styles.mgmtTeacherRow, i < rows - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
          <SkeletonLoader style={{ width: 34, height: 34, borderRadius: 17, marginRight: 10 }} />
          <View style={{ flex: 1 }}>
            <SkeletonLoader style={{ width: "60%", height: 12, borderRadius: 5, marginBottom: 4 }} />
            <SkeletonLoader style={{ width: "45%", height: 10, borderRadius: 4, marginBottom: 3 }} />
            <SkeletonLoader style={{ width: "35%", height: 9, borderRadius: 4 }} />
          </View>
          <SkeletonLoader style={{ width: 48, height: 22, borderRadius: 6 }} />
        </View>
      ))}
    </View>
  );
  return (
    <View style={styles.mgmtTeacherContainer}>
      {renderSection(2)}
      {renderSection(3)}
    </View>
  );
}

/**
 * Student Table Skeleton — table header + rows with multiple columns.
 * Used in: StudentEnrollment
 */
export function TableSkeleton({ rows = 5, columns = 5 }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View>
      {Array.from({ length: rows }).map((_, i) => (
        <View key={i} style={[styles.mgmtTableRow, i < rows - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
          {/* Name + email column */}
          <View style={{ flex: 2, paddingRight: 5 }}>
            <SkeletonLoader style={{ width: "70%", height: 11, borderRadius: 4, marginBottom: 4 }} />
            <SkeletonLoader style={{ width: "50%", height: 9, borderRadius: 4 }} />
          </View>
          {/* Other columns */}
          {Array.from({ length: columns - 1 }).map((_, j) => (
            <View key={j} style={{ flex: j === 0 ? 1.5 : j === columns - 2 ? 1 : 0.7, alignItems: "center" }}>
              <SkeletonLoader style={{ width: "60%", height: 10, borderRadius: 4 }} />
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

/**
 * Course Card Full Skeleton — mimics a full course card with icon, title, badges, details.
 * Used in: Teacher MyCourses, Student MyCourses
 */
export function CourseCardFullSkeleton({ count = 3 }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={styles.mgmtCourseCard}>
          {/* Top row: icon + title + chevron */}
          <View style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: 14 }}>
            <SkeletonLoader style={{ width: 36, height: 36, borderRadius: 10, marginRight: 12 }} />
            <View style={{ flex: 1 }}>
              <SkeletonLoader style={{ width: "75%", height: 14, borderRadius: 6, marginBottom: 8 }} />
              <View style={{ flexDirection: "row" }}>
                <SkeletonLoader style={{ width: 45, height: 18, borderRadius: 10, marginRight: 6 }} />
                <SkeletonLoader style={{ width: 55, height: 18, borderRadius: 6 }} />
              </View>
            </View>
            <SkeletonLoader style={{ width: 18, height: 18, borderRadius: 4 }} />
          </View>
          {/* Detail rows */}
          {Array.from({ length: 3 }).map((_, j) => (
            <View key={j} style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
              <SkeletonLoader style={{ width: 12, height: 12, borderRadius: 6, marginRight: 8 }} />
              <SkeletonLoader style={{ width: `${50 + j * 10}%`, height: 10, borderRadius: 4 }} />
            </View>
          ))}
          {/* Footer */}
          <View style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12, marginTop: 4, flexDirection: "row", justifyContent: "space-between" }}>
            <SkeletonLoader style={{ width: 80, height: 12, borderRadius: 5 }} />
            <SkeletonLoader style={{ width: 14, height: 14, borderRadius: 4 }} />
          </View>
        </View>
      ))}
    </>
  );
}

/**
 * Attendance History Skeleton — stats grid + course bars.
 * Used in: Student AttendanceHistory, Student CourseAttendance
 */
export function AttendanceOverviewSkeleton() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View>
      {/* Stats Grid (2x2) */}
      <View style={styles.mgmtAttStatsGrid}>
        {Array.from({ length: 4 }).map((_, i) => (
          <View key={i} style={styles.mgmtAttStatCard}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <SkeletonLoader style={{ width: 55, height: 9, borderRadius: 4 }} />
              <SkeletonLoader style={{ width: 30, height: 30, borderRadius: 8 }} />
            </View>
            <SkeletonLoader style={{ width: 50, height: 22, borderRadius: 6 }} />
          </View>
        ))}
      </View>
      {/* Course bars section */}
      <View style={styles.mgmtListCard}>
        <SkeletonLoader style={{ width: 90, height: 14, borderRadius: 6, marginBottom: 4 }} />
        <SkeletonLoader style={{ width: 140, height: 10, borderRadius: 4, marginBottom: 16 }} />
        {Array.from({ length: 3 }).map((_, i) => (
          <View key={i} style={{ paddingVertical: 14, borderBottomWidth: i < 2 ? 1 : 0, borderBottomColor: colors.border }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
              <SkeletonLoader style={{ width: "55%", height: 12, borderRadius: 5 }} />
              <SkeletonLoader style={{ width: 40, height: 12, borderRadius: 5 }} />
            </View>
            <SkeletonLoader style={{ width: "100%", height: 6, borderRadius: 3 }} />
          </View>
        ))}
      </View>
    </View>
  );
}

/**
 * Report Config Skeleton — mimics the report config card.
 * Used in: AttendanceReport
 */
export function ReportConfigSkeleton() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.mgmtListCard}>
      <SkeletonLoader style={{ width: 150, height: 16, borderRadius: 6, marginBottom: 4 }} />
      <SkeletonLoader style={{ width: 200, height: 11, borderRadius: 4, marginBottom: 16 }} />
      {/* Dropdown */}
      <SkeletonLoader style={{ width: 60, height: 9, borderRadius: 4, marginBottom: 6 }} />
      <SkeletonLoader style={{ width: "100%", height: 42, borderRadius: 10, marginBottom: 14 }} />
      {/* Date row */}
      <View style={{ flexDirection: "row", marginBottom: 14 }}>
        <View style={{ flex: 1, marginRight: 10 }}>
          <SkeletonLoader style={{ width: 80, height: 9, borderRadius: 4, marginBottom: 6 }} />
          <SkeletonLoader style={{ width: "100%", height: 42, borderRadius: 10 }} />
        </View>
        <View style={{ flex: 1 }}>
          <SkeletonLoader style={{ width: 80, height: 9, borderRadius: 4, marginBottom: 6 }} />
          <SkeletonLoader style={{ width: "100%", height: 42, borderRadius: 10 }} />
        </View>
      </View>
      {/* Button */}
      <SkeletonLoader style={{ width: 140, height: 38, borderRadius: 10 }} />
    </View>
  );
}

/**
 * Course Details Skeleton — mimics the course info card + attendance table.
 * Used in: Teacher CourseDetails
 */
export function CourseDetailsSkeleton() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View>
      {/* Info rows */}
      <View style={styles.mgmtListCard}>
        {Array.from({ length: 4 }).map((_, i) => (
          <View key={i} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12, borderBottomWidth: i < 3 ? 1 : 0, borderBottomColor: colors.border }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <SkeletonLoader style={{ width: 16, height: 16, borderRadius: 4, marginRight: 10 }} />
              <SkeletonLoader style={{ width: 60, height: 11, borderRadius: 4 }} />
            </View>
            <SkeletonLoader style={{ width: 90, height: 12, borderRadius: 5 }} />
          </View>
        ))}
      </View>
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

  // ═══════════════════════════════════════════
  // Management Screen Skeleton Styles (NEW)
  // ═══════════════════════════════════════════

  // Stats Row (horizontal)
  mgmtStatsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  mgmtStatCard: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  mgmtStatTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  // Search Bar
  mgmtSearchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.background,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },

  // List Card
  mgmtListCard: {
    backgroundColor: colors.background,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.foreground,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  mgmtListHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  mgmtListRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },

  // Teacher Sections
  mgmtTeacherContainer: {
    flexDirection: "column",
  },
  mgmtTeacherSection: {
    backgroundColor: colors.background,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  mgmtSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  mgmtTeacherRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
  },

  // Table
  mgmtTableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },

  // Course Card Full
  mgmtCourseCard: {
    backgroundColor: colors.background,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 12,
    shadowColor: colors.foreground,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },

  // Attendance Stats Grid (2x2)
  mgmtAttStatsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  mgmtAttStatCard: {
    width: "48%",
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
