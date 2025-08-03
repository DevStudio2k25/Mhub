"use client"

import { usePathname } from "next/navigation"
import { BookOpen, Menu } from "lucide-react"

interface MobileAppBarProps {
  isMobileMenuOpen: boolean
  setIsMobileMenuOpen: (open: boolean) => void
}

export default function MobileAppBar({ isMobileMenuOpen, setIsMobileMenuOpen }: MobileAppBarProps) {
  const pathname = usePathname()

  // Function to get page title based on pathname
  const getPageTitle = () => {
    const pathSegments = pathname.split('/').filter(Boolean)
    
    if (pathSegments.length === 0) return "Dashboard"
    
    // Handle different route patterns
    if (pathSegments.includes('super-admin')) {
      const lastSegment = pathSegments[pathSegments.length - 1]
      switch (lastSegment) {
        case 'dashboard': return "Super Admin Dashboard"
        case 'manage-super-admins': return "Manage Super Admins"
        case 'manage-admins': return "Manage Admins"
        case 'manage-admin-mentors': return "Admin-Mentor Access"
        case 'all-users': return "All Users"
        case 'profile': return "My Profile"
        default: return "Super Admin"
      }
    }
    
    if (pathSegments.includes('admin')) {
      const lastSegment = pathSegments[pathSegments.length - 1]
      switch (lastSegment) {
        case 'dashboard': return "Admin Dashboard"
        case 'users': return "Manage Users"
        case 'manage-mentors': return "Manage Mentors"
        case 'profile': return "My Profile"
        default: return "Admin"
      }
    }
    
    if (pathSegments.includes('mentor')) {
      const lastSegment = pathSegments[pathSegments.length - 1]
      switch (lastSegment) {
        case 'dashboard': return "Mentor Dashboard"
        case 'mentees': return "My Mentees"
        case 'manage-profiles': return "Manage Profiles"
        case 'classes': return "My Classes"
        case 'guidance': return "Project Guidance"
        case 'reports': return "Project Reports"
        case 'guided-reports': return "Guided Reports"
        case 'sessions': return "Sessions"
        case 'queries': return "Queries"
        default: return "Mentor"
      }
    }
    
    if (pathSegments.includes('mentee')) {
      const lastSegment = pathSegments[pathSegments.length - 1]
      switch (lastSegment) {
        case 'dashboard': return "Mentee Dashboard"
        case 'my-profile': return "My Profile"
        case 'submit-report': return "Submit Report"
        case 'reports': return "My Reports"
        case 'sessions': return "Sessions"
        case 'ask-query': return "Ask Query"
        default: return "Mentee"
      }
    }
    
    // Handle view-profile routes
    if (pathSegments.includes('view-profile')) {
      const role = pathSegments[pathSegments.length - 2] // admin, mentor, or mentee
      return `View ${role.charAt(0).toUpperCase() + role.slice(1)} Profile`
    }
    
    // Handle other common routes
    switch (pathSegments[pathSegments.length - 1]) {
      case 'profile': return "My Profile"
      case 'dashboard': return "Dashboard"
      case 'register': return "Register"
      case 'login': return "Login"
      default: 
        // Capitalize and format the last segment
        return pathSegments[pathSegments.length - 1]
          .split('-')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ')
    }
  }

  // Hide app bar when mobile menu is open
  if (isMobileMenuOpen) {
    return null
  }

  return (
    <div className="lg:hidden sticky top-0 z-40 bg-white border-b border-amber-200 shadow-sm">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-lg hover:bg-gradient-to-r hover:from-amber-100 hover:to-orange-100 transition-all duration-200 group"
          >
            <Menu size={24} className="text-amber-600 group-hover:scale-110 transition-transform duration-200" />
          </button>
          <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-lg p-2 text-white shadow-md">
            <BookOpen size={20} />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-800">{getPageTitle()}</h1>
            <p className="text-xs text-amber-600 font-medium">MentorHub</p>
          </div>
        </div>
      </div>
    </div>
  )
}