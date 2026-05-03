const fs = require('fs');

const filesToFix = [
  "src/screens/teacher/MyCourses.js",
  "src/screens/teacher/StudentEnrollment.js",
  "src/screens/teacher/AttendanceReport.js",
  "src/screens/student/MyCourses.js",
  "src/screens/student/AttendanceHistory.js",
  "src/screens/student/ProfileUpload.js"
];

for (let file of filesToFix) {
  let content = fs.readFileSync(file, 'utf8');

  // Find the onRefresh definition
  let onRefreshMatch = content.match(/const onRefresh = useCallback\(async \(\) => \{\s+setIsRefreshing\(true\);\s+(?:if \(typeof (.*?) === 'function'\) )?await (.*?)\(/);
  if (!onRefreshMatch) continue;

  let currentCall = onRefreshMatch[2]; // e.g. "loadData", "const load = async"
  
  // We need to find the useFocusEffect or useEffect that loads data
  let loadFnName = null;
  
  // Look for: const load = async () => { ... } inside useFocusEffect
  if (content.includes("const load = async () => {")) {
    loadFnName = "load";
    // We need to extract it? Actually we can just rename it to loadData and move it out.
    // Instead of regex manipulation, let's just use string replacement.
    content = content.replace("useFocusEffect(useCallback(() => {", "const loadData = async () => {");
    // Wait, the end of useFocusEffect is `load(); \n  }, []));`
    content = content.replace(/load\(\);\s*\}, \[\]\)\);/, "};\n\n  useFocusEffect(useCallback(() => {\n    loadData();\n  }, []));");
    // Also change `const load = async () => {` to just nothing, since we replaced the wrapper with it.
    // Wait, replacing `useFocusEffect(useCallback(() => {` with `const loadData = async () => {` means `const load = async () => {` is still inside!
    // So it becomes `const loadData = async () => { const load = async () => { ... } load(); };` -> This works perfectly as a wrapper!
    // And then we update onRefresh
    content = content.replace(currentCall, "loadData");
  } 
  else if (content.includes("const fetchHistory = async () => {")) {
    // For AttendanceHistory.js
    content = content.replace("useFocusEffect(useCallback(() => {", "const loadData = async () => {");
    content = content.replace(/fetchHistory\(\);\s*\}, \[\]\)\);/, "};\n\n  useFocusEffect(useCallback(() => {\n    loadData();\n  }, []));");
    content = content.replace(currentCall, "loadData");
  }
  else if (content.includes("useEffect(() => {")) {
    // Look for ProfileUpload.js, maybe it doesn't load data
    if (file.includes("ProfileUpload")) {
      content = content.replace(/await (.*?)\(false\);/, ""); // remove await
      content = content.replace(/await (.*?)\(\);/, "");
    }
  }

  // Double check if we still call loadData but it's missing:
  // (In MyCourses, it might be const load = async () => ...)
  
  fs.writeFileSync(file, content);
  console.log("Fixed", file);
}
