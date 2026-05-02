import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  BackHandler, SafeAreaView, Dimensions, Alert, RefreshControl
} from "react-native";
import { getAdminStats, getTeachers, getPrograms, getCourses, getStudents, getTeacherLoad, getProgramDistribution } from "../../api/adminApi";
import { getUser, clearAuth } from "../../api/authStorage";
import { useFocusEffect } from "@react-navigation/native";
import { Theme, useTheme } from "../../theme/Theme";
import { Users, GraduationCap, Building2, BookOpen, TrendingUp, UserX, RefreshCw, ChevronRight } from "lucide-react-native";
import { StatCardSkeleton, SectionCardSkeleton } from "../../components/SkeletonLoader";

const { width } = Dimensions.get("window");

export default function AdminDashboard({ navigation }) {
  const { colors, isDark } = useTheme();
  const [stats, setStats] = useState({ teachers: 0, students: 0, departments: 0, programs: 0, courses: 0, attendance_rate: 0, graduated: 0 });
  const [userName, setUserName] = useState("Admin");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [teacherWorkload, setTeacherWorkload] = useState([]);
  const [programDist, setProgramDist] = useState([]);

  const loadData = async (showLoading = true) => {
    try {
      if (showLoading) setIsLoading(true);
      const [statsData, user, teachersList, programsList, coursesList, studentsList] = await Promise.all([
        getAdminStats(),
        getUser(),
        getTeachers().catch(() => []),
        getPrograms().catch(() => []),
        getCourses().catch(() => []),
        getStudents().catch(() => []),
      ]);
      if (statsData) setStats(statsData);
      if (user?.name) setUserName(user.name);
      
      // Extract arrays from API responses
      const tList = Array.isArray(teachersList?.teachers || teachersList) ? (teachersList?.teachers || teachersList) : [];
      const pList = Array.isArray(programsList?.programs || programsList) ? (programsList?.programs || programsList) : [];
      const cList = Array.isArray(coursesList?.courses || coursesList) ? (coursesList?.courses || coursesList) : [];
      const sList = Array.isArray(studentsList?.students || studentsList) ? (studentsList?.students || studentsList) : [];

      // Build teacher workload from the dedicated analytics endpoint (accurate counts)
      try {
        const loadData2 = await getTeacherLoad();
        const loadList = loadData2?.teachers || [];
        setTeacherWorkload(loadList.map(t => ({
          name: t.teacher_name || "Teacher",
          dept: t.department_name || "Department",
          courses: t.course_count || 0,
          students: t.student_count || 0,
        })));
      } catch (loadErr) {
        console.log("[AdminDashboard] Teacher load fetch failed:", loadErr);
        // Fallback: use basic teacher list
        const workload = tList
          .filter(t => !t.isPending)
          .slice(0, 4)
          .map(t => ({
            name: t.name || t.teacher_name || t.user?.name || "Teacher",
            dept: t.department?.name || t.department_name || "Department",
            courses: t.course_count || 0,
            students: t.student_count || 0,
          }));
        setTeacherWorkload(workload);
      }

      // Compute graduated/active counts from student list as fallback
      const graduatedCount = sList.filter(s => (s.status || s.student?.status) === "graduated").length;
      const activeCount = sList.length - graduatedCount;
      if (statsData) {
        statsData.graduated = statsData.graduated || graduatedCount;
        statsData.active_students = activeCount;
        setStats(statsData);
      }

      // Build program distribution from analytics endpoint (accurate counts)
      try {
        const distData = await getProgramDistribution();
        const distList = distData?.programs || [];
        setProgramDist(distList.slice(0, 5).map(p => ({
          name: p.program_name || "Program",
          dept: p.department_name || "",
          students: p.student_count || 0,
        })));
      } catch (distErr) {
        console.log("[AdminDashboard] Program distribution fetch failed:", distErr);
        // Fallback: cross-reference from student list
        const dist = pList.slice(0, 4).map(p => {
          const pStudents = sList.filter(s => s.program_id === p.id || s.program_name === p.name || s.student?.program?.id === p.id);
          return {
            name: p.name || "Program",
            dept: p.department?.name || p.department_name || "",
            students: pStudents.length,
          };
        });
        setProgramDist(dist);
      }
    } catch (e) { console.log(e); }
    finally { setIsLoading(false); }
  };

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadData(false);
    setIsRefreshing(false);
  }, []);

  useFocusEffect(useCallback(() => { loadData(true); }, []));

  useEffect(() => {
    const backAction = () => {
      Alert.alert("Logout", "Would you like to logout?", [
        { text: "Cancel", style: "cancel" },
        { text: "Logout", style: "destructive", onPress: async () => { await clearAuth(); navigation.reset({ index: 0, routes: [{ name: "Login" }] }); } },
      ]);
      return true;
    };
    const bh = BackHandler.addEventListener("hardwareBackPress", backAction);
    return () => bh.remove();
  }, []);

  const statCards = [
    { label: "TOTAL TEACHERS", value: stats.teachers, sub: "approved", subColor: "#10B981", icon: <Users size={16} color={Theme.colors.primaryForeground} />, screen: "TeachersManagement" },
    { label: "TOTAL STUDENTS", value: stats.students, sub: `${stats.active_students ?? stats.students} active`, subColor: "#10B981", icon: <GraduationCap size={16} color={Theme.colors.primaryForeground} />, screen: "StudentsManagement" },
    { label: "DEPARTMENTS", value: stats.departments, sub: `${stats.programs} programs`, subColor: Theme.colors.mutedForeground, icon: <Building2 size={16} color={Theme.colors.primaryForeground} />, screen: "DepartmentsManagement" },
    { label: "TOTAL COURSES", value: stats.courses || 0, sub: "~ 2,450 records", subColor: "#10B981", icon: <BookOpen size={16} color={Theme.colors.primaryForeground} />, screen: "CoursesManagement" },
    { label: "ATTENDANCE RATE", value: `${(stats.attendance_rate || 74.3).toFixed(1)}%`, sub: stats.attendance_rate >= 75 ? "On track" : "Needs attention", subColor: stats.attendance_rate >= 75 ? "#10B981" : "#F59E0B", icon: <TrendingUp size={16} color={Theme.colors.primaryForeground} />, screen: null },
    { label: "GRADUATED", value: stats.graduated || 0, sub: "alumni", subColor: Theme.colors.mutedForeground, icon: <UserX size={16} color={Theme.colors.primaryForeground} />, screen: "StudentsManagement" },
  ];

  const maxProgramStudents = Math.max(...programDist.map(p => p.students), 1);


  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView 
        contentContainerStyle={styles.container} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={["#10B981"]} tintColor="#10B981" />
        }
      >

        {/* Header */}
        <View style={styles.headerSection}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Admin Dashboard 🏛</Text>
            <Text style={styles.subtitle}>Institution-wide overview — teachers, students, departments & analytics</Text>
          </View>
          <View style={styles.headerBtns}>
            <TouchableOpacity style={styles.headerBtnOutline} onPress={loadData} activeOpacity={0.7}>
              <RefreshCw size={13} color={Theme.colors.textBody} style={{ marginRight: 4 }} />
              <Text style={styles.headerBtnText}>Refresh</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerBtnFilled} onPress={() => navigation.navigate("TeachersManagement")} activeOpacity={0.7}>
              <Users size={13} color={Theme.colors.primaryForeground} style={{ marginRight: 4 }} />
              <Text style={styles.headerBtnFilledText}>Manage Teachers</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Stat Cards 3x2 Grid */}
        {isLoading ? (
          <View style={styles.statsGrid}>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </View>
        ) : (
          <View style={styles.statsGrid}>
            {statCards.map((s, i) => (
              <TouchableOpacity
                key={i}
                style={styles.statCard}
                activeOpacity={0.7}
                onPress={() => s.screen && navigation.navigate(s.screen)}
                disabled={!s.screen}
              >
                <View style={styles.statTopRow}>
                  <Text style={styles.statLabel}>{s.label}</Text>
                  <View style={styles.statIconBg}>{s.icon}</View>
                </View>
                <Text style={styles.statNumber} numberOfLines={1} adjustsFontSizeToFit>{s.value}</Text>
                <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4 }}>
                  <TrendingUp size={9} color={s.subColor} style={{ marginRight: 3 }} />
                  <Text style={[styles.statSub, { color: s.subColor }]}>{s.sub}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Teacher Workload */}
        {isLoading ? (
          <SectionCardSkeleton rows={4} />
        ) : (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={styles.sectionTitle}>Teacher Workload</Text>
                <Text style={styles.sectionSubtitle}>Courses and students per teacher</Text>
              </View>
              <TouchableOpacity onPress={() => navigation.navigate("TeachersManagement")} activeOpacity={0.7}>
                <Text style={styles.viewAllText}>View all ›</Text>
              </TouchableOpacity>
            </View>

            {teacherWorkload.length === 0 ? (
              <Text style={styles.emptyText}>No approved teachers yet.</Text>
            ) : (
              <ScrollView style={{ maxHeight: 280 }} nestedScrollEnabled showsVerticalScrollIndicator={false}>
                {teacherWorkload.map((t, i) => (
                  <View key={i} style={[styles.workloadRow, i < teacherWorkload.length - 1 && styles.workloadBorder]}>
                    <View style={styles.workloadAvatar}>
                      <Text style={styles.workloadAvatarText}>{t.name.charAt(0)}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.workloadName}>{t.name}</Text>
                      <Text style={styles.workloadDept}>{t.dept}</Text>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={styles.workloadCourses}>{t.courses}</Text>
                      <Text style={styles.workloadStudentsMeta}>{t.students} students</Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        )}

        {/* Program Distribution */}
        {isLoading ? (
          <SectionCardSkeleton rows={4} />
        ) : (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={styles.sectionTitle}>Program Distribution</Text>
                <Text style={styles.sectionSubtitle}>Students enrolled per program (top 4)</Text>
              </View>
              <TouchableOpacity onPress={() => navigation.navigate("ProgramsManagement")} activeOpacity={0.7}>
                <Text style={styles.viewAllText}>View all ›</Text>
              </TouchableOpacity>
            </View>

            {programDist.length === 0 ? (
              <Text style={styles.emptyText}>No programs configured yet.</Text>
            ) : (
              programDist.map((p, i) => {
                const pct = maxProgramStudents > 0 ? (p.students / maxProgramStudents) * 100 : 0;
                return (
                  <View key={i} style={[styles.programRow, i < programDist.length - 1 && styles.workloadBorder]}>
                    <View style={styles.programRowTop}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.programName} numberOfLines={1}>{p.name}</Text>
                        <Text style={styles.programDept}>{p.dept}</Text>
                      </View>
                      <Text style={styles.programCount}>{p.students}</Text>
                    </View>
                    <View style={styles.programBarTrack}>
                      <View style={[styles.programBarFill, { width: `${Math.max(pct, 4)}%` }]} />
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* Quick Navigation */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Quick Navigation</Text>
          <Text style={[styles.sectionSubtitle, { marginBottom: 14 }]}>Manage your institution</Text>
          {[
            { title: "Teachers", desc: "Approve & manage", screen: "TeachersManagement", icon: <Users size={18} color={Theme.colors.primaryDark} /> },
            { title: "Departments", desc: "Create & organize", screen: "DepartmentsManagement", icon: <Building2 size={18} color={Theme.colors.primaryDark} /> },
            { title: "Programs", desc: "Academic structure", screen: "ProgramsManagement", icon: <BookOpen size={18} color={Theme.colors.primaryDark} /> },
            { title: "Courses", desc: "Course management", screen: "CoursesManagement", icon: <BookOpen size={18} color={Theme.colors.primaryDark} /> },
            { title: "Students", desc: "Student directory", screen: "StudentsManagement", icon: <GraduationCap size={18} color={Theme.colors.primaryDark} /> },
          ].map((action, i) => (
            <TouchableOpacity key={i} style={styles.navRow} activeOpacity={0.7} onPress={() => navigation.navigate(action.screen)}>
              <View style={styles.navIconBg}>{action.icon}</View>
              <View style={{ flex: 1 }}>
                <Text style={styles.navTitle}>{action.title}</Text>
                <Text style={styles.navDesc}>{action.desc}</Text>
              </View>
              <ChevronRight size={16} color={Theme.colors.mutedForeground} />
            </TouchableOpacity>
          ))}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Theme.colors.secondary },
  container: { padding: 20, paddingBottom: 40 },

  // Header
  headerSection: { marginBottom: 18, marginTop: 4 },
  title: { fontSize: 22, fontWeight: "800", color: Theme.colors.foreground },
  subtitle: { fontSize: 12, color: Theme.colors.mutedForeground, marginTop: 3, marginBottom: 12 },
  headerBtns: { flexDirection: "row", gap: 8 },
  headerBtnOutline: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: Theme.colors.background, borderWidth: 1, borderColor: Theme.colors.border,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8,
  },
  headerBtnText: { fontSize: 12, fontWeight: "600", color: Theme.colors.textBody },
  headerBtnFilled: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: Theme.colors.primaryDark,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8,
  },
  headerBtnFilledText: { fontSize: 12, fontWeight: "600", color: Theme.colors.primaryForeground },

  // Stats Grid
  statsGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginBottom: 16 },
  statCard: {
    width: "48%",
    backgroundColor: Theme.colors.background,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    shadowColor: Theme.colors.foreground,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  statTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  statLabel: { fontSize: 8, fontWeight: "700", color: Theme.colors.mutedForeground, letterSpacing: 0.4, flex: 1, marginRight: 4 },
  statNumber: { fontSize: 26, fontWeight: "800", color: Theme.colors.foreground },
  statSub: { fontSize: 10, fontWeight: "600" },
  statIconBg: { width: 32, height: 32, borderRadius: 9, backgroundColor: Theme.colors.primaryDark, justifyContent: "center", alignItems: "center" },

  // Section Card
  sectionCard: {
    backgroundColor: Theme.colors.background,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    shadowColor: Theme.colors.foreground,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  sectionHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: Theme.colors.foreground },
  sectionSubtitle: { fontSize: 11, color: Theme.colors.mutedForeground, marginTop: 1 },
  viewAllText: { fontSize: 12, fontWeight: "600", color: Theme.colors.primaryDark },

  // Teacher Workload
  workloadRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12 },
  workloadBorder: { borderBottomWidth: 1, borderBottomColor: Theme.colors.muted },
  workloadAvatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: Theme.colors.muted, justifyContent: "center", alignItems: "center", marginRight: 10 },
  workloadAvatarText: { fontSize: 13, fontWeight: "700", color: Theme.colors.textBody },
  workloadName: { fontSize: 13, fontWeight: "600", color: Theme.colors.foreground },
  workloadDept: { fontSize: 10, color: Theme.colors.mutedForeground },
  workloadCourses: { fontSize: 16, fontWeight: "800", color: Theme.colors.foreground },
  workloadStudentsMeta: { fontSize: 10, color: Theme.colors.mutedForeground },

  // Program Distribution
  programRow: { paddingVertical: 12 },
  programRowTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  programName: { fontSize: 13, fontWeight: "600", color: Theme.colors.foreground },
  programDept: { fontSize: 10, color: Theme.colors.mutedForeground, marginTop: 1 },
  programCount: { fontSize: 16, fontWeight: "800", color: Theme.colors.foreground },
  programBarTrack: { height: 6, borderRadius: 3, backgroundColor: Theme.colors.border, overflow: "hidden" },
  programBarFill: { height: "100%", borderRadius: 3, backgroundColor: Theme.colors.primaryDark },

  // Quick Nav
  navRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Theme.colors.muted },
  navIconBg: { width: 36, height: 36, borderRadius: 10, backgroundColor: Theme.colors.accentLight, justifyContent: "center", alignItems: "center", marginRight: 12 },
  navTitle: { fontSize: 14, fontWeight: "600", color: Theme.colors.foreground },
  navDesc: { fontSize: 11, color: Theme.colors.mutedForeground },

  emptyText: { fontSize: 13, color: Theme.colors.mutedForeground, textAlign: "center", paddingVertical: 16 },
});