"use client"

import { useEffect, useState } from "react"
import { collection, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/contexts/auth-context"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Users, Shield, Settings, UserCog, GraduationCap, Search } from "lucide-react"
import { formatDate } from "@/lib/utils"

interface User {
    uid: string
    name: string
    email: string | null
    role: string
    createdAt?: string
    collection: string
}

export default function AllUsers() {
    const { userData } = useAuth()
    const [allUsers, setAllUsers] = useState<User[]>([])
    const [filteredUsers, setFilteredUsers] = useState<User[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState("")
    const [roleFilter, setRoleFilter] = useState("all")

    useEffect(() => {
        const fetchAllUsers = async () => {
            if (!userData || userData.role !== "super-admin") return

            try {
                const users: User[] = []

                // Fetch super admins
                const superAdminsSnapshot = await getDocs(collection(db, "super-admins"))
                superAdminsSnapshot.forEach((doc) => {
                    const data = doc.data()
                    users.push({
                        uid: doc.id,
                        name: data.name || "Unknown",
                        email: data.email || null,
                        role: data.role || "super-admin",
                        createdAt: data.createdAt,
                        collection: "super-admins"
                    } as User)
                })

                // Fetch admins
                const adminsSnapshot = await getDocs(collection(db, "admins"))
                adminsSnapshot.forEach((doc) => {
                    const data = doc.data()
                    users.push({
                        uid: doc.id,
                        name: data.name || "Unknown",
                        email: data.email || null,
                        role: data.role || "admin",
                        createdAt: data.createdAt,
                        collection: "admins"
                    } as User)
                })

                // Note: users collection (mentors and mentees) will be added later when we migrate them to Firestore

                // Sort by creation date (newest first)
                users.sort((a, b) => {
                    const dateA = new Date(a.createdAt || 0).getTime()
                    const dateB = new Date(b.createdAt || 0).getTime()
                    return dateB - dateA
                })

                setAllUsers(users)
                setFilteredUsers(users)
            } catch (error) {
                console.error("Error fetching all users:", error)
            } finally {
                setLoading(false)
            }
        }

        fetchAllUsers()
    }, [userData])

    useEffect(() => {
        let filtered = allUsers

        // Filter by search query
        if (searchQuery) {
            filtered = filtered.filter(user =>
                user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (user.email && user.email.toLowerCase().includes(searchQuery.toLowerCase()))
            )
        }

        // Filter by role
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

    const getStats = () => {
        const stats = {
            superAdmins: allUsers.filter(u => u.role === "super-admin").length,
            admins: allUsers.filter(u => u.role === "admin").length,
            mentors: allUsers.filter(u => u.role === "mentor" || u.role === "admin+mentor").length,
            mentees: allUsers.filter(u => u.role === "mentee").length,
            total: allUsers.length
        }
        return stats
    }

    if (!userData || userData.role !== "super-admin") {
        return null
    }

    const stats = getStats()

    return (
        <DashboardLayout>
            <div className="container mx-auto py-8 px-6">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold mb-2">All Users</h1>
                        <p className="text-muted-foreground">Complete overview of all system users</p>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
                    <Card className="border-0 shadow-lg">
                        <CardContent className="p-4 text-center">
                            <div className="text-2xl font-bold text-gray-800">{stats.total}</div>
                            <div className="text-sm text-gray-600">Total Users</div>
                        </CardContent>
                    </Card>
                    <Card className="border-0 shadow-lg">
                        <CardContent className="p-4 text-center">
                            <div className="text-2xl font-bold text-red-600">{stats.superAdmins}</div>
                            <div className="text-sm text-gray-600">Super Admins</div>
                        </CardContent>
                    </Card>
                    <Card className="border-0 shadow-lg">
                        <CardContent className="p-4 text-center">
                            <div className="text-2xl font-bold text-amber-600">{stats.admins}</div>
                            <div className="text-sm text-gray-600">Admins</div>
                        </CardContent>
                    </Card>
                    <Card className="border-0 shadow-lg">
                        <CardContent className="p-4 text-center">
                            <div className="text-2xl font-bold text-blue-600">{stats.mentors}</div>
                            <div className="text-sm text-gray-600">Mentors</div>
                        </CardContent>
                    </Card>
                    <Card className="border-0 shadow-lg">
                        <CardContent className="p-4 text-center">
                            <div className="text-2xl font-bold text-green-600">{stats.mentees}</div>
                            <div className="text-sm text-gray-600">Mentees</div>
                        </CardContent>
                    </Card>
                </div>

                {/* Filters */}
                <Card className="border-0 shadow-lg rounded-xl overflow-hidden mb-6">
                    <CardContent className="p-6">
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="flex-1">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                                    <Input
                                        placeholder="Search by name or email..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-10"
                                    />
                                </div>
                            </div>
                            <div className="w-full md:w-48">
                                <Select value={roleFilter} onValueChange={setRoleFilter}>
                                    <SelectTrigger>
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

                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500"></div>
                    </div>
                ) : (
                    <Card className="border-0 shadow-lg rounded-xl overflow-hidden">
                        <CardHeader className="bg-gradient-to-r from-gray-500/20 to-gray-500/5">
                            <CardTitle className="flex items-center gap-2">
                                <Users className="h-5 w-5 text-gray-600" />
                                All Users ({filteredUsers.length})
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            {filteredUsers.length > 0 ? (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Name</TableHead>
                                            <TableHead>Email</TableHead>
                                            <TableHead>Role</TableHead>
                                            <TableHead>Collection</TableHead>
                                            <TableHead>Created At</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredUsers.map((user) => (
                                            <TableRow key={`${user.collection}-${user.uid}`}>
                                                <TableCell className="font-medium">{user.name}</TableCell>
                                                <TableCell>{user.email || "N/A"}</TableCell>
                                                <TableCell>
                                                    <Badge className={`${getRoleBadgeColor(user.role)} flex items-center gap-1 w-fit`}>
                                                        {getRoleIcon(user.role)}
                                                        {user.role}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="text-xs">
                                                        {user.collection}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    {user.createdAt ? formatDate(user.createdAt) : "N/A"}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            ) : (
                                <div className="text-center py-12">
                                    <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                                    <p className="text-gray-500">No users found</p>
                                    <p className="text-sm text-gray-400 mt-1">
                                        {searchQuery || roleFilter !== "all"
                                            ? "Try adjusting your search or filter criteria"
                                            : "No users have been created yet"
                                        }
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}
            </div>
        </DashboardLayout>
    )
}