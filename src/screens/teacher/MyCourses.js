import React, {  useState, useCallback , useMemo } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  ScrollView, ActivityIndicator, TextInput, Dimensions
, RefreshControl } from "react-native";
import { getTeacherCourses } from "../../api/teacherApi";
import { useFocusEffect } from "@react-navigation/native";
import { useTheme } from "../../theme/Theme";
import { Search, BookOpen, Building, Calendar, Key, Users, Clock } from "lucide-react-native";
import { CourseCardFullSkeleton } from "../../components/SkeletonLoader";

const { width } = Dimensions.get("window");

export default function MyCourses({ navigation }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [courses, setCourses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadData(false); // Assume it accepts showLoading=false, but just await it
    setIsRefreshing(false);
  }, []);
  const [search, setSearch] = useState("");

  const loadData = async () => {
      try {
        setIsLoading(true);
        const data = await getTeacherCourses();
        console.log("[MyCourses] raw data:", JSON.stringify(data));
        // Handle both array and {courses: [...]} response
        const list = Array.isArray(data) ? data : (data?.courses || []);
        console.log("[MyCourses] list length:", list.length);
        if (list.length > 0) console.log("[MyCourses] first course keys:", Object.keys(list[0]));
        setCourses(list.map((c) => ({
          id: c.id, 
          name: c.name || c.course_name || "Untitled",
          code: c.code || c.course_code || "—",
          entryCode: c.entryCode || c.entry_code || "",
          program: c.semester?.academicYear?.program?.name || c.program_name || c.program || "",
          department: c.semester?.academicYear?.program?.department?.name || c.department_name || c.department || "",
          semester: c.semester?.name || c.semester_name || "",
          year: c.semester?.academicYear?.name || c.academic_year || c.year || "",
          students: c._count?.students || c.student_count || c.students_count || c.total_students || 0,
          sessions: c.session_count || c._count?.attendance || c.attendance_count || c.sessions_count || c.total_sessions || 0,
        })));
      } catch (e) { console.log("[MyCourses] Error:", e); }
      finally { setIsLoading(false); }
    };

  useFocusEffect(useCallback(() => {
    loadData();
  }, []));

  const filtered = courses.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q) ||
      c.program.toLowerCase().includes(q) || c.department.toLowerCase().includes(q);
  });

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.secondary }]}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={[colors.success]} tintColor={colors.} />
        }
      >

        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.foreground }]}>My Courses</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{courses.length} course{courses.length !== 1 ? "s" : ""} assigned to you</Text>
        </View>

        {/* Search */}
        <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Search size={16} color={colors.statLabel} style={{ marginRight: 10 }} />
          <TextInput
            style={[styles.searchInput, { color: colors.inputText }]}
            placeholder="Search by course name, code, program, or department..."
            placeholderTextColor={colors.inputPlaceholder}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {/* Course Cards */}
        {isLoading ? (
          <CourseCardFullSkeleton count={3} />
        ) : filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <BookOpen size={48} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.statLabel }]}>No courses found</Text>
          </View>
        ) : (
          filtered.map((course) => {
            const sessionPct = course.sessions > 0 ? Math.min(100, Math.round((course.sessions / Math.max(course.sessions, 10)) * 100)) : 0;
            return (
              <TouchableOpacity key={course.id} style={[styles.courseCard, { backgroundColor: colors.card, borderColor: colors.cardBorder, shadowColor: colors.shadowColor }]} activeOpacity={0.7}
                onPress={() => navigation.navigate("CourseDetails", { course })}>

                {/* Course Name + Active Badge */}
                <View style={styles.courseTopRow}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
                      <Text style={[styles.courseName, { color: colors.foreground }]}>{course.name}</Text>
                      <View style={styles.activeBadge}>
                        <Text style={styles.activeBadgeText}>Active</Text>
                      </View>
                    </View>
                    <Text style={[styles.courseProgram, { color: colors.mutedForeground }]}>{course.program}</Text>
                  </View>
                </View>

                {/* Details with icons */}
                {!!course.department && (
                  <View style={styles.courseDetailRow}>
                    <Building size={13} color={colors.mutedForeground} style={{ marginRight: 6 }} />
                    <Text style={[styles.courseDetailText, { color: colors.mutedForeground }]}>{course.department}</Text>
                  </View>
                )}
                {!!course.semester && (
                  <View style={styles.courseDetailRow}>
                    <Calendar size={13} color={colors.mutedForeground} style={{ marginRight: 6 }} />
                    <Text style={[styles.courseDetailText, { color: colors.mutedForeground }]}>{course.semester}</Text>
                  </View>
                )}
                {!!course.entryCode && (
                  <View style={styles.courseDetailRow}>
                    <Key size={13} color={colors.accent} style={{ marginRight: 6 }} />
                    <Text style={[styles.courseDetailText, { color: colors.accent, fontWeight: "700" }]}>{course.entryCode}</Text>
                  </View>
                )}

                {/* Session Activity Bar */}
                <View style={styles.activityRow}>
                  <Text style={[styles.activityLabel, { color: colors.statLabel }]}>Session activity</Text>
                  <Text style={[styles.activityPct, { color: colors.foreground }]}>{sessionPct}%</Text>
                </View>
                <View style={[styles.activityTrack, { backgroundColor: colors.muted }]}>
                  <View style={[styles.activityFill, { width: `${Math.max(sessionPct, 4)}%`, backgroundColor: colors.accent }]} />
                </View>

                {/* Footer Stats */}
                <View style={[styles.courseFooter, { borderTopColor: colors.muted }]}>
                  <View style={styles.footerItem}>
                    <Text style={[styles.footerNumber, { color: colors.foreground }]}>{course.students}</Text>
                    <Text style={[styles.footerLabel, { color: colors.statLabel }]}>Students</Text>
                  </View>
                  <View style={styles.footerItem}>
                    <Text style={[styles.footerNumber, { color: colors.accent }]}>{course.sessions}</Text>
                    <Text style={[styles.footerLabel, { color: colors.statLabel }]}>Sessions</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  safeArea: { flex: 1 },
  container: { padding: 20, paddingBottom: 40 },

  // Header
  header: { marginBottom: 16, marginTop: 8 },
  title: { fontSize: 24, fontWeight: "800" },
  subtitle: { fontSize: 13, marginTop: 3 },

  // Search
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 20,
    borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 13, padding: 0 },

  // Empty
  emptyState: { alignItems: "center", paddingVertical: 60 },
  emptyText: { fontSize: 16, fontWeight: "600", marginTop: 12 },

  // Course Card
  courseCard: {
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  courseTopRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 10 },
  courseName: { fontSize: 17, fontWeight: "800", marginRight: 8 },
  courseProgram: { fontSize: 12 },

  // Active badge
  activeBadge: {
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  activeBadgeText: { fontSize: 10, fontWeight: "700", color: colors.success },

  // Detail rows with icons
  courseDetailRow: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  courseDetailText: { fontSize: 13 },

  // Session activity bar
  activityRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 14,
    marginBottom: 6,
  },
  activityLabel: { fontSize: 12 },
  activityPct: { fontSize: 12, fontWeight: "700" },
  activityTrack: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 14,
  },
  activityFill: {
    height: "100%",
    borderRadius: 3,
  },

  // Footer
  courseFooter: {
    flexDirection: "row",
    borderTopWidth: 1,
    paddingTop: 12,
  },
  footerItem: { marginRight: 24 },
  footerNumber: { fontSize: 18, fontWeight: "800" },
  footerLabel: { fontSize: 11, marginTop: 1 },
});