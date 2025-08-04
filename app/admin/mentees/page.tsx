"use client"

import { useEffect, useState } from "react"
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where } from "firebase/firestore"
import { db, auth } from "@/lib/firebase"
import { useAuth } from "@/contexts/auth-context"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Trash2, Users, Edit, Eye, UserPlus, Download, Upload, FileText, Users2 } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createUserWithEmailAndPassword, signOut, signInWithEmailAndPassword } from "firebase/auth"
import { Textarea } from "@/components/ui/textarea"

interface ClassInfo {
  id: string
  name: string
  year: string
  section: string
  stream: string
}

interface MentorInfo {
  id: string
  name: string
  email: string
  mentorId: string
}

interface Mentee {
  uid: string
  firstName: string
  lastName: string
  middleName?: string
  email: string
  password: string
  role: string
  enrollmentNo: string
  registrationNo: string
  parentsName: string
  parentsContact: string
  classId: string
  className: string
  admissionBatch: string
  classRollNo: string
  dob: string
  section: string
  stream: string
  assignedMentorId?: string
  assignedMentorName?: string
  createdAt: any
}

export default function AdminMentees() {
  const { userData } = useAuth()
  const { toast } = useToast()
  const [mentees, setMentees] = useState<Mentee[]>([])
  const [classes, setClasses] = useState<ClassInfo[]>([])
  const [mentors, setMentors] = useState<MentorInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedMentee, setSelectedMentee] = useState<Mentee | null>(null)
  const [newMentee, setNewMentee] = useState({
    firstName: "",
    lastName: "",
    middleName: "",
    email: "",
    password: generateRandomPassword(),
    role: "mentee",
    enrollmentNo: "",
    registrationNo: "",
    parentsName: "",
    parentsContact: "",
    classId: "",
    className: "",
    admissionBatch: "",
    classRollNo: "",
    dob: "",
    section: "",
    stream: "",
    assignedMentorId: ""
  })
  const [error, setError] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [adminPassword, setAdminPassword] = useState("")
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false)
  const [bulkMentees, setBulkMentees] = useState("")
  const [isBulkCreating, setIsBulkCreating] = useState(false)
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [isImporting, setIsImporting] = useState(false)

  // Function to generate a secure random password
  function generateRandomPassword() {
    const lowercase = Math.random().toString(36).slice(-6)
    const uppercase = Math.random().toString(36).toUpperCase().slice(-2)
    const numbers = Math.floor(Math.random() * 90 + 10)
    const special = "!@#$%^&*"[Math.floor(Math.random() * 8)]
    
    const combined = lowercase + uppercase + numbers + special
    return combined.split('').sort(() => 0.5 - Math.random()).join('')
  }

  useEffect(() => {
    const fetchData = async () => {
      if (!userData) return

      try {
        // Fetch mentees
        const menteesRef = collection(db, "mentees")
        const menteesSnapshot = await getDocs(menteesRef)
        const menteesData: Mentee[] = []
        menteesSnapshot.forEach((doc) => {
          const data = doc.data()
          menteesData.push({
            uid: doc.id,
            firstName: data.firstName || "",
            lastName: data.lastName || "",
            middleName: data.middleName || "",
            email: data.email || "",
            password: data.password || "",
            role: data.role || "mentee",
            enrollmentNo: data.enrollmentNo || "",
            registrationNo: data.registrationNo || "",
            parentsName: data.parentsName || "",
            parentsContact: data.parentsContact || "",
            classId: data.classId || "",
            className: data.className || "",
            admissionBatch: data.admissionBatch || "",
            classRollNo: data.classRollNo || "",
            dob: data.dob || "",
            section: data.section || "",
            stream: data.stream || "",
            assignedMentorId: data.assignedMentorId || "",
            assignedMentorName: data.assignedMentorName || "",
            createdAt: data.createdAt
          })
        })
        setMentees(menteesData)

        // Fetch classes
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
            stream: data.stream || ""
          })
        })
        setClasses(classesData)

        // Fetch mentors
        const mentorsRef = collection(db, "mentors")
        const mentorsSnapshot = await getDocs(mentorsRef)
        const mentorsData: MentorInfo[] = []
        mentorsSnapshot.forEach((doc) => {
          const data = doc.data()
          mentorsData.push({
            id: doc.id,
            name: data.name || "",
            email: data.email || "",
            mentorId: data.mentorId || ""
          })
        })
        setMentors(mentorsData)

      } catch (error) {
        console.error("Error fetching data:", error)
        toast({
          title: "Error",
          description: "Failed to load data",
          variant: "destructive"
        })
      } finally {
        setLoading(false)
      }
    }

    if (userData && userData.role === "admin") {
      fetchData()
    }
  }, [userData, toast])

  const handleCreateMentee = async () => {
    if (!newMentee.firstName || !newMentee.lastName || !newMentee.email || !newMentee.password ||
        !newMentee.enrollmentNo || !newMentee.registrationNo || !newMentee.parentsName || 
        !newMentee.parentsContact || !newMentee.classId || !newMentee.admissionBatch || 
        !newMentee.classRollNo || !newMentee.dob || !newMentee.section || !newMentee.stream) {
      setError("Please fill all required fields")
      return
    }

    if (!adminPassword) {
      setError("Please enter your admin password to confirm")
      return
    }

    setError("")
    setIsCreating(true)

    try {
      // Store current admin credentials
      const adminEmail = auth.currentUser?.email
      const adminUid = auth.currentUser?.uid

      // Validate admin password
      if (adminEmail) {
        await signInWithEmailAndPassword(auth, adminEmail, adminPassword)
      }

      // Create mentee account in Firebase Auth
      const menteeCredential = await createUserWithEmailAndPassword(auth, newMentee.email, newMentee.password)
      const menteeUser = menteeCredential.user

      // Get class details
      const selectedClass = classes.find(cls => cls.id === newMentee.classId)
      const fullName = newMentee.middleName 
        ? `${newMentee.firstName} ${newMentee.middleName} ${newMentee.lastName}`
        : `${newMentee.firstName} ${newMentee.lastName}`

      // Create mentee document in Firestore
      const menteeData = {
        uid: menteeUser.uid,
        firstName: newMentee.firstName,
        lastName: newMentee.lastName,
        middleName: newMentee.middleName || "",
        name: fullName,
        email: menteeUser.email,
        password: newMentee.password, // Store for export
        role: "mentee",
        enrollmentNo: newMentee.enrollmentNo,
        registrationNo: newMentee.registrationNo,
        parentsName: newMentee.parentsName,
        parentsContact: newMentee.parentsContact,
        classId: newMentee.classId,
        className: selectedClass?.name || "",
        admissionBatch: newMentee.admissionBatch,
        classRollNo: newMentee.classRollNo,
        dob: newMentee.dob,
        section: newMentee.section,
        stream: newMentee.stream,
        assignedMentorId: newMentee.assignedMentorId || "",
        assignedMentorName: mentors.find(m => m.id === newMentee.assignedMentorId)?.name || "",
        createdBy: adminUid,
        createdAt: new Date(),
      }

      await addDoc(collection(db, "mentees"), menteeData)

      // Sign out mentee and sign back in as admin
      await signOut(auth)
      if (adminEmail) {
        await signInWithEmailAndPassword(auth, adminEmail, adminPassword)
      }

      // Add to local state
      setMentees(prev => [{
        uid: menteeUser.uid,
        firstName: newMentee.firstName,
        lastName: newMentee.lastName,
        middleName: newMentee.middleName || "",
        email: menteeUser.email || "",
        password: newMentee.password,
        role: "mentee",
        enrollmentNo: newMentee.enrollmentNo,
        registrationNo: newMentee.registrationNo,
        parentsName: newMentee.parentsName,
        parentsContact: newMentee.parentsContact,
        classId: newMentee.classId,
        className: selectedClass?.name || "",
        admissionBatch: newMentee.admissionBatch,
        classRollNo: newMentee.classRollNo,
        dob: newMentee.dob,
        section: newMentee.section,
        stream: newMentee.stream,
        assignedMentorId: newMentee.assignedMentorId || "",
        assignedMentorName: mentors.find(m => m.id === newMentee.assignedMentorId)?.name || "",
        createdAt: new Date()
      }, ...prev])

      // Reset form
      setNewMentee({
        firstName: "",
        lastName: "",
        middleName: "",
        email: "",
        password: generateRandomPassword(),
        role: "mentee",
        enrollmentNo: "",
        registrationNo: "",
        parentsName: "",
        parentsContact: "",
        classId: "",
        className: "",
        admissionBatch: "",
        classRollNo: "",
        dob: "",
        section: "",
        stream: "",
        assignedMentorId: ""
      })
      setAdminPassword("")
      setIsDialogOpen(false)

      toast({
        title: "Success",
        description: "Mentee created successfully!",
      })
    } catch (error: any) {
      console.error("Error creating mentee:", error)
      setError(error.message || "Failed to create mentee")
      toast({
        title: "Error",
        description: "Failed to create mentee",
        variant: "destructive"
      })
    } finally {
      setIsCreating(false)
    }
  }

  const handleUpdateMentee = async () => {
    if (!selectedMentee) return

    setError("")
    setIsCreating(true)

    try {
      const menteeRef = doc(db, "mentees", selectedMentee.uid)
      await updateDoc(menteeRef, {
        firstName: newMentee.firstName,
        lastName: newMentee.lastName,
        middleName: newMentee.middleName || "",
        name: newMentee.middleName 
          ? `${newMentee.firstName} ${newMentee.middleName} ${newMentee.lastName}`
          : `${newMentee.firstName} ${newMentee.lastName}`,
        enrollmentNo: newMentee.enrollmentNo,
        registrationNo: newMentee.registrationNo,
        parentsName: newMentee.parentsName,
        parentsContact: newMentee.parentsContact,
        classId: newMentee.classId,
        className: classes.find(cls => cls.id === newMentee.classId)?.name || "",
        admissionBatch: newMentee.admissionBatch,
        classRollNo: newMentee.classRollNo,
        dob: newMentee.dob,
        section: newMentee.section,
        stream: newMentee.stream,
        assignedMentorId: newMentee.assignedMentorId || "",
        assignedMentorName: mentors.find(m => m.id === newMentee.assignedMentorId)?.name || "",
      })

      // Update local state
      setMentees(prev => prev.map(mentee => 
        mentee.uid === selectedMentee.uid 
          ? { ...mentee, ...newMentee }
          : mentee
      ))

      setIsEditDialogOpen(false)
      setSelectedMentee(null)

      toast({
        title: "Success",
        description: "Mentee updated successfully!",
      })
    } catch (error: any) {
      console.error("Error updating mentee:", error)
      setError(error.message || "Failed to update mentee")
      toast({
        title: "Error",
        description: "Failed to update mentee",
        variant: "destructive"
      })
    } finally {
      setIsCreating(false)
    }
  }

  const handleEditMentee = (mentee: Mentee) => {
    setSelectedMentee(mentee)
    setNewMentee({
      firstName: mentee.firstName,
      lastName: mentee.lastName,
      middleName: mentee.middleName || "",
      email: mentee.email,
      password: mentee.password,
      role: mentee.role,
      enrollmentNo: mentee.enrollmentNo,
      registrationNo: mentee.registrationNo,
      parentsName: mentee.parentsName,
      parentsContact: mentee.parentsContact,
      classId: mentee.classId,
      className: mentee.className,
      admissionBatch: mentee.admissionBatch,
      classRollNo: mentee.classRollNo,
      dob: mentee.dob,
      section: mentee.section,
      stream: mentee.stream,
      assignedMentorId: mentee.assignedMentorId || ""
    })
    setIsEditDialogOpen(true)
  }

  const handleBulkCreateMentees = async () => {
    if (!bulkMentees.trim()) {
      setError("Please enter mentee data")
      return
    }

    if (!adminPassword) {
      setError("Please enter your admin password to confirm")
      return
    }

    setError("")
    setIsBulkCreating(true)

    try {
      // Store current admin credentials
      const adminEmail = auth.currentUser?.email
      const adminUid = auth.currentUser?.uid

      // Validate admin password
      if (adminEmail) {
        await signInWithEmailAndPassword(auth, adminEmail, adminPassword)
      }

      const lines = bulkMentees.trim().split('\n')
      const createdMentees: any[] = []

      for (const line of lines) {
        if (!line.trim()) continue

        const fields = line.split(',').map(field => field.trim())
        
        if (fields.length < 15) {
          throw new Error(`Invalid data format. Expected 15+ fields, got ${fields.length}`)
        }

        const [
          firstName, lastName, middleName, email, enrollmentNo, registrationNo,
          parentsName, parentsContact, className, admissionBatch, classRollNo,
          dob, section, stream, assignedMentorName
        ] = fields

        // Find class by name
        const selectedClass = classes.find(cls => cls.name === className)
        if (!selectedClass) {
          throw new Error(`Class not found: ${className}`)
        }

        // Find mentor by name
        const selectedMentor = mentors.find(m => m.name === assignedMentorName)
        const mentorId = selectedMentor?.id || ""

        // Generate password
        const password = generateRandomPassword()

        // Create mentee account in Firebase Auth
        const menteeCredential = await createUserWithEmailAndPassword(auth, email, password)
        const menteeUser = menteeCredential.user

        const fullName = middleName 
          ? `${firstName} ${middleName} ${lastName}`
          : `${firstName} ${lastName}`

        // Create mentee document in Firestore
        const menteeData = {
          uid: menteeUser.uid,
          firstName,
          lastName,
          middleName: middleName || "",
          name: fullName,
          email: menteeUser.email,
          password,
          role: "mentee",
          enrollmentNo,
          registrationNo,
          parentsName,
          parentsContact,
          classId: selectedClass.id,
          className: selectedClass.name,
          admissionBatch,
          classRollNo,
          dob,
          section,
          stream,
          assignedMentorId: mentorId,
          assignedMentorName: selectedMentor?.name || "",
          createdBy: adminUid,
          createdAt: new Date(),
        }

        await addDoc(collection(db, "mentees"), menteeData)
        createdMentees.push({ ...menteeData, uid: menteeUser.uid })
      }

      // Sign out mentee and sign back in as admin
      await signOut(auth)
      if (adminEmail) {
        await signInWithEmailAndPassword(auth, adminEmail, adminPassword)
      }

      // Add to local state
      setMentees(prev => [...createdMentees, ...prev])

      // Reset form
      setBulkMentees("")
      setAdminPassword("")
      setIsBulkDialogOpen(false)

      toast({
        title: "Success",
        description: `${createdMentees.length} mentees created successfully!`,
      })
    } catch (error: any) {
      console.error("Error creating mentees:", error)
      setError(error.message || "Failed to create mentees")
      toast({
        title: "Error",
        description: "Failed to create mentees",
        variant: "destructive"
      })
    } finally {
      setIsBulkCreating(false)
    }
  }

  const handleCsvImport = async () => {
    if (!csvFile) {
      setError("Please select a CSV file")
      return
    }

    if (!adminPassword) {
      setError("Please enter your admin password to confirm")
      return
    }

    setError("")
    setIsImporting(true)

    try {
      const text = await csvFile.text()
      const lines = text.split('\n')
      const headers = lines[0].split(',').map(h => h.trim())
      
      // Validate headers
      const requiredHeaders = [
        'firstName', 'lastName', 'middleName', 'email', 'enrollmentNo', 
        'registrationNo', 'parentsName', 'parentsContact', 'className', 
        'admissionBatch', 'classRollNo', 'dob', 'section', 'stream', 'assignedMentorName'
      ]

      for (const header of requiredHeaders) {
        if (!headers.includes(header)) {
          throw new Error(`Missing required header: ${header}`)
        }
      }

      // Store current admin credentials
      const adminEmail = auth.currentUser?.email
      const adminUid = auth.currentUser?.uid

      // Validate admin password
      if (adminEmail) {
        await signInWithEmailAndPassword(auth, adminEmail, adminPassword)
      }

      const createdMentees: any[] = []

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim()
        if (!line) continue

        const values = line.split(',').map(v => v.trim())
        const menteeData: any = {}
        
        headers.forEach((header, index) => {
          menteeData[header] = values[index] || ""
        })

        const {
          firstName, lastName, middleName, email, enrollmentNo, registrationNo,
          parentsName, parentsContact, className, admissionBatch, classRollNo,
          dob, section, stream, assignedMentorName
        } = menteeData

        // Find class by name
        const selectedClass = classes.find(cls => cls.name === className)
        if (!selectedClass) {
          throw new Error(`Class not found: ${className}`)
        }

        // Find mentor by name
        const selectedMentor = mentors.find(m => m.name === assignedMentorName)
        const mentorId = selectedMentor?.id || ""

        // Generate password
        const password = generateRandomPassword()

        // Create mentee account in Firebase Auth
        const menteeCredential = await createUserWithEmailAndPassword(auth, email, password)
        const menteeUser = menteeCredential.user

        const fullName = middleName 
          ? `${firstName} ${middleName} ${lastName}`
          : `${firstName} ${lastName}`

        // Create mentee document in Firestore
        const firestoreData = {
          uid: menteeUser.uid,
          firstName,
          lastName,
          middleName: middleName || "",
          name: fullName,
          email: menteeUser.email,
          password,
          role: "mentee",
          enrollmentNo,
          registrationNo,
          parentsName,
          parentsContact,
          classId: selectedClass.id,
          className: selectedClass.name,
          admissionBatch,
          classRollNo,
          dob,
          section,
          stream,
          assignedMentorId: mentorId,
          assignedMentorName: selectedMentor?.name || "",
          createdBy: adminUid,
          createdAt: new Date(),
        }

        await addDoc(collection(db, "mentees"), firestoreData)
        createdMentees.push({ ...firestoreData, uid: menteeUser.uid })
      }

      // Sign out mentee and sign back in as admin
      await signOut(auth)
      if (adminEmail) {
        await signInWithEmailAndPassword(auth, adminEmail, adminPassword)
      }

      // Add to local state
      setMentees(prev => [...createdMentees, ...prev])

      // Reset form
      setCsvFile(null)
      setAdminPassword("")
      setIsBulkDialogOpen(false)

      toast({
        title: "Success",
        description: `${createdMentees.length} mentees imported successfully!`,
      })
    } catch (error: any) {
      console.error("Error importing mentees:", error)
      setError(error.message || "Failed to import mentees")
      toast({
        title: "Error",
        description: "Failed to import mentees",
        variant: "destructive"
      })
    } finally {
      setIsImporting(false)
    }
  }

  const downloadCsvTemplate = () => {
    const headers = [
      'firstName', 'lastName', 'middleName', 'email', 'enrollmentNo', 
      'registrationNo', 'parentsName', 'parentsContact', 'className', 
      'admissionBatch', 'classRollNo', 'dob', 'section', 'stream', 'assignedMentorName'
    ]
    
    const sampleData = [
      'John', 'Doe', 'M', 'john.doe@example.com', 'EN2024001', 'REG2024001',
      'John Doe Sr', '+91-9876543210', 'Computer Science', '2024', '1',
      '2000-01-01', 'A', 'B.Tech Computer Science', 'Dr. Smith'
    ]

    const csvContent = [headers.join(','), sampleData.join(',')].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'mentee_template.csv'
    a.click()
    window.URL.revokeObjectURL(url)
  }

  if (!userData || userData.role !== "admin") {
    return null
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto py-8 px-6">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Mentee Management</h1>
            <p className="text-muted-foreground">Create and manage mentee accounts</p>
          </div>
          <div className="flex gap-2">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Create New Mentee
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create New Mentee</DialogTitle>
                  <DialogDescription>
                    Add a new mentee with complete details.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="firstName">First Name *</Label>
                      <Input
                        id="firstName"
                        value={newMentee.firstName}
                        onChange={(e) => setNewMentee(prev => ({ ...prev, firstName: e.target.value }))}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="middleName">Middle Name</Label>
                      <Input
                        id="middleName"
                        value={newMentee.middleName}
                        onChange={(e) => setNewMentee(prev => ({ ...prev, middleName: e.target.value }))}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="lastName">Last Name *</Label>
                      <Input
                        id="lastName"
                        value={newMentee.lastName}
                        onChange={(e) => setNewMentee(prev => ({ ...prev, lastName: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={newMentee.email}
                        onChange={(e) => setNewMentee(prev => ({ ...prev, email: e.target.value }))}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="password">Password *</Label>
                      <Input
                        id="password"
                        type="password"
                        value={newMentee.password}
                        onChange={(e) => setNewMentee(prev => ({ ...prev, password: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="enrollmentNo">Enrollment No *</Label>
                      <Input
                        id="enrollmentNo"
                        value={newMentee.enrollmentNo}
                        onChange={(e) => setNewMentee(prev => ({ ...prev, enrollmentNo: e.target.value }))}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="registrationNo">Registration No *</Label>
                      <Input
                        id="registrationNo"
                        value={newMentee.registrationNo}
                        onChange={(e) => setNewMentee(prev => ({ ...prev, registrationNo: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="parentsName">Parents Name *</Label>
                      <Input
                        id="parentsName"
                        value={newMentee.parentsName}
                        onChange={(e) => setNewMentee(prev => ({ ...prev, parentsName: e.target.value }))}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="parentsContact">Parents Contact *</Label>
                      <Input
                        id="parentsContact"
                        value={newMentee.parentsContact}
                        onChange={(e) => setNewMentee(prev => ({ ...prev, parentsContact: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="classId">Class *</Label>
                      <Select value={newMentee.classId} onValueChange={(value) => setNewMentee(prev => ({ ...prev, classId: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select class" />
                        </SelectTrigger>
                        <SelectContent>
                          {classes.map((cls) => (
                            <SelectItem key={cls.id} value={cls.id}>
                              {cls.name} - {cls.stream} ({cls.year})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="assignedMentorId">Assign to Mentor</Label>
                      <Select value={newMentee.assignedMentorId} onValueChange={(value) => setNewMentee(prev => ({ ...prev, assignedMentorId: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select mentor (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          {mentors.map((mentor) => (
                            <SelectItem key={mentor.id} value={mentor.id}>
                              {mentor.name} ({mentor.mentorId})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="admissionBatch">Admission Batch *</Label>
                      <Input
                        id="admissionBatch"
                        value={newMentee.admissionBatch}
                        onChange={(e) => setNewMentee(prev => ({ ...prev, admissionBatch: e.target.value }))}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="classRollNo">Class Roll No *</Label>
                      <Input
                        id="classRollNo"
                        value={newMentee.classRollNo}
                        onChange={(e) => setNewMentee(prev => ({ ...prev, classRollNo: e.target.value }))}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="dob">Date of Birth *</Label>
                      <Input
                        id="dob"
                        type="date"
                        value={newMentee.dob}
                        onChange={(e) => setNewMentee(prev => ({ ...prev, dob: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="section">Section *</Label>
                      <Input
                        id="section"
                        value={newMentee.section}
                        onChange={(e) => setNewMentee(prev => ({ ...prev, section: e.target.value }))}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="stream">Stream *</Label>
                      <Input
                        id="stream"
                        value={newMentee.stream}
                        onChange={(e) => setNewMentee(prev => ({ ...prev, stream: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="adminPassword">Admin Password *</Label>
                    <Input
                      id="adminPassword"
                      type="password"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      placeholder="Enter your admin password to confirm"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateMentee} disabled={isCreating}>
                    {isCreating ? "Creating..." : "Create Mentee"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            
            <Dialog open={isBulkDialogOpen} onOpenChange={setIsBulkDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="bg-green-600 hover:bg-green-700 text-white">
                  <Users2 className="h-4 w-4 mr-2" />
                  Bulk Create
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Bulk Create Mentees</DialogTitle>
                  <DialogDescription>
                    Create multiple mentees at once. You can either paste CSV data or upload a CSV file.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label>CSV Data (One mentee per line, comma-separated)</Label>
                    <Textarea
                      value={bulkMentees}
                      onChange={(e) => setBulkMentees(e.target.value)}
                      placeholder="firstName,lastName,middleName,email,enrollmentNo,registrationNo,parentsName,parentsContact,className,admissionBatch,classRollNo,dob,section,stream,assignedMentorName"
                      rows={10}
                    />
                    <p className="text-sm text-muted-foreground">
                      Format: firstName,lastName,middleName,email,enrollmentNo,registrationNo,parentsName,parentsContact,className,admissionBatch,classRollNo,dob,section,stream,assignedMentorName
                    </p>
                  </div>

                  <div className="grid gap-2">
                    <Label>Or Upload CSV File</Label>
                    <Input
                      type="file"
                      accept=".csv"
                      onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="bulk-adminPassword">Admin Password *</Label>
                    <Input
                      id="bulk-adminPassword"
                      type="password"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      placeholder="Enter your admin password to confirm"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" onClick={downloadCsvTemplate}>
                      <Download className="h-4 w-4 mr-2" />
                      Download Template
                    </Button>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsBulkDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={csvFile ? handleCsvImport : handleBulkCreateMentees} 
                    disabled={isBulkCreating || isImporting}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {isBulkCreating || isImporting ? "Creating..." : "Create Mentees"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {mentees.map((mentee) => (
              <Card key={mentee.uid} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{mentee.firstName} {mentee.lastName}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {mentee.email} • {mentee.enrollmentNo}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditMentee(mentee)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Class:</span>
                      <span>{mentee.className}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Stream:</span>
                      <span>{mentee.stream}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Mentor:</span>
                      <span>{mentee.assignedMentorName || "Not assigned"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Roll No:</span>
                      <span>{mentee.classRollNo}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Mentee</DialogTitle>
              <DialogDescription>
                Update mentee information.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-firstName">First Name *</Label>
                  <Input
                    id="edit-firstName"
                    value={newMentee.firstName}
                    onChange={(e) => setNewMentee(prev => ({ ...prev, firstName: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-middleName">Middle Name</Label>
                  <Input
                    id="edit-middleName"
                    value={newMentee.middleName}
                    onChange={(e) => setNewMentee(prev => ({ ...prev, middleName: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-lastName">Last Name *</Label>
                  <Input
                    id="edit-lastName"
                    value={newMentee.lastName}
                    onChange={(e) => setNewMentee(prev => ({ ...prev, lastName: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-enrollmentNo">Enrollment No *</Label>
                  <Input
                    id="edit-enrollmentNo"
                    value={newMentee.enrollmentNo}
                    onChange={(e) => setNewMentee(prev => ({ ...prev, enrollmentNo: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-registrationNo">Registration No *</Label>
                  <Input
                    id="edit-registrationNo"
                    value={newMentee.registrationNo}
                    onChange={(e) => setNewMentee(prev => ({ ...prev, registrationNo: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-parentsName">Parents Name *</Label>
                  <Input
                    id="edit-parentsName"
                    value={newMentee.parentsName}
                    onChange={(e) => setNewMentee(prev => ({ ...prev, parentsName: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-parentsContact">Parents Contact *</Label>
                  <Input
                    id="edit-parentsContact"
                    value={newMentee.parentsContact}
                    onChange={(e) => setNewMentee(prev => ({ ...prev, parentsContact: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-classId">Class *</Label>
                  <Select value={newMentee.classId} onValueChange={(value) => setNewMentee(prev => ({ ...prev, classId: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select class" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map((cls) => (
                        <SelectItem key={cls.id} value={cls.id}>
                          {cls.name} - {cls.stream} ({cls.year})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-assignedMentorId">Assign to Mentor</Label>
                  <Select value={newMentee.assignedMentorId} onValueChange={(value) => setNewMentee(prev => ({ ...prev, assignedMentorId: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select mentor (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {mentors.map((mentor) => (
                        <SelectItem key={mentor.id} value={mentor.id}>
                          {mentor.name} ({mentor.mentorId})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-admissionBatch">Admission Batch *</Label>
                  <Input
                    id="edit-admissionBatch"
                    value={newMentee.admissionBatch}
                    onChange={(e) => setNewMentee(prev => ({ ...prev, admissionBatch: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-classRollNo">Class Roll No *</Label>
                  <Input
                    id="edit-classRollNo"
                    value={newMentee.classRollNo}
                    onChange={(e) => setNewMentee(prev => ({ ...prev, classRollNo: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-dob">Date of Birth *</Label>
                  <Input
                    id="edit-dob"
                    type="date"
                    value={newMentee.dob}
                    onChange={(e) => setNewMentee(prev => ({ ...prev, dob: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-section">Section *</Label>
                  <Input
                    id="edit-section"
                    value={newMentee.section}
                    onChange={(e) => setNewMentee(prev => ({ ...prev, section: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-stream">Stream *</Label>
                  <Input
                    id="edit-stream"
                    value={newMentee.stream}
                    onChange={(e) => setNewMentee(prev => ({ ...prev, stream: e.target.value }))}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateMentee} disabled={isCreating}>
                {isCreating ? "Updating..." : "Update Mentee"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
} 