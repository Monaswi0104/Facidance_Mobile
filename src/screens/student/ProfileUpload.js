import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image, SafeAreaView, ScrollView, Alert, ActivityIndicator, Dimensions } from "react-native";
import { launchImageLibrary, launchCamera } from "react-native-image-picker";
import { uploadFacePhotos, getStudentMe } from "../../api/studentApi";
import { Theme, useTheme } from "../../theme/Theme";
import { User, Mail, GraduationCap, Building2, Calendar, ScanFace, Camera, Upload, X, CheckCircle, Shield } from "lucide-react-native";

const uploadSteps = [
  { key: "front", label: "Front View", desc: "Look straight at the camera" },
  { key: "left", label: "Left Profile", desc: "Turn your head slightly to the left" },
  { key: "right", label: "Right Profile", desc: "Turn your head slightly to the right" },
];

export default function ProfileUpload() {
  const { colors, isDark } = useTheme();

  const [images, setImages] = useState({ front: null, left: null, right: null });
  const [isUploading, setIsUploading] = useState(false);
  const [isUploaded, setIsUploaded] = useState(false);
  
  const [studentInfo, setStudentInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const meData = await getStudentMe();
        setStudentInfo(meData);
      } catch (e) {
        console.log("Could not load student info:", e);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const handleSubmitUpload = async () => {
    const allUploaded = images.front && images.left && images.right;
    if (!allUploaded) {
      Alert.alert("Incomplete", "Please upload all 3 face images before submitting.");
      return;
    }

    const studentId = studentInfo?.id || studentInfo?.studentId;
    if (!studentId) return;

    setIsUploading(true);
    try {
      const result = await uploadFacePhotos(images, studentId);

      if (result.message || !result.error) {
        setIsUploaded(true);
        const updatedMe = await getStudentMe();
        setStudentInfo(updatedMe);
        Alert.alert("Upload Successful!", result.message || "Your face images have been successfully uploaded and processed.");
      } else {
        Alert.alert("Upload Failed", result.error || "Server returned an error. Please try again later.");
      }
    } catch (error) {
      Alert.alert("Upload Failed", "Could not connect to the server. Please check your connection.");
    } finally {
      setIsUploading(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
         <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color={Theme.colors.accent} />
         </View>
      </SafeAreaView>
    );
  }

  const name = studentInfo?.name || studentInfo?.student?.user?.name || "Student Name";
  const email = studentInfo?.email || studentInfo?.student?.user?.email || "student@example.com";
  const joinDateRaw = studentInfo?.student?.joined_at || studentInfo?.created_at || studentInfo?.student?.createdAt;
  const program = studentInfo?.student?.program_name || studentInfo?.student?.program?.name || "Program Name";
  const department = studentInfo?.student?.department_name || studentInfo?.student?.program?.department?.name || "Department";
  const joinedDate = joinDateRaw ? new Date(joinDateRaw).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : "Unknown";
  const faceRegistered = studentInfo?.student?.face_embedding || studentInfo?.student?.hasFaceEmbedding || isUploaded;
  const uploadedCount = Object.values(images).filter(Boolean).length;
  const initial = name.charAt(0).toUpperCase();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.headerSection}>
          <Text style={styles.title}>My Profile</Text>
          <Text style={styles.subtitle}>Your personal details and face recognition setup.</Text>
        </View>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          {/* Top: Avatar + Name + Face Status */}
          <View style={styles.profileTopRow}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarLetter}>{initial}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.profileName}>{name}</Text>
              <Text style={styles.profileEmail}>{email}</Text>
              <View style={styles.profileBadges}>
                <View style={styles.studentBadge}>
                  <Text style={styles.studentBadgeText}>Student</Text>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Calendar size={11} color={Theme.colors.mutedForeground} style={{ marginRight: 3 }} />
                  <Text style={styles.joinText}>Joined {joinedDate}</Text>
                </View>
              </View>
            </View>
            {faceRegistered ? (
              <View style={styles.faceActiveBadge}>
                <ScanFace size={12} color="#059669" style={{ marginRight: 4 }} />
                <Text style={styles.faceActiveText}>Face recognition active</Text>
              </View>
            ) : (
              <View style={[styles.faceActiveBadge, { backgroundColor: "rgba(239,68,68,0.08)", borderColor: "#FECACA" }]}>
                <X size={12} color="#EF4444" style={{ marginRight: 4 }} />
                <Text style={[styles.faceActiveText, { color: Theme.colors.destructive }]}>Face not registered</Text>
              </View>
            )}
          </View>

          {/* Details Grid */}
          <View style={styles.detailsGrid}>
            <View style={styles.detailBox}>
              <View style={styles.detailBoxHeader}>
                <User size={12} color={Theme.colors.mutedForeground} style={{ marginRight: 4 }} />
                <Text style={styles.detailBoxLabel}>FULL NAME</Text>
              </View>
              <Text style={styles.detailBoxValue}>{name}</Text>
            </View>
            <View style={styles.detailBox}>
              <View style={styles.detailBoxHeader}>
                <Mail size={12} color={Theme.colors.mutedForeground} style={{ marginRight: 4 }} />
                <Text style={styles.detailBoxLabel}>EMAIL</Text>
              </View>
              <Text style={styles.detailBoxValue} numberOfLines={1}>{email}</Text>
            </View>
            <View style={styles.detailBox}>
              <View style={styles.detailBoxHeader}>
                <GraduationCap size={12} color={Theme.colors.mutedForeground} style={{ marginRight: 4 }} />
                <Text style={styles.detailBoxLabel}>PROGRAM</Text>
              </View>
              <Text style={styles.detailBoxValue}>{program}</Text>
            </View>
            <View style={styles.detailBox}>
              <View style={styles.detailBoxHeader}>
                <Building2 size={12} color={Theme.colors.mutedForeground} style={{ marginRight: 4 }} />
                <Text style={styles.detailBoxLabel}>DEPARTMENT</Text>
              </View>
              <Text style={styles.detailBoxValue}>{department}</Text>
            </View>
          </View>
        </View>

        {/* Face Recognition Setup */}
        <View style={styles.faceCard}>
          <View style={styles.faceCardHeader}>
            <View style={styles.faceCardIconBg}>
              <Camera size={16} color={Theme.colors.primaryForeground} />
            </View>
            <View>
              <Text style={styles.faceCardTitle}>Face Recognition Setup</Text>
              <Text style={styles.faceCardSubtitle}>Upload photos for automatic AI attendance marking</Text>
            </View>
          </View>

          {/* 3 Upload Columns */}
          <View style={styles.uploadGrid}>
            {uploadSteps.map(step => (
              <View key={step.key} style={styles.uploadCol}>
                <Text style={styles.colLabel}>{step.label}</Text>
                <Text style={styles.colDesc}>{step.desc}</Text>

                {images[step.key] ? (
                  <View style={styles.previewBox}>
                    <Image source={{ uri: images[step.key] }} style={styles.previewImg} />
                    <TouchableOpacity style={styles.clearBtn} onPress={() => setImages(prev => ({ ...prev, [step.key]: null }))}>
                      <X size={12} color={Theme.colors.primaryForeground} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={{ gap: 6 }}>
                    <TouchableOpacity style={styles.cameraBtn} onPress={() => {
                      launchCamera({ mediaType: "photo", cameraType: "front", quality: 0.8 }, (res) => {
                        if (res.assets) setImages((prev) => ({ ...prev, [step.key]: res.assets[0].uri }));
                      });
                    }}>
                      <Camera size={12} color={Theme.colors.primaryForeground} style={{ marginRight: 4 }} />
                      <Text style={styles.cameraBtnText}>Use Camera</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.uploadBtn} onPress={() => {
                      launchImageLibrary({ mediaType: "photo", quality: 0.8 }, (res) => {
                        if (res.assets) setImages((prev) => ({ ...prev, [step.key]: res.assets[0].uri }));
                      });
                    }}>
                      <Upload size={12} color={Theme.colors.textBody} style={{ marginRight: 4 }} />
                      <Text style={styles.uploadBtnText}>Upload Image</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))}
          </View>

          {/* Footer */}
          <View style={styles.faceFooter}>
            <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
              <Shield size={12} color={Theme.colors.mutedForeground} style={{ marginRight: 6 }} />
              <Text style={styles.faceFooterText}>Photos are stored securely and used only for AI attendance verification.</Text>
            </View>
            <TouchableOpacity
              style={[
                styles.submitBtn,
                uploadedCount < 3 && styles.submitBtnDisabled,
                isUploaded && styles.submitBtnSuccess,
              ]}
              onPress={handleSubmitUpload}
              disabled={uploadedCount < 3 || isUploading || isUploaded}
              activeOpacity={0.8}
            >
              {isUploading ? (
                <ActivityIndicator color={Theme.colors.primaryForeground} size="small" />
              ) : (
                <>
                  {isUploaded ? (
                    <CheckCircle size={13} color={Theme.colors.primaryForeground} style={{ marginRight: 4 }} />
                  ) : (
                    <Upload size={13} color={uploadedCount < 3 ? Theme.colors.mutedForeground : Theme.colors.primaryForeground} style={{ marginRight: 4 }} />
                  )}
                  <Text style={[styles.submitBtnText, uploadedCount < 3 && { color: Theme.colors.mutedForeground }]}>
                    {isUploaded ? "Photos Submitted" : "Submit Photos"}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Theme.colors.secondary },
  container: { padding: 20, paddingBottom: 40 },

  // Header
  headerSection: { marginBottom: 18, marginTop: 8 },
  title: { fontSize: 24, fontWeight: "800", color: Theme.colors.foreground },
  subtitle: { fontSize: 13, color: Theme.colors.mutedForeground, marginTop: 3 },

  // Profile Card
  profileCard: {
    backgroundColor: Theme.colors.background,
    borderRadius: 14,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    shadowColor: Theme.colors.foreground,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  profileTopRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 18, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: Theme.colors.muted },
  avatarCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: Theme.colors.primaryDark, justifyContent: "center", alignItems: "center", marginRight: 12 },
  avatarLetter: { fontSize: 18, fontWeight: "800", color: Theme.colors.primaryForeground },
  profileName: { fontSize: 16, fontWeight: "700", color: Theme.colors.foreground, marginBottom: 1 },
  profileEmail: { fontSize: 11, color: Theme.colors.mutedForeground, marginBottom: 6 },
  profileBadges: { flexDirection: "row", alignItems: "center" },
  studentBadge: { backgroundColor: "#F0FDF4", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, borderWidth: 1, borderColor: "#DCFCE7", marginRight: 8 },
  studentBadgeText: { fontSize: 10, fontWeight: "700", color: "#10B981" },
  joinText: { fontSize: 10, color: Theme.colors.mutedForeground },
  faceActiveBadge: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#F0FDF4", borderWidth: 1, borderColor: "#DCFCE7",
    paddingHorizontal: 8, paddingVertical: 6, borderRadius: 10,
  },
  faceActiveText: { fontSize: 9, fontWeight: "700", color: "#059669" },

  // Details Grid
  detailsGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  detailBox: { width: "48%", marginBottom: 14 },
  detailBoxHeader: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  detailBoxLabel: { fontSize: 8, fontWeight: "700", color: Theme.colors.mutedForeground, letterSpacing: 0.5 },
  detailBoxValue: { fontSize: 13, fontWeight: "600", color: Theme.colors.foreground },

  // Face Recognition Card
  faceCard: {
    backgroundColor: Theme.colors.background,
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    shadowColor: Theme.colors.foreground,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  faceCardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 18 },
  faceCardIconBg: { width: 36, height: 36, borderRadius: 10, backgroundColor: Theme.colors.primaryDark, justifyContent: "center", alignItems: "center", marginRight: 12 },
  faceCardTitle: { fontSize: 16, fontWeight: "700", color: Theme.colors.foreground },
  faceCardSubtitle: { fontSize: 11, color: Theme.colors.mutedForeground },

  // Upload Grid
  uploadGrid: { flexDirection: "row", justifyContent: "space-between", marginBottom: 18 },
  uploadCol: { width: "31%" },
  colLabel: { fontSize: 12, fontWeight: "700", color: Theme.colors.foreground, marginBottom: 2 },
  colDesc: { fontSize: 9, color: Theme.colors.mutedForeground, marginBottom: 10, minHeight: 24 },

  // Camera / Upload Buttons
  cameraBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: Theme.colors.primaryDark, borderRadius: 8, paddingVertical: 10,
  },
  cameraBtnText: { fontSize: 10, fontWeight: "600", color: Theme.colors.primaryForeground },
  uploadBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: Theme.colors.background, borderWidth: 1, borderColor: Theme.colors.border, borderRadius: 8, paddingVertical: 10,
  },
  uploadBtnText: { fontSize: 10, fontWeight: "600", color: Theme.colors.textBody },

  // Preview
  previewBox: { height: 110, borderRadius: 8, overflow: "hidden", position: "relative" },
  previewImg: { width: "100%", height: "100%" },
  clearBtn: { position: "absolute", top: 4, right: 4, width: 22, height: 22, borderRadius: 11, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },

  // Footer
  faceFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  faceFooterText: { fontSize: 10, color: Theme.colors.mutedForeground, flex: 1, marginRight: 10 },
  submitBtn: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: Theme.colors.primaryDark,
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8,
  },
  submitBtnText: { fontSize: 12, fontWeight: "600", color: Theme.colors.primaryForeground },
  submitBtnDisabled: { backgroundColor: Theme.colors.muted },
  submitBtnSuccess: { backgroundColor: "#10B981" },
});