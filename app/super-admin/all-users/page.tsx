"use client"

import { useEffect, useState } from "react"
import { collection, getDocs, doc, updateDoc, deleteDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/contexts/auth-context"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Users, Search, Filter, Settings, UserCog, GraduationCap, Shield, Eye, Edit3, Trash2 } from "lucide-react"
import { formatDate } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"

interface User {
    uid: string
    name: string
    email: string
    role: "super-admin" | "admin" | "mentor" | "mentee" | "admin+mentor"
    createdAt?: string
    profileImage?: string
    photoURL?: string
    mentorId?: string
    enrollmentNo?: string
    class?: string
    year?: string
    section?: string
    assignedMentorId?: string
    adminId?: string
    superAdminId?: string
}

interface Stats {
    superAdmins: number
    admins: number
    mentors: number
    mentees: number
    total: number
}

export default function AllUsers() {
    const { userData } = useAuth()
    const { toast } = useToast()
    const [allUsers, setAllUsers] = useState<User[]>([])
    const [filteredUsers, setFilteredUsers] = useState<User[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState("")
    const [roleFilter, setRoleFilter] = useState("all")
    const [stats, setStats] = useState<Stats>({
        superAdmins: 0,
        admins: 0,
        mentors: 0,
        mentees: 0,
        total: 0
    })
    const [roleChangeDialog, setRoleChangeDialog] = useState<{
        isOpen: boolean
        user: User | null
        newRole: string
    }>({
        isOpen: false,
        user: null,
        newRole: ""
    })
    const [isUpdatingRole, setIsUpdatingRole] = useState(false)
    const [deleteDialog, setDeleteDialog] = useState<{
        isOpen: boolean
        user: User | null
    }>({
        isOpen: false,
        user: null
    })
    const [isDeleting, setIsDeleting] = useState(false)

    useEffect(() => {
        const fetchAllUsers = async () => {
            if (!userData || userData.role !== "super-admin") return

            try {
                const users: User[] = []

                // Fetch from all collections
                const collections = [
                    { name: "super-admins", role: "super-admin" },
                    { name: "admins", role: "admin" },
                    { name: "mentors", role: "mentor" },
                    { name: "mentees", role: "mentee" }
                ]

                for (const col of collections) {
                    const snapshot = await getDocs(collection(db, col.name))
                    snapshot.forEach((doc) => {
                        const data = doc.data()
                        users.push({
                            uid: doc.id,
                            name: data.name || `${data.firstName} ${data.lastName}` || "Unknown",
                            email: data.email || "No email",
                            role: data.role || col.role,
                            createdAt: data.createdAt,
                            profileImage: data.profileImage,
                            photoURL: data.photoURL,
                            mentorId: data.mentorId,
                            enrollmentNo: data.enrollmentNo,
                            class: data.class,
                            year: data.year,
                            section: data.section,
                            assignedMentorId: data.assignedMentorId,
                            adminId: data.adminId,
                            superAdminId: data.superAdminId
                        } as User)
                    })
                }

                setAllUsers(users)
                setFilteredUsers(users)

                // Calculate stats
                const stats: Stats = {
                    superAdmins: users.filter(u => u.role === "super-admin").length,
                    admins: users.filter(u => u.role === "admin").length,
                    mentors: users.filter(u => u.role === "mentor" || u.role === "admin+mentor").length,
                    mentees: users.filter(u => u.role === "mentee").length,
                    total: users.length
                }
                setStats(stats)
            } catch (error) {
                console.error("Error fetching users:", error)
            } finally {
                setLoading(false)
            }
        }

        fetchAllUsers()
    }, [userData])

    // Filter users based on search and role
    useEffect(() => {
        let filtered = allUsers

        if (searchQuery) {
            filtered = filtered.filter(user =>
                user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (user.mentorId && user.mentorId.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (user.enrollmentNo && user.enrollmentNo.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (user.adminId && user.adminId.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (user.superAdminId && user.superAdminId.toLowerCase().includes(searchQuery.toLowerCase()))
            )
        }

        if (roleFilter !== "all") {
            filtered = filtered.filter(user => user.role === roleFilter)
        }

        setFilteredUsers(filtered)
    }, [searchQuery, roleFilter, allUsers])

    const getRoleIcon = (role: string) => {
        switch (role) {
            case "super-admin":
                return <Shield className="h-4 w-4 text-red-600" />
            case "admin":
                return <Settings className="h-4 w-4 text-amber-600" />
            case "mentor":
            case "admin+mentor":
                return <UserCog className="h-4 w-4 text-blue-600" />
            case "mentee":
                return <GraduationCap className="h-4 w-4 text-green-600" />
            default:
                return <Users className="h-4 w-4 text-gray-600" />
        }
    }

    const getRoleBadgeColor = (role: string) => {
        switch (role) {
            case "super-admin":
                return "bg-red-100 text-red-800 border-red-200"
            case "admin":
                return "bg-amber-100 text-amber-800 border-amber-200"
            case "mentor":
                return "bg-blue-100 text-blue-800 border-blue-200"
            case "admin+mentor":
                return "bg-purple-100 text-purple-800 border-purple-200"
            case "mentee":
                return "bg-green-100 text-green-800 border-green-200"
            default:
                return "bg-gray-100 text-gray-800 border-gray-200"
        }
    }

    const handleRoleChange = (user: User, newRole: string) => {
        if (user.role === newRole) return

        setRoleChangeDialog({
            isOpen: true,
            user,
            newRole
        })
    }

    const confirmRoleChange = async () => {
        if (!roleChangeDialog.user || !roleChangeDialog.newRole) return

        setIsUpdatingRole(true)
        try {
            const user = roleChangeDialog.user
            const newRole = roleChangeDialog.newRole

            // Determine source collection
            const getCollectionName = (role: string) => {
                switch (role) {
                    case "super-admin": return "super-admins"
                    case "admin":
                    case "admin+mentor": return "admins"
                    case "mentor": return "mentors"
                    case "mentee": return "mentees"
                    default: return "users"
                }
            }

            const sourceCollection = getCollectionName(user.role)

            // Update the role in the current collection
            const userRef = doc(db, sourceCollection, user.uid)
            await updateDoc(userRef, {
                role: newRole,
                lastUpdated: new Date().toISOString()
            })

            // Update local state
            const updatedUsers = allUsers.map(u =>
                u.uid === user.uid ? { ...u, role: newRole as any } : u
            )
            setAllUsers(updatedUsers)

            toast({
                title: "Role Updated Successfully",
                description: `${user.name}'s role has been changed to ${newRole}`,
            })

            setRoleChangeDialog({ isOpen: false, user: null, newRole: "" })
        } catch (error) {
            console.error("Error updating role:", error)
            toast({
                title: "Error",
                description: "Failed to update user role. Please try again.",
                variant: "destructive",
            })
        } finally {
            setIsUpdatingRole(false)
        }
    }

    const getProfileLink = (user: User) => {
        switch (user.role) {
            case "admin":
            case "admin+mentor":
                return `/super-admin/view-profile/admin/${user.uid}`
            case "mentor":
                return `/super-admin/view-profile/mentor/${user.uid}`
            case "mentee":
                return `/super-admin/view-profile/mentee/${user.uid}`
            default:
                return null
        }
    }

    const handleDeleteUser = (user: User) => {
        setDeleteDialog({
            isOpen: true,
            user
        })
    }

    const confirmDeleteUser = async () => {
        if (!deleteDialog.user) return

        setIsDeleting(true)
        try {
            const user = deleteDialog.user

            // Determine collection name
            const getCollectionName = (role: string) => {
                switch (role) {
                    case "super-admin": return "super-admins"
                    case "admin":
                    case "admin+mentor": return "admins"
                    case "mentor": return "mentors"
                    case "mentee": return "mentees"
                    default: return "users"
                }
            }

            const collectionName = getCollectionName(user.role)

            // Delete from Firestore
            await deleteDoc(doc(db, collectionName, user.uid))

            // Update local state
            const updatedUsers = allUsers.filter(u => u.uid !== user.uid)
            setAllUsers(updatedUsers)

            toast({
                title: "User Deleted Successfully",
                description: `${user.name} has been removed from the system`,
            })

            setDeleteDialog({ isOpen: false, user: null })
        } catch (error) {
            console.error("Error deleting user:", error)
            toast({
                title: "Error",
                description: "Failed to delete user. Please try again.",
                variant: "destructive",
            })
        } finally {
            setIsDeleting(false)
        }
    }

    const canDeleteUser = (user: User) => {
        // Can't delete yourself
        if (user.uid === userData?.uid) return false

        // Can delete any user except yourself
        return true
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
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">All Users</h1>
                    <p className="text-muted-foreground text-lg mt-2">Manage all users across the platform</p>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <Card className="border-0 shadow-lg rounded-xl overflow-hidden">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-500">Total Users</p>
                                    <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
                                </div>
                                <Users className="h-8 w-8 text-gray-400" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-0 shadow-lg rounded-xl overflow-hidden">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-red-500">Super Admins</p>
                                    <p className="text-2xl font-bold text-red-600">{stats.superAdmins}</p>
                                </div>
                                <Shield className="h-8 w-8 text-red-400" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-0 shadow-lg rounded-xl overflow-hidden">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-amber-500">Admins</p>
                                    <p className="text-2xl font-bold text-amber-600">{stats.admins}</p>
                                </div>
                                <Settings className="h-8 w-8 text-amber-400" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-0 shadow-lg rounded-xl overflow-hidden">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-blue-500">Mentors</p>
                                    <p className="text-2xl font-bold text-blue-600">{stats.mentors}</p>
                                </div>
                                <UserCog className="h-8 w-8 text-blue-400" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-0 shadow-lg rounded-xl overflow-hidden">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-green-500">Mentees</p>
                                    <p className="text-2xl font-bold text-green-600">{stats.mentees}</p>
                                </div>
                                <GraduationCap className="h-8 w-8 text-green-400" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Search and Filter */}
                <Card className="border-0 shadow-lg rounded-xl overflow-hidden">
                    <CardContent className="p-6">
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="flex-1">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                                    <Input
                                        placeholder="Search by name, email, mentor ID, enrollment number, or admin ID..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-10 h-11"
                                    />
                                </div>
                            </div>
                            <div className="w-full md:w-48">
                                <Select value={roleFilter} onValueChange={setRoleFilter}>
                                    <SelectTrigger className="h-11">
                                        <Filter className="h-4 w-4 mr-2" />
                                        <SelectValue placeholder="Filter by role" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Roles</SelectItem>
                                        <SelectItem value="super-admin">Super Admin</SelectItem>
                                        <SelectItem value="admin">Admin</SelectItem>
                                        <SelectItem value="mentor">Mentor</SelectItem>
                                        <SelectItem value="admin+mentor">Admin+Mentor</SelectItem>
                                        <SelectItem value="mentee">Mentee</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Users Table */}
                <Card>
                    <CardHeader>
                        <CardTitle>All Users ({filteredUsers.length} users)</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        {loading ? (
                            <div className="flex items-center justify-center h-32">
                                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-500"></div>
                            </div>
                        ) : filteredUsers.length > 0 ? (
                            <div className="max-h-96 overflow-auto border rounded-md scrollbar-hide">
                                <Table>
                                    <TableHeader className="sticky top-0 bg-gray-50 z-10 border-b">
                                        <TableRow className="border-b">
                                            <TableHead className="border-r px-4 py-3 text-left font-semibold">Name</TableHead>
                                            <TableHead className="border-r px-4 py-3 text-left font-semibold">Email</TableHead>
                                            <TableHead className="border-r px-4 py-3 text-left font-semibold">Role</TableHead>
                                            <TableHead className="border-r px-4 py-3 text-left font-semibold">ID</TableHead>
                                            <TableHead className="border-r px-4 py-3 text-left font-semibold">Created At</TableHead>
                                            <TableHead className="px-4 py-3 text-left font-semibold">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredUsers.map((user) => (
                                            <TableRow key={user.uid} className="border-b hover:bg-gray-50">
                                                <TableCell className="border-r px-4 py-3 font-medium whitespace-nowrap">
                                                    {user.name}
                                                </TableCell>
                                                <TableCell className="border-r px-4 py-3 whitespace-nowrap">
                                                    {user.email}
                                                </TableCell>
                                                <TableCell className="border-r px-4 py-3 whitespace-nowrap">
                                                    <Badge className={getRoleBadgeColor(user.role)}>
                                                        {user.role}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="border-r px-4 py-3 font-mono text-sm whitespace-nowrap">
                                                    {user.mentorId || user.enrollmentNo || user.adminId || user.superAdminId || "-"}
                                                </TableCell>
                                                <TableCell className="border-r px-4 py-3 text-sm whitespace-nowrap">
                                                    {user.createdAt ? formatDate(user.createdAt) : "N/A"}
                                                </TableCell>
                                                <TableCell className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        {user.role !== "super-admin" && (
                                                            <Select
                                                                value={user.role}
                                                                onValueChange={(newRole) => handleRoleChange(user, newRole)}
                                                            >
                                                                <SelectTrigger className="w-32 h-8 text-xs">
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="admin">Admin</SelectItem>
                                                                    <SelectItem value="mentor">Mentor</SelectItem>
                                                                    <SelectItem value="admin+mentor">Admin+Mentor</SelectItem>
                                                                    <SelectItem value="mentee">Mentee</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        )}
                                                        {getProfileLink(user) && (
                                                            <Link href={getProfileLink(user)!}>
                                                                <Button variant="outline" size="sm" className="h-8 px-3">
                                                                    <Eye className="h-3 w-3 mr-1" />
                                                                    View
                                                                </Button>
                                                            </Link>
                                                        )}
                                                        {canDeleteUser(user) && (
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="h-8 px-3 text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
                                                                onClick={() => handleDeleteUser(user)}
                                                            >
                                                                <Trash2 className="h-3 w-3 mr-1" />
                                                                Delete
                                                            </Button>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <Users className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                                <p className="text-gray-500">No users found</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Role Change Confirmation Dialog */}
                <Dialog open={roleChangeDialog.isOpen} onOpenChange={(open) =>
                    setRoleChangeDialog({ isOpen: open, user: null, newRole: "" })
                }>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Confirm Role Change</DialogTitle>
                            <DialogDescription>
                                Are you sure you want to change {roleChangeDialog.user?.name}'s role from{" "}
                                <Badge className={getRoleBadgeColor(roleChangeDialog.user?.role || "")}>
                                    {roleChangeDialog.user?.role}
                                </Badge>{" "}
                                to{" "}
                                <Badge className={getRoleBadgeColor(roleChangeDialog.newRole)}>
                                    {roleChangeDialog.newRole}
                                </Badge>?
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => setRoleChangeDialog({ isOpen: false, user: null, newRole: "" })}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={confirmRoleChange}
                                disabled={isUpdatingRole}
                            >
                                {isUpdatingRole ? "Updating..." : "Confirm Change"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Delete User Confirmation Dialog */}
                <Dialog open={deleteDialog.isOpen} onOpenChange={(open) =>
                    setDeleteDialog({ isOpen: open, user: null })
                }>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Confirm User Deletion</DialogTitle>
                            <DialogDescription>
                                Are you sure you want to delete <strong>{deleteDialog.user?.name}</strong>?
                                <br />
                                <span className="text-red-600 font-medium">This action cannot be undone.</span>
                                <br />
                                <br />
                                User Details:
                                <br />
                                • Email: {deleteDialog.user?.email}
                                <br />
                                • Role: <Badge className={getRoleBadgeColor(deleteDialog.user?.role || "")}>{deleteDialog.user?.role}</Badge>
                                <br />
                                • ID: {deleteDialog.user?.mentorId || deleteDialog.user?.enrollmentNo || deleteDialog.user?.adminId || deleteDialog.user?.superAdminId || "N/A"}
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => setDeleteDialog({ isOpen: false, user: null })}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={confirmDeleteUser}
                                disabled={isDeleting}
                            >
                                {isDeleting ? "Deleting..." : "Delete User"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </DashboardLayout>
    )
}