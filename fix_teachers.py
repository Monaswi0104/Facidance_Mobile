import re

with open("src/screens/admin/TeachersManagement.js", "r") as f:
    content = f.read()

# Add FlatList to imports
if "FlatList" not in content:
    content = content.replace("ScrollView, Alert", "FlatList, ScrollView, Alert")

scroll_start = content.find("<ScrollView contentContainerStyle={styles.container}")

header_part = """      <FlatList
        data={filteredApproved}
        keyExtractor={(t) => t.id.toString()}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={["#10B981"]} tintColor="#10B981" />
        }
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>"""

map_start = content.find("filteredApproved.map((t) => (")

map_end = content.find("})", map_start)
if map_end == -1: map_end = content.find("))", map_start)
map_end = content.find(")}", map_end) + 2

item_start = content.find("(", map_start + 20) + 1
item_end = content.rfind("))", map_start, map_end)
item_jsx = content[item_start:item_end].strip()

scroll_close_idx = content.find("</ScrollView>", map_end)

part1_end = content.rfind("<View style={[styles.sectionCard, { marginLeft: 6 }]}>", scroll_start, map_start)
if part1_end == -1: part1_end = map_start

part1 = content[scroll_start:part1_end]
part1 = re.sub(r'<ScrollView.*?>\n*', '', part1)

list_card_header = content[part1_end:map_start]
list_card_header = list_card_header.replace('style={[styles.sectionCard, { marginLeft: 6 }]}', 'style={[styles.sectionCard, { marginLeft: 6, paddingBottom: 0, borderBottomWidth: 0, borderBottomLeftRadius: 0, borderBottomRightRadius: 0, marginBottom: 0 }]}')


flatlist_code = header_part + "\n" + part1 + list_card_header + """          </>
        }
        renderItem={({ item: t }) => (
          <View style={[styles.sectionCard, { marginLeft: 6, paddingTop: 0, paddingBottom: 0, borderRadius: 0, borderTopWidth: 0, borderBottomWidth: 0, marginBottom: 0 }]}>
            """ + item_jsx + """
          </View>
        )}
        ListFooterComponent={
          <View style={[styles.sectionCard, { marginLeft: 6, paddingTop: 0, borderTopWidth: 0, borderTopLeftRadius: 0, borderTopRightRadius: 0 }]} />
        }
      />"""

final_content = content[:scroll_start] + flatlist_code + content[scroll_close_idx + 13:]

# Fix hanging ternary
final_content = final_content.replace("""              {filteredApproved.length === 0 ? (
                <View style={styles.emptyBox}>
                  <User size={24} color={colors.mutedForeground} style={{ marginBottom: 8 }} />
                  <Text style={styles.emptyText}>No approved teachers.</Text>
                </View>
              ) : (""", """              {filteredApproved.length === 0 && (
                <View style={styles.emptyBox}>
                  <User size={24} color={colors.mutedForeground} style={{ marginBottom: 8 }} />
                  <Text style={styles.emptyText}>No approved teachers.</Text>
                </View>
              )}""")

with open("src/screens/admin/TeachersManagement.js", "w") as f:
    f.write(final_content)

print("Done Teachers")
