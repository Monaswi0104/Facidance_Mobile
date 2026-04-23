# Facidance Mobile

A comprehensive mobile attendance management system built with React Native, designed for educational institutions to streamline student attendance tracking, course management, and administrative oversight.

## 🎯 Features

### For Students
- **Face Recognition Attendance**: Quick and secure attendance marking using facial recognition
- **Attendance History**: View detailed attendance records across all enrolled courses
- **Course Management**: Browse enrolled courses and track attendance rates
- **Profile Management**: Update personal information and profile photo

### For Teachers
- **Attendance Sessions**: Conduct real-time attendance sessions with camera-based verification
- **Student Management**: View and manage enrolled students per course
- **Attendance Reports**: Generate comprehensive attendance reports with analytics
- **Course Overview**: Monitor attendance rates and student engagement
- **At-Risk Alerts**: Identify students with attendance below 75% threshold

### For Administrators
- **Dashboard**: Institution-wide overview with key metrics and analytics
- **User Management**: Manage teachers, students, departments, and programs
- **Course Management**: Create and manage courses across departments
- **Student Oversight**: Track student status (active/graduated) and enrollment
- **Teacher Approval**: Review and approve teacher applications

## 🛠 Tech Stack

- **Frontend**: React Native 0.84.1
- **Navigation**: React Navigation 7.x
- **State Management**: Redux Toolkit
- **UI Components**: Lucide React Native icons
- **Camera**: React Native Camera Kit
- **File Handling**: React Native FS, React Native Document Picker
- **Image Processing**: React Native Image Picker
- **Data Export**: XLSX for reports, React Native Share
- **Date/Time**: @react-native-community/datetimepicker

## 📱 Screens

### Authentication
- Login Screen
- Registration Screen

### Student Portal
- Student Dashboard
- My Courses
- Course Attendance
- Attendance History
- Profile Upload

### Teacher Portal
- Teacher Dashboard
- My Courses
- Attendance Camera
- Attendance Session
- Course Details
- Student Enrollment
- Attendance Report

### Admin Portal
- Admin Dashboard
- Teachers Management
- Students Management
- Departments Management
- Programs Management
- Courses Management

## 🚀 Getting Started

### Prerequisites

- Node.js >= 22.11.0
- npm or yarn
- React Native CLI
- Android Studio (for Android development)
- Xcode (for iOS development - macOS only)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Monaswi0104/Facidance_Mobile.git
   cd Facidance_Mobile
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Install iOS dependencies (macOS only)**
   ```bash
   cd ios
   bundle install
   bundle exec pod install
   cd ..
   ```

4. **Configure environment variables**
   - Create a `.env` file in the root directory
   - Add your API endpoints and configuration

### Running the App

#### Android
```bash
# Start Metro bundler
npm start

# In another terminal, run the Android app
npm run android
```

#### iOS (macOS only)
```bash
# Start Metro bundler
npm start

# In another terminal, run the iOS app
npm run ios
```

## 📁 Project Structure

```
Facidance_Mobile/
├── src/
│   ├── api/              # API calls and configurations
│   ├── assets/           # Images, fonts, and static assets
│   ├── components/       # Reusable UI components
│   ├── navigation/       # Navigation configuration
│   ├── screens/          # Screen components
│   │   ├── admin/        # Admin screens
│   │   ├── student/      # Student screens
│   │   └── teacher/      # Teacher screens
│   └── theme/            # Theme and styling
├── android/              # Android native code
├── ios/                  # iOS native code
└── App.tsx              # Main app component
```

## 🔧 Configuration

### API Configuration
Update the API endpoints in `src/api/config.js` to match your backend server.

### Theme Customization
Modify the theme colors and styles in `src/theme/Theme.js`.

## 📊 Key Features Explained

### Face Recognition Attendance
- Uses camera integration to capture student faces
- Matches against registered face embeddings
- Provides instant attendance confirmation
- Works offline with local caching

### Attendance Analytics
- Real-time attendance rate calculation
- Visual charts and graphs
- Export reports to CSV
- At-risk student identification

### Multi-Role Access
- Role-based authentication (Student, Teacher, Admin)
- Customized dashboards per role
- Granular permission control

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License.

## 👨‍💻 Author

**Monaswi0104**

## 🙏 Acknowledgments

- React Native community for the amazing framework
- All contributors and users of this project

## 📞 Support

For support, please open an issue in the GitHub repository or contact the development team.

---

**Note**: This is a mobile application that requires a backend API server to function properly. Ensure your backend is running and accessible before using the app.
