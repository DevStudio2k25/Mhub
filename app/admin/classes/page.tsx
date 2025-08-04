"use client"

import { useEffect, useState } from "react"
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/contexts/auth-context"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Trash2, Users, PenSquare, Edit, Eye } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface ClassInfo {
  id: string
  name: string
  year: string
  section: string
  stream: string
  adminId: string
  createdAt: any
  studentCount?: number
}

export default function AdminClasses() {
  const { userData } = useAuth()
  const { toast } = useToast()
  const [classes, setClasses] = useState<ClassInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedClass, setSelectedClass] = useState<ClassInfo | null>(null)
  const [newClass, setNewClass] = useState({
    name: "",
    year: "",
    section: "",
    stream: ""
  })
  const [error, setError] = useState("")
  const [isCreating, setIsCreating] = useState(false)

  const streams = [
    "B.Tech Computer Science",
    "B.Tech Information Technology", 
    "B.Tech Electronics & Communication",
    "B.Tech Mechanical Engineering",
    "B.Tech Civil Engineering",
    "B.Tech Electrical Engineering",
    "B.Tech Biotechnology",
    "B.Tech Chemical Engineering",
    "BCA",
    "BBA",
    "B.Com",
    "B.Sc",
    "MCA",
    "MBA",
    "M.Tech Computer Science",
    "M.Tech Information Technology"
  ]

  useEffect(() => {
    const fetchClasses = async () => {
      if (!userData) return

      try {
        // Fetch classes from Firestore
        const classesRef = collection(db, "classes")
        const classesSnapshot = await getDocs(classesRef)

        const classesData: ClassInfo[] = []
        classesSnapshot.forEach((doc) => {
          const data = doc.data()
          classesData.push({
            id: doc.id,
            name: data.name || "",
            year: data.year || "",
            section: data.section || "",
            stream: data.stream || "",
            adminId: data.adminId || "",
            createdAt: data.createdAt,
            studentCount: data.studentCount || 0
          })
        })

        // Sort classes by creation date (newest first)
        classesData.sort((a, b) => b.createdAt?.toDate?.() - a.createdAt?.toDate?.())
        setClasses(classesData)
      } catch (error) {
        console.error("Error fetching classes:", error)
        toast({
          title: "Error",
          description: "Failed to load classes",
          variant: "destructive"
        })
      } finally {
        setLoading(false)
      }
    }

    if (userData && userData.role === "admin") {
      fetchClasses()
    }
  }, [userData, toast])

  const handleCreateClass = async () => {
    if (!newClass.name || !newClass.year || !newClass.section || !newClass.stream) {
      setError("Please fill all required fields")
      return
    }

    setError("")
    setIsCreating(true)

    try {
      // Create a new class in Firestore
      const classData = {
        name: newClass.name,
        year: newClass.year,
        section: newClass.section,
        stream: newClass.stream,
        adminId: userData?.uid || "",
        createdAt: new Date(),
        studentCount: 0
      }

      const docRef = await addDoc(collection(db, "classes"), classData)
      
      // Add the new class to local state
      setClasses(prev => [{
        id: docRef.id,
        ...classData
      }, ...prev])

      // Reset form
      setNewClass({
        name: "",
        year: "",
        section: "",
        stream: ""
      })
      setIsDialogOpen(false)

      toast({
        title: "Success",
        description: "Class created successfully!",
      })
    } catch (error) {
      console.error("Error creating class:", error)
      setError("Failed to create class")
      toast({
        title: "Error",
        description: "Failed to create class",
        variant: "destructive"
      })
    } finally {
      setIsCreating(false)
    }
  }

  const handleUpdateClass = async () => {
    if (!selectedClass || !newClass.name || !newClass.year || !newClass.section || !newClass.stream) {
      setError("Please fill all required fields")
      return
    }

    setError("")
    setIsCreating(true)

    try {
      // Update class in Firestore
      const classRef = doc(db, "classes", selectedClass.id)
      await updateDoc(classRef, {
        name: newClass.name,
        year: newClass.year,
        section: newClass.section,
        stream: newClass.stream
      })

      // Update local state
      setClasses(prev => prev.map(cls => 
        cls.id === selectedClass.id 
          ? { ...cls, ...newClass }
          : cls
      ))

      setIsEditDialogOpen(false)
      setSelectedClass(null)

      toast({
        title: "Success",
        description: "Class updated successfully!",
      })
    } catch (error) {
      console.error("Error updating class:", error)
      setError("Failed to update class")
      toast({
        title: "Error",
        description: "Failed to update class",
        variant: "destructive"
      })
    } finally {
      setIsCreating(false)
    }
  }

  const handleDeleteClass = async (classId: string) => {
    if (!confirm("Are you sure you want to delete this class? This action cannot be undone.")) {
      return
    }

    try {
      await deleteDoc(doc(db, "classes", classId))
      
      // Remove from local state
      setClasses(prev => prev.filter(cls => cls.id !== classId))

      toast({
        title: "Success",
        description: "Class deleted successfully!",
      })
    } catch (error) {
      console.error("Error deleting class:", error)
      toast({
        title: "Error",
        description: "Failed to delete class",
        variant: "destructive"
      })
    }
  }

  const handleEditClass = (classInfo: ClassInfo) => {
    setSelectedClass(classInfo)
    setNewClass({
      name: classInfo.name,
      year: classInfo.year,
      section: classInfo.section,
      stream: classInfo.stream || ""
    })
    setIsEditDialogOpen(true)
  }

  if (!userData || userData.role !== "admin") {
    return null
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto py-8 px-6">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Class Management</h1>
            <p className="text-muted-foreground">Create and manage classes/departments</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                Create New Class
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Create New Class</DialogTitle>
                <DialogDescription>
                  Add a new class or department to the system.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Class Name</Label>
                  <Input
                    id="name"
                    value={newClass.name}
                    onChange={(e) => setNewClass(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Computer Science"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="year">Admission Year</Label>
                  <Input
                    id="year"
                    value={newClass.year}
                    onChange={(e) => setNewClass(prev => ({ ...prev, year: e.target.value }))}
                    placeholder="e.g., 2024"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="section">Section</Label>
                  <Input
                    id="section"
                    value={newClass.section}
                    onChange={(e) => setNewClass(prev => ({ ...prev, section: e.target.value }))}
                    placeholder="e.g., A, B, C"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="stream">Stream</Label>
                  <Select value={newClass.stream} onValueChange={(value) => setNewClass(prev => ({ ...prev, stream: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select stream" />
                    </SelectTrigger>
                    <SelectContent>
                      {streams.map((stream) => (
                        <SelectItem key={stream} value={stream}>
                          {stream}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateClass} disabled={isCreating}>
                  {isCreating ? "Creating..." : "Create Class"}
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
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {classes.map((classInfo) => (
              <Card key={classInfo.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{classInfo.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {classInfo.stream} • Year {classInfo.year} • Section {classInfo.section}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditClass(classInfo)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteClass(classInfo.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>{classInfo.studentCount || 0} students</span>
                    </div>
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4 mr-2" />
                      View Students
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Edit Class</DialogTitle>
              <DialogDescription>
                Update class information.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-name">Class Name</Label>
                <Input
                  id="edit-name"
                  value={newClass.name}
                  onChange={(e) => setNewClass(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-year">Admission Year</Label>
                <Input
                  id="edit-year"
                  value={newClass.year}
                  onChange={(e) => setNewClass(prev => ({ ...prev, year: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-section">Section</Label>
                <Input
                  id="edit-section"
                  value={newClass.section}
                  onChange={(e) => setNewClass(prev => ({ ...prev, section: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-stream">Stream</Label>
                <Select value={newClass.stream} onValueChange={(value) => setNewClass(prev => ({ ...prev, stream: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select stream" />
                  </SelectTrigger>
                  <SelectContent>
                    {streams.map((stream) => (
                      <SelectItem key={stream} value={stream}>
                        {stream}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateClass} disabled={isCreating}>
                {isCreating ? "Updating..." : "Update Class"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
} 