import React, { useState, useCallback } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  ScrollView, ActivityIndicator, TextInput, Dimensions
} from "react-native";
import { getTeacherCourses } from "../../api/teacherApi";
import { useFocusEffect } from "@react-navigation/native";
import { Theme } from "../../theme/Theme";
import { Search, BookOpen, Building, Calendar, Key, Users, Clock } from "lucide-react-native";

const { width } = Dimensions.get("window");

export default function MyCourses({ navigation }) {
  const [courses, setCourses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");

  useFocusEffect(useCallback(() => {
    const load = async () => {
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
    load();
  }, []));

  const filtered = courses.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q) ||
      c.program.toLowerCase().includes(q) || c.department.toLowerCase().includes(q);
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>My Courses</Text>
          <Text style={styles.subtitle}>{courses.length} course{courses.length !== 1 ? "s" : ""} assigned to you</Text>
        </View>

        {/* Search */}
        <View style={styles.searchBar}>
          <Search size={16} color="#94A3B8" style={{ marginRight: 10 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by course name, code, program, or department..."
            placeholderTextColor="#94A3B8"
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {/* Course Cards */}
        {isLoading ? (
          <ActivityIndicator size="large" color={Theme.colors.accent} style={{ marginVertical: 40 }} />
        ) : filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <BookOpen size={48} color="#CBD5E1" />
            <Text style={styles.emptyText}>No courses found</Text>
          </View>
        ) : (
          filtered.map((course) => {
            const sessionPct = course.sessions > 0 ? Math.min(100, Math.round((course.sessions / Math.max(course.sessions, 10)) * 100)) : 0;
            return (
              <TouchableOpacity key={course.id} style={styles.courseCard} activeOpacity={0.7}
                onPress={() => navigation.navigate("CourseDetails", { course })}>

                {/* Course Name + Active Badge */}
                <View style={styles.courseTopRow}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
                      <Text style={styles.courseName}>{course.name}</Text>
                      <View style={styles.activeBadge}>
                        <Text style={styles.activeBadgeText}>Active</Text>
                      </View>
                    </View>
                    <Text style={styles.courseProgram}>{course.program}</Text>
                  </View>
                </View>

                {/* Details with icons */}
                {!!course.department && (
                  <View style={styles.courseDetailRow}>
                    <Building size={13} color="#64748B" style={{ marginRight: 6 }} />
                    <Text style={styles.courseDetailText}>{course.department}</Text>
                  </View>
                )}
                {!!course.semester && (
                  <View style={styles.courseDetailRow}>
                    <Calendar size={13} color="#64748B" style={{ marginRight: 6 }} />
                    <Text style={styles.courseDetailText}>{course.semester}</Text>
                  </View>
                )}
                {!!course.entryCode && (
                  <View style={styles.courseDetailRow}>
                    <Key size={13} color={Theme.colors.accent} style={{ marginRight: 6 }} />
                    <Text style={[styles.courseDetailText, { color: Theme.colors.accent, fontWeight: "700" }]}>{course.entryCode}</Text>
                  </View>
                )}

                {/* Session Activity Bar */}
                <View style={styles.activityRow}>
                  <Text style={styles.activityLabel}>Session activity</Text>
                  <Text style={styles.activityPct}>{sessionPct}%</Text>
                </View>
                <View style={styles.activityTrack}>
                  <View style={[styles.activityFill, { width: `${Math.max(sessionPct, 4)}%` }]} />
                </View>

                {/* Footer Stats */}
                <View style={styles.courseFooter}>
                  <View style={styles.footerItem}>
                    <Text style={styles.footerNumber}>{course.students}</Text>
                    <Text style={styles.footerLabel}>Students</Text>
                  </View>
                  <View style={styles.footerItem}>
                    <Text style={[styles.footerNumber, { color: Theme.colors.accent }]}>{course.sessions}</Text>
                    <Text style={styles.footerLabel}>Sessions</Text>
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

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F8FAFC" },
  container: { padding: 20, paddingBottom: 40 },

  // Header
  header: { marginBottom: 16, marginTop: 8 },
  title: { fontSize: 24, fontWeight: "800", color: "#0F172A" },
  subtitle: { fontSize: 13, color: "#64748B", marginTop: 3 },

  // Search
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  searchInput: { flex: 1, fontSize: 13, color: "#1E293B", padding: 0 },

  // Empty
  emptyState: { alignItems: "center", paddingVertical: 60 },
  emptyText: { fontSize: 16, fontWeight: "600", color: "#94A3B8", marginTop: 12 },

  // Course Card
  courseCard: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  courseTopRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 10 },
  courseName: { fontSize: 17, fontWeight: "800", color: "#0F172A", marginRight: 8 },
  courseProgram: { fontSize: 12, color: "#64748B" },

  // Active badge
  activeBadge: {
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  activeBadgeText: { fontSize: 10, fontWeight: "700", color: "#10B981" },

  // Detail rows with icons
  courseDetailRow: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  courseDetailText: { fontSize: 13, color: "#64748B" },

  // Session activity bar
  activityRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 14,
    marginBottom: 6,
  },
  activityLabel: { fontSize: 12, color: "#94A3B8" },
  activityPct: { fontSize: 12, fontWeight: "700", color: "#1E293B" },
  activityTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "#F1F5F9",
    overflow: "hidden",
    marginBottom: 14,
  },
  activityFill: {
    height: "100%",
    borderRadius: 3,
    backgroundColor: Theme.colors.accent,
  },

  // Footer
  courseFooter: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingTop: 12,
  },
  footerItem: { marginRight: 24 },
  footerNumber: { fontSize: 18, fontWeight: "800", color: "#0F172A" },
  footerLabel: { fontSize: 11, color: "#94A3B8", marginTop: 1 },
});