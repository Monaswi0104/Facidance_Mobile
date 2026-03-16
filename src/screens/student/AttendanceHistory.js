import React, { useState, useEffect, useMemo } from "react";
import { View, Text, StyleSheet, FlatList, SafeAreaView, ActivityIndicator, TouchableOpacity, ScrollView, TextInput } from "react-native";
import { getAttendanceHistory, getStudentCourses } from "../../api/studentApi";
import RNFS from "react-native-fs";
import Share from "react-native-share";

export default function AttendanceHistory() {

  const [activeTab, setActiveTab] = useState('Overview');
  const [data, setData] = useState([]);
  const [courses, setCourses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All"); // All, Present, Absent

  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true);
        const [historyRes, coursesRes] = await Promise.all([
          getAttendanceHistory(),
          getStudentCourses()
        ]);
        
        const historyList = Array.isArray(historyRes) ? historyRes : (historyRes.history || []);
        
        // Sort by date descending
        historyList.sort((a,b) => new Date(b.timestamp || b.date || b.createdAt) - new Date(a.timestamp || a.date || a.createdAt));
        
        setData(historyList);
        setCourses(Array.isArray(coursesRes) ? coursesRes : []);
      } catch (e) {
        console.log("History load error:", e);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const stats = useMemo(() => {
    const total = data.length;
    const present = data.filter(r => r.status === true).length;
    const absent = total - present;
    const rate = total > 0 ? ((present / total) * 100).toFixed(1) : 0;
    return { total, present, absent, rate };
  }, [data]);

  const courseStats = useMemo(() => {
    // Map course ID or code to stats
    const map = {};
    
    // Initialize map using actual courses if available, to ensure we catch courses with ZERO attendance yet.
    courses.forEach(c => {
      const key = c.name || c.code; // Use name as primary
      if(!map[key]) map[key] = { name: c.name, code: c.code, present: 0, total: 0 };
    });

    data.forEach(r => {
      const key = r.course?.name || r.course?.code || "Unknown";
      if (!map[key]) map[key] = { name: r.course?.name || "Unknown", code: r.course?.code || "—", present: 0, total: 0 };
      map[key].total += 1;
      if (r.status) map[key].present += 1;
    });

    return Object.values(map).map(c => {
      c.rate = c.total > 0 ? (c.present / c.total) * 100 : 0;
      return c;
    });
  }, [data, courses]);

  const filteredRecords = useMemo(() => {
    return data.filter(r => {
      // Status filter
      if (filter === 'Present' && !r.status) return false;
      if (filter === 'Absent' && r.status) return false;
      
      // Search filter
      if (search) {
        const q = search.toLowerCase();
        const courseName = (r.course?.name || "").toLowerCase();
        const courseCode = (r.course?.code || "").toLowerCase();
        return courseName.includes(q) || courseCode.includes(q);
      }
      return true;
    });
  }, [data, search, filter]);

  const exportCSV = async () => {
    try {
      const header = "Course,Entry Code,Status,Date,Time";
      const rows = filteredRecords.map((r) => {
         const dt = formatDateObj(r.timestamp || r.date || r.createdAt);
         const cName = r.course?.name || "Unknown";
         const entryCode = r.course?.entryCode || r.course?.code || "—";
         const status = r.status ? "Present" : "Absent";
         // Quote strings to avoid comma issues
         return `"${cName}","${entryCode}","${status}","${dt.dateStr}","${dt.timeStr}"`;
      });
      const csv = [header, ...rows].join("\n");
      const path = `${RNFS.DownloadDirectoryPath}/attendance_history_${Date.now()}.csv`;
      await RNFS.writeFile(path, csv, "utf8");
      await Share.open({ url: `file://${path}`, type: "text/csv", title: "Export Attendance", filename: "attendance_history" });
    } catch (e) {
      if (e?.message !== "User did not share") console.log("Export error:", e);
    }
  };

  const formatDateObj = (dateString) => {
    if (!dateString) return { dateStr: "Unknown Date", timeStr: "" };
    const date = new Date(dateString);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const month = months[date.getMonth()];
    const day = date.getDate().toString().padStart(2, '0');
    const year = date.getFullYear();
    
    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; 
    
    return { 
      dateStr: `${month} ${day}, ${year}`, 
      timeStr: `${hours}:${minutes} ${ampm}`
    };
  };

  const renderOverview = () => (
    <View style={styles.tabContent}>
      
      {/* 4 Stats Cards */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statCardLabel}>Total Classes</Text>
          <Text style={styles.statCardValue}>{stats.total}</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}>
          <Text style={[styles.statCardLabel, { color: '#10B981' }]}>Present</Text>
          <Text style={[styles.statCardValue, { color: '#10B981' }]}>{stats.present}</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
          <Text style={[styles.statCardLabel, { color: '#EF4444' }]}>Absent</Text>
          <Text style={[styles.statCardValue, { color: '#EF4444' }]}>{stats.absent}</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: '#F0F9FF', borderColor: '#BAE6FD' }]}>
           <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
             <Text style={[styles.statCardLabel, { color: '#0284C7' }]}>Attendance Rate</Text>
             <Text style={styles.rateValue}>{stats.rate}%</Text>
           </View>
           <View style={styles.rateBarBg}>
             <View style={[styles.rateBarFill, { width: `${stats.rate}%` }]} />
           </View>
        </View>
      </View>

      {/* Attendance by Course Section */}
      <View style={styles.courseRatesCard}>
         <Text style={styles.sectionTitle}>Attendance by Course</Text>
         
         <View style={styles.courseRatesList}>
            {courseStats.map((c, i) => (
               <View key={i} style={styles.courseRateItem}>
                  <View style={styles.courseRateHeader}>
                    <View>
                      <Text style={styles.cRateName}>{c.name}</Text>
                      <Text style={styles.cRateCode}>{c.code}</Text>
                    </View>
                    <Text style={styles.cRateFraction}>{Math.round(c.rate)}% ({c.present}/{c.total} present)</Text>
                  </View>
                  <View style={styles.cRateBarBg}>
                     <View style={[styles.cRateBarFill, { width: `${c.rate}%` }]} />
                  </View>
               </View>
            ))}
         </View>
      </View>

    </View>
  );

  const renderRecords = () => (
    <View style={styles.tabContent}>
      
      {/* Inner Search & Filters */}
      <View style={styles.filtersCard}>
         <View style={styles.searchContainer}>
           <Text style={styles.searchIcon}>🔍</Text>
           <TextInput
             style={styles.searchInput}
             placeholder="Search by course name..."
             placeholderTextColor="#94A3B8"
             value={search}
             onChangeText={setSearch}
           />
         </View>
         
         <View style={styles.filterBtns}>
            <TouchableOpacity onPress={() => setFilter('All')} style={styles.filterBtn}>
              <Text style={[styles.filterBtnText, filter === 'All' && styles.filterBtnTextActive]}>All</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setFilter('Present')} style={styles.filterBtn}>
              <Text style={[styles.filterBtnText, filter === 'Present' && styles.filterBtnTextActive]}>Present</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setFilter('Absent')} style={styles.filterBtn}>
              <Text style={[styles.filterBtnText, filter === 'Absent' && styles.filterBtnTextActive]}>Absent</Text>
            </TouchableOpacity>
         </View>
      </View>

      {/* Table Format */}
      <View style={styles.tableCard}>
         <View style={styles.tableHeader}>
           <Text style={[styles.thText, { flex: 2 }]}>COURSE</Text>
           <Text style={[styles.thText, { flex: 1.2, textAlign: 'center' }]}>ENTRY CODE</Text>
           <Text style={[styles.thText, { flex: 1, textAlign: 'center' }]}>STATUS</Text>
           <Text style={[styles.thText, { flex: 1.5, textAlign: 'right' }]}>DATE & TIME</Text>
         </View>

         {filteredRecords.length === 0 ? (
           <View style={{ padding: 40, alignItems: 'center' }}>
             <Text style={{ color: '#64748B' }}>No attendance records match your criteria.</Text>
           </View>
         ) : (
           filteredRecords.map((r, i) => {
             const dt = formatDateObj(r.timestamp || r.date || r.createdAt);
             return (
               <View key={r.id || i} style={styles.tableRow}>
                 <View style={{ flex: 2 }}>
                   <Text style={styles.tdCourseName} numberOfLines={2}>{r.course?.name || "Unknown"}</Text>
                 </View>
                 
                 <Text style={[styles.tdText, { flex: 1.2, textAlign: 'center' }]}>{r.course?.entryCode || r.course?.code || "—"}</Text>
                 
                 <View style={{ flex: 1, alignItems: 'center' }}>
                   <View style={[styles.statusBadge, { backgroundColor: r.status ? '#F0FDF4' : '#FEF2F2' }]}>
                      <Text style={[styles.statusBadgeText, { color: r.status ? '#16A34A' : '#EF4444' }]}>
                        {r.status ? 'Present' : 'Absent'}
                      </Text>
                   </View>
                 </View>
                 
                 <Text style={[styles.tdText, { flex: 1.5, textAlign: 'right' }]}>{dt.dateStr} at {dt.timeStr}</Text>
               </View>
             );
           })
         )}
      </View>

    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        {/* Header & Export */}
        <View style={styles.topHeader}>
           <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
             <View style={styles.headerIconBox}>
               <Text style={{ fontSize: 20 }}>📅</Text>
             </View>
             <View>
               <Text style={styles.title}>Attendance History</Text>
               <Text style={styles.subtitle}>Review and analyze your attendance across all courses.</Text>
             </View>
           </View>
           
           <TouchableOpacity style={styles.exportBtn} onPress={exportCSV}>
             <Text style={styles.exportBtnText}>📥 Export CSV</Text>
           </TouchableOpacity>
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
             style={[styles.tab, activeTab === 'All Records' && styles.activeTab]}
             onPress={() => setActiveTab('All Records')}
           >
             <Text style={[styles.tabText, activeTab === 'All Records' && styles.activeTabText]}>All Records</Text>
           </TouchableOpacity>
        </View>

        {isLoading ? (
          <ActivityIndicator size="large" color="#4361EE" style={{ marginTop: 40 }} />
        ) : (
          activeTab === 'Overview' ? renderOverview() : renderRecords()
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
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingTop: 10,
    flexWrap: 'wrap',
  },
  headerIconBox: {
    width: 44,
    height: 44,
    backgroundColor: '#0F172A',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
  },
  subtitle: {
    fontSize: 13,
    color: "#64748B",
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#FFF',
    marginTop: 10,
  },
  exportBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
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
    // layout wrapper
  },
  
  // Overview Tab
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
  },
  statCardLabel: {
    fontSize: 13,
    color: "#64748B",
    marginBottom: 4,
  },
  statCardValue: {
    fontSize: 26,
    fontWeight: "800",
    color: "#0F172A",
  },
  rateValue: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0284C7",
  },
  rateBarBg: {
    height: 6,
    backgroundColor: '#E0F2FE',
    borderRadius: 3,
    marginTop: 10,
  },
  rateBarFill: {
    height: 6,
    backgroundColor: '#0EA5E9',
    borderRadius: 3,
  },
  courseRatesCard: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 20,
  },
  courseRatesList: {
    gap: 16,
  },
  courseRateItem: {
    marginBottom: 16,
  },
  courseRateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  cRateName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1E293B",
  },
  cRateCode: {
    fontSize: 11,
    color: "#64748B",
  },
  cRateFraction: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
  },
  cRateBarBg: {
    height: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
  },
  cRateBarFill: {
    height: 8,
    backgroundColor: '#0EA5E9',
    borderRadius: 4,
  },

  // All Records Tab
  filtersCard: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchIcon: {
    fontSize: 14,
    marginRight: 8,
    color: "#94A3B8",
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#0F172A",
  },
  filterBtns: {
    flexDirection: 'row',
  },
  filterBtn: {
    marginRight: 16,
  },
  filterBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#64748B",
  },
  filterBtnTextActive: {
    color: "#0F172A",
  },

  tableCard: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  thText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  tdCourseName: {
    fontSize: 14,
    color: "#1E293B",
    fontWeight: "500",
  },
  tdText: {
    fontSize: 13,
    color: "#64748B",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "600",
  }
});