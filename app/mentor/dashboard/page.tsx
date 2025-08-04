"use client"

import { useEffect, useState } from "react"
import { collection, doc, getDoc, getDocs, setDoc, query, where } from "firebase/firestore"
import { db, auth } from "@/lib/firebase"
import { useAuth } from "@/contexts/auth-context"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { signInWithEmailAndPassword, signOut, signInWithCustomToken } from "firebase/auth"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { FileText, MessageSquare, Users, ArrowRight, BookOpen, Shield, Sparkles, Edit, GraduationCap, UserPlus, Eye, EyeOff, Check } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { formatDate } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import Image from "next/image"

interface Mentee {
  uid: string
  name: string
  email: string
  enrollmentNo?: string
  profileImage?: string
  classId?: string
}

interface ClassInfo {
  id: string
  name: string
  year: string
  section: string
  description: string
  mentorId: string
  menteeCount?: number
}

interface Report {
  id: string
  menteeId: string
  title: string
  timestamp: number
  status: "pending" | "reviewed"
}

interface Query {
  id: string
  menteeId: string
  subject: string
  timestamp: number
  status: "pending" | "answered"
}

interface Session {
  id: string
  topic: string
  datetime: string
}

export default function MentorDashboard() {
  const { userData } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [hasAdminAccess, setHasAdminAccess] = useState(false)
  const [linkedAdminAccount, setLinkedAdminAccount] = useState<{
    adminUID: string;
    adminName: string;
    adminEmail: string;
  } | null>(null)
  const [mentees, setMentees] = useState<Mentee[]>([])
  const [classes, setClasses] = useState<ClassInfo[]>([])
  const [pendingReports, setPendingReports] = useState<Report[]>([])
  const [pendingQueries, setPendingQueries] = useState<Query[]>([])
  const [upcomingSessions, setUpcomingSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [menteesWithNames, setMenteesWithNames] = useState<{ [key: string]: string }>({})

  // Load mentee names for display
  const loadMenteeNames = async (menteeIds: string[]) => {
    const names: { [key: string]: string } = {}
    await Promise.all(
      menteeIds.map(async (id) => {
        const menteeRef = doc(db, "mentees", id)
        const menteeDoc = await getDoc(menteeRef)
        if (menteeDoc.exists()) {
          names[id] = menteeDoc.data().name
        }
      })
    )
    setMenteesWithNames(names)
  }

  // Effect to check admin access
  useEffect(() => {
    const checkAdminAccess = async () => {
      if (!userData?.uid) return

      try {
        console.log('Checking admin access for mentor:', userData.uid)
        
        // Check for linked admin account
        const linkedAccountsRef = collection(db, "linkedAccounts")
        const linkedAccountQuery = query(
          linkedAccountsRef,
          where("mentorUID", "==", userData.uid),
          where("targetRole", "==", "admin")
        )
        const linkedAccountSnapshot = await getDocs(linkedAccountQuery)
        
        console.log('Found linked accounts for mentor:', linkedAccountSnapshot.docs.length)
        
        if (!linkedAccountSnapshot.empty) {
          const linkedAccount = linkedAccountSnapshot.docs[0].data()
          console.log('Linked admin account found:', linkedAccount)
          setLinkedAdminAccount({
            adminUID: linkedAccount.adminUID,
            adminName: linkedAccount.adminName,
            adminEmail: linkedAccount.adminEmail
          })
          setHasAdminAccess(true)
        } else {
          console.log('No linked admin account found for mentor')
          setHasAdminAccess(false)
        }
      } catch (error) {
        console.error('Error checking admin access:', error)
      }
    }

    checkAdminAccess()
  }, [userData?.uid])



  // Effect to load mentor data from Firestore
  useEffect(() => {
    const loadData = async () => {
      if (!userData?.uid) return
      setLoading(true)

      try {
        // Load mentees assigned to this mentor
        const menteesQuery = query(collection(db, "mentees"), where("assignedMentorId", "==", userData.uid))
        const menteesSnapshot = await getDocs(menteesQuery)
        const menteesData: Mentee[] = []
        const menteeNames: { [key: string]: string } = {}

        menteesSnapshot.forEach((doc) => {
          const data = doc.data()
          menteesData.push({
            uid: doc.id,
            name: data.name,
            email: data.email,
            enrollmentNo: data.enrollmentNo,
            profileImage: data.profileImage,
            classId: data.classId
          })
          menteeNames[doc.id] = data.name
        })
        setMentees(menteesData)
        setMenteesWithNames(menteeNames)

        // Load classes created by this mentor
        const classesQuery = query(collection(db, "classes"), where("mentorId", "==", userData.uid))
        const classesSnapshot = await getDocs(classesQuery)
        const classesData: ClassInfo[] = []

        classesSnapshot.forEach((doc) => {
          const data = doc.data()
          const menteeCount = menteesData.filter(mentee => mentee.classId === doc.id).length
          classesData.push({
            id: doc.id,
            name: data.name,
            year: data.year,
            section: data.section,
            description: data.description,
            mentorId: data.mentorId,
            menteeCount
          })
        })
        setClasses(classesData)

        // Load pending reports for this mentor
        const reportsQuery = query(
          collection(db, "reports"), 
          where("mentorId", "==", userData.uid),
          where("status", "==", "pending")
        )
        const reportsSnapshot = await getDocs(reportsQuery)
        const pendingReportsData: Report[] = []

        reportsSnapshot.forEach((doc) => {
          const data = doc.data()
          pendingReportsData.push({
            id: doc.id,
            menteeId: data.menteeId,
            title: data.title,
            timestamp: data.timestamp,
            status: data.status
          })
        })
        setPendingReports(pendingReportsData)

        // Load pending queries for this mentor
        const queriesQuery = query(
          collection(db, "queries"),
          where("mentorId", "==", userData.uid),
          where("status", "==", "pending")
        )
        const queriesSnapshot = await getDocs(queriesQuery)
        const pendingQueriesData: Query[] = []

        queriesSnapshot.forEach((doc) => {
          const data = doc.data()
          pendingQueriesData.push({
            id: doc.id,
            menteeId: data.menteeId,
            subject: data.subject,
            timestamp: data.timestamp,
            status: data.status
          })
        })
        setPendingQueries(pendingQueriesData)

        // Load upcoming sessions for this mentor
        const sessionsQuery = query(collection(db, "sessions"), where("mentorId", "==", userData.uid))
        const sessionsSnapshot = await getDocs(sessionsQuery)
        const upcomingSessionsData: Session[] = []

        sessionsSnapshot.forEach((doc) => {
          const data = doc.data()
          // Filter for upcoming sessions (sessions with datetime in the future)
          if (new Date(data.datetime) > new Date()) {
            upcomingSessionsData.push({
              id: doc.id,
              topic: data.topic,
              datetime: data.datetime
            })
          }
        })

        // Sort by datetime
        upcomingSessionsData.sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime())
        setUpcomingSessions(upcomingSessionsData)

        setLoading(false)
      } catch (error) {
        console.error("Error loading data:", error)
        setLoading(false)
      }
    }

    if (userData) {
      loadData()
    }
  }, [userData])



  if (!userData || userData.role !== "mentor") {
    return null
  }





  const handleSwitchToAdmin = async () => {
    try {
      setIsLoggingIn(true);

      // Call the secure switch API
      const response = await fetch('/api/switch-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentUserId: userData?.uid,
          targetRole: 'admin'
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to switch account')
      }

      // Sign out from mentor account
      await signOut(auth);

      // Sign in with custom token
      await signInWithCustomToken(auth, data.customToken);

      toast({
        title: "Switch successful",
        description: "You are now logged in as an admin."
      });

      // Redirect to admin dashboard
      router.push("/admin/dashboard");
    } catch (error) {
      console.error("Error switching to admin account:", error);
      toast({
        title: "Switch failed",
        description: error instanceof Error ? error.message : "Failed to switch account. Please contact Super Admin.",
        variant: "destructive"
      });

      // Try to sign back in as mentor if switch fails
      try {
        window.location.reload();
      } catch (e) {
        console.error("Failed to restore mentor session:", e);
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto py-4 sm:py-8 px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">Welcome, {userData?.name}</h1>
            <p className="text-muted-foreground text-sm sm:text-base">Here's an overview of your mentoring activities</p>
          </div>

          {/* Admin Account Switch Button for linked accounts */}
          {hasAdminAccess && linkedAdminAccount && (
            <Button
              variant="outline"
              className="flex items-center gap-2 bg-amber-50 border-amber-200 hover:bg-amber-100"
              onClick={handleSwitchToAdmin}
              disabled={isLoggingIn}
            >
              {isLoggingIn ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-amber-600 border-t-transparent"></span>
                  Switching...
                </>
              ) : (
                <>
                  <Shield className="h-4 w-4 text-amber-600" />
                  Switch to Admin
                </>
              )}
            </Button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500"></div>
          </div>
        ) : (
          <>
            {/* Stats Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
              <Card className="border-0 shadow-lg rounded-xl overflow-hidden">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Mentees</p>
                      <p className="text-2xl sm:text-3xl font-bold text-amber-600">{mentees.length}</p>
                    </div>
                    <div className="bg-amber-100 p-3 rounded-full">
                      <Users className="h-6 w-6 text-amber-600" />
                    </div>
                  </div>
                  <Button variant="link" className="p-0 h-auto mt-4 text-amber-600" asChild>
                    <Link href="/mentor/mentees" className="flex items-center">
                      View all mentees <ArrowRight className="h-4 w-4 ml-1" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg rounded-xl overflow-hidden">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Classes</p>
                      <p className="text-2xl sm:text-3xl font-bold text-amber-600">{classes.length}</p>
                    </div>
                    <div className="bg-amber-100 p-3 rounded-full">
                      <BookOpen className="h-6 w-6 text-amber-600" />
                    </div>
                  </div>
                  <Button variant="link" className="p-0 h-auto mt-4 text-amber-600" asChild>
                    <Link href="/mentor/classes" className="flex items-center">
                      Manage classes <ArrowRight className="h-4 w-4 ml-1" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg rounded-xl overflow-hidden">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Pending Reports</p>
                      <p className="text-2xl sm:text-3xl font-bold text-amber-600">{pendingReports.length}</p>
                    </div>
                    <div className="bg-amber-100 p-3 rounded-full">
                      <FileText className="h-6 w-6 text-amber-600" />
                    </div>
                  </div>
                  <Button variant="link" className="p-0 h-auto mt-4 text-amber-600" asChild>
                    <Link href="/mentor/reports" className="flex items-center">
                      Review reports <ArrowRight className="h-4 w-4 ml-1" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg rounded-xl overflow-hidden">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Pending Queries</p>
                      <p className="text-2xl sm:text-3xl font-bold text-amber-600">{pendingQueries.length}</p>
                    </div>
                    <div className="bg-amber-100 p-3 rounded-full">
                      <MessageSquare className="h-6 w-6 text-amber-600" />
                    </div>
                  </div>
                  <Button variant="link" className="p-0 h-auto mt-4 text-amber-600" asChild>
                    <Link href="/mentor/queries" className="flex items-center">
                      Answer queries <ArrowRight className="h-4 w-4 ml-1" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Admin Credentials Section */}
            {hasAdminAccess && (
              <div className="mb-8">
                <Card className="border-0 shadow-lg rounded-xl overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-purple-500/20 to-purple-500/5">
                    <div className="flex items-center gap-2">
                      <Shield className="h-5 w-5 text-purple-600" />
                      <CardTitle>Linked Admin Account</CardTitle>
                    </div>
                    <CardDescription>
                      {linkedAdminAccount
                        ? "Your linked admin account for quick role switching"
                        : "No linked admin account found. Contact Super Admin to link accounts."}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-6">
                    {linkedAdminAccount ? (
                      <div className="space-y-4">
                        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                          <h3 className="font-medium text-purple-800 mb-2 flex items-center gap-2">
                            <Shield className="h-4 w-4" />
                            Linked Admin Account
                          </h3>
                          <div className="space-y-2">
                            <div>
                              <span className="text-sm font-medium text-gray-500">Name:</span>
                              <span className="text-sm ml-2">{linkedAdminAccount.adminName}</span>
                            </div>
                            <div>
                              <span className="text-sm font-medium text-gray-500">Email:</span>
                              <span className="text-sm ml-2">{linkedAdminAccount.adminEmail}</span>
                            </div>
                            <div>
                              <span className="text-sm font-medium text-gray-500">Status:</span>
                              <span className="text-sm ml-2 text-green-600">Linked ✓</span>
                            </div>
                          </div>
                        </div>
                        <Button
                          className="w-full bg-purple-600 hover:bg-purple-700"
                          onClick={handleSwitchToAdmin}
                          disabled={isLoggingIn}
                        >
                          {isLoggingIn ? (
                            <>
                              <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                              Switching...
                            </>
                          ) : (
                            <>
                              Switch to Admin Role
                              <ArrowRight className="h-4 w-4 ml-2" />
                            </>
                          )}
                        </Button>
                      </div>
                    ) : (
                      <div className="text-center py-6">
                        <Shield className="h-12 w-12 text-purple-300 mx-auto mb-3" />
                        <p className="text-gray-500 mb-2">No linked admin account</p>
                        <p className="text-sm text-gray-400">
                          Contact your Super Admin to link your mentor account with an admin account for quick role switching.
                        </p>
                      </div>
                    )}
                  </CardContent>
                  <CardFooter className="bg-gray-50 px-6 py-4">
                    {linkedAdminAccount ? (
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
            )}

            {/* Classes and Mentees */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
              <div className="lg:col-span-2">
                <Card className="border-0 shadow-lg rounded-xl overflow-hidden h-full">
                  <CardHeader className="bg-gradient-to-r from-amber-500/20 to-amber-500/5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-5 w-5 text-amber-600" />
                        <CardTitle>My Classes</CardTitle>
                      </div>
                      <Button size="sm" className="bg-amber-500 hover:bg-amber-600" asChild>
                        <Link href="/mentor/classes">
                          <GraduationCap className="h-4 w-4 mr-2" />
                          Manage Classes
                        </Link>
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6">
                    {classes.length > 0 ? (
                      <div className="space-y-4">
                        {classes.map((classInfo) => (
                          <div key={classInfo.id} className="border border-amber-200 rounded-xl p-4 hover:bg-amber-50 transition-colors">
                            {/* Header - Mobile: Stack, Desktop: Side by side */}
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-3">
                              <div className="flex-1">
                                <h3 className="font-semibold text-lg sm:text-xl text-gray-800 mb-2">{classInfo.name}</h3>

                                {/* Class Details - Stack vertically on mobile */}
                                <div className="space-y-2 sm:space-y-1">
                                  <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <GraduationCap className="h-4 w-4 text-amber-600" />
                                    <span>Admission Year: {classInfo.year}</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <BookOpen className="h-4 w-4 text-amber-600" />
                                    <span>Section: {classInfo.section}</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <Users className="h-4 w-4 text-amber-600" />
                                    <span>{classInfo.menteeCount || 0} Students Enrolled</span>
                                  </div>
                                </div>
                              </div>

                              {/* Student Count Badge */}
                              <div className="self-start">
                                <span className="bg-amber-500 text-white text-xs font-medium px-3 py-1.5 rounded-full">
                                  {classInfo.menteeCount || 0} Students
                                </span>
                              </div>
                            </div>

                            {/* Description */}
                            <p className="text-sm text-gray-700 mb-4 line-clamp-2 leading-relaxed">
                              {classInfo.description}
                            </p>

                            {/* Action Buttons - Stack on mobile */}
                            <div className="flex flex-col sm:flex-row gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1 h-10 sm:h-8 border-amber-300 bg-white hover:bg-amber-50 text-amber-700 hover:text-amber-800"
                                asChild
                              >
                                <Link href={`/mentor/mentees?classId=${classInfo.id}`}>
                                  <Users className="h-4 w-4 mr-2" />
                                  View Students
                                </Link>
                              </Button>
                              <Button
                                size="sm"
                                className="flex-1 h-10 sm:h-8 bg-amber-500 hover:bg-amber-600 text-white"
                                asChild
                              >
                                <Link href={`/mentor/mentees?classId=${classInfo.id}`}>
                                  <UserPlus className="h-4 w-4 mr-2" />
                                  Add Student
                                </Link>
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 sm:py-12">
                        <div className="bg-amber-100 w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                          <BookOpen className="h-8 w-8 sm:h-10 sm:w-10 text-amber-600" />
                        </div>
                        <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-2">No classes created yet</h3>
                        <p className="text-sm text-gray-600 mb-4 sm:mb-6 max-w-sm mx-auto px-4">
                          Start by creating your first class to organize and manage your students effectively
                        </p>
                        <Button className="bg-amber-500 hover:bg-amber-600 text-white font-medium px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg" asChild>
                          <Link href="/mentor/classes">
                            <GraduationCap className="h-4 w-4 mr-2" />
                            Create Your First Class
                          </Link>
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card className="border-0 shadow-lg rounded-xl overflow-hidden h-full">
                <CardHeader className="bg-gradient-to-r from-amber-500/20 to-amber-500/5">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-amber-600" />
                    <CardTitle>Recent Mentees</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  {mentees.length > 0 ? (
                    <div className="space-y-4">
                      {mentees.slice(0, 5).map((mentee) => (
                        <div key={mentee.uid} className="flex items-center gap-3">
                          {mentee.profileImage ? (
                            <div className="relative w-10 h-10 rounded-full overflow-hidden">
                              <Image
                                src={mentee.profileImage}
                                alt={mentee.name}
                                fill
                                className="object-cover"
                              />
                            </div>
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-800 font-bold">
                              {mentee.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{mentee.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{mentee.enrollmentNo || mentee.email}</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50" asChild>
                              <Link href={`/mentee/${mentee.uid}`} title="View Profile">
                                <Users className="h-4 w-4" />
                              </Link>
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50" asChild>
                              <Link href={`/mentor/edit-mentee/${mentee.uid}`} title="Edit Mentee">
                                <Edit className="h-4 w-4" />
                              </Link>
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <p className="text-muted-foreground">No mentees assigned yet</p>
                    </div>
                  )}
                </CardContent>
                {mentees.length > 5 && (
                  <CardFooter className="border-t p-4">
                    <Button variant="link" className="w-full text-amber-600" asChild>
                      <Link href="/mentor/mentees">View all mentees</Link>
                    </Button>
                  </CardFooter>
                )}
              </Card>
            </div>

            {/* Reports and Queries */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <Card className="border-0 shadow-lg rounded-xl overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-amber-500/20 to-amber-500/5">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-amber-600" />
                    <CardTitle>Pending Reports</CardTitle>
                  </div>
                  <CardDescription>Reports that need your review</CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  {pendingReports.length > 0 ? (
                    <div className="space-y-4">
                      {pendingReports.slice(0, 3).map((report) => (
                        <div
                          key={report.id}
                          className="flex justify-between items-center p-3 rounded-lg hover:bg-amber-50 transition-colors"
                        >
                          <div>
                            <p className="font-medium">{report.title}</p>
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <span>By: {menteesWithNames[report.menteeId] || "Unknown"}</span>
                              <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                              <span>{formatDate(report.timestamp)}</span>
                            </p>
                          </div>
                          <Button size="sm" className="bg-amber-500 hover:bg-amber-600" asChild>
                            <a href="/mentor/reports">Review</a>
                          </Button>
                        </div>
                      ))}
                      {pendingReports.length > 3 && (
                        <Button variant="link" className="w-full text-amber-600 hover:text-amber-700" asChild>
                          <a href="/mentor/reports">View all reports</a>
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <p className="text-muted-foreground">No pending reports</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg rounded-xl overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-amber-500/20 to-amber-500/5">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-amber-600" />
                    <CardTitle>Pending Queries</CardTitle>
                  </div>
                  <CardDescription>Questions from your mentees</CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  {pendingQueries.length > 0 ? (
                    <div className="space-y-4">
                      {pendingQueries.slice(0, 3).map((query) => (
                        <div
                          key={query.id}
                          className="flex justify-between items-center p-3 rounded-lg hover:bg-amber-50 transition-colors"
                        >
                          <div>
                            <p className="font-medium">{query.subject}</p>
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <span>By: {menteesWithNames[query.menteeId] || "Unknown"}</span>
                              <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                              <span>{formatDate(query.timestamp)}</span>
                            </p>
                          </div>
                          <Button size="sm" className="bg-amber-500 hover:bg-amber-600" asChild>
                            <a href="/mentor/queries">Answer</a>
                          </Button>
                        </div>
                      ))}
                      {pendingQueries.length > 3 && (
                        <Button variant="link" className="w-full text-amber-600 hover:text-amber-700" asChild>
                          <a href="/mentor/queries">View all queries</a>
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <p className="text-muted-foreground">No pending queries</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card className="border-0 shadow-lg rounded-xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-amber-500/20 to-amber-500/5">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-amber-600" />
                  <CardTitle>Mentor Tips</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid gap-6 md:grid-cols-3">
                  <div className="p-4 bg-amber-50 rounded-xl">
                    <h3 className="font-medium text-amber-800 mb-2">Effective Feedback</h3>
                    <p className="text-sm text-gray-600">
                      Provide specific, actionable feedback that helps mentees understand what they did well and how
                      they can improve.
                    </p>
                  </div>
                  <div className="p-4 bg-amber-50 rounded-xl">
                    <h3 className="font-medium text-amber-800 mb-2">Regular Check-ins</h3>
                    <p className="text-sm text-gray-600">
                      Schedule regular sessions to maintain momentum and provide consistent guidance to your mentees.
                    </p>
                  </div>
                  <div className="p-4 bg-amber-50 rounded-xl">
                    <h3 className="font-medium text-amber-800 mb-2">Ask Questions</h3>
                    <p className="text-sm text-gray-600">
                      Ask open-ended questions to encourage reflection and help mentees develop their own solutions.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}
