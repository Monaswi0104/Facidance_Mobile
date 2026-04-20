import React, { useState, useCallback } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity,
  SafeAreaView, ScrollView, Alert, ActivityIndicator, Modal, Dimensions
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { getTeachers, approveTeacher, deleteTeacher, getDepartments, getCourses, getStudents } from "../../api/adminApi";
import { useFocusEffect } from "@react-navigation/native";
import { Theme } from "../../theme/Theme";
import { Users, Clock, CheckCircle, Mail, Building2, BookOpen, User, Trash2, Star } from "lucide-react-native";

export default function TeachersManagement() {
  const [approved, setApproved] = useState([]);
  const [pending, setPending] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0 });
  const [selectedTeacher, setSelectedTeacher] = useState(null);

  const [selectedTeacherForDept, setSelectedTeacherForDept] = useState(null);
  const [selectedDeptId, setSelectedDeptId] = useState(null);

  const loadTeachers = async () => {
    try {
      setIsLoading(true);
      const [teacherData, deptData, coursesData, studentsData] = await Promise.all([getTeachers(), getDepartments(), getCourses(), getStudents()]);
      const all = teacherData.teachers || teacherData || [];
      const allCourses = coursesData.courses || coursesData || [];
      const allStudents = studentsData.students || studentsData || [];
      setDepartments(deptData.departments || deptData || []);

      const app = all.filter(t => !t.isPending).map(t => {
        const myCourses = allCourses.filter(c => c.teacher_id === t.id || c.teacherId === t.id || c.teacher?.id === t.id || c.teacher_name === t.name);
        const coursesToMap = t.courses && t.courses.length > 0 ? t.courses : myCourses;
        
        const mappedCourses = coursesToMap.map(c => {
          const partialCourse = c.course || c;
          const fullCourse = allCourses.find(ac => ac.id === partialCourse.id) || partialCourse;
          const enrolledStudentsCount = allStudents.filter(u => {
            const studentCourses = u.courses || u.student?.courses || [];
            return studentCourses.some(sc => sc.id === fullCourse.id);
          }).length;
          
          return {
            id: fullCourse.id || `${Math.random()}`,
            name: fullCourse.name || "Unknown Course",
            code: fullCourse.code || "—",
            program: fullCourse.program_name || fullCourse.program?.name || fullCourse.program || fullCourse.semester?.academicYear?.program?.name || "—",
            semester: fullCourse.semester_name || fullCourse.semester?.name || fullCourse.semester || "—",
            students: fullCourse.student_count || fullCourse.students_count || fullCourse._count?.students || fullCourse.students?.length || fullCourse.students || enrolledStudentsCount || 0,
          };
        });

        return {
          id: t.id, userId: t.userId, name: t.name || t.user?.name,
          email: t.email || t.user?.email || "—",
          dept: t.departmentName || t.department?.name || "Unassigned",
          courses: mappedCourses,
          createdAt: t.createdAt,
        };
      });
      const pen = all.filter(t => t.isPending).map(t => ({
        id: t.id, userId: t.userId, name: t.name || t.user?.name,
        email: t.email || t.user?.email || "—",
        dept: "—",
      }));

      setApproved(app);
      setPending(pen);
      setStats({ total: all.length, pending: pen.length, approved: app.length });
    } catch (e) { console.log(e); }
    finally { setIsLoading(false); }
  };

  useFocusEffect(useCallback(() => { loadTeachers(); }, []));

  const handleApprove = (teacher) => {
    if (selectedTeacherForDept === teacher.id) {
      setSelectedTeacherForDept(null);
      setSelectedDeptId(null);
    } else {
      setSelectedTeacherForDept(teacher.id);
      setSelectedDeptId(null);
    }
  };

  const confirmApproval = async (teacher) => {
    if (!selectedDeptId) {
      Alert.alert("Missing", "Please select a department first.");
      return;
    }
    try {
      await approveTeacher(teacher.userId || teacher.id, selectedDeptId);
      Alert.alert("Approved", `${teacher.name} has been approved and assigned.`);
      setSelectedTeacherForDept(null);
      setSelectedDeptId(null);
      loadTeachers();
    } catch (e) { Alert.alert("Error", "Failed to approve."); }
  };

  const handleDelete = (teacher) => {
    Alert.alert("Delete Teacher", `Remove ${teacher.name}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive", onPress: async () => {
          try {
            await deleteTeacher(teacher.userId || teacher.id);
            Alert.alert("Done", `${teacher.name} removed.`);
            loadTeachers();
          } catch (e) { Alert.alert("Error", "Failed to delete."); }
        }
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.headerSection}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Teachers</Text>
            <Text style={styles.subtitle}>Approve new teachers, assign departments, and manage faculty records.</Text>
          </View>
          {/* Stats pills */}
          <View style={styles.statsPills}>
            <View style={styles.statPill}>
              <Text style={styles.statPillLabel}>TOTAL</Text>
              <Text style={styles.statPillValue}>{stats.total}</Text>
            </View>
            <View style={[styles.statPill, { borderColor: "#FECACA" }]}>
              <Text style={[styles.statPillLabel, { color: "#EF4444" }]}>PENDING</Text>
              <Text style={[styles.statPillValue, { color: "#EF4444" }]}>{stats.pending}</Text>
            </View>
            <View style={[styles.statPill, { borderColor: "#A7F3D0" }]}>
              <Text style={[styles.statPillLabel, { color: "#10B981" }]}>APPROVED</Text>
              <Text style={[styles.statPillValue, { color: "#10B981" }]}>{stats.approved}</Text>
            </View>
          </View>
        </View>

        {isLoading ? (
          <ActivityIndicator size="small" color={Theme.colors.accent} style={{ marginVertical: 20 }} />
        ) : (
          <View style={styles.cardsRow}>
            {/* Pending Approvals Card */}
            <View style={[styles.sectionCard, { marginRight: 6 }]}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionIconBg}>
                  <Clock size={14} color="#FFF" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sectionTitle}>Pending Approvals</Text>
                  <Text style={styles.sectionSubtitle}>Assign a department to approve</Text>
                </View>
                <View style={[styles.countBadge, { backgroundColor: "#FEF2F2" }]}>
                  <Text style={[styles.countText, { color: "#EF4444" }]}>{pending.length} pending</Text>
                </View>
              </View>

              {pending.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Star size={24} color="#CBD5E1" style={{ marginBottom: 8 }} />
                  <Text style={styles.emptyText}>No pending registrations.</Text>
                </View>
              ) : (
                pending.map((t) => {
                  const isExpanded = selectedTeacherForDept === t.id;
                  return (
                    <View key={t.id} style={[styles.teacherRow, isExpanded && styles.teacherRowExpanded]}>
                      <View style={styles.teacherMainRow}>
                        <View style={styles.avatar}>
                          <Text style={styles.avatarText}>{t.name?.charAt(0) || "T"}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.teacherName}>{t.name}</Text>
                          <Text style={styles.teacherEmail}>{t.email}</Text>
                        </View>
                        <View style={{ flexDirection: "row" }}>
                          <TouchableOpacity style={styles.approveBtn} onPress={() => handleApprove(t)}>
                            <Text style={styles.approveBtnText}>{isExpanded ? "Cancel" : "Approve"}</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.deleteSmallBtn} onPress={() => handleDelete(t)}>
                            <Trash2 size={13} color="#EF4444" />
                          </TouchableOpacity>
                        </View>
                      </View>

                      {isExpanded && (
                        <View style={styles.assignmentArea}>
                          <Text style={styles.assignmentLabel}>ASSIGN DEPARTMENT</Text>
                          <View style={styles.assignmentControls}>
                            <View style={styles.pickerContainer}>
                              <Picker
                                selectedValue={selectedDeptId}
                                onValueChange={(v) => setSelectedDeptId(v)}
                                style={styles.picker}
                                mode="dropdown"
                              >
                                <Picker.Item label="Select department" value={null} color="#94A3B8" />
                                {departments.map(d => (
                                  <Picker.Item key={d.id} label={d.name} value={d.id} color="#1E293B" />
                                ))}
                              </Picker>
                            </View>
                            <TouchableOpacity style={styles.confirmBtn} onPress={() => confirmApproval(t)}>
                              <CheckCircle size={13} color="#FFF" style={{ marginRight: 4 }} />
                              <Text style={styles.confirmBtnText}>Confirm</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      )}
                    </View>
                  );
                })
              )}
            </View>

            {/* Approved Teachers Card */}
            <View style={[styles.sectionCard, { marginLeft: 6 }]}>
              <View style={styles.sectionHeaderRow}>
                <View style={[styles.sectionIconBg]}>
                  <CheckCircle size={14} color="#FFF" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sectionTitle}>Approved Teachers</Text>
                  <Text style={styles.sectionSubtitle}>Assigned to departments</Text>
                </View>
                <View style={[styles.countBadge, { backgroundColor: "#F0FDF4" }]}>
                  <Text style={[styles.countText, { color: "#10B981" }]}>{approved.length} active</Text>
                </View>
              </View>

              {approved.length === 0 ? (
                <Text style={styles.emptyText}>No approved teachers yet.</Text>
              ) : (
                approved.map((t) => (
                  <TouchableOpacity key={t.id} style={styles.teacherRow} activeOpacity={0.7} onPress={() => setSelectedTeacher(t)}>
                    <View style={styles.teacherMainRow}>
                      <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{t.name?.charAt(0) || "T"}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.teacherName}>{t.name}</Text>
                        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 1 }}>
                          <Mail size={10} color="#94A3B8" style={{ marginRight: 3 }} />
                          <Text style={styles.teacherEmail} numberOfLines={1}>{t.email}</Text>
                        </View>
                        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 3 }}>
                          <Text style={styles.deptLabel}>Dept: </Text>
                          <Text style={styles.deptValue}>{t.dept}</Text>
                        </View>
                      </View>
                      <TouchableOpacity style={styles.deleteBtnOutline} onPress={() => handleDelete(t)}>
                        <Trash2 size={11} color="#EF4444" style={{ marginRight: 3 }} />
                        <Text style={styles.deleteBtnText}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </View>
          </View>
        )}

      </ScrollView>

      {/* Teacher Detail Modal */}
      <Modal visible={!!selectedTeacher} transparent animationType="slide">
        <View style={styles.detailOverlay}>
          <View style={styles.detailCard}>
            <View style={styles.detailProfileSection}>
              <View style={styles.detailAvatar}>
                <Text style={styles.detailAvatarText}>{selectedTeacher?.name?.charAt(0) || "T"}</Text>
              </View>
              <Text style={styles.detailName}>{selectedTeacher?.name}</Text>
              <View style={styles.roleBadge}>
                <Text style={styles.roleBadgeText}>Faculty</Text>
              </View>
            </View>

            <View style={styles.detailInfoList}>
              <View style={styles.detailInfoItem}>
                <Mail size={16} color="#94A3B8" style={{ marginRight: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.detailInfoLabel}>Email</Text>
                  <Text style={styles.detailInfoValue}>{selectedTeacher?.email}</Text>
                </View>
              </View>
              <View style={styles.detailInfoItem}>
                <Building2 size={16} color="#94A3B8" style={{ marginRight: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.detailInfoLabel}>Department</Text>
                  <Text style={styles.detailInfoValue}>{selectedTeacher?.dept}</Text>
                </View>
              </View>
            </View>

            <View style={styles.detailStatsRow}>
              <View style={styles.detailStatBox}>
                <Text style={styles.detailStatNumber}>{selectedTeacher?.courses?.length || 0}</Text>
                <Text style={styles.detailStatLabel}>Courses</Text>
              </View>
              <View style={[styles.detailStatBox, { borderLeftWidth: 1, borderLeftColor: "#E2E8F0" }]}>
                <Text style={styles.detailStatNumber}>{selectedTeacher?.courses?.reduce((a, c) => a + (c.students || 0), 0) || 0}</Text>
                <Text style={styles.detailStatLabel}>Students</Text>
              </View>
            </View>

            <Text style={styles.detailSectionTitle}>Courses Teaching</Text>
            <ScrollView style={{ maxHeight: Dimensions.get('window').height * 0.25 }} showsVerticalScrollIndicator={false}>
              {selectedTeacher?.courses?.length > 0 ? (
                selectedTeacher.courses.map((c, idx) => (
                  <View key={c.id || idx} style={styles.courseItem}>
                    <View style={styles.courseItemLeft}>
                      <BookOpen size={14} color={Theme.colors.primaryDark} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.courseItemName}>{c.name}</Text>
                      <Text style={styles.courseItemCode}>{c.code}</Text>
                      <View style={styles.courseItemTagsRow}>
                        <View style={[styles.courseTag, { backgroundColor: "#F0FDFA" }]}>
                          <Text style={[styles.courseTagText, { color: Theme.colors.primaryDark }]}>{c.program}</Text>
                        </View>
                        <View style={[styles.courseTag, { backgroundColor: "#F0FDF4" }]}>
                          <Text style={[styles.courseTagText, { color: "#10B981" }]}>{c.semester}</Text>
                        </View>
                        <View style={[styles.courseTag, { backgroundColor: "#FEF3C7" }]}>
                          <Text style={[styles.courseTagText, { color: "#D97706" }]}>{c.students} students</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                ))
              ) : (
                <Text style={styles.detailEmpty}>No courses assigned yet.</Text>
              )}
            </ScrollView>

            <TouchableOpacity style={styles.detailCloseBtn} activeOpacity={0.7} onPress={() => setSelectedTeacher(null)}>
              <Text style={styles.detailCloseBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F8FAFC" },
  container: { padding: 20, paddingBottom: 40 },

  // Header
  headerSection: { marginBottom: 16, marginTop: 8 },
  title: { fontSize: 24, fontWeight: "800", color: "#0F172A" },
  subtitle: { fontSize: 12, color: "#64748B", marginTop: 3, marginBottom: 12 },
  statsPills: { flexDirection: "row", gap: 6 },
  statPill: { borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, alignItems: "center", backgroundColor: "#FFF" },
  statPillLabel: { fontSize: 8, fontWeight: "700", color: "#94A3B8", letterSpacing: 0.4, marginBottom: 2 },
  statPillValue: { fontSize: 18, fontWeight: "800", color: "#0F172A" },

  // Cards Row
  cardsRow: { flexDirection: "column" },

  // Section Card
  sectionCard: {
    backgroundColor: "#FFF", borderRadius: 14, padding: 16, marginBottom: 14,
    borderWidth: 1, borderColor: "#E2E8F0",
    shadowColor: "#0F172A", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 6, elevation: 1,
  },
  sectionHeaderRow: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  sectionIconBg: { width: 30, height: 30, borderRadius: 8, backgroundColor: Theme.colors.primaryDark, justifyContent: "center", alignItems: "center", marginRight: 10 },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: "#0F172A" },
  sectionSubtitle: { fontSize: 10, color: "#94A3B8" },
  countBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  countText: { fontSize: 10, fontWeight: "700" },

  // Empty
  emptyBox: { alignItems: "center", paddingVertical: 30 },
  emptyText: { fontSize: 12, color: "#94A3B8", textAlign: "center" },

  // Teacher Rows
  teacherRow: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  teacherRowExpanded: { backgroundColor: "#F8FAFC", paddingHorizontal: 10, marginHorizontal: -10, borderRadius: 10, borderBottomWidth: 0, marginBottom: 6 },
  teacherMainRow: { flexDirection: "row", alignItems: "center" },
  avatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: Theme.colors.primaryDark, justifyContent: "center", alignItems: "center", marginRight: 10 },
  avatarText: { fontSize: 13, fontWeight: "700", color: "#FFF" },
  teacherName: { fontSize: 13, fontWeight: "700", color: "#0F172A" },
  teacherEmail: { fontSize: 10, color: "#94A3B8" },
  deptLabel: { fontSize: 10, color: "#94A3B8" },
  deptValue: { fontSize: 10, fontWeight: "700", color: Theme.colors.primaryDark },

  // Buttons
  approveBtn: { backgroundColor: Theme.colors.primaryDark, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, marginRight: 4 },
  approveBtnText: { fontSize: 10, fontWeight: "700", color: "#FFF" },
  deleteSmallBtn: { width: 30, height: 30, borderRadius: 6, borderWidth: 1, borderColor: "#FECACA", backgroundColor: "#FEF2F2", justifyContent: "center", alignItems: "center" },
  deleteBtnOutline: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#FECACA", backgroundColor: "#FEF2F2", paddingHorizontal: 8, paddingVertical: 5, borderRadius: 6 },
  deleteBtnText: { fontSize: 10, fontWeight: "700", color: "#EF4444" },

  // Assignment
  assignmentArea: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#E2E8F0" },
  assignmentLabel: { fontSize: 9, fontWeight: "700", color: "#94A3B8", letterSpacing: 0.5, marginBottom: 6 },
  assignmentControls: { flexDirection: "row", alignItems: "center" },
  pickerContainer: { flex: 1, height: 40, borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 8, marginRight: 8, justifyContent: "center", backgroundColor: "#FFF" },
  picker: { width: "100%", color: "#0F172A" },
  confirmBtn: { flexDirection: "row", alignItems: "center", backgroundColor: Theme.colors.primaryDark, height: 40, paddingHorizontal: 14, borderRadius: 8, justifyContent: "center" },
  confirmBtnText: { fontSize: 12, fontWeight: "700", color: "#FFF" },

  // Detail Modal
  detailOverlay: { flex: 1, backgroundColor: "rgba(15,23,42,0.5)", justifyContent: "center", alignItems: "center", padding: 20 },
  detailCard: { backgroundColor: "#FFF", borderRadius: 20, padding: 22, width: "100%", maxHeight: Dimensions.get('window').height * 0.85 },
  detailProfileSection: { alignItems: "center", marginBottom: 18, paddingBottom: 18, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  detailAvatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: Theme.colors.primaryDark, justifyContent: "center", alignItems: "center", marginBottom: 10 },
  detailAvatarText: { fontSize: 22, fontWeight: "800", color: "#FFF" },
  detailName: { fontSize: 20, fontWeight: "800", color: "#0F172A", textAlign: "center" },
  roleBadge: { backgroundColor: "#F0FDFA", paddingHorizontal: 14, paddingVertical: 4, borderRadius: 16, marginTop: 6, borderWidth: 1, borderColor: "#CCFBF1" },
  roleBadgeText: { fontSize: 11, fontWeight: "700", color: Theme.colors.primaryDark },
  detailInfoList: { marginBottom: 14 },
  detailInfoItem: { flexDirection: "row", alignItems: "center", backgroundColor: "#F8FAFC", padding: 12, borderRadius: 10, marginBottom: 6, borderWidth: 1, borderColor: "#E2E8F0" },
  detailInfoLabel: { fontSize: 9, fontWeight: "700", color: "#94A3B8", letterSpacing: 0.4, marginBottom: 1 },
  detailInfoValue: { fontSize: 14, fontWeight: "700", color: "#1E293B" },
  detailStatsRow: { flexDirection: "row", backgroundColor: "#F8FAFC", borderRadius: 10, marginBottom: 16, borderWidth: 1, borderColor: "#E2E8F0" },
  detailStatBox: { flex: 1, alignItems: "center", paddingVertical: 14 },
  detailStatNumber: { fontSize: 22, fontWeight: "800", color: "#0F172A", marginBottom: 2 },
  detailStatLabel: { fontSize: 10, fontWeight: "600", color: "#94A3B8" },
  detailSectionTitle: { fontSize: 11, fontWeight: "800", color: "#94A3B8", letterSpacing: 0.5, marginBottom: 10 },
  courseItem: { flexDirection: "row", backgroundColor: "#FFF", padding: 12, borderRadius: 10, marginBottom: 6, borderWidth: 1, borderColor: "#E2E8F0" },
  courseItemLeft: { width: 32, height: 32, borderRadius: 8, backgroundColor: "#F0FDFA", justifyContent: "center", alignItems: "center", marginRight: 10 },
  courseItemName: { fontSize: 13, fontWeight: "700", color: "#1E293B", marginBottom: 1 },
  courseItemCode: { fontSize: 11, fontWeight: "600", color: Theme.colors.primaryDark, marginBottom: 4 },
  courseItemTagsRow: { flexDirection: "row", flexWrap: "wrap" },
  courseTag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginRight: 4, marginBottom: 2 },
  courseTagText: { fontSize: 9, fontWeight: "700" },
  detailEmpty: { fontSize: 12, color: "#94A3B8", textAlign: "center", paddingVertical: 14 },
  detailCloseBtn: { marginTop: 14, backgroundColor: Theme.colors.primaryDark, borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  detailCloseBtnText: { fontSize: 13, fontWeight: "700", color: "#FFF" },
});