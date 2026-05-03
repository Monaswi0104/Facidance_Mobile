const fs = require('fs');

function migrate(file, arrayName, mapStartString, mapEndString, topWrapperStart, bottomWrapperEnd) {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');

  if (!content.includes('import { FlatList } from "react-native"')) {
    content = content.replace('ScrollView,', 'ScrollView, FlatList,');
  }

  // Find the exact <ScrollView ...> tag
  const svRegex = /<ScrollView(.*?)>/;
  const svMatch = content.match(svRegex);
  if (!svMatch) return;

  const scrollTag = svMatch[0];
  const scrollProps = svMatch[1];

  // We want to replace <ScrollView ...> with <FlatList ... ListHeaderComponent={<>}
  
  // Find where the map starts and ends
  const mapIdx = content.indexOf(mapStartString);
  if (mapIdx === -1) return;
  
  const endIdx = content.indexOf(mapEndString, mapIdx);
  if (endIdx === -1) return;
  
  // Extract the item template
  const mapBlock = content.substring(mapIdx, endIdx + mapEndString.length);
  
  // Map block looks like:
  // filteredStudents.map((s, i) => (
  //   <TouchableOpacity key={i} ...> ... </TouchableOpacity>
  // ))
  
  // We need to extract the JSX inside
  const itemRegex = /\.map\(\((.*?), (.*?)\) => \(\s*([\s\S]*)\s*\)\)/;
  const itemMatch = mapBlock.match(itemRegex);
  
  if (!itemMatch) return;
  const itemName = itemMatch[1].trim();
  const indexName = itemMatch[2].trim();
  const jsxContent = itemMatch[3];

  let newFlatList = `<FlatList${scrollProps}\n        data={${arrayName}}\n        keyExtractor={(${itemName}, ${indexName}) => ${itemName}.id ? ${itemName}.id.toString() : ${indexName}.toString()}\n        ListHeaderComponent={\n          <>\n`;

  // Everything between <ScrollView> and the topWrapperStart gets put into ListHeaderComponent
  const part1Start = content.indexOf(scrollTag) + scrollTag.length;
  const part1End = content.indexOf(topWrapperStart, part1Start);
  
  let part1 = content.substring(part1Start, part1End);
  
  // Then the top wrapper start goes into ListHeaderComponent too
  const part2Start = part1End;
  const part2End = mapIdx;
  let part2 = content.substring(part2Start, part2End);
  
  // We close the ListHeaderComponent
  newFlatList += part1 + part2 + `          </>\n        }\n        renderItem={({ item: ${itemName}, index: ${indexName} }) => (\n          ${jsxContent}\n        )}\n        ListFooterComponent={\n          <>\n`;
  
  // Everything after the map end up to bottomWrapperEnd goes into ListFooterComponent
  const part3Start = endIdx + mapEndString.length;
  const part3End = content.indexOf(bottomWrapperEnd, part3Start) + bottomWrapperEnd.length;
  let part3 = content.substring(part3Start, part3End);
  
  newFlatList += part3 + `          </>\n        }\n      />`;

  // Replace everything from <ScrollView> to bottomWrapperEnd with newFlatList
  const beforeScroll = content.substring(0, content.indexOf(scrollTag));
  const afterBottom = content.substring(part3End);
  
  // Also we need to remove the closing </ScrollView> tag
  let finalContent = beforeScroll + newFlatList + afterBottom;
  finalContent = finalContent.replace("</ScrollView>", "");

  fs.writeFileSync(file, finalContent);
  console.log("Migrated", file);
}

// StudentEnrollment.js
migrate(
  "src/screens/teacher/StudentEnrollment.js", 
  "filteredStudents", 
  "filteredStudents.map((s, i) => (", 
  "))",
  "<View style={styles.tableCard}>",
  "</View>" // the end of tableCard
);

