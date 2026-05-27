/**
 * AttendanceSession.js
 *
 * Matches the website (frontend/app/teacher/attendance/batches/page.tsx) exactly:
 * - Live camera feed running continuously
 * - On "Start 45-Min Session": first capture immediately, then every 2 minutes
 * - Each capture takes 5 frames with 300ms gaps and sends them all for recognition
 * - Recognition results are cumulative (once detected, stays marked present)
 * - Submit sends { course_id, recognition_results: { recognizedStudents }, date }
 * - Attendance history uses /teacher/attendance/history?course_id=...
 */

import React, {  useState, useRef, useEffect , useMemo } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  ScrollView, ActivityIndicator, Dimensions, Alert, Modal,
  Platform, Animated
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Theme, useTheme } from "../../theme/Theme";
import {
  getAttendanceStudents, recognizeFaces,
  submitSessionAttendance, getCourseAttendance,
  getActiveSession, updateManualMark
} from "../../api/teacherApi";
import {
  Users, ScanFace, Play, Pause, Square, Send,
  Clock, CheckCircle, Info, History, Zap, ChevronLeft,
  Globe, RefreshCw, UserPlus, XCircle
} from "lucide-react-native";
import { TableSkeleton } from "../../components/SkeletonLoader";
import haptic from "../../utils/haptics";

const SESSION_DURATION = 45 * 60 * 1000; // 45 min in ms (website uses ms)

export default function AttendanceSession({ route, navigation }) {
  const { colors} = useTheme();
  const s = useMemo(() => createStyles(colors), [colors]);
  const { course, studentCount, trainedCount, notTrainedCount } = route.params;

  // Students (loaded from attendance API, like the website)
  const [students, setStudents] = useState([]);

  // Session state (mirrors website state variables)
  const [sessionActive, setSessionActive] = useState(false);
  const [sessionPaused, setSessionPaused] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(SESSION_DURATION);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Recognition state (matches website exactly)
  const [allRecognizedStudents, setAllRecognizedStudents] = useState(new Set());
  const [sessionRecognitions, setSessionRecognitions] = useState([]);
  const [currentRecognition, setCurrentRecognition] = useState(null);

  // Manual marking state
  const [manuallyMarked, setManuallyMarked] = useState<Set<string>>(new Set());
  const [showSessionSummary, setShowSessionSummary] = useState(false);
  const [summarySubmitted, setSummarySubmitted] = useState(false);

  // History
  const [showHistory, setShowHistory] = useState(false);
  const [attendanceHistory, setAttendanceHistory] = useState({});
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Today's session sync (detects attendance submitted from website)
  const [todaySession, setTodaySession] = useState<{ present: number; absent: number; total: number; students: string[]; rate: string } | null>(null);
  const syncIntervalRef = useRef<any>(null);

  // Live session polling ref
  const livePollingRef = useRef<any>(null);

  // Refs
  const sessionTimerRef = useRef(null);
  const countdownIntervalRef = useRef(null);
  const sessionPausedRef = useRef(false);

  useEffect(() => { sessionPausedRef.current = sessionPaused; }, [sessionPaused]);

  // Load students on mount
  useEffect(() => {
    (async () => {

      // Load students with face data status (like website's fetchStudents)
      try {
        const data = await getAttendanceStudents(course.id);
        const list = Array.isArray(data) ? data : ((data as any)?.students || []);
        setStudents(list.map((s) => ({
          id: s.id,
          name: s.name || s.user?.name || "Student",
          email: s.email || s.user?.email || "",
          hasFaceData: s.has_face_data || s.hasFaceData || false,
        })));
      } catch (e: any) { console.log("Failed to load students:", e); }
      // Load history
      fetchAttendanceHistory(course.id);
    })();
  }, [course.id]);

  // Poll for today's session every 30s (detect website-submitted attendance)
  useEffect(() => {
    checkTodaySession();
    syncIntervalRef.current = setInterval(() => checkTodaySession(), 30000);
    return () => { if (syncIntervalRef.current) clearInterval(syncIntervalRef.current); };
  }, [course.id, students]);

  function checkTodaySession() {
    const todayKey = new Date().toISOString().slice(0, 10);
    const todayRecords = attendanceHistory[todayKey] || [];
    if (todayRecords.length > 0 && !sessionActive) {
      const presentCount = todayRecords.filter((r: any) => r.status === "PRESENT" || r.status === true).length;
      const presentNames = todayRecords
        .filter((r: any) => r.status === "PRESENT" || r.status === true)
        .map((r: any) => r.studentName || "Student");
      setTodaySession({
        present: presentCount,
        absent: todayRecords.length - presentCount,
        total: todayRecords.length,
        students: presentNames,
        rate: todayRecords.length > 0 ? ((presentCount / todayRecords.length) * 100).toFixed(1) : "0.0",
      });
    } else {
      setTodaySession(null);
    }
  }

  // Re-check when history updates
  useEffect(() => { checkTodaySession(); }, [attendanceHistory, sessionActive]);

  // Cleanup on unmount
  useEffect(() => {
    return () => cleanup();
  }, []);

  // Countdown timer (matches website: calculates from sessionStartTime)
  useEffect(() => {
    if (sessionActive && !sessionPaused && sessionStartTime) {
      countdownIntervalRef.current = setInterval(() => {
        const remaining = Math.max(0, SESSION_DURATION - (Date.now() - sessionStartTime));
        setTimeRemaining(remaining);
        if (remaining === 0) endSession();
      }, 1000);
      return () => { if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current); };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionActive, sessionPaused, sessionStartTime]);

  function cleanup() {
    if (sessionTimerRef.current) clearTimeout(sessionTimerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
    if (livePollingRef.current) clearInterval(livePollingRef.current);
  }

  // ─── Live session sync: poll backend every 3s ───
  useEffect(() => {
    async function pollActiveSession() {
      try {
        const data = await getActiveSession(course.id);
        if (data && data.active !== false && data.status !== "ended") {
          // Automatically start local session if website started it
          const backendStartTime = data.start_time || Date.now();

          if (!sessionActive) {
            setSessionActive(true);
            setSessionStartTime(backendStartTime);
          } else if (sessionStartTime !== backendStartTime) {
            // Re-sync timer if it differs at all, since backendStartTime is now an absolute timestamp
            setSessionStartTime(backendStartTime);
          }
          // Merge AI recognitions from backend
          if (data.ai_recognized && data.ai_recognized.length > 0) {
            setAllRecognizedStudents((prev) => {
              const next = new Set(prev);
              data.ai_recognized.forEach((id: string) => next.add(id));
              return next;
            });
          }
          // Merge manual marks from backend (another device may have marked)
          if (data.manually_marked) {
            setManuallyMarked((prev) => {
              const next = new Set(prev);
              data.manually_marked.forEach((id: string) => next.add(id));
              // Also remove any that were unmarked from the other device
              prev.forEach((id) => {
                if (!data.manually_marked.includes(id)) next.delete(id);
              });
              return next;
            });
          }
        } else if (data && data.active === false && sessionActive) {
          // Session was ended/submitted on the backend
          cleanup();
          setSessionActive(false);
          setSessionPaused(false);
          setSessionRecognitions([]);
          setAllRecognizedStudents(new Set());
          setManuallyMarked(new Set());
          setCurrentRecognition(null);
          setShowSessionSummary(false);
          fetchAttendanceHistory(course.id);
          Alert.alert("Session Ended", "The session was ended from the website.");
        }
      } catch (e) {
        // Silent fail on polling errors
      }
    }
    // Initial poll immediately
    pollActiveSession();
    // Then every 3 seconds
    livePollingRef.current = setInterval(pollActiveSession, 3000);
    return () => {
      if (livePollingRef.current) {
        clearInterval(livePollingRef.current);
        livePollingRef.current = null;
      }
    };
  }, [course.id, sessionActive]);

  function formatTime(ms) {
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  }

  async function fetchAttendanceHistory(cid) {
    try {
      setIsLoadingHistory(true);
      const data = await getCourseAttendance(cid);
      console.log("[AttendanceHistory] Raw response:", JSON.stringify(data).substring(0, 500));

      // Backend returns { courseId, attendanceByDate: { "2026-04-17": [...records], ... }, totalRecords }
      if (data?.attendanceByDate && typeof data.attendanceByDate === "object") {
        setAttendanceHistory(data.attendanceByDate);
      } else if (typeof data === "object" && !Array.isArray(data)) {
        // If the response IS already the attendanceByDate map
        const keys = Object.keys(data || {});
        const looksLikeDateMap = keys.length > 0 && keys.every(k => /^\d{4}-\d{2}-\d{2}/.test(k));
        if (looksLikeDateMap) {
          setAttendanceHistory(data);
        } else {
          console.log("[AttendanceHistory] Unexpected format, keys:", keys);
          setAttendanceHistory({});
        }
      } else {
        setAttendanceHistory({});
      }
    } catch (e: any) { console.log("History error:", e); }
    finally { setIsLoadingHistory(false); }
  }



  // Normalize recognition result (matches website's normalizeResult exactly)
  function normalizeResult(result) {
    const rawRec = result.recognizedStudents || result.recognized || [];
    const normalized = rawRec.map((item) => {
      if (!item) return null;
      if (typeof item === "string") {
        const found = students.find((s) => s.id === item || s.name.toLowerCase() === item.toLowerCase());
        return found ? { id: found.id, name: found.name, email: found.email } : { id: item, name: item, email: "" };
      }
      // Object: try to match by id, studentId, or name
      for (const cand of [item.id, item.studentId, item.name].filter(Boolean)) {
        const found = students.find((s) => s.id === String(cand) || s.name.toLowerCase() === String(cand).toLowerCase());
        if (found) return { id: found.id, name: found.name, email: found.email };
      }
      return { id: String(item.id || ""), name: String(item.name || item.id || ""), email: String(item.email || "") };
    }).filter(Boolean);

    return {
      totalFaces: Number(result.totalFaces ?? normalized.length),
      recognizedStudents: normalized,
      averageConfidence: typeof result.averageConfidence === "number" ? result.averageConfidence : 0,
    };
  }

  // ─── Session controls (matches website) ─────────────────
  async function startSession() {
    haptic.heavy();

    setSessionActive(true);
    setSessionPaused(false);
    setSessionStartTime(Date.now());
    setTimeRemaining(SESSION_DURATION);
    setSessionRecognitions([]);
    setAllRecognizedStudents(new Set());
    setManuallyMarked(new Set());
    setCurrentRecognition(null);

    // Session timeout
    sessionTimerRef.current = setTimeout(() => endSession(), SESSION_DURATION);
  }

  function pauseSession() {
    haptic.medium();
    setSessionPaused(true);
  }

  function resumeSession() {
    haptic.medium();
    setSessionPaused(false);
  }

  function endSession() {
    haptic.heavy();
    cleanup();
    setSessionActive(false);
    setSessionPaused(false);
    const allPresentCount = allRecognizedStudents.size + manuallyMarked.size;
    if (allPresentCount > 0) {
      Alert.alert("Session Ended", `${allPresentCount} student(s) present. Review and submit.`);
      setShowSessionSummary(true);
      setSummarySubmitted(false);
    } else {
      Alert.alert("Session Ended", "No students were marked present.");
    }
  }

  function handleMarkPresent(studentId: string) {
    setManuallyMarked((prev) => new Set(prev).add(studentId));
    // Sync to backend so the website sees this mark
    updateManualMark(course.id, studentId, true).catch(() => {});
  }

  function handleUnmarkPresent(studentId: string) {
    setManuallyMarked((prev) => {
      const next = new Set(prev);
      next.delete(studentId);
      return next;
    });
    // Sync to backend so the website sees this unmark
    updateManualMark(course.id, studentId, false).catch(() => {});
  }

  // ─── Submit (matches website: sends recognizedStudents array) ───
  async function handleSubmit() {
    const allPresentIds = new Set(allRecognizedStudents);
    manuallyMarked.forEach((id) => allPresentIds.add(id));

    if (allPresentIds.size === 0) {
      Alert.alert("Cannot Submit", "No students marked present.");
      return;
    }

    try {
      setIsSubmitting(true);
      // Build recognizedStudents array (matches website exactly)
      const finalRec = Array.from(allPresentIds)
        .map((sid) => {
          const s = students.find((st: any) => st.id === sid);
          return s ? { id: s.id, name: s.name, email: s.email } : null;
        })
        .filter(Boolean);

      const result = await submitSessionAttendance(course.id, finalRec, new Date().toISOString());

      haptic.success();
      const stats = result?.statistics;
      const msg = stats
        ? `Present: ${stats.present}, Absent: ${stats.absent}, Rate: ${stats.attendanceRate}%`
        : `${allPresentIds.size} student(s) marked present.`;

      Alert.alert("Submitted!", msg, [{ text: "OK", onPress: () => {
        setSessionRecognitions([]);
        setAllRecognizedStudents(new Set());
        setManuallyMarked(new Set());
        setCurrentRecognition(null);
        setSummarySubmitted(true);
        fetchAttendanceHistory(course.id);
      }}]);
    } catch (e: any) {
      console.log("Submit error:", e);
      Alert.alert("Submission Failed", e.message || "Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // Computed values (matches website)
  const allPresentSet = new Set(allRecognizedStudents);
  manuallyMarked.forEach((id) => allPresentSet.add(id));
  const recognizedCount = allPresentSet.size;

  const localTrainedCount = students.filter((s) => s.hasFaceData).length;
  const localUntrainedCount = students.length - localTrainedCount;
  const attendanceRate = students.length > 0 ? ((recognizedCount / students.length) * 100).toFixed(1) : "0.0";
  const historyDates = Object.keys(attendanceHistory).sort().reverse();

  return (
    <SafeAreaView style={s.safeArea}>
      <ScrollView contentContainerStyle={s.container} showsVerticalScrollIndicator={false}>

        {/* Back Button */}
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <ChevronLeft size={20} color={colors.foreground} />
          <Text style={s.backBtnText}>Back to Setup</Text>
        </TouchableOpacity>

        {/* Header */}
        <View style={s.header}>
          <View style={{ flex: 1 }}>
            <Text style={s.title}>AI Attendance Session</Text>
            <Text style={s.subtitle}>{course.name}</Text>
          </View>
          <TouchableOpacity style={s.historyBtn} onPress={() => setShowHistory(!showHistory)} activeOpacity={0.7}>
            <History size={14} color={colors.textBody} style={{ marginRight: 4 }} />
            <Text style={s.historyBtnText}>{showHistory ? "Hide" : "View"} History</Text>
          </TouchableOpacity>
        </View>

        {/* Time Remaining (when session active) */}
        {sessionActive && (
          <View style={s.timerCard}>
            <Text style={s.timerLabel}>Time Remaining</Text>
            <Text style={s.timerValue}>{formatTime(timeRemaining)}</Text>
          </View>
        )}

        {/* Stats Row */}
        <View style={s.statsRow}>
          <View style={s.statCard}>
            <Text style={s.statNumber}>{students.length || studentCount}</Text>
            <Text style={s.statLabel}>TOTAL STUDENTS</Text>
          </View>
          <View style={s.statCard}>
            <Text style={[s.statNumber, { color: colors.accent }]}>{localTrainedCount || trainedCount}</Text>
            <Text style={s.statLabel}>TRAINED</Text>
          </View>
          <View style={s.statCard}>
            <Text style={[s.statNumber, { color: colors.destructive }]}>{localUntrainedCount}</Text>
            <Text style={s.statLabel}>NOT TRAINED</Text>
          </View>
        </View>

        {/* History Section */}
        {showHistory && (
          <View style={s.historyCard}>
            <Text style={s.historyTitle}>Attendance History</Text>
            <Text style={s.historySubtitle}>Past sessions for this course</Text>
            {isLoadingHistory ? (
              <TableSkeleton rows={3} columns={2} />
            ) : historyDates.length === 0 ? (
              <View style={s.emptyResultsContainer}>
                <Text style={s.emptyResultsTitle}>No attendance history yet</Text>
                <Text style={s.emptyResultsSubtitle}>Run your first session to see records here.</Text>
              </View>
            ) : (
              historyDates.map((date) => {
                const records = attendanceHistory[date] || [];
                const presentCount = records.filter(r => r.status === "PRESENT" || r.status === true).length;
                const totalInSession = records.length;
                const rate = totalInSession > 0 ? ((presentCount / totalInSession) * 100).toFixed(1) : "0.0";
                return (
                  <View key={date} style={s.historyRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.historyDate}>
                        {new Date(date).toLocaleDateString("en-US", {
                          weekday: "long", year: "numeric", month: "long", day: "numeric",
                        })}
                      </Text>
                      <Text style={s.historyCourseName}>{course.name}</Text>
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <Text style={s.historyCount}>
                        <Text style={{ color: colors.success, fontWeight: "800" }}>{presentCount}</Text>
                        {" / "}{totalInSession}
                      </Text>
                      <View style={s.historyRateBadge}>
                        <Text style={s.historyRateText}>{rate}%</Text>
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* Today's Session Banner (detected from website/other device) */}
        {todaySession && !sessionActive && (
          <View style={s.todayBanner}>
            <View style={s.todayBannerHeader}>
              <View style={s.todayBannerIconRow}>
                <Globe size={16} color={colors.accent} />
                <Text style={s.todayBannerTitle}>Attendance Already Recorded Today</Text>
              </View>
              <TouchableOpacity onPress={() => { fetchAttendanceHistory(course.id); }} activeOpacity={0.7}>
                <RefreshCw size={14} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
            <Text style={s.todayBannerSubtitle}>
              Submitted via website or another device
            </Text>
            <View style={s.todayBannerStats}>
              <View style={s.todayBannerStat}>
                <Text style={[s.todayBannerStatNum, { color: colors.success }]}>{todaySession.present}</Text>
                <Text style={s.todayBannerStatLabel}>Present</Text>
              </View>
              <View style={s.todayBannerStat}>
                <Text style={[s.todayBannerStatNum, { color: colors.destructive }]}>{todaySession.absent}</Text>
                <Text style={s.todayBannerStatLabel}>Absent</Text>
              </View>
              <View style={s.todayBannerStat}>
                <Text style={[s.todayBannerStatNum, { color: colors.accent }]}>{todaySession.rate}%</Text>
                <Text style={s.todayBannerStatLabel}>Rate</Text>
              </View>
            </View>
            {todaySession.students.length > 0 && (
              <View style={s.todayBannerNames}>
                <Text style={s.todayBannerNamesLabel}>Present students:</Text>
                <Text style={s.todayBannerNamesList} numberOfLines={3}>
                  {todaySession.students.join(", ")}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Session Controls */}
        <View style={s.cameraCard}>
          <View style={s.cameraTitleRow}>
            <View>
              <Text style={s.cameraTitle}>Manual Attendance Control</Text>
              <Text style={s.cameraSubtitle}>Record attendance for this session</Text>
            </View>
          </View>

          {/* Controls */}
          {!sessionActive ? (
            <TouchableOpacity
              style={[s.startBtn, localTrainedCount === 0 && { opacity: 0.5 }]}
              onPress={startSession}
              disabled={localTrainedCount === 0}
              activeOpacity={0.8}
            >
              <Play size={16} color={colors.primaryForeground} style={{ marginRight: 8 }} />
              <Text style={s.startBtnText}>Start 45-Min Session</Text>
            </TouchableOpacity>
          ) : (
            <View style={s.activeControlsRow}>
              {!sessionPaused ? (
                <TouchableOpacity style={s.pauseBtn} onPress={pauseSession} activeOpacity={0.8}>
                  <Pause size={14} color={colors.warning} style={{ marginRight: 6 }} />
                  <Text style={s.pauseBtnText}>Pause</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={s.resumeBtn} onPress={resumeSession} activeOpacity={0.8}>
                  <Play size={14} color={colors.primaryForeground} style={{ marginRight: 6 }} />
                  <Text style={s.resumeBtnText}>Resume</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={s.stopBtn} onPress={() => {
                Alert.alert("End Session?", "This will stop the session.", [
                  { text: "Cancel", style: "cancel" },
                  { text: "End", style: "destructive", onPress: endSession },
                ]);
              }} activeOpacity={0.8}>
                <Square size={14} color={colors.danger} style={{ marginRight: 6 }} />
                <Text style={s.stopBtnText}>End</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Session Attendance */}
        <View style={s.resultsCard}>
          <View style={s.resultsHeader}>
            <View>
              <Text style={s.resultsTitle}>Session Attendance</Text>
              <Text style={s.resultsSubtitle}>Cumulative recognized & marked students</Text>
            </View>
            {recognizedCount > 0 && (
              <View style={{ flexDirection: "row", gap: 8 }}>
                <View style={s.presentBadge}>
                  <Text style={s.presentBadgeLabel}>Present</Text>
                  <Text style={s.presentBadgeValue}>{recognizedCount}</Text>
                </View>
                <View style={s.absentBadge}>
                  <Text style={s.absentBadgeLabel}>Absent</Text>
                  <Text style={s.absentBadgeValue}>{students.length - recognizedCount}</Text>
                </View>
              </View>
            )}
          </View>

          {recognizedCount === 0 ? (
            <View style={s.emptyResultsContainer}>
              <Users size={32} color={colors.mutedForeground} />
              <Text style={s.emptyResultsTitle}>No students marked yet</Text>
              <Text style={s.emptyResultsSubtitle}>Start a session to track attendance.</Text>
            </View>
          ) : (
            <>
              {Array.from(allPresentSet).map((sid) => {
                const student = students.find((st) => st.id === sid);
                if (!student) return null;
                const isManual = manuallyMarked.has(sid as string) && !allRecognizedStudents.has(sid as string);
                return (
                  <View key={String(sid)} style={s.recognizedRow}>
                    <View style={[s.recognizedAvatar, isManual && { backgroundColor: "rgba(16,185,129,0.15)" }]}>
                      <CheckCircle size={16} color={isManual ? "#059669" : colors.success} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.recognizedName}>{student.name}</Text>
                      <Text style={s.recognizedEmail}>{student.email}</Text>
                    </View>
                    {isManual && (
                      <View style={{ backgroundColor: "rgba(16,185,129,0.1)", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 }}>
                         <Text style={{ fontSize: 10, fontWeight: "700", color: "#059669" }}>Marked</Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </>
          )}

          {/* Manual Marking Button & Submit */}
          {(sessionActive || recognizedCount > 0 || manuallyMarked.size > 0 || allRecognizedStudents.size > 0) && (
            <View style={{ marginTop: 16, gap: 12 }}>
              <TouchableOpacity
                style={s.manualMarkBtn}
                onPress={() => setShowSessionSummary(true)}
                activeOpacity={0.8}
              >
                <Text style={s.manualMarkBtnText}>Review & Mark Manually</Text>
              </TouchableOpacity>
              
              {recognizedCount > 0 && (
                <TouchableOpacity
                  style={[s.submitBtn, isSubmitting && { opacity: 0.6 }]}
                  onPress={handleSubmit}
                  disabled={isSubmitting}
                  activeOpacity={0.8}
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color={colors.primaryForeground} />
                  ) : (
                    <>
                      <Send size={14} color={colors.primaryForeground} style={{ marginRight: 8 }} />
                      <Text style={s.submitBtnText}>
                        Submit Attendance ({recognizedCount})
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* Info Card */}
        <View style={s.infoCard}>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
            <Info size={14} color={colors.accent} style={{ marginRight: 6 }} />
            <Text style={s.infoTitle}>How manual attendance works</Text>
          </View>
          {[
            'Click "Start" to begin the 45-min session timer',
            "AI camera runs automatically on the website",
            'Click "Review & Mark Manually" to mark absent students',
            "Submit at end to save the session record",
          ].map((step, i) => (
            <Text key={i} style={s.infoStep}>{i + 1}. {step}</Text>
          ))}
        </View>
      </ScrollView>

      {/* Session Summary / Manual Marking Modal */}
      <Modal visible={showSessionSummary} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <View style={s.modalHeader}>
              <View>
                <Text style={s.modalTitle}>Session Summary</Text>
                <Text style={s.modalSubtitle}>Review absent students and manually mark</Text>
              </View>
              <TouchableOpacity onPress={() => setShowSessionSummary(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <XCircle size={24} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            <View style={s.modalStatsRow}>
              <View style={[s.modalStatCard, { backgroundColor: "rgba(16,185,129,0.08)", borderColor: "rgba(16,185,129,0.2)" }]}>
                <Text style={[s.modalStatLabel, { color: "#059669" }]}>PRESENT</Text>
                <Text style={[s.modalStatValue, { color: "#059669" }]}>{recognizedCount}</Text>
              </View>
              <View style={[s.modalStatCard, { backgroundColor: "rgba(239,68,68,0.06)", borderColor: "rgba(239,68,68,0.2)" }]}>
                <Text style={[s.modalStatLabel, { color: "#dc2626" }]}>ABSENT</Text>
                <Text style={[s.modalStatValue, { color: "#dc2626" }]}>{students.length - recognizedCount}</Text>
              </View>
              <View style={[s.modalStatCard, { backgroundColor: "rgba(15,164,175,0.06)", borderColor: "rgba(15,164,175,0.22)" }]}>
                <Text style={[s.modalStatLabel, { color: colors.accent }]}>RATE</Text>
                <Text style={[s.modalStatValue, { color: colors.accent }]}>{attendanceRate}%</Text>
              </View>
            </View>

            <ScrollView style={s.modalScroll} showsVerticalScrollIndicator={false}>
              {allRecognizedStudents.size > 0 && (
                <View style={s.modalSection}>
                  <Text style={s.modalSectionTitle}>🤖 AI RECOGNIZED ({allRecognizedStudents.size})</Text>
                  {Array.from(allRecognizedStudents).map(sid => {
                    const student = students.find(st => st.id === sid);
                    if (!student) return null;
                    return (
                      <View key={String(sid)} style={s.modalRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={s.modalRowName}>{student.name}</Text>
                          <Text style={s.modalRowEmail}>{student.email}</Text>
                        </View>
                        <View style={s.modalBadgeAi}>
                          <Text style={s.modalBadgeAiText}>✔ Present</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}

              {manuallyMarked.size > 0 && (
                <View style={s.modalSection}>
                  <Text style={[s.modalSectionTitle, { color: "#059669" }]}>✅ MANUALLY MARKED ({manuallyMarked.size})</Text>
                  {Array.from(manuallyMarked).map(sid => {
                    const student = students.find(st => st.id === sid);
                    if (!student) return null;
                    return (
                      <View key={String(sid)} style={[s.modalRow, { backgroundColor: "rgba(16,185,129,0.06)", borderColor: "rgba(16,185,129,0.15)" }]}>
                        <View style={{ flex: 1 }}>
                          <Text style={s.modalRowName}>{student.name}</Text>
                          <Text style={s.modalRowEmail}>{student.email}</Text>
                        </View>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                          <View style={s.modalBadgeManual}>
                            <Text style={s.modalBadgeManualText}>✔ Marked</Text>
                          </View>
                          {!summarySubmitted && (
                            <TouchableOpacity style={s.modalUndoBtn} onPress={() => handleUnmarkPresent(sid as string)}>
                              <Text style={s.modalUndoBtnText}>Undo</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}

              {(() => {
                const absentList = students.filter(st => !allPresentSet.has(st.id));
                if (absentList.length === 0) return (
                  <View style={[s.emptyResultsContainer, { paddingVertical: 40 }]}>
                     <CheckCircle size={40} color="#059669" />
                     <Text style={[s.emptyResultsTitle, { color: "#059669" }]}>All students are present!</Text>
                  </View>
                );
                return (
                  <View style={s.modalSection}>
                    <Text style={[s.modalSectionTitle, { color: "#dc2626" }]}>✗ ABSENT STUDENTS ({absentList.length})</Text>
                    {absentList.map(student => (
                      <View key={student.id} style={[s.modalRow, { backgroundColor: "rgba(239,68,68,0.04)", borderColor: "rgba(239,68,68,0.12)" }]}>
                        <View style={{ flex: 1 }}>
                          <Text style={s.modalRowName}>{student.name}</Text>
                          <Text style={s.modalRowEmail}>{student.email}</Text>
                        </View>
                        <TouchableOpacity style={s.modalMarkBtn} onPress={() => handleMarkPresent(student.id)}>
                          <UserPlus size={12} color="#fff" style={{ marginRight: 4 }} />
                          <Text style={s.modalMarkBtnText}>Mark Present</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                );
              })()}
            </ScrollView>
            <View style={s.modalFooter}>
              {allPresentSet.size > 0 && (
                <TouchableOpacity
                  style={[s.submitBtn, { marginBottom: 12 }, isSubmitting && { opacity: 0.6 }]}
                  onPress={handleSubmit}
                  disabled={isSubmitting}
                  activeOpacity={0.8}
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Send size={14} color="#fff" style={{ marginRight: 8 }} />
                      <Text style={s.submitBtnText}>
                        Submit Attendance ({allPresentSet.size})
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
              <TouchableOpacity style={s.modalDoneBtn} onPress={() => setShowSessionSummary(false)}>
                <Text style={s.modalDoneBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.secondary },
  backBtn: { 
    flexDirection: "row", 
    alignItems: "center", 
    marginBottom: 16,
    alignSelf: "flex-start",
    backgroundColor: colors.background,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.foreground,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 2,
    elevation: 1
  },
  backBtnText: { fontSize: 14, fontWeight: "700", color: colors.foreground, marginLeft: 4 },
  container: { padding: 20, paddingBottom: 40 },

  header: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16, marginTop: 8 },
  title: { fontSize: 22, fontWeight: "800", color: colors.foreground },
  subtitle: { fontSize: 13, color: colors.mutedForeground, marginTop: 2 },
  historyBtn: { flexDirection: "row", alignItems: "center", backgroundColor: colors.background, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: colors.border },
  historyBtnText: { fontSize: 11, fontWeight: "600", color: colors.textBody },

  timerCard: { backgroundColor: colors.background, borderRadius: 14, padding: 16, marginBottom: 16, alignItems: "center", borderWidth: 1, borderColor: colors.border },
  timerLabel: { fontSize: 10, fontWeight: "700", color: colors.mutedForeground, letterSpacing: 0.5 },
  timerValue: { fontSize: 32, fontWeight: "900", color: colors.foreground, marginTop: 4, fontVariant: ["tabular-nums"] },

  statsRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16, gap: 8 },
  statCard: { flex: 1, backgroundColor: colors.background, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.border, alignItems: "center" },
  statLabel: { fontSize: 8, fontWeight: "600", color: colors.mutedForeground, letterSpacing: 0.3, marginTop: 4 },
  statNumber: { fontSize: 22, fontWeight: "900", color: colors.foreground, letterSpacing: -0.5 },

  cameraCard: { backgroundColor: "#0f172a", borderRadius: 16, padding: 16, marginBottom: 16 },
  cameraTitleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  cameraTitle: { fontSize: 16, fontWeight: "700", color: "#ffffff" },
  cameraSubtitle: { fontSize: 12, color: "rgba(255,255,255,0.6)", marginTop: 2 },
  // Manual Marking Modal Styles
  manualMarkBtn: { backgroundColor: colors.muted, paddingVertical: 12, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  manualMarkBtnText: { color: colors.foreground, fontSize: 12, fontWeight: "700" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 20 },
  modalContent: { backgroundColor: colors.background, borderRadius: 20, width: "100%", maxHeight: "85%", overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 10 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalTitle: { fontSize: 18, fontWeight: "800", color: colors.foreground },
  modalSubtitle: { fontSize: 12, color: colors.mutedForeground, marginTop: 4 },
  modalStatsRow: { flexDirection: "row", padding: 20, gap: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalStatCard: { flex: 1, padding: 12, borderRadius: 12, borderWidth: 1, alignItems: "center" },
  modalStatLabel: { fontSize: 9, fontWeight: "800", letterSpacing: 0.5, marginBottom: 4 },
  modalStatValue: { fontSize: 20, fontWeight: "900" },
  modalScroll: { padding: 20 },
  modalSection: { marginBottom: 24 },
  modalSectionTitle: { fontSize: 11, fontWeight: "800", color: colors.mutedForeground, letterSpacing: 0.5, marginBottom: 12 },
  modalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 12, borderRadius: 12, backgroundColor: colors.muted, marginBottom: 8, borderWidth: 1, borderColor: colors.border },
  modalRowName: { fontSize: 14, fontWeight: "700", color: colors.foreground },
  modalRowEmail: { fontSize: 11, color: colors.mutedForeground, marginTop: 2 },
  modalBadgeAi: { backgroundColor: "rgba(15,164,175,0.1)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  modalBadgeAiText: { fontSize: 11, fontWeight: "700", color: colors.accent },
  modalBadgeManual: { backgroundColor: "rgba(16,185,129,0.1)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  modalBadgeManualText: { fontSize: 11, fontWeight: "700", color: "#059669" },
  modalUndoBtn: { backgroundColor: "rgba(239,68,68,0.1)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: "rgba(239,68,68,0.2)" },
  modalUndoBtnText: { fontSize: 11, fontWeight: "700", color: "#dc2626" },
  modalMarkBtn: { flexDirection: "row", alignItems: "center", backgroundColor: colors.accent, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  modalMarkBtnText: { fontSize: 12, fontWeight: "700", color: "#fff" },
  modalFooter: { padding: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.background },
  modalDoneBtn: { backgroundColor: colors.accent, paddingVertical: 14, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  modalDoneBtnText: { color: "#fff", fontSize: 14, fontWeight: "800" },

  startBtn: { flexDirection: "row", backgroundColor: colors.accent, paddingVertical: 14, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  startBtnText: { color: colors.primaryForeground, fontSize: 15, fontWeight: "700" },
  activeControlsRow: { flexDirection: "row", gap: 8 },
  pauseBtn: { flex: 1, flexDirection: "row", backgroundColor: colors.warningLight, paddingVertical: 11, borderRadius: 10, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(245,158,11,0.3)" },
  pauseBtnText: { color: colors.warning, fontSize: 12, fontWeight: "700" },
  resumeBtn: { flex: 1, flexDirection: "row", backgroundColor: colors.accent, paddingVertical: 11, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  resumeBtnText: { color: colors.primaryForeground, fontSize: 12, fontWeight: "700" },
  stopBtn: { flex: 1, flexDirection: "row", backgroundColor: colors.background, paddingVertical: 11, borderRadius: 10, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(239,68,68,0.3)" },
  stopBtnText: { color: colors.danger, fontSize: 12, fontWeight: "700" },


  resultsCard: { backgroundColor: colors.background, borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: colors.border },
  resultsHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 },
  resultsTitle: { fontSize: 16, fontWeight: "700", color: colors.foreground },
  resultsSubtitle: { fontSize: 11, color: colors.mutedForeground, marginTop: 2 },
  presentBadge: { backgroundColor: colors.successLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, alignItems: "center" },
  presentBadgeLabel: { fontSize: 8, fontWeight: "600", color: colors.success },
  presentBadgeValue: { fontSize: 16, fontWeight: "800", color: colors.success },
  absentBadge: { backgroundColor: colors.dangerLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, alignItems: "center" },
  absentBadgeLabel: { fontSize: 8, fontWeight: "600", color: colors.destructive },
  absentBadgeValue: { fontSize: 16, fontWeight: "800", color: colors.destructive },

  emptyResultsContainer: { alignItems: "center", paddingVertical: 30 },
  emptyResultsTitle: { fontSize: 15, fontWeight: "700", color: colors.mutedForeground, marginTop: 10 },
  emptyResultsSubtitle: { fontSize: 12, color: colors.mutedForeground, marginTop: 4 },

  recognizedRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.muted },
  recognizedAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.successLight, justifyContent: "center", alignItems: "center", marginRight: 10 },
  recognizedName: { fontSize: 13, fontWeight: "700", color: colors.foreground },
  recognizedEmail: { fontSize: 10, color: colors.mutedForeground, marginTop: 1 },

  submitHint: { fontSize: 11, color: colors.mutedForeground, textAlign: "center", marginBottom: 10 },
  submitBtn: { flexDirection: "row", backgroundColor: colors.primaryDark, paddingVertical: 14, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  submitBtnText: { color: colors.primaryForeground, fontSize: 13, fontWeight: "700" },

  historyCard: { backgroundColor: colors.background, borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: colors.border },
  historyTitle: { fontSize: 16, fontWeight: "700", color: colors.foreground },
  historySubtitle: { fontSize: 12, color: colors.mutedForeground, marginTop: 2, marginBottom: 14 },
  historyRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.muted },
  historyDate: { fontSize: 14, fontWeight: "700", color: colors.foreground },
  historyCourseName: { fontSize: 11, color: colors.mutedForeground, marginTop: 2 },
  historyCount: { fontSize: 13, fontWeight: "600", color: colors.textBody },
  historyRateBadge: { backgroundColor: "rgba(15,164,175,0.1)", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  historyRateText: { fontSize: 11, fontWeight: "700", color: colors.accent },

  infoCard: { backgroundColor: colors.background, borderRadius: 14, padding: 18, borderWidth: 1, borderColor: colors.border, marginBottom: 16 },
  infoTitle: { fontSize: 14, fontWeight: "700", color: colors.foreground },
  infoStep: { fontSize: 12, color: colors.mutedForeground, lineHeight: 22, marginBottom: 2 },
  infoHighlight: { backgroundColor: colors.warningLight, borderRadius: 8, padding: 10, marginTop: 10 },
  infoHighlightText: { fontSize: 11, color: colors.warning, fontWeight: "600" },

  centerContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 30 },
  permTitle: { fontSize: 18, fontWeight: "700", color: colors.foreground, marginTop: 16 },
  permSubtitle: { fontSize: 13, color: colors.mutedForeground, textAlign: "center", marginTop: 6 },

  // Today's session banner
  todayBanner: { backgroundColor: colors.background, borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1.5, borderColor: colors.accent + "40", shadowColor: colors.accent, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
  todayBannerHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  todayBannerIconRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  todayBannerTitle: { fontSize: 14, fontWeight: "700", color: colors.foreground },
  todayBannerSubtitle: { fontSize: 11, color: colors.mutedForeground, marginBottom: 12, marginLeft: 24 },
  todayBannerStats: { flexDirection: "row", justifyContent: "space-around", marginBottom: 12 },
  todayBannerStat: { alignItems: "center" },
  todayBannerStatNum: { fontSize: 22, fontWeight: "900" },
  todayBannerStatLabel: { fontSize: 9, fontWeight: "600", color: colors.mutedForeground, letterSpacing: 0.3, marginTop: 2 },
  todayBannerNames: { backgroundColor: colors.muted, borderRadius: 8, padding: 10 },
  todayBannerNamesLabel: { fontSize: 10, fontWeight: "700", color: colors.mutedForeground, marginBottom: 4 },
  todayBannerNamesList: { fontSize: 12, color: colors.textBody, lineHeight: 18 },
});
