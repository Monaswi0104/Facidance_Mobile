import React, { useState, useCallback } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  ScrollView, Alert, ActivityIndicator, Dimensions
} from "react-native";
import { getCourses, deleteCourse } from "../../api/adminApi";
import { useFocusEffect } from "@react-navigation/native";

const { width } = Dimensions.get("window");

export default function CoursesManagement() {
  const [courses, setCourses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const data = await getCourses();
      const list = data.courses || data || [];
      setCourses(list.map((c) => ({
        id: c.id, name: c.name, code: c.code || "—",
        teacher: c.teacher?.user?.name || c.teacher?.name || "—",
        semester: c.semester?.name || "",
        year: c.semester?.academicYear?.name || "",
        program: c.semester?.academicYear?.program?.name || "",
      })));
    } catch (e) { console.log(e); }
    finally { setIsLoading(false); }
  };

  useFocusEffect(useCallback(() => { loadData(); }, []));

  const uniquePrograms = new Set(courses.map(c => c.program).filter(Boolean));
  const uniqueTeachers = new Set(courses.map(c => c.teacher).filter(t => t !== "—"));

  const handleDelete = (course) => {
    Alert.alert("Delete Course", `Remove "${course.name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive", onPress: async () => {
          try { await deleteCourse(course.id); loadData(); }
          catch (e) { Alert.alert("Error", "Failed to delete."); }
        }
      },
    ]);
  };

  const colors = ["#3B82F6", "#10B981", "#F59E0B", "#8B5CF6", "#EF4444"];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <View style={[styles.badge, { backgroundColor: "#10B981" }]}>
              <Text style={styles.badgeText}>C</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Courses</Text>
              <Text style={styles.subtitle}>Manage academic courses and their teachers, programs & semesters.</Text>
            </View>
          </View>
        </View>

        {/* Stats */}
        {isLoading ? (
          <ActivityIndicator size="small" color="#4361EE" style={{ marginVertical: 20 }} />
        ) : (
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>TOTAL COURSES</Text>
              <View style={styles.statBottom}><Text style={styles.statNumber}>{courses.length}</Text>
                <View style={[styles.statIconBg, { backgroundColor: "#10B981" }]}><Text style={styles.statIcon}>📚</Text></View>
              </View>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>PROGRAMS</Text>
              <View style={styles.statBottom}><Text style={styles.statNumber}>{uniquePrograms.size}</Text>
                <View style={[styles.statIconBg, { backgroundColor: "#8B5CF6" }]}><Text style={styles.statIcon}>📋</Text></View>
              </View>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>FACULTY</Text>
              <View style={styles.statBottom}><Text style={styles.statNumber}>{uniqueTeachers.size}</Text>
                <View style={[styles.statIconBg, { backgroundColor: "#3B82F6" }]}><Text style={styles.statIcon}>👨‍🏫</Text></View>
              </View>
            </View>
          </View>
        )}

        {/* Courses List */}
        <View style={styles.listHeader}>
          <Text style={styles.listIcon}>📚</Text>
          <Text style={styles.listTitle}>Courses List</Text>
          <View style={styles.listCountBadge}><Text style={styles.listCountText}>{courses.length} total</Text></View>
        </View>
        <View style={styles.listCard}>
          {courses.length === 0 ? (
            <Text style={styles.emptyText}>No courses yet.</Text>
          ) : (
            courses.map((c, i) => (
              <View key={c.id} style={[styles.itemRow, i < courses.length - 1 && styles.itemBorder]}>
                <View style={[styles.itemDot, { backgroundColor: colors[i % 5] }]} />
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{c.name}</Text>
                  <Text style={styles.itemMeta}>
                    {c.code !== "—" ? `📝 ${c.code}  ·  ` : ""}Teacher: {c.teacher}
                  </Text>
                  {(c.year || c.semester) ? (
                    <Text style={styles.itemMeta}>{c.year}{c.semester ? ` · ${c.semester}` : ""}</Text>
                  ) : null}
                </View>
                <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(c)}>
                  <Text style={styles.deleteBtnText}>🗑 Delete</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F8FAFC" },
  container: { padding: 20, paddingBottom: 40 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16, marginTop: 8 },
  headerLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  badge: { width: 36, height: 36, borderRadius: 10, justifyContent: "center", alignItems: "center", marginRight: 12 },
  badgeText: { color: "#FFF", fontSize: 16, fontWeight: "800" },
  title: { fontSize: 22, fontWeight: "800", color: "#0F172A" },
  subtitle: { fontSize: 12, color: "#64748B", marginTop: 2 },
  statsRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 20 },
  statCard: { flex: 1, backgroundColor: "#FFF", borderRadius: 14, padding: 14, marginHorizontal: 3, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 },
  statLabel: { fontSize: 9, fontWeight: "700", color: "#94A3B8", letterSpacing: 0.5, marginBottom: 8 },
  statBottom: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  statNumber: { fontSize: 24, fontWeight: "800", color: "#1E293B" },
  statIconBg: { width: 32, height: 32, borderRadius: 8, justifyContent: "center", alignItems: "center" },
  statIcon: { fontSize: 16 },
  listHeader: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  listIcon: { fontSize: 16, marginRight: 8 },
  listTitle: { fontSize: 16, fontWeight: "700", color: "#1E293B", flex: 1 },
  listCountBadge: { backgroundColor: "#EEF2FF", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  listCountText: { fontSize: 11, fontWeight: "700", color: "#4361EE" },
  listCard: { backgroundColor: "#FFF", borderRadius: 16, padding: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 6, elevation: 1 },
  emptyText: { fontSize: 14, color: "#94A3B8", textAlign: "center", paddingVertical: 24 },
  itemRow: { flexDirection: "row", alignItems: "center", paddingVertical: 14 },
  itemBorder: { borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  itemDot: { width: 36, height: 36, borderRadius: 18, justifyContent: "center", alignItems: "center", marginRight: 12 },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 15, fontWeight: "700", color: "#1E293B", marginBottom: 3 },
  itemMeta: { fontSize: 12, color: "#64748B", marginBottom: 1 },
  deleteBtn: { backgroundColor: "#FEE2E2", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  deleteBtnText: { fontSize: 12, fontWeight: "600", color: "#EF4444" },
});