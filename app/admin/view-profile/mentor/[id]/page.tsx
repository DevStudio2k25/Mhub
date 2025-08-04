"use client"

import { useEffect, useState } from "react"
import { doc, getDoc, collection, getDocs, query, where } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/contexts/auth-context"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, UserCog, Mail, Calendar, User, BookOpen, Users } from "lucide-react"
import Link from "next/link"
import { useParams } from "next/navigation"

interface MentorProfile {
    uid: string
    firstName: string
    lastName: string
    middleName?: string
    email: string
    mobile: string
    role: "mentor"
    mentorId: string
    createdAt: any
    createdBy?: string
}

interface AssignedMentee {
    uid: string
    firstName: string
    lastName: string
    middleName?: string
    email: string
    enrollmentNo: string
    className: string
}

export default function ViewMentorProfile() {
    const { userData } = useAuth()
    const params = useParams()
    const mentorId = params.id as string

    const [profile, setProfile] = useState<MentorProfile | null>(null)
    const [assignedMentees, setAssignedMentees] = useState<AssignedMentee[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")

    useEffect(() => {
        const fetchMentorProfile = async () => {
            if (!userData || userData.role !== "admin" || !mentorId) return

            try {
                // Fetch mentor profile
                const mentorRef = doc(db, "mentors", mentorId)
                const mentorDoc = await getDoc(mentorRef)

                if (mentorDoc.exists()) {
                    const data = mentorDoc.data()
                    const mentorProfile: MentorProfile = {
                        uid: mentorDoc.id,
                        firstName: data.firstName || data.name || "",
                        lastName: data.lastName || "",
                        middleName: data.middleName || "",
                        email: data.email || "",
                        mobile: data.mobile || "",
                        role: "mentor",
                        mentorId: data.mentorId || "",
                        createdAt: data.createdAt,
                        createdBy: data.createdBy || ""
                    }
                    setProfile(mentorProfile)

                    // Fetch assigned mentees
                    try {
                        const menteesQuery = query(
                            collection(db, "mentees"),
                            where("assignedMentorId", "==", mentorId)
                        )
                        const menteesSnapshot = await getDocs(menteesQuery)

                        const menteesList: AssignedMentee[] = []
                        menteesSnapshot.forEach((doc) => {
                            const menteeData = doc.data()
                            menteesList.push({
                                uid: doc.id,
                                firstName: menteeData.firstName || "",
                                lastName: menteeData.lastName || "",
                                middleName: menteeData.middleName || "",
                                email: menteeData.email || "",
                                enrollmentNo: menteeData.enrollmentNo || "",
                                className: menteeData.className || ""
                            })
                        })
                        setAssignedMentees(menteesList)
                    } catch (menteesError) {
                        console.error("Error fetching assigned mentees:", menteesError)
                    }
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

    const formatDate = (dateValue: any) => {
        if (!dateValue) return "Not available"

        try {
            if (dateValue.seconds) {
                return new Date(dateValue.seconds * 1000).toLocaleDateString()
            } else if (dateValue instanceof Date) {
                return dateValue.toLocaleDateString()
            } else if (typeof dateValue === 'string') {
                return new Date(dateValue).toLocaleDateString()
            }
            return "Invalid date"
        } catch (error) {
            return "Invalid date"
        }
    }

    if (!userData || userData.role !== "admin") {
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
                        <Link href="/admin/mentors">
                            <Button variant="outline" size="sm">
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Back to Mentors
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
                        <Link href="/admin/mentors">
                            <Button variant="outline" size="sm">
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Back to Mentors
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-800">Mentor Profile</h1>
                            <p className="text-muted-foreground text-lg mt-1">View mentor account details</p>
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
                            <div className="h-20 w-20 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-2xl flex-shrink-0">
                                {profile.firstName.charAt(0)}{profile.lastName.charAt(0)}
                            </div>
                            <div className="flex-1">
                                <CardTitle className="text-2xl mb-2">
                                    {profile.firstName} {profile.middleName} {profile.lastName}
                                </CardTitle>
                                <div className="flex items-center space-x-4 text-white/90">
                                    <div className="flex items-center space-x-2">
                                        <Mail className="h-4 w-4" />
                                        <span>{profile.email}</span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <BookOpen className="h-4 w-4" />
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
                                        <p className="font-medium">
                                            {profile.firstName} {profile.middleName} {profile.lastName}
                                        </p>
                                    </div>
                                    <div className="bg-gray-50 p-3 rounded-md">
                                        <p className="text-sm text-gray-500">Email Address</p>
                                        <p className="font-medium">{profile.email}</p>
                                    </div>
                                    <div className="bg-gray-50 p-3 rounded-md">
                                        <p className="text-sm text-gray-500">Mobile Number</p>
                                        <p className="font-medium">{profile.mobile}</p>
                                    </div>
                                    <div className="bg-gray-50 p-3 rounded-md">
                                        <p className="text-sm text-gray-500">Mentor ID</p>
                                        <p className="font-medium font-mono">{profile.mentorId}</p>
                                    </div>
                                </div>
                            </div>

                            {/* System Information */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                                    <Calendar className="h-5 w-5 mr-2" />
                                    System Information
                                </h3>
                                <div className="space-y-3">
                                    <div className="bg-gray-50 p-3 rounded-md">
                                        <p className="text-sm text-gray-500">User ID</p>
                                        <p className="font-medium text-xs">{profile.uid}</p>
                                    </div>
                                    <div className="bg-gray-50 p-3 rounded-md">
                                        <p className="text-sm text-gray-500">Account Created</p>
                                        <p className="font-medium">{formatDate(profile.createdAt)}</p>
                                    </div>
                                    <div className="bg-gray-50 p-3 rounded-md">
                                        <p className="text-sm text-gray-500">Role</p>
                                        <Badge className="bg-green-100 text-green-800">
                                            {profile.role}
                                        </Badge>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Assigned Mentees */}
                <Card className="border-0 shadow-lg rounded-xl overflow-hidden">
                    <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-700 text-white">
                        <CardTitle className="flex items-center">
                            <Users className="h-5 w-5 mr-2" />
                            Assigned Mentees ({assignedMentees.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                        {assignedMentees.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {assignedMentees.map((mentee) => (
                                    <div key={mentee.uid} className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                                        <div className="flex items-center space-x-3">
                                            <div className="h-10 w-10 rounded-full bg-blue-200 flex items-center justify-center text-blue-800 font-bold text-sm">
                                                {mentee.firstName.charAt(0)}{mentee.lastName.charAt(0)}
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="font-semibold text-blue-800">
                                                    {mentee.firstName} {mentee.middleName} {mentee.lastName}
                                                </h4>
                                                <p className="text-blue-600 text-sm">{mentee.email}</p>
                                                <p className="text-blue-600 text-xs">{mentee.enrollmentNo} • {mentee.className}</p>
                                            </div>
                                        </div>
                                        <div className="mt-3">
                                            <Link href={`/admin/view-profile/mentee/${mentee.uid}`}>
                                                <Button variant="outline" size="sm" className="w-full text-blue-700 border-blue-300 hover:bg-blue-100">
                                                    View Profile
                                                </Button>
                                            </Link>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                                <p className="text-gray-500">No mentees assigned</p>
                                <p className="text-sm text-gray-400 mt-1">This mentor hasn't been assigned any mentees yet</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    )
}