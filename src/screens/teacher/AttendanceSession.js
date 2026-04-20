import React, { useState, useRef, useEffect } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  ScrollView, ActivityIndicator, Alert, PermissionsAndroid, Platform
} from "react-native";
import { Camera } from "react-native-camera-kit";
import { Theme } from "../../theme/Theme";
import { recognizeFaces, submitAttendance, getCourseAttendance } from "../../api/teacherApi";
import {
  Users, ScanFace, Play, Square, Send,
  Clock, CheckCircle, Camera as CameraIcon, Info, History
} from "lucide-react-native";

const SESSION_DURATION = 45 * 60; // 45 minutes in seconds
const CAPTURE_INTERVAL = 2 * 60 * 1000; // 2 minutes in ms

export default function AttendanceSession({ route, navigation }) {
  const { course, studentCount, trainedCount, notTrainedCount } = route.params;

  const cameraRef = useRef(null);

  // Session state
  const [hasPermission, setHasPermission] = useState(false);
  const [sessionActive, setSessionActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(SESSION_DURATION);
  const [batchId, setBatchId] = useState(null);
  const [captureCount, setCaptureCount] = useState(0);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Recognition results (cumulative)
  const [recognizedStudents, setRecognizedStudents] = useState(new Map());
  const [lastCaptureTime, setLastCaptureTime] = useState(null);

  // History
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Refs for intervals
  const captureIntervalRef = useRef(null);
  const timerRef = useRef(null);
  const sessionActiveRef = useRef(false);
  const isCapturingRef = useRef(false);

  // Keep refs in sync
  useEffect(() => {
    sessionActiveRef.current = sessionActive;
  }, [sessionActive]);
  useEffect(() => {
    isCapturingRef.current = isCapturing;
  }, [isCapturing]);

  // Request camera permission
  useEffect(() => {
    (async () => {
      if (Platform.OS === "android") {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: "Camera Permission",
            message: "Facidance needs camera access to capture attendance.",
            buttonPositive: "OK",
          }
        );
        setHasPermission(granted === PermissionsAndroid.RESULTS.GRANTED);
      } else {
        setHasPermission(true);
      }
    })();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (captureIntervalRef.current) clearInterval(captureIntervalRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Session countdown timer
  useEffect(() => {
    if (sessionActive && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            clearInterval(captureIntervalRef.current);
            setSessionActive(false);
            Alert.alert("Session Ended", "The 45-minute session has ended. Review and submit attendance.");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timerRef.current);
    }
  }, [sessionActive]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Capture a frame from the live camera and send for recognition
  const captureAndRecognize = async () => {
    if (isCapturingRef.current || !cameraRef.current) return;

    try {
      setIsCapturing(true);

      // Capture frame from live camera preview
      const image = await cameraRef.current.capture();
      if (!image?.uri) {
        console.log("No frame captured");
        return;
      }

      // Send frame to backend for face recognition
      const result = await recognizeFaces(
        course.id,
        [{ uri: image.uri, type: "image/jpeg", name: `frame_${captureCount}.jpg` }],
        batchId
      );

      // Update batch ID
      if (result?.batchId && !batchId) {
        setBatchId(result.batchId);
      }

      // Accumulate recognized students (cumulative — once detected, stays present)
      if (result?.recognized && Array.isArray(result.recognized)) {
        setRecognizedStudents((prev) => {
          const updated = new Map(prev);
          result.recognized.forEach((student) => {
            const sid = student.studentId || student.id;
            if (sid && !updated.has(sid)) {
              updated.set(sid, {
                name: student.name || student.studentName || "Unknown",
                email: student.email || "",
                firstSeen: new Date().toLocaleTimeString(),
                confidence: student.confidence || 0,
              });
            }
          });
          return updated;
        });
      }

      setCaptureCount((prev) => prev + 1);
      setLastCaptureTime(new Date().toLocaleTimeString());
    } catch (e) {
      console.log("Capture/recognize error:", e);
    } finally {
      setIsCapturing(false);
    }
  };

  // Start the 45-minute session
  const startSession = () => {
    setSessionActive(true);
    setTimeLeft(SESSION_DURATION);
    setRecognizedStudents(new Map());
    setCaptureCount(0);
    setBatchId(null);
    setLastCaptureTime(null);

    // First capture after a short delay (camera needs a moment)
    setTimeout(() => captureAndRecognize(), 2000);

    // Auto-capture every 2 minutes
    captureIntervalRef.current = setInterval(() => {
      if (sessionActiveRef.current) {
        captureAndRecognize();
      }
    }, CAPTURE_INTERVAL);
  };

  // Stop session
  const stopSession = () => {
    Alert.alert(
      "Stop Session",
      "Are you sure you want to stop the session?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Stop",
          style: "destructive",
          onPress: () => {
            clearInterval(captureIntervalRef.current);
            clearInterval(timerRef.current);
            setSessionActive(false);
          },
        },
      ]
    );
  };

  // Submit attendance
  const handleSubmit = async () => {
    if (recognizedStudents.size === 0) {
      Alert.alert("No Students", "No students were recognized in this session.");
      return;
    }

    try {
      setIsSubmitting(true);
      const presentIds = Array.from(recognizedStudents.keys());
      await submitAttendance(course.id, batchId, presentIds);
      Alert.alert(
        "Attendance Submitted",
        `${recognizedStudents.size} student(s) marked present.`,
        [{ text: "OK", onPress: () => navigation.goBack() }]
      );
    } catch (e) {
      console.log("Submit error:", e);
      Alert.alert("Error", e.message || "Failed to submit attendance.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Load history
  const loadHistory = async () => {
    try {
      setIsLoadingHistory(true);
      const data = await getCourseAttendance(course.id);
      setHistory(Array.isArray(data) ? data : (data?.sessions || data?.history || []));
    } catch (e) {
      console.log("History error:", e);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const toggleHistory = () => {
    if (!showHistory) loadHistory();
    setShowHistory(!showHistory);
  };

  // Permission not granted
  if (!hasPermission) {
    return (
      <SafeAreaView style={s.safeArea}>
        <View style={s.centerContainer}>
          <CameraIcon size={48} color="#94A3B8" />
          <Text style={s.permTitle}>Camera Permission Required</Text>
          <Text style={s.permSubtitle}>Please grant camera access to capture attendance.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safeArea}>
      <ScrollView contentContainerStyle={s.container} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={s.header}>
          <View style={{ flex: 1 }}>
            <Text style={s.title}>AI Attendance Session</Text>
            <Text style={s.subtitle}>{course.name}</Text>
          </View>
          <TouchableOpacity style={s.historyBtn} onPress={toggleHistory} activeOpacity={0.7}>
            <History size={14} color="#475569" style={{ marginRight: 4 }} />
            <Text style={s.historyBtnText}>{showHistory ? "Hide" : "View"} History</Text>
          </TouchableOpacity>
        </View>

        {/* Stats Row */}
        <View style={s.statsRow}>
          <View style={s.statCard}>
            <Text style={s.statLabel}>TOTAL STUDENTS</Text>
            <Text style={s.statNumber}>{studentCount}</Text>
          </View>
          <View style={s.statCard}>
            <Text style={s.statLabel}>TRAINED STUDENTS</Text>
            <Text style={[s.statNumber, { color: Theme.colors.accent }]}>{trainedCount}</Text>
          </View>
          <View style={s.statCard}>
            <Text style={s.statLabel}>NOT TRAINED</Text>
            <Text style={[s.statNumber, { color: "#EF4444" }]}>{notTrainedCount}</Text>
          </View>
        </View>

        {/* History Section */}
        {showHistory && (
          <View style={s.historyCard}>
            <Text style={s.historyTitle}>Attendance History</Text>
            <Text style={s.historySubtitle}>Past sessions for this course</Text>
            {isLoadingHistory ? (
              <ActivityIndicator size="small" color={Theme.colors.accent} style={{ marginVertical: 20 }} />
            ) : history.length === 0 ? (
              <Text style={s.emptyText}>No past sessions found.</Text>
            ) : (
              history.map((session, i) => (
                <View key={i} style={s.historyRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.historyDate}>
                      {new Date(session.date || session.createdAt).toLocaleDateString("en-US", {
                        weekday: "long", year: "numeric", month: "long", day: "numeric",
                      })}
                    </Text>
                    <Text style={s.historyCourseName}>{course.name}</Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={s.historyCount}>
                      <Text style={{ color: Theme.colors.accent }}>{session.presentCount || session.present || 0}</Text>
                      {" / "}{session.totalCount || session.total || studentCount}
                    </Text>
                    {(session.percentage || session.rate) ? (
                      <View style={s.historyPercentBadge}>
                        <Text style={s.historyPercentText}>
                          {session.percentage || session.rate}%
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              ))
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

          {/* Camera Preview */}
          <View style={s.cameraContainer}>
            <Camera
              ref={cameraRef}
              style={s.camera}
              cameraType="back"
              flashMode="off"
            />

            {/* Overlay: Timer + Status */}
            <View style={s.cameraOverlayTop}>
              {sessionActive && (
                <View style={s.timerBadge}>
                  <Clock size={12} color="#FFF" style={{ marginRight: 4 }} />
                  <Text style={s.timerText}>{formatTime(timeLeft)}</Text>
                </View>
              )}
              {isCapturing && (
                <View style={s.capturingBadge}>
                  <ActivityIndicator size="small" color="#FFF" />
                  <Text style={s.capturingText}>Recognizing...</Text>
                </View>
              )}
            </View>

            {/* Capture count overlay bottom */}
            {sessionActive && (
              <View style={s.cameraOverlayBottom}>
                <Text style={s.captureCountText}>
                  Captures: {captureCount} {lastCaptureTime ? `· Last: ${lastCaptureTime}` : ""}
                </Text>
              </View>
            )}

            {/* "Start" overlay when not active */}
            {!sessionActive && captureCount === 0 && (
              <View style={s.startOverlay}>
                <CameraIcon size={28} color="#FFF" />
                <Text style={s.startOverlayTitle}>Ready to capture attendance</Text>
                <Text style={s.startOverlaySubtitle}>
                  45-minute session · auto-capture every 2 min{"\n"}· cumulative recognition
                </Text>
              </View>
            )}
          </View>

          {/* Session Controls */}
          {!sessionActive ? (
            <TouchableOpacity style={s.startBtn} onPress={startSession} activeOpacity={0.8}>
              <Play size={16} color="#FFF" style={{ marginRight: 8 }} />
              <Text style={s.startBtnText}>Start 45-Min Session</Text>
            </TouchableOpacity>
          ) : (
            <View style={s.activeControlsRow}>
              <TouchableOpacity style={s.stopBtn} onPress={stopSession} activeOpacity={0.8}>
                <Square size={14} color="#FFF" style={{ marginRight: 6 }} />
                <Text style={s.stopBtnText}>Stop</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.manualCaptureBtn, isCapturing && { opacity: 0.6 }]}
                onPress={captureAndRecognize}
                disabled={isCapturing}
                activeOpacity={0.8}
              >
                <CameraIcon size={14} color="#FFF" style={{ marginRight: 6 }} />
                <Text style={s.manualCaptureBtnText}>{isCapturing ? "Capturing..." : "Manual Capture"}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Session Attendance (recognized students) */}
        <View style={s.resultsCard}>
          <Text style={s.resultsTitle}>Session Attendance</Text>
          <Text style={s.resultsSubtitle}>Cumulative recognized students</Text>

          {recognizedStudents.size === 0 ? (
            <View style={s.emptyResultsContainer}>
              <ScanFace size={32} color="#CBD5E1" />
              <Text style={s.emptyResultsTitle}>No recognitions yet</Text>
              <Text style={s.emptyResultsSubtitle}>Start a session to track attendance.</Text>
            </View>
          ) : (
            <>
              <View style={s.recognizedHeader}>
                <Text style={s.recognizedCount}>
                  {recognizedStudents.size} / {studentCount} present
                </Text>
              </View>
              {Array.from(recognizedStudents.entries()).map(([id, student]) => (
                <View key={id} style={s.recognizedRow}>
                  <View style={s.recognizedAvatar}>
                    <CheckCircle size={16} color="#10B981" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.recognizedName}>{student.name}</Text>
                    {student.email ? <Text style={s.recognizedEmail}>{student.email}</Text> : null}
                  </View>
                  <Text style={s.recognizedTime}>@ {student.firstSeen}</Text>
                </View>
              ))}
            </>
          )}

          {/* Submit button */}
          {recognizedStudents.size > 0 && !sessionActive && (
            <TouchableOpacity
              style={[s.submitBtn, isSubmitting && { opacity: 0.6 }]}
              onPress={handleSubmit}
              disabled={isSubmitting}
              activeOpacity={0.8}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <Send size={14} color="#FFF" style={{ marginRight: 8 }} />
                  <Text style={s.submitBtnText}>Submit Attendance ({recognizedStudents.size} present)</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Info Card */}
        <View style={s.infoCard}>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
            <Info size={14} color={Theme.colors.accent} style={{ marginRight: 6 }} />
            <Text style={s.infoTitle}>How cumulative attendance works</Text>
          </View>
          <Text style={s.infoStep}>• Click "Start" → camera activates automatically</Text>
          <Text style={s.infoStep}>• First face capture runs immediately</Text>
          <Text style={s.infoStep}>• Auto-captures every 2 minutes thereafter</Text>
          <Text style={s.infoStep}>• Once recognized, students stay marked present</Text>
          <Text style={s.infoStep}>• Submit at end to save the session record</Text>
          <View style={s.infoHighlight}>
            <Text style={s.infoHighlightText}>Students only need to be detected once — no need to stay in frame!</Text>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F8FAFC" },
  container: { padding: 20, paddingBottom: 40 },

  // Header
  header: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16, marginTop: 8 },
  title: { fontSize: 22, fontWeight: "800", color: "#0F172A" },
  subtitle: { fontSize: 13, color: "#64748B", marginTop: 2 },
  historyBtn: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFF", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: "#E2E8F0" },
  historyBtnText: { fontSize: 11, fontWeight: "600", color: "#475569" },

  // Stats
  statsRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16, gap: 8 },
  statCard: { flex: 1, backgroundColor: "#FFF", borderRadius: 12, padding: 14, borderWidth: 1, borderColor: "#E2E8F0" },
  statLabel: { fontSize: 8, fontWeight: "700", color: "#94A3B8", letterSpacing: 0.4, marginBottom: 6 },
  statNumber: { fontSize: 22, fontWeight: "800", color: "#0F172A" },

  // Camera
  cameraCard: { backgroundColor: "#1E293B", borderRadius: 16, padding: 16, marginBottom: 16 },
  cameraTitleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  cameraTitle: { fontSize: 16, fontWeight: "700", color: "#FFF" },
  cameraSubtitle: { fontSize: 12, color: "#94A3B8", marginTop: 2 },
  liveBadge: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(239,68,68,0.9)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#FFF", marginRight: 5 },
  liveText: { color: "#FFF", fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },

  cameraContainer: { width: "100%", height: 280, borderRadius: 12, overflow: "hidden", backgroundColor: "#0F172A", marginBottom: 16, position: "relative" },
  camera: { width: "100%", height: "100%" },

  // Camera overlays
  cameraOverlayTop: { position: "absolute", top: 10, left: 10, right: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", zIndex: 10 },
  timerBadge: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(0,0,0,0.7)", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  timerText: { color: "#FFF", fontSize: 14, fontWeight: "700", fontVariant: ["tabular-nums"] },
  capturingBadge: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(239,68,68,0.85)", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  capturingText: { color: "#FFF", fontSize: 11, fontWeight: "600", marginLeft: 6 },

  cameraOverlayBottom: { position: "absolute", bottom: 10, left: 10, right: 10, alignItems: "center", zIndex: 10 },
  captureCountText: { color: "#FFF", fontSize: 11, fontWeight: "600", backgroundColor: "rgba(0,0,0,0.6)", paddingHorizontal: 12, paddingVertical: 5, borderRadius: 14 },

  startOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(15,23,42,0.75)", zIndex: 5 },
  startOverlayTitle: { color: "#FFF", fontSize: 15, fontWeight: "700", marginTop: 10, textAlign: "center" },
  startOverlaySubtitle: { color: "#94A3B8", fontSize: 11, textAlign: "center", lineHeight: 18, marginTop: 4 },

  // Controls
  startBtn: { flexDirection: "row", backgroundColor: Theme.colors.accent, paddingVertical: 14, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  startBtnText: { color: "#FFF", fontSize: 15, fontWeight: "700" },
  activeControlsRow: { flexDirection: "row", gap: 10 },
  stopBtn: { flex: 1, flexDirection: "row", backgroundColor: "#EF4444", paddingVertical: 12, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  stopBtnText: { color: "#FFF", fontSize: 13, fontWeight: "700" },
  manualCaptureBtn: { flex: 2, flexDirection: "row", backgroundColor: Theme.colors.accent, paddingVertical: 12, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  manualCaptureBtnText: { color: "#FFF", fontSize: 13, fontWeight: "700" },

  // Results
  resultsCard: { backgroundColor: "#FFF", borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: "#E2E8F0" },
  resultsTitle: { fontSize: 16, fontWeight: "700", color: "#0F172A" },
  resultsSubtitle: { fontSize: 12, color: "#94A3B8", marginTop: 2, marginBottom: 14 },

  emptyResultsContainer: { alignItems: "center", paddingVertical: 30 },
  emptyResultsTitle: { fontSize: 15, fontWeight: "700", color: "#64748B", marginTop: 10 },
  emptyResultsSubtitle: { fontSize: 12, color: "#94A3B8", marginTop: 4 },

  recognizedHeader: { borderBottomWidth: 1, borderBottomColor: "#F1F5F9", paddingBottom: 10, marginBottom: 6 },
  recognizedCount: { fontSize: 13, fontWeight: "700", color: "#475569" },

  recognizedRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#F8FAFC" },
  recognizedAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#F0FDF4", justifyContent: "center", alignItems: "center", marginRight: 10 },
  recognizedName: { fontSize: 13, fontWeight: "700", color: "#1E293B" },
  recognizedEmail: { fontSize: 10, color: "#94A3B8", marginTop: 1 },
  recognizedTime: { fontSize: 10, color: "#94A3B8", fontWeight: "600" },

  submitBtn: { flexDirection: "row", backgroundColor: Theme.colors.primaryDark, paddingVertical: 14, borderRadius: 12, alignItems: "center", justifyContent: "center", marginTop: 14 },
  submitBtnText: { color: "#FFF", fontSize: 14, fontWeight: "700" },

  // History
  historyCard: { backgroundColor: "#FFF", borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: "#E2E8F0" },
  historyTitle: { fontSize: 16, fontWeight: "700", color: "#0F172A" },
  historySubtitle: { fontSize: 12, color: "#94A3B8", marginTop: 2, marginBottom: 14 },
  historyRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  historyDate: { fontSize: 14, fontWeight: "700", color: "#1E293B" },
  historyCourseName: { fontSize: 11, color: "#94A3B8", marginTop: 2 },
  historyCount: { fontSize: 13, fontWeight: "600", color: "#475569" },
  historyPercentBadge: { backgroundColor: "#F0FDF4", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, marginTop: 4 },
  historyPercentText: { fontSize: 10, fontWeight: "700", color: "#10B981" },

  // Info
  infoCard: { backgroundColor: "#FFF", borderRadius: 14, padding: 18, borderWidth: 1, borderColor: "#E2E8F0", marginBottom: 16 },
  infoTitle: { fontSize: 14, fontWeight: "700", color: "#1E293B" },
  infoStep: { fontSize: 12, color: "#64748B", lineHeight: 20, marginBottom: 2 },
  infoHighlight: { backgroundColor: "#FEF3C7", borderRadius: 8, padding: 10, marginTop: 10 },
  infoHighlightText: { fontSize: 11, color: "#92400E", fontWeight: "600" },

  // Permission
  centerContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 30 },
  permTitle: { fontSize: 18, fontWeight: "700", color: "#1E293B", marginTop: 16 },
  permSubtitle: { fontSize: 13, color: "#64748B", textAlign: "center", marginTop: 6 },

  emptyText: { fontSize: 13, color: "#94A3B8", textAlign: "center", paddingVertical: 16 },
});
