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
  let content = fs.readFileSync(f, 'utf8');
  let match = content.match(/const onRefresh = useCallback\(async \(\) => \{\s+setIsRefreshing\(true\);\s+(?:if \(typeof (.*?) === 'function'\) )?await (.*?)\(/);
  if (match) {
    let fnName = match[2];
    if (fnName.startsWith("if ")) fnName = match[2]; // handle the if case
    let search1 = `const ${fnName} =`;
    let search2 = `function ${fnName}`;
    if (!content.includes(search1) && !content.includes(search2)) {
      console.log(f, "MISSING:", fnName);
    }
  }
}
