import React, {  useState, useCallback , useMemo } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  ScrollView, Alert, ActivityIndicator, Modal, TextInput, Dimensions
, RefreshControl } from "react-native";
import { getDepartments, createDepartment, deleteDepartment, getPrograms, getTeachers } from "../../api/adminApi";
import { useFocusEffect } from "@react-navigation/native";
import { Theme, useTheme } from "../../theme/Theme";
import { Building2, GraduationCap, Users, Plus, Trash2, X } from "lucide-react-native";
import { StatsRowSkeleton, ListCardSkeleton } from "../../components/SkeletonLoader";

export default function DepartmentsManagement() {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [departments, setDepartments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadData(false); // Assume it accepts showLoading=false, but just await it
    setIsRefreshing(false);
  }, []);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedDept, setSelectedDept] = useState(null);
  const [newName, setNewName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [data, progsData, teachersData] = await Promise.all([
        getDepartments(),
        getPrograms(),
        getTeachers()
      ]);

      const list = data.departments || data || [];
      const allPrograms = progsData.programs || progsData || [];
      const allTeachers = teachersData.teachers || teachersData || [];

      setDepartments(list.map((d) => {
        const dPrograms = d.programs && d.programs.length > 0 ? d.programs : allPrograms.filter(p => p.departmentId === d.id || p.department_id === d.id);
        const dTeachers = d.teachers && d.teachers.length > 0 ? d.teachers : allTeachers.filter(t => t.departmentId === d.id || t.department_id === d.id || t.department?.id === d.id);

        return {
          id: d.id, 
          name: d.name,
          programs: d.programs_count || d._count?.programs || dPrograms.length || 0,
          teachers: d.teachers_count || d._count?.teachers || dTeachers.length || 0,
          programsList: dPrograms,
          teachersList: dTeachers.map(t => {
            const progs = new Set();
            if (t.courses) {
              t.courses.forEach(c => {
                 const pName = c.program_name || c?.semester?.academicYear?.program?.name || c.program?.name;
                 if (pName) progs.add(pName);
              });
            }
            return { ...t, allottedPrograms: Array.from(progs).join(" • ") };
          }),
        };
      }));
    } catch (e) { console.log(e); }
    finally { setIsLoading(false); }
  };

  useFocusEffect(useCallback(() => { loadData(); }, []));

  const totalPrograms = departments.reduce((a, d) => a + d.programs, 0);
  const totalTeachers = departments.reduce((a, d) => a + d.teachers, 0);

  const handleAdd = async () => {
    if (!newName.trim()) { Alert.alert("Error", "Please enter a department name."); return; }
    try {
      setIsCreating(true);
      console.log("[DepartmentsManagement] Creating department:", newName.trim());
      await createDepartment(newName.trim());
      setNewName("");
      setShowAddForm(false);
      Alert.alert("Success", "Department created.");
      loadData();
    } catch (e) {
      console.error("[DepartmentsManagement] Create failed:", e);
      Alert.alert("Error", e.message || "Failed to create department.");
    }
    finally { setIsCreating(false); }
  };

  const handleDelete = (dept) => {
    Alert.alert("Delete Department", `Remove "${dept.name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive", onPress: async () => {
          try {
            console.log("[DepartmentsManagement] Deleting department:", dept.id, dept.name);
            await deleteDepartment(dept.id);
            loadData();
            Alert.alert("Success", "Department deleted.");
          }
          catch (e) {
            console.error("[DepartmentsManagement] Delete failed:", e);
            Alert.alert("Error", e.message || "Failed to delete.");
          }
        }
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={[colors.success]} tintColor={colors.success} />
        }
      >

        {/* Header */}
        <View style={styles.headerSection}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Departments</Text>
            <Text style={styles.subtitle}>Manage academic departments and their structure.</Text>
          </View>
          <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddForm(!showAddForm)} activeOpacity={0.7}>
            {showAddForm ? (
              <><X size={13} color={colors.primaryForeground} style={{ marginRight: 3 }} /><Text style={styles.addBtnText}>Close</Text></>
            ) : (
              <><Plus size={13} color={colors.primaryForeground} style={{ marginRight: 3 }} /><Text style={styles.addBtnText}>Add Department</Text></>
            )}
          </TouchableOpacity>
        </View>

        {/* Stats Row */}
        {isLoading ? (
          <View>
            <StatsRowSkeleton count={3} />
            <ListCardSkeleton rows={4} />
          </View>
        ) : (
          <>
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <View style={styles.statTopRow}>
                  <Text style={styles.statLabel} numberOfLines={2} adjustsFontSizeToFit>TOTAL{"\n"}DEPARTMENTS</Text>
                  <View style={styles.statIconBg}><Building2 size={14} color={colors.primaryForeground} /></View>
                </View>
                <Text style={styles.statNumber}>{departments.length}</Text>
              </View>
              <View style={styles.statCard}>
                <View style={styles.statTopRow}>
                  <Text style={styles.statLabel} numberOfLines={2} adjustsFontSizeToFit>ACTIVE{"\n"}PROGRAMS</Text>
                  <View style={styles.statIconBg}><GraduationCap size={14} color={colors.primaryForeground} /></View>
                </View>
                <Text style={styles.statNumber}>{totalPrograms}</Text>
              </View>
              <View style={styles.statCard}>
                <View style={styles.statTopRow}>
                  <Text style={styles.statLabel} numberOfLines={2} adjustsFontSizeToFit>FACULTY{"\n"}MEMBERS</Text>
                  <View style={styles.statIconBg}><Users size={14} color={colors.primaryForeground} /></View>
                </View>
                <Text style={styles.statNumber}>{totalTeachers}</Text>
              </View>
            </View>

            {/* Add New Department - Inline Form */}
            {showAddForm && (
              <View style={styles.addFormCard}>
                <View style={styles.addFormHeader}>
                  <View style={styles.addFormIconBg}><Building2 size={14} color={colors.primaryForeground} /></View>
                  <Text style={styles.addFormTitle}>Add New Department</Text>
                  <TouchableOpacity onPress={() => { setShowAddForm(false); setNewName(""); }}>
                    <X size={16} color={colors.mutedForeground} />
                  </TouchableOpacity>
                </View>
                <Text style={styles.addFormLabel}>DEPARTMENT NAME</Text>
                <View style={styles.addFormRow}>
                  <TextInput
                    style={styles.addFormInput}
                    placeholder="e.g. Computer Science"
                    placeholderTextColor={colors.mutedForeground}
                    value={newName}
                    onChangeText={setNewName}
                  />
                  <TouchableOpacity style={styles.addFormBtn} onPress={handleAdd} disabled={isCreating}>
                    <Plus size={13} color={colors.primaryForeground} style={{ marginRight: 3 }} />
                    <Text style={styles.addFormBtnText}>{isCreating ? "..." : "Add"}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* All Departments Card */}
            <View style={styles.listCard}>
              <View style={styles.listHeader}>
                <View style={styles.listHeaderIcon}><Building2 size={12} color={colors.primaryForeground} /></View>
                <Text style={styles.listTitle}>All Departments</Text>
                <View style={styles.listCountBadge}>
                  <Text style={styles.listCountText}>{departments.length} total</Text>
                </View>
              </View>

              {departments.length === 0 ? (
                <Text style={styles.emptyText}>No departments created yet.</Text>
              ) : (
                departments.map((d, i) => (
                  <TouchableOpacity key={d.id} style={[styles.deptRow, i < departments.length - 1 && styles.deptRowBorder]} onPress={() => setSelectedDept(d)} activeOpacity={0.7}>
                    <View style={styles.deptAvatar}>
                      <Building2 size={14} color={colors.primaryDark} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.deptName}>{d.name}</Text>
                      <View style={{ flexDirection: "row", alignItems: "center", marginTop: 2 }}>
                        <GraduationCap size={10} color={colors.mutedForeground} style={{ marginRight: 3 }} />
                        <Text style={styles.deptMeta}>{d.programs} programs</Text>
                        <Text style={[styles.deptMeta, { marginHorizontal: 6 }]}>·</Text>
                        <Users size={10} color={colors.mutedForeground} style={{ marginRight: 3 }} />
                        <Text style={styles.deptMeta}>{d.teachers} teachers</Text>
                      </View>
                    </View>
                    <TouchableOpacity style={styles.deleteBtnOutline} onPress={() => handleDelete(d)}>
                      <Trash2 size={11} color={colors.danger} style={{ marginRight: 3 }} />
                      <Text style={styles.deleteBtnText}>Delete</Text>
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))
              )}
            </View>
          </>
        )}

      </ScrollView>

      {/* Detail Modal */}
      <Modal visible={!!selectedDept} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.detailHeader}>
              <View style={styles.detailHeaderIcon}><Building2 size={20} color={colors.primaryForeground} /></View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.detailTitle}>{selectedDept?.name}</Text>
                <Text style={styles.detailSubtitle}>{selectedDept?.programs} Programs • {selectedDept?.teachers} Teachers</Text>
              </View>
            </View>

            <ScrollView style={{ maxHeight: Dimensions.get('window').height * 0.5 }} showsVerticalScrollIndicator={false}>
              
              <Text style={styles.sectionLabel}>Programs</Text>
              {selectedDept?.programsList?.length > 0 ? (
                selectedDept.programsList.map((p, idx) => (
                  <View key={p.id || idx} style={styles.subItem}>
                    <GraduationCap size={14} color={colors.textBody} style={{ marginRight: 10 }} />
                    <Text style={styles.subItemText}>{p.name}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.emptySubText}>No programs available.</Text>
              )}

              <Text style={[styles.sectionLabel, { marginTop: 16 }]}>Teachers</Text>
              {selectedDept?.teachersList?.length > 0 ? (
                selectedDept.teachersList.map((t, idx) => {
                  const tName = t.name || t.user?.name || "Unknown";
                  const tEmail = t.email || t.user?.email || "";
                  return (
                    <View key={t.id || idx} style={styles.subItem}>
                      <View style={styles.teacherAvatar}>
                        <Text style={styles.teacherAvatarText}>{tName.charAt(0)}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.subItemText}>{tName}</Text>
                        <Text style={styles.subItemSub}>{tEmail}</Text>
                      </View>
                    </View>
                  );
                })
              ) : (
                <Text style={styles.emptySubText}>No teachers assigned.</Text>
              )}
            </ScrollView>

            <TouchableOpacity style={styles.closeBtn} onPress={() => setSelectedDept(null)}>
              <Text style={styles.closeBtnText}>Close</Text>
            </TouchableOpacity>
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
  headerSection: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, marginTop: 8 },
  title: { fontSize: 24, fontWeight: "800", color: colors.foreground },
  subtitle: { fontSize: 12, color: colors.mutedForeground, marginTop: 3 },
  addBtn: { flexDirection: "row", alignItems: "center", backgroundColor: colors.primaryDark, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  addBtnText: { fontSize: 12, fontWeight: "600", color: colors.primaryForeground },

  // Stats
  statsRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 14 },
  statCard: {
    flex: 1, backgroundColor: colors.background, borderRadius: 12, padding: 14, marginHorizontal: 3,
    borderWidth: 1, borderColor: colors.border,
    shadowColor: colors.foreground, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1,
  },
  statTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  statLabel: { fontSize: 7, fontWeight: "700", color: colors.mutedForeground, letterSpacing: 0.3, flex: 1, marginRight: 4 },
  statNumber: { fontSize: 22, fontWeight: "800", color: colors.foreground },
  statIconBg: { width: 30, height: 30, borderRadius: 8, backgroundColor: colors.primaryDark, justifyContent: "center", alignItems: "center" },

  // Add Form
  addFormCard: {
    backgroundColor: colors.background, borderRadius: 14, padding: 16, marginBottom: 14,
    borderWidth: 1, borderColor: colors.border,
    shadowColor: colors.foreground, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 6, elevation: 1,
  },
  addFormHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  addFormIconBg: { width: 28, height: 28, borderRadius: 7, backgroundColor: colors.primaryDark, justifyContent: "center", alignItems: "center", marginRight: 8 },
  addFormTitle: { fontSize: 14, fontWeight: "700", color: colors.foreground, flex: 1 },
  addFormLabel: { fontSize: 9, fontWeight: "700", color: colors.primaryDark, letterSpacing: 0.4, marginBottom: 6 },
  addFormRow: { flexDirection: "row", alignItems: "center" },
  addFormInput: { flex: 1, backgroundColor: colors.secondary, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: colors.foreground, borderWidth: 1, borderColor: colors.border, marginRight: 8 },
  addFormBtn: { flexDirection: "row", alignItems: "center", backgroundColor: colors.primaryDark, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8 },
  addFormBtnText: { fontSize: 12, fontWeight: "700", color: colors.primaryForeground },

  // List Card
  listCard: {
    backgroundColor: colors.background, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: colors.border,
    shadowColor: colors.foreground, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 6, elevation: 1,
  },
  listHeader: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  listHeaderIcon: { width: 24, height: 24, borderRadius: 6, backgroundColor: colors.primaryDark, justifyContent: "center", alignItems: "center", marginRight: 8 },
  listTitle: { fontSize: 14, fontWeight: "700", color: colors.foreground, flex: 1 },
  listCountBadge: { backgroundColor: colors.accentLight, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, borderWidth: 1, borderColor: colors.accentLight },
  listCountText: { fontSize: 10, fontWeight: "700", color: colors.primaryDark },

  // Department Rows
  deptRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12 },
  deptRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.muted },
  deptAvatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.accentLight, justifyContent: "center", alignItems: "center", marginRight: 10 },
  deptName: { fontSize: 13, fontWeight: "700", color: colors.foreground },
  deptMeta: { fontSize: 10, color: colors.mutedForeground },
  deleteBtnOutline: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: colors.dangerLight, backgroundColor: colors.dangerLight, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 6 },
  deleteBtnText: { fontSize: 10, fontWeight: "700", color: colors.destructive },

  emptyText: { fontSize: 12, color: colors.mutedForeground, textAlign: "center", paddingVertical: 20 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(15,23,42,0.5)", justifyContent: "center", alignItems: "center", padding: 20 },
  modalCard: { backgroundColor: colors.background, borderRadius: 20, padding: 22, width: "100%", maxHeight: Dimensions.get('window').height * 0.8 },
  detailHeader: { flexDirection: "row", alignItems: "center", marginBottom: 18, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.muted },
  detailHeaderIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: colors.primaryDark, justifyContent: "center", alignItems: "center" },
  detailTitle: { fontSize: 18, fontWeight: "800", color: colors.foreground },
  detailSubtitle: { fontSize: 11, color: colors.mutedForeground, marginTop: 2 },
  sectionLabel: { fontSize: 11, fontWeight: "800", color: colors.mutedForeground, letterSpacing: 0.5, marginBottom: 10 },
  subItem: { flexDirection: "row", alignItems: "center", backgroundColor: colors.secondary, padding: 12, borderRadius: 10, marginBottom: 6, borderWidth: 1, borderColor: colors.border },
  subItemText: { fontSize: 13, fontWeight: "700", color: colors.foreground },
  subItemSub: { fontSize: 11, color: colors.mutedForeground, marginTop: 1 },
  emptySubText: { fontSize: 12, color: colors.mutedForeground, marginBottom: 8 },
  teacherAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.accentLight, justifyContent: "center", alignItems: "center", marginRight: 10 },
  teacherAvatarText: { fontSize: 12, fontWeight: "800", color: colors.primaryDark },
  closeBtn: { marginTop: 14, backgroundColor: colors.primaryDark, borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  closeBtnText: { fontSize: 13, fontWeight: "700", color: colors.primaryForeground },
});