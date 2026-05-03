import re

with open("src/screens/admin/CoursesManagement.js", "r") as f:
    content = f.read()

# 1. Add FlatList
content = content.replace("ScrollView, Alert", "FlatList, ScrollView, Alert")

# 2. Add isSubmitting state and change searchQuery to search
content = content.replace('const [searchQuery, setSearchQuery] = useState("");', 'const [search, setSearch] = useState("");\n  const [isSubmitting, setIsSubmitting] = useState(false);')
content = content.replace('searchQuery', 'search')
content = content.replace('setSearchQuery', 'setSearch')

# 3. Fix handleCreateCourse name to handleAddCourse
content = content.replace('const handleCreateCourse = async () => {', 'const handleAddCourse = async () => {')
content = content.replace('const { teacherId, programId, academicYear, semesterNumber, name } = form;', 'const { teacherId, programId, academicYear, semesterNumber, name, code, entryCode } = form;')
content = content.replace('if (!teacherId || !programId || !academicYear || !semesterNumber || !name) {', 'if (!teacherId || !programId || !academicYear || !semesterNumber || !name || !code) {')
content = content.replace('const result = await createCourse({ name, teacherId, programId, academicYear, semesterNumber });', 'setIsSubmitting(true);\n      const result = await createCourse({ name, code, teacherId, programId, academicYear, semesterNumber, entryCode });')
content = content.replace('Alert.alert("Error", e.message || "Failed to create course.");', 'Alert.alert("Error", e.message || "Failed to create course.");\n    } finally {\n      setIsSubmitting(false);')
content = content.replace('onPress={handleCreateCourse}', 'onPress={handleAddCourse}')
content = content.replace('setForm({ departmentId: null, teacherId: null, programId: null, academicYear: "", semesterNumber: null, name: "" });', 'setForm({ departmentId: null, teacherId: null, programId: null, academicYear: "", semesterNumber: null, name: "", code: "", entryCode: "" });')

# 4. Extract parts and restructure
scroll_start = content.find("<ScrollView contentContainerStyle={styles.container}")

header_part = """      <FlatList
        data={filteredCourses}
        keyExtractor={(c) => c.id.toString()}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={["#10B981"]} tintColor="#10B981" />
        }
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>"""

map_start = content.find("filteredCourses.map((c, i) => (")

map_end = content.find("})", map_start)
if map_end == -1: map_end = content.find("))", map_start)
map_end = content.find(")}", map_end) + 2

item_start = content.find("(", map_start + 20) + 1
item_end = content.rfind("))", map_start, map_end)
item_jsx = content[item_start:item_end].strip()

scroll_close_idx = content.find("</ScrollView>", map_end)

# extract EVERYTHING from <ScrollView> to map_start
part1_end = content.rfind("<View style={styles.listCard}>", scroll_start, map_start)
part1 = content[scroll_start:part1_end]

# Remove the <ScrollView ...> tag completely
part1 = re.sub(r'<ScrollView.*?>\n*', '', part1)

# Grab the listCard header up to the ternary `filteredCourses.length === 0 ? (`
list_card_header_end = content.find("{filteredCourses.length === 0 ? (", part1_end)
list_card_header = content[part1_end:list_card_header_end]
list_card_header = list_card_header.replace('style={styles.listCard}', 'style={[styles.listCard, { paddingBottom: 0, borderBottomWidth: 0, borderBottomLeftRadius: 0, borderBottomRightRadius: 0, marginBottom: 0 }]}')

# Button loading
list_card_header = list_card_header.replace('disabled={!form.name || !form.code || !form.academicYear || !form.semesterNumber || !form.programId || !form.teacherId}', 'disabled={!form.name || !form.code || !form.academicYear || !form.semesterNumber || !form.programId || !form.teacherId || isSubmitting}')
list_card_header = list_card_header.replace('<Text style={styles.formSubmitText}>Add Course</Text>', '{isSubmitting ? <ActivityIndicator color={colors.primaryForeground} size="small" /> : <Text style={styles.formSubmitText}>Add Course</Text>}')
part1 = part1.replace('disabled={!form.name || !form.code || !form.academicYear || !form.semesterNumber || !form.programId || !form.teacherId}', 'disabled={!form.name || !form.code || !form.academicYear || !form.semesterNumber || !form.programId || !form.teacherId || isSubmitting}')
part1 = part1.replace('<Text style={styles.formSubmitText}>Add Course</Text>', '{isSubmitting ? <ActivityIndicator color={colors.primaryForeground} size="small" /> : <Text style={styles.formSubmitText}>Add Course</Text>}')

empty_text_part = """
              {filteredCourses.length === 0 && (
                <Text style={styles.emptyText}>No courses found.</Text>
              )}
            </View>
          </>
        )}
          </>
        }
"""

flatlist_code = header_part + "\n" + part1 + list_card_header + empty_text_part + """        renderItem={({ item: c, index: i }) => (
          <View style={[styles.listCard, { paddingTop: 0, paddingBottom: 0, borderRadius: 0, borderTopWidth: 0, borderBottomWidth: 0, marginBottom: 0 }]}>
            """ + item_jsx + """
          </View>
        )}
        ListFooterComponent={
          <View style={[styles.listCard, { paddingTop: 0, borderTopWidth: 0, borderTopLeftRadius: 0, borderTopRightRadius: 0 }]} />
        }
      />"""

final_content = content[:scroll_start] + flatlist_code + content[scroll_close_idx + 13:]

with open("src/screens/admin/CoursesManagement.js", "w") as f:
    f.write(final_content)

print("Done Courses")
