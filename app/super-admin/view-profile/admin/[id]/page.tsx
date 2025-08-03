"use client"

import { useEffect, useState } from "react"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/contexts/auth-context"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Settings, Mail, Calendar, User, Shield, Key } from "lucide-react"
import { formatDate } from "@/lib/utils"
import { Image } from "@/components/ui/image"
import Link from "next/link"
import { useParams } from "next/navigation"

interface AdminProfile {
    uid: string
    firstName: string
    lastName: string
    name: string
    email: string
    role: "admin" | "admin+mentor"
    adminId: string
    createdAt: string
    createdBy: string
    profileImage?: string
    photoURL?: string
    lastLogin?: string
    isActive?: boolean
}

export default function ViewAdminProfile() {
    const { userData } = useAuth()
    const params = useParams()
    const adminId = params.id as string
    
    const [profile, setProfile] = useState<AdminProfile | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")

    useEffect(() => {
        const fetchAdminProfile = async () => {
            if (!userData || userData.role !== "super-admin" || !adminId) return

            try {
                const adminRef = doc(db, "admins", adminId)
                const adminDoc = await getDoc(adminRef)

                if (adminDoc.exists()) {
                    const data = adminDoc.data()
                    setProfile({
                        uid: adminDoc.id,
                        firstName: data.firstName || "",
                        lastName: data.lastName || "",
                        name: data.name || `${data.firstName} ${data.lastName}`,
                        email: data.email || "",
                        role: data.role || "admin",
                        adminId: data.adminId || "",
                        createdAt: data.createdAt || "",
                        createdBy: data.createdBy || "",
                        profileImage: data.profileImage,
                        photoURL: data.photoURL,
                        lastLogin: data.lastLogin,
                        isActive: data.isActive ?? true
                    })
                } else {
                    setError("Admin profile not found")
                }
            } catch (error) {
                console.error("Error fetching admin profile:", error)
                setError("Failed to load admin profile")
            } finally {
                setLoading(false)
            }
        }

        fetchAdminProfile()
    }, [userData, adminId])

    if (!userData || userData.role !== "super-admin") {
        return null
    }

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500"></div>
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
                            <Settings className="h-12 w-12 text-gray-300 mx-auto mb-4" />
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
                            <h1 className="text-3xl font-bold text-gray-800">Admin Profile</h1>
                            <p className="text-muted-foreground text-lg mt-1">View admin account details</p>
                        </div>
                    </div>
                    <div className="ml-4">
                        <Badge className={`${profile.role === "admin+mentor" ? "bg-purple-100 text-purple-800 border-purple-200" : "bg-amber-100 text-amber-800 border-amber-200"}`}>
                            {profile.role}
                        </Badge>
                    </div>
                </div>

                {/* Profile Card */}
                <Card className="border-0 shadow-lg rounded-xl overflow-hidden">
                    <CardHeader className={`bg-gradient-to-r ${profile.role === "admin+mentor" ? "from-purple-500 to-purple-700" : "from-amber-500 to-amber-700"} text-white`}>
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
                                        <Key className="h-4 w-4" />
                                        <span>{profile.adminId}</span>
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
                                        <p className="text-sm text-gray-500">First Name</p>
                                        <p className="font-medium">{profile.firstName}</p>
                                    </div>
                                    <div className="bg-gray-50 p-3 rounded-md">
                                        <p className="text-sm text-gray-500">Last Name</p>
                                        <p className="font-medium">{profile.lastName}</p>
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

                            {/* Account Information */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                                    <Shield className="h-5 w-5 mr-2" />
                                    Account Information
                                </h3>
                                <div className="space-y-3">
                                    <div className="bg-gray-50 p-3 rounded-md">
                                        <p className="text-sm text-gray-500">Admin ID</p>
                                        <p className="font-medium">{profile.adminId}</p>
                                    </div>
                                    <div className="bg-gray-50 p-3 rounded-md">
                                        <p className="text-sm text-gray-500">Role</p>
                                        <Badge className={profile.role === "admin+mentor" ? "bg-purple-100 text-purple-800" : "bg-amber-100 text-amber-800"}>
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

                {/* Role-specific Information */}
                {profile.role === "admin+mentor" && (
                    <Card className="border-0 shadow-lg rounded-xl overflow-hidden">
                        <CardHeader className="bg-gradient-to-r from-purple-500 to-purple-700 text-white">
                            <CardTitle className="flex items-center">
                                <Shield className="h-5 w-5 mr-2" />
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