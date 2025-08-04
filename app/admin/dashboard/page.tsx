"use client"

import { useEffect, useState } from "react"
import { collection, doc, getDoc, getDocs, setDoc, query, where } from "firebase/firestore"
import { db, auth } from "@/lib/firebase"
import { useAuth } from "@/contexts/auth-context"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Users, FileText, MessageSquare, Sparkles, Save, UserPlus, Key, LogIn, Edit, Check, Shield } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { signInWithEmailAndPassword, signOut, signInWithCustomToken } from "firebase/auth"
import { useRouter } from "next/navigation"

export default function AdminDashboard() {
  const { userData } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  const [stats, setStats] = useState({
    totalMentors: 0,
    totalMentees: 0,
  })
  const [loading, setLoading] = useState(true)
  const [linkedMentorAccount, setLinkedMentorAccount] = useState<{
    mentorUID: string;
    mentorName: string;
    mentorEmail: string;
  } | null>(null)
  const [isLoggingIn, setIsLoggingIn] = useState(false)

  useEffect(() => {
    // Check for linked mentor account
    const checkLinkedAccount = async () => {
      if (!userData?.uid) return
      
      try {
        const linkedAccountsRef = collection(db, "linkedAccounts")
        const linkedAccountQuery = query(
          linkedAccountsRef,
          where("adminUID", "==", userData.uid),
          where("targetRole", "==", "mentor")
        )
        const linkedAccountSnapshot = await getDocs(linkedAccountQuery)
        
        if (!linkedAccountSnapshot.empty) {
          const linkedAccount = linkedAccountSnapshot.docs[0].data()
          setLinkedMentorAccount({
            mentorUID: linkedAccount.mentorUID,
            mentorName: linkedAccount.mentorName,
            mentorEmail: linkedAccount.mentorEmail
          })
        }
      } catch (error) {
        console.error("Error checking linked account:", error)
      }
    }
    
    if (userData && userData.role === "admin") {
      checkLinkedAccount()
    }
  }, [userData])

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Get mentors count from mentors collection
        const mentorsSnapshot = await getDocs(collection(db, "mentors"))
        const mentorCount = mentorsSnapshot.size

        // Get mentees count from mentees collection
        const menteesSnapshot = await getDocs(collection(db, "mentees"))
        const menteeCount = menteesSnapshot.size

        setStats({
          totalMentors: mentorCount,
          totalMentees: menteeCount,
        })
      } catch (error) {
        console.error("Error fetching stats:", error)
      } finally {
        setLoading(false)
      }
    }

    if (userData && userData.role === "admin") {
      fetchStats()
    }
  }, [userData])

  if (!userData || userData.role !== "admin") {
    return null
  }


  
  const loginAsMentor = async () => {
    try {
      setIsLoggingIn(true)
      
      console.log("Attempting to switch to mentor role for user:", userData?.uid)
      
      // Call the secure switch API
      const response = await fetch('/api/switch-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentUserId: userData?.uid,
          targetRole: 'mentor'
        })
      })

      const data = await response.json()
      console.log("Switch API response:", data)

      if (!response.ok) {
        throw new Error(data.error || 'Failed to switch account')
      }

      console.log("Signing out current user...")
      // Sign out current user (admin)
      await signOut(auth)
      
      console.log("Signing in with custom token...")
      // Sign in with custom token
      await signInWithCustomToken(auth, data.customToken)
      
      toast({
        title: "Switch successful",
        description: "You are now logged in as a mentor.",
      })
      
      console.log("Redirecting to mentor dashboard...")
      // Redirect to mentor dashboard
      router.push("/mentor/dashboard")
    } catch (error) {
      console.error("Error switching to mentor:", error)
      toast({
        title: "Switch failed",
        description: error instanceof Error ? error.message : "Failed to switch account. Please contact Super Admin.",
        variant: "destructive"
      })
      
      // Try to sign back in as admin if switch fails
      try {
        console.log("Attempting to restore admin session...")
        window.location.reload()
      } catch (e) {
        console.error("Failed to restore admin session:", e)
      }
    } finally {
      setIsLoggingIn(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-800">Admin Dashboard</h1>
          <p className="text-muted-foreground text-lg mt-2">Welcome back, {userData.name}</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500"></div>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
            <Card className="card-hover border-0 shadow-lg rounded-xl overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-2 bg-gradient-to-br from-amber-500/10 to-amber-500/5">
                <CardTitle className="text-lg font-medium">Total Mentors</CardTitle>
                <div className="bg-amber-100 p-2 rounded-lg">
                  <Users className="h-5 w-5 text-amber-600" />
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="text-3xl font-bold text-gray-800">{stats.totalMentors}</div>
                <p className="text-sm text-muted-foreground mt-1">Active mentors in the system</p>
              </CardContent>
            </Card>

            <Card className="card-hover border-0 shadow-lg rounded-xl overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-2 bg-gradient-to-br from-amber-500/10 to-amber-500/5">
                <CardTitle className="text-lg font-medium">Total Mentees</CardTitle>
                <div className="bg-amber-100 p-2 rounded-lg">
                  <Users className="h-5 w-5 text-amber-600" />
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="text-3xl font-bold text-gray-800">{stats.totalMentees}</div>
                <p className="text-sm text-muted-foreground mt-1">Active mentees in the system</p>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <Card className="border-0 shadow-lg rounded-xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-amber-500/20 to-amber-500/5">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-600" />
                <CardTitle>System Overview</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid gap-6 md:grid-cols-1">
                <div className="space-y-4">
                  <h3 className="font-medium text-lg">Recent Activity</h3>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      The system is actively being used by {stats.totalMentors + stats.totalMentees} users.
                    </p>
                  </div>
                </div>
                <div className="space-y-4">
                  <h3 className="font-medium text-lg">Quick Actions</h3>
                  <div className="space-y-2">
                    <a
                      href="/admin/users"
                      className="text-amber-600 hover:text-amber-700 text-sm flex items-center gap-1"
                    >
                      <Users className="h-4 w-4" /> Manage Users
                    </a>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-0 shadow-lg rounded-xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-amber-500/20 to-amber-500/5">
              <div className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-amber-600" />
                <CardTitle>Linked Mentor Account</CardTitle>
              </div>
              <CardDescription>
                {linkedMentorAccount 
                  ? "Your linked mentor account for quick role switching"
                  : "No linked mentor account found. Contact Super Admin to link accounts."
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {linkedMentorAccount ? (
                <div className="space-y-4">
                  <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                    <h3 className="font-medium text-amber-800 mb-2 flex items-center gap-2">
                      <UserPlus className="h-4 w-4" />
                      Linked Mentor Account
                    </h3>
                    <div className="space-y-2">
                      <div>
                        <span className="text-sm font-medium text-gray-500">Name:</span>
                        <span className="text-sm ml-2">{linkedMentorAccount.mentorName}</span>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-500">Email:</span>
                        <span className="text-sm ml-2">{linkedMentorAccount.mentorEmail}</span>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-500">Status:</span>
                        <span className="text-sm ml-2 text-green-600">Linked ✓</span>
                      </div>
                    </div>
                  </div>
                  
                  <Button 
                    className="w-full" 
                    onClick={loginAsMentor}
                    disabled={isLoggingIn}
                  >
                    {isLoggingIn ? (
                      <>
                        <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                        Switching...
                      </>
                    ) : (
                      <>
                        <LogIn className="h-4 w-4 mr-2" />
                        Switch to Mentor Role
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="text-center py-6">
                  <UserPlus className="h-12 w-12 text-amber-300 mx-auto mb-3" />
                  <p className="text-gray-500 mb-2">No linked mentor account</p>
                  <p className="text-sm text-gray-400">
                    Contact your Super Admin to link your admin account with a mentor account for quick role switching.
                  </p>
                </div>
              )}
            </CardContent>
            <CardFooter className="bg-gray-50 px-6 py-4">
              {linkedMentorAccount ? (
                <div className="text-xs text-center text-gray-500 w-full">
                  <Check className="h-3 w-3 inline-block mr-1 text-green-500" />
                  Secure account linking enabled - no password storage required
                </div>
              ) : (
                <div className="text-xs text-center text-gray-500 w-full">
                  <Shield className="h-3 w-3 inline-block mr-1 text-blue-500" />
                  Only Super Admin can link accounts for security
                </div>
              )}
            </CardFooter>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}

