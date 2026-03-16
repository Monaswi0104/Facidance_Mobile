import React, { useState, useEffect, useMemo } from "react";
import { View, Text, StyleSheet, SafeAreaView, ScrollView, ActivityIndicator, TouchableOpacity, Dimensions } from "react-native";
import { getAttendanceHistory } from "../../api/studentApi";

const { width } = Dimensions.get('window');

export default function CourseAttendance({ route, navigation }) {

  const { course, tab: initialTab } = route.params;
  const [activeTab, setActiveTab] = useState(initialTab === 'Attendance' ? 'Attendance History' : 'Overview');
  const [isLoading, setIsLoading] = useState(true);
  
  const [courseRecords, setCourseRecords] = useState([]);
  const [totalClasses, setTotalClasses] = useState(course.sessions || 0); // fallback to passed data
  const [attended, setAttended] = useState(0);

  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true);
        const records = await getAttendanceHistory();
        const list = Array.isArray(records) ? records : [];
        // Filter records for this specific course by courseId or code
        const filtered = list.filter(
          (r) => r.course?.id === course.id || r.course?.code === course.code || r.course?.name === course.name
        );
        // Sort records by date descending
        filtered.sort((a,b) => new Date(b.timestamp || b.date || b.createdAt) - new Date(a.timestamp || a.date || a.createdAt));
        
        setCourseRecords(filtered);
        
        // If the backend history returns all sessions, use its length, otherwise use what is passed in course.sessions
        const total = Math.max(course.sessions || 0, filtered.length);
        const present = filtered.filter((r) => r.status === true).length;
        
        setTotalClasses(total);
        setAttended(present);
      } catch (e) {
        console.log("CourseAttendance load error:", e);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [course]);

  const missed = Math.max(0, totalClasses - attended);
  const percent = totalClasses > 0 ? Math.round((attended / totalClasses) * 100) : 0;

  const formatDate = (dateString) => {
    if (!dateString) return "Unknown Date";
    const date = new Date(dateString);
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    
    const dayName = days[date.getDay()];
    const monthName = months[date.getMonth()];
    const day = date.getDate();
    const year = date.getFullYear();
    
    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; 
    const strTime = hours + ':' + minutes + ' ' + ampm;
    
    return { 
      dateStr: `${dayName}, ${monthName} ${day}, ${year}`, 
      timeStr: strTime 
    };
  };

  const renderOverview = () => (
    <View style={styles.tabContent}>
      {/* Overview Stats Row */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <View style={styles.statCardHeader}>
            <Text style={styles.statCardLabel}>Total Sessions</Text>
            <Text style={[styles.statCardIcon, { color: '#3B82F6' }]}>🕓</Text>
          </View>
          <Text style={styles.statCardValue}>{totalClasses}</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}>
          <View style={styles.statCardHeader}>
            <Text style={styles.statCardLabel}>Attended</Text>
            <Text style={[styles.statCardIcon, { color: '#10B981' }]}>✓</Text>
          </View>
          <Text style={[styles.statCardValue, { color: '#10B981' }]}>{attended}</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
          <View style={styles.statCardHeader}>
            <Text style={styles.statCardLabel}>Absent</Text>
            <Text style={[styles.statCardIcon, { color: '#EF4444' }]}>✕</Text>
          </View>
          <Text style={[styles.statCardValue, { color: '#EF4444' }]}>{missed}</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: '#FAF5FF', borderColor: '#E9D5FF' }]}>
          <View style={styles.statCardHeader}>
            <Text style={styles.statCardLabel}>Attendance Rate</Text>
            <Text style={[styles.statCardIcon, { color: '#A855F7' }]}>📈</Text>
          </View>
          <Text style={[styles.statCardValue, { color: '#7E22CE' }]}>{percent}%</Text>
        </View>
      </View>

      {/* Details Row */}
      <View style={styles.detailsRow}>
        {/* Course Details Card */}
        <View style={styles.detailsCard}>
          <View style={styles.cardHeader}>
             <Text style={styles.cardHeaderIcon}>📖</Text>
             <Text style={styles.cardTitle}>Course Details</Text>
          </View>
          
          <View style={styles.detailItem}>
            <Text style={styles.detailIcon}>📅</Text>
            <View>
              <Text style={styles.detailLabel}>Academic Period</Text>
              <Text style={styles.detailText}>{course.year} • {course.semester}</Text>
            </View>
          </View>

          <View style={styles.detailItem}>
            <Text style={styles.detailIcon}>🎓</Text>
            <View>
              <Text style={styles.detailLabel}>Program</Text>
              <Text style={styles.detailText}>{course.program}</Text>
            </View>
          </View>

          <View style={styles.detailItem}>
            <Text style={styles.detailIcon}>👥</Text>
            <View>
              <Text style={styles.detailLabel}>Enrolled Students</Text>
              <Text style={styles.detailText}>{course.students} students</Text>
            </View>
          </View>

          <View style={styles.infoBanner}>
            <Text style={styles.infoText}>
              ℹ️ To mark your attendance, use the <Text style={{fontWeight: '700'}}>entry code</Text> shared by your teacher in class or on your course announcements.
            </Text>
          </View>
        </View>

        {/* Instructor Details Card */}
        <View style={styles.detailsCard}>
           <View style={styles.cardHeader}>
             <Text style={styles.cardHeaderIcon}>👤</Text>
             <Text style={styles.cardTitle}>Instructor Details</Text>
          </View>
          
          <View style={styles.detailItem}>
            <Text style={styles.detailIcon}>👤</Text>
            <View>
              <Text style={styles.detailLabel}>Name</Text>
              <Text style={styles.detailText}>{course.teacher}</Text>
            </View>
          </View>

          <View style={styles.detailItem}>
            <Text style={styles.detailIcon}>🏢</Text>
            <View>
              <Text style={styles.detailLabel}>Department</Text>
              <Text style={styles.detailText}>{course.teacherDept || "Computer Science"}</Text>
            </View>
          </View>

          <View style={styles.detailItem}>
            <Text style={styles.detailIcon}>✉️</Text>
            <View>
              <Text style={styles.detailLabel}>Email</Text>
              <Text style={styles.detailText}>{course.teacherEmail || "Not Provided"}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Performance Summary */}
      <View style={styles.performanceCard}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardHeaderIcon}>🏅</Text>
          <Text style={styles.cardTitle}>Performance Summary</Text>
        </View>

        <View style={styles.progressHeader}>
           <Text style={styles.progressLabel}>Overall Attendance</Text>
           <Text style={styles.progressPercent}>{percent}%</Text>
        </View>
        <View style={styles.progressBarBg}>
           <View style={[styles.progressBarFill, { width: `${percent}%`, backgroundColor: percent >= 75 ? '#0EA5E9' : '#EF4444' }]} />
        </View>
        
        <View style={styles.progressStats}>
           <View style={styles.pStatBox}>
             <Text style={styles.pStatLabel}>Sessions Held</Text>
             <Text style={styles.pStatValue}>{totalClasses}</Text>
           </View>
           <View style={styles.pStatBox}>
             <Text style={styles.pStatLabel}>Present</Text>
             <Text style={[styles.pStatValue, { color: '#10B981' }]}>{attended}</Text>
           </View>
           <View style={styles.pStatBox}>
             <Text style={styles.pStatLabel}>Absent</Text>
             <Text style={[styles.pStatValue, { color: '#EF4444' }]}>{missed}</Text>
           </View>
        </View>
      </View>
    </View>
  );

  const renderHistory = () => (
    <View style={styles.tabContent}>
       <View style={styles.historyCard}>
         <View style={styles.cardHeader}>
            <Text style={styles.cardHeaderIcon}>📅</Text>
            <Text style={styles.cardTitle}>Attendance History</Text>
         </View>

         {courseRecords.length === 0 ? (
            <View style={{ padding: 40, alignItems: 'center' }}>
              <Text style={{ fontSize: 15, color: '#64748B' }}>No attendance records found for this course.</Text>
            </View>
         ) : (
           courseRecords.map((record, index) => {
             const dt = formatDate(record.timestamp || record.date || record.createdAt);
             return (
               <View 
                 key={record.id || index} 
                 style={[
                   styles.historyRow,
                   { 
                     borderColor: record.status ? '#DCFCE7' : '#FEE2E2',
                     backgroundColor: '#FFFFFF',
                   }
                 ]}
               >
                 <View style={styles.historyLeft}>
                   <View style={styles.historyIconBox}>
                     <Text style={styles.historyIconText}>{record.status ? '✓' : '✕'}</Text>
                   </View>
                   <View>
                     <Text style={styles.historyDate}>{dt.dateStr}</Text>
                     <Text style={styles.historyTime}>{dt.timeStr}</Text>
                   </View>
                 </View>
                 <View style={[styles.statusBadge, { backgroundColor: record.status ? '#F0FDF4' : '#FEF2F2', borderColor: record.status ? '#DCFCE7' : '#FEE2E2' }]}>
                   <Text style={[styles.statusBadgeText, { color: record.status ? '#16A34A' : '#EF4444' }]}>
                     {record.status ? 'Present' : 'Absent'}
                   </Text>
                 </View>
               </View>
             );
           })
         )}
       </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      
      {/* Navigation Header */}
      <View style={styles.navHeader}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backIcon}>←</Text>
          <Text style={styles.backText}>Back to My Courses</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        {/* Course Title Board */}
        <View style={styles.courseBoard}>
          <View style={styles.boardIconBox}>
            <Text style={{ fontSize: 24 }}>📖</Text>
          </View>
          <View style={styles.boardInfo}>
             <Text style={styles.boardTitle}>{course.name}</Text>
             <Text style={styles.boardProgram}>{course.program}</Text>
          </View>
          
          <View style={styles.boardBadges}>
            <View style={styles.activeBadge}>
              <Text style={styles.activeBadgeText}>Active</Text>
            </View>
            <Text style={styles.boardTerm}>{course.year} • {course.semester}</Text>
            <View style={styles.codeBadge}>
               <Text style={styles.codeBadgeText}>{course.code}</Text>
            </View>
          </View>
        </View>
        
        {/* Tabs */}
        <View style={styles.tabsContainer}>
           <TouchableOpacity 
             style={[styles.tab, activeTab === 'Overview' && styles.activeTab]}
             onPress={() => setActiveTab('Overview')}
           >
             <Text style={[styles.tabText, activeTab === 'Overview' && styles.activeTabText]}>Overview</Text>
           </TouchableOpacity>

           <TouchableOpacity 
             style={[styles.tab, activeTab === 'Attendance History' && styles.activeTab]}
             onPress={() => setActiveTab('Attendance History')}
           >
             <Text style={[styles.tabText, activeTab === 'Attendance History' && styles.activeTabText]}>Attendance History</Text>
           </TouchableOpacity>
        </View>

        {isLoading ? (
          <ActivityIndicator size="large" color="#4361EE" style={{ marginTop: 40 }} />
        ) : (
          activeTab === 'Overview' ? renderOverview() : renderHistory()
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  navHeader: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 5,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 20,
    alignSelf: 'flex-start',
    backgroundColor: '#FFF',
  },
  backIcon: {
    fontSize: 16,
    color: '#0F172A',
    marginRight: 6,
  },
  backText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0F172A",
  },
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  courseBoard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
    flexWrap: 'wrap',
  },
  boardIconBox: {
    width: 56,
    height: 56,
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  boardInfo: {
    flex: 1,
    minWidth: '50%',
  },
  boardTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 4,
  },
  boardProgram: {
    fontSize: 14,
    color: "#64748B",
  },
  boardBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 10,
    width: '100%',
    justifyContent: 'flex-end',
  },
  activeBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    marginRight: 10,
  },
  activeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10B981',
  },
  boardTerm: {
    fontSize: 13,
    color: '#64748B',
    marginRight: 10,
  },
  codeBadge: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  codeBadgeText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#F8FAFC',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748B",
  },
  activeTabText: {
    color: "#0F172A",
  },
  tabContent: {
    /* container for tab views */
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  statCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statCardLabel: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "600",
  },
  statCardIcon: {
    fontSize: 14,
  },
  statCardValue: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0F172A",
  },
  detailsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  detailsCard: {
    width: '100%',
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  cardHeaderIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  detailItem: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  detailIcon: {
    fontSize: 16,
    marginRight: 12,
    width: 20,
    textAlign: 'center',
    color: '#64748B',
  },
  detailLabel: {
    fontSize: 12,
    color: "#94A3B8",
    marginBottom: 2,
  },
  detailText: {
    fontSize: 14,
    color: "#1E293B",
    fontWeight: "500",
  },
  infoBanner: {
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  infoText: {
    fontSize: 12,
    color: "#475569",
    lineHeight: 18,
  },
  performanceCard: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  progressLabel: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "600",
  },
  progressPercent: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },
  progressBarBg: {
    height: 10,
    backgroundColor: '#E0F2FE',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 20,
  },
  progressBarFill: {
    height: 10,
    borderRadius: 5,
  },
  progressStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 16,
  },
  pStatBox: {
    alignItems: 'center',
  },
  pStatLabel: {
    fontSize: 12,
    color: "#64748B",
    marginBottom: 4,
  },
  pStatValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E293B",
  },
  historyCard: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderRadius: 12,
  },
  historyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  historyIconText: {
    fontSize: 16,
    color: '#10B981',
  },
  historyDate: {
    fontSize: 13,
    color: "#1E293B",
    fontWeight: "600",
    marginBottom: 2,
  },
  historyTime: {
    fontSize: 12,
    color: "#64748B",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: "600",
  }
});