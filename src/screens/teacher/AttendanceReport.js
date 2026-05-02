import React, {  useState, useCallback , useMemo } from "react";
import {
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity,
  ActivityIndicator, ScrollView, Modal, Dimensions, Alert, Platform, Linking
} from "react-native";
import { getTeacherCourses, getTeacherReports, getCourseStudents } from "../../api/teacherApi";
import { useFocusEffect } from "@react-navigation/native";
import { Theme, useTheme } from "../../theme/Theme";
import { BarChart2, ChevronDown, Calendar, FileText, Download, Users, TrendingUp, TrendingDown, User, CheckCircle, XCircle, Mail } from "lucide-react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import RNFS from "react-native-fs";
import Share from "react-native-share";

const { width } = Dimensions.get("window");

export default function AttendanceReport() {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
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
    if (!date) return "dd/mm/yyyy";
    const d = new Date(date);
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
  };

  useFocusEffect(useCallback(() => {
    const load = async () => {
      try {
        setIsLoading(true);
        const result = await getTeacherCourses();
        const list = Array.isArray(result) ? result : (result?.courses || []);
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
        getCourseStudents(courseId).catch(() => []),
      ]);

      // The report API returns [{studentName, studentEmail, totalSessions, attended, percentage}]
      const reportList = Array.isArray(reportData) ? reportData : (reportData?.students || []);
      // Student details for enriching with program, face, joined date
      const stuList = Array.isArray(studentData) ? studentData : (studentData?.students || studentData || []);

      // Build email lookup from enrolled students
      const emailLookup = {};
      stuList.forEach(s => {
        const email = (s.user?.email || s.email || "").toLowerCase();
        if (email) emailLookup[email] = s;
      });

      const parsed = reportList.map((s, i) => {
        const attended = s.attended || s.attendedSessions || 0;
        const total = s.totalSessions || s.total || 0;
        const percent = s.percentage ?? (total > 0 ? Math.round((attended / total) * 100) : 0);
        const email = s.studentEmail || s.email || "—";
        // Cross-reference by email to get program, face data, etc.
        const enrolled = emailLookup[email.toLowerCase()] || {};
        return {
          id: s.studentId || s.id || String(i),
          name: s.studentName || s.name || "Student",
          email,
          program: enrolled.program?.name || enrolled.program_name || s.program || "—",
          status: enrolled.status || s.status || "active",
          joinedAt: enrolled.joinedAt || enrolled.joined_at || enrolled.createdAt || enrolled.created_at || s.joinedAt,
          faceRegistered: !!(enrolled.faceEmbedding || enrolled.face_embedding) || s.faceRegistered || false,
          attended,
          total,
          percent,
        };
      });
      // Sort by attendance rate descending (matching website: "Sorted by attendance rate")
      parsed.sort((a, b) => b.percent - a.percent);
      setData(parsed);
      setReportGenerated(true);
    } catch (e) {
      console.log("[AttendanceReport] Error:", e);
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
  const avgPercent = data.length > 0 ? (data.reduce((a, b) => a + b.percent, 0) / data.length).toFixed(1) : 0;
  const below75 = data.filter(d => d.percent < 75).length;

  const getBarColor = (percent) => {
    if (percent >= 75) return "#10B981";
    if (percent >= 50) return "#F59E0B";
    return "#EF4444";
  };

  const sendEmail = (student) => {
    const courseName = selectedCourse?.name || "your course";
    const subject = `Attendance Alert - ${courseName}`;
    const body = `Dear ${student.name},\n\nYour attendance in ${courseName} is currently at ${student.percent}% (${student.attended}/${student.total} sessions), which is below the required 75% threshold.\n\nPlease ensure regular attendance to avoid academic consequences.\n\nRegards`;
    const url = `mailto:${student.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    Linking.openURL(url).catch(() => Alert.alert("Error", "Could not open email client."));
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Attendance Reports</Text>
          <Text style={styles.subtitle}>Generate insights, visualize attendance data, and export detailed reports.</Text>
        </View>

        {/* Configuration Card */}
        <View style={styles.configCard}>
          <Text style={styles.configTitle}>Report Configuration</Text>
          <Text style={styles.configMeta}>{selectedCourse ? `Showing data for ${selectedCourse.name}` : "Select a course and optional date range"}</Text>

          <Text style={styles.labelText}>COURSE *</Text>
          <TouchableOpacity style={styles.dropdown} onPress={() => setShowCourseInfo(true)} disabled={isLoading}>
            {isLoading ? (
              <ActivityIndicator size="small" color={colors.accent} />
            ) : (
              <>
                <Text style={selectedCourse ? styles.dropdownText : styles.dropdownPlaceholder} numberOfLines={1}>
                  {selectedCourse ? `${selectedCourse.name} ${selectedCourse.code !== "—" ? `(${selectedCourse.code})` : ""}` : "Choose a course..."}
                </Text>
                <ChevronDown size={16} color={colors.mutedForeground} />
              </>
            )}
          </TouchableOpacity>

          <View style={styles.dateRow}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={styles.labelText}>START DATE (OPTIONAL)</Text>
              <TouchableOpacity style={styles.dateBtn} onPress={() => setShowStartPicker(true)}>
                <Text style={startDate ? styles.dateBtnText : styles.dateBtnPlaceholder}>{formatDate(startDate)}</Text>
                <Calendar size={14} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.labelText}>END DATE (OPTIONAL)</Text>
              <TouchableOpacity style={styles.dateBtn} onPress={() => setShowEndPicker(true)}>
                <Text style={endDate ? styles.dateBtnText : styles.dateBtnPlaceholder}>{formatDate(endDate)}</Text>
                <Calendar size={14} color={colors.mutedForeground} />
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
            <TouchableOpacity
              style={[styles.btnPrimary, !selectedCourse && { opacity: 0.4 }]}
              disabled={!selectedCourse || isReportLoading}
              onPress={() => { if (selectedCourse) loadReport(selectedCourse.id); }}>
              {isReportLoading ? (
                <ActivityIndicator size="small" color={colors.primaryForeground} />
              ) : (
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <FileText size={14} color={colors.primaryForeground} style={{ marginRight: 6 }} />
                  <Text style={styles.btnPrimaryText}>Generate Report</Text>
                </View>
              )}
            </TouchableOpacity>
            {reportGenerated && (
              <TouchableOpacity style={styles.btnStroke} onPress={exportCSV}>
                <Download size={14} color={colors.textBody} style={{ marginRight: 6 }} />
                <Text style={styles.btnStrokeText}>Export CSV</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Generated Content */}
        {reportGenerated && (
          <>
            {/* Stats Row */}
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <View style={styles.statTopRow}>
                  <Text style={styles.statLabel}>TOTAL{"\n"}STUDENTS</Text>
                  <View style={styles.statIconBg}><Users size={16} color={colors.primaryForeground} /></View>
                </View>
                <Text style={styles.statNumber}>{data.length}</Text>
              </View>
              <View style={styles.statCard}>
                <View style={styles.statTopRow}>
                  <Text style={styles.statLabel}>AVERAGE{"\n"}ATTENDANCE</Text>
                  <View style={styles.statIconBg}><TrendingUp size={16} color={colors.primaryForeground} /></View>
                </View>
                <Text style={[styles.statNumber, { color: colors.accent }]}>{avgPercent}%</Text>
              </View>
              <View style={styles.statCard}>
                <View style={styles.statTopRow}>
                  <Text style={styles.statLabel}>BELOW 75%</Text>
                  <View style={styles.statIconBg}><TrendingDown size={16} color={colors.primaryForeground} /></View>
                </View>
                <Text style={[styles.statNumber, { color: colors.destructive }]}>{below75}</Text>
              </View>
            </View>

            {/* Bar Chart */}
            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>Attendance by Student</Text>
              <Text style={styles.chartSubtitle}>Individual percentage breakdown</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chartScroll}>
                <View style={styles.chartYAxis}>
                  <Text style={styles.yAxisText}>100%</Text>
                  <Text style={styles.yAxisText}>75%</Text>
                  <Text style={styles.yAxisText}>50%</Text>
                  <Text style={styles.yAxisText}>25%</Text>
                  <Text style={styles.yAxisText}>0%</Text>
                </View>
                <View style={styles.barsContainer}>
                  {data.map((d, i) => (
                    <View key={i} style={styles.barCol}>
                      <View style={styles.barTrack}>
                        <View style={[styles.barFill, { height: `${d.percent}%`, backgroundColor: getBarColor(d.percent) }]} />
                      </View>
                      <Text style={styles.barLabel} numberOfLines={1}>{d.name.split(" ")[0]}</Text>
                    </View>
                  ))}
                  {data.length === 0 && <Text style={styles.emptyText}>No data</Text>}
                </View>
              </ScrollView>
            </View>

            {/* Distribution Card */}
            <View style={styles.distCard}>
              <Text style={styles.chartTitle}>Distribution</Text>
              <Text style={styles.chartSubtitle}>Attendance rate segments</Text>
              {[
                { label: "≥ 75%", count: data.filter(d => d.percent >= 75).length, color: "#10B981" },
                { label: "50–74%", count: data.filter(d => d.percent >= 50 && d.percent < 75).length, color: "#F59E0B" },
                { label: "< 50%", count: data.filter(d => d.percent < 50).length, color: colors.destructive },
              ].map((seg, i) => (
                <View key={i} style={styles.distRow}>
                  <View style={[styles.distDot, { backgroundColor: seg.color }]} />
                  <Text style={styles.distLabel}>{seg.label}</Text>
                  <Text style={styles.distCount}>{seg.count}</Text>
                </View>
              ))}
            </View>

            {/* Student Report Table */}
            <View style={styles.tableCard}>
              <View style={styles.tableTopRow}>
                <View>
                  <Text style={styles.tableTitle}>Student Report</Text>
                  <Text style={styles.tableSubtitle}>{data.length} student{data.length !== 1 ? "s" : ""}</Text>
                </View>
                <Text style={styles.sortedText}>Sorted by attendance rate</Text>
              </View>

              <View style={styles.tableHeaderRow}>
                <Text style={[styles.tableHeaderText, { flex: 2 }]}>STUDENT</Text>
                <Text style={[styles.tableHeaderText, { flex: 0.75, textAlign: "center" }]}>TOTAL</Text>
                <Text style={[styles.tableHeaderText, { flex: 0.75, textAlign: "center" }]}>ATTEND.</Text>
                <Text style={[styles.tableHeaderText, { flex: 1.3, textAlign: "right" }]}>ATTENDANCE %</Text>
                <Text style={[styles.tableHeaderText, { flex: 0.5, textAlign: "center" }]}></Text>
              </View>

              {isReportLoading ? (
                <ActivityIndicator size="large" color={colors.accent} style={{ marginVertical: 40 }} />
              ) : data.length === 0 ? (
                <Text style={[styles.emptyText, { paddingVertical: 20 }]}>No attendance data found.</Text>
              ) : (
                data.map((s, i) => (
                  <TouchableOpacity key={s.id} style={[styles.tableRow, i < data.length - 1 && styles.tableBorder]} onPress={() => setSelectedStudent(s)}>
                    <View style={{ flex: 2, paddingRight: 6 }}>
                      <Text style={styles.studentName} numberOfLines={2}>{s.name}</Text>
                      <Text style={styles.studentEmail} numberOfLines={1}>{s.email}</Text>
                    </View>
                    <Text style={[styles.cellNum, { flex: 0.75 }]}>{s.total}</Text>
                    <Text style={[styles.cellNum, { flex: 0.75 }]}>{s.attended}</Text>
                    <View style={{ flex: 1.3, flexDirection: "row", alignItems: "center", justifyContent: "flex-end" }}>
                      <View style={styles.attendBarTrack}>
                        <View style={[styles.attendBarFill, { width: `${s.percent}%`, backgroundColor: getBarColor(s.percent) }]} />
                      </View>
                      <Text style={[styles.percentText, { color: getBarColor(s.percent) }]}>{s.percent}%</Text>
                    </View>
                    <View style={{ flex: 0.5, alignItems: "flex-end", paddingLeft: 4 }}>
                      {s.email && s.email !== "—" && (
                        <TouchableOpacity
                          style={styles.reportEmailBtn}
                          onPress={(e) => { e.stopPropagation?.(); sendEmail(s); }}
                          activeOpacity={0.6}
                        >
                          <Mail size={13} color={colors.mutedForeground} />
                        </TouchableOpacity>
                      )}
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
            <ScrollView style={{ maxHeight: 400 }}>
              {courses.map(c => {
                const isSelected = selectedCourse?.id === c.id;
                return (
                  <TouchableOpacity key={c.id} style={[styles.modalItem, isSelected && styles.modalItemSelected]} onPress={() => handleCourseSelect(c)}>
                    <Text style={[styles.modalItemText, isSelected && { color: colors.primaryDark, fontWeight: "700" }]}>{c.name} {c.code !== "—" ? `(${c.code})` : ""}</Text>
                    {isSelected && <CheckCircle size={18} color={colors.primaryDark} />}
                  </TouchableOpacity>
                );
              })}
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
          <View style={styles.modalDetailCard}>
            {selectedStudent && (
              <>
                <View style={styles.modalHeaderInfoSection}>
                  <View style={styles.modalAvatar}>
                    <User size={22} color={colors.primaryDark} />
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
                  <Text style={[styles.modalDetailValue, { color: selectedStudent.status === "graduated" ? "#10B981" : colors.accent }]}>
                    {(selectedStudent.status || "active").toUpperCase()}
                  </Text>
                </View>

                <View style={styles.modalDetailRow}>
                  <Text style={styles.modalDetailLabel}>Face Data:</Text>
                  <View style={{ flex: 0.6, flexDirection: "row", justifyContent: "flex-end", alignItems: "center" }}>
                    {selectedStudent.faceRegistered ? (
                      <>
                        <CheckCircle size={14} color="#10B981" style={{ marginRight: 4 }} />
                        <Text style={[styles.modalDetailValue, { color: "#10B981", flex: 0 }]}>Registered</Text>
                      </>
                    ) : (
                      <>
                        <XCircle size={14} color="#EF4444" style={{ marginRight: 4 }} />
                        <Text style={[styles.modalDetailValue, { color: colors.destructive, flex: 0 }]}>Not Registered</Text>
                      </>
                    )}
                  </View>
                </View>

                <View style={styles.modalDetailRow}>
                  <Text style={styles.modalDetailLabel}>Attendance:</Text>
                  <Text style={styles.modalDetailValue}>{selectedStudent.attended}/{selectedStudent.total} ({selectedStudent.percent}%)</Text>
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

const createStyles = (colors) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.secondary },
  container: { padding: 20, paddingBottom: 40 },

  // Header
  header: { marginBottom: 18, marginTop: 8 },
  title: { fontSize: 24, fontWeight: "800", color: colors.foreground },
  subtitle: { fontSize: 13, color: colors.mutedForeground, marginTop: 3 },

  // Config Card
  configCard: { backgroundColor: colors.background, borderRadius: 14, padding: 18, marginBottom: 18, shadowColor: colors.foreground, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 6, elevation: 1, borderWidth: 1, borderColor: colors.border },
  configTitle: { fontSize: 16, fontWeight: "800", color: colors.foreground, marginBottom: 2 },
  configMeta: { fontSize: 12, color: colors.mutedForeground, marginBottom: 16 },

  labelText: { fontSize: 10, fontWeight: "700", color: colors.mutedForeground, letterSpacing: 0.5, marginBottom: 6, marginTop: 4 },
  dropdown: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: colors.background, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: colors.border, marginBottom: 14 },
  dropdownPlaceholder: { fontSize: 13, color: colors.mutedForeground, flex: 1 },
  dropdownText: { fontSize: 13, color: colors.foreground, flex: 1, fontWeight: "500" },

  // Date pickers
  dateRow: { flexDirection: "row", marginBottom: 6 },
  dateBtn: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: colors.background, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: colors.border },
  dateBtnText: { fontSize: 13, color: colors.foreground },
  dateBtnPlaceholder: { fontSize: 13, color: colors.mutedForeground },

  // Actions
  actionsRow: { flexDirection: "row", marginTop: 10 },
  btnPrimary: { flexDirection: "row", backgroundColor: colors.primaryDark, paddingHorizontal: 18, paddingVertical: 11, borderRadius: 10, marginRight: 10, alignItems: "center" },
  btnPrimaryText: { color: colors.primaryForeground, fontSize: 13, fontWeight: "700" },
  btnStroke: { flexDirection: "row", backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, alignItems: "center" },
  btnStrokeText: { color: colors.textBody, fontSize: 13, fontWeight: "600" },

  // Stats
  statsRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16 },
  statCard: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 14,
    padding: 14,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.foreground,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  statLabel: { fontSize: 8, fontWeight: "700", color: colors.mutedForeground, letterSpacing: 0.5, flex: 1, marginRight: 6 },
  statTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 },
  statNumber: { fontSize: 22, fontWeight: "800", color: colors.foreground },
  statIconBg: { width: 32, height: 32, borderRadius: 8, backgroundColor: colors.primaryDark, justifyContent: "center", alignItems: "center" },

  // Chart
  chartCard: { backgroundColor: colors.background, borderRadius: 14, padding: 18, marginBottom: 16, shadowColor: colors.foreground, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 6, elevation: 1, borderWidth: 1, borderColor: colors.border },
  chartTitle: { fontSize: 16, fontWeight: "800", color: colors.foreground },
  chartSubtitle: { fontSize: 12, color: colors.mutedForeground, marginTop: 2, marginBottom: 16 },
  chartScroll: { flexDirection: "row", paddingBottom: 10 },
  chartYAxis: { justifyContent: "space-between", paddingRight: 10, height: 150, paddingBottom: 20 },
  yAxisText: { fontSize: 10, color: colors.mutedForeground },
  barsContainer: { flexDirection: "row", height: 150, alignItems: "flex-end" },
  barCol: { width: 40, alignItems: "center", marginRight: 10 },
  barTrack: { width: 28, height: 130, justifyContent: "flex-end", backgroundColor: colors.secondary, borderRadius: 4 },
  barFill: { width: 28, borderRadius: 4 },
  barLabel: { fontSize: 9, color: colors.mutedForeground, marginTop: 6 },

  // Distribution
  distCard: { backgroundColor: colors.background, borderRadius: 14, padding: 18, marginBottom: 16, shadowColor: colors.foreground, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 6, elevation: 1, borderWidth: 1, borderColor: colors.border },
  distRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.muted },
  distDot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  distLabel: { flex: 1, fontSize: 13, color: colors.textBody },
  distCount: { fontSize: 14, fontWeight: "700", color: colors.foreground },

  // Table
  tableCard: { backgroundColor: colors.background, borderRadius: 14, padding: 16, shadowColor: colors.foreground, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 6, elevation: 1, borderWidth: 1, borderColor: colors.border, marginBottom: 20 },
  tableTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 },
  tableTitle: { fontSize: 18, fontWeight: "800", color: colors.foreground },
  tableSubtitle: { fontSize: 12, color: colors.mutedForeground, marginTop: 2 },
  sortedText: { fontSize: 11, color: colors.mutedForeground, fontStyle: "italic" },
  tableHeaderRow: { flexDirection: "row", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.muted },
  tableHeaderText: { fontSize: 9, fontWeight: "700", color: colors.mutedForeground, letterSpacing: 0.5 },
  tableRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12 },
  tableBorder: { borderBottomWidth: 1, borderBottomColor: colors.muted },
  studentName: { fontSize: 12, fontWeight: "700", color: colors.foreground, marginBottom: 1 },
  studentEmail: { fontSize: 10, color: colors.mutedForeground },
  cellNum: { fontSize: 13, color: colors.textBody, textAlign: "center", fontWeight: "600" },
  attendBarTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: colors.muted, overflow: "hidden", marginRight: 8 },
  attendBarFill: { height: "100%", borderRadius: 3 },
  percentText: { fontSize: 11, fontWeight: "800", minWidth: 38, textAlign: "right" },
  reportEmailBtn: {
    width: 28, height: 28, borderRadius: 7,
    backgroundColor: colors.secondary, borderWidth: 1, borderColor: colors.border,
    justifyContent: "center", alignItems: "center",
  },
  emptyText: { fontSize: 13, color: colors.mutedForeground, textAlign: "center" },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 20 },
  modalContent: { backgroundColor: colors.background, borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: "700", color: colors.foreground, marginBottom: 16 },
  modalItem: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.muted },
  modalItemSelected: { backgroundColor: colors.accentLight, marginHorizontal: -8, paddingHorizontal: 8, borderRadius: 8 },
  modalItemText: { fontSize: 15, color: colors.textSoft },
  modalCloseBtn: { marginTop: 20, backgroundColor: colors.muted, padding: 14, borderRadius: 12, alignItems: "center" },
  modalCloseText: { fontSize: 15, fontWeight: "600", color: colors.mutedForeground },

  // Student Details Modal
  modalDetailCard: { backgroundColor: colors.background, borderRadius: 20, padding: 24, width: "100%", shadowColor: colors.foreground, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 5 },
  modalHeaderInfoSection: { flexDirection: "row", alignItems: "center", marginBottom: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.muted },
  modalAvatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: colors.accentLight, justifyContent: "center", alignItems: "center", marginRight: 14 },
  modalHeaderInfo: { flex: 1 },
  modalName: { fontSize: 18, fontWeight: "800", color: colors.foreground, marginBottom: 4 },
  modalEmail: { fontSize: 13, color: colors.mutedForeground },
  modalDetailRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
  modalDetailLabel: { fontSize: 13, fontWeight: "600", color: colors.mutedForeground, flex: 0.4 },
  modalDetailValue: { fontSize: 14, fontWeight: "700", color: colors.foreground, flex: 0.6, textAlign: "right" },
  modalDetailCloseBtn: { backgroundColor: colors.muted, paddingVertical: 14, borderRadius: 12, alignItems: "center", marginTop: 10 },
  modalDetailCloseBtnText: { fontSize: 15, fontWeight: "700", color: colors.textBody },
});