import React, {  useState, useCallback , useMemo } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  ScrollView, ActivityIndicator, TextInput, Dimensions, Alert
} from "react-native";
import { getTeacherCourses, getCourseStudents, trainModel as trainModelApi } from "../../api/teacherApi";
import { useFocusEffect } from "@react-navigation/native";
import { Theme, useTheme } from "../../theme/Theme";
import { Search, BookOpen, Users, ScanFace, Camera, AlertCircle, Cpu, CheckCircle, XCircle, ArrowLeft, RefreshCw, Info, Play } from "lucide-react-native";
import SkeletonLoader, { SearchBarSkeleton, ListCardSkeleton } from "../../components/SkeletonLoader";
import { EmptyStateCompact } from "../../components/EmptyState";

const { width } = Dimensions.get("window");

export default function AttendanceCamera({ navigation }) {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [students, setStudents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [search, setSearch] = useState("");
  const [isTraining, setIsTraining] = useState(false);

  useFocusEffect(useCallback(() => {
    const load = async () => {
      try {
        setIsLoading(true);
        const data = await getTeacherCourses();
        const list = Array.isArray(data) ? data : ((data as any)?.courses || []);
        setCourses(list.map((c) => ({
          id: c.id, 
          name: c.name || c.course_name || "Untitled", 
          code: c.code || c.course_code || "",
          program: c.program || c.semester?.academicYear?.program?.name || c.program_name || "",
          department: c.department || c.semester?.academicYear?.program?.department?.name || c.department_name || "",
          semester: c.semester_name || (typeof c.semester === "string" ? c.semester : c.semester?.name) || "",
          year: c.academic_year || c.year || c.semester?.academicYear?.name || "",
          students: c.student_count || c._count?.students || c.students_count || c.total_students || 0,
        })));
      } catch (e: any) { console.log(e); }
      finally { setIsLoading(false); }
    };
    load();
  }, []));

  const loadStudents = async (courseId) => {
    try {
      setIsLoadingStudents(true);
      const data = await getCourseStudents(courseId);
      const list = Array.isArray(data) ? data : [];
      setStudents(list.map((s) => ({
        id: s.id,
        name: (s as any).user?.name || s.name || "Student",
        email: (s as any).user?.email || s.email || "—",
        hasPhotos: !!(s as any).faceEmbedding || (s as any).photosUploaded || false,
        trained: !!(s as any).faceEmbedding,
        photoCount: s.photoCount || 0,
      })));
    } catch (e: any) { console.log(e); }
    finally { setIsLoadingStudents(false); }
  };

  const selectCourse = (course) => {
    setSelectedCourse(course);
    loadStudents(course.id);
  };

  const filteredCourses = courses.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q) ||
      c.department.toLowerCase().includes(q) || c.program.toLowerCase().includes(q);
  });

  const trainModel = async () => {
    try {
      setIsTraining(true);
      await trainModelApi(selectedCourse.id);
      Alert.alert("Training Complete", "Model training has been completed for all students.");
      // Reload students to get updated trained status
      loadStudents(selectedCourse.id);
    } catch (e: any) {
      console.log("Training error:", e);
      Alert.alert("Error", e.message || "Failed to start training.");
    } finally { setIsTraining(false); }
  };

  const trained = students.filter((s) => s.trained).length;
  const withPhotos = students.filter((s) => s.hasPhotos).length;
  const notTrained = students.length - trained;

  /* ═══════════════════════════════════════════════════════ */
  /* Phase 1: Course Selection                               */
  /* ═══════════════════════════════════════════════════════ */
  if (!selectedCourse) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Attendance Management</Text>
            <Text style={styles.subtitle}>Select a course, train the face recognition model, then capture live attendance.</Text>
          </View>

          {/* Select Course Card */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionIconBg}>
                <BookOpen size={16} color={colors.primaryForeground} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionHeaderText}>Select Course</Text>
                <Text style={styles.sectionSubText}>{courses.length} course{courses.length !== 1 ? "s" : ""} available — search to filter</Text>
              </View>
            </View>

            <View style={styles.searchBar}>
              <Search size={14} color={colors.mutedForeground} style={{ marginRight: 8 }} />
              <TextInput style={styles.searchInput}
                placeholder="Search by course name, department, program, or semester..."
                placeholderTextColor={colors.mutedForeground} value={search} onChangeText={setSearch} />
            </View>

            {isLoading ? (
              <View>
                <SearchBarSkeleton />
                <ListCardSkeleton rows={4} />
              </View>
            ) : filteredCourses.length === 0 ? (
              <EmptyStateCompact icon={BookOpen} title="No courses found" subtitle="Try a different search term" />
            ) : (
              filteredCourses.map((c) => (
                <TouchableOpacity key={c.id} style={styles.courseItem} onPress={() => selectCourse(c)} activeOpacity={0.7}>
                  <Text style={styles.courseItemName}>{c.name}</Text>
                  <Text style={styles.courseItemMeta}>{[c.department, c.program, c.year, c.semester].filter(Boolean).join(" → ")}</Text>
                </TouchableOpacity>
              ))
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  /* ═══════════════════════════════════════════════════════ */
  /* Phase 2: Attendance Management (after course selected)  */
  /* ═══════════════════════════════════════════════════════ */
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Attendance Management</Text>
          <Text style={styles.subtitle}>Select a course, train the face recognition model, then capture live attendance.</Text>
        </View>

        {/* Selected Course Banner */}
        <View style={styles.selectedBanner}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={styles.selectedLabel}>SELECTED COURSE</Text>
            <Text style={styles.selectedName}>{selectedCourse.name}</Text>
            <Text style={styles.selectedMeta} numberOfLines={2}>{[selectedCourse.department, selectedCourse.program, selectedCourse.year, selectedCourse.semester].filter(Boolean).join(" → ")}</Text>
          </View>
          <TouchableOpacity style={styles.changeCourseBtn} onPress={() => { setSelectedCourse(null); setStudents([]); }}>
            <Text style={styles.changeCourseBtnText}>Change course</Text>
          </TouchableOpacity>
        </View>

        {/* Stats, Actions, Table — all gated on loading */}
        {isLoadingStudents ? (
          <View>
            {/* Stat Cards Skeleton — matches new vertical centered layout */}
            <View style={styles.statsRow}>
              {[0,1,2,3].map(i => (
                <View key={i} style={[styles.statCard, { alignItems: "center" }]}>
                  <SkeletonLoader style={{ width: 30, height: 30, borderRadius: 8 }} />
                  <SkeletonLoader style={{ width: 32, height: 22, borderRadius: 6, marginTop: 8 }} />
                  <SkeletonLoader style={{ width: 44, height: 10, borderRadius: 4, marginTop: 4 }} />
                </View>
              ))}
            </View>

            {/* Action Buttons Skeleton */}
            <View style={{ flexDirection: "row", gap: 10, marginBottom: 16 }}>
              <SkeletonLoader style={{ flex: 1, height: 44, borderRadius: 12 }} />
              <SkeletonLoader style={{ flex: 1, height: 44, borderRadius: 12 }} />
            </View>

            {/* Table Skeleton */}
            <View style={styles.tableCard}>
              <SkeletonLoader style={{ width: 140, height: 16, borderRadius: 6, marginBottom: 6 }} />
              <SkeletonLoader style={{ width: 100, height: 12, borderRadius: 4, marginBottom: 14 }} />
              {[0,1,2,3,4].map(i => (
                <View key={i} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 12, borderTopWidth: i > 0 ? 1 : 0, borderTopColor: colors.border }}>
                  <View style={{ flex: 2 }}>
                    <SkeletonLoader style={{ width: "70%", height: 13, borderRadius: 4, marginBottom: 4 }} />
                    <SkeletonLoader style={{ width: "50%", height: 10, borderRadius: 4 }} />
                  </View>
                  <SkeletonLoader style={{ width: 50, height: 12, borderRadius: 4, flex: 0.8 }} />
                  <SkeletonLoader style={{ width: 20, height: 12, borderRadius: 4, flex: 0.8, marginLeft: 6 }} />
                  <SkeletonLoader style={{ width: 50, height: 20, borderRadius: 10, flex: 0.9, marginLeft: 6 }} />
                </View>
              ))}
            </View>
          </View>
        ) : (
          <>
            {/* Stats Grid */}
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <View style={styles.statIconBg}><Users size={14} color={colors.primaryForeground} /></View>
                <Text style={styles.statNumber}>{students.length}</Text>
                <Text style={styles.statLabel}>Students</Text>
              </View>
              <View style={styles.statCard}>
                <View style={styles.statIconBg}><ScanFace size={14} color={colors.primaryForeground} /></View>
                <Text style={[styles.statNumber, { color: colors.accent }]}>{trained}</Text>
                <Text style={styles.statLabel}>Trained</Text>
              </View>
              <View style={styles.statCard}>
                <View style={styles.statIconBg}><Camera size={14} color={colors.primaryForeground} /></View>
                <Text style={styles.statNumber}>{withPhotos}</Text>
                <Text style={styles.statLabel}>Photos</Text>
              </View>
              <View style={styles.statCard}>
                <View style={styles.statIconBg}><AlertCircle size={14} color={colors.primaryForeground} /></View>
                <Text style={[styles.statNumber, { color: colors.destructive }]}>{notTrained}</Text>
                <Text style={styles.statLabel}>Untrained</Text>
              </View>
            </View>

            {/* Action Buttons Row */}
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.trainBtnOutline, isTraining && { opacity: 0.6 }]}
                onPress={trainModel}
                disabled={isTraining}
                activeOpacity={0.8}>
                {isTraining ? (
                  <ActivityIndicator size="small" color={colors.accent} />
                ) : (
                  <>
                    <Cpu size={14} color={colors.accent} style={{ marginRight: 6 }} />
                    <Text style={styles.trainBtnOutlineText}>Train Recognition Model</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.captureBtn}
                onPress={() => navigation.navigate("AttendanceSession", {
                  course: selectedCourse,
                  studentCount: students.length,
                  trainedCount: trained,
                  notTrainedCount: notTrained,
                })}
                activeOpacity={0.8}>
                <Play size={14} color={colors.primaryForeground} style={{ marginRight: 6 }} />
                <Text style={styles.captureBtnText}>Capture Attendance</Text>
              </TouchableOpacity>
            </View>

            {/* Enrolled Students Table */}
            <View style={styles.tableCard}>
              <Text style={styles.tableTitle}>Enrolled Students</Text>
              <Text style={styles.tableSubtitle}>{students.length} total enrolled</Text>

              <View style={styles.tableHeaderRow}>
                <Text style={[styles.tableHeaderText, { flex: 2 }]}>STUDENT</Text>
                <Text style={[styles.tableHeaderText, { flex: 0.8, textAlign: "center" }]}>PHOTOS</Text>
                <Text style={[styles.tableHeaderText, { flex: 0.8, textAlign: "center" }]}>COUNT</Text>
                <Text style={[styles.tableHeaderText, { flex: 0.9, textAlign: "center" }]}>STATUS</Text>
              </View>

              {students.length === 0 ? (
                <EmptyStateCompact icon={Users} title="No students enrolled" subtitle="Students need to enroll in this course" />
              ) : (
                students.map((s, i) => (
                  <View key={s.id} style={[styles.tableRow, i < students.length - 1 && styles.tableBorder]}>
                    <View style={{ flex: 2, paddingRight: 6 }}>
                      <Text style={styles.studentName} numberOfLines={1}>{s.name}</Text>
                      <Text style={styles.studentEmail} numberOfLines={1}>{s.email}</Text>
                    </View>
                    <View style={{ flex: 0.8, alignItems: "center" }}>
                      {s.hasPhotos ? (
                        <View style={styles.photoAvailable}>
                          <CheckCircle size={11} color={colors.success} style={{ marginRight: 2 }} />
                          <Text style={[styles.badgeText, { color: colors.success }]}>Available</Text>
                        </View>
                      ) : (
                        <View style={styles.photoMissing}>
                          <Text style={[styles.badgeText, { color: colors.mutedForeground }]}>None</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.cellNum, { flex: 0.8, textAlign: "center" }]}>{s.photoCount}</Text>
                    <View style={{ flex: 0.9, alignItems: "center" }}>
                      {s.trained ? (
                        <View style={styles.trainedBadge}>
                          <CheckCircle size={11} color={colors.success} style={{ marginRight: 2 }} />
                          <Text style={[styles.badgeText, { color: colors.success }]}>Trained</Text>
                        </View>
                      ) : (
                        <View style={styles.pendingBadge}>
                          <Text style={[styles.badgeText, { color: colors.mutedForeground }]}>Pending</Text>
                        </View>
                      )}
                    </View>
                  </View>
                ))
              )}
            </View>

            {/* Info Card */}
            <View style={styles.infoCard}>
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
                <Info size={14} color={colors.accent} style={{ marginRight: 6 }} />
                <Text style={styles.infoTitle}>How cumulative attendance works</Text>
              </View>
              <Text style={styles.infoStep}>• Face recognition runs centrally via CCTV/webcam</Text>
              <Text style={styles.infoStep}>• Auto-captures every 2 minutes thereafter</Text>
              <Text style={styles.infoStep}>• Once recognized, students stay marked present</Text>
              <Text style={styles.infoStep}>• Submit at end to save the session record</Text>
              <View style={styles.infoHighlight}>
                <Text style={styles.infoHighlightText}>Students only need to be detected once — no need to stay in frame!</Text>
              </View>
            </View>
          </>
        )}


      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors, isDark) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.secondary },
  container: { padding: 20, paddingBottom: 40 },

  // Header
  header: { marginBottom: 18, marginTop: 8 },
  title: { fontSize: 24, fontWeight: "800", color: colors.foreground },
  subtitle: { fontSize: 13, color: colors.mutedForeground, marginTop: 3 },

  // Section Card
  sectionCard: {
    backgroundColor: colors.background,
    borderRadius: 14,
    padding: 18,
    marginBottom: 16,
    shadowColor: colors.foreground,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionHeaderRow: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  sectionIconBg: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primaryDark, justifyContent: "center", alignItems: "center", marginRight: 12 },
  sectionHeaderText: { fontSize: 15, fontWeight: "700", color: colors.foreground },
  sectionSubText: { fontSize: 11, color: colors.mutedForeground, marginTop: 1 },

  // Search
  searchBar: { flexDirection: "row", alignItems: "center", backgroundColor: colors.secondary, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: colors.border, marginBottom: 12 },
  searchInput: { flex: 1, fontSize: 13, color: colors.foreground, padding: 0 },

  // Course Items
  courseItem: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 14, marginBottom: 8 },
  courseItemName: { fontSize: 14, fontWeight: "700", color: colors.foreground, marginBottom: 3 },
  courseItemMeta: { fontSize: 11, color: colors.mutedForeground },

  // Selected Course Banner
  selectedBanner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: isDark ? colors.card : "rgba(13,148,136,0.04)",
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: isDark ? colors.border : "rgba(13,148,136,0.15)",
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
  },
  selectedLabel: { fontSize: 10, fontWeight: "700", color: colors.accent, letterSpacing: 0.5, marginBottom: 4 },
  selectedName: { fontSize: 16, fontWeight: "700", color: colors.foreground, marginBottom: 3 },
  selectedMeta: { fontSize: 11, color: colors.mutedForeground },
  changeCourseBtn: { backgroundColor: colors.background, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: colors.border },
  changeCourseBtnText: { fontSize: 12, fontWeight: "500", color: colors.foreground },

  // Stats
  statsRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16 },
  statCard: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 3,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    shadowColor: colors.foreground,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  statLabel: { fontSize: 10, fontWeight: "600", color: colors.mutedForeground, marginTop: 2 },
  statNumber: { fontSize: 22, fontWeight: "800", color: colors.foreground, marginTop: 6 },
  statIconBg: { width: 30, height: 30, borderRadius: 8, backgroundColor: colors.primaryDark, justifyContent: "center", alignItems: "center" },

  // Action Buttons
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 18,
  },
  trainBtnOutline: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: colors.background,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: colors.accent,
  },
  trainBtnOutlineText: { color: colors.accent, fontSize: 11, fontWeight: "700" },
  captureBtn: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: colors.primaryDark,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  captureBtnText: { color: colors.primaryForeground, fontSize: 12, fontWeight: "700" },

  // Table
  tableCard: { backgroundColor: colors.background, borderRadius: 14, padding: 16, marginBottom: 16, shadowColor: colors.foreground, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 6, elevation: 1, borderWidth: 1, borderColor: colors.border },
  tableTitle: { fontSize: 18, fontWeight: "800", color: colors.foreground },
  tableSubtitle: { fontSize: 12, color: colors.mutedForeground, marginTop: 2, marginBottom: 14 },
  tableHeaderRow: { flexDirection: "row", paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.muted, marginBottom: 4 },
  tableHeaderText: { fontSize: 9, fontWeight: "700", color: colors.mutedForeground, letterSpacing: 0.5 },
  tableRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10 },
  tableBorder: { borderBottomWidth: 1, borderBottomColor: colors.muted },
  studentName: { fontSize: 12, fontWeight: "700", color: colors.foreground, marginBottom: 1 },
  studentEmail: { fontSize: 10, color: colors.mutedForeground },
  cellNum: { fontSize: 13, fontWeight: "600", color: colors.textBody, textAlign: "center" },

  // Badges
  photoAvailable: { flexDirection: "row", alignItems: "center" },
  photoMissing: { flexDirection: "row", alignItems: "center" },
  trainedBadge: { flexDirection: "row", alignItems: "center", backgroundColor: colors.successLight, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 8 },
  pendingBadge: { backgroundColor: colors.secondary, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 8, borderWidth: 1, borderColor: colors.border },
  badgeText: { fontSize: 9, fontWeight: "700" },

  // Info
  infoCard: { backgroundColor: colors.background, borderRadius: 14, padding: 18, borderWidth: 1, borderColor: colors.border, marginBottom: 16 },
  infoTitle: { fontSize: 14, fontWeight: "700", color: colors.foreground },
  infoStep: { fontSize: 12, color: colors.mutedForeground, lineHeight: 20, marginBottom: 2 },
  infoHighlight: { backgroundColor: colors.warningLight, borderRadius: 8, padding: 10, marginTop: 10 },
  infoHighlightText: { fontSize: 11, color: colors.warning, fontWeight: "600" },

  emptyText: { fontSize: 13, color: colors.mutedForeground, textAlign: "center", paddingVertical: 16 },
});