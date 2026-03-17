import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, Dimensions, ActivityIndicator } from "react-native";
import { getStudentCourses, getAttendanceHistory } from "../../api/studentApi";
import { getUser } from "../../api/authStorage";
import { useFocusEffect } from "@react-navigation/native";

const { width } = Dimensions.get('window');

const dashboardItems = [
  { id: '1', title: 'My Courses', screen: 'StudentCourses', icon: '📖', desc: 'View all your enrolled courses.' },
  { id: '2', title: 'Attendance History', screen: 'AttendanceHistory', icon: '📅', desc: 'Check detailed attendance for each class.' },
  { id: '3', title: 'My Profile', screen: 'ProfileUpload', icon: '👤', desc: 'Review and update your personal details.' },
];

export default function StudentDashboard({ navigation }) {

  const [stats, setStats] = useState({ courses: 0, avgAttendance: "—", attended: 0 });
  const [userName, setUserName] = useState("Student");
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        try {
          setIsLoading(true);
          const [courses, user, historyRes] = await Promise.all([getStudentCourses(), getUser(), getAttendanceHistory()]);
          if (user?.name) setUserName(user.name);
          
          if (Array.isArray(courses)) {
            const historyList = Array.isArray(historyRes) ? historyRes : (historyRes?.history || []);
            const totalSessions = historyList.length;
            const attendedSessions = historyList.filter(r => r.status === true).length;
            
            setStats({
              courses: courses.length,
              avgAttendance: totalSessions > 0 ? `${((attendedSessions / totalSessions) * 100).toFixed(1)}%` : "—",
              attended: attendedSessions,
              totalSessions: totalSessions,
            });
          }
        } catch (e) {
          console.log("Student dashboard load error:", e);
        } finally {
          setIsLoading(false);
        }
      };
      load();
    }, [])
  );

  const ActionRow = ({ title, screen, icon, desc, style }) => (
    <TouchableOpacity
      style={[styles.actionRow, style]}
      onPress={() => navigation.navigate(screen)}
      activeOpacity={0.7}
    >
      <View style={styles.actionIconContainer}>
        <Text style={styles.actionIconText}>{icon}</Text>
      </View>
      <View style={styles.actionTextContainer}>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionDesc}>{desc}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        {/* Welcome Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Student Dashboard</Text>
          <Text style={styles.subtitle}>Track your courses and attendance at a glance.</Text>
        </View>

        {/* Attendance Overview Cards */}
        <View style={styles.statsContainer}>
          {isLoading ? (
            <ActivityIndicator color="#4361EE" size="large" style={{ marginVertical: 30, alignSelf:"center" }} />
          ) : (
            <View style={styles.statsGrid}>
              
              {/* MY COURSES */}
              <View style={[styles.statCard, { backgroundColor: '#F0F9FF' }]}>
                <View style={styles.statContent}>
                  <Text style={styles.statLabel}>MY COURSES</Text>
                  <Text style={styles.statValue}>{stats.courses}</Text>
                </View>
                <View style={[styles.statIconBadge, { backgroundColor: '#3B82F6' }]}>
                  <Text style={{ fontSize: 18 }}>🎓</Text>
                </View>
              </View>

              {/* ATTENDANCE % */}
              <View style={[styles.statCard, { backgroundColor: '#ECFDF5' }]}>
                 <View style={styles.statContent}>
                  <Text style={styles.statLabel}>ATTENDANCE %</Text>
                  <Text style={styles.statValue}>{stats.avgAttendance}</Text>
                </View>
                <View style={[styles.statIconBadge, { backgroundColor: '#10B981' }]}>
                  <Text style={{ fontSize: 18 }}>📊</Text>
                </View>
              </View>

              {/* CLASSES ATTENDED */}
              <View style={[styles.statCard, { backgroundColor: '#FAF5FF' }]}>
                 <View style={styles.statContent}>
                  <Text style={styles.statLabel}>CLASSES ATTENDED</Text>
                  <Text style={styles.statValue}>{stats.attended}</Text>
                </View>
                <View style={[styles.statIconBadge, { backgroundColor: '#D946EF' }]}>
                  <Text style={{ fontSize: 18 }}>✓</Text>
                </View>
              </View>

              {/* TOTAL SESSIONS */}
              <View style={[styles.statCard, { backgroundColor: '#FFFBEB' }]}>
                 <View style={styles.statContent}>
                  <Text style={styles.statLabel}>TOTAL SESSIONS</Text>
                  <Text style={styles.statValue}>{stats.totalSessions}</Text>
                </View>
                <View style={[styles.statIconBadge, { backgroundColor: '#F59E0B' }]}>
                  <Text style={{ fontSize: 18 }}>📅</Text>
                </View>
              </View>

            </View>
          )}
        </View>

        {/* Quick Actions List */}
        <View style={styles.quickActionsCard}>
          <View style={styles.quickActionsHeader}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <Text style={styles.shortcutsText}>SHORTCUTS</Text>
          </View>
          
          <View style={styles.actionsList}>
            {dashboardItems.map((item, index) => (
              <ActionRow
                key={item.id}
                title={item.title}
                screen={item.screen}
                icon={item.icon}
                desc={item.desc}
                style={index < dashboardItems.length - 1 ? styles.actionRowBorder : null}
              />
            ))}
          </View>
        </View>

        {/* Widgets Row */}
        <View style={styles.widgetsContainer}>
          {/* How to Submit */}
          <View style={styles.widgetCard}>
            <View style={styles.widgetHeader}>
              <View style={[styles.widgetIcon, { backgroundColor: '#3B82F6' }]}>
                <Text style={{ fontSize: 12 }}>ℹ️</Text>
              </View>
              <Text style={styles.widgetTitle}>How to Submit Attendance</Text>
            </View>
            <Text style={styles.widgetText}>1. Get the <Text style={styles.bold}>Entry Code</Text> from your teacher.</Text>
            <Text style={styles.widgetText}>2. Go to <Text style={styles.bold}>My Courses</Text> and open the relevant course.</Text>
            <Text style={styles.widgetText}>3. Click on the active <Text style={styles.bold}>attendance batch</Text>.</Text>
            <Text style={styles.widgetText}>4. Enter the <Text style={styles.bold}>Entry Code</Text> when prompted.</Text>
            <Text style={styles.widgetText}>5. Upload a clear face photo or selfie and confirm.</Text>
            <Text style={styles.widgetText}>6. Wait for your teacher to approve your submission.</Text>
            <Text style={styles.widgetText}>7. Track your status in <Text style={styles.bold}>Attendance History</Text>.</Text>
          </View>

          {/* Attendance Insights */}
          <View style={[styles.widgetCard, { marginTop: 16 }]}>
            <View style={styles.widgetHeader}>
              <View style={[styles.widgetIcon, { backgroundColor: '#10B981' }]}>
                <Text style={{ fontSize: 12 }}>📈</Text>
              </View>
              <Text style={styles.widgetTitle}>Attendance Insights</Text>
            </View>
            <Text style={styles.widgetText}>Aim to maintain at least <Text style={styles.bold}>75% attendance</Text> (or higher if your program requires it).</Text>
            <Text style={styles.widgetText}>Regularly check <Text style={styles.bold}>Attendance History</Text> to ensure there are no missing entries.</Text>
            <Text style={styles.widgetText}>If you notice any discrepancy, contact your teacher with the <Text style={styles.bold}>date and course</Text> details.</Text>
            <Text style={styles.widgetText}>Make it a habit to submit attendance <Text style={styles.bold}>as soon as a batch opens</Text> to avoid missing it.</Text>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 20,
    marginTop: 10,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: "#64748B",
  },
  statsContainer: {
    marginBottom: 24,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    flexDirection: 'row',
    width: '48%',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  statContent: {
    flex: 1,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#64748B",
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 28,
    fontWeight: "800",
    color: "#0F172A",
  },
  statIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickActionsCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 24,
    overflow: 'hidden',
  },
  quickActionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  shortcutsText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#94A3B8",
    letterSpacing: 1,
  },
  actionsList: {
    paddingHorizontal: 20,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
  },
  actionRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  actionIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  actionIconText: {
    fontSize: 20,
  },
  actionTextContainer: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 2,
  },
  actionDesc: {
    fontSize: 12,
    color: "#64748B",
  },
  widgetsContainer: {
    flexDirection: 'column',
  },
  widgetCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  widgetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  widgetIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  widgetTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  widgetText: {
    fontSize: 13,
    color: "#475569",
    marginBottom: 8,
    lineHeight: 20,
  },
  bold: {
    fontWeight: "700",
    color: "#1E293B",
  }
});