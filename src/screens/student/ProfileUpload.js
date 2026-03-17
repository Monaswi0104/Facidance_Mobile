import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image, SafeAreaView, ScrollView, Alert, ActivityIndicator } from "react-native";
import { launchImageLibrary, launchCamera } from "react-native-image-picker";
import { uploadFacePhotos, getStudentMe, getStudentCourses, getAttendanceHistory } from "../../api/studentApi";

const uploadSteps = [
  { key: "front", label: "Front View", desc: "Look straight at the camera" },
  { key: "left", label: "Left Profile", desc: "Turn your head slightly to the left" },
  { key: "right", label: "Right Profile", desc: "Turn your head slightly to the right" },
];

export default function ProfileUpload() {

  const [images, setImages] = useState({ front: null, left: null, right: null });
  const [isUploading, setIsUploading] = useState(false);
  const [isUploaded, setIsUploaded] = useState(false);
  
  const [studentInfo, setStudentInfo] = useState(null);
  const [courses, setCourses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const [meData, coursesData] = await Promise.all([
          getStudentMe(),
          getStudentCourses()
        ]);
        
        setStudentInfo(meData);
        setCourses(Array.isArray(coursesData) ? coursesData : []);
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
        // Refresh student data to update faceRegistered status
        const updatedMe = await getStudentMe();
        setStudentInfo(updatedMe);
        Alert.alert(
          "Upload Successful! 🎉",
          result.message || "Your face images have been successfully uploaded and processed."
        );
      } else {
        Alert.alert("Upload Failed", result.error || "Server returned an error. Please try again later.");
      }
    } catch (error) {
      Alert.alert("Upload Failed", "Could not connect to the server. Please check your connection.");
    } finally {
      setIsUploading(false);
    }
  };

  const handlePickOption = (type) => {
    Alert.alert(
      "Choose Photo Source",
      "Capture from camera or upload existing images?",
      [
        {
          text: "📷 Camera",
          onPress: () => {
            launchCamera({ mediaType: "photo", cameraType: "front", quality: 0.8 }, (res) => {
              if (res.assets) setImages((prev) => ({ ...prev, [type]: res.assets[0].uri }));
            });
          },
        },
        {
          text: "🖼️ Gallery",
          onPress: () => {
            launchImageLibrary({ mediaType: "photo", quality: 0.8 }, (res) => {
              if (res.assets) setImages((prev) => ({ ...prev, [type]: res.assets[0].uri }));
            });
          },
        },
        { text: "Cancel", style: "cancel" },
      ]
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
         <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#4361EE" />
         </View>
      </SafeAreaView>
    );
  }

  const name = studentInfo?.student?.user?.name || studentInfo?.name || "Student Name";
  const email = studentInfo?.student?.user?.email || studentInfo?.email || "student@example.com";
  const joinDateRaw = studentInfo?.student?.createdAt || studentInfo?.createdAt;
  const program = studentInfo?.student?.program?.name || "Program Name";
  const department = studentInfo?.student?.program?.department?.name || "Department";
  
  // Use a string format for joinedAt
  const joinedDate = joinDateRaw ? new Date(joinDateRaw).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : "Unknown";
  
  // Checking face registration flag from user payload or embedding presence
  const faceRegistered = studentInfo?.student?.hasFaceEmbedding || isUploaded;

  const uploadedCount = Object.values(images).filter(Boolean).length;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        {/* Top Header Card */}
        <View style={styles.headerCard}>
          <View style={styles.headerTitleRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={styles.headerIconBox}>
                <Text style={{ fontSize: 20 }}>👤</Text>
              </View>
              <View style={{ flex: 1, paddingRight: 40 }}>
                <Text style={styles.headerTitle}>Student Profile</Text>
                <Text style={styles.headerSubtitle} numberOfLines={2}>View your basic details and set up face recognition for attendance.</Text>
              </View>
            </View>
          </View>

          <View style={styles.profileDetailsGrid}>
            <View style={styles.detailItem}>
              <View style={styles.detailIconBox}><Text style={{ fontSize: 16 }}>👤</Text></View>
              <View style={{ flex: 1, paddingRight: 4 }}>
                <Text style={styles.detailLabel}>Name</Text>
                <Text style={styles.detailValue}>{name}</Text>
              </View>
            </View>
            
            <View style={styles.detailItem}>
              <View style={[styles.detailIconBox, { backgroundColor: '#EEF2FF' }]}><Text style={{ fontSize: 16 }}>🎓</Text></View>
              <View style={{ flex: 1, paddingRight: 4 }}>
                <Text style={styles.detailLabel}>Program</Text>
                <Text style={styles.detailValue}>{program}</Text>
              </View>
            </View>

            <View style={styles.detailItem}>
              <View style={[styles.detailIconBox, { backgroundColor: '#F1F5F9' }]}><Text style={{ fontSize: 16 }}>✉️</Text></View>
              <View style={{ flex: 1, paddingRight: 4 }}>
                <Text style={styles.detailLabel}>Email</Text>
                <Text style={styles.detailValue}>{email}</Text>
              </View>
            </View>
            
            <View style={styles.detailItem}>
              <View style={[styles.detailIconBox, { backgroundColor: '#ECFEFF' }]}><Text style={{ fontSize: 16 }}>🏢</Text></View>
              <View style={{ flex: 1, paddingRight: 4 }}>
                <Text style={styles.detailLabel}>Department</Text>
                <Text style={styles.detailValue}>{department}</Text>
              </View>
            </View>
          </View>

          {/* Badges */}
          <View style={styles.badgesRow}>
            <View style={styles.joinBadge}>
              <Text style={{ fontSize: 14, marginRight: 6 }}>📅</Text>
              <Text style={styles.joinBadgeText}>Joined {joinedDate}</Text>
            </View>
            {faceRegistered ? (
               <View style={styles.statusBadge}>
                 <Text style={[styles.statusBadgeText, { color: '#059669' }]}>✓ Face recognition active</Text>
               </View>
            ) : (
               <View style={[styles.statusBadge, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
                 <Text style={[styles.statusBadgeText, { color: '#DC2626' }]}>✕ Face not registered</Text>
               </View>
            )}
          </View>
          
          <View style={styles.divider} />

          {/* Enrolled Courses list */}
          <Text style={styles.enrolledTitle}>Enrolled Courses ({courses.length})</Text>
          <View style={styles.coursesList}>
             {courses.map(c => {
                const acYear = c.semester?.academicYear;
                const acYearName = typeof acYear === 'object' ? acYear?.name : acYear;
                return (
                  <View key={c.id} style={styles.courseItem}>
                     <View style={{ flex: 1, paddingRight: 10 }}>
                        <Text style={styles.courseName}>{c.name}</Text>
                        <Text style={styles.courseSub}>{c.teacher?.user?.name || c.teacher?.name || "Teacher"} • {c.semester?.name} ({acYearName})</Text>
                     </View>
                     <Text style={styles.courseCode}>{c.entryCode || c.code}</Text>
                  </View>
                );
             })}
          </View>
        </View>

        {/* Recognition Status Banner */}
        <View style={styles.faceStatusBox}>
          <View style={styles.faceStatusHeader}>
            <Text style={{ fontSize: 18, marginRight: 8 }}>{faceRegistered ? '✅' : '⚠️'}</Text>
            <Text style={styles.faceStatusTitle}>Face Recognition Status</Text>
          </View>
          
          <Text style={styles.faceStatusDesc}>
            {faceRegistered 
              ? "Your face data is registered. You can still update your photos below for better recognition if needed." 
              : "You need to register your face data in order to mark attendance in class. Please upload your photos below."}
          </Text>
          
          <View style={styles.tipBox}>
             <Text style={styles.tipText}>
               Tip: Use clear lighting and avoid heavy filters or obstructions (caps, masks, etc.) for best accuracy.
             </Text>
          </View>
        </View>

        {/* Update Face Photos Section */}
        <View style={styles.photosCard}>
           <View style={styles.photosHeaderRow}>
             <Text style={styles.photosTitle}>Update Face Photos</Text>
             <Text style={styles.photosLabel}>FACE DATA</Text>
           </View>
           
           <Text style={styles.photosDesc}>
             Upload photos from three angles for accurate recognition. You can either <Text style={{fontWeight: '700'}}>capture from camera</Text> or <Text style={{fontWeight: '700'}}>upload existing images</Text>.
           </Text>
           
           <View style={styles.uploadGrid}>
             {uploadSteps.map(step => (
                <View key={step.key} style={styles.uploadCol}>
                   <Text style={styles.colLabel}>{step.label}</Text>
                   <Text style={styles.colDesc}>{step.desc}</Text>
                   
                   {images[step.key] ? (
                     <View style={styles.previewBox}>
                       <Image source={{ uri: images[step.key] }} style={styles.previewImg} />
                       <TouchableOpacity style={styles.clearBtn} onPress={() => setImages(prev => ({ ...prev, [step.key]: null }))}>
                          <Text style={styles.clearBtnText}>✕</Text>
                       </TouchableOpacity>
                     </View>
                   ) : (
                     <View style={styles.actionColumn}>
                         <TouchableOpacity style={styles.pickerBtn} onPress={() => {
                           launchCamera({ mediaType: "photo", cameraType: "front", quality: 0.8 }, (res) => {
                             if (res.assets) setImages((prev) => ({ ...prev, [step.key]: res.assets[0].uri }));
                           });
                         }}>
                            <Text style={styles.pickerBtnIcon}>📷</Text>
                            <Text style={styles.pickerBtnText}>Use Camera</Text>
                         </TouchableOpacity>
                         
                         <TouchableOpacity style={styles.pickerBtn} onPress={() => {
                           launchImageLibrary({ mediaType: "photo", quality: 0.8 }, (res) => {
                             if (res.assets) setImages((prev) => ({ ...prev, [step.key]: res.assets[0].uri }));
                           });
                         }}>
                            <Text style={styles.pickerBtnIcon}>⬆️</Text>
                            <Text style={styles.pickerBtnText}>Upload Image</Text>
                         </TouchableOpacity>
                     </View>
                   )}
                </View>
             ))}
           </View>

           <TouchableOpacity
              style={[
                styles.submitBtn,
                uploadedCount < 3 && styles.submitBtnDisabled,
                isUploaded && styles.submitBtnDone
              ]}
              onPress={handleSubmitUpload}
              disabled={uploadedCount < 3 || isUploading || isUploaded}
           >
             {isUploading ? (
                <ActivityIndicator color="#64748B" size="small" />
             ) : (
                <Text style={[styles.submitBtnText, uploadedCount < 3 && { color: '#94A3B8' }]}>
                   {isUploaded ? '✅ Photos Submitted' : 'Submit Photos'}
                </Text>
             )}
           </TouchableOpacity>
           
           <Text style={styles.footerNote}>
             Your photos are used only for the face-recognition attendance system and stored securely.
           </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8FAFC' },
  container: { padding: 20, paddingBottom: 40 },
  headerCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 24,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  headerTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerIconBox: {
    width: 44,
    height: 44,
    backgroundColor: '#0F172A',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  headerTitle: { fontSize: 22, fontWeight: "800", color: "#0F172A" },
  headerSubtitle: { fontSize: 13, color: "#64748B" },
  
  profileDetailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  detailItem: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  detailIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  detailLabel: { fontSize: 12, color: "#64748B", marginBottom: 2 },
  detailValue: { fontSize: 13, fontWeight: "700", color: "#0F172A", paddingRight: 5, flexWrap: 'wrap' },
  
  badgesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  joinBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  joinBadgeText: { fontSize: 12, fontWeight: "600", color: "#475569" },
  statusBadge: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusBadgeText: { fontSize: 12, fontWeight: "700" },
  
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 20,
  },
  
  enrolledTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 12,
  },
  coursesList: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    overflow: 'hidden',
  },
  courseItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  courseName: { fontSize: 14, fontWeight: "600", color: "#1E293B" },
  courseSub: { fontSize: 12, color: "#64748B", marginTop: 2 },
  courseCode: { fontSize: 11, color: "#94A3B8", fontWeight: "600" },

  faceStatusBox: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
  },
  faceStatusHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  faceStatusTitle: { fontSize: 16, fontWeight: "700", color: "#0F172A" },
  faceStatusDesc: { fontSize: 13, color: "#475569", lineHeight: 20, marginBottom: 16 },
  tipBox: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    padding: 12,
    borderRadius: 8,
  },
  tipText: { fontSize: 12, color: "#16A34A" },

  photosCard: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
  },
  photosHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  photosTitle: { fontSize: 18, fontWeight: "800", color: "#0F172A" },
  photosLabel: { fontSize: 11, fontWeight: "700", color: "#94A3B8", letterSpacing: 1 },
  photosDesc: { fontSize: 13, color: "#475569", marginBottom: 20, lineHeight: 20 },
  
  uploadGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  uploadCol: {
    width: '31%', // Fit 3 columns
  },
  colLabel: { fontSize: 13, fontWeight: "700", color: "#1E293B", marginBottom: 4 },
  colDesc: { fontSize: 10, color: "#64748B", marginBottom: 12, minHeight: 28 },
  
  actionColumn: {
    gap: 8,
  },
  pickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingVertical: 10,
    backgroundColor: '#F8FAFC',
  },
  pickerBtnIcon: { fontSize: 12, marginRight: 6 },
  pickerBtnText: { fontSize: 11, fontWeight: "600", color: "#334155" },

  previewBox: {
    height: 120,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  previewImg: { width: '100%', height: '100%' },
  clearBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearBtnText: { color: '#FFF', fontSize: 12, fontWeight: '700' },

  submitBtn: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  submitBtnDisabled: {
    backgroundColor: '#F8FAFC',
  },
  submitBtnDone: {
    borderColor: '#A7F3D0',
    backgroundColor: '#ECFDF5',
  },
  footerNote: {
    textAlign: 'center',
    fontSize: 11,
    color: "#94A3B8",
  }
});