"use client"

import { useEffect, useState } from "react"
import { doc, getDoc, collection, getDocs, query, where } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/contexts/auth-context"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, GraduationCap, Mail, Calendar, User, BookOpen, UserCog } from "lucide-react"
import { formatDate } from "@/lib/utils"
import { Image } from "@/components/ui/image"
import Link from "next/link"
import { useParams } from "next/navigation"

interface MenteeProfile {
    uid: string
    name: string
    email: string
    role: "mentee"
    enrollmentNo: string
    class?: string
    year?: string
    section?: string
    assignedMentorId?: string
    createdAt: string
    profileImage?: string
    photoURL?: string
    lastLogin?: string
    isActive?: boolean
}

interface AssignedMentor {
    uid: string
    name: string
    email: string
    mentorId: string
}

export default function ViewMenteeProfile() {
    const { userData } = useAuth()
    const params = useParams()
    const menteeId = params.id as string

    const [profile, setProfile] = useState<MenteeProfile | null>(null)
    const [assignedMentor, setAssignedMentor] = useState<AssignedMentor | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")

    useEffect(() => {
        const fetchMenteeProfile = async () => {
            if (!userData || userData.role !== "super-admin" || !menteeId) return

            try {
                // Fetch mentee profile
                const menteeRef = doc(db, "mentees", menteeId)
                const menteeDoc = await getDoc(menteeRef)

                if (menteeDoc.exists()) {
                    const data = menteeDoc.data()
                    const menteeProfile: MenteeProfile = {
                        uid: menteeDoc.id,
                        name: data.name || "",
                        email: data.email || "",
                        role: "mentee",
                        enrollmentNo: data.enrollmentNo || "",
                        class: data.class,
                        year: data.year,
                        section: data.section,
                        assignedMentorId: data.assignedMentorId,
                        createdAt: data.createdAt || "",
                        profileImage: data.profileImage,
                        photoURL: data.photoURL,
                        lastLogin: data.lastLogin,
                        isActive: data.isActive ?? true
                    }
                    setProfile(menteeProfile)

                    // Fetch assigned mentor if exists
                    if (menteeProfile.assignedMentorId && menteeProfile.assignedMentorId !== "none") {
                        try {
                            // Try to find mentor by mentorId in mentors collection
                            const mentorsSnapshot = await getDocs(
                                query(collection(db, "mentors"), where("mentorId", "==", menteeProfile.assignedMentorId))
                            )

                            if (!mentorsSnapshot.empty) {
                                const mentorDoc = mentorsSnapshot.docs[0]
                                const mentorData = mentorDoc.data()
                                setAssignedMentor({
                                    uid: mentorDoc.id,
                                    name: mentorData.name || "",
                                    email: mentorData.email || "",
                                    mentorId: mentorData.mentorId || ""
                                })
                            }
                        } catch (mentorError) {
                            console.error("Error fetching assigned mentor:", mentorError)
                        }
                    }
                } else {
                    setError("Mentee profile not found")
                }
            } catch (error) {
                console.error("Error fetching mentee profile:", error)
                setError("Failed to load mentee profile")
            } finally {
                setLoading(false)
            }
        }

        fetchMenteeProfile()
    }, [userData, menteeId])

    if (!userData || userData.role !== "super-admin") {
        return null
    }

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
                </div>
            </DashboardLayout>
        )
    }

    if (error || !profile) {
        return (
            <DashboardLayout>
                <div className="space-y-6">
                    <div className="flex items-center space-x-4">
                        <Link href="/super-admin/all-users">
                            <Button variant="outline" size="sm">
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Back to All Users
                            </Button>
                        </Link>
                    </div>
                    <Card className="border-0 shadow-lg rounded-xl overflow-hidden">
                        <CardContent className="text-center py-12">
                            <GraduationCap className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-500">{error}</p>
                        </CardContent>
                    </Card>
                </div>
            </DashboardLayout>
        )
    }

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <Link href="/super-admin/all-users">
                            <Button variant="outline" size="sm">
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Back to All Users
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-800">Mentee Profile</h1>
                            <p className="text-muted-foreground text-lg mt-1">View student account details</p>
                        </div>
                    </div>
                    <Badge className="bg-green-100 text-green-800 border-green-200">
                        {profile.role}
                    </Badge>
                </div>

                {/* Profile Card */}
                <Card className="border-0 shadow-lg rounded-xl overflow-hidden">
                    <CardHeader className="bg-gradient-to-r from-green-500 to-green-700 text-white">
                        <div className="flex items-center space-x-6">
                            <div className="h-20 w-20 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-2xl relative overflow-hidden flex-shrink-0">
                                {profile.profileImage || profile.photoURL ? (
                                    <Image
                                        src={profile.profileImage || profile.photoURL || ''}
                                        alt={profile.name}
                                        fill
                                        className="object-cover"
                                    />
                                ) : (
                                    profile.name.substring(0, 2).toUpperCase()
                                )}
                            </div>
                            <div className="flex-1">
                                <CardTitle className="text-2xl mb-2">{profile.name}</CardTitle>
                                <div className="flex items-center space-x-4 text-white/90">
                                    <div className="flex items-center space-x-2">
                                        <Mail className="h-4 w-4" />
                                        <span>{profile.email}</span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <BookOpen className="h-4 w-4" />
                                        <span>{profile.enrollmentNo}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Personal Information */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                                    <User className="h-5 w-5 mr-2" />
                                    Personal Information
                                </h3>
                                <div className="space-y-3">
                                    <div className="bg-gray-50 p-3 rounded-md">
                                        <p className="text-sm text-gray-500">Full Name</p>
                                        <p className="font-medium">{profile.name}</p>
                                    </div>
                                    <div className="bg-gray-50 p-3 rounded-md">
                                        <p className="text-sm text-gray-500">Email Address</p>
                                        <p className="font-medium">{profile.email}</p>
                                    </div>
                                    <div className="bg-gray-50 p-3 rounded-md">
                                        <p className="text-sm text-gray-500">Status</p>
                                        <Badge className={profile.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                                            {profile.isActive ? "Active" : "Inactive"}
                                        </Badge>
                                    </div>
                                </div>
                            </div>

                            {/* Academic Information */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                                    <BookOpen className="h-5 w-5 mr-2" />
                                    Academic Information
                                </h3>
                                <div className="space-y-3">
                                    <div className="bg-gray-50 p-3 rounded-md">
                                        <p className="text-sm text-gray-500">Enrollment Number</p>
                                        <p className="font-medium">{profile.enrollmentNo}</p>
                                    </div>
                                    {profile.class && (
                                        <div className="bg-gray-50 p-3 rounded-md">
                                            <p className="text-sm text-gray-500">Class</p>
                                            <p className="font-medium">{profile.class}</p>
                                        </div>
                                    )}
                                    {profile.year && (
                                        <div className="bg-gray-50 p-3 rounded-md">
                                            <p className="text-sm text-gray-500">Year</p>
                                            <p className="font-medium">{profile.year}</p>
                                        </div>
                                    )}
                                    {profile.section && (
                                        <div className="bg-gray-50 p-3 rounded-md">
                                            <p className="text-sm text-gray-500">Section</p>
                                            <p className="font-medium">{profile.section}</p>
                                        </div>
                                    )}
                                    <div className="bg-gray-50 p-3 rounded-md">
                                        <p className="text-sm text-gray-500">User ID</p>
                                        <p className="font-medium text-xs">{profile.uid}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Activity Information */}
                            <div className="space-y-4 md:col-span-2">
                                <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                                    <Calendar className="h-5 w-5 mr-2" />
                                    Activity Information
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div className="bg-gray-50 p-3 rounded-md">
                                        <p className="text-sm text-gray-500">Account Created</p>
                                        <p className="font-medium">{formatDate(profile.createdAt)}</p>
                                    </div>
                                    {profile.lastLogin && (
                                        <div className="bg-gray-50 p-3 rounded-md">
                                            <p className="text-sm text-gray-500">Last Login</p>
                                            <p className="font-medium">{formatDate(profile.lastLogin)}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Assigned Mentor */}
                <Card className="border-0 shadow-lg rounded-xl overflow-hidden">
                    <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-700 text-white">
                        <CardTitle className="flex items-center">
                            <UserCog className="h-5 w-5 mr-2" />
                            Assigned Mentor
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                        {assignedMentor ? (
                            <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
                                <div className="flex items-center space-x-4">
                                    <div className="h-16 w-16 rounded-full bg-blue-200 flex items-center justify-center text-blue-800 font-bold text-xl">
                                        {assignedMentor.name.substring(0, 2).toUpperCase()}
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="text-xl font-semibold text-blue-800 mb-1">{assignedMentor.name}</h4>
                                        <p className="text-blue-600 mb-1">{assignedMentor.email}</p>
                                        <Badge className="bg-blue-100 text-blue-800 border-blue-300">
                                            Mentor ID: {assignedMentor.mentorId}
                                        </Badge>
                                    </div>
                                    <div>
                                        <Link href={`/super-admin/view-profile/mentor/${assignedMentor.uid}`}>
                                            <Button variant="outline" className="text-blue-700 border-blue-300 hover:bg-blue-100">
                                                View Mentor Profile
                                            </Button>
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <UserCog className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                                <p className="text-gray-500">No mentor assigned</p>
                                <p className="text-sm text-gray-400 mt-1">This mentee hasn't been assigned to any mentor yet</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Academic Progress (Placeholder for future features) */}
                <Card className="border-0 shadow-lg rounded-xl overflow-hidden">
                    <CardHeader className="bg-gradient-to-r from-purple-500 to-purple-700 text-white">
                        <CardTitle className="flex items-center">
                            <GraduationCap className="h-5 w-5 mr-2" />
                            Academic Progress
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="text-center py-8">
                            <GraduationCap className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-500">Academic progress tracking</p>
                            <p className="text-sm text-gray-400 mt-1">This feature will be available soon</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    )
}