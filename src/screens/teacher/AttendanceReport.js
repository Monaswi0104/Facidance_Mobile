import React, { useState, useCallback } from "react";
import {
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity,
  ActivityIndicator, ScrollView, Modal, Dimensions, Alert, Platform
} from "react-native";
import { getTeacherCourses, getTeacherReports, getCourseStudents } from "../../api/teacherApi";
import { useFocusEffect } from "@react-navigation/native";
import DateTimePicker from "@react-native-community/datetimepicker";
import RNFS from "react-native-fs";
import Share from "react-native-share";

const { width } = Dimensions.get("window");

export default function AttendanceReport() {
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [data, setData] = useState([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isReportLoading, setIsReportLoading] = useState(false);
  const [showCourseInfo, setShowCourseInfo] = useState(false);
  const [reportGenerated, setReportGenerated] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const formatDate = (date) => {
    if (!date) return "dd-mm-yyyy";
    const d = new Date(date);
    return `${d.getDate().toString().padStart(2, '0')}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getFullYear()}`;
  };

  useFocusEffect(useCallback(() => {
    const load = async () => {
      try {
        setIsLoading(true);
        const result = await getTeacherCourses();
        const list = Array.isArray(result) ? result : [];
        setCourses(list);

      } catch (e) { console.log(e); }
      finally { setIsLoading(false); }
    };
    load();
  }, []));

  const loadReport = async (courseId) => {
    try {
      setIsReportLoading(true);
      const [reportData, studentData] = await Promise.all([
        getTeacherReports(
          courseId,
          startDate ? startDate.toISOString() : null,
          endDate ? endDate.toISOString() : null
        ),
        getCourseStudents(courseId)
      ]);

      const reportList = reportData?.students || reportData || [];
      const stuList = studentData?.students || studentData || [];
      
      const emailMap = {};
      stuList.forEach(s => {
        emailMap[s.id || s.userId] = s.user?.email || s.email || "—";
      });

      setData(reportList.map((s, i) => {
        const studentInfo = stuList.find(st => (st.id === s.studentId || st.userId === s.studentId)) || {};
        const attended = s.attendedSessions || s.attended || 0;
        const total = s.totalSessions || s.total || 0;
        const percent = total > 0 ? Math.round((attended / total) * 100) : 0;
        return {
          id: s.studentId || s.id || String(i),
          name: s.studentName || s.name || "Student",
          email: studentInfo.user?.email || studentInfo.email || emailMap[s.studentId || s.id] || "—",
          program: studentInfo.program?.name || "—",
          status: studentInfo.status || "active",
          joinedAt: studentInfo.joinedAt,
          faceRegistered: !!studentInfo.faceEmbedding,
          attended,
          total,
          percent
        };
      }));
      setReportGenerated(true);
    } catch (e) {
      console.log(e);
      setData([]);
    } finally {
      setIsReportLoading(false);
    }
  };

  const handleCourseSelect = (course) => {
    setSelectedCourse(course);
    setShowCourseInfo(false);
    setReportGenerated(false);
    setData([]);
  };

  const exportCSV = async () => {
    if (!data || data.length === 0) return Alert.alert("No Data", "No report data to export.");
    try {
      const header = "Student Name,Email,Total Sessions,Attended,Attendance %";
      const rows = data.map((s) => `"${s.name}","${s.email}",${s.total},${s.attended},"${s.percent}%"`);
      const csv = [header, ...rows].join("\n");
      const path = `${RNFS.DownloadDirectoryPath}/attendance_report_${Date.now()}.csv`;
      await RNFS.writeFile(path, csv, "utf8");
      await Share.open({
        url: Platform.OS === "android" ? `file://${path}` : path,
        type: "text/csv",
        title: "Export Attendance Report",
      });
    } catch (e) {
      if (e?.message !== "User did not share") Alert.alert("Export Failed", "Could not export CSV.");
    }
  };

  const totalSessions = data.length > 0 ? Math.max(...data.map(d => d.total)) : 0;
  const avgPercent = data.length > 0 ? Math.round(data.reduce((a, b) => a + b.percent, 0) / data.length) : 0;
  const below75 = data.filter(d => d.percent < 75).length;

  const getBarColor = (percent) => {
    if (percent >= 75) return "#10B981";
    if (percent >= 50) return "#F59E0B";
    return "#EF4444";
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.headerBadge, { backgroundColor: "#0F172A" }]}>
            <Text style={{ fontSize: 18 }}>📊</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Attendance Reports</Text>
            <Text style={styles.subtitle}>Generate insights, visualize attendance, and export detailed reports.</Text>
          </View>
        </View>

        {/* Configuration Card */}
        <View style={styles.configCard}>
          <View style={styles.configHeaderRow}>
            <Text style={styles.configTitle}>Report Configuration</Text>
            <Text style={styles.configMeta}>Showing data for <Text style={{fontWeight:"700", color:"#1E293B"}}>{selectedCourse ? selectedCourse.name : "..."}</Text></Text>
          </View>
          
          <View style={styles.dropdownsRow}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={styles.labelText}>COURSE *</Text>
              <TouchableOpacity style={styles.dropdown} onPress={() => setShowCourseInfo(true)} disabled={isLoading}>
                {isLoading ? (
                  <ActivityIndicator size="small" color="#4361EE" />
                ) : (
                  <>
                    <Text style={selectedCourse ? styles.dropdownText : styles.dropdownPlaceholder} numberOfLines={1}>
                      {selectedCourse ? `${selectedCourse.name} ${selectedCourse.code !== "—" ? `(${selectedCourse.code})` : ""}` : "Choose a course"}
                    </Text>
                    <Text style={styles.dropdownArrow}>⌄</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
            <View style={{ flex: 0.6, marginRight: 10 }}>
              <Text style={styles.labelText}>START DATE</Text>
              <TouchableOpacity style={[styles.dropdown, { backgroundColor: "#F8FAFC" }]} onPress={() => setShowStartPicker(true)}>
                <Text style={startDate ? styles.dropdownText : styles.dropdownPlaceholder}>{formatDate(startDate)}</Text>
              </TouchableOpacity>
            </View>
            <View style={{ flex: 0.6 }}>
              <Text style={styles.labelText}>END DATE</Text>
              <TouchableOpacity style={[styles.dropdown, { backgroundColor: "#F8FAFC" }]} onPress={() => setShowEndPicker(true)}>
                <Text style={endDate ? styles.dropdownText : styles.dropdownPlaceholder}>{formatDate(endDate)}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {showStartPicker && (
            <DateTimePicker
              value={startDate || new Date()}
              mode="date"
              display="default"
              onChange={(event, selectedDate) => {
                setShowStartPicker(Platform.OS === 'ios');
                if (selectedDate) setStartDate(selectedDate);
              }}
            />
          )}

          {showEndPicker && (
            <DateTimePicker
              value={endDate || new Date()}
              mode="date"
              display="default"
              minimumDate={startDate || undefined}
              onChange={(event, selectedDate) => {
                setShowEndPicker(Platform.OS === 'ios');
                if (selectedDate) setEndDate(selectedDate);
              }}
            />
          )}

          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.btnPrimary} onPress={() => { if(selectedCourse) loadReport(selectedCourse.id); }}>
              <Text style={styles.btnPrimaryText}>📄 Generate Report</Text>
            </TouchableOpacity>
            {reportGenerated && (
              <TouchableOpacity style={styles.btnStroke} onPress={exportCSV}>
                <Text style={styles.btnStrokeText}>📥 Export to CSV</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Generated Content */}
        {reportGenerated && (
          <>
            {/* Stats Grid */}
            <View style={styles.statsGrid}>
          <View style={[styles.statBox, { borderColor: "#E2E8F0" }]}>
            <Text style={styles.statLabel}>TOTAL STUDENTS</Text>
            <Text style={styles.statNumber}>{data.length}</Text>
          </View>
          <View style={[styles.statBox, { borderColor: "#DBEAFE", backgroundColor: "#F0F9FF" }]}>
            <Text style={[styles.statLabel, { color: "#4361EE" }]}>AVERAGE ATTENDANCE</Text>
            <Text style={[styles.statNumber, { color: "#4361EE" }]}>{avgPercent}%</Text>
          </View>
          <View style={[styles.statBox, { borderColor: "#FECDD3", backgroundColor: "#FFF1F2" }]}>
            <Text style={[styles.statLabel, { color: "#E11D48" }]}>STUDENTS BELOW 75%</Text>
            <Text style={[styles.statNumber, { color: "#E11D48" }]}>{below75}</Text>
          </View>
        </View>

        {/* Bar Chart (Visual Representation) */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Attendance by Student</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chartScroll}>
            <View style={styles.chartYAxis}>
              <Text style={styles.yAxisText}>100% -</Text>
              <Text style={styles.yAxisText}>75% -</Text>
              <Text style={styles.yAxisText}>50% -</Text>
              <Text style={styles.yAxisText}>25% -</Text>
              <Text style={styles.yAxisText}>0% -</Text>
            </View>
            <View style={styles.barsContainer}>
              {data.map((d, i) => (
                <View key={i} style={styles.barCol}>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { height: `${d.percent}%` }]} />
                  </View>
                  <Text style={styles.barLabel} numberOfLines={1}>{d.name.split(" ")[0]}</Text>
                </View>
              ))}
              {data.length === 0 && <Text style={styles.emptyText}>No data to display chart</Text>}
            </View>
          </ScrollView>
        </View>

        {/* Student Table */}
        <View style={styles.tableCard}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.tableHeaderText, { flex: 2 }]}>STUDENT NAME</Text>
            <Text style={[styles.tableHeaderText, { flex: 2.2 }]}>EMAIL</Text>
            <Text style={[styles.tableHeaderText, { flex: 1, textAlign: "center" }]}>TOTAL</Text>
            <Text style={[styles.tableHeaderText, { flex: 1.2, textAlign: "center" }]}>ATTENDED</Text>
            <Text style={[styles.tableHeaderText, { flex: 0.8, textAlign: "center" }]}>%</Text>
          </View>

          {isReportLoading ? (
            <ActivityIndicator size="large" color="#4361EE" style={{ marginVertical: 40 }} />
          ) : data.length === 0 ? (
            <Text style={[styles.emptyText, { paddingVertical: 20 }]}>No attendance data found.</Text>
          ) : (
            data.map((s, i) => (
              <TouchableOpacity key={s.id} style={[styles.tableRow, i < data.length - 1 && styles.tableBorder]} onPress={() => setSelectedStudent(s)}>
                <Text style={[styles.studentName, { flex: 2, paddingRight: 4 }]} numberOfLines={2}>{s.name}</Text>
                <Text style={[styles.studentEmail, { flex: 2.2, paddingRight: 4 }]} numberOfLines={2}>{s.email}</Text>
                <Text style={[styles.cellNum, { flex: 1 }]}>{s.total}</Text>
                <Text style={[styles.cellNum, { flex: 1.2 }]}>{s.attended}</Text>
                <View style={{ flex: 0.8, alignItems: "center" }}>
                  <View style={[styles.percentBadge, { borderColor: getBarColor(s.percent) + "30" }]}>
                     <Text style={[styles.percentText, { color: getBarColor(s.percent) }]}>{s.percent}%</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
        </>
        )}

      </ScrollView>

      {/* Course Modal */}
      <Modal visible={showCourseInfo} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
             <Text style={styles.modalTitle}>Select Course</Text>
             <ScrollView style={{maxHeight: 400}}>
               {courses.map(c => (
                 <TouchableOpacity key={c.id} style={styles.modalItem} onPress={() => handleCourseSelect(c)}>
                   <Text style={styles.modalItemText}>{c.name} {c.code !== "—" ? `(${c.code})` : ""}</Text>
                 </TouchableOpacity>
               ))}
             </ScrollView>
             <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowCourseInfo(false)}>
               <Text style={styles.modalCloseText}>Cancel</Text>
             </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Student Details Modal */}
      <Modal visible={!!selectedStudent} transparent animationType="fade">
        <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              {selectedStudent && (
                <>
                  <View style={styles.modalHeaderInfoSection}>
                    <View style={styles.modalAvatar}>
                      <Text style={styles.modalAvatarText}>{selectedStudent.name.charAt(0)}</Text>
                    </View>
                    <View style={styles.modalHeaderInfo}>
                      <Text style={styles.modalName}>{selectedStudent.name}</Text>
                      <Text style={styles.modalEmail}>{selectedStudent.email}</Text>
                    </View>
                  </View>

                  <View style={styles.modalDetailRow}>
                    <Text style={styles.modalDetailLabel}>Program:</Text>
                    <Text style={styles.modalDetailValue}>{selectedStudent.program}</Text>
                  </View>

                  <View style={styles.modalDetailRow}>
                    <Text style={styles.modalDetailLabel}>Status:</Text>
                    <Text style={[styles.modalDetailValue, { color: selectedStudent.status === "graduated" ? "#10B981" : "#4361EE" }]}>
                       {selectedStudent.status.toUpperCase()}
                    </Text>
                  </View>

                  <View style={styles.modalDetailRow}>
                    <Text style={styles.modalDetailLabel}>Joined Date:</Text>
                    <Text style={styles.modalDetailValue}>
                      {selectedStudent.joinedAt ? new Date(selectedStudent.joinedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : "—"}
                    </Text>
                  </View>

                  <View style={styles.modalDetailRow}>
                    <Text style={styles.modalDetailLabel}>Face Registered:</Text>
                    <Text style={styles.modalDetailValue}>{selectedStudent.faceRegistered ? "Yes ✅" : "No ❌"}</Text>
                  </View>

                  <View style={styles.modalDetailRow}>
                    <Text style={styles.modalDetailLabel}>Attendance:</Text>
                    <Text style={styles.modalDetailValue}>{selectedStudent.attended}/{selectedStudent.total} Sessions ({selectedStudent.percent}%)</Text>
                  </View>

                  <TouchableOpacity style={styles.modalDetailCloseBtn} onPress={() => setSelectedStudent(null)}>
                    <Text style={styles.modalDetailCloseBtnText}>Close</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F8FAFC" },
  container: { padding: 20, paddingBottom: 40 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 20, marginTop: 8 },
  headerBadge: { width: 40, height: 40, borderRadius: 12, justifyContent: "center", alignItems: "center", marginRight: 14 },
  title: { fontSize: 22, fontWeight: "800", color: "#0F172A" },
  subtitle: { fontSize: 13, color: "#64748B", marginTop: 2 },

  configCard: { backgroundColor: "#FFF", borderRadius: 14, padding: 18, marginBottom: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 6, elevation: 1, borderWidth: 1, borderColor: "#E2E8F0" },
  configHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  configTitle: { fontSize: 16, fontWeight: "700", color: "#1E293B" },
  configMeta: { fontSize: 11, color: "#64748B" },

  labelText: { fontSize: 10, fontWeight: "700", color: "#64748B", letterSpacing: 0.5, marginBottom: 6 },
  dropdownsRow: { flexDirection: "row", marginBottom: 18 },
  dropdown: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#FFF", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: "#E2E8F0" },
  dropdownPlaceholder: { fontSize: 12, color: "#94A3B8" },
  dropdownText: { fontSize: 13, color: "#1E293B", flex: 1, fontWeight: "500" },
  dropdownArrow: { color: "#94A3B8", fontSize: 16, paddingBottom: 4 },

  actionsRow: { flexDirection: "row" },
  btnPrimary: { flexDirection: "row", backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#E2E8F0", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, marginRight: 10, alignItems: "center" },
  btnPrimaryText: { color: "#1E293B", fontSize: 13, fontWeight: "700" },
  btnStroke: { flexDirection: "row", backgroundColor: "#F0FDF4", borderWidth: 1, borderColor: "#DCFCE7", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, alignItems: "center" },
  btnStrokeText: { color: "#16A34A", fontSize: 13, fontWeight: "700" },

  statsGrid: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16 },
  statBox: { flex: 1, backgroundColor: "#FFF", borderWidth: 1, borderRadius: 12, padding: 14, marginHorizontal: 4 },
  statLabel: { fontSize: 9, fontWeight: "800", color: "#64748B", marginBottom: 4, letterSpacing: 0.5 },
  statNumber: { fontSize: 20, fontWeight: "800", color: "#1E293B" },

  chartCard: { backgroundColor: "#FFF", borderRadius: 14, padding: 18, marginBottom: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 6, elevation: 1, borderWidth: 1, borderColor: "#E2E8F0" },
  chartTitle: { fontSize: 15, fontWeight: "700", color: "#1E293B", marginBottom: 16 },
  chartScroll: { flexDirection: "row", paddingBottom: 10 },
  chartYAxis: { justifyContent: "space-between", paddingRight: 10, height: 150, paddingBottom: 20 },
  yAxisText: { fontSize: 10, color: "#94A3B8" },
  barsContainer: { flexDirection: "row", height: 150, alignItems: "flex-end" },
  barCol: { width: 40, alignItems: "center", marginRight: 10 },
  barTrack: { width: 30, height: 130, justifyContent: "flex-end" },
  barFill: { width: 30, backgroundColor: "#0F172A", borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  barLabel: { fontSize: 9, color: "#64748B", marginTop: 6, transform: [{ rotate: "-30deg" }] },

  tableCard: { backgroundColor: "#FFF", borderRadius: 14, padding: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 6, elevation: 1, borderWidth: 1, borderColor: "#E2E8F0", marginBottom: 20 },
  tableHeaderRow: { flexDirection: "row", paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: "#F1F5F9", marginBottom: 4 },
  tableHeaderText: { fontSize: 9, fontWeight: "800", color: "#94A3B8", letterSpacing: 0.5 },
  tableRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12 },
  tableBorder: { borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  studentName: { fontSize: 12, fontWeight: "700", color: "#1E293B" },
  studentEmail: { fontSize: 10, color: "#64748B" },
  cellNum: { fontSize: 12, color: "#475569", textAlign: "center", fontWeight: "600" },
  percentBadge: { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 12, borderWidth: 1, alignSelf: "center" },
  percentText: { fontSize: 10, fontWeight: "800" },
  emptyText: { fontSize: 13, color: "#94A3B8", textAlign: "center" },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 20 },
  modalContent: { backgroundColor: "#FFF", borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#1E293B", marginBottom: 16 },
  modalItem: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  modalItemText: { fontSize: 15, color: "#334155" },
  modalCloseBtn: { marginTop: 20, backgroundColor: "#F1F5F9", padding: 14, borderRadius: 12, alignItems: "center" },
  modalCloseText: { fontSize: 15, fontWeight: "600", color: "#64748B" },

  // Student Details Modal Styles
  modalCard: { backgroundColor: "#FFF", borderRadius: 20, padding: 24, width: "100%", shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 5 },
  modalHeaderInfoSection: { flexDirection: "row", alignItems: "center", marginBottom: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  modalAvatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: "#EEF2FF", justifyContent: "center", alignItems: "center", marginRight: 14 },
  modalAvatarText: { fontSize: 20, fontWeight: "800", color: "#4361EE" },
  modalHeaderInfo: { flex: 1 },
  modalName: { fontSize: 18, fontWeight: "800", color: "#1E293B", marginBottom: 4 },
  modalEmail: { fontSize: 13, color: "#64748B" },
  modalDetailRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
  modalDetailLabel: { fontSize: 13, fontWeight: "600", color: "#94A3B8", flex: 0.4 },
  modalDetailValue: { fontSize: 14, fontWeight: "700", color: "#1E293B", flex: 0.6, textAlign: "right" },
  modalDetailCloseBtn: { backgroundColor: "#F1F5F9", paddingVertical: 14, borderRadius: 12, alignItems: "center", marginTop: 10 },
  modalDetailCloseBtnText: { fontSize: 15, fontWeight: "700", color: "#475569" },
});