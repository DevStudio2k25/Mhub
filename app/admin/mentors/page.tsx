"use client"

import { useEffect, useState } from "react"
import { collection, getDocs, doc, setDoc } from "firebase/firestore"
import { db, auth } from "@/lib/firebase"
import { useAuth } from "@/contexts/auth-context"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Users, Eye, UserPlus, Download, Upload, FileText, Users2, Check, X, AlertCircle } from "lucide-react"
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
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "firebase/auth"

interface Mentor {
  uid: string
  firstName: string
  lastName: string
  middleName?: string
  email: string
  mobile: string
  role: "mentor"
  mentorId: string
  createdAt: any
}

interface CsvMentorData {
  firstName: string
  lastName: string
  middleName: string
  email: string
  mobile: string
  password?: string
  isValid?: boolean
  errors?: string[]
}

export default function AdminMentors() {
  const { userData } = useAuth()
  const { toast } = useToast()
  const [mentors, setMentors] = useState<Mentor[]>([])
  const [loading, setLoading] = useState(true)

  // Single mentor creation
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState("")
  const [adminPassword, setAdminPassword] = useState("")
  const [newMentor, setNewMentor] = useState({
    firstName: "",
    lastName: "",
    middleName: "",
    email: "",
    mobile: "",
    password: generateRandomPassword()
  })

  // Bulk creation states
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false)
  const [bulkMode, setBulkMode] = useState<'single' | 'multiple'>('single')
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [csvData, setCsvData] = useState<CsvMentorData[]>([])
  const [showPreview, setShowPreview] = useState(false)
  const [validationErrors, setValidationErrors] = useState<string[]>([])

  // Creation process states
  const [creationProgress, setCreationProgress] = useState<{ current: number, total: number }>({ current: 0, total: 0 })
  const [showProgressDialog, setShowProgressDialog] = useState(false)
  const [currentStep, setCurrentStep] = useState("")

  // Export states
  const [exportDialog, setExportDialog] = useState(false)
  const [selectedFields, setSelectedFields] = useState<string[]>([
    'firstName', 'lastName', 'middleName', 'email', 'mobile', 'mentorId', 'createdAt'
  ])
  const [exportFormat, setExportFormat] = useState<'csv' | 'json' | 'excel'>('csv')

  // Function to generate a secure random password
  function generateRandomPassword() {
    const lowercase = Math.random().toString(36).slice(-6)
    const uppercase = Math.random().toString(36).toUpperCase().slice(-2)
    const numbers = Math.floor(Math.random() * 90 + 10)
    const special = "!@#$%^&*"[Math.floor(Math.random() * 8)]

    const combined = lowercase + uppercase + numbers + special
    return combined.split('').sort(() => 0.5 - Math.random()).join('')
  }

  // Generate next mentor ID
  const generateNextMentorId = async () => {
    try {
      const currentYear = new Date().getFullYear()
      const prefix = `MH${currentYear}`

      // Get all existing mentors to find the highest number
      const mentorsSnapshot = await getDocs(collection(db, "mentors"))

      let highestNumber = 0

      mentorsSnapshot.forEach((doc) => {
        const userData = doc.data()
        if (userData.role === "mentor" && userData.mentorId) {
          // Extract number from mentorId like MH2025001 -> 001
          const match = userData.mentorId.match(new RegExp(`^${prefix}(\\d+)$`))
          if (match) {
            const number = parseInt(match[1], 10)
            if (number > highestNumber) {
              highestNumber = number
            }
          }
        }
      })

      // Generate next number with leading zeros (3 digits)
      const nextNumber = (highestNumber + 1).toString().padStart(3, '0')
      return `${prefix}${nextNumber}`
    } catch (error) {
      console.error("Error generating mentor ID:", error)
      // Fallback to timestamp-based ID
      const currentYear = new Date().getFullYear()
      const timestamp = Date.now().toString().slice(-3)
      return `MH${currentYear}${timestamp}`
    }
  }

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
      const requiredHeaders = ['firstName', 'lastName', 'middleName', 'email', 'mobile']
      const missingHeaders = requiredHeaders.filter(header => !headers.includes(header))
      if (missingHeaders.length > 0) {
        throw new Error(`Missing required headers: ${missingHeaders.join(', ')}`)
      }

      // Parse data
      const parsedData: CsvMentorData[] = []
      const errors: string[] = []

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim()
        if (!line) continue

        const values = line.split(',').map(v => v.trim())
        const mentorData: any = {}

        headers.forEach((header, index) => {
          mentorData[header] = values[index] || ""
        })

        // Validate and enrich data
        const rowErrors: string[] = []

        // Check required fields
        if (!mentorData.firstName) rowErrors.push("First name is required")
        if (!mentorData.lastName) rowErrors.push("Last name is required")
        if (!mentorData.email) rowErrors.push("Email is required")
        if (!mentorData.mobile) rowErrors.push("Mobile is required")

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (mentorData.email && !emailRegex.test(mentorData.email)) {
          rowErrors.push("Invalid email format")
        }

        // Check for duplicate emails in existing mentors
        const existingMentor = mentors.find(m => m.email.toLowerCase() === mentorData.email.toLowerCase())
        if (existingMentor) {
          rowErrors.push("Email already exists in database")
        }

        // Check for duplicate emails within CSV data
        const duplicateInCsv = parsedData.find(existing =>
          existing.email.toLowerCase() === mentorData.email.toLowerCase()
        )
        if (duplicateInCsv) {
          rowErrors.push("Duplicate email found in CSV")
        }

        // Add enriched data
        const enrichedData: CsvMentorData = {
          firstName: mentorData.firstName,
          lastName: mentorData.lastName,
          middleName: mentorData.middleName || "",
          email: mentorData.email,
          mobile: mentorData.mobile,
          password: generateRandomPassword(),
          isValid: rowErrors.length === 0,
          errors: rowErrors
        }

        parsedData.push(enrichedData)

        if (rowErrors.length > 0) {
          errors.push(`Row ${i + 1}: ${rowErrors.join(', ')}`)
        }
      }

      // Determine if single or multiple mentors
      setBulkMode(parsedData.length === 1 ? 'single' : 'multiple')
      setCsvData(parsedData)
      setValidationErrors(errors)
      setShowPreview(true)

      if (errors.length === 0) {
        toast({
          title: "CSV parsed successfully",
          description: `${parsedData.length} mentor(s) ready for creation`,
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

  // Handle bulk mentor creation
  const handleCreateBulkMentors = async () => {
    const validMentors = csvData.filter(mentor => mentor.isValid)

    if (validMentors.length === 0) {
      setError("No valid mentors to create")
      return
    }

    if (!adminPassword) {
      setError("Please enter your admin password to confirm")
      return
    }

    setError("")
    setIsCreating(true)
    setShowProgressDialog(true)
    setCreationProgress({ current: 0, total: validMentors.length })

    try {
      // Store current admin credentials
      const adminEmail = auth.currentUser?.email
      const adminUid = auth.currentUser?.uid
      const createdMentors: Mentor[] = []

      setCurrentStep("Preparing mentor data...")

      // Generate mentor IDs first
      const mentorIds: string[] = []
      for (let i = 0; i < validMentors.length; i++) {
        const mentorId = await generateNextMentorId()
        mentorIds.push(mentorId)
      }

      setCurrentStep("Creating mentor accounts...")

      // Create each mentor
      for (let i = 0; i < validMentors.length; i++) {
        const mentorData = validMentors[i]
        const mentorId = mentorIds[i]

        setCreationProgress({ current: i, total: validMentors.length })
        setCurrentStep(`Creating account for ${mentorData.firstName} ${mentorData.lastName}...`)

        try {
          // Create mentor account in Firebase Authentication
          const mentorCredential = await createUserWithEmailAndPassword(auth, mentorData.email, mentorData.password!)
          const mentorUser = mentorCredential.user

          // Create mentor document in Firestore
          const userData = {
            uid: mentorUser.uid,
            email: mentorUser.email,
            firstName: mentorData.firstName,
            lastName: mentorData.lastName,
            middleName: mentorData.middleName || "",
            mobile: mentorData.mobile,
            role: "mentor",
            mentorId: mentorId,
            createdBy: adminUid,
            createdAt: new Date()
          }

          await setDoc(doc(db, "mentors", mentorUser.uid), userData)

          // Sign out the newly created account
          await signOut(auth)

          // Sign back in as admin
          if (adminEmail) {
            await signInWithEmailAndPassword(auth, adminEmail, adminPassword)
          }

          // Add to created mentors list
          createdMentors.push({
            uid: mentorUser.uid,
            firstName: mentorData.firstName,
            lastName: mentorData.lastName,
            middleName: mentorData.middleName || "",
            email: mentorData.email,
            mobile: mentorData.mobile,
            role: "mentor",
            mentorId: mentorId,
            createdAt: new Date()
          })

        } catch (error: any) {
          console.error(`Error creating mentor ${mentorData.firstName} ${mentorData.lastName}:`, error)
          // Continue with other mentors even if one fails
        }
      }

      setCreationProgress({ current: validMentors.length, total: validMentors.length })
      setCurrentStep("All accounts created successfully!")

      // Update local state with all created mentors
      setMentors(prev => [...createdMentors, ...prev])

      // Close dialog and show success
      setIsBulkDialogOpen(false)
      setCsvFile(null)
      setCsvData([])
      setShowPreview(false)
      setAdminPassword("")
      setShowProgressDialog(false)

      toast({
        title: "Bulk mentors created successfully",
        description: `${createdMentors.length} mentor accounts have been created.`,
      })

    } catch (error: any) {
      console.error("Error creating bulk mentors:", error)
      setError(error.message || "Failed to create mentors")
    } finally {
      setIsCreating(false)
      setShowProgressDialog(false)
    }
  }

  // Export functions
  const handleExport = () => {
    const dataToExport = mentors.map(mentor => {
      const exportData: any = {}

      selectedFields.forEach(field => {
        switch (field) {
          case 'firstName':
            exportData['First Name'] = mentor.firstName
            break
          case 'lastName':
            exportData['Last Name'] = mentor.lastName
            break
          case 'middleName':
            exportData['Middle Name'] = mentor.middleName || ''
            break
          case 'email':
            exportData['Email'] = mentor.email
            break
          case 'mobile':
            exportData['Mobile'] = mentor.mobile
            break
          case 'mentorId':
            exportData['Mentor ID'] = mentor.mentorId
            break
          case 'createdAt':
            exportData['Created At'] = formatDate(mentor.createdAt)
            break
          case 'uid':
            exportData['User ID'] = mentor.uid
            break
          default:
            exportData[field] = (mentor as any)[field] || 'N/A'
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
      description: `${mentors.length} mentor records exported as ${exportFormat.toUpperCase()}`,
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
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `mentors_export_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const exportToJSON = (data: any[]) => {
    const jsonContent = JSON.stringify(data, null, 2)
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `mentors_export_${new Date().toISOString().split('T')[0]}.json`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const exportToExcel = (data: any[]) => {
    if (data.length === 0) return

    const headers = Object.keys(data[0])
    const csvContent = '\uFEFF' + [
      headers.join('\t'),
      ...data.map(row => headers.map(header => row[header]).join('\t'))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'application/vnd.ms-excel;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `mentors_export_${new Date().toISOString().split('T')[0]}.xlsx`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  // Download CSV template
  const downloadCsvTemplate = () => {
    const headers = ['firstName', 'lastName', 'middleName', 'email', 'mobile']
    const sampleData = ['John', 'Doe', 'M', 'john.doe@example.com', '+91-9876543210']

    const csvContent = [headers.join(','), sampleData.join(',')].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'mentor_template.csv'
    a.click()
    window.URL.revokeObjectURL(url)
  }

  useEffect(() => {
    const fetchMentors = async () => {
      if (!userData) return

      try {
        // Fetch mentors
        const mentorsRef = collection(db, "mentors")
        const mentorsSnapshot = await getDocs(mentorsRef)
        const mentorsData: Mentor[] = []
        mentorsSnapshot.forEach((doc) => {
          const data = doc.data()
          mentorsData.push({
            uid: doc.id,
            firstName: data.firstName || data.name || "",
            lastName: data.lastName || "",
            middleName: data.middleName || "",
            email: data.email || "",
            mobile: data.mobile || "",
            role: "mentor",
            mentorId: data.mentorId || "",
            createdAt: data.createdAt
          })
        })
        setMentors(mentorsData)

      } catch (error) {
        console.error("Error fetching mentors:", error)
        toast({
          title: "Error",
          description: "Failed to load mentors",
          variant: "destructive"
        })
      } finally {
        setLoading(false)
      }
    }

    if (userData && userData.role === "admin") {
      fetchMentors()
    }
  }, [userData, toast])

  // Handle mentor creation
  const handleCreateMentor = async () => {
    if (!newMentor.firstName || !newMentor.lastName || !newMentor.email || !newMentor.mobile || !newMentor.password) {
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

      // Generate mentor ID
      const mentorId = await generateNextMentorId()

      // Create mentor account in Firebase Authentication
      const mentorCredential = await createUserWithEmailAndPassword(auth, newMentor.email, newMentor.password)
      const mentorUser = mentorCredential.user

      // Create mentor document in Firestore
      const mentorData = {
        uid: mentorUser.uid,
        email: mentorUser.email,
        firstName: newMentor.firstName,
        lastName: newMentor.lastName,
        middleName: newMentor.middleName || "",
        mobile: newMentor.mobile,
        role: "mentor",
        mentorId: mentorId,
        createdBy: adminUid,
        createdAt: new Date()
      }

      await setDoc(doc(db, "mentors", mentorUser.uid), mentorData)

      // Sign out the newly created account
      await signOut(auth)

      // Sign back in as admin
      if (adminEmail) {
        await signInWithEmailAndPassword(auth, adminEmail, adminPassword)
      }

      // Add to local state
      setMentors(prev => [{
        uid: mentorUser.uid,
        firstName: newMentor.firstName,
        lastName: newMentor.lastName,
        middleName: newMentor.middleName || "",
        email: newMentor.email,
        mobile: newMentor.mobile,
        role: "mentor",
        mentorId: mentorId,
        createdAt: new Date()
      }, ...prev])

      // Reset form
      setNewMentor({
        firstName: "",
        lastName: "",
        middleName: "",
        email: "",
        mobile: "",
        password: generateRandomPassword()
      })
      setAdminPassword("")
      setIsDialogOpen(false)

      toast({
        title: "Success",
        description: `Mentor created successfully! Mentor ID: ${mentorId}`,
      })
    } catch (error: any) {
      console.error("Error creating mentor:", error)
      setError(error.message || "Failed to create mentor")
      toast({
        title: "Error",
        description: "Failed to create mentor",
        variant: "destructive"
      })
    } finally {
      setIsCreating(false)
    }
  }

  const formatDate = (dateValue: any) => {
    if (!dateValue) return "Not available"
    
    try {
      if (dateValue.seconds) {
        return new Date(dateValue.seconds * 1000).toLocaleDateString()
      } else if (dateValue instanceof Date) {
        return dateValue.toLocaleDateString()
      } else if (typeof dateValue === 'string') {
        return new Date(dateValue).toLocaleDateString()
      }
      return "Invalid date"
    } catch (error) {
      return "Invalid date"
    }
  }

  if (!userData || userData.role !== "admin") {
    return null
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto py-8 px-6">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Mentor Management</h1>
            <p className="text-muted-foreground">Create and manage mentor accounts</p>
          </div>
          <div className="flex gap-2">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-green-600 hover:bg-green-700">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Create Single Mentor
                </Button>
              </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Create New Mentor</DialogTitle>
                <DialogDescription>
                  Add a new mentor account with auto-generated credentials.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input
                      id="firstName"
                      value={newMentor.firstName}
                      onChange={(e) => setNewMentor(prev => ({ ...prev, firstName: e.target.value }))}
                      placeholder="First name"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="middleName">Middle Name</Label>
                    <Input
                      id="middleName"
                      value={newMentor.middleName}
                      onChange={(e) => setNewMentor(prev => ({ ...prev, middleName: e.target.value }))}
                      placeholder="Middle name"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input
                      id="lastName"
                      value={newMentor.lastName}
                      onChange={(e) => setNewMentor(prev => ({ ...prev, lastName: e.target.value }))}
                      placeholder="Last name"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newMentor.email}
                      onChange={(e) => setNewMentor(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="Enter mentor's email"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="mobile">Mobile *</Label>
                    <Input
                      id="mobile"
                      type="tel"
                      value={newMentor.mobile}
                      onChange={(e) => setNewMentor(prev => ({ ...prev, mobile: e.target.value }))}
                      placeholder="+91-9876543210"
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password">Generated Password *</Label>
                  <div className="flex gap-2">
                    <Input
                      id="password"
                      type="text"
                      value={newMentor.password}
                      onChange={(e) => setNewMentor(prev => ({ ...prev, password: e.target.value }))}
                      className="font-mono"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setNewMentor(prev => ({ ...prev, password: generateRandomPassword() }))}
                    >
                      Generate New
                    </Button>
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
                    <div className="text-red-800 text-sm font-medium mb-1">Creation Error:</div>
                    <div className="text-red-700 text-sm">{error}</div>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateMentor} disabled={isCreating}>
                  {isCreating ? "Creating..." : "Create Mentor"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isBulkDialogOpen} onOpenChange={setIsBulkDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-green-200 text-green-700 hover:bg-green-50">
                <Users2 className="h-4 w-4 mr-2" />
                Bulk Create
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Bulk Create Mentors</DialogTitle>
                <DialogDescription>
                  Upload a CSV file to create multiple mentor accounts at once.
                </DialogDescription>
              </DialogHeader>

              <Tabs defaultValue="upload" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="upload">Upload CSV</TabsTrigger>
                  <TabsTrigger value="template">Download Template</TabsTrigger>
                </TabsList>

                <TabsContent value="upload" className="space-y-4">
                  {!showPreview ? (
                    <div className="space-y-4">
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                        <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <div className="space-y-2">
                          <p className="text-lg font-medium">Upload CSV File</p>
                          <p className="text-sm text-gray-500">
                            Select a CSV file with mentor data (name, email)
                          </p>
                          <Input
                            type="file"
                            accept=".csv"
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (file) {
                                setCsvFile(file)
                                handleCsvUpload(file)
                              }
                            }}
                            className="max-w-xs mx-auto"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold">Preview ({csvData.length} mentors)</h3>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setShowPreview(false)
                            setCsvData([])
                            setCsvFile(null)
                            setValidationErrors([])
                          }}
                        >
                          Upload Different File
                        </Button>
                      </div>

                      {validationErrors.length > 0 && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                          <div className="flex items-center gap-2 text-red-800 font-medium mb-2">
                            <AlertCircle className="h-4 w-4" />
                            Validation Errors ({validationErrors.length})
                          </div>
                          <div className="text-red-700 text-sm space-y-1 max-h-32 overflow-y-auto">
                            {validationErrors.map((error, index) => (
                              <div key={index}>• {error}</div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="border rounded-lg overflow-hidden max-h-64 overflow-y-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Status</TableHead>
                              <TableHead>First Name</TableHead>
                              <TableHead>Last Name</TableHead>
                              <TableHead>Email</TableHead>
                              <TableHead>Mobile</TableHead>
                              <TableHead>Generated Password</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {csvData.map((mentor, index) => (
                              <TableRow key={index}>
                                <TableCell>
                                  {mentor.isValid ? (
                                    <Check className="h-4 w-4 text-green-600" />
                                  ) : (
                                    <X className="h-4 w-4 text-red-600" />
                                  )}
                                </TableCell>
                                <TableCell>{mentor.firstName}</TableCell>
                                <TableCell>{mentor.lastName}</TableCell>
                                <TableCell>{mentor.email}</TableCell>
                                <TableCell>{mentor.mobile}</TableCell>
                                <TableCell className="font-mono text-xs">{mentor.password}</TableCell>
                              </TableRow>
                            ))}
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
                </TabsContent>

                <TabsContent value="template" className="space-y-4">
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Download CSV Template</h3>
                    <p className="text-gray-600 mb-4">
                      Download the template file to see the required format for bulk mentor creation.
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
                {showPreview && (
                  <Button onClick={handleCreateBulkMentors} disabled={isCreating}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    {isCreating ? "Creating..." : `Create ${csvData.filter(m => m.isValid).length} Mentors`}
                  </Button>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        {/* Progress Dialog */}
        <Dialog open={showProgressDialog} onOpenChange={() => { }}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Creating Mentors</DialogTitle>
              <DialogDescription>
                Please wait while we create the mentor accounts...
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
                    className="bg-green-600 h-2 rounded-full transition-all duration-300"
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
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
          </div>
        ) : (
          <Card>
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg lg:text-xl">
                    <Users className="h-5 w-5" />
                    All Mentors ({mentors.length})
                  </CardTitle>
                </div>
                {mentors.length > 0 && (
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
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-gray-50/50">
                    <TableRow>
                      <TableHead className="font-semibold text-left px-4 py-3">Name</TableHead>
                      <TableHead className="font-semibold text-left px-4 py-3">Email</TableHead>
                      <TableHead className="font-semibold text-left px-4 py-3">Mobile</TableHead>
                      <TableHead className="font-semibold text-left px-4 py-3">Mentor ID</TableHead>
                      <TableHead className="font-semibold text-left px-4 py-3">Created</TableHead>
                      <TableHead className="font-semibold text-center px-4 py-3 w-[120px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mentors.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-12 text-gray-500">
                          <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                          <p className="text-lg font-medium">No mentors found</p>
                          <p className="text-sm">Create your first mentor to get started</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      mentors.map((mentor, index) => (
                        <TableRow key={mentor.uid} className="hover:bg-gray-50/50 transition-colors">
                          <TableCell className="px-4 py-3">
                            <div className="flex flex-col">
                              <span className="font-medium text-gray-900">
                                {mentor.firstName} {mentor.middleName} {mentor.lastName}
                              </span>
                              <span className="text-xs text-gray-500">ID: {mentor.uid.slice(0, 8)}...</span>
                            </div>
                          </TableCell>
                          <TableCell className="px-4 py-3">
                            <span className="text-sm">{mentor.email}</span>
                          </TableCell>
                          <TableCell className="px-4 py-3">
                            <span className="text-sm">{mentor.mobile}</span>
                          </TableCell>
                          <TableCell className="px-4 py-3">
                            <Badge variant="outline" className="font-mono text-xs">
                              {mentor.mentorId}
                            </Badge>
                          </TableCell>
                          <TableCell className="px-4 py-3">
                            <span className="text-sm text-gray-600">{formatDate(mentor.createdAt)}</span>
                          </TableCell>
                          <TableCell className="px-4 py-3">
                            <div className="flex justify-center gap-1">
                              <Link href={`/admin/view-profile/mentor/${mentor.uid}`}>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="View Profile">
                                  <Eye className="h-3 w-3" />
                                </Button>
                              </Link>
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
              <DialogTitle>Export Mentor Data</DialogTitle>
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
                    { id: 'mobile', label: 'Mobile' },
                    { id: 'mentorId', label: 'Mentor ID' },
                    { id: 'createdAt', label: 'Created At' },
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
                Export {mentors.length} Records
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}