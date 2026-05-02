import React, { useState, useCallback, useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, ActivityIndicator, TextInput, Dimensions } from "react-native";
import { getStudentCourses, getStudentStats } from "../../api/studentApi";
import { useFocusEffect } from "@react-navigation/native";
import { Theme, useTheme } from "../../theme/Theme";
import { Search, BookOpen, User, Calendar, Hash, ChevronRight } from "lucide-react-native";

const { width } = Dimensions.get('window');

export default function MyCourses({ navigation }) {
  const { colors, isDark } = useTheme();
  const [courses, setCourses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        try {
          const data = await getStudentCourses();
          const list = Array.isArray(data) ? data : (data?.courses || []);
          setCourses(list.map(c => ({
            id: c.id,
            name: c.name,
            code: c.entry_code || c.code || "—",
            teacher: c.teacher_name || c.teacher?.user?.name || c.teacher?.name || "Teacher",
            teacherEmail: c.teacher_email || c.teacher?.user?.email || c.teacher?.email || "",
            teacherDept: c.department_name || c.teacher?.department?.name || "Teacher Department",
            semester: c.semester_name || c.semester?.name || "—",
            year: c.academic_year || c.academic_year_name || c.semester?.academicYear?.name || "—",
            students: c.students_count || c.student_count || c._count?.students || 0,
            sessions: c.total_sessions || c._count?.attendance || 0,
            program: c.program_name || c.semester?.academicYear?.program?.name || "",
            department: c.department_name || c.semester?.academicYear?.program?.department?.name || "",
          })));
        } catch (e) {
          console.log(e);
        } finally {
          setIsLoading(false);
        }
      };
      load();
    }, [])
  );

  const filtered = useMemo(() => {
    if (!search) return courses;
    const q = search.toLowerCase();
    return courses.filter(c => 
      c.name.toLowerCase().includes(q) || 
      c.code.toLowerCase().includes(q) || 
      c.teacher.toLowerCase().includes(q)
    );
  }, [courses, search]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>My Courses</Text>
          <Text style={styles.subtitle}>{courses.length} course{courses.length !== 1 ? "s" : ""} enrolled</Text>
        </View>

        {/* Search */}
        <View style={styles.searchBar}>
          <Search size={14} color={Theme.colors.mutedForeground} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by course name, code or teacher..."
            placeholderTextColor={Theme.colors.mutedForeground}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {/* Course Cards */}
        {isLoading ? (
          <ActivityIndicator size="large" color={Theme.colors.accent} style={{ marginVertical: 40 }} />
        ) : filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No Courses Found</Text>
            <Text style={styles.emptyText}>You don't have any enrolled courses matching your criteria.</Text>
          </View>
        ) : (
          filtered.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.courseCard}
              activeOpacity={0.7}
              onPress={() => navigation.navigate("CourseAttendance", { course: item })}
            >
              {/* Card Top Row */}
              <View style={styles.cardTopRow}>
                <View style={styles.cardIconBg}>
                  <BookOpen size={16} color={Theme.colors.primaryForeground} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.courseName} numberOfLines={2}>{item.name}</Text>
                  <View style={styles.badgeRow}>
                    <View style={styles.activeBadge}>
                      <Text style={styles.activeBadgeText}>Active</Text>
                    </View>
                    <View style={styles.codeBadge}>
                      <Text style={styles.codeBadgeText}>{item.code}</Text>
                    </View>
                  </View>
                </View>
                <ChevronRight size={18} color={Theme.colors.mutedForeground} />
              </View>

              {/* Details */}
              <View style={styles.detailsList}>
                <View style={styles.detailRow}>
                  <User size={12} color={Theme.colors.mutedForeground} style={{ marginRight: 6 }} />
                  <Text style={styles.detailText}>{item.teacher}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Calendar size={12} color={Theme.colors.mutedForeground} style={{ marginRight: 6 }} />
                  <Text style={styles.detailText}>{item.semester} · {item.year}</Text>
                </View>
                <View style={styles.detailRow}>
                  <BookOpen size={12} color={Theme.colors.mutedForeground} style={{ marginRight: 6 }} />
                  <Text style={styles.detailText}>{item.program}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Hash size={12} color={Theme.colors.mutedForeground} style={{ marginRight: 6 }} />
                  <Text style={styles.detailText}>{item.code}</Text>
                </View>
              </View>

              {/* View Details Footer */}
              <View style={styles.cardFooter}>
                <Text style={styles.viewDetailsText}>View details</Text>
                <ChevronRight size={14} color={Theme.colors.mutedForeground} />
              </View>
            </TouchableOpacity>
          ))
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Theme.colors.secondary },
  container: { padding: 20, paddingBottom: 40 },

  // Header
  header: { marginBottom: 16, marginTop: 8 },
  title: { fontSize: 24, fontWeight: "800", color: Theme.colors.foreground },
  subtitle: { fontSize: 13, color: Theme.colors.mutedForeground, marginTop: 3 },

  // Search
  searchBar: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: Theme.colors.background, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: Theme.colors.border, marginBottom: 18,
  },
  searchInput: { flex: 1, fontSize: 13, color: Theme.colors.foreground, padding: 0 },

  // Empty
  emptyState: { alignItems: "center", padding: 40, backgroundColor: Theme.colors.background, borderRadius: 14, borderWidth: 1, borderColor: Theme.colors.border },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: Theme.colors.foreground, marginBottom: 6 },
  emptyText: { fontSize: 13, color: Theme.colors.mutedForeground, textAlign: "center" },

  // Course Card
  courseCard: {
    backgroundColor: Theme.colors.background,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    padding: 16,
    marginBottom: 12,
    shadowColor: Theme.colors.foreground,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  cardTopRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 12 },
  cardIconBg: { width: 36, height: 36, borderRadius: 10, backgroundColor: Theme.colors.primaryDark, justifyContent: "center", alignItems: "center", marginRight: 12 },
  courseName: { fontSize: 16, fontWeight: "700", color: Theme.colors.foreground, marginBottom: 6 },
  badgeRow: { flexDirection: "row", alignItems: "center" },
  activeBadge: { backgroundColor: "#F0FDF4", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, borderWidth: 1, borderColor: "#DCFCE7", marginRight: 6 },
  activeBadgeText: { fontSize: 10, fontWeight: "700", color: "#10B981" },
  codeBadge: { backgroundColor: Theme.colors.muted, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: Theme.colors.border },
  codeBadgeText: { fontSize: 10, fontWeight: "600", color: Theme.colors.textBody },

  // Details
  detailsList: { marginBottom: 12, paddingLeft: 2 },
  detailRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  detailText: { fontSize: 12, color: Theme.colors.mutedForeground },

  // Footer
  cardFooter: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    borderTopWidth: 1, borderTopColor: Theme.colors.muted, paddingTop: 12,
  },
  viewDetailsText: { fontSize: 13, color: Theme.colors.mutedForeground },
});