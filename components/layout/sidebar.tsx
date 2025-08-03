"use client"

import { useAuth } from "@/contexts/auth-context"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"

import {
  Users, FileText, Calendar, MessageSquare, Upload, Home, LogOut, BookOpen,
  UserCircle, X, ShieldCheck, GraduationCap, School,
  BarChart, Settings, BookMarked, UserCog, UserCheck,
  Presentation, HelpCircle, ChevronRight
} from "lucide-react"
import RoleSwitcher from "@/components/ui/role-switcher"
import { useState, useEffect } from "react"
import Image from "next/image"

interface SidebarProps {
  isMobileMenuOpen: boolean
  setIsMobileMenuOpen: (open: boolean) => void
}

function Sidebar({ isMobileMenuOpen, setIsMobileMenuOpen }: SidebarProps) {
  const { userData, logout } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null)

  useEffect(() => {
    // Close mobile menu when route changes
    setIsMobileMenuOpen(false)
  }, [pathname, setIsMobileMenuOpen])

  useEffect(() => {
    // Get profile image if available
    if (userData) {
      if (userData.profileImage) {
        setProfileImageUrl(userData.profileImage)
      } else if (userData.photoURL) {
        setProfileImageUrl(userData.photoURL)
      } else {
        setProfileImageUrl(null)
      }
    }
  }, [userData])

  if (!userData) return null

  const handleLogout = async () => {
    await logout()
    router.push("/login")
  }

  // Helper function to get full name
  const getFullName = () => {
    if (userData.firstName && userData.lastName) {
      return userData.middleName
        ? `${userData.firstName} ${userData.middleName} ${userData.lastName}`
        : `${userData.firstName} ${userData.lastName}`
    }
    // Fallback to old name field or email
    return userData.name || userData.email?.split('@')[0] || 'User'
  }

  // Helper function to get initials
  const getInitials = () => {
    if (userData.firstName && userData.lastName) {
      const firstInitial = userData.firstName.charAt(0).toUpperCase()
      const lastInitial = userData.lastName.charAt(0).toUpperCase()
      return `${firstInitial}${lastInitial}`
    }
    // Fallback to first character of name or email
    return (userData.name || userData.email)?.charAt(0)?.toUpperCase() || 'U'
  }

  const isActive = (path: string) => {
    return pathname === path
  }

  const linkClass = (path: string) => {
    return `group flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${isActive(path)
      ? "bg-gradient-to-r from-amber-500 to-amber-600 text-white font-medium shadow-lg shadow-amber-500/25 transform scale-[1.02]"
      : "hover:bg-gradient-to-r hover:from-amber-50 hover:to-orange-50 text-gray-700 hover:text-amber-700 hover:shadow-sm hover:transform hover:scale-[1.01]"
      }`
  }

  const renderNavLink = (href: string, icon: React.ReactNode, label: string) => (
    <Link href={href} className={linkClass(href)}>
      <div className={isActive(href) ? "text-white" : "text-amber-600 group-hover:text-amber-700"}>
        {icon}
      </div>
      <span className="flex-1">{label}</span>
      {!isActive(href) && <ChevronRight size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" />}
    </Link>
  )

  const renderLinks = () => {
    // Check if we're on a super-admin page
    const isSuperAdminPage = pathname.startsWith('/super-admin')
    // Check if we're on an admin page
    const isAdminPage = pathname.startsWith('/admin')
    // Check if we're on a mentor page
    const isMentorPage = pathname.startsWith('/mentor')

    // Get current active role
    const currentRole = userData.currentRole || userData.role

    // If we're on a super-admin page and user is super-admin, show only super-admin links
    if (isSuperAdminPage && userData.role === 'super-admin') {
      return (
        <>
          {renderNavLink("/super-admin/dashboard", <BarChart size={20} />, "Dashboard")}
          {renderNavLink("/super-admin/manage-super-admins", <ShieldCheck size={20} />, "Super Admins")}
          {renderNavLink("/super-admin/manage-admins", <Settings size={20} />, "Admins")}
          {renderNavLink("/super-admin/manage-admin-mentors", <UserCog size={20} />, "Admin-Mentor Access")}
          {renderNavLink("/super-admin/all-users", <Users size={20} />, "All Users")}
          {renderNavLink("/super-admin/profile", <UserCircle size={20} />, "My Profile")}
          <button
            onClick={handleLogout}
            className="group flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 hover:bg-gradient-to-r hover:from-red-50 hover:to-red-100 text-gray-700 hover:text-red-700 hover:shadow-sm hover:transform hover:scale-[1.01] w-full text-left mt-2"
          >
            <div className="text-red-600 group-hover:text-red-700">
              <LogOut size={20} />
            </div>
            <span className="flex-1">Logout</span>
            <ChevronRight size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        </>
      )
    }

    // If we're on an admin page and user has admin access, show only admin links
    if (isAdminPage && userData.role === 'admin') {
      return (
        <>
          {renderNavLink("/admin/dashboard", <BarChart size={20} />, "Dashboard")}
          {renderNavLink("/admin/users", <Users size={20} />, "Manage Users")}
          {renderNavLink("/admin/manage-mentors", <UserCog size={20} />, "Manage Mentors")}
          {renderNavLink("/admin/profile", <ShieldCheck size={20} />, "My Profile")}
          <button
            onClick={handleLogout}
            className="group flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 hover:bg-gradient-to-r hover:from-red-50 hover:to-red-100 text-gray-700 hover:text-red-700 hover:shadow-sm hover:transform hover:scale-[1.01] w-full text-left mt-2"
          >
            <div className="text-red-600 group-hover:text-red-700">
              <LogOut size={20} />
            </div>
            <span className="flex-1">Logout</span>
            <ChevronRight size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        </>
      )
    }

    // If we're on a mentor page and user can be mentor, show mentor links
    if (isMentorPage && (userData.role === 'mentor' || (userData.role === 'admin' && userData.canBeMentor))) {
      return (
        <>
          {renderNavLink("/mentor/dashboard", <Home size={20} />, "Dashboard")}
          {renderNavLink("/mentor/mentees", <GraduationCap size={20} />, "My Mentees")}
          {renderNavLink("/mentor/manage-profiles", <UserCog size={20} />, "Manage Profiles")}
          {renderNavLink("/mentor/classes", <School size={20} />, "My Classes")}
          {renderNavLink("/mentor/guidance", <BookOpen size={20} />, "Project Guidance")}
          {renderNavLink("/mentor/reports", <FileText size={20} />, "Project Reports")}
          {renderNavLink("/mentor/guided-reports", <BookOpen size={20} />, "Guided Reports")}
          {renderNavLink("/mentor/sessions", <Calendar size={20} />, "Sessions")}
          {renderNavLink("/mentor/queries", <MessageSquare size={20} />, "Queries")}
          {renderNavLink("/profile", <UserCog size={20} />, "My Profile")}
          <button
            onClick={handleLogout}
            className="group flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 hover:bg-gradient-to-r hover:from-red-50 hover:to-red-100 text-gray-700 hover:text-red-700 hover:shadow-sm hover:transform hover:scale-[1.01] w-full text-left mt-2"
          >
            <div className="text-red-600 group-hover:text-red-700">
              <LogOut size={20} />
            </div>
            <span className="flex-1">Logout</span>
            <ChevronRight size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        </>
      )
    }

    // For non-specific pages, show role-specific links based on current role
    switch (currentRole) {
      case "super-admin":
        return (
          <>
            {renderNavLink("/super-admin/dashboard", <BarChart size={20} />, "Dashboard")}
            {renderNavLink("/super-admin/manage-super-admins", <ShieldCheck size={20} />, "Super Admins")}
            {renderNavLink("/super-admin/manage-admins", <Settings size={20} />, "Admins")}
            {renderNavLink("/super-admin/manage-admin-mentors", <UserCog size={20} />, "Admin-Mentor Access")}
            {renderNavLink("/super-admin/all-users", <Users size={20} />, "All Users")}
            {renderNavLink("/super-admin/profile", <UserCircle size={20} />, "My Profile")}
            <button
              onClick={handleLogout}
              className="group flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 hover:bg-gradient-to-r hover:from-red-50 hover:to-red-100 text-gray-700 hover:text-red-700 hover:shadow-sm hover:transform hover:scale-[1.01] w-full text-left mt-2"
            >
              <div className="text-red-600 group-hover:text-red-700">
                <LogOut size={20} />
              </div>
              <span className="flex-1">Logout</span>
              <ChevronRight size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          </>
        )
      case "admin":
        return (
          <>
            {renderNavLink("/admin/dashboard", <BarChart size={20} />, "Dashboard")}
            {renderNavLink("/admin/users", <Users size={20} />, "Manage Users")}
            {renderNavLink("/admin/manage-mentors", <UserCog size={20} />, "Manage Mentors")}
            {renderNavLink("/admin/profile", <ShieldCheck size={20} />, "My Profile")}
            <button
              onClick={handleLogout}
              className="group flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 hover:bg-gradient-to-r hover:from-red-50 hover:to-red-100 text-gray-700 hover:text-red-700 hover:shadow-sm hover:transform hover:scale-[1.01] w-full text-left mt-2"
            >
              <div className="text-red-600 group-hover:text-red-700">
                <LogOut size={20} />
              </div>
              <span className="flex-1">Logout</span>
              <ChevronRight size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          </>
        )
      case "mentor":
        return (
          <>
            {renderNavLink("/mentor/dashboard", <Home size={20} />, "Dashboard")}
            {renderNavLink("/mentor/mentees", <GraduationCap size={20} />, "My Mentees")}
            {renderNavLink("/mentor/manage-profiles", <UserCog size={20} />, "Manage Profiles")}
            {renderNavLink("/mentor/classes", <School size={20} />, "My Classes")}
            {renderNavLink("/mentor/guidance", <BookOpen size={20} />, "Project Guidance")}
            {renderNavLink("/mentor/reports", <FileText size={20} />, "Project Reports")}
            {renderNavLink("/mentor/guided-reports", <BookOpen size={20} />, "Guided Reports")}
            {renderNavLink("/mentor/sessions", <Calendar size={20} />, "Sessions")}
            {renderNavLink("/mentor/queries", <MessageSquare size={20} />, "Queries")}
            {renderNavLink("/profile", <UserCog size={20} />, "My Profile")}
            <button
              onClick={handleLogout}
              className="group flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 hover:bg-gradient-to-r hover:from-red-50 hover:to-red-100 text-gray-700 hover:text-red-700 hover:shadow-sm hover:transform hover:scale-[1.01] w-full text-left mt-2"
            >
              <div className="text-red-600 group-hover:text-red-700">
                <LogOut size={20} />
              </div>
              <span className="flex-1">Logout</span>
              <ChevronRight size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          </>
        )
      case "mentee":
        return (
          <>
            {renderNavLink("/mentee/dashboard", <Home size={20} />, "Dashboard")}
            {renderNavLink("/mentee/my-profile", <UserCheck size={20} />, "My Profile")}
            {renderNavLink("/mentee/submit-report", <Upload size={20} />, "Submit Report")}
            {renderNavLink("/mentee/reports", <BookMarked size={20} />, "My Reports")}
            {renderNavLink("/mentee/sessions", <Presentation size={20} />, "Sessions")}
            {renderNavLink("/mentee/ask-query", <HelpCircle size={20} />, "Ask Query")}
            <button
              onClick={handleLogout}
              className="group flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 hover:bg-gradient-to-r hover:from-red-50 hover:to-red-100 text-gray-700 hover:text-red-700 hover:shadow-sm hover:transform hover:scale-[1.01] w-full text-left mt-2"
            >
              <div className="text-red-600 group-hover:text-red-700">
                <LogOut size={20} />
              </div>
              <span className="flex-1">Logout</span>
              <ChevronRight size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          </>
        )
      default:
        return null
    }
  }



  return (
    <>
      <div className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 lg:hidden ${isMobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setIsMobileMenuOpen(false)}
      />

      <div className={`fixed lg:sticky top-0 left-0 h-screen w-72 bg-white flex flex-col z-50 shadow-2xl lg:shadow-lg lg:border-r lg:border-amber-100 transition-all duration-300 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-6 border-b border-amber-100 bg-gradient-to-br from-amber-50 to-orange-50">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl p-2.5 text-white shadow-lg shadow-amber-500/25">
                <BookOpen size={24} />
              </div>
              <h2 className="text-xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                Mentor<span className="text-amber-500">Hub</span>
              </h2>
            </div>
            {/* Close button for mobile */}
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="lg:hidden p-2 rounded-lg hover:bg-gradient-to-r hover:from-red-100 hover:to-red-200 transition-all duration-200 group"
            >
              <X size={24} className="text-gray-600 group-hover:text-red-600 group-hover:rotate-90 transition-all duration-200" />
            </button>
          </div>
          <div className="space-y-3 mt-4">
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white/70 backdrop-blur-sm border border-amber-200/50 shadow-sm">
              {profileImageUrl ? (
                <div className="relative w-9 h-9 rounded-full overflow-hidden border-2 border-amber-300 shadow-md">
                  <Image
                    src={profileImageUrl}
                    alt={getFullName()}
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-orange-400 flex items-center justify-center text-white font-bold text-sm shadow-md">
                  {getInitials()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-800 truncate">
                  {getFullName()}
                </p>
                <div className="flex items-center gap-1 mt-0.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-400 animate-pulse"></div>
                  <p className="text-xs text-gray-600 capitalize font-medium truncate">
                    {userData.currentRole || userData.role}
                  </p>
                </div>
              </div>
            </div>

            {/* Role Switcher */}
            <div className="px-2">
              <RoleSwitcher />
            </div>
          </div>
        </div>
        <nav
          className="flex-1 p-4 space-y-1.5 overflow-y-auto custom-scrollbar"
          style={{
            scrollbarWidth: 'thin',
            scrollbarColor: '#f59e0b #fef3c7'
          }}
        >
          <style jsx>{`
            .custom-scrollbar::-webkit-scrollbar {
              width: 6px;
            }
            .custom-scrollbar::-webkit-scrollbar-track {
              background: #fef3c7;
              border-radius: 3px;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb {
              background: linear-gradient(to bottom, #f59e0b, #d97706);
              border-radius: 3px;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb:hover {
              background: linear-gradient(to bottom, #d97706, #b45309);
            }
          `}</style>
          {renderLinks()}
        </nav>
      </div>
    </>
  )
}

export default Sidebar
