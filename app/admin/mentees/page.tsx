"use client"

import { useEffect, useState } from "react"
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore"
import { db, auth } from "@/lib/firebase"
import { useAuth } from "@/contexts/auth-context"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Trash2, Users, Edit, Eye, UserPlus, Download, Upload, FileText, Users2, Check, X, AlertCircle } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createUserWithEmailAndPassword, signOut, signInWithEmailAndPassword } from "firebase/auth"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

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

interface CsvMenteeData {
  firstName: string
  lastName: string
  middleName: string
  email: string
  enrollmentNo: string
  registrationNo: string
  parentsName: string
  parentsContact: string
  className: string
  admissionBatch: string
  classRollNo: string
  dob: string
  section: string
  stream: string
  assignedMentorName: string
  classId?: string
  assignedMentorId?: string
  password?: string
  isValid?: boolean
  errors?: string[]
}

export default function AdminMentees() {
  const { userData } = useAuth()
  const { toast } = useToast()
  const [mentees, setMentees] = useState<Mentee[]>([])
  const [classes, setClasses] = useState<ClassInfo[]>([])
  const [mentors, setMentors] = useState<MentorInfo[]>([])
  const [loading, setLoading] = useState(true)
  
  // Single mentee creation
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
  
  // Bulk creation states
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false)
  const [bulkMode, setBulkMode] = useState<'single' | 'multiple'>('single')
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [csvData, setCsvData] = useState<CsvMenteeData[]>([])
  const [showPreview, setShowPreview] = useState(false)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  
  // Creation process states
  const [error, setError] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [adminPassword, setAdminPassword] = useState("")
  const [creationProgress, setCreationProgress] = useState<{ current: number, total: number }>({ current: 0, total: 0 })
  const [showProgressDialog, setShowProgressDialog] = useState(false)
  const [currentStep, setCurrentStep] = useState("")

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

  // Handle CSV file upload and parsing
  const handleCsvUpload = async (file: File) => {
    try {
      const text = await file.text()
      const lines = text.split('\n').filter(line => line.trim())
      
      if (lines.length === 0) {
        throw new Error("CSV file is empty")
      }

      const headers = lines[0].split(',').map(h => h.trim())
      
      // Validate headers
      const requiredHeaders = [
        'firstName', 'lastName', 'middleName', 'email', 'enrollmentNo', 
        'registrationNo', 'parentsName', 'parentsContact', 'className', 
        'admissionBatch', 'classRollNo', 'dob', 'section', 'stream', 'assignedMentorName'
      ]

      const missingHeaders = requiredHeaders.filter(header => !headers.includes(header))
      if (missingHeaders.length > 0) {
        throw new Error(`Missing required headers: ${missingHeaders.join(', ')}`)
      }

      // Parse data
      const parsedData: CsvMenteeData[] = []
      const errors: string[] = []

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim()
        if (!line) continue

        const values = line.split(',').map(v => v.trim())
        const menteeData: any = {}
        
        headers.forEach((header, index) => {
          menteeData[header] = values[index] || ""
        })

        // Validate and enrich data
        const rowErrors: string[] = []
        
        // Check required fields
        if (!menteeData.firstName) rowErrors.push("First name is required")
        if (!menteeData.lastName) rowErrors.push("Last name is required")
        if (!menteeData.email) rowErrors.push("Email is required")
        if (!menteeData.enrollmentNo) rowErrors.push("Enrollment number is required")
        
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (menteeData.email && !emailRegex.test(menteeData.email)) {
          rowErrors.push("Invalid email format")
        }

        // Check for duplicate emails in existing mentees
        const existingMentee = mentees.find(m => m.email.toLowerCase() === menteeData.email.toLowerCase())
        if (existingMentee) {
          rowErrors.push("Email already exists in database")
        }

        // Find class by name
        const foundClass = classes.find(cls => cls.name === menteeData.className)
        if (menteeData.className && !foundClass) {
          rowErrors.push(`Class "${menteeData.className}" not found`)
        }

        // Find mentor by name
        const foundMentor = mentors.find(m => m.name === menteeData.assignedMentorName)
        if (menteeData.assignedMentorName && !foundMentor) {
          rowErrors.push(`Mentor "${menteeData.assignedMentorName}" not found`)
        }

        // Add enriched data
        const enrichedData: CsvMenteeData = {
          ...menteeData,
          classId: foundClass?.id || "",
          assignedMentorId: foundMentor?.id || "",
          password: generateRandomPassword(),
          isValid: rowErrors.length === 0,
          errors: rowErrors
        }

        parsedData.push(enrichedData)

        if (rowErrors.length > 0) {
          errors.push(`Row ${i + 1}: ${rowErrors.join(', ')}`)
        }
      }

      // Determine if single or multiple mentees
      setBulkMode(parsedData.length === 1 ? 'single' : 'multiple')
      setCsvData(parsedData)
      setValidationErrors(errors)
      setShowPreview(true)

      if (errors.length === 0) {
        toast({
          title: "CSV parsed successfully",
          description: `${parsedData.length} mentee(s) ready for creation`,
        })
      } else {
        toast({
          title: "CSV parsed with errors",
          description: `${errors.length} validation error(s) found`,
          variant: "destructive"
        })
      }

    } catch (error: any) {
      console.error("Error parsing CSV:", error)
      setError(error.message || "Failed to parse CSV file")
      toast({
        title: "Error",
        description: error.message || "Failed to parse CSV file",
        variant: "destructive"
      })
    }
  }

  // Handle single mentee creation
  const handleCreateSingleMentee = async () => {
    if (!newMentee.firstName || !newMentee.lastName || !newMentee.email || !newMentee.password ||
        !newMentee.enrollmentNo || !newMentee.registrationNo || !newMentee.parentsName || 
        !newMentee.parentsContact || !newMentee.classId || !newMentee.admissionBatch || 
        !newMentee.classRollNo || !newMentee.dob) {
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
        section: selectedClass?.section || "",
        stream: selectedClass?.stream || "",
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
        section: selectedClass?.section || "",
        stream: selectedClass?.stream || "",
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

  // Handle bulk mentee creation
  const handleCreateBulkMentees = async () => {
    const validMentees = csvData.filter(mentee => mentee.isValid)
    
    if (validMentees.length === 0) {
      setError("No valid mentees to create")
      return
    }

    if (!adminPassword) {
      setError("Please enter your admin password to confirm")
      return
    }

    setError("")
    setIsCreating(true)
    setShowProgressDialog(true)
    setCreationProgress({ current: 0, total: validMentees.length })

    try {
      // Store current admin credentials
      const adminEmail = auth.currentUser?.email
      const adminUid = auth.currentUser?.uid

      // Validate admin password
      if (adminEmail) {
        await signInWithEmailAndPassword(auth, adminEmail, adminPassword)
      }

      const createdMentees: any[] = []

      for (let i = 0; i < validMentees.length; i++) {
        const menteeData = validMentees[i]
        setCurrentStep(`Creating account for ${menteeData.firstName} ${menteeData.lastName}`)
        setCreationProgress({ current: i, total: validMentees.length })

        try {
          // Create mentee account in Firebase Auth
          const menteeCredential = await createUserWithEmailAndPassword(auth, menteeData.email, menteeData.password!)
          const menteeUser = menteeCredential.user

          const fullName = menteeData.middleName 
            ? `${menteeData.firstName} ${menteeData.middleName} ${menteeData.lastName}`
            : `${menteeData.firstName} ${menteeData.lastName}`

          // Create mentee document in Firestore
          const firestoreData = {
            uid: menteeUser.uid,
            firstName: menteeData.firstName,
            lastName: menteeData.lastName,
            middleName: menteeData.middleName || "",
            name: fullName,
            email: menteeUser.email,
            password: menteeData.password,
            role: "mentee",
            enrollmentNo: menteeData.enrollmentNo,
            registrationNo: menteeData.registrationNo,
            parentsName: menteeData.parentsName,
            parentsContact: menteeData.parentsContact,
            classId: menteeData.classId!,
            className: menteeData.className,
            admissionBatch: menteeData.admissionBatch,
            classRollNo: menteeData.classRollNo,
            dob: menteeData.dob,
            section: menteeData.section,
            stream: menteeData.stream,
            assignedMentorId: menteeData.assignedMentorId || "",
            assignedMentorName: menteeData.assignedMentorName || "",
            createdBy: adminUid,
            createdAt: new Date(),
          }

          await addDoc(collection(db, "mentees"), firestoreData)
          createdMentees.push({ ...firestoreData, uid: menteeUser.uid })

          // Sign out mentee and sign back in as admin for next iteration
          await signOut(auth)
          if (adminEmail && i < validMentees.length - 1) {
            await signInWithEmailAndPassword(auth, adminEmail, adminPassword)
          }

        } catch (error: any) {
          console.error(`Error creating mentee ${menteeData.firstName} ${menteeData.lastName}:`, error)
          // Continue with other mentees even if one fails
        }
      }

      // Final sign in as admin
      if (adminEmail) {
        await signInWithEmailAndPassword(auth, adminEmail, adminPassword)
      }

      // Update local state
      setMentees(prev => [...createdMentees, ...prev])

      // Reset form
      setCsvFile(null)
      setCsvData([])
      setShowPreview(false)
      setAdminPassword("")
      setIsBulkDialogOpen(false)
      setShowProgressDialog(false)

      toast({
        title: "Success",
        description: `${createdMentees.length} mentee(s) created successfully!`,
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
      setIsCreating(false)
      setShowProgressDialog(false)
    }
  }

  // Download CSV template
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
                  Create Single Mentee
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

                  <div className="grid grid-cols-3 gap-4">
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
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="dob">Date of Birth *</Label>
                      <Input
                        id="dob"
                        type="date"
                        value={newMentee.dob}
                        onChange={(e) => setNewMentee(prev => ({ ...prev, dob: e.target.value }))}
                      />
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

                  {error && (
                    <div className="text-red-600 text-sm">{error}</div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateSingleMentee} disabled={isCreating}>
                    {isCreating ? "Creating..." : "Create Mentee"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={isBulkDialogOpen} onOpenChange={setIsBulkDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-green-600 hover:bg-green-700">
                  <Users2 className="h-4 w-4 mr-2" />
                  Bulk Create Mentees
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Bulk Create Mentees</DialogTitle>
                  <DialogDescription>
                    Upload a CSV file to create multiple mentees at once.
                  </DialogDescription>
                </DialogHeader>
                
                <Tabs defaultValue="upload" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="upload">Upload CSV</TabsTrigger>
                    <TabsTrigger value="template">Download Template</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="upload" className="space-y-4">
                    <div className="grid gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="csvFile">Select CSV File</Label>
                        <Input
                          id="csvFile"
                          type="file"
                          accept=".csv"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) {
                              setCsvFile(file)
                              handleCsvUpload(file)
                            }
                          }}
                        />
                      </div>

                      {showPreview && (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold">
                              Preview ({csvData.length} mentee{csvData.length !== 1 ? 's' : ''})
                            </h3>
                            <Badge variant={validationErrors.length === 0 ? "default" : "destructive"}>
                              {bulkMode === 'single' ? 'Single Mentee' : 'Multiple Mentees'}
                            </Badge>
                          </div>

                          {validationErrors.length > 0 && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                              <h4 className="font-medium text-red-800 mb-2 flex items-center">
                                <AlertCircle className="h-4 w-4 mr-2" />
                                Validation Errors ({validationErrors.length})
                              </h4>
                              <ul className="text-sm text-red-700 space-y-1">
                                {validationErrors.slice(0, 10).map((error, index) => (
                                  <li key={index}>• {error}</li>
                                ))}
                                {validationErrors.length > 10 && (
                                  <li>• ... and {validationErrors.length - 10} more errors</li>
                                )}
                              </ul>
                            </div>
                          )}

                          <div className="border rounded-lg overflow-hidden">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Status</TableHead>
                                  <TableHead>Name</TableHead>
                                  <TableHead>Email</TableHead>
                                  <TableHead>Enrollment</TableHead>
                                  <TableHead>Class</TableHead>
                                  <TableHead>Mentor</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {csvData.slice(0, 10).map((mentee, index) => (
                                  <TableRow key={index}>
                                    <TableCell>
                                      {mentee.isValid ? (
                                        <Check className="h-4 w-4 text-green-600" />
                                      ) : (
                                        <X className="h-4 w-4 text-red-600" />
                                      )}
                                    </TableCell>
                                    <TableCell>
                                      {mentee.firstName} {mentee.middleName} {mentee.lastName}
                                    </TableCell>
                                    <TableCell>{mentee.email}</TableCell>
                                    <TableCell>{mentee.enrollmentNo}</TableCell>
                                    <TableCell>{mentee.className}</TableCell>
                                    <TableCell>{mentee.assignedMentorName || 'Not assigned'}</TableCell>
                                  </TableRow>
                                ))}
                                {csvData.length > 10 && (
                                  <TableRow>
                                    <TableCell colSpan={6} className="text-center text-gray-500">
                                      ... and {csvData.length - 10} more mentees
                                    </TableCell>
                                  </TableRow>
                                )}
                              </TableBody>
                            </Table>
                          </div>

                          <div className="grid gap-2">
                            <Label htmlFor="bulkAdminPassword">Admin Password *</Label>
                            <Input
                              id="bulkAdminPassword"
                              type="password"
                              value={adminPassword}
                              onChange={(e) => setAdminPassword(e.target.value)}
                              placeholder="Enter your admin password to confirm"
                            />
                          </div>

                          {error && (
                            <div className="text-red-600 text-sm">{error}</div>
                          )}
                        </div>
                      )}
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="template" className="space-y-4">
                    <div className="text-center py-8">
                      <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">Download CSV Template</h3>
                      <p className="text-gray-600 mb-4">
                        Download the template file with sample data and required headers.
                      </p>
                      <Button onClick={downloadCsvTemplate}>
                        <Download className="h-4 w-4 mr-2" />
                        Download Template
                      </Button>
                    </div>
                  </TabsContent>
                </Tabs>

                <DialogFooter>
                  <Button variant="outline" onClick={() => {
                    setIsBulkDialogOpen(false)
                    setCsvFile(null)
                    setCsvData([])
                    setShowPreview(false)
                    setValidationErrors([])
                    setAdminPassword("")
                    setError("")
                  }}>
                    Cancel
                  </Button>
                  {showPreview && csvData.filter(m => m.isValid).length > 0 && (
                    <Button onClick={handleCreateBulkMentees} disabled={isCreating}>
                      {isCreating ? "Creating..." : `Create ${csvData.filter(m => m.isValid).length} Mentee(s)`}
                    </Button>
                  )}
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Progress Dialog */}
        <Dialog open={showProgressDialog} onOpenChange={() => {}}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Creating Mentees</DialogTitle>
              <DialogDescription>
                Please wait while we create the mentee accounts...
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progress</span>
                  <span>{creationProgress.current} of {creationProgress.total}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${(creationProgress.current / creationProgress.total) * 100}%` }}
                  ></div>
                </div>
              </div>
              {currentStep && (
                <div className="text-sm text-gray-600">
                  {currentStep}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                All Mentees ({mentees.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Enrollment No</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>Mentor</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mentees.map((mentee) => (
                      <TableRow key={mentee.uid}>
                        <TableCell>
                          {mentee.firstName} {mentee.middleName} {mentee.lastName}
                        </TableCell>
                        <TableCell>{mentee.email}</TableCell>
                        <TableCell>{mentee.enrollmentNo}</TableCell>
                        <TableCell>{mentee.className}</TableCell>
                        <TableCell>{mentee.assignedMentorName || 'Not assigned'}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm" className="text-red-600">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}