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
  ScrollView, ActivityIndicator, Alert, PermissionsAndroid, Platform
} from "react-native";
import { Camera } from "react-native-camera-kit";
import { Theme, useTheme } from "../../theme/Theme";
import {
  getAttendanceStudents, recognizeFaces,
  submitSessionAttendance, getCourseAttendance
} from "../../api/teacherApi";
import {
  Users, ScanFace, Play, Pause, Square, Send,
  Clock, CheckCircle, Camera as CameraIcon, Info, History, Zap
} from "lucide-react-native";
import { TableSkeleton } from "../../components/SkeletonLoader";

const SESSION_DURATION = 45 * 60 * 1000; // 45 min in ms (website uses ms)
const CAPTURE_INTERVAL = 2 * 60 * 1000;  // 2 min in ms

export default function AttendanceSession({ route, navigation }) {
  const { colors, isDark } = useTheme();
  const s = useMemo(() => createStyles(colors), [colors]);
  const { course, studentCount, trainedCount, notTrainedCount } = route.params;

  const cameraRef = useRef(null);

  // Students (loaded from attendance API, like the website)
  const [students, setStudents] = useState([]);

  // Session state (mirrors website state variables)
  const [hasPermission, setHasPermission] = useState(false);
  const [sessionActive, setSessionActive] = useState(false);
  const [sessionPaused, setSessionPaused] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(SESSION_DURATION);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Recognition state (matches website exactly)
  const [allRecognizedStudents, setAllRecognizedStudents] = useState(new Set());
  const [sessionRecognitions, setSessionRecognitions] = useState([]);
  const [currentRecognition, setCurrentRecognition] = useState(null);

  // History
  const [showHistory, setShowHistory] = useState(false);
  const [attendanceHistory, setAttendanceHistory] = useState({});
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Refs
  const captureIntervalRef = useRef(null);
  const sessionTimerRef = useRef(null);
  const countdownIntervalRef = useRef(null);
  const sessionPausedRef = useRef(false);

  useEffect(() => { sessionPausedRef.current = sessionPaused; }, [sessionPaused]);

  // Request permission + load students on mount
  useEffect(() => {
    (async () => {
      if (Platform.OS === "android") {
        const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA);
        setHasPermission(granted === PermissionsAndroid.RESULTS.GRANTED);
      } else {
        setHasPermission(true);
      }
      // Load students with face data status (like website's fetchStudents)
      try {
        const data = await getAttendanceStudents(course.id);
        const list = Array.isArray(data) ? data : (data?.students || []);
        setStudents(list.map((s) => ({
          id: s.id,
          name: s.name || s.user?.name || "Student",
          email: s.email || s.user?.email || "",
          hasFaceData: s.has_face_data || s.hasFaceData || false,
        })));
      } catch (e) { console.log("Failed to load students:", e); }
      // Load history
      fetchAttendanceHistory(course.id);
    })();
  }, [course.id]);

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
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }
  }, [sessionActive, sessionPaused, sessionStartTime]);

  function cleanup() {
    if (captureIntervalRef.current) clearInterval(captureIntervalRef.current);
    if (sessionTimerRef.current) clearTimeout(sessionTimerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
  }

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
    } catch (e) { console.log("History error:", e); }
    finally { setIsLoadingHistory(false); }
  }

  // ─── Core: Capture 5 frames + recognize (matches website exactly) ───
  async function captureAndRecognize() {
    if (!cameraRef.current || isCapturing) return;

    try {
      setIsCapturing(true);

      // Website captures 5 frames with 300ms gaps
      const frames = [];
      for (let i = 0; i < 5; i++) {
        await new Promise((r) => setTimeout(r, 300));
        try {
          const image = await cameraRef.current.capture();
          if (image?.uri) {
            frames.push({
              uri: image.uri,
              type: "image/jpeg",
              name: `frame_${i}.jpg`,
            });
          }
        } catch (e) { console.log(`Frame ${i} capture failed:`, e); }
      }

      if (frames.length === 0) {
        console.log("No frames captured");
        return;
      }

      // Send to backend
      const result = await recognizeFaces(
        course.id,
        frames,
        `batch_${Date.now()}`
      );

      // Normalize results (matches website's normalizeResult function)
      const normalized = normalizeResult(result || {});
      setCurrentRecognition(normalized);

      // Add to session recognitions log
      setSessionRecognitions((prev) => [...prev, {
        timestamp: new Date().toISOString(),
        recognizedStudents: normalized.recognizedStudents,
        totalFaces: normalized.totalFaces,
        averageConfidence: normalized.averageConfidence,
      }]);

      // Accumulate recognized student IDs (cumulative, like website)
      setAllRecognizedStudents((prev) => {
        const next = new Set(prev);
        normalized.recognizedStudents.forEach((s) => next.add(s.id));
        return next;
      });

    } catch (e) {
      console.log("Capture/recognize error:", e);
    } finally {
      setIsCapturing(false);
    }
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
    const trainedStudents = students.filter((s) => s.hasFaceData);
    if (trainedStudents.length === 0) {
      Alert.alert("No Trained Students", "Please train the recognition model first.");
      return;
    }

    setSessionActive(true);
    setSessionPaused(false);
    setSessionStartTime(Date.now());
    setTimeRemaining(SESSION_DURATION);
    setSessionRecognitions([]);
    setAllRecognizedStudents(new Set());
    setCurrentRecognition(null);

    // First capture after 1s delay (camera init)
    setTimeout(() => captureAndRecognize(), 1000);

    // Auto-capture every 2 minutes
    captureIntervalRef.current = setInterval(() => {
      if (!sessionPausedRef.current) captureAndRecognize();
    }, CAPTURE_INTERVAL);

    // Session timeout
    sessionTimerRef.current = setTimeout(() => endSession(), SESSION_DURATION);
  }

  function pauseSession() {
    setSessionPaused(true);
    if (captureIntervalRef.current) { clearInterval(captureIntervalRef.current); captureIntervalRef.current = null; }
  }

  function resumeSession() {
    setSessionPaused(false);
    captureIntervalRef.current = setInterval(() => captureAndRecognize(), CAPTURE_INTERVAL);
  }

  function endSession() {
    cleanup();
    setSessionActive(false);
    setSessionPaused(false);
    if (allRecognizedStudents.size > 0) {
      Alert.alert("Session Ended", `${allRecognizedStudents.size} student(s) recognized. Submit to save.`);
    } else {
      Alert.alert("Session Ended", "No students were recognized.");
    }
  }

  // ─── Submit (matches website: sends recognizedStudents array) ───
  async function handleSubmit() {
    if (allRecognizedStudents.size === 0) {
      Alert.alert("Cannot Submit", "No students recognized.");
      return;
    }

    try {
      setIsSubmitting(true);
      // Build recognizedStudents array (matches website exactly)
      const finalRec = Array.from(allRecognizedStudents)
        .map((sid) => {
          const s = students.find((st) => st.id === sid);
          return s ? { id: s.id, name: s.name, email: s.email } : null;
        })
        .filter(Boolean);

      const result = await submitSessionAttendance(course.id, finalRec, new Date().toISOString());

      const stats = result?.statistics;
      const msg = stats
        ? `Present: ${stats.present}, Absent: ${stats.absent}, Rate: ${stats.attendanceRate}%`
        : `${allRecognizedStudents.size} student(s) marked present.`;

      Alert.alert("Submitted!", msg, [{ text: "OK", onPress: () => {
        setSessionRecognitions([]);
        setAllRecognizedStudents(new Set());
        setCurrentRecognition(null);
        fetchAttendanceHistory(course.id);
      }}]);
    } catch (e) {
      console.log("Submit error:", e);
      Alert.alert("Submission Failed", e.message || "Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // Computed values (matches website)
  const localTrainedCount = students.filter((s) => s.hasFaceData).length;
  const localUntrainedCount = students.length - localTrainedCount;
  const recognizedCount = allRecognizedStudents.size;
  const attendanceRate = students.length > 0 ? ((recognizedCount / students.length) * 100).toFixed(1) : "0.0";

  // Permission screen
  if (!hasPermission) {
    return (
      <SafeAreaView style={s.safeArea}>
        <View style={s.centerContainer}>
          <CameraIcon size={48} color={colors.mutedForeground} />
          <Text style={s.permTitle}>Camera Permission Required</Text>
          <Text style={s.permSubtitle}>Please grant camera access to capture attendance.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const historyDates = Object.keys(attendanceHistory).sort().reverse();

  return (
    <SafeAreaView style={s.safeArea}>
      <ScrollView contentContainerStyle={s.container} showsVerticalScrollIndicator={false}>

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

        {/* Live Camera Feed */}
        <View style={s.cameraCard}>
          <View style={s.cameraTitleRow}>
            <View>
              <Text style={s.cameraTitle}>Live Camera Feed</Text>
              <Text style={s.cameraSubtitle}>Face recognition capture</Text>
            </View>
            {sessionActive && (
              <View style={s.liveBadge}>
                <View style={s.liveDot} />
                <Text style={s.liveText}>LIVE</Text>
              </View>
            )}
          </View>

          <View style={s.cameraContainer}>
            <Camera
              ref={cameraRef}
              style={s.camera}
              cameraType="back"
              flashMode="off"
            />

            {/* Overlays */}
            {isCapturing && (
              <View style={s.cameraOverlayTop}>
                <View style={s.capturingBadge}>
                  <ActivityIndicator size="small" color={colors.primaryForeground} />
                  <Text style={s.capturingText}>Recognizing faces...</Text>
                </View>
              </View>
            )}

            {currentRecognition && sessionActive && (
              <View style={s.cameraOverlayBottom}>
                <Text style={s.captureCountText}>
                  Last scan: {currentRecognition.totalFaces} faces · {currentRecognition.recognizedStudents.length} recognized
                </Text>
              </View>
            )}

            {/* "Ready" overlay */}
            {!sessionActive && allRecognizedStudents.size === 0 && (
              <View style={s.startOverlay}>
                <CameraIcon size={28} color={colors.primaryForeground} />
                <Text style={s.startOverlayTitle}>Ready to capture attendance</Text>
                <Text style={s.startOverlaySubtitle}>
                  45-minute session · auto-capture every 2 min{"\n"}· cumulative recognition
                </Text>
                {localTrainedCount === 0 && (
                  <Text style={s.warningText}>⚠️ No trained students. Train the model first.</Text>
                )}
              </View>
            )}
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
                  <Pause size={14} color="#B45309" style={{ marginRight: 6 }} />
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
              <TouchableOpacity
                style={[s.manualCaptureBtn, isCapturing && { opacity: 0.6 }]}
                onPress={captureAndRecognize}
                disabled={isCapturing}
                activeOpacity={0.8}
              >
                <Zap size={14} color={colors.primaryForeground} style={{ marginRight: 6 }} />
                <Text style={s.manualCaptureBtnText}>{isCapturing ? "Scanning..." : "Scan Now"}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Session Attendance */}
        <View style={s.resultsCard}>
          <View style={s.resultsHeader}>
            <View>
              <Text style={s.resultsTitle}>Session Attendance</Text>
              <Text style={s.resultsSubtitle}>
                {currentRecognition
                  ? `Recognized students · Last scan: ${currentRecognition.totalFaces} faces`
                  : "Cumulative recognized students"}
              </Text>
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
              <ScanFace size={32} color={colors.mutedForeground} />
              <Text style={s.emptyResultsTitle}>No recognitions yet</Text>
              <Text style={s.emptyResultsSubtitle}>Start a session to track attendance.</Text>
            </View>
          ) : (
            <>
              {Array.from(allRecognizedStudents).map((sid) => {
                const student = students.find((st) => st.id === sid);
                if (!student) return null;
                return (
                  <View key={sid} style={s.recognizedRow}>
                    <View style={s.recognizedAvatar}>
                      <CheckCircle size={16} color={colors.success} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.recognizedName}>{student.name}</Text>
                      <Text style={s.recognizedEmail}>{student.email}</Text>
                    </View>
                  </View>
                );
              })}
            </>
          )}

          {/* Submit hint + button */}
          {recognizedCount > 0 && (
            <View style={{ marginTop: 12 }}>
              <Text style={s.submitHint}>💡 You can submit now or wait until the session ends</Text>
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
                      Submit Attendance · {recognizedCount}/{students.length} ({attendanceRate}%)
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Info Card */}
        <View style={s.infoCard}>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
            <Info size={14} color={colors.accent} style={{ marginRight: 6 }} />
            <Text style={s.infoTitle}>How cumulative attendance works</Text>
          </View>
          {[
            'Click "Start" → camera activates automatically',
            "First face capture runs immediately",
            "Auto-captures every 2 minutes thereafter",
            "Once recognized, students stay marked present",
            "Submit at end to save the session record",
          ].map((step, i) => (
            <Text key={i} style={s.infoStep}>{i + 1}. {step}</Text>
          ))}
          <View style={s.infoHighlight}>
            <Text style={s.infoHighlightText}>✨ Students only need to be detected once — no need to stay in frame!</Text>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.secondary },
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

  cameraCard: { backgroundColor: colors.foreground, borderRadius: 16, padding: 16, marginBottom: 16 },
  cameraTitleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  cameraTitle: { fontSize: 16, fontWeight: "700", color: colors.primaryForeground },
  cameraSubtitle: { fontSize: 12, color: colors.mutedForeground, marginTop: 2 },
  liveBadge: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(239,68,68,0.9)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.background, marginRight: 5 },
  liveText: { color: colors.primaryForeground, fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },

  cameraContainer: { width: "100%", height: 280, borderRadius: 12, overflow: "hidden", backgroundColor: colors.foreground, marginBottom: 16, position: "relative" },
  camera: { width: "100%", height: "100%" },

  cameraOverlayTop: { position: "absolute", top: 10, right: 10, zIndex: 10 },
  capturingBadge: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(239,68,68,0.85)", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  capturingText: { color: colors.primaryForeground, fontSize: 11, fontWeight: "600", marginLeft: 6 },
  cameraOverlayBottom: { position: "absolute", bottom: 10, left: 10, right: 10, alignItems: "center", zIndex: 10 },
  captureCountText: { color: colors.primaryForeground, fontSize: 11, fontWeight: "600", backgroundColor: "rgba(0,0,0,0.6)", paddingHorizontal: 12, paddingVertical: 5, borderRadius: 14 },

  startOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(15,23,42,0.75)", zIndex: 5 },
  startOverlayTitle: { color: colors.primaryForeground, fontSize: 15, fontWeight: "700", marginTop: 10, textAlign: "center" },
  startOverlaySubtitle: { color: colors.mutedForeground, fontSize: 11, textAlign: "center", lineHeight: 18, marginTop: 4 },
  warningText: { color: "#FCD34D", fontSize: 11, fontWeight: "600", marginTop: 10 },

  startBtn: { flexDirection: "row", backgroundColor: colors.accent, paddingVertical: 14, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  startBtnText: { color: colors.primaryForeground, fontSize: 15, fontWeight: "700" },
  activeControlsRow: { flexDirection: "row", gap: 8 },
  pauseBtn: { flex: 1, flexDirection: "row", backgroundColor: "#FFFBEB", paddingVertical: 11, borderRadius: 10, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(245,158,11,0.3)" },
  pauseBtnText: { color: "#B45309", fontSize: 12, fontWeight: "700" },
  resumeBtn: { flex: 1, flexDirection: "row", backgroundColor: colors.accent, paddingVertical: 11, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  resumeBtnText: { color: colors.primaryForeground, fontSize: 12, fontWeight: "700" },
  stopBtn: { flex: 1, flexDirection: "row", backgroundColor: colors.background, paddingVertical: 11, borderRadius: 10, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(239,68,68,0.3)" },
  stopBtnText: { color: colors.danger, fontSize: 12, fontWeight: "700" },
  manualCaptureBtn: { flex: 2, flexDirection: "row", backgroundColor: colors.primaryDark, paddingVertical: 11, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  manualCaptureBtnText: { color: colors.primaryForeground, fontSize: 12, fontWeight: "700" },

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
  infoHighlightText: { fontSize: 11, color: "#92400E", fontWeight: "600" },

  centerContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 30 },
  permTitle: { fontSize: 18, fontWeight: "700", color: colors.foreground, marginTop: 16 },
  permSubtitle: { fontSize: 13, color: colors.mutedForeground, textAlign: "center", marginTop: 6 },
});
