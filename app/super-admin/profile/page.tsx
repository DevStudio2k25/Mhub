"use client"

import { useEffect, useState, useRef } from "react"
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage"
import { doc, getDoc, updateDoc } from "firebase/firestore"
import { db, storage } from "@/lib/firebase"
import { useAuth } from "@/contexts/auth-context"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
    Camera, Check, Edit, User, X, Shield,
    Mail, Phone, BookOpen, Building, UserCog,
    Calendar, MapPin, Briefcase, Key, Globe,
    Clock, CheckCircle, AlertCircle
} from "lucide-react"
import Image from "next/image"
import { formatDate } from "@/lib/utils"

interface SuperAdminProfile {
    uid: string
    name: string
    email: string | null
    role: string
    superAdminId: string
    organization?: string
    department?: string
    photoURL?: string
    phone?: string
    address?: string
    createdAt: string
    lastLogin?: string
    lastUpdated?: string
    isActive: boolean
    createdBy: string
}

export default function SuperAdminProfile() {
    const { userData } = useAuth()
    const [profile, setProfile] = useState<SuperAdminProfile | null>(null)
    const [loading, setLoading] = useState(true)
    const [isEditing, setIsEditing] = useState(false)
    const [editedProfile, setEditedProfile] = useState<Partial<SuperAdminProfile>>({})
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState("")
    const [success, setSuccess] = useState("")
    const [uploadingImage, setUploadingImage] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        const fetchProfile = async () => {
            if (!userData || userData.role !== "super-admin") return

            try {
                // Fetch super admin data from super-admins collection
                const superAdminDoc = await getDoc(doc(db, "super-admins", userData.uid))

                if (superAdminDoc.exists()) {
                    const data = superAdminDoc.data()
                    const profileData: SuperAdminProfile = {
                        uid: userData.uid,
                        name: data?.name || "Unknown",
                        email: data?.email || null,
                        role: data?.role || "super-admin",
                        superAdminId: data?.superAdminId || "",
                        organization: data?.organization,
                        department: data?.department,
                        photoURL: data?.photoURL,
                        phone: data?.phone,
                        address: data?.address,
                        createdAt: data?.createdAt || new Date().toISOString(),
                        lastLogin: data?.lastLogin,
                        lastUpdated: data?.lastUpdated,
                        isActive: data?.isActive ?? true,
                        createdBy: data?.createdBy || "unknown"
                    }
                    setProfile(profileData)
                    setEditedProfile(profileData)
                }
            } catch (error) {
                console.error("Error fetching profile:", error)
                setError("Failed to load profile data")
            } finally {
                setLoading(false)
            }
        }

        if (userData) {
            fetchProfile()
        }
    }, [userData])

    const handleEdit = () => {
        setIsEditing(true)
        setEditedProfile(profile || {})
        setError("")
        setSuccess("")
    }

    const handleCancel = () => {
        setIsEditing(false)
        setEditedProfile(profile || {})
        setError("")
        setSuccess("")
    }

    const handleSave = async () => {
        if (!profile || !editedProfile) return

        setSaving(true)
        setError("")
        setSuccess("")

        try {
            // Update super admin data in super-admins collection
            const superAdminRef = doc(db, "super-admins", profile.uid)

            // Only update fields that have changed
            const updates: Partial<SuperAdminProfile> = {}

            if (editedProfile.name !== profile.name) updates.name = editedProfile.name
            if (editedProfile.phone !== profile.phone) updates.phone = editedProfile.phone
            if (editedProfile.address !== profile.address) updates.address = editedProfile.address
            if (editedProfile.department !== profile.department) updates.department = editedProfile.department

            if (Object.keys(updates).length > 0) {
                updates.lastUpdated = new Date().toISOString()
                await updateDoc(superAdminRef, updates)

                // Update local state
                setProfile({
                    ...profile,
                    ...updates
                })

                setSuccess("Profile updated successfully")
            } else {
                setSuccess("No changes to save")
            }

            setIsEditing(false)
        } catch (error) {
            console.error("Error updating profile:", error)
            setError("Failed to update profile")
        } finally {
            setSaving(false)
        }
    }

    const handleImageClick = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click()
        }
    }

    const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!profile) return

        const file = e.target.files?.[0]
        if (!file) return

        setUploadingImage(true)
        setError("")
        setSuccess("")

        try {
            // Upload image to Firebase Storage
            const imageRef = storageRef(storage, `super-admin-images/${profile.uid}`)
            await uploadBytes(imageRef, file)

            // Get download URL
            const downloadURL = await getDownloadURL(imageRef)

            // Update super admin data in super-admins collection
            const superAdminRef = doc(db, "super-admins", profile.uid)
            await updateDoc(superAdminRef, { photoURL: downloadURL })

            // Update local state
            setProfile({
                ...profile,
                photoURL: downloadURL
            })

            setSuccess("Profile image updated successfully")
        } catch (error) {
            console.error("Error uploading image:", error)
            setError("Failed to upload image")
        } finally {
            setUploadingImage(false)
        }
    }

    if (!userData || userData.role !== "super-admin") {
        return null
    }

    return (
        <DashboardLayout>
            <div className="container mx-auto py-8 px-6">
                <div className="max-w-4xl mx-auto space-y-6">
                    {loading ? (
                        <Card className="border-0 shadow-lg rounded-xl overflow-hidden">
                            <CardContent className="p-8 text-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-500 mx-auto"></div>
                                <p className="mt-4 text-gray-600">Loading profile...</p>
                            </CardContent>
                        </Card>
                    ) : profile ? (
                        <>
                            {/* Main Profile Card */}
                            <Card className="border-0 shadow-2xl rounded-2xl overflow-hidden">
                                <CardHeader className="bg-gradient-to-r from-red-600 via-red-500 to-orange-500 text-white pb-12">
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-4">
                                            <div className="bg-white/20 p-3 rounded-full">
                                                <Shield className="h-8 w-8" />
                                            </div>
                                            <div>
                                                <CardTitle className="text-3xl font-bold">{profile.name}</CardTitle>
                                                <div className="flex items-center gap-2 mt-2">
                                                    <Badge className="bg-white/20 text-white border-white/30">
                                                        Super Administrator
                                                    </Badge>
                                                    <Badge className={`${profile.isActive ? 'bg-green-500' : 'bg-red-500'} text-white`}>
                                                        {profile.isActive ? (
                                                            <><CheckCircle className="h-3 w-3 mr-1" /> Active</>
                                                        ) : (
                                                            <><AlertCircle className="h-3 w-3 mr-1" /> Inactive</>
                                                        )}
                                                    </Badge>
                                                </div>
                                            </div>
                                        </div>
                                        {!isEditing && (
                                            <Button
                                                onClick={handleEdit}
                                                variant="ghost"
                                                className="text-white hover:bg-white/20 border border-white/30"
                                            >
                                                <Edit className="h-4 w-4 mr-2" />
                                                Edit Profile
                                            </Button>
                                        )}
                                    </div>
                                </CardHeader>

                                <CardContent className="p-0">
                                    <div className="relative -mt-16 px-8">
                                        <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-xl mx-auto bg-white">
                                            {profile.photoURL ? (
                                                <Image
                                                    src={profile.photoURL}
                                                    alt={profile.name}
                                                    fill
                                                    className="object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-red-100 text-red-800">
                                                    <User className="h-16 w-16" />
                                                </div>
                                            )}
                                            <button
                                                onClick={handleImageClick}
                                                className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                                            >
                                                <Camera className="h-8 w-8 text-white" />
                                            </button>
                                            <input
                                                type="file"
                                                ref={fileInputRef}
                                                onChange={handleImageChange}
                                                accept="image/*"
                                                className="hidden"
                                            />
                                        </div>
                                        {uploadingImage && (
                                            <div className="mt-4 text-center">
                                                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-red-500 mx-auto"></div>
                                                <p className="text-xs text-gray-500 mt-1">Uploading image...</p>
                                            </div>
                                        )}
                                    </div>

                                    <div className="p-8 pt-6">
                                        {error && <div className="p-3 mb-4 text-sm text-white bg-red-500 rounded-md">{error}</div>}
                                        {success && <div className="p-3 mb-4 text-sm text-white bg-green-500 rounded-md">{success}</div>}

                                        <div className="grid gap-8">
                                            {/* Personal Information */}
                                            <div className="bg-gray-50 rounded-xl p-6">
                                                <h3 className="text-xl font-semibold text-gray-800 mb-6 flex items-center gap-2">
                                                    <User className="h-5 w-5 text-red-600" />
                                                    Personal Information
                                                </h3>

                                                <div className="grid md:grid-cols-2 gap-6">
                                                    <div>
                                                        <Label htmlFor="name" className="flex items-center gap-2 text-sm font-medium text-gray-700">
                                                            <User className="h-4 w-4 text-red-500" />
                                                            Full Name
                                                        </Label>
                                                        {isEditing ? (
                                                            <Input
                                                                id="name"
                                                                value={editedProfile.name || ""}
                                                                onChange={(e) => setEditedProfile({ ...editedProfile, name: e.target.value })}
                                                                className="mt-2 border-gray-300 focus:border-red-500 focus:ring-red-500"
                                                            />
                                                        ) : (
                                                            <div className="mt-2 p-3 bg-white rounded-lg border font-medium">{profile.name}</div>
                                                        )}
                                                    </div>

                                                    <div>
                                                        <Label htmlFor="email" className="flex items-center gap-2 text-sm font-medium text-gray-700">
                                                            <Mail className="h-4 w-4 text-red-500" />
                                                            Email Address
                                                        </Label>
                                                        <div className="mt-2 p-3 bg-white rounded-lg border font-medium text-gray-600">
                                                            {profile.email || "N/A"}
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <Label htmlFor="phone" className="flex items-center gap-2 text-sm font-medium text-gray-700">
                                                            <Phone className="h-4 w-4 text-red-500" />
                                                            Phone Number
                                                        </Label>
                                                        {isEditing ? (
                                                            <Input
                                                                id="phone"
                                                                value={editedProfile.phone || ""}
                                                                onChange={(e) => setEditedProfile({ ...editedProfile, phone: e.target.value })}
                                                                placeholder="Enter phone number"
                                                                className="mt-2 border-gray-300 focus:border-red-500 focus:ring-red-500"
                                                            />
                                                        ) : (
                                                            <div className="mt-2 p-3 bg-white rounded-lg border font-medium">
                                                                {profile.phone || "Not provided"}
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div>
                                                        <Label htmlFor="address" className="flex items-center gap-2 text-sm font-medium text-gray-700">
                                                            <MapPin className="h-4 w-4 text-red-500" />
                                                            Address
                                                        </Label>
                                                        {isEditing ? (
                                                            <Input
                                                                id="address"
                                                                value={editedProfile.address || ""}
                                                                onChange={(e) => setEditedProfile({ ...editedProfile, address: e.target.value })}
                                                                placeholder="Enter address"
                                                                className="mt-2 border-gray-300 focus:border-red-500 focus:ring-red-500"
                                                            />
                                                        ) : (
                                                            <div className="mt-2 p-3 bg-white rounded-lg border font-medium">
                                                                {profile.address || "Not provided"}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* System Information */}
                                            <div className="bg-blue-50 rounded-xl p-6">
                                                <h3 className="text-xl font-semibold text-gray-800 mb-6 flex items-center gap-2">
                                                    <Shield className="h-5 w-5 text-blue-600" />
                                                    System Information
                                                </h3>

                                                <div className="grid md:grid-cols-2 gap-6">
                                                    <div>
                                                        <Label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                                                            <Key className="h-4 w-4 text-blue-500" />
                                                            Super Admin ID
                                                        </Label>
                                                        <div className="mt-2 p-3 bg-white rounded-lg border font-mono font-bold text-blue-600">
                                                            {profile.superAdminId}
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <Label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                                                            <Building className="h-4 w-4 text-blue-500" />
                                                            Organization
                                                        </Label>
                                                        <div className="mt-2 p-3 bg-white rounded-lg border font-medium">
                                                            {profile.organization || "UEM College"}
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <Label htmlFor="department" className="flex items-center gap-2 text-sm font-medium text-gray-700">
                                                            <Briefcase className="h-4 w-4 text-blue-500" />
                                                            Department
                                                        </Label>
                                                        {isEditing ? (
                                                            <Input
                                                                id="department"
                                                                value={editedProfile.department || ""}
                                                                onChange={(e) => setEditedProfile({ ...editedProfile, department: e.target.value })}
                                                                placeholder="Enter department"
                                                                className="mt-2 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                                                            />
                                                        ) : (
                                                            <div className="mt-2 p-3 bg-white rounded-lg border font-medium">
                                                                {profile.department || "Information Technology"}
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div>
                                                        <Label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                                                            <UserCog className="h-4 w-4 text-blue-500" />
                                                            Role
                                                        </Label>
                                                        <div className="mt-2 p-3 bg-white rounded-lg border font-medium capitalize">
                                                            Super Administrator
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Account Activity */}
                                            <div className="bg-green-50 rounded-xl p-6">
                                                <h3 className="text-xl font-semibold text-gray-800 mb-6 flex items-center gap-2">
                                                    <Clock className="h-5 w-5 text-green-600" />
                                                    Account Activity
                                                </h3>

                                                <div className="grid md:grid-cols-2 gap-6">
                                                    <div>
                                                        <Label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                                                            <Calendar className="h-4 w-4 text-green-500" />
                                                            Account Created
                                                        </Label>
                                                        <div className="mt-2 p-3 bg-white rounded-lg border font-medium">
                                                            {formatDate(profile.createdAt)}
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <Label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                                                            <Clock className="h-4 w-4 text-green-500" />
                                                            Last Login
                                                        </Label>
                                                        <div className="mt-2 p-3 bg-white rounded-lg border font-medium">
                                                            {profile.lastLogin ? formatDate(profile.lastLogin) : "Never"}
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <Label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                                                            <User className="h-4 w-4 text-green-500" />
                                                            Created By
                                                        </Label>
                                                        <div className="mt-2 p-3 bg-white rounded-lg border font-medium">
                                                            {profile.createdBy === "self" ? "Self Registration" : profile.createdBy}
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <Label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                                                            <Globe className="h-4 w-4 text-green-500" />
                                                            Account Status
                                                        </Label>
                                                        <div className="mt-2 p-3 bg-white rounded-lg border">
                                                            <Badge className={`${profile.isActive ? 'bg-green-500' : 'bg-red-500'} text-white`}>
                                                                {profile.isActive ? (
                                                                    <><CheckCircle className="h-3 w-3 mr-1" /> Active</>
                                                                ) : (
                                                                    <><AlertCircle className="h-3 w-3 mr-1" /> Inactive</>
                                                                )}
                                                            </Badge>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {isEditing && (
                                                <div className="flex justify-end gap-4 pt-6 border-t">
                                                    <Button
                                                        variant="outline"
                                                        onClick={handleCancel}
                                                        className="flex items-center gap-2"
                                                    >
                                                        <X className="h-4 w-4" />
                                                        Cancel
                                                    </Button>
                                                    <Button
                                                        onClick={handleSave}
                                                        className="bg-red-600 hover:bg-red-700 flex items-center gap-2"
                                                        disabled={saving}
                                                    >
                                                        {saving ? (
                                                            <>
                                                                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                                                                <span>Saving...</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Check className="h-4 w-4" />
                                                                Save Changes
                                                            </>
                                                        )}
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </>
                    ) : (
                        <Card className="border-0 shadow-lg rounded-xl overflow-hidden">
                            <CardContent className="p-8 text-center">
                                <p className="text-lg text-gray-600">Profile not found</p>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </DashboardLayout>
    )
}