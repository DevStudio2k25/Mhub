"use client"

import { useEffect, useState } from "react"
import { collection, getDocs, doc, deleteDoc } from "firebase/firestore"
import { signInWithEmailAndPassword } from "firebase/auth"
import { db, auth } from "@/lib/firebase"
import { useAuth } from "@/contexts/auth-context"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Settings, Plus, Trash2, Eye, EyeOff, Users, X, Check, Download, FileText, FileSpreadsheet, Grid } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { formatDate } from "@/lib/utils"

interface Admin {
  uid: string
  firstName: string
  lastName: string
  middleName?: string
  adminId: string
  email: string | null
  password?: string // Store password for export purposes
  createdAt: string
  createdBy: string | undefined
}

export default function ManageAdmins() {
  const { userData } = useAuth()
  const { toast } = useToast()
  const [admins, setAdmins] = useState<Admin[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showAdminPassword, setShowAdminPassword] = useState(false)
  const [adminPassword, setAdminPassword] = useState("")
  const [newAdmin, setNewAdmin] = useState({
    firstName: "",
    lastName: "",
    middleName: "",
    email: "",
    password: ""
  })
  const [error, setError] = useState("")

  // Bulk admin creation states
  const [bulkAdmins, setBulkAdmins] = useState<Array<{
    firstName: string;
    lastName: string;
    middleName: string;
    email: string;
    password: string;
    id: string;
  }>>([])
  const [isBulkMode, setIsBulkMode] = useState(false)

  // Email validation states
  const [emailErrors, setEmailErrors] = useState<Record<string, string>>({})
  const [existingEmails, setExistingEmails] = useState<string[]>([])
  const [emailCheckingStatus, setEmailCheckingStatus] = useState<Record<string, 'checking' | 'valid' | 'invalid'>>({})
  const [allEmailsValidated, setAllEmailsValidated] = useState(false)
  const [emailTimeouts, setEmailTimeouts] = useState<Record<string, NodeJS.Timeout>>({})

  // Creation process tracking
  const [creationStatus, setCreationStatus] = useState<string>("")
  const [creationProgress, setCreationProgress] = useState<{ current: number, total: number }>({ current: 0, total: 0 })
  const [showProgressDialog, setShowProgressDialog] = useState(false)
  const [progressSteps, setProgressSteps] = useState<Array<{
    id: string;
    title: string;
    status: 'pending' | 'in-progress' | 'completed' | 'error';
    details?: string;
    timestamp?: string;
  }>>([])
  const [currentAdminBeingCreated, setCurrentAdminBeingCreated] = useState<{ firstName: string, lastName: string, email: string } | null>(null)

  // Delete confirmation states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [adminToDelete, setAdminToDelete] = useState<Admin | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Export states
  const [exportDialog, setExportDialog] = useState(false)
  const [selectedFields, setSelectedFields] = useState<string[]>(['adminId', 'firstName', 'lastName', 'email', 'createdAt'])
  const [exportFormat, setExportFormat] = useState<'csv' | 'json' | 'sheets'>('csv')

  useEffect(() => {
    const fetchAdmins = async () => {
      if (!userData || userData.role !== "super-admin") return

      try {
        const adminsSnapshot = await getDocs(collection(db, "admins"))
        const adminsArray: Admin[] = []

        adminsSnapshot.forEach((doc) => {
          adminsArray.push({
            uid: doc.id,
            ...doc.data()
          } as Admin)
        })

        setAdmins(adminsArray)
      } catch (error) {
        console.error("Error fetching admins:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchAdmins()
  }, [userData])

  // Load existing emails on component mount
  useEffect(() => {
    const loadExistingEmails = async () => {
      try {
        // Get existing super admins
        const superAdminsSnapshot = await getDocs(collection(db, "super-admins"))
        const adminsSnapshot = await getDocs(collection(db, "admins"))

        const emails: string[] = []

        superAdminsSnapshot.forEach((doc) => {
          const data = doc.data()
          if (data.email) emails.push(data.email)
        })

        adminsSnapshot.forEach((doc) => {
          const data = doc.data()
          if (data.email) emails.push(data.email)
        })

        setExistingEmails(emails)
      } catch (error) {
        console.error("Error loading existing emails:", error)
      }
    }

    loadExistingEmails()
  }, [])

  // Check if all emails are validated
  useEffect(() => {
    if (isBulkMode) {
      const allEmailsFilled = bulkAdmins.every(admin => admin.email.trim() !== '')
      const allEmailsValid = bulkAdmins.every(admin =>
        emailCheckingStatus[admin.id] === 'valid' && !emailErrors[admin.id]
      )
      const noEmailsChecking = bulkAdmins.every(admin =>
        emailCheckingStatus[admin.id] !== 'checking'
      )

      setAllEmailsValidated(allEmailsFilled && allEmailsValid && noEmailsChecking)
    } else {
      const emailFilled = newAdmin.email.trim() !== ''
      const emailValid = emailCheckingStatus['single'] === 'valid' && !emailErrors['single']
      const notChecking = emailCheckingStatus['single'] !== 'checking'

      setAllEmailsValidated(emailFilled && emailValid && notChecking)
    }
  }, [isBulkMode, bulkAdmins, newAdmin.email, emailCheckingStatus, emailErrors])

  // Real-time email validation with Firebase Auth check
  const validateEmailRealtime = async (email: string, adminId: string, currentIndex?: number) => {
    console.log(`🔍 Validating email: ${email} for adminId: ${adminId}`)

    if (!email || !email.trim()) {
      setEmailCheckingStatus(prev => ({ ...prev, [adminId]: 'invalid' }))
      setEmailErrors(prev => ({ ...prev, [adminId]: '' }))
      return
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setEmailErrors(prev => ({ ...prev, [adminId]: 'Invalid email format' }))
      setEmailCheckingStatus(prev => ({ ...prev, [adminId]: 'invalid' }))
      return
    }

    try {
      // Check against existing users in database first
      const existingUserIndex = existingEmails.findIndex(existingEmail =>
        existingEmail.toLowerCase() === email.toLowerCase()
      )

      if (existingUserIndex !== -1) {
        console.log(`❌ Email ${email} exists in local database`)
        setEmailErrors(prev => ({ ...prev, [adminId]: 'Email already exists in database' }))
        setEmailCheckingStatus(prev => ({ ...prev, [adminId]: 'invalid' }))
        return
      }

      // For bulk mode, check against other admins in the current list
      if (isBulkMode && currentIndex !== undefined) {
        const duplicateIndex = bulkAdmins.findIndex((admin, index) =>
          index !== currentIndex && admin.email.toLowerCase() === email.toLowerCase()
        )

        if (duplicateIndex !== -1) {
          console.log(`❌ Email ${email} is duplicate in bulk list`)
          setEmailErrors(prev => ({ ...prev, [adminId]: `Duplicate email found in Admin #${duplicateIndex + 1}` }))
          setEmailCheckingStatus(prev => ({ ...prev, [adminId]: 'invalid' }))
          return
        }
      }

      // Check with Firebase Auth API for existing accounts
      console.log(`🔍 Checking Firebase Auth for email: ${email}`)
      const response = await fetch('/api/check-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() })
      })

      if (!response.ok) {
        throw new Error(`API response not ok: ${response.status}`)
      }

      const result = await response.json()
      console.log(`📋 API result for ${email}:`, result)

      if (result.exists) {
        console.log(`❌ Email ${email} exists in Firebase Auth`)
        setEmailErrors(prev => ({ ...prev, [adminId]: 'Email already registered in Firebase Auth' }))
        setEmailCheckingStatus(prev => ({ ...prev, [adminId]: 'invalid' }))
      } else {
        console.log(`✅ Email ${email} is available`)
        setEmailErrors(prev => ({ ...prev, [adminId]: '' }))
        setEmailCheckingStatus(prev => ({ ...prev, [adminId]: 'valid' }))
      }

    } catch (error) {
      console.error(`❌ Error checking email ${email}:`, error)
      // On error, mark as invalid to be safe
      setEmailErrors(prev => ({ ...prev, [adminId]: 'Unable to verify email. Please try again.' }))
      setEmailCheckingStatus(prev => ({ ...prev, [adminId]: 'invalid' }))
    }
  }

  // Check for email duplicates (legacy function for immediate checks)
  const checkEmailDuplicate = (email: string, currentIndex?: number) => {
    if (!email) return null

    // Check against existing users in database
    const existingUserIndex = existingEmails.findIndex(existingEmail =>
      existingEmail.toLowerCase() === email.toLowerCase()
    )

    if (existingUserIndex !== -1) {
      return `Email already exists in database`
    }

    // For bulk mode, check against other admins in the current list
    if (isBulkMode && currentIndex !== undefined) {
      const duplicateIndex = bulkAdmins.findIndex((admin, index) =>
        index !== currentIndex && admin.email.toLowerCase() === email.toLowerCase()
      )

      if (duplicateIndex !== -1) {
        return `Duplicate email found in Admin #${duplicateIndex + 1}`
      }
    }

    return null
  }

  // Handle email change with real-time validation
  const handleEmailChange = (email: string, index?: number) => {
    if (isBulkMode && index !== undefined) {
      updateBulkAdmin(bulkAdmins[index].id, 'email', email)

      // Clear previous timeout for this admin
      const adminId = bulkAdmins[index].id
      if (emailTimeouts[adminId]) {
        clearTimeout(emailTimeouts[adminId])
      }

      // Reset status immediately
      setEmailCheckingStatus(prev => ({ ...prev, [adminId]: 'checking' }))
      setEmailErrors(prev => ({ ...prev, [adminId]: '' }))

      // Set new timeout for validation
      const timeoutId = setTimeout(() => {
        validateEmailRealtime(email, adminId, index)
      }, 800) // Increased to 800ms for better stability

      setEmailTimeouts(prev => ({ ...prev, [adminId]: timeoutId }))
    } else {
      setNewAdmin({ ...newAdmin, email })

      // Clear previous timeout for single admin
      if (emailTimeouts['single']) {
        clearTimeout(emailTimeouts['single'])
      }

      // Reset status immediately
      setEmailCheckingStatus(prev => ({ ...prev, 'single': 'checking' }))
      setEmailErrors(prev => ({ ...prev, 'single': '' }))

      // Set new timeout for validation
      const timeoutId = setTimeout(() => {
        validateEmailRealtime(email, 'single')
      }, 800) // Increased to 800ms for better stability

      setEmailTimeouts(prev => ({ ...prev, 'single': timeoutId }))
    }
  }

  // Generate random password (client-side only to avoid hydration issues)
  const generateRandomPassword = () => {
    if (typeof window === 'undefined') return 'TempPass123!' // Server-side fallback

    return Math.random().toString(36).slice(-8) +
      Math.random().toString(36).toUpperCase().slice(-2) +
      Math.floor(Math.random() * 10) + "!";
  }

  // Generate unique admin ID
  const generateAdminId = async (firstName: string, lastName: string) => {
    if (!firstName || !lastName) return ""

    const firstLetter = firstName.charAt(0).toUpperCase()
    const lastLetter = lastName.charAt(0).toUpperCase()
    const prefix = `${firstLetter}${lastLetter}UEM`

    try {
      // Get existing admins to find the next available number
      const adminsSnapshot = await getDocs(collection(db, "admins"))
      const existingIds: string[] = []

      adminsSnapshot.forEach((doc) => {
        const data = doc.data()
        if (data.adminId && data.adminId.startsWith(prefix)) {
          existingIds.push(data.adminId)
        }
      })

      // Find the next available number
      let nextNumber = 1
      let newId = `${prefix}${nextNumber.toString().padStart(3, '0')}`

      while (existingIds.includes(newId)) {
        nextNumber++
        newId = `${prefix}${nextNumber.toString().padStart(3, '0')}`
      }

      return newId
    } catch (error) {
      console.error("Error generating admin ID:", error)
      return `${prefix}001` // Fallback
    }
  }

  // Add new admin to bulk list
  const addAdminToBulkList = () => {
    // Use a more deterministic ID generation to avoid hydration issues
    const newId = `admin_${Date.now()}_${Math.floor(Math.random() * 1000)}`
    setBulkAdmins(prev => [...prev, {
      id: newId,
      firstName: "",
      lastName: "",
      middleName: "",
      email: "",
      password: generateRandomPassword()
    }])
  }

  // Remove admin from bulk list
  const removeAdminFromBulkList = (id: string) => {
    setBulkAdmins(prev => prev.filter(admin => admin.id !== id))
  }

  // Update admin in bulk list
  const updateBulkAdmin = (id: string, field: string, value: string) => {
    setBulkAdmins(prev => prev.map(admin =>
      admin.id === id ? { ...admin, [field]: value } : admin
    ))
  }

  // Reset bulk mode
  const resetBulkMode = () => {
    setBulkAdmins([])
    setIsBulkMode(false)
    setEmailErrors({})
  }

  // Simplified progress - only show current step for current account
  const setCurrentStep = (title: string, status: 'in-progress' | 'completed' | 'error', details?: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setProgressSteps([{
      id: 'current-step',
      title,
      status,
      details,
      timestamp
    }])
  }

  const initializeProgress = () => {
    setProgressSteps([])
    setCurrentAdminBeingCreated(null)
  }

  const handleCreateAdmin = async () => {
    console.log("🚀 Starting single admin creation via API...")
    console.log("📝 Admin details:", { firstName: newAdmin.firstName, lastName: newAdmin.lastName, email: newAdmin.email })

    if (!newAdmin.firstName || !newAdmin.lastName || !newAdmin.email || !newAdmin.password) {
      console.log("❌ Validation failed: Missing required fields")
      setError("Please fill all fields")
      return
    }

    if (!adminPassword) {
      console.log("❌ Validation failed: Super admin password not provided")
      setError("Please enter your super admin password to confirm")
      return
    }

    setError("")
    setIsCreating(true)

    try {
      // Validate super admin password first
      console.log("🔐 Validating super admin password...")
      const currentSuperAdminEmail = auth.currentUser?.email
      if (!currentSuperAdminEmail) {
        throw new Error("Super admin not properly authenticated")
      }

      try {
        await signInWithEmailAndPassword(auth, currentSuperAdminEmail, adminPassword)
        console.log("✅ Super admin password validated successfully")
      } catch (credentialError) {
        console.log("❌ Super admin password validation failed:", credentialError)
        throw new Error("Invalid super admin password. Please check your password and try again.")
      }

      // Get super admin token for API call
      console.log("🎫 Getting super admin token...")
      const superAdminToken = await auth.currentUser?.getIdToken()
      if (!superAdminToken) {
        throw new Error("Failed to get super admin token")
      }

      // Generate unique admin ID
      console.log("🆔 Generating unique admin ID...")
      const adminId = await generateAdminId(newAdmin.firstName, newAdmin.lastName)
      console.log("✅ Generated admin ID:", adminId)

      // Call API to create admin (NO AUTH SWITCHING!)
      console.log("📡 Calling admin creation API...")
      const response = await fetch('/api/create-admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          adminData: {
            firstName: newAdmin.firstName,
            lastName: newAdmin.lastName,
            middleName: newAdmin.middleName,
            adminId: adminId,
            email: newAdmin.email,
            password: newAdmin.password
          },
          superAdminToken
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create admin')
      }

      console.log("✅ Admin created successfully via API:", result.admin)
      console.log("🔄 Super admin still logged in:", auth.currentUser?.email)

      // Update local state with password included
      const adminWithPassword = {
        ...result.admin,
        password: newAdmin.password // Store password for export
      }
      setAdmins([...admins, adminWithPassword])
      console.log("🔄 Local state updated with new admin")

      // Reset form
      setNewAdmin({ firstName: "", lastName: "", middleName: "", email: "", password: "" })
      setAdminPassword("")
      setIsDialogOpen(false)
      console.log("🧹 Form reset and dialog closed")

      console.log("🎉 Single admin creation completed successfully!")
      toast({
        title: "Admin created successfully",
        description: result.message
      })

    } catch (error: any) {
      console.error("❌ Error in single admin creation:", error)
      setError(error.message || "Failed to create admin")
    } finally {
      setIsCreating(false)
      console.log("🏁 Single admin creation process ended")
    }
  }

  // Handle bulk admin creation via API
  const handleCreateBulkAdmins = async () => {
    console.log("🚀 Starting bulk admin creation via API...");
    console.log("📊 Total admins to create:", bulkAdmins.length);
    console.log("📝 Admin list:", bulkAdmins.map(admin => ({ firstName: admin.firstName, middleName: admin.middleName, lastName: admin.lastName, email: admin.email })));

    // Validate all admins
    const invalidAdmins = bulkAdmins.filter(admin => !admin.firstName || !admin.lastName || !admin.email || !admin.password)
    if (invalidAdmins.length > 0) {
      console.log("❌ Validation failed: Invalid admins found:", invalidAdmins.length);
      setError("Please fill all fields for all admins")
      return
    }

    // Check for email errors
    const hasEmailErrors = bulkAdmins.some(admin => emailErrors[admin.id])
    if (hasEmailErrors) {
      console.log("❌ Validation failed: Email errors detected");
      setError("Please fix all email errors before creating admins")
      return
    }

    // Validate admin password
    if (!adminPassword) {
      console.log("❌ Validation failed: Super admin password not provided");
      setError("Super admin password is required for bulk creation")
      return
    }

    console.log("✅ All validations passed, proceeding with bulk creation");
    setError("")
    setIsCreating(true)
    setShowProgressDialog(true)
    initializeProgress()

    try {
      // Validate super admin password first
      console.log("🔐 Validating super admin password...");
      const currentSuperAdminEmail = auth.currentUser?.email
      if (!currentSuperAdminEmail) {
        throw new Error("Super admin not properly authenticated")
      }

      setCurrentStep('Validating credentials...', 'in-progress', 'Verifying super admin password...');
      try {
        await signInWithEmailAndPassword(auth, currentSuperAdminEmail, adminPassword)
        console.log("✅ Super admin password validated successfully");
      } catch (credentialError) {
        console.log("❌ Super admin password validation failed:", credentialError);
        throw new Error("Invalid super admin password. Please check your password and try again.")
      }

      // Get super admin token for API call
      console.log("🎫 Getting super admin token...");
      const superAdminToken = await auth.currentUser?.getIdToken()
      if (!superAdminToken) {
        throw new Error("Failed to get super admin token")
      }

      // Generate unique IDs for all admins
      console.log("🆔 Generating unique admin IDs for bulk creation...")
      const adminsData = []
      for (const admin of bulkAdmins) {
        const adminId = await generateAdminId(admin.firstName, admin.lastName)
        adminsData.push({
          firstName: admin.firstName,
          lastName: admin.lastName,
          middleName: admin.middleName,
          adminId: adminId,
          email: admin.email,
          password: admin.password
        })
      }
      console.log("✅ Generated admin IDs:", adminsData.map(a => ({ name: `${a.firstName} ${a.middleName} ${a.lastName}`.trim(), id: a.adminId })))

      // Set initial progress
      setCreationProgress({ current: 0, total: bulkAdmins.length });

      // Call API to create all admins (NO AUTH SWITCHING!)
      console.log("📡 Calling bulk admin creation API...");
      setCurrentStep('Creating admin accounts...', 'in-progress', `Creating ${bulkAdmins.length} admin accounts...`);

      const response = await fetch('/api/create-bulk-admins', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          adminsData,
          superAdminToken
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create admin accounts')
      }

      console.log("✅ Bulk admin creation completed via API");
      console.log("📊 Creation summary:", result.summary);
      console.log("🔄 Super admin still logged in:", auth.currentUser?.email);

      // Update progress with actual results
      setCreationProgress({ current: result.summary.created, total: result.summary.total });

      if (result.errors.length > 0) {
        console.log("⚠️ Some admins failed to create:", result.errors);
        setCurrentStep(`${result.summary.created} accounts created successfully`, 'completed',
          `${result.errors.length} accounts failed to create`);
      } else {
        setCurrentStep('All accounts created successfully!', 'completed',
          `${result.summary.created} admin accounts are ready to use`);
      }

      // Update local state with created admins including passwords
      const adminsWithPasswords = result.createdAdmins.map((admin: any) => {
        const originalAdmin = bulkAdmins.find(ba => ba.email === admin.email)
        return {
          ...admin,
          password: originalAdmin?.password || 'N/A'
        }
      })
      setAdmins(prev => [...prev, ...adminsWithPasswords])
      console.log("🔄 Local state updated with", result.createdAdmins.length, "new admins");

      // Close dialog and show success
      setTimeout(() => {
        setShowProgressDialog(false)
        setIsDialogOpen(false)
        resetBulkMode()
        setAdminPassword("") // Clear password for security
        console.log("🧹 Dialog closed and form reset");
      }, 2000)

      console.log("🎉 Bulk admin creation process completed!");
      toast({
        title: "Bulk admin creation completed",
        description: result.message
      })

    } catch (error: any) {
      console.error("❌ Error in bulk admin creation:", error);
      setCurrentStep('Bulk creation failed', 'error', error.message || "Unknown error occurred");
      setError(error.message || "Failed to create admin accounts")
    } finally {
      setIsCreating(false)
      console.log("🏁 Bulk admin creation process ended");
    }
  }

  const handleDeleteAdmin = async () => {
    if (!adminToDelete) return

    setIsDeleting(true)
    try {
      await deleteDoc(doc(db, "admins", adminToDelete.uid))
      setAdmins(admins.filter(admin => admin.uid !== adminToDelete.uid))

      toast({
        title: "Admin deleted",
        description: `${adminToDelete.firstName} ${adminToDelete.lastName} has been removed from administrators.`
      })

      setDeleteDialogOpen(false)
      setAdminToDelete(null)
    } catch (error) {
      console.error("Error deleting admin:", error)
      toast({
        title: "Error",
        description: "Failed to delete admin. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const openDeleteDialog = (admin: Admin) => {
    setAdminToDelete(admin)
    setDeleteDialogOpen(true)
  }

  // Export functions
  const handleExport = () => {
    const dataToExport = admins.map(admin => {
      const exportData: any = {}
      selectedFields.forEach(field => {
        switch (field) {
          case 'adminId':
            exportData['Admin ID'] = admin.adminId
            break
          case 'firstName':
            exportData['First Name'] = admin.firstName
            break
          case 'lastName':
            exportData['Last Name'] = admin.lastName
            break
          case 'email':
            exportData['Email'] = admin.email || 'N/A'
            break
          case 'createdAt':
            exportData['Created At'] = formatDate(admin.createdAt)
            break
          case 'createdBy':
            exportData['Created By'] = admin.createdBy || 'N/A'
            break
          case 'password':
            exportData['Password'] = admin.password || 'N/A'
            break
          case 'uid':
            exportData['User ID'] = admin.uid
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
      exportToGoogleSheets(dataToExport)
    }

    setExportDialog(false)
    toast({
      title: "Export Successful",
      description: `${admins.length} admin records exported as ${exportFormat.toUpperCase()}`,
    })
  }

  const exportToCSV = (data: any[]) => {
    if (data.length === 0) return

    const headers = Object.keys(data[0])
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => `"${row[header] || ''}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `admins_export_${new Date().toISOString().split('T')[0]}.csv`)
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
    link.setAttribute('download', `admins_export_${new Date().toISOString().split('T')[0]}.json`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const exportToGoogleSheets = (data: any[]) => {
    if (data.length === 0) return

    // Create Excel/Google Sheets compatible format (CSV with proper encoding)
    const headers = Object.keys(data[0])

    // Create CSV content with proper escaping
    const csvContent = [
      headers.join(','),
      ...data.map(row =>
        headers.map(header => {
          const value = row[header] || ''
          // Escape quotes and wrap in quotes if contains comma, quote, or newline
          if (value.toString().includes(',') || value.toString().includes('"') || value.toString().includes('\n')) {
            return `"${value.toString().replace(/"/g, '""')}"`
          }
          return value
        }).join(',')
      )
    ].join('\n')

    // Add BOM for proper UTF-8 encoding in Excel/Google Sheets
    const BOM = '\uFEFF'
    const blob = new Blob([BOM + csvContent], {
      type: 'text/csv;charset=utf-8;'
    })

    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `admins_export_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    // Provide instructions
    setTimeout(() => {
      toast({
        title: "Google Sheets Export Complete",
        description: "CSV file downloaded. You can directly open it in Google Sheets or Excel.",
      })
    }, 500)
  }

  const availableFields = [
    { key: 'adminId', label: 'Admin ID' },
    { key: 'firstName', label: 'First Name' },
    { key: 'lastName', label: 'Last Name' },
    { key: 'email', label: 'Email' },
    { key: 'password', label: 'Password' },
    { key: 'createdAt', label: 'Created At' },
    { key: 'createdBy', label: 'Created By' },
    { key: 'uid', label: 'User ID' }
  ]

  const toggleField = (field: string) => {
    setSelectedFields(prev =>
      prev.includes(field)
        ? prev.filter(f => f !== field)
        : [...prev, field]
    )
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
            <h1 className="text-3xl font-bold mb-2">Manage Admins</h1>
            <p className="text-muted-foreground">Create and manage administrator accounts</p>
          </div>
          <div className="flex gap-2">
            {admins.length > 0 && (
              <Button
                variant="outline"
                onClick={() => setExportDialog(true)}
                className="border-green-200 text-green-700 hover:bg-green-50"
              >
                <Download className="h-4 w-4 mr-2" />
                Export Data
              </Button>
            )}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-amber-600 hover:bg-amber-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Admin
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5 text-amber-600" />
                    Create Admin Accounts
                  </DialogTitle>
                  <DialogDescription>
                    Create administrator accounts with system management access.
                  </DialogDescription>
                </DialogHeader>

                <Tabs value={isBulkMode ? "bulk" : "single"} onValueChange={(value) => setIsBulkMode(value === "bulk")}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="single">Single Admin</TabsTrigger>
                    <TabsTrigger value="bulk">Bulk Creation</TabsTrigger>
                  </TabsList>

                  <TabsContent value="single" className="space-y-4">
                    {error && !isBulkMode && (
                      <div className="p-3 text-sm text-white bg-red-500 rounded-md">
                        {error}
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="firstName">First Name *</Label>
                        <Input
                          id="firstName"
                          value={newAdmin.firstName}
                          onChange={(e) => setNewAdmin({ ...newAdmin, firstName: e.target.value })}
                          placeholder="Enter first name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="lastName">Last Name *</Label>
                        <Input
                          id="lastName"
                          value={newAdmin.lastName}
                          onChange={(e) => setNewAdmin({ ...newAdmin, lastName: e.target.value })}
                          placeholder="Enter last name"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="middleName">Middle Name (Optional)</Label>
                      <Input
                        id="middleName"
                        value={newAdmin.middleName}
                        onChange={(e) => setNewAdmin({ ...newAdmin, middleName: e.target.value })}
                        placeholder="Enter middle name (optional)"
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email Address</Label>
                      <div className="relative">
                        <Input
                          id="email"
                          type="email"
                          value={newAdmin.email}
                          onChange={(e) => handleEmailChange(e.target.value)}
                          placeholder="Enter email address"
                          className={`pr-10 ${emailErrors['single'] ? 'border-red-500' :
                            emailCheckingStatus['single'] === 'valid' ? 'border-green-500' : ''}`}
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          {emailCheckingStatus['single'] === 'checking' && (
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
                          )}
                          {emailCheckingStatus['single'] === 'valid' && (
                            <Check className="h-4 w-4 text-green-600" />
                          )}
                          {emailCheckingStatus['single'] === 'invalid' && (
                            <X className="h-4 w-4 text-red-600" />
                          )}
                        </div>
                      </div>
                      {emailErrors['single'] && (
                        <p className="text-red-500 text-xs mt-1">{emailErrors['single']}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="password">Password</Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          value={newAdmin.password}
                          onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })}
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
                      <Label htmlFor="adminPassword">Your Super Admin Password (Confirmation)</Label>
                      <div className="relative">
                        <Input
                          id="adminPassword"
                          type={showAdminPassword ? "text" : "password"}
                          value={adminPassword}
                          onChange={(e) => setAdminPassword(e.target.value)}
                          placeholder="Enter your super admin password to confirm"
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowAdminPassword(!showAdminPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        >
                          {showAdminPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Enter your own super admin password to authorize admin creation
                      </p>
                    </div>
                  </TabsContent>

                  <TabsContent value="bulk" className="space-y-4">
                    {error && isBulkMode && (
                      <div className="p-3 text-sm text-white bg-red-500 rounded-md">
                        {error}
                      </div>
                    )}

                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-lg font-semibold">Bulk Admin Creation</h3>
                        <p className="text-sm text-gray-600">Add multiple admin accounts at once</p>
                      </div>
                      <Button
                        type="button"
                        onClick={addAdminToBulkList}
                        variant="outline"
                        size="sm"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add Admin
                      </Button>
                    </div>

                    {bulkAdmins.length === 0 ? (
                      <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                        <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500">No admins added yet</p>
                        <Button
                          type="button"
                          onClick={addAdminToBulkList}
                          variant="outline"
                          className="mt-2"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add First Admin
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-60 overflow-y-auto">
                        {bulkAdmins.map((admin, index) => (
                          <div key={admin.id} className="border rounded-lg p-4 bg-gray-50">
                            <div className="flex justify-between items-start mb-3">
                              <h4 className="font-medium text-sm">Admin #{index + 1}</h4>
                              <Button
                                type="button"
                                onClick={() => removeAdminFromBulkList(admin.id)}
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                              <div>
                                <Label className="text-xs">First Name</Label>
                                <Input
                                  value={admin.firstName}
                                  onChange={(e) => updateBulkAdmin(admin.id, 'firstName', e.target.value)}
                                  placeholder="First name"
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Middle Name</Label>
                                <Input
                                  value={admin.middleName}
                                  onChange={(e) => updateBulkAdmin(admin.id, 'middleName', e.target.value)}
                                  placeholder="Middle name"
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Last Name</Label>
                                <Input
                                  value={admin.lastName}
                                  onChange={(e) => updateBulkAdmin(admin.id, 'lastName', e.target.value)}
                                  placeholder="Last name"
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Email</Label>
                                <div className="relative">
                                  <Input
                                    value={admin.email}
                                    onChange={(e) => handleEmailChange(e.target.value, index)}
                                    placeholder="Email address"
                                    className={`pr-10 ${emailErrors[admin.id] ? 'border-red-500' :
                                      emailCheckingStatus[admin.id] === 'valid' ? 'border-green-500' : ''}`}
                                  />
                                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                    {emailCheckingStatus[admin.id] === 'checking' && (
                                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
                                    )}
                                    {emailCheckingStatus[admin.id] === 'valid' && (
                                      <Check className="h-4 w-4 text-green-600" />
                                    )}
                                    {emailCheckingStatus[admin.id] === 'invalid' && (
                                      <X className="h-4 w-4 text-red-600" />
                                    )}
                                  </div>
                                </div>
                                {emailErrors[admin.id] && (
                                  <p className="text-red-500 text-xs mt-1">{emailErrors[admin.id]}</p>
                                )}
                              </div>
                              <div>
                                <Label className="text-xs">Password</Label>
                                <Input
                                  value={admin.password}
                                  onChange={(e) => updateBulkAdmin(admin.id, 'password', e.target.value)}
                                  placeholder="Password"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {bulkAdmins.length > 0 && (
                      <div>
                        <Label htmlFor="bulkAdminPassword">Your Super Admin Password (Confirmation)</Label>
                        <div className="relative">
                          <Input
                            id="bulkAdminPassword"
                            type={showAdminPassword ? "text" : "password"}
                            value={adminPassword}
                            onChange={(e) => setAdminPassword(e.target.value)}
                            placeholder="Enter your super admin password to confirm bulk creation"
                            className="pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowAdminPassword(!showAdminPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                          >
                            {showAdminPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Enter your own super admin password to authorize bulk admin creation
                        </p>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>

                <DialogFooter>
                  <Button variant="outline" onClick={() => {
                    setIsDialogOpen(false)
                    resetBulkMode()
                  }}>
                    Cancel
                  </Button>
                  <Button
                    onClick={isBulkMode ? handleCreateBulkAdmins : handleCreateAdmin}
                    disabled={isCreating || (isBulkMode && bulkAdmins.length === 0) || !allEmailsValidated}
                    className="bg-amber-600 hover:bg-amber-700 disabled:opacity-50"
                  >
                    {isCreating ? "Creating..." :
                      !allEmailsValidated ? "Validating emails..." :
                        isBulkMode ? `Create ${bulkAdmins.length} Admins` : "Create Admin"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Progress Dialog for Bulk Creation */}
            <Dialog open={showProgressDialog} onOpenChange={setShowProgressDialog}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5 text-amber-600 animate-spin" />
                    Creating Admin Accounts
                  </DialogTitle>
                  <DialogDescription>
                    Please wait while we create the admin accounts...
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progress</span>
                      <span>{creationProgress.current} of {creationProgress.total}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-amber-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${(creationProgress.current / creationProgress.total) * 100}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Current Admin Being Created */}
                  {currentAdminBeingCreated && (
                    <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
                      <p className="text-sm font-medium text-amber-800">
                        Creating: {currentAdminBeingCreated.firstName} {currentAdminBeingCreated.lastName}
                      </p>
                      <p className="text-xs text-amber-600">{currentAdminBeingCreated.email}</p>
                    </div>
                  )}

                  {/* Current Step */}
                  {progressSteps.map((step) => (
                    <div key={step.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="flex-shrink-0 mt-0.5">
                        {step.status === 'in-progress' && (
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-amber-600 border-t-transparent"></div>
                        )}
                        {step.status === 'completed' && (
                          <Check className="h-4 w-4 text-green-600" />
                        )}
                        {step.status === 'error' && (
                          <X className="h-4 w-4 text-red-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${step.status === 'completed' ? 'text-green-800' :
                          step.status === 'error' ? 'text-red-800' : 'text-gray-800'
                          }`}>
                          {step.title}
                        </p>
                        {step.details && (
                          <p className="text-xs text-gray-600 mt-1">{step.details}</p>
                        )}
                        {step.timestamp && (
                          <p className="text-xs text-gray-400 mt-1">{step.timestamp}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500"></div>
          </div>
        ) : (
          <Card className="border-0 shadow-lg rounded-xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-amber-500/20 to-amber-500/5">
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-amber-600" />
                Administrators ({admins.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {admins.length > 0 ? (
                <div className="max-h-96 overflow-auto border rounded-md scrollbar-hide">
                  <Table>
                    <TableHeader className="sticky top-0 bg-gray-50 z-10 border-b">
                      <TableRow className="border-b">
                        <TableHead className="border-r px-4 py-3 text-left font-semibold">Admin ID</TableHead>
                        <TableHead className="border-r px-4 py-3 text-left font-semibold">Name</TableHead>
                        <TableHead className="border-r px-4 py-3 text-left font-semibold">Email</TableHead>
                        <TableHead className="border-r px-4 py-3 text-left font-semibold">Created At</TableHead>
                        <TableHead className="border-r px-4 py-3 text-left font-semibold">Created By</TableHead>
                        <TableHead className="px-4 py-3 text-left font-semibold">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {admins.map((admin) => (
                        <TableRow key={admin.uid} className="border-b hover:bg-gray-50">
                          <TableCell className="border-r px-4 py-3 font-mono text-sm font-medium text-amber-600 whitespace-nowrap">
                            {admin.adminId}
                          </TableCell>
                          <TableCell className="border-r px-4 py-3 font-medium whitespace-nowrap">
                            {admin.firstName} {admin.lastName}
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
                              onClick={() => openDeleteDialog(admin)}
                              className="h-8 px-3 text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
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
                  <Settings className="h-12 w-12 text-amber-300 mx-auto mb-4" />
                  <p className="text-gray-500">No administrators found</p>
                  <p className="text-sm text-gray-400 mt-1">Create your first admin to get started</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Custom Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <Trash2 className="h-5 w-5" />
                Delete Admin Account
              </DialogTitle>
              <DialogDescription className="text-gray-600">
                This action cannot be undone. This will permanently delete the admin account and remove all associated data.
              </DialogDescription>
            </DialogHeader>

            {adminToDelete && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 my-4">
                <div className="flex items-center gap-3">
                  <div className="bg-red-100 rounded-full p-2">
                    <Settings className="h-4 w-4 text-red-600" />
                  </div>
                  <div>
                    <p className="font-medium text-red-900">
                      {adminToDelete.firstName} {adminToDelete.lastName}
                    </p>
                    <p className="text-sm text-red-700">ID: {adminToDelete.adminId}</p>
                    <p className="text-sm text-red-600">{adminToDelete.email}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-sm text-amber-800">
                <strong>Warning:</strong> Deleting this admin will:
              </p>
              <ul className="text-sm text-amber-700 mt-2 ml-4 list-disc">
                <li>Remove their access to the admin dashboard</li>
                <li>Delete their admin profile permanently</li>
                <li>Cannot be reversed once confirmed</li>
              </ul>
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setDeleteDialogOpen(false)
                  setAdminToDelete(null)
                }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteAdmin}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700"
              >
                {isDeleting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Admin
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Progress Dialog for Bulk Creation */}
        <Dialog open={showProgressDialog} onOpenChange={setShowProgressDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Creating Admin Accounts</DialogTitle>
              <DialogDescription>
                Please wait while we create the admin accounts...
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {creationProgress.total > 0 && (
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Progress</span>
                    <span>{creationProgress.current}/{creationProgress.total}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-amber-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(creationProgress.current / creationProgress.total) * 100}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {progressSteps.map((step) => (
                <div key={step.id} className="flex items-start gap-3">
                  <div className="mt-1">
                    {step.status === 'in-progress' && (
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-amber-600 border-t-transparent"></div>
                    )}
                    {step.status === 'completed' && (
                      <Check className="h-4 w-4 text-green-600" />
                    )}
                    {step.status === 'error' && (
                      <X className="h-4 w-4 text-red-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{step.title}</p>
                    {step.details && (
                      <p className="text-xs text-gray-600">{step.details}</p>
                    )}
                    {step.timestamp && (
                      <p className="text-xs text-gray-400">{step.timestamp}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>

        {/* Export Dialog */}
        <Dialog open={exportDialog} onOpenChange={setExportDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Download className="h-5 w-5 text-green-600" />
                Export Admin Data
              </DialogTitle>
              <DialogDescription>
                Select the fields you want to export and choose the format.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Format Selection */}
              <div>
                <Label className="text-sm font-medium">Export Format</Label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <Button
                    variant={exportFormat === 'csv' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setExportFormat('csv')}
                    className="flex-1"
                  >
                    <FileSpreadsheet className="h-3 w-3 mr-1" />
                    CSV
                  </Button>
                  <Button
                    variant={exportFormat === 'json' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setExportFormat('json')}
                    className="flex-1"
                  >
                    <FileText className="h-3 w-3 mr-1" />
                    JSON
                  </Button>
                  <Button
                    variant={exportFormat === 'sheets' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setExportFormat('sheets')}
                    className="flex-1"
                  >
                    <Grid className="h-3 w-3 mr-1" />
                    Sheets
                  </Button>
                </div>
              </div>

              {/* Field Selection */}
              <div>
                <Label className="text-sm font-medium">Select Fields to Export</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {availableFields.map(field => (
                    <div key={field.key} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={field.key}
                        checked={selectedFields.includes(field.key)}
                        onChange={() => toggleField(field.key)}
                        className="rounded border-gray-300"
                      />
                      <Label htmlFor={field.key} className="text-sm">
                        {field.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="text-sm text-gray-500">
                {admins.length} admin records will be exported
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setExportDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleExport}
                disabled={selectedFields.length === 0}
                className="bg-green-600 hover:bg-green-700"
              >
                <Download className="h-3 w-3 mr-1" />
                Export {exportFormat === 'sheets' ? 'Google Sheets' : exportFormat.toUpperCase()}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}