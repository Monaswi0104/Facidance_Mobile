const fs = require('fs');
const files = [
  "src/screens/admin/TeachersManagement.js",
  "src/screens/admin/DepartmentsManagement.js",
  "src/screens/admin/ProgramsManagement.js",
  "src/screens/admin/CoursesManagement.js",
  "src/screens/admin/StudentsManagement.js",
  "src/screens/teacher/MyCourses.js",
  "src/screens/teacher/StudentEnrollment.js",
  "src/screens/teacher/AttendanceReport.js",
  "src/screens/student/MyCourses.js",
  "src/screens/student/AttendanceHistory.js",
  "src/screens/student/ProfileUpload.js"
];

for (let f of files) {
  if (!fs.existsSync(f)) { console.log(f + " missing"); continue; }
  let content = fs.readFileSync(f, 'utf8');
  
  if (content.includes("RefreshControl")) {
    console.log(f + " already has RefreshControl");
    continue;
  }

  // 1. Add RefreshControl to imports
  content = content.replace(/import \{([\s\S]*?)\} from "react-native";/, (match, p1) => {
    if (!p1.includes("RefreshControl")) {
      return `import {${p1}, RefreshControl } from "react-native";`;
    }
    return match;
  });

  // 2. Add isRefreshing state and onRefresh function
  // Find load function name: typically in useFocusEffect(useCallback(() => { loadSomething(); }, []));
  let loadFnName = "loadData";
  let match = content.match(/useFocusEffect\(useCallback\(\(\) => \{ (.*?)\(\)/);
  if (match) {
    loadFnName = match[1];
  } else {
    let match2 = content.match(/useEffect\(\(\) => \{\s*(.*?)\(\)/);
    if (match2) loadFnName = match2[1];
  }

  // Insert state after const [isLoading, setIsLoading] = useState
  if (content.includes("setIsLoading")) {
    content = content.replace(/const \[isLoading, setIsLoading\] = useState\(.*?\);/, `const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await ${loadFnName}(false); // Assume it accepts showLoading=false, but just await it
    setIsRefreshing(false);
  }, []);`);
  } else {
    // If no isLoading, just put it after useTheme
    content = content.replace(/const \{ colors, isDark \} = useTheme\(\);/, `const { colors, isDark } = useTheme();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    if (typeof ${loadFnName} === 'function') await ${loadFnName}();
    setIsRefreshing(false);
  }, []);`);
  }

  // 3. Add to ScrollView. We want the FIRST ScrollView that has contentContainerStyle
  content = content.replace(/<ScrollView(.*?)>/, `<ScrollView$1
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={["#10B981"]} tintColor="#10B981" />
        }
      >`);

  fs.writeFileSync(f, content);
  console.log("Updated", f);
}
