const fs = require('fs');

const filesToFix = [
  "src/screens/teacher/MyCourses.js",
  "src/screens/teacher/StudentEnrollment.js",
  "src/screens/teacher/AttendanceReport.js",
  "src/screens/student/MyCourses.js",
  "src/screens/student/AttendanceHistory.js"
];

for (let file of filesToFix) {
  let content = fs.readFileSync(file, 'utf8');

  // Fix MyCourses, StudentEnrollment, AttendanceReport, student/MyCourses
  content = content.replace("const loadData = async () => {\n    const load = async () => {", "const loadData = async () => {");
  content = content.replace("const loadData = async () => {\n  const fetchHistory = async () => {", "const loadData = async () => {"); // For AttendanceHistory
  
  // Remove the double "};" at the end of the try block
  content = content.replace("    };\n    };", "    };");

  fs.writeFileSync(file, content);
  console.log("Fixed again", file);
}
