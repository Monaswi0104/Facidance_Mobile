import React, { useState, useCallback, useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, ActivityIndicator, TextInput, Dimensions } from "react-native";
import { getStudentCourses } from "../../api/studentApi";
import { useFocusEffect } from "@react-navigation/native";

const { width } = Dimensions.get('window');

export default function MyCourses({ navigation }) {
  const [courses, setCourses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        try {
          setIsLoading(true);
          const data = await getStudentCourses();
          const list = Array.isArray(data) ? data : [];
          setCourses(list.map(c => ({
            id: c.id,
            name: c.name,
            code: c.code || "—",
            teacher: c.teacher?.user?.name || c.teacher?.name || "Teacher",
            teacherEmail: c.teacher?.user?.email || c.teacher?.email || "",
            teacherDept: c.teacher?.department?.name || "Teacher Department",
            semester: c.semester?.name || "—",
            year: c.semester?.academicYear?.name || "—",
            students: c._count?.students || 0, // This is not strictly correct since students array might not be counted here, but we'll try
            sessions: c._count?.attendance || 0,
            program: c.semester?.academicYear?.program?.name || "",
            department: c.semester?.academicYear?.program?.department?.name || "",
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

  const stats = useMemo(() => {
    let totalCourses = courses.length;
    let totalSessions = 0;
    // Just find the most frequent semester or the latest one, for simplicity, use the first course's semester
    let activeSemester = "—";
    
    if (courses.length > 0) {
      activeSemester = courses[0].semester;
      courses.forEach(c => {
        totalSessions += c.sessions;
      });
    }

    return { totalCourses, activeSemester, totalSessions };
  }, [courses]);

  const StatBox = ({ title, value, color, badgeColor, icon }) => (
    <View style={[styles.statBox, { backgroundColor: color }]}>
       <View style={{ flex: 1, paddingRight: 10 }}>
        <Text style={styles.statLabel}>{title}</Text>
        <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
       </View>
       <View style={[styles.statIconBadge, { backgroundColor: badgeColor }]}>
         <Text style={{ fontSize: 16 }}>{icon}</Text>
       </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        {/* Header Title */}
        <View style={styles.header}>
          <View style={styles.headerIconBox}>
            <Text style={{ fontSize: 18 }}>📖</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>My Courses</Text>
            <Text style={styles.subtitle}>View your enrolled courses and keep track of active sessions.</Text>
          </View>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsContainer}>
          {isLoading ? (
             <ActivityIndicator color="#4361EE" style={{ marginVertical: 20 }} />
          ) : (
             <View style={styles.statsGrid}>
               <StatBox 
                 title="TOTAL COURSES" 
                 value={stats.totalCourses} 
                 color="#F0F9FF" 
                 badgeColor="#3B82F6" 
                 icon="📖" 
               />
               <StatBox 
                 title="ACTIVE SEMESTER" 
                 value={stats.activeSemester} 
                 color="#ECFDF5" 
                 badgeColor="#10B981" 
                 icon="📅" 
               />
               <StatBox 
                 title="TOTAL SESSIONS" 
                 value={stats.totalSessions} 
                 color="#FAF5FF" 
                 badgeColor="#D946EF" 
                 icon="🎓" 
               />
             </View>
          )}
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by course name, course code, teacher..."
            placeholderTextColor="#94A3B8"
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {/* Courses List */}
        <View style={styles.listContainer}>
          {isLoading ? null : filtered.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={{ fontSize: 30, marginBottom: 12 }}>📭</Text>
              <Text style={styles.emptyStateTitle}>No Courses Found</Text>
              <Text style={styles.emptyStateText}>You don't have any enrolled courses matching your criteria.</Text>
            </View>
          ) : (
            filtered.map((item) => (
              <View key={item.id} style={styles.courseCard}>
                 
                 {/* Card Header row */}
                 <View style={styles.cardHeader}>
                   <View style={styles.cardHeaderIcon}>
                     <Text style={{ fontSize: 14 }}>📖</Text>
                   </View>
                   <View style={styles.semesterBadge}>
                     <Text style={styles.semesterBadgeText}>{item.semester}</Text>
                   </View>
                 </View>

                 {/* Card Content */}
                 <Text style={styles.courseName} numberOfLines={2}>{item.name}</Text>

                 <View style={styles.cardDetails}>
                   <View style={styles.detailRow}>
                     <Text style={styles.detailIcon}>👤</Text>
                     <Text style={styles.detailText}>{item.teacher}</Text>
                   </View>
                   <View style={styles.detailRow}>
                     <Text style={styles.detailIcon}>#</Text>
                     <Text style={styles.detailText}>{item.code}</Text>
                   </View>
                   <View style={styles.detailRow}>
                     <Text style={styles.detailIcon}>🗓</Text>
                     <Text style={styles.detailText}>{item.year} • {item.semester}</Text>
                   </View>
                   <View style={styles.detailRow}>
                     <Text style={styles.detailIcon}>👥</Text>
                     <Text style={styles.detailText}>{item.students} students enrolled</Text>
                   </View>
                 </View>

                 {/* Action Buttons */}
                 <View style={styles.cardActions}>
                   <TouchableOpacity 
                     style={styles.btnOutline} 
                     onPress={() => navigation.navigate("CourseAttendance", { course: item })}
                   >
                     <Text style={styles.btnOutlineText}>View details</Text>
                   </TouchableOpacity>
                   <TouchableOpacity 
                     style={styles.btnTextOnly}
                     onPress={() => navigation.navigate("CourseAttendance", { course: item, tab: 'Attendance' })}
                   >
                     <Text style={styles.btnTextOnlyText}>Attendance</Text>
                   </TouchableOpacity>
                 </View>

              </View>
            ))
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    marginBottom: 20,
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  headerIconBox: {
    width: 48,
    height: 48,
    backgroundColor: '#0F172A',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
    color: "#64748B",
  },
  statsContainer: {
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statBox: {
    flexDirection: 'row',
    width: '48%',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#64748B",
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
  },
  statIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 50,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 20,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 10,
    opacity: 0.5,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#0F172A",
  },
  listContainer: {
    // marginBottom: 20,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: '#FFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
  },
  courseCard: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardHeaderIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F0F9FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  semesterBadge: {
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  semesterBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#10B981",
  },
  courseName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 16,
  },
  cardDetails: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailIcon: {
    fontSize: 14,
    marginRight: 10,
    width: 16,
    color: '#94A3B8',
    textAlign: 'center',
  },
  detailText: {
    fontSize: 13,
    color: "#475569",
    flex: 1,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  btnOutline: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 10,
    borderRadius: 8,
    marginRight: 10,
  },
  btnOutlineText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1E293B",
  },
  btnTextOnly: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  btnTextOnlyText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0F172A",
  }
});