"use client"

import { useEffect, useState } from "react"
import { doc, getDoc, collection, getDocs, query, where } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/contexts/auth-context"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, UserCog, Mail, Calendar, User, GraduationCap, Users } from "lucide-react"
import { formatDate } from "@/lib/utils"
import { Image } from "@/components/ui/image"
import Link from "next/link"
import { useParams } from "next/navigation"

interface MentorProfile {
    uid: string
    name: string
    email: string
    role: "mentor" | "admin+mentor"
    mentorId: string
    createdAt: string
    createdBy: string
    profileImage?: string
    photoURL?: string
    hasAdminAccess?: boolean
    lastLogin?: string
    isActive?: boolean
}

interface Mentee {
    uid: string
    name: string
    email: string
    enrollmentNo: string
    class?: string
    year?: string
    section?: string
}

export default function ViewMentorProfile() {
    const { userData } = useAuth()
    const params = useParams()
    const mentorId = params.id as string
    
    const [profile, setProfile] = useState<MentorProfile | null>(null)
    const [assignedMentees, setAssignedMentees] = useState<Mentee[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")

    useEffect(() => {
        const fetchMentorProfile = async () => {
            if (!userData || userData.role !== "super-admin" || !mentorId) return

            try {
                // Fetch mentor profile
                const mentorRef = doc(db, "mentors", mentorId)
                const mentorDoc = await getDoc(mentorRef)

                if (mentorDoc.exists()) {
                    const data = mentorDoc.data()
                    const mentorProfile: MentorProfile = {
                        uid: mentorDoc.id,
                        name: data.name || "",
                        email: data.email || "",
                        role: data.role || "mentor",
                        mentorId: data.mentorId || "",
                        createdAt: data.createdAt || "",
                        createdBy: data.createdBy || "",
                        profileImage: data.profileImage,
                        photoURL: data.photoURL,
                        hasAdminAccess: data.hasAdminAccess || false,
                        lastLogin: data.lastLogin,
                        isActive: data.isActive ?? true
                    }
                    setProfile(mentorProfile)

                    // Fetch assigned mentees
                    const menteesQuery = query(
                        collection(db, "mentees"),
                        where("assignedMentorId", "==", mentorProfile.mentorId)
                    )
                    const menteesSnapshot = await getDocs(menteesQuery)
                    const menteesList: Mentee[] = []
                    
                    menteesSnapshot.forEach((doc) => {
                        const menteeData = doc.data()
                        menteesList.push({
                            uid: doc.id,
                            name: menteeData.name || "",
                            email: menteeData.email || "",
                            enrollmentNo: menteeData.enrollmentNo || "",
                            class: menteeData.class,
                            year: menteeData.year,
                            section: menteeData.section
                        })
                    })
                    
                    setAssignedMentees(menteesList)
                } else {
                    setError("Mentor profile not found")
                }
            } catch (error) {
                console.error("Error fetching mentor profile:", error)
                setError("Failed to load mentor profile")
            } finally {
                setLoading(false)
            }
        }

        fetchMentorProfile()
    }, [userData, mentorId])

    if (!userData || userData.role !== "super-admin") {
        return null
    }

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
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
                            <UserCog className="h-12 w-12 text-gray-300 mx-auto mb-4" />
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
                            <h1 className="text-3xl font-bold text-gray-800">Mentor Profile</h1>
                            <p className="text-muted-foreground text-lg mt-1">View mentor account details</p>
                        </div>
                    </div>
                    <Badge className={`${profile.role === "admin+mentor" ? "bg-purple-100 text-purple-800 border-purple-200" : "bg-blue-100 text-blue-800 border-blue-200"}`}>
                        {profile.role}
                    </Badge>
                </div>

                {/* Profile Card */}
                <Card className="border-0 shadow-lg rounded-xl overflow-hidden">
                    <CardHeader className={`bg-gradient-to-r ${profile.role === "admin+mentor" ? "from-purple-500 to-purple-700" : "from-blue-500 to-blue-700"} text-white`}>
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
                                        <UserCog className="h-4 w-4" />
                                        <span>{profile.mentorId}</span>
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
                                    {profile.hasAdminAccess && (
                                        <div className="bg-purple-50 p-3 rounded-md border border-purple-200">
                                            <p className="text-sm text-purple-600">Admin Access</p>
                                            <p className="font-medium text-purple-800">Enabled</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Account Information */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                                    <UserCog className="h-5 w-5 mr-2" />
                                    Account Information
                                </h3>
                                <div className="space-y-3">
                                    <div className="bg-gray-50 p-3 rounded-md">
                                        <p className="text-sm text-gray-500">Mentor ID</p>
                                        <p className="font-medium">{profile.mentorId}</p>
                                    </div>
                                    <div className="bg-gray-50 p-3 rounded-md">
                                        <p className="text-sm text-gray-500">Role</p>
                                        <Badge className={profile.role === "admin+mentor" ? "bg-purple-100 text-purple-800" : "bg-blue-100 text-blue-800"}>
                                            {profile.role}
                                        </Badge>
                                    </div>
                                    <div className="bg-gray-50 p-3 rounded-md">
                                        <p className="text-sm text-gray-500">User ID</p>
                                        <p className="font-medium text-xs">{profile.uid}</p>
                                    </div>
                                    <div className="bg-gray-50 p-3 rounded-md">
                                        <p className="text-sm text-gray-500">Created By</p>
                                        <p className="font-medium">{profile.createdBy}</p>
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

                {/* Assigned Mentees */}
                <Card className="border-0 shadow-lg rounded-xl overflow-hidden">
                    <CardHeader className="bg-gradient-to-r from-green-500 to-green-700 text-white">
                        <CardTitle className="flex items-center justify-between">
                            <div className="flex items-center">
                                <Users className="h-5 w-5 mr-2" />
                                Assigned Mentees
                            </div>
                            <Badge className="bg-white/20 text-white">
                                {assignedMentees.length} mentees
                            </Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                        {assignedMentees.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {assignedMentees.map((mentee) => (
                                    <div key={mentee.uid} className="bg-green-50 p-4 rounded-lg border border-green-200">
                                        <div className="flex items-center space-x-3">
                                            <div className="h-10 w-10 rounded-full bg-green-200 flex items-center justify-center text-green-800 font-semibold">
                                                {mentee.name.substring(0, 2).toUpperCase()}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-semibold text-green-800 truncate">{mentee.name}</h4>
                                                <p className="text-sm text-green-600 truncate">{mentee.email}</p>
                                                {mentee.enrollmentNo && (
                                                    <p className="text-xs text-green-500">Enrollment: {mentee.enrollmentNo}</p>
                                                )}
                                                {mentee.class && (
                                                    <p className="text-xs text-green-500">
                                                        Class: {mentee.class} - {mentee.year} - {mentee.section}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="mt-3">
                                            <Link href={`/super-admin/view-profile/mentee/${mentee.uid}`}>
                                                <Button variant="outline" size="sm" className="w-full text-green-700 border-green-300 hover:bg-green-100">
                                                    View Profile
                                                </Button>
                                            </Link>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <GraduationCap className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                                <p className="text-gray-500">No mentees assigned yet</p>
                                <p className="text-sm text-gray-400 mt-1">This mentor hasn't been assigned any mentees</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Role-specific Information */}
                {profile.role === "admin+mentor" && (
                    <Card className="border-0 shadow-lg rounded-xl overflow-hidden">
                        <CardHeader className="bg-gradient-to-r from-purple-500 to-purple-700 text-white">
                            <CardTitle className="flex items-center">
                                <UserCog className="h-5 w-5 mr-2" />
                                Admin+Mentor Privileges
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-purple-50 p-4 rounded-lg">
                                    <h4 className="font-semibold text-purple-800 mb-2">Admin Capabilities</h4>
                                    <ul className="text-sm text-purple-700 space-y-1">
                                        <li>• Manage mentors and mentees</li>
                                        <li>• View system reports</li>
                                        <li>• Access admin dashboard</li>
                                        <li>• Handle user assignments</li>
                                    </ul>
                                </div>
                                <div className="bg-blue-50 p-4 rounded-lg">
                                    <h4 className="font-semibold text-blue-800 mb-2">Mentor Capabilities</h4>
                                    <ul className="text-sm text-blue-700 space-y-1">
                                        <li>• Mentor assigned students</li>
                                        <li>• Access mentor dashboard</li>
                                        <li>• Manage mentee profiles</li>
                                        <li>• Submit mentor reports</li>
                                    </ul>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </DashboardLayout>
    )
}