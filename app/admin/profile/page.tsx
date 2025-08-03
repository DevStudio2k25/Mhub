"use client"

import { useEffect, useState } from "react"
import { doc, getDoc, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/contexts/auth-context"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Settings,
    Mail,
    Calendar,
    User,
    Shield,
    Key,
    Edit3,
    Save,
    X,
    ShieldCheck,
    UserCog
} from "lucide-react"
import { formatDate } from "@/lib/utils"
import { Image } from "@/components/ui/image"

interface AdminProfile {
    uid: string
    firstName: string
    lastName: string
    middleName?: string
    name: string
    email: string
    role: "admin"
    canBeMentor?: boolean
    adminId: string
    createdAt: string
    createdBy: string
    profileImage?: string
    photoURL?: string
    lastLogin?: string
    isActive?: boolean
}

export default function AdminProfile() {
    const { userData } = useAuth()

    const [profile, setProfile] = useState<AdminProfile | null>(null)
    const [loading, setLoading] = useState(true)
    const [isEditing, setIsEditing] = useState(false)
    const [editedProfile, setEditedProfile] = useState<Partial<AdminProfile>>({})
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState("")

    useEffect(() => {
        const fetchAdminProfile = async () => {
            if (!userData || userData.role !== "admin") return

            try {
                const adminRef = doc(db, "admins", userData.uid)
                const adminDoc = await getDoc(adminRef)

                if (adminDoc.exists()) {
                    const data = adminDoc.data()
                    const profileData: AdminProfile = {
                        uid: adminDoc.id,
                        firstName: data.firstName || "",
                        lastName: data.lastName || "",
                        middleName: data.middleName || "",
                        name: data.name || `${data.firstName} ${data.lastName}`,
                        email: data.email || "",
                        role: "admin",
                        canBeMentor: data.canBeMentor || false,
                        adminId: data.adminId || "",
                        createdAt: data.createdAt || "",
                        createdBy: data.createdBy || "",
                        profileImage: data.profileImage,
                        photoURL: data.photoURL,
                        lastLogin: data.lastLogin,
                        isActive: data.isActive ?? true
                    }
                    setProfile(profileData)
                    setEditedProfile(profileData)
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
    }, [userData])

    const handleSave = async () => {
        if (!profile || !editedProfile) return

        setSaving(true)
        try {
            const adminRef = doc(db, "admins", profile.uid)
            await updateDoc(adminRef, {
                firstName: editedProfile.firstName,
                lastName: editedProfile.lastName,
                middleName: editedProfile.middleName,
                name: `${editedProfile.firstName} ${editedProfile.lastName}`.trim()
            })

            setProfile({ ...profile, ...editedProfile })
            setIsEditing(false)
            setError("")
        } catch (error) {
            console.error("Error updating profile:", error)
            setError("Failed to update profile")
        } finally {
            setSaving(false)
        }
    }

    const handleCancel = () => {
        setEditedProfile(profile || {})
        setIsEditing(false)
        setError("")
    }

    if (!userData || userData.role !== "admin") {
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

    if (error && !profile) {
        return (
            <DashboardLayout>
                <Card className="border-0 shadow-lg rounded-xl overflow-hidden">
                    <CardContent className="text-center py-12">
                        <Settings className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500">{error}</p>
                    </CardContent>
                </Card>
            </DashboardLayout>
        )
    }

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Mobile-First Header */}
                <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">My Profile</h1>
                            <p className="text-muted-foreground text-sm sm:text-lg mt-1">Manage your admin account</p>
                        </div>

                        {/* Role Badge - Better positioned for mobile */}
                        <div className="flex items-center gap-2 self-start sm:self-center">
                            {profile?.canBeMentor ? <UserCog className="h-5 w-5 text-purple-600" /> : <ShieldCheck className="h-5 w-5 text-amber-600" />}
                            <Badge className={`${profile?.canBeMentor ? "bg-purple-100 text-purple-800 border-purple-200" : "bg-amber-100 text-amber-800 border-amber-200"} text-sm px-3 py-1`}>
                                {profile?.canBeMentor ? "Admin + Mentor" : "Administrator"}
                            </Badge>
                        </div>
                    </div>
                </div>

                {/* Profile Card with Mobile-Optimized Layout */}
                <Card className="border-0 shadow-lg rounded-xl overflow-hidden">
                    {/* Header Section - Redesigned for better mobile experience */}
                    <CardHeader className={`bg-gradient-to-r ${profile?.canBeMentor ? "from-purple-500 to-purple-700" : "from-amber-500 to-amber-700"} text-white`}>
                        <div className="flex flex-col items-center text-center space-y-4 sm:flex-row sm:text-left sm:space-y-0 sm:space-x-6">
                            {/* Profile Image */}
                            <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-2xl relative overflow-hidden flex-shrink-0">
                                {profile?.profileImage || profile?.photoURL ? (
                                    <Image
                                        src={profile.profileImage || profile.photoURL || ''}
                                        alt={profile.name}
                                        fill
                                        className="object-cover"
                                    />
                                ) : (
                                    profile?.name.substring(0, 2).toUpperCase()
                                )}
                            </div>

                            {/* Profile Info */}
                            <div className="flex-1 space-y-2">
                                <CardTitle className="text-xl sm:text-2xl">{profile?.name}</CardTitle>
                                <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-2 sm:space-y-0 text-white/90 text-sm">
                                    <div className="flex items-center justify-center sm:justify-start space-x-2">
                                        <Mail className="h-4 w-4" />
                                        <span className="break-all">{profile?.email}</span>
                                    </div>
                                    <div className="flex items-center justify-center sm:justify-start space-x-2">
                                        <Key className="h-4 w-4" />
                                        <span>{profile?.adminId}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Edit Button */}
                            <div className="flex-shrink-0">
                                {!isEditing ? (
                                    <Button
                                        onClick={() => setIsEditing(true)}
                                        variant="secondary"
                                        size="sm"
                                        className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                                    >
                                        <Edit3 className="h-4 w-4 mr-2" />
                                        Edit Profile
                                    </Button>
                                ) : (
                                    <div className="flex space-x-2">
                                        <Button
                                            onClick={handleSave}
                                            disabled={saving}
                                            size="sm"
                                            className="bg-green-600 hover:bg-green-700 text-white"
                                        >
                                            <Save className="h-4 w-4 mr-2" />
                                            {saving ? "Saving..." : "Save"}
                                        </Button>
                                        <Button
                                            onClick={handleCancel}
                                            variant="secondary"
                                            size="sm"
                                            className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-4 sm:p-6">
                        {error && (
                            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                                <p className="text-red-600 text-sm">{error}</p>
                            </div>
                        )}

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Personal Information */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                                    <User className="h-5 w-5 mr-2" />
                                    Personal Information
                                </h3>
                                <div className="space-y-3">
                                    <div className="bg-gray-50 p-3 rounded-md">
                                        <Label className="text-sm text-gray-500">First Name</Label>
                                        {isEditing ? (
                                            <Input
                                                value={editedProfile.firstName || ""}
                                                onChange={(e) => setEditedProfile({ ...editedProfile, firstName: e.target.value })}
                                                className="mt-1"
                                            />
                                        ) : (
                                            <p className="font-medium mt-1">{profile?.firstName}</p>
                                        )}
                                    </div>
                                    <div className="bg-gray-50 p-3 rounded-md">
                                        <Label className="text-sm text-gray-500">Last Name</Label>
                                        {isEditing ? (
                                            <Input
                                                value={editedProfile.lastName || ""}
                                                onChange={(e) => setEditedProfile({ ...editedProfile, lastName: e.target.value })}
                                                className="mt-1"
                                            />
                                        ) : (
                                            <p className="font-medium mt-1">{profile?.lastName}</p>
                                        )}
                                    </div>
                                    <div className="bg-gray-50 p-3 rounded-md">
                                        <Label className="text-sm text-gray-500">Middle Name (Optional)</Label>
                                        {isEditing ? (
                                            <Input
                                                value={editedProfile.middleName || ""}
                                                onChange={(e) => setEditedProfile({ ...editedProfile, middleName: e.target.value })}
                                                className="mt-1"
                                                placeholder="Optional"
                                            />
                                        ) : (
                                            <p className="font-medium mt-1">{profile?.middleName || "Not provided"}</p>
                                        )}
                                    </div>
                                    <div className="bg-gray-50 p-3 rounded-md">
                                        <Label className="text-sm text-gray-500">Email Address</Label>
                                        <p className="font-medium mt-1 break-all">{profile?.email}</p>
                                        <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
                                    </div>
                                    <div className="bg-gray-50 p-3 rounded-md">
                                        <Label className="text-sm text-gray-500">Status</Label>
                                        <div className="mt-1">
                                            <Badge className={profile?.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                                                {profile?.isActive ? "Active" : "Inactive"}
                                            </Badge>
                                        </div>
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
                                        <Label className="text-sm text-gray-500">Admin ID</Label>
                                        <p className="font-medium mt-1">{profile?.adminId}</p>
                                    </div>
                                    <div className="bg-gray-50 p-3 rounded-md">
                                        <Label className="text-sm text-gray-500">Role</Label>
                                        <div className="mt-1">
                                            <Badge className={profile?.canBeMentor ? "bg-purple-100 text-purple-800" : "bg-amber-100 text-amber-800"}>
                                                {profile?.canBeMentor ? "Admin + Mentor" : "Administrator"}
                                            </Badge>
                                        </div>
                                    </div>
                                    <div className="bg-gray-50 p-3 rounded-md">
                                        <Label className="text-sm text-gray-500">User ID</Label>
                                        <p className="font-medium text-xs mt-1 break-all">{profile?.uid}</p>
                                    </div>
                                    <div className="bg-gray-50 p-3 rounded-md">
                                        <Label className="text-sm text-gray-500">Created By</Label>
                                        <p className="font-medium mt-1">{profile?.createdBy}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Activity Information */}
                            <div className="space-y-4 lg:col-span-2">
                                <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                                    <Calendar className="h-5 w-5 mr-2" />
                                    Activity Information
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="bg-gray-50 p-3 rounded-md">
                                        <Label className="text-sm text-gray-500">Account Created</Label>
                                        <p className="font-medium mt-1">{formatDate(profile?.createdAt || "")}</p>
                                    </div>
                                    {profile?.lastLogin && (
                                        <div className="bg-gray-50 p-3 rounded-md">
                                            <Label className="text-sm text-gray-500">Last Login</Label>
                                            <p className="font-medium mt-1">{formatDate(profile.lastLogin)}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Role-specific Information */}
                {profile?.canBeMentor && (
                    <Card className="border-0 shadow-lg rounded-xl overflow-hidden">
                        <CardHeader className="bg-gradient-to-r from-purple-500 to-purple-700 text-white">
                            <CardTitle className="flex items-center text-lg sm:text-xl">
                                <Shield className="h-5 w-5 mr-2" />
                                Admin + Mentor Privileges
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 sm:p-6">
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