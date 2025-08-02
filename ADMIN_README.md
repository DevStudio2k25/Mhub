# Admin Account Guide

## Overview
Admin accounts in this mentorship system have comprehensive management capabilities to oversee mentors, mentees, and system operations. This guide covers all admin functionalities and responsibilities.

## Admin Role Types

### 1. Regular Admin (`admin`)
- Standard administrative privileges
- Can manage users, mentors, and mentees
- Access to reports and analytics

### 2. Admin+Mentor (`admin+mentor`)
- Combined admin and mentor privileges (assigned by Super Admin only)
- Can perform both administrative tasks and mentoring
- Has dual access to admin and mentor dashboards
- **Note:** Only Super Admins can create or modify admin+mentor roles

## Admin Dashboard Features

### 📊 Dashboard Overview (`/admin/dashboard`)
**Main Statistics:**
- Total Mentors count
- Total Mentees count
- Quick access to key functions

**Mentor Credentials Management:**
- Save mentor login credentials for quick access
- Edit and update saved credentials
- One-click login as mentor (for testing/support)

### 👥 User Management (`/admin/users`)
**Comprehensive User Control:**

#### Mentor Management
- **Create Single Mentor:**
  - Generate unique Mentor ID (format: MH2025001)
  - Set up authentication account
  - Configure profile information
  - **Restricted:** Can only create regular mentor accounts (admin+mentor creation moved to Super Admin)

- **Bulk Mentor Creation:**
  - Create multiple mentors simultaneously
  - Auto-generate sequential Mentor IDs
  - Real-time email validation
  - Progress tracking during creation
  - Automatic password generation

- **Mentor Features:**
  - View mentor profiles with images
  - Assign/remove admin access
  - Delete mentor accounts
  - Track mentor statistics

#### Mentee Management
- **View All Mentees:**
  - Expandable cards with full details
  - Profile images and information
  - Enrollment numbers and class details

- **Mentor Assignment:**
  - Assign mentees to mentors
  - Bulk assignment capabilities
  - Track assigned vs unassigned mentees
  - Save/cancel assignment changes

- **Mentee Organization:**
  - Filter by assigned/unassigned status
  - Search functionality
  - Class-based organization

#### Admin Management
- **Access Restricted:**
  - Admin account viewing moved to Super Admin only
  - Admin creation restricted to Super Admin accounts
  - Enhanced security and role separation

### 🎯 Mentor Access Control (`/admin/manage-mentors`)
**Access Restricted:**
- This feature is now limited to Super Admin accounts only
- Admin accounts can no longer assign admin privileges to mentors
- Contact Super Admin for any mentor role changes needed

### 📋 Reports Management (`/admin/reports`)
**System-wide Report Access:**
- View all submitted reports from mentees
- Download report files
- Track report status (pending/reviewed)
- User identification (mentee and mentor info)
- Timestamp tracking
- Comprehensive report analytics

## Technical Implementation

### Database Collections
Admins interact with multiple Firestore collections:
- `admins` - Admin user data
- `mentors` - Mentor profiles and credentials
- `mentees` - Student information and assignments
- `reports` - Submitted reports and feedback
- `classes` - Class organization data

### Authentication Flow
1. **Admin Login:** Standard Firebase Authentication
2. **Role Verification:** Firestore role-based access control
3. **Session Management:** Secure admin session handling
4. **Mentor Impersonation:** Temporary login as mentor for support

### Security Features
- **Role-based Access Control:** Strict permission checking
- **Secure User Creation:** Proper Firebase Auth integration
- **Data Validation:** Email uniqueness and format validation
- **Audit Trail:** Creation tracking and timestamps

## Admin Responsibilities

### Daily Operations
- Monitor new user registrations
- Assign mentees to appropriate mentors
- Review and manage reports
- Handle user access issues

### User Management
- Create mentor accounts as needed
- Manage mentor-mentee assignments
- **Restricted:** Role changes now handled by Super Admin
- Process basic access requests (escalate admin requests to Super Admin)

### System Maintenance
- Monitor system statistics
- Ensure proper mentor-mentee ratios
- Maintain data integrity
- Handle technical support requests

## API Endpoints

### Admin Creation APIs
- `POST /api/create-admin` - Create single admin account
- `POST /api/create-bulk-admins` - Create multiple admin accounts

### Utility APIs
- `POST /api/check-email` - Validate email uniqueness
- `POST /api/cleanup-orphaned-users` - System maintenance

## Navigation Structure

### Admin Sidebar Menu
When on admin pages, the sidebar shows:
- 📊 **Dashboard** - Main admin overview
- 👥 **Manage Users** - Mentor and mentee management (admin viewing restricted)
- ⚙️ **Manage Mentors** - Access restricted message (feature moved to Super Admin)
- 📋 **Reports** - System reports view

### Role-based Navigation
- Admin users see admin-specific navigation
- Admin+mentor users can switch between admin and mentor views
- Context-aware menu based on current page

## Best Practices

### User Creation
1. Always verify email uniqueness before creation
2. Use bulk creation for multiple mentors
3. Generate strong passwords automatically
4. Assign appropriate roles based on requirements

### Mentor-Mentee Management
1. Maintain balanced mentor-mentee ratios
2. Consider class/year when making assignments
3. Regularly review unassigned mentees
4. Monitor mentor workload

### Security
1. Regularly audit admin access
2. Use mentor impersonation only for support
3. Keep admin credentials secure
4. Monitor system access logs

## Troubleshooting

### Common Issues
- **Email Already Exists:** Check all collections for duplicate emails
- **Creation Failures:** Verify Firebase Admin SDK configuration
- **Access Denied:** Confirm user role and permissions
- **Assignment Issues:** Check mentor availability and capacity

### Support Actions
- Use mentor login feature for user support
- Check user data across all collections
- Verify role assignments and permissions
- Monitor creation process logs

## System Integration

### Firebase Services
- **Authentication:** User account management
- **Firestore:** Data storage and retrieval
- **Admin SDK:** Server-side operations

### Frontend Components
- **Dashboard Layout:** Consistent admin interface
- **User Cards:** Expandable user information
- **Form Validation:** Real-time input checking
- **Progress Tracking:** Creation process monitoring

This admin system provides comprehensive control over the mentorship platform while maintaining security and user experience standards.