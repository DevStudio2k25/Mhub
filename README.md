# Mentor-Mentee Report Management System

A comprehensive web application built with Next.js and Firebase for managing mentor-mentee relationships, reports, and academic interactions in educational institutions.

## 🌟 Overview

This system provides a complete platform for educational institutions to manage mentor-mentee programs, track student progress, facilitate communication, and maintain academic records. The application supports three distinct user roles with tailored dashboards and functionality.

## 🚀 Features

### 👨‍💼 Admin Features
- **User Management**: Create, edit, and delete mentor and mentee accounts
- **Bulk Operations**: Create multiple mentor accounts simultaneously
- **Role Assignment**: Assign mentors to mentees and manage relationships
- **System Oversight**: Monitor all activities across the platform
- **Class Management**: Organize students into classes and sections
- **Report Analytics**: View comprehensive reports and statistics

### 👨‍🏫 Mentor Features
- **Dashboard Overview**: View assigned mentees, pending reports, and queries
- **Mentee Management**: Track progress of assigned students
- **Report Review**: Review and provide feedback on mentee submissions
- **Query Response**: Answer student questions and provide guidance
- **Session Scheduling**: Schedule and manage mentoring sessions
- **Class Organization**: Create and manage academic classes
- **Admin Access**: Dual role support for mentor+admin accounts

### 👨‍🎓 Mentee Features
- **Personal Dashboard**: View academic progress and mentor information
- **Report Submission**: Submit regular reports and assignments
- **Query System**: Ask questions and receive mentor guidance
- **Session Participation**: Join scheduled mentoring sessions
- **Profile Management**: Maintain personal and academic information
- **Progress Tracking**: Monitor feedback and academic development

## 🛠️ Technology Stack

- **Frontend**: Next.js 15.2.4, React 19, TypeScript
- **Styling**: Tailwind CSS, Radix UI Components
- **Backend**: Firebase (Authentication, Realtime Database, Storage)
- **State Management**: React Context API
- **Forms**: React Hook Form with Zod validation
- **Animations**: Framer Motion
- **Charts**: Recharts
- **PDF Generation**: jsPDF
- **Email**: EmailJS

## 📁 Project Structure

```
├── app/                    # Next.js App Router
│   ├── admin/             # Admin dashboard and management
│   ├── mentor/            # Mentor dashboard and tools
│   ├── mentee/            # Mentee dashboard and features
│   ├── login/             # Authentication pages
│   ├── register/          # User registration
│   └── profile/           # User profile management
├── components/            # Reusable UI components
│   ├── layout/           # Layout components
│   └── ui/               # UI component library
├── contexts/             # React Context providers
├── hooks/                # Custom React hooks
├── lib/                  # Utility functions and configurations
└── public/               # Static assets
```

## 🔧 Installation & Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd mentor-mentee-system
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   pnpm install
   ```

3. **Firebase Configuration**
   - Create a Firebase project at [Firebase Console](https://console.firebase.google.com)
   - Enable Authentication, Realtime Database, and Storage
   - Update `lib/firebase.ts` with your Firebase configuration

4. **Environment Setup**
   - Configure Firebase settings in `lib/firebase.ts`
   - Set up authentication providers as needed

5. **Run the development server**
   ```bash
   npm run dev
   # or
   pnpm dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🔐 Authentication & Roles

The system supports three user roles:

- **Admin**: Full system access and user management
- **Mentor**: Student management and academic oversight
- **Mentee**: Personal dashboard and academic tools
- **Admin+Mentor**: Dual role with both admin and mentor capabilities

## 📊 Key Functionalities

### User Management
- Secure authentication with Firebase Auth
- Role-based access control
- Profile management with image uploads
- Bulk user creation for efficiency

### Academic Management
- Class and section organization
- Mentor-mentee assignment system
- Progress tracking and reporting
- Session scheduling and management

### Communication
- Query and response system
- Report submission and feedback
- Real-time notifications
- Email integration

### Data Management
- Real-time database synchronization
- Export capabilities (PDF, Excel)
- Comprehensive search and filtering
- Data analytics and reporting

## 🎨 UI/UX Features

- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Modern Interface**: Clean, professional design with Radix UI
- **Smooth Animations**: Enhanced user experience with Framer Motion
- **Dark/Light Mode**: Theme switching capability
- **Accessibility**: WCAG compliant components
- **Interactive Charts**: Data visualization with Recharts

## 🔒 Security Features

- Firebase Authentication integration
- Role-based route protection
- Secure data validation with Zod
- Protected API endpoints
- Input sanitization and validation

## 📱 Mobile Responsiveness

The application is fully responsive and optimized for:
- Desktop computers
- Tablets
- Mobile phones
- Various screen sizes and orientations

## 🚀 Deployment

The application can be deployed on various platforms:

- **Vercel** (Recommended for Next.js)
- **Netlify**
- **Firebase Hosting**
- **AWS Amplify**

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation

## 🔄 Version History

- **v0.1.0**: Initial release with core functionality
- User authentication and role management
- Basic dashboard implementations
- Report and query systems
- Firebase integration

---

**Built with ❤️ for educational institutions to enhance mentor-mentee relationships and academic success.**