"use client"

import { useEffect, useState } from "react"
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/contexts/auth-context"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Trash2, Users, Edit, Eye, UserPlus, Download, Upload, FileText, Users2, Check, X, AlertCircle, Filter, Search } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"

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
  password?: string
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

  // Search and filter states
  const [searchQuery, setSearchQuery] = useState("")
  const [filteredMentees, setFilteredMentees] = useState<Mentee[]>([])
  const [classFilter, setClassFilter] = useState("all")
  const [mentorFilter, setMentorFilter] = useState("all")

  // Export states
  const [exportDialog, setExportDialog] = useState(false)
  const [selectedFields, setSelectedFields] = useState<string[]>([
    'firstName', 'lastName', 'email', 'password', 'enrollmentNo', 'className', 'assignedMentorName'
  ])
  const [exportFormat, setExportFormat] = useState<'csv' | 'json' | 'excel'>('csv')

  // Single mentee creation
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedMentee, setSelectedMentee] = useState<Mentee | null>(null)
  const [newMentee, setNewMentee] = useState({
    firstName: "",
    lastName: "",
    middleName: "",
    email: "",
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

  // Search and filter logic
  useEffect(() => {
    let filtered = mentees

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(mentee =>
        `${mentee.firstName} ${mentee.middleName} ${mentee.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        mentee.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        mentee.enrollmentNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        mentee.className.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Class filter
    if (classFilter !== "all") {
      filtered = filtered.filter(mentee => mentee.classId === classFilter)
    }

    // Mentor filter
    if (mentorFilter === "assigned") {
      filtered = filtered.filter(mentee => mentee.assignedMentorName)
    } else if (mentorFilter === "unassigned") {
      filtered = filtered.filter(mentee => !mentee.assignedMentorName)
    }

    setFilteredMentees(filtered)
  }, [mentees, searchQuery, classFilter, mentorFilter])

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

        // Check for duplicate emails within CSV data
        const duplicateInCsv = parsedData.find(existing =>
          existing.email.toLowerCase() === menteeData.email.toLowerCase()
        )
        if (duplicateInCsv) {
          rowErrors.push("Duplicate email found in CSV")
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

  // Handle single mentee creation via API
  const handleCreateSingleMentee = async () => {
    console.log("=== Form Validation Started ===")
    console.log("Form Data:", {
      firstName: newMentee.firstName,
      lastName: newMentee.lastName,
      middleName: newMentee.middleName,
      email: newMentee.email,
      enrollmentNo: newMentee.enrollmentNo,
      registrationNo: newMentee.registrationNo,
      parentsName: newMentee.parentsName,
      parentsContact: newMentee.parentsContact,
      classId: newMentee.classId,
      admissionBatch: newMentee.admissionBatch,
      classRollNo: newMentee.classRollNo,
      dob: newMentee.dob,
      assignedMentorId: newMentee.assignedMentorId
    })

    // Check each required field individually
    const missingFields = []
    if (!newMentee.firstName) missingFields.push("First Name")
    if (!newMentee.lastName) missingFields.push("Last Name")
    if (!newMentee.email) missingFields.push("Email")
    if (!newMentee.enrollmentNo) missingFields.push("Enrollment No")
    if (!newMentee.registrationNo) missingFields.push("Registration No")
    if (!newMentee.parentsName) missingFields.push("Parents Name")
    if (!newMentee.parentsContact) missingFields.push("Parents Contact")
    if (!newMentee.classId) missingFields.push("Class")
    if (!newMentee.admissionBatch) missingFields.push("Admission Batch")
    if (!newMentee.classRollNo) missingFields.push("Class Roll No")
    if (!newMentee.dob) missingFields.push("Date of Birth")

    if (missingFields.length > 0) {
      console.error("❌ Missing required fields:", missingFields)
      setError(`Missing required fields: ${missingFields.join(", ")}`)
      toast({
        title: "Validation Error",
        description: `Please fill: ${missingFields.join(", ")}`,
        variant: "destructive"
      })
      return
    }

    if (!adminPassword) {
      console.error("❌ Admin password not provided")
      setError("Please enter your admin password to confirm")
      return
    }

    console.log("✓ All required fields present")
    setError("")
    setIsCreating(true)

    try {
      // Get class details
      const selectedClass = classes.find(cls => cls.id === newMentee.classId)
      if (!selectedClass) {
        console.error("❌ Selected class not found:", newMentee.classId)
        throw new Error("Selected class not found")
      }
      console.log("✓ Class found:", selectedClass)

      // Generate password
      const generatedPassword = generateRandomPassword()
      console.log("✓ Password generated (length):", generatedPassword.length)

      // Prepare mentee data for API
      const menteeData = {
        firstName: newMentee.firstName,
        lastName: newMentee.lastName,
        middleName: newMentee.middleName || "",
        email: newMentee.email,
        password: generatedPassword,
        enrollmentNo: newMentee.enrollmentNo,
        registrationNo: newMentee.registrationNo,
        parentsName: newMentee.parentsName,
        parentsContact: newMentee.parentsContact,
        classId: newMentee.classId,
        className: selectedClass.name,
        admissionBatch: newMentee.admissionBatch,
        classRollNo: newMentee.classRollNo,
        dob: newMentee.dob,
        section: selectedClass.section,
        stream: selectedClass.stream,
        assignedMentorId: newMentee.assignedMentorId || "",
        assignedMentorName: mentors.find(m => m.id === newMentee.assignedMentorId)?.name || ""
      }

      console.log("=== Sending to API ===")
      console.log("Mentee Data:", {
        ...menteeData,
        password: "[HIDDEN]"
      })

      // Call API to create mentee
      console.log("Calling API with payload:", {
        menteesCount: 1,
        adminUid: userData?.uid,
        hasPassword: !!adminPassword
      })

      const response = await fetch('/api/create-mentees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mentees: [menteeData],
          adminUid: userData?.uid,
          adminPassword: adminPassword
        })
      })

      console.log("API Response Status:", response.status, response.statusText)

      const result = await response.json()

      console.log("API Response Body:", result)

      if (!response.ok) {
        console.error("API Error:", result)
        throw new Error(result.details || result.error || 'Failed to create mentee')
      }

      if (result.errors && result.errors.length > 0) {
        console.error("Creation errors:", result.errors)
        throw new Error(result.errors[0].error)
      }

      // Add to local state
      const createdMentee = result.results[0]
      setMentees(prev => [{
        uid: createdMentee.uid,
        firstName: newMentee.firstName,
        lastName: newMentee.lastName,
        middleName: newMentee.middleName || "",
        email: newMentee.email,
        password: generatedPassword,
        role: "mentee",
        enrollmentNo: newMentee.enrollmentNo,
        registrationNo: newMentee.registrationNo,
        parentsName: newMentee.parentsName,
        parentsContact: newMentee.parentsContact,
        classId: newMentee.classId,
        className: selectedClass.name,
        admissionBatch: newMentee.admissionBatch,
        classRollNo: newMentee.classRollNo,
        dob: newMentee.dob,
        section: selectedClass.section,
        stream: selectedClass.stream,
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
      console.error("Error details:", {
        message: error.message,
        stack: error.stack
      })
      setError(error.message || "Failed to create mentee")
      toast({
        title: "Error",
        description: error.message || "Failed to create mentee",
        variant: "destructive"
      })
    } finally {
      setIsCreating(false)
    }
  }

  // Handle bulk mentee creation via API
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
      setCurrentStep("Preparing mentee data...")

      // Prepare mentees data for API
      const menteesData = validMentees.map(mentee => ({
        firstName: mentee.firstName,
        lastName: mentee.lastName,
        middleName: mentee.middleName || "",
        email: mentee.email,
        password: generateRandomPassword(), // Generate password for each mentee
        enrollmentNo: mentee.enrollmentNo,
        registrationNo: mentee.registrationNo,
        parentsName: mentee.parentsName,
        parentsContact: mentee.parentsContact,
        classId: mentee.classId!,
        className: mentee.className,
        admissionBatch: mentee.admissionBatch,
        classRollNo: mentee.classRollNo,
        dob: mentee.dob,
        section: mentee.section,
        stream: mentee.stream,
        assignedMentorId: mentee.assignedMentorId || "",
        assignedMentorName: mentee.assignedMentorName || ""
      }))

      setCurrentStep("Creating mentee accounts...")

      // Call API to create mentees
      const response = await fetch('/api/create-mentees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mentees: menteesData,
          adminUid: userData?.uid,
          adminPassword: adminPassword
        })
      })

      const result = await response.json()

      console.log("Bulk API Response:", result)

      if (!response.ok) {
        console.error("Bulk API Error:", result)
        throw new Error(result.details || result.error || 'Failed to create mentees')
      }

      setCurrentStep("Processing results...")

      // Update local state with successfully created mentees
      const createdMentees = result.results.map((createdMentee: any) => {
        const originalData = menteesData.find(m => m.email === createdMentee.email)
        return {
          uid: createdMentee.uid,
          firstName: originalData?.firstName || "",
          lastName: originalData?.lastName || "",
          middleName: originalData?.middleName || "",
          email: createdMentee.email,
          password: originalData?.password || "",
          role: "mentee",
          enrollmentNo: originalData?.enrollmentNo || "",
          registrationNo: originalData?.registrationNo || "",
          parentsName: originalData?.parentsName || "",
          parentsContact: originalData?.parentsContact || "",
          classId: originalData?.classId || "",
          className: originalData?.className || "",
          admissionBatch: originalData?.admissionBatch || "",
          classRollNo: originalData?.classRollNo || "",
          dob: originalData?.dob || "",
          section: originalData?.section || "",
          stream: originalData?.stream || "",
          assignedMentorId: originalData?.assignedMentorId || "",
          assignedMentorName: originalData?.assignedMentorName || "",
          createdAt: new Date()
        }
      })

      setMentees(prev => [...createdMentees, ...prev])

      // Reset form
      setCsvFile(null)
      setCsvData([])
      setShowPreview(false)
      setAdminPassword("")
      setIsBulkDialogOpen(false)
      setShowProgressDialog(false)

      // Show results
      const successCount = result.summary.successful
      const errorCount = result.summary.failed

      if (errorCount > 0) {
        toast({
          title: "Partial Success",
          description: `${successCount} mentees created successfully, ${errorCount} failed`,
          variant: "default"
        })

        // Show detailed errors
        if (result.errors && result.errors.length > 0) {
          console.error("Creation errors:", result.errors)

          // Group errors by type
          const duplicateEmails = result.errors.filter((e: any) => e.error.includes('already exists'))
          const otherErrors = result.errors.filter((e: any) => !e.error.includes('already exists'))

          let errorMessage = ""
          if (duplicateEmails.length > 0) {
            errorMessage += `Duplicate emails: ${duplicateEmails.map((e: any) => e.email).join(', ')}`
          }
          if (otherErrors.length > 0) {
            if (errorMessage) errorMessage += "\n"
            errorMessage += `Other errors: ${otherErrors.map((e: any) => e.error).join(', ')}`
          }

          setError(errorMessage)
        }
      } else {
        toast({
          title: "Success",
          description: `${successCount} mentee(s) created successfully!`,
        })
      }

    } catch (error: any) {
      console.error("Error creating mentees:", error)
      console.error("Error details:", {
        message: error.message,
        stack: error.stack
      })
      setError(error.message || "Failed to create mentees")
      toast({
        title: "Error",
        description: error.message || "Failed to create mentees",
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

  // Export functions
  const handleExport = () => {
    const dataToExport = filteredMentees.map(mentee => {
      const exportData: any = {}

      selectedFields.forEach(field => {
        switch (field) {
          case 'firstName':
            exportData['First Name'] = mentee.firstName
            break
          case 'lastName':
            exportData['Last Name'] = mentee.lastName
            break
          case 'middleName':
            exportData['Middle Name'] = mentee.middleName || ''
            break
          case 'email':
            exportData['Email'] = mentee.email
            break
          case 'password':
            exportData['Password'] = mentee.password || ''
            break
          case 'enrollmentNo':
            exportData['Enrollment No'] = mentee.enrollmentNo
            break
          case 'registrationNo':
            exportData['Registration No'] = mentee.registrationNo
            break
          case 'className':
            exportData['Class'] = mentee.className
            break
          case 'section':
            exportData['Section'] = mentee.section
            break
          case 'stream':
            exportData['Stream'] = mentee.stream
            break
          case 'classRollNo':
            exportData['Roll No'] = mentee.classRollNo
            break
          case 'dob':
            exportData['Date of Birth'] = mentee.dob
            break
          case 'parentsName':
            exportData['Parent Name'] = mentee.parentsName
            break
          case 'parentsContact':
            exportData['Parent Contact'] = mentee.parentsContact
            break
          case 'assignedMentorName':
            exportData['Assigned Mentor'] = mentee.assignedMentorName || 'Not assigned'
            break
          case 'admissionBatch':
            exportData['Admission Batch'] = mentee.admissionBatch
            break

          case 'uid':
            exportData['User ID'] = mentee.uid
            break
        }
      })
      return exportData
    })

    if (exportFormat === 'csv') {
      exportToCSV(dataToExport)
    } else if (exportFormat === 'json') {
      exportToJSON(dataToExport)
    } else {
      exportToExcel(dataToExport)
    }

    setExportDialog(false)
    toast({
      title: "Export Successful",
      description: `${filteredMentees.length} mentee records exported as ${exportFormat.toUpperCase()}`,
    })
  }

  const exportToCSV = (data: any[]) => {
    if (data.length === 0) return

    const headers = Object.keys(data[0])
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => `"${row[header]}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `mentees_export_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const exportToJSON = (data: any[]) => {
    const jsonContent = JSON.stringify(data, null, 2)
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `mentees_export_${new Date().toISOString().split('T')[0]}.json`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const exportToExcel = (data: any[]) => {
    if (data.length === 0) return

    const headers = Object.keys(data[0])
    const csvContent = '\uFEFF' + [
      headers.join('\t'),
      ...data.map(row => headers.map(header => row[header]).join('\t'))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'application/vnd.ms-excel;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `mentees_export_${new Date().toISOString().split('T')[0]}.xlsx`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (!userData || userData.role !== "admin") {
    return null
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto py-4 px-4 lg:px-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center mb-6 gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold mb-1">Mentee Management</h1>
            <p className="text-muted-foreground text-sm lg:text-base">Create and manage mentee accounts</p>
          </div>
          <div className="flex flex-wrap gap-2">
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
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <div className="text-red-800 text-sm font-medium mb-1">Error:</div>
                      <div className="text-red-700 text-sm">{error}</div>
                    </div>
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
                              <div className="max-h-40 overflow-y-auto">
                                <ul className="text-sm text-red-700 space-y-1">
                                  {validationErrors.slice(0, 15).map((error, index) => (
                                    <li key={index} className="break-words">• {error}</li>
                                  ))}
                                  {validationErrors.length > 15 && (
                                    <li>• ... and {validationErrors.length - 15} more errors</li>
                                  )}
                                </ul>
                              </div>
                              <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                                <strong>Tip:</strong> Remove duplicate emails from your CSV or use different email addresses for each mentee.
                              </div>
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
                            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                              <div className="text-red-800 text-sm font-medium mb-1">Creation Errors:</div>
                              <div className="text-red-700 text-sm whitespace-pre-line">{error}</div>
                            </div>
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

            {filteredMentees.length > 0 && (
              <Button
                variant="outline"
                onClick={() => setExportDialog(true)}
                className="border-blue-200 text-blue-700 hover:bg-blue-50"
              >
                <Download className="h-4 w-4 mr-2" />
                Export Data
              </Button>
            )}
          </div>
        </div>

        {/* Search and Filter Section */}
        <div className="mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search by name, email, enrollment no, or class..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Select value={classFilter} onValueChange={setClassFilter}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="Filter by class" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Classes</SelectItem>
                      {classes.map((cls) => (
                        <SelectItem key={cls.id} value={cls.id}>
                          {cls.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={mentorFilter} onValueChange={setMentorFilter}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="Filter by mentor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Mentees</SelectItem>
                      <SelectItem value="assigned">Assigned</SelectItem>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Progress Dialog */}
        <Dialog open={showProgressDialog} onOpenChange={() => { }}>
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
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg lg:text-xl">
                    <Users className="h-5 w-5" />
                    All Mentees ({filteredMentees.length})
                  </CardTitle>
                  <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
                    <span>Assigned: {filteredMentees.filter(m => m.assignedMentorName).length}</span>
                    <span>Unassigned: {filteredMentees.filter(m => !m.assignedMentorName).length}</span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-gray-50/50">
                    <TableRow>
                      <TableHead className="font-semibold text-left px-4 py-3">Name</TableHead>
                      <TableHead className="font-semibold text-left px-4 py-3 hidden sm:table-cell">Email</TableHead>
                      <TableHead className="font-semibold text-left px-4 py-3 hidden md:table-cell">Class</TableHead>
                      <TableHead className="font-semibold text-left px-4 py-3 hidden lg:table-cell">Mentor</TableHead>
                      <TableHead className="font-semibold text-center px-4 py-3 w-[120px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMentees.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-12 text-gray-500">
                          <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                          <p className="text-lg font-medium">No mentees found</p>
                          <p className="text-sm">
                            {searchQuery || classFilter !== "all" || mentorFilter !== "all"
                              ? "Try adjusting your search or filters"
                              : "Create your first mentee to get started"
                            }
                          </p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredMentees.map((mentee, index) => (
                        <TableRow key={mentee.uid} className="hover:bg-gray-50/50 transition-colors">
                          <TableCell className="px-4 py-3">
                            <div className="flex flex-col">
                              <span className="font-medium text-gray-900 text-sm lg:text-base">
                                {mentee.firstName} {mentee.middleName} {mentee.lastName}
                              </span>
                              <div className="flex flex-col sm:hidden text-xs text-gray-500 mt-1 space-y-1">
                                <span>{mentee.email}</span>
                                <span>{mentee.className} • Roll: {mentee.classRollNo}</span>
                                {mentee.assignedMentorName && (
                                  <span className="text-green-600">Mentor: {mentee.assignedMentorName}</span>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="px-4 py-3 hidden sm:table-cell">
                            <div className="flex flex-col">
                              <span className="text-sm">{mentee.email}</span>
                              <span className="text-xs text-gray-500">{mentee.enrollmentNo}</span>
                            </div>
                          </TableCell>
                          <TableCell className="px-4 py-3 hidden md:table-cell">
                            <div className="flex flex-col">
                              <span className="font-medium text-sm">{mentee.className}</span>
                              <span className="text-xs text-gray-500">{mentee.section} • {mentee.stream}</span>
                            </div>
                          </TableCell>
                          <TableCell className="px-4 py-3 hidden lg:table-cell">
                            {mentee.assignedMentorName ? (
                              <div className="flex flex-col">
                                <span className="text-sm font-medium text-green-700">
                                  {mentee.assignedMentorName}
                                </span>
                                <Badge variant="outline" className="w-fit text-xs text-green-600 border-green-200 mt-1">
                                  Assigned
                                </Badge>
                              </div>
                            ) : (
                              <Badge variant="outline" className="text-xs text-gray-500">
                                Not assigned
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="px-4 py-3">
                            <div className="flex justify-center gap-1">
                              <Link href={`/admin/view-profile/mentee/${mentee.uid}`}>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="View Profile">
                                  <Eye className="h-3 w-3" />
                                </Button>
                              </Link>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Edit Mentee">
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                title="Delete Mentee"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Export Dialog */}
        <Dialog open={exportDialog} onOpenChange={setExportDialog}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Export Mentee Data</DialogTitle>
              <DialogDescription>
                Select the fields you want to export and choose the format.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              <div>
                <Label className="text-base font-medium">Export Format</Label>
                <Select value={exportFormat} onValueChange={(value: 'csv' | 'json' | 'excel') => setExportFormat(value)}>
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="csv">CSV (Comma Separated Values)</SelectItem>
                    <SelectItem value="excel">Excel (XLSX)</SelectItem>
                    <SelectItem value="json">JSON (JavaScript Object Notation)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-base font-medium">Select Fields to Export</Label>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  {[
                    { id: 'firstName', label: 'First Name' },
                    { id: 'lastName', label: 'Last Name' },
                    { id: 'middleName', label: 'Middle Name' },
                    { id: 'email', label: 'Email' },
                    { id: 'password', label: 'Password' },
                    { id: 'enrollmentNo', label: 'Enrollment No' },
                    { id: 'registrationNo', label: 'Registration No' },
                    { id: 'className', label: 'Class' },
                    { id: 'section', label: 'Section' },
                    { id: 'stream', label: 'Stream' },
                    { id: 'classRollNo', label: 'Roll No' },
                    { id: 'dob', label: 'Date of Birth' },
                    { id: 'parentsName', label: 'Parent Name' },
                    { id: 'parentsContact', label: 'Parent Contact' },
                    { id: 'assignedMentorName', label: 'Assigned Mentor' },
                    { id: 'admissionBatch', label: 'Admission Batch' },
                    { id: 'uid', label: 'User ID' }
                  ].map((field) => (
                    <div key={field.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={field.id}
                        checked={selectedFields.includes(field.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedFields([...selectedFields, field.id])
                          } else {
                            setSelectedFields(selectedFields.filter(f => f !== field.id))
                          }
                        }}
                      />
                      <Label htmlFor={field.id} className="text-sm font-normal cursor-pointer">
                        {field.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setExportDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleExport} disabled={selectedFields.length === 0}>
                <Download className="h-4 w-4 mr-2" />
                Export {filteredMentees.length} Records
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}