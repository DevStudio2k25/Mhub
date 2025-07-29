"use client"

import { useEffect, useState } from "react"
import { collection, getDocs, query, where } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/contexts/auth-context"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Users, Shield, GraduationCap, UserCog, BarChart3, Settings, Database } from "lucide-react"
import Link from "next/link"

interface Stats {
  superAdmins: number
  admins: number
  mentors: number
  mentees: number
  totalUsers: number
}

export default function SuperAdminDashboard() {
  const { userData } = useAuth()
  const [stats, setStats] = useState<Stats>({
    superAdmins: 0,
    admins: 0,
    mentors: 0,
    mentees: 0,
    totalUsers: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      if (!userData || userData.role !== "super-admin") return

      try {
        // Fetch super admins
        const superAdminsSnapshot = await getDocs(collection(db, "super-admins"))
        const superAdminsCount = superAdminsSnapshot.size

        // Fetch admins
        const adminsSnapshot = await getDocs(collection(db, "admins"))
        const adminsCount = adminsSnapshot.size

        // For now, mentors and mentees count will be 0 (we'll update later)
        const mentorsCount = 0
        const menteesCount = 0

        const totalUsers = superAdminsCount + adminsCount + mentorsCount + menteesCount

        setStats({
          superAdmins: superAdminsCount,
          admins: adminsCount,
          mentors: mentorsCount,
          mentees: menteesCount,
          totalUsers
        })
      } catch (error) {
        console.error("Error fetching stats:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [userData])

  if (!userData || userData.role !== "super-admin") {
    return null
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto py-8 px-6">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Super Admin Dashboard</h1>
            <p className="text-muted-foreground">System-wide management and oversight</p>
          </div>
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-red-600" />
            <span className="text-red-600 font-semibold">Super Administrator</span>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500"></div>
          </div>
        ) : (
          <>
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
              <Card className="border-0 shadow-lg rounded-xl overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Users</p>
                      <p className="text-3xl font-bold text-red-600">{stats.totalUsers}</p>
                    </div>
                    <div className="bg-red-100 p-3 rounded-full">
                      <Database className="h-6 w-6 text-red-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg rounded-xl overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Super Admins</p>
                      <p className="text-3xl font-bold text-red-600">{stats.superAdmins}</p>
                    </div>
                    <div className="bg-red-100 p-3 rounded-full">
                      <Shield className="h-6 w-6 text-red-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg rounded-xl overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Admins</p>
                      <p className="text-3xl font-bold text-amber-600">{stats.admins}</p>
                    </div>
                    <div className="bg-amber-100 p-3 rounded-full">
                      <Settings className="h-6 w-6 text-amber-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg rounded-xl overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Mentors</p>
                      <p className="text-3xl font-bold text-blue-600">{stats.mentors}</p>
                    </div>
                    <div className="bg-blue-100 p-3 rounded-full">
                      <UserCog className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg rounded-xl overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Mentees</p>
                      <p className="text-3xl font-bold text-green-600">{stats.mentees}</p>
                    </div>
                    <div className="bg-green-100 p-3 rounded-full">
                      <GraduationCap className="h-6 w-6 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card className="border-0 shadow-lg rounded-xl overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-red-500/20 to-red-500/5">
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-red-600" />
                    Super Admin Management
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <p className="text-muted-foreground mb-4">
                    Create and manage super administrator accounts
                  </p>
                  <Button className="w-full bg-red-600 hover:bg-red-700" asChild>
                    <Link href="/super-admin/manage-super-admins">
                      Manage Super Admins
                    </Link>
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg rounded-xl overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-amber-500/20 to-amber-500/5">
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5 text-amber-600" />
                    Admin Management
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <p className="text-muted-foreground mb-4">
                    Create and manage administrator accounts
                  </p>
                  <Button className="w-full bg-amber-600 hover:bg-amber-700" asChild>
                    <Link href="/super-admin/manage-admins">
                      Manage Admins
                    </Link>
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg rounded-xl overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-blue-500/20 to-blue-500/5">
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-blue-600" />
                    System Analytics
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <p className="text-muted-foreground mb-4">
                    View comprehensive system reports and analytics
                  </p>
                  <Button className="w-full bg-blue-600 hover:bg-blue-700" asChild>
                    <Link href="/super-admin/analytics">
                      View Analytics
                    </Link>
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg rounded-xl overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-green-500/20 to-green-500/5">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-green-600" />
                    All Users Overview
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <p className="text-muted-foreground mb-4">
                    View all users across the entire system
                  </p>
                  <Button className="w-full bg-green-600 hover:bg-green-700" asChild>
                    <Link href="/super-admin/all-users">
                      View All Users
                    </Link>
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg rounded-xl overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-purple-500/20 to-purple-500/5">
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5 text-purple-600" />
                    System Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <p className="text-muted-foreground mb-4">
                    Configure system-wide settings and preferences
                  </p>
                  <Button className="w-full bg-purple-600 hover:bg-purple-700" asChild>
                    <Link href="/super-admin/settings">
                      System Settings
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}