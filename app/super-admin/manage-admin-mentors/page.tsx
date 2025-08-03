"use client"

import { useEffect, useState } from "react"
import { collection, getDocs, doc, updateDoc, query, where } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/contexts/auth-context"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { 
    Users, 
    ShieldCheck, 
    UserCog, 
    Save,
    AlertCircle,
    CheckCircle
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface AdminUser {
    uid: string
    firstName: string
    lastName: string
    name: string
    email: string
    role: "admin"
    adminId: string
    canBeMentor?: boolean
    isActive?: boolean
}

export default function ManageAdminMentors() {
    const { userData } = useAuth()
    const { toast } = useToast()
    const [admins, setAdmins] = useState<AdminUser[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState<string | null>(null)

    useEffect(() => {
        const fetchAdmins = async () => {
            if (!userData || userData.role !== "super-admin") return

            try {
                const adminsRef = collection(db, "admins")
                const adminsQuery = query(adminsRef, where("role", "==", "admin"))
                const adminsSnapshot = await getDocs(adminsQuery)

                const adminsData: AdminUser[] = []
                adminsSnapshot.forEach((doc) => {
                    const data = doc.data()
                    adminsData.push({
                        uid: doc.id,
                        firstName: data.firstName || "",
                        lastName: data.lastName || "",
                        name: data.name || `${data.firstName} ${data.lastName}`,
                        email: data.email || "",
                        role: data.role || "admin",
                        adminId: data.adminId || "",
                        canBeMentor: data.canBeMentor || false,
                        isActive: data.isActive ?? true
                    })
                })

                setAdmins(adminsData.sort((a, b) => a.name.localeCompare(b.name)))
            } catch (error) {
                console.error("Error fetching admins:", error)
                toast({
                    title: "Error",
                    description: "Failed to load admin users",
                    variant: "destructive"
                })
            } finally {
                setLoading(false)
            }
        }

        fetchAdmins()
    }, [userData, toast])

    const handleToggleMentorAccess = async (adminId: string, canBeMentor: boolean) => {
        setSaving(adminId)
        try {
            const adminRef = doc(db, "admins", adminId)
            await updateDoc(adminRef, {
                canBeMentor: canBeMentor
            })

            // Update local state
            setAdmins(prev => prev.map(admin => 
                admin.uid === adminId 
                    ? { ...admin, canBeMentor }
                    : admin
            ))

            toast({
                title: "Success",
                description: `Mentor access ${canBeMentor ? 'granted' : 'revoked'} successfully`,
                variant: "default"
            })
        } catch (error) {
            console.error("Error updating mentor access:", error)
            toast({
                title: "Error",
                description: "Failed to update mentor access",
                variant: "destructive"
            })
        } finally {
            setSaving(null)
        }
    }

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

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">Manage Admin-Mentor Access</h1>
                        <p className="text-muted-foreground text-lg mt-1">
                            Grant or revoke mentor access for admin users
                        </p>
                    </div>
                    <Badge className="bg-purple-100 text-purple-800 border-purple-200">
                        <Users className="h-4 w-4 mr-2" />
                        {admins.length} Admins
                    </Badge>
                </div>

                {/* Info Card */}
                <Card className="border-amber-200 bg-amber-50">
                    <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                            <div>
                                <h3 className="font-semibold text-amber-800">Admin-Mentor Access</h3>
                                <p className="text-sm text-amber-700 mt-1">
                                    When you grant mentor access to an admin, they can switch between Admin and Mentor roles 
                                    without needing separate accounts. They'll see a role switcher in their dashboard.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Admins List */}
                <div className="grid gap-4">
                    {admins.map((admin) => (
                        <Card key={admin.uid} className="border-0 shadow-lg rounded-xl overflow-hidden">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-400 flex items-center justify-center text-white font-bold text-lg">
                                            {admin.name.substring(0, 2).toUpperCase()}
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-gray-800">{admin.name}</h3>
                                            <p className="text-sm text-gray-600">{admin.email}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <Badge className="bg-amber-100 text-amber-800 text-xs">
                                                    <ShieldCheck className="h-3 w-3 mr-1" />
                                                    Admin
                                                </Badge>
                                                <span className="text-xs text-gray-500">ID: {admin.adminId}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        {admin.canBeMentor && (
                                            <Badge className="bg-blue-100 text-blue-800">
                                                <UserCog className="h-3 w-3 mr-1" />
                                                Can be Mentor
                                            </Badge>
                                        )}
                                        
                                        <div className="flex items-center gap-3">
                                            <Label htmlFor={`mentor-${admin.uid}`} className="text-sm font-medium">
                                                Mentor Access
                                            </Label>
                                            <Switch
                                                id={`mentor-${admin.uid}`}
                                                checked={admin.canBeMentor || false}
                                                onCheckedChange={(checked) => handleToggleMentorAccess(admin.uid, checked)}
                                                disabled={saving === admin.uid || !admin.isActive}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {admin.canBeMentor && (
                                    <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                                        <div className="flex items-center gap-2">
                                            <CheckCircle className="h-4 w-4 text-blue-600" />
                                            <span className="text-sm font-medium text-blue-800">
                                                This admin can switch to mentor role
                                            </span>
                                        </div>
                                        <p className="text-xs text-blue-700 mt-1">
                                            They will see a role switcher in their dashboard and can access both admin and mentor features.
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {admins.length === 0 && (
                    <Card className="border-0 shadow-lg rounded-xl overflow-hidden">
                        <CardContent className="text-center py-12">
                            <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-500">No admin users found</p>
                        </CardContent>
                    </Card>
                )}
            </div>
        </DashboardLayout>
    )
}