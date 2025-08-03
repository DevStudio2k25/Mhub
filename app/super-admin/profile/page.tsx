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
    firstName?: string
    lastName?: string
    middleName?: string
    name?: string // Keep for backward compatibility
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

    // Helper function to get full name
    const getFullName = (profileData: SuperAdminProfile) => {
        if (profileData.firstName && profileData.lastName) {
            return profileData.middleName
                ? `${profileData.firstName} ${profileData.middleName} ${profileData.lastName}`
                : `${profileData.firstName} ${profileData.lastName}`
        }
        // Fallback to old name field
        return profileData.name || 'Unknown'
    }

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
                        firstName: data?.firstName,
                        lastName: data?.lastName,
                        middleName: data?.middleName,
                        name: data?.name, // Keep for backward compatibility
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

            if (editedProfile.firstName !== profile.firstName) updates.firstName = editedProfile.firstName
            if (editedProfile.lastName !== profile.lastName) updates.lastName = editedProfile.lastName
            if (editedProfile.middleName !== profile.middleName) updates.middleName = editedProfile.middleName

            // Update the full name for backward compatibility
            if (updates.firstName || updates.lastName || updates.middleName) {
                const newFirstName = editedProfile.firstName || profile.firstName || ""
                const newLastName = editedProfile.lastName || profile.lastName || ""
                const newMiddleName = editedProfile.middleName || profile.middleName
                updates.name = newMiddleName
                    ? `${newFirstName} ${newMiddleName} ${newLastName}`
                    : `${newFirstName} ${newLastName}`
            }
            if (editedProfile.phone !== profile.phone) updates.phone = editedProfile.phone
            if (editedProfile.address !== profile.address) updates.address = editedProfile.address

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
            <div className="container mx-auto py-4 sm:py-6 lg:py-8 px-4 sm:px-6">
                <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6">
                    {loading ? (
                        <Card className="border-0 shadow-lg rounded-xl overflow-hidden">
                            <CardContent className="p-6 sm:p-8 text-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-500 mx-auto"></div>
                                <p className="mt-4 text-gray-600">Loading profile...</p>
                            </CardContent>
                        </Card>
                    ) : profile ? (
                        <>
                            {/* Main Profile Card */}
                            <Card className="border-0 shadow-2xl rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-3xl">
                                <CardHeader className="bg-gradient-to-r from-red-600 via-red-500 to-orange-500 text-white pb-8 sm:pb-12">
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
                                        <div className="bg-white/20 p-2 sm:p-3 rounded-full flex-shrink-0">
                                            <Shield className="h-6 w-6 sm:h-8 sm:w-8" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <CardTitle className="text-lg sm:text-xl lg:text-2xl font-bold break-words">{getFullName(profile)}</CardTitle>
                                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mt-2">
                                                <Badge className="bg-white/20 text-white border-white/30 text-xs">
                                                    Super Administrator
                                                </Badge>
                                                <Badge className={`${profile.isActive ? 'bg-green-500' : 'bg-red-500'} text-white text-xs`}>
                                                    {profile.isActive ? (
                                                        <><CheckCircle className="h-3 w-3 mr-1" /> Active</>
                                                    ) : (
                                                        <><AlertCircle className="h-3 w-3 mr-1" /> Inactive</>
                                                    )}
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>
                                </CardHeader>

                                <CardContent className="p-0">
                                    <div className="relative -mt-12 sm:-mt-16 px-4 sm:px-8">
                                        <div className="flex flex-col items-center">
                                            <div className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-full overflow-hidden border-4 border-white shadow-xl bg-white transition-all duration-300 hover:scale-105">
                                                {profile.photoURL ? (
                                                    <Image
                                                        src={profile.photoURL}
                                                        alt={getFullName(profile)}
                                                        fill
                                                        className="object-cover transition-transform duration-300"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center bg-red-100 text-red-800">
                                                        <User className="h-12 w-12 sm:h-16 sm:w-16" />
                                                    </div>
                                                )}
                                                <button
                                                    onClick={handleImageClick}
                                                    className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-all duration-300 group"
                                                >
                                                    <Camera className="h-6 w-6 sm:h-8 sm:w-8 text-white group-hover:scale-110 transition-transform duration-200" />
                                                </button>
                                                <input
                                                    type="file"
                                                    ref={fileInputRef}
                                                    onChange={handleImageChange}
                                                    accept="image/*"
                                                    className="hidden"
                                                />
                                            </div>
                                            {!isEditing && (
                                                <Button
                                                    onClick={handleEdit}
                                                    variant="outline"
                                                    size="sm"
                                                    className="mt-3 bg-white hover:bg-gray-50 border-gray-300 text-gray-700 transition-all duration-200"
                                                >
                                                    <Edit className="h-3 w-3 mr-1" />
                                                    <span className="text-xs">Edit</span>
                                                </Button>
                                            )}
                                        </div>
                                        {uploadingImage && (
                                            <div className="mt-4 text-center animate-fade-in">
                                                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-red-500 mx-auto"></div>
                                                <p className="text-xs text-gray-500 mt-1">Uploading image...</p>
                                            </div>
                                        )}
                                    </div>

                                    <div className="p-4 sm:p-6 lg:p-8 pt-4 sm:pt-6">
                                        {error && (
                                            <div className="p-3 mb-4 text-sm text-white bg-red-500 rounded-lg shadow-lg animate-slide-down">
                                                {error}
                                            </div>
                                        )}
                                        {success && (
                                            <div className="p-3 mb-4 text-sm text-white bg-green-500 rounded-lg shadow-lg animate-slide-down">
                                                {success}
                                            </div>
                                        )}

                                        <div className="grid gap-4 sm:gap-6 lg:gap-8">
                                            {/* Personal Information */}
                                            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 sm:p-6 transition-all duration-300 hover:shadow-md">
                                                <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                                    <User className="h-4 w-4 text-red-600 flex-shrink-0" />
                                                    <span>Personal Information</span>
                                                </h3>

                                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                                    <div className="space-y-1">
                                                        <Label htmlFor="firstName" className="flex items-center gap-2 text-xs font-medium text-gray-700">
                                                            <User className="h-3 w-3 text-red-500 flex-shrink-0" />
                                                            <span>First Name</span>
                                                        </Label>
                                                        {isEditing ? (
                                                            <Input
                                                                id="firstName"
                                                                value={editedProfile.firstName || ""}
                                                                onChange={(e) => setEditedProfile({ ...editedProfile, firstName: e.target.value })}
                                                                className="text-sm transition-all duration-200 border-gray-300 focus:border-red-500 focus:ring-red-500 focus:ring-2"
                                                            />
                                                        ) : (
                                                            <div className="p-2 bg-white rounded-lg border text-sm shadow-sm transition-all duration-200 hover:shadow-md break-words">
                                                                {profile.firstName || "-"}
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="space-y-1">
                                                        <Label htmlFor="lastName" className="flex items-center gap-2 text-xs font-medium text-gray-700">
                                                            <User className="h-3 w-3 text-red-500 flex-shrink-0" />
                                                            <span>Last Name</span>
                                                        </Label>
                                                        {isEditing ? (
                                                            <Input
                                                                id="lastName"
                                                                value={editedProfile.lastName || ""}
                                                                onChange={(e) => setEditedProfile({ ...editedProfile, lastName: e.target.value })}
                                                                className="text-sm transition-all duration-200 border-gray-300 focus:border-red-500 focus:ring-red-500 focus:ring-2"
                                                            />
                                                        ) : (
                                                            <div className="p-2 bg-white rounded-lg border text-sm shadow-sm transition-all duration-200 hover:shadow-md break-words">
                                                                {profile.lastName || "-"}
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="space-y-1">
                                                        <Label htmlFor="middleName" className="flex items-center gap-2 text-xs font-medium text-gray-700">
                                                            <User className="h-3 w-3 text-red-500 flex-shrink-0" />
                                                            <span>Middle Name (Optional)</span>
                                                        </Label>
                                                        {isEditing ? (
                                                            <Input
                                                                id="middleName"
                                                                value={editedProfile.middleName || ""}
                                                                onChange={(e) => setEditedProfile({ ...editedProfile, middleName: e.target.value })}
                                                                className="text-sm transition-all duration-200 border-gray-300 focus:border-red-500 focus:ring-red-500 focus:ring-2"
                                                            />
                                                        ) : (
                                                            <div className="p-2 bg-white rounded-lg border text-sm shadow-sm transition-all duration-200 hover:shadow-md break-words">
                                                                {profile.middleName || "-"}
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="space-y-1">
                                                        <Label htmlFor="email" className="flex items-center gap-2 text-xs font-medium text-gray-700">
                                                            <Mail className="h-3 w-3 text-red-500 flex-shrink-0" />
                                                            <span>Email Address</span>
                                                        </Label>
                                                        <div className="p-2 bg-white rounded-lg border text-sm text-gray-600 shadow-sm transition-all duration-200 hover:shadow-md break-all">
                                                            {profile.email || "N/A"}
                                                        </div>
                                                    </div>

                                                    <div className="space-y-1">
                                                        <Label htmlFor="phone" className="flex items-center gap-2 text-xs font-medium text-gray-700">
                                                            <Phone className="h-3 w-3 text-red-500 flex-shrink-0" />
                                                            <span>Phone Number</span>
                                                        </Label>
                                                        {isEditing ? (
                                                            <Input
                                                                id="phone"
                                                                value={editedProfile.phone || ""}
                                                                onChange={(e) => setEditedProfile({ ...editedProfile, phone: e.target.value })}
                                                                placeholder="Enter phone number"
                                                                className="text-sm transition-all duration-200 border-gray-300 focus:border-red-500 focus:ring-red-500 focus:ring-2"
                                                            />
                                                        ) : (
                                                            <div className="p-2 bg-white rounded-lg border text-sm shadow-sm transition-all duration-200 hover:shadow-md">
                                                                {profile.phone || "Not provided"}
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="space-y-1">
                                                        <Label htmlFor="address" className="flex items-center gap-2 text-xs font-medium text-gray-700">
                                                            <MapPin className="h-3 w-3 text-red-500 flex-shrink-0" />
                                                            <span>Address</span>
                                                        </Label>
                                                        {isEditing ? (
                                                            <Input
                                                                id="address"
                                                                value={editedProfile.address || ""}
                                                                onChange={(e) => setEditedProfile({ ...editedProfile, address: e.target.value })}
                                                                placeholder="Enter address"
                                                                className="text-sm transition-all duration-200 border-gray-300 focus:border-red-500 focus:ring-red-500 focus:ring-2"
                                                            />
                                                        ) : (
                                                            <div className="p-2 bg-white rounded-lg border text-sm shadow-sm transition-all duration-200 hover:shadow-md break-words">
                                                                {profile.address || "Not provided"}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* System Information */}
                                            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 sm:p-6 transition-all duration-300 hover:shadow-md">
                                                <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                                    <Shield className="h-4 w-4 text-blue-600 flex-shrink-0" />
                                                    <span>System Information</span>
                                                </h3>

                                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                                    <div className="space-y-1">
                                                        <Label className="flex items-center gap-2 text-xs font-medium text-gray-700">
                                                            <Key className="h-3 w-3 text-blue-500 flex-shrink-0" />
                                                            <span>Super Admin ID</span>
                                                        </Label>
                                                        <div className="p-2 bg-white rounded-lg border font-mono font-bold text-blue-600 shadow-sm transition-all duration-200 hover:shadow-md break-all text-xs">
                                                            {profile.superAdminId}
                                                        </div>
                                                    </div>

                                                    <div className="space-y-1">
                                                        <Label className="flex items-center gap-2 text-xs font-medium text-gray-700">
                                                            <Building className="h-3 w-3 text-blue-500 flex-shrink-0" />
                                                            <span>Organization</span>
                                                        </Label>
                                                        <div className="p-2 bg-white rounded-lg border text-sm shadow-sm transition-all duration-200 hover:shadow-md break-words">
                                                            {profile.organization || "UEM College"}
                                                        </div>
                                                    </div>

                                                    <div className="space-y-1">
                                                        <Label className="flex items-center gap-2 text-xs font-medium text-gray-700">
                                                            <UserCog className="h-3 w-3 text-blue-500 flex-shrink-0" />
                                                            <span>Role</span>
                                                        </Label>
                                                        <div className="p-2 bg-white rounded-lg border text-sm capitalize shadow-sm transition-all duration-200 hover:shadow-md">
                                                            Super Administrator
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Account Activity */}
                                            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 sm:p-6 transition-all duration-300 hover:shadow-md">
                                                <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                                    <Clock className="h-4 w-4 text-green-600 flex-shrink-0" />
                                                    <span>Account Activity</span>
                                                </h3>

                                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                                    <div className="space-y-1">
                                                        <Label className="flex items-center gap-2 text-xs font-medium text-gray-700">
                                                            <Calendar className="h-3 w-3 text-green-500 flex-shrink-0" />
                                                            <span>Account Created</span>
                                                        </Label>
                                                        <div className="p-2 bg-white rounded-lg border text-sm shadow-sm transition-all duration-200 hover:shadow-md">
                                                            {formatDate(profile.createdAt)}
                                                        </div>
                                                    </div>

                                                    <div className="space-y-1">
                                                        <Label className="flex items-center gap-2 text-xs font-medium text-gray-700">
                                                            <Clock className="h-3 w-3 text-green-500 flex-shrink-0" />
                                                            <span>Last Login</span>
                                                        </Label>
                                                        <div className="p-2 bg-white rounded-lg border text-sm shadow-sm transition-all duration-200 hover:shadow-md">
                                                            {profile.lastLogin ? formatDate(profile.lastLogin) : "Never"}
                                                        </div>
                                                    </div>

                                                    <div className="space-y-1">
                                                        <Label className="flex items-center gap-2 text-xs font-medium text-gray-700">
                                                            <User className="h-3 w-3 text-green-500 flex-shrink-0" />
                                                            <span>Created By</span>
                                                        </Label>
                                                        <div className="p-2 bg-white rounded-lg border text-sm shadow-sm transition-all duration-200 hover:shadow-md break-words">
                                                            {profile.createdBy === "self" ? "Self Registration" : profile.createdBy}
                                                        </div>
                                                    </div>

                                                    <div className="space-y-1">
                                                        <Label className="flex items-center gap-2 text-xs font-medium text-gray-700">
                                                            <Globe className="h-3 w-3 text-green-500 flex-shrink-0" />
                                                            <span>Account Status</span>
                                                        </Label>
                                                        <div className="p-2 bg-white rounded-lg border shadow-sm transition-all duration-200 hover:shadow-md">
                                                            <Badge className={`${profile.isActive ? 'bg-green-500' : 'bg-red-500'} text-white transition-all duration-200 text-xs`}>
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
                                                <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-4 pt-6 border-t border-gray-200 animate-slide-down">
                                                    <Button
                                                        variant="outline"
                                                        onClick={handleCancel}
                                                        className="flex items-center justify-center gap-2 transition-all duration-200 hover:bg-gray-50 order-2 sm:order-1"
                                                        disabled={saving}
                                                    >
                                                        <X className="h-4 w-4" />
                                                        <span>Cancel</span>
                                                    </Button>
                                                    <Button
                                                        onClick={handleSave}
                                                        className="bg-red-600 hover:bg-red-700 flex items-center justify-center gap-2 transition-all duration-200 transform hover:scale-105 order-1 sm:order-2"
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
                                                                <span>Save Changes</span>
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
                            <CardContent className="p-6 sm:p-8 text-center">
                                <div className="flex flex-col items-center gap-4">
                                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                                        <User className="h-8 w-8 text-red-600" />
                                    </div>
                                    <p className="text-lg text-gray-600">Profile not found</p>
                                    <p className="text-sm text-gray-500">Unable to load your profile information</p>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </DashboardLayout>
    )
}