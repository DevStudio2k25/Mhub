"use client"

import { useEffect, useState } from "react"
import { collection, getDocs, doc, setDoc, deleteDoc, query, where } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/contexts/auth-context"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Users, Link, Unlink, Plus, Shield, UserCog, Trash2, Eye } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { formatDate } from "@/lib/utils"

interface Admin {
  uid: string
  name: string
  email: string
  adminId: string
}

interface Mentor {
  uid: string
  name: string
  email: string
  mentorId: string
}

interface LinkedAccount {
  id: string
  adminUID: string
  mentorUID: string
  adminName: string
  mentorName: string
  adminEmail: string
  mentorEmail: string
  linkedBy: string
  linkedOn: string
  targetRole: string
}

export default function ManageAdminMentors() {
  const { userData } = useAuth()
  const { toast } = useToast()
  const [admins, setAdmins] = useState<Admin[]>([])
  const [mentors, setMentors] = useState<Mentor[]>([])
  const [linkedAccounts, setLinkedAccounts] = useState<LinkedAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isLinking, setIsLinking] = useState(false)
  const [selectedAdmin, setSelectedAdmin] = useState("")
  const [selectedMentor, setSelectedMentor] = useState("")

  useEffect(() => {
    const fetchData = async () => {
      if (!userData || userData.role !== "super-admin") return

      try {
        setLoading(true)

        // Fetch admins
        const adminsSnapshot = await getDocs(collection(db, "admins"))
        const adminsData: Admin[] = []
        adminsSnapshot.forEach((doc) => {
          const data = doc.data()
          adminsData.push({
            uid: doc.id,
            name: data.name || data.firstName + " " + data.lastName,
            email: data.email,
            adminId: data.adminId || "N/A"
          })
        })
        setAdmins(adminsData)

        // Fetch mentors
        const mentorsSnapshot = await getDocs(collection(db, "mentors"))
        const mentorsData: Mentor[] = []
        mentorsSnapshot.forEach((doc) => {
          const data = doc.data()
          mentorsData.push({
            uid: doc.id,
            name: data.name,
            email: data.email,
            mentorId: data.mentorId || "N/A"
          })
        })
        setMentors(mentorsData)

        // Fetch linked accounts
        const linkedAccountsSnapshot = await getDocs(collection(db, "linkedAccounts"))
        const linkedAccountsData: LinkedAccount[] = []
        linkedAccountsSnapshot.forEach((doc) => {
          const data = doc.data()
          linkedAccountsData.push({
            id: doc.id,
            adminUID: data.adminUID,
            mentorUID: data.mentorUID,
            adminName: data.adminName,
            mentorName: data.mentorName,
            adminEmail: data.adminEmail,
            mentorEmail: data.mentorEmail,
            linkedBy: data.linkedBy,
            linkedOn: data.linkedOn,
            targetRole: data.targetRole || "mentor"
          })
        })
        setLinkedAccounts(linkedAccountsData)

      } catch (error) {
        console.error("Error fetching data:", error)
        toast({
          title: "Error",
          description: "Failed to load data. Please try again.",
          variant: "destructive"
        })
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [userData, toast])

  const handleLinkAccounts = async () => {
    if (!selectedAdmin || !selectedMentor) {
      toast({
        title: "Missing Information",
        description: "Please select both admin and mentor accounts.",
        variant: "destructive"
      })
      return
    }

    try {
      setIsLinking(true)

      // Get admin and mentor details
      const admin = admins.find(a => a.uid === selectedAdmin)
      const mentor = mentors.find(m => m.uid === selectedMentor)

      if (!admin || !mentor) {
        toast({
          title: "Error",
          description: "Selected accounts not found.",
          variant: "destructive"
        })
        return
      }

      // Check if already linked (check for any existing link between these accounts)
      const existingLink = linkedAccounts.find(
        link => link.adminUID === selectedAdmin && link.mentorUID === selectedMentor
      )

      if (existingLink) {
        toast({
          title: "Already Linked",
          description: "These accounts are already linked.",
          variant: "destructive"
        })
        return
      }

      // Create bidirectional linked account documents
      const timestamp = new Date().toISOString()
      
      // Link 1: Admin → Mentor (for admin to switch to mentor)
      const adminToMentorData = {
        adminUID: selectedAdmin,
        mentorUID: selectedMentor,
        adminName: admin.name,
        mentorName: mentor.name,
        adminEmail: admin.email,
        mentorEmail: mentor.email,
        linkedBy: userData?.uid || "unknown",
        linkedOn: timestamp,
        targetRole: "mentor"
      }

      // Link 2: Mentor → Admin (for mentor to switch to admin)
      const mentorToAdminData = {
        adminUID: selectedAdmin,
        mentorUID: selectedMentor,
        adminName: admin.name,
        mentorName: mentor.name,
        adminEmail: admin.email,
        mentorEmail: mentor.email,
        linkedBy: userData?.uid || "unknown",
        linkedOn: timestamp,
        targetRole: "admin"
      }

      // Add both links to Firestore
      const link1Ref = doc(collection(db, "linkedAccounts"))
      const link2Ref = doc(collection(db, "linkedAccounts"))
      
      await setDoc(link1Ref, adminToMentorData)
      await setDoc(link2Ref, mentorToAdminData)

      // Update local state with both links
      setLinkedAccounts(prev => [...prev, 
        { id: link1Ref.id, ...adminToMentorData },
        { id: link2Ref.id, ...mentorToAdminData }
      ])

      toast({
        title: "Success",
        description: "Accounts linked successfully!",
      })

      // Reset form
      setSelectedAdmin("")
      setSelectedMentor("")
      setIsDialogOpen(false)

    } catch (error) {
      console.error("Error linking accounts:", error)
      toast({
        title: "Error",
        description: "Failed to link accounts. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsLinking(false)
    }
  }

  const handleUnlinkAccounts = async (linkId: string) => {
    try {
      // Get the link to find the admin and mentor UIDs
      const linkToRemove = linkedAccounts.find(link => link.id === linkId)
      
      if (!linkToRemove) {
        toast({
          title: "Error",
          description: "Link not found.",
          variant: "destructive"
        })
        return
      }

      // Remove both bidirectional links from Firestore
      const linksToRemove = linkedAccounts.filter(link => 
        link.adminUID === linkToRemove.adminUID && 
        link.mentorUID === linkToRemove.mentorUID
      )

      for (const link of linksToRemove) {
        await deleteDoc(doc(db, "linkedAccounts", link.id))
      }

      // Update local state
      setLinkedAccounts(prev => prev.filter(link => 
        !(link.adminUID === linkToRemove.adminUID && link.mentorUID === linkToRemove.mentorUID)
      ))

      toast({
        title: "Success",
        description: "Accounts unlinked successfully!",
      })

    } catch (error) {
      console.error("Error unlinking accounts:", error)
      toast({
        title: "Error",
        description: "Failed to unlink accounts. Please try again.",
        variant: "destructive"
      })
    }
  }

  if (!userData || userData.role !== "super-admin") {
    return null
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto py-8 px-6">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Admin ↔ Mentor Account Linking</h1>
            <p className="text-muted-foreground">Link admin and mentor accounts for quick switching</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Link className="h-4 w-4 mr-2" />
                Link New Accounts
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Link Admin and Mentor Accounts</DialogTitle>
                <DialogDescription>
                  Create a link between admin and mentor accounts for quick role switching.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="admin">Select Admin Account</Label>
                  <Select value={selectedAdmin} onValueChange={setSelectedAdmin}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose admin account" />
                    </SelectTrigger>
                    <SelectContent>
                      {admins.map((admin) => (
                        <SelectItem key={admin.uid} value={admin.uid}>
                          {admin.name} ({admin.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="mentor">Select Mentor Account</Label>
                  <Select value={selectedMentor} onValueChange={setSelectedMentor}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose mentor account" />
                    </SelectTrigger>
                    <SelectContent>
                      {mentors.map((mentor) => (
                        <SelectItem key={mentor.uid} value={mentor.uid}>
                          {mentor.name} ({mentor.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <div className="text-sm text-muted-foreground bg-blue-50 p-3 rounded-lg">
                    <p className="font-medium text-blue-800 mb-1">Bidirectional Linking</p>
                    <p className="text-blue-700 text-xs">
                      This will create links in both directions, allowing both admin and mentor to switch roles.
                    </p>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleLinkAccounts} disabled={isLinking}>
                  {isLinking ? "Linking..." : "Link Accounts"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Admins</CardTitle>
                  <Shield className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{admins.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Mentors</CardTitle>
                  <UserCog className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{mentors.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Linked Accounts</CardTitle>
                  <Link className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{linkedAccounts.length}</div>
                </CardContent>
              </Card>
            </div>

            {/* Linked Accounts Table */}
            <Card>
              <CardHeader>
                <CardTitle>Linked Accounts</CardTitle>
              </CardHeader>
              <CardContent>
                {linkedAccounts.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Admin</TableHead>
                        <TableHead>Mentor</TableHead>
                        <TableHead>Target Role</TableHead>
                        <TableHead>Linked On</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {linkedAccounts.map((link) => (
                        <TableRow key={link.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{link.adminName}</div>
                              <div className="text-sm text-muted-foreground">{link.adminEmail}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{link.mentorName}</div>
                              <div className="text-sm text-muted-foreground">{link.mentorEmail}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              link.targetRole === "mentor" 
                                ? "bg-blue-100 text-blue-800" 
                                : "bg-green-100 text-green-800"
                            }`}>
                              {link.targetRole}
                            </span>
                          </TableCell>
                          <TableCell>
                            {formatDate(new Date(link.linkedOn).getTime())}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleUnlinkAccounts(link.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Unlink className="h-4 w-4 mr-1" />
                              Unlink
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8">
                    <Link className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No linked accounts found</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Link admin and mentor accounts to enable quick role switching
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}