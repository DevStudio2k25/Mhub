"use client"

import { useEffect, useState } from "react"
import { collection, getDocs, doc, setDoc, deleteDoc } from "firebase/firestore"
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "firebase/auth"
import { db, auth } from "@/lib/firebase"
import { useAuth } from "@/contexts/auth-context"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Shield, Plus, Trash2, Eye, EyeOff } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { formatDate } from "@/lib/utils"

interface SuperAdmin {
    uid: string
    firstName?: string
    lastName?: string
    middleName?: string
    name: string // Keep for backward compatibility
    email: string | null
    createdAt: string
    createdBy: string | undefined
    isActive?: boolean
}

export default function ManageSuperAdmins() {
    const { userData } = useAuth()
    const { toast } = useToast()
    const [superAdmins, setSuperAdmins] = useState<SuperAdmin[]>([])
    const [loading, setLoading] = useState(true)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [isCreating, setIsCreating] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [adminPassword, setAdminPassword] = useState("")
    const [newSuperAdmin, setNewSuperAdmin] = useState({
        firstName: "",
        lastName: "",
        middleName: "",
        email: "",
        password: ""
    })
    const [error, setError] = useState("")

    useEffect(() => {
        const fetchSuperAdmins = async () => {
            if (!userData || userData.role !== "super-admin") return

            try {
                const superAdminsSnapshot = await getDocs(collection(db, "super-admins"))
                const superAdminsArray: SuperAdmin[] = []

                superAdminsSnapshot.forEach((doc) => {
                    superAdminsArray.push({
                        uid: doc.id,
                        ...doc.data()
                    } as SuperAdmin)
                })

                setSuperAdmins(superAdminsArray)
            } catch (error) {
                console.error("Error fetching super admins:", error)
            } finally {
                setLoading(false)
            }
        }

        fetchSuperAdmins()
    }, [userData])

    const handleCreateSuperAdmin = async () => {
        if (!newSuperAdmin.firstName || !newSuperAdmin.lastName || !newSuperAdmin.email || !newSuperAdmin.password) {
            setError("Please fill all required fields")
            return
        }

        if (!adminPassword) {
            setError("Please enter your password to confirm")
            return
        }

        setError("")
        setIsCreating(true)

        try {
            // Store current admin credentials
            const currentAdminEmail = auth.currentUser?.email
            const currentAdminUid = auth.currentUser?.uid

            // Create new super admin account
            const superAdminCredential = await createUserWithEmailAndPassword(auth, newSuperAdmin.email, newSuperAdmin.password)
            const superAdminUser = superAdminCredential.user

            // Save super admin data to super-admins collection
            const fullName = newSuperAdmin.middleName
                ? `${newSuperAdmin.firstName} ${newSuperAdmin.middleName} ${newSuperAdmin.lastName}`
                : `${newSuperAdmin.firstName} ${newSuperAdmin.lastName}`

            const superAdminData = {
                uid: superAdminUser.uid,
                email: superAdminUser.email,
                firstName: newSuperAdmin.firstName,
                lastName: newSuperAdmin.lastName,
                middleName: newSuperAdmin.middleName || undefined,
                name: fullName, // Keep for backward compatibility
                role: "super-admin",
                createdBy: currentAdminUid,
                createdAt: new Date().toISOString(),
                isActive: true
            }

            await setDoc(doc(db, "super-admins", superAdminUser.uid), superAdminData)

            // Sign out the newly created account
            await signOut(auth)

            // Sign back in as current super admin
            if (currentAdminEmail) {
                await signInWithEmailAndPassword(auth, currentAdminEmail, adminPassword)
            }

            // Update local state
            setSuperAdmins([...superAdmins, superAdminData])

            // Reset form
            setNewSuperAdmin({ firstName: "", lastName: "", middleName: "", email: "", password: "" })
            setAdminPassword("")
            setIsDialogOpen(false)

            toast({
                title: "Super Admin created successfully",
                description: `${fullName} has been added as a super administrator.`
            })
        } catch (error: any) {
            console.error("Error creating super admin:", error)
            setError(error.message || "Failed to create super admin")
        } finally {
            setIsCreating(false)
        }
    }

    const handleDeleteSuperAdmin = async (superAdminId: string, superAdminName: string) => {
        if (!confirm(`Are you sure you want to delete super admin "${superAdminName}"?`)) return

        try {
            await deleteDoc(doc(db, "super-admins", superAdminId))
            setSuperAdmins(superAdmins.filter(admin => admin.uid !== superAdminId))

            toast({
                title: "Super Admin deleted",
                description: `${superAdminName} has been removed from super administrators.`
            })
        } catch (error) {
            console.error("Error deleting super admin:", error)
            toast({
                title: "Error",
                description: "Failed to delete super admin. Please try again.",
                variant: "destructive"
            })
        }
    }

    if (!userData || userData.role !== "super-admin") {
        return null
    }

    return (
        <DashboardLayout>
            <style jsx global>{`
                .scrollbar-hide {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
                .scrollbar-hide::-webkit-scrollbar {
                    display: none;
                }
            `}</style>
            <div className="container mx-auto py-8 px-6">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold mb-2">Manage Super Admins</h1>
                        <p className="text-muted-foreground">Create and manage super administrator accounts</p>
                    </div>
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="bg-red-600 hover:bg-red-700">
                                <Plus className="h-4 w-4 mr-2" />
                                Add Super Admin
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                    <Shield className="h-5 w-5 text-red-600" />
                                    Create New Super Admin
                                </DialogTitle>
                                <DialogDescription>
                                    Create a new super administrator account with full system access.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                                {error && (
                                    <div className="p-3 text-sm text-white bg-red-500 rounded-md">
                                        {error}
                                    </div>
                                )}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="firstName">First Name *</Label>
                                        <Input
                                            id="firstName"
                                            value={newSuperAdmin.firstName}
                                            onChange={(e) => setNewSuperAdmin({ ...newSuperAdmin, firstName: e.target.value })}
                                            placeholder="Enter first name"
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="lastName">Last Name *</Label>
                                        <Input
                                            id="lastName"
                                            value={newSuperAdmin.lastName}
                                            onChange={(e) => setNewSuperAdmin({ ...newSuperAdmin, lastName: e.target.value })}
                                            placeholder="Enter last name"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <Label htmlFor="middleName">Middle Name (Optional)</Label>
                                    <Input
                                        id="middleName"
                                        value={newSuperAdmin.middleName}
                                        onChange={(e) => setNewSuperAdmin({ ...newSuperAdmin, middleName: e.target.value })}
                                        placeholder="Enter middle name (optional)"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="email">Email Address</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={newSuperAdmin.email}
                                        onChange={(e) => setNewSuperAdmin({ ...newSuperAdmin, email: e.target.value })}
                                        placeholder="Enter email address"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="password">Password</Label>
                                    <div className="relative">
                                        <Input
                                            id="password"
                                            type={showPassword ? "text" : "password"}
                                            value={newSuperAdmin.password}
                                            onChange={(e) => setNewSuperAdmin({ ...newSuperAdmin, password: e.target.value })}
                                            placeholder="Enter password"
                                            className="pr-10"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                        >
                                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <Label htmlFor="adminPassword">Your Password (Confirmation)</Label>
                                    <Input
                                        id="adminPassword"
                                        type="password"
                                        value={adminPassword}
                                        onChange={(e) => setAdminPassword(e.target.value)}
                                        placeholder="Enter your password to confirm"
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleCreateSuperAdmin}
                                    disabled={isCreating}
                                    className="bg-red-600 hover:bg-red-700"
                                >
                                    {isCreating ? "Creating..." : "Create Super Admin"}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500"></div>
                    </div>
                ) : (
                    <Card className="border-0 shadow-lg rounded-xl overflow-hidden">
                        <CardHeader className="bg-gradient-to-r from-red-500/20 to-red-500/5">
                            <CardTitle className="flex items-center gap-2">
                                <Shield className="h-5 w-5 text-red-600" />
                                Super Administrators ({superAdmins.length})
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            {superAdmins.length > 0 ? (
                                <div className="max-h-96 overflow-auto border rounded-md scrollbar-hide">
                                    <Table>
                                        <TableHeader className="sticky top-0 bg-gray-50 z-10 border-b">
                                            <TableRow className="border-b">
                                                <TableHead className="border-r px-4 py-3 text-left font-semibold">Name</TableHead>
                                                <TableHead className="border-r px-4 py-3 text-left font-semibold">Email</TableHead>
                                                <TableHead className="border-r px-4 py-3 text-left font-semibold">Created At</TableHead>
                                                <TableHead className="border-r px-4 py-3 text-left font-semibold">Created By</TableHead>
                                                <TableHead className="px-4 py-3 text-left font-semibold">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {superAdmins.map((admin) => (
                                                <TableRow key={admin.uid} className="border-b hover:bg-gray-50">
                                                    <TableCell className="border-r px-4 py-3 font-medium whitespace-nowrap">
                                                        {admin.firstName && admin.lastName
                                                            ? (admin.middleName
                                                                ? `${admin.firstName} ${admin.middleName} ${admin.lastName}`
                                                                : `${admin.firstName} ${admin.lastName}`)
                                                            : admin.name}
                                                    </TableCell>
                                                    <TableCell className="border-r px-4 py-3 whitespace-nowrap">
                                                        {admin.email || "N/A"}
                                                    </TableCell>
                                                    <TableCell className="border-r px-4 py-3 text-sm whitespace-nowrap">
                                                        {formatDate(admin.createdAt)}
                                                    </TableCell>
                                                    <TableCell className="border-r px-4 py-3 text-sm whitespace-nowrap">
                                                        {admin.createdBy || "N/A"}
                                                    </TableCell>
                                                    <TableCell className="px-4 py-3 whitespace-nowrap">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleDeleteSuperAdmin(admin.uid, admin.name)}
                                                            className="h-8 px-3 text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
                                                            disabled={admin.uid === userData.uid} // Can't delete self
                                                        >
                                                            <Trash2 className="h-3 w-3 mr-1" />
                                                            Delete
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            ) : (
                                <div className="text-center py-12">
                                    <Shield className="h-12 w-12 text-red-300 mx-auto mb-4" />
                                    <p className="text-gray-500">No super administrators found</p>
                                    <p className="text-sm text-gray-400 mt-1">Create your first super admin to get started</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}
            </div>
        </DashboardLayout>
    )
}