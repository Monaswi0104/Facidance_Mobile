import React, { useState, useCallback } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  ScrollView, ActivityIndicator, TextInput, Dimensions
} from "react-native";
import { getTeacherCourses } from "../../api/teacherApi";
import { useFocusEffect } from "@react-navigation/native";

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
        const list = Array.isArray(data) ? data : [];
        setCourses(list.map((c) => ({
          id: c.id, name: c.name, code: c.code || "—",
          entryCode: c.entryCode || "",
          program: c.semester?.academicYear?.program?.name || "",
          department: c.semester?.academicYear?.program?.department?.name || "",
          semester: c.semester?.name || "",
          year: c.semester?.academicYear?.name || "",
          students: c._count?.students || 0,
          sessions: c._count?.attendance || 0,
        })));
      } catch (e) { console.log(e); }
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
          <View style={[styles.badge, { backgroundColor: "#10B981" }]}>
            <Text style={styles.badgeText}>C</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>My Courses</Text>
            <Text style={styles.subtitle}>Manage your assigned courses, students, and attendance sessions.</Text>
          </View>
        </View>

        {/* Search */}
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by course name, code, department, program..."
            placeholderTextColor="#94A3B8"
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {/* Course Cards */}
        {isLoading ? (
          <ActivityIndicator size="large" color="#4361EE" style={{ marginVertical: 40 }} />
        ) : filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📚</Text>
            <Text style={styles.emptyText}>No courses found</Text>
          </View>
        ) : (
          filtered.map((course) => (
            <TouchableOpacity key={course.id} style={styles.courseCard} activeOpacity={0.7}
              onPress={() => navigation.navigate("CourseDetails", { course })}>

              <View style={styles.courseTopRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.courseName}>{course.name}</Text>
                  <Text style={styles.courseProgram}>{course.program}</Text>
                </View>
                <View style={[styles.courseIconBg, { backgroundColor: "#EEF2FF" }]}>
                  <Text style={{ fontSize: 18 }}>📚</Text>
                </View>
              </View>

              <View style={styles.courseDetailRow}>
                <Text style={styles.courseDetailText}>🏢 {course.department}</Text>
              </View>
              <View style={styles.courseDetailRow}>
                <Text style={styles.courseDetailText}>📅 {course.year}{course.semester ? ` · ${course.semester}` : ""}</Text>
              </View>
              {course.code !== "—" && (
                <View style={styles.codeChip}>
                  <Text style={styles.codeChipText}>🔗 {course.code}</Text>
                </View>
              )}

              <View style={styles.courseFooter}>
                <Text style={styles.footerStat}>👨‍🎓 {course.students} students</Text>
                <Text style={styles.footerStat}>🕐 {course.sessions} sessions</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F8FAFC" },
  container: { padding: 20, paddingBottom: 40 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 14, marginTop: 8 },
  badge: { width: 36, height: 36, borderRadius: 10, justifyContent: "center", alignItems: "center", marginRight: 12 },
  badgeText: { color: "#FFF", fontSize: 16, fontWeight: "800" },
  title: { fontSize: 22, fontWeight: "800", color: "#0F172A" },
  subtitle: { fontSize: 12, color: "#64748B", marginTop: 2 },
  searchBar: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFF", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 18, borderWidth: 1, borderColor: "#E2E8F0" },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, color: "#1E293B", padding: 0 },
  emptyState: { alignItems: "center", paddingVertical: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16, fontWeight: "600", color: "#94A3B8" },
  courseCard: { backgroundColor: "#FFF", borderRadius: 16, padding: 18, marginBottom: 14, borderWidth: 1, borderColor: "#E2E8F0", shadowColor: "#0F172A", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 6, elevation: 1 },
  courseTopRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 10 },
  courseName: { fontSize: 17, fontWeight: "700", color: "#1E293B", marginBottom: 3 },
  courseProgram: { fontSize: 12, fontWeight: "600", color: "#4361EE", textTransform: "uppercase" },
  courseIconBg: { width: 38, height: 38, borderRadius: 10, justifyContent: "center", alignItems: "center", marginLeft: 10 },
  courseDetailRow: { marginBottom: 4 },
  courseDetailText: { fontSize: 13, color: "#64748B" },
  codeChip: { backgroundColor: "#EEF2FF", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, alignSelf: "flex-start", marginTop: 6 },
  codeChipText: { fontSize: 12, fontWeight: "600", color: "#4361EE" },
  courseFooter: { flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: "#F1F5F9", marginTop: 12, paddingTop: 12 },
  footerStat: { fontSize: 13, fontWeight: "600", color: "#64748B" },
});