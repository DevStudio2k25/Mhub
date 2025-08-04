"use client"

import { useEffect, useState } from "react"
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/contexts/auth-context"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Trash2, Users, PenSquare, Edit, Eye, Download, Upload, FileText, Users2, Check, X, AlertCircle } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

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

interface CsvClassData {
  name: string
  year: string
  section: string
  stream: string
  isValid?: boolean
  errors?: string[]
}

export default function AdminClasses() {
  const { userData } = useAuth()
  const { toast } = useToast()
  const [classes, setClasses] = useState<ClassInfo[]>([])
  const [loading, setLoading] = useState(true)

  // Single class creation
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

  // Bulk creation states
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false)
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [csvData, setCsvData] = useState<CsvClassData[]>([])
  const [showPreview, setShowPreview] = useState(false)
  const [validationErrors, setValidationErrors] = useState<string[]>([])

  // Export states
  const [exportDialog, setExportDialog] = useState(false)
  const [selectedFields, setSelectedFields] = useState<string[]>([
    'name', 'year', 'section', 'stream', 'studentCount'
  ])
  const [exportFormat, setExportFormat] = useState<'csv' | 'json' | 'excel'>('csv')

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
      const requiredHeaders = ['name', 'year', 'section', 'stream']
      const missingHeaders = requiredHeaders.filter(header => !headers.includes(header))
      if (missingHeaders.length > 0) {
        throw new Error(`Missing required headers: ${missingHeaders.join(', ')}`)
      }

      // Parse data
      const parsedData: CsvClassData[] = []
      const errors: string[] = []

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim()
        if (!line) continue

        const values = line.split(',').map(v => v.trim())
        const classData: any = {}

        headers.forEach((header, index) => {
          classData[header] = values[index] || ""
        })

        // Validate data
        const rowErrors: string[] = []

        // Check required fields
        if (!classData.name) rowErrors.push("Name is required")
        if (!classData.year) rowErrors.push("Year is required")
        if (!classData.section) rowErrors.push("Section is required")
        if (!classData.stream) rowErrors.push("Stream is required")

        // Validate stream
        if (classData.stream && !streams.includes(classData.stream)) {
          rowErrors.push("Invalid stream")
        }

        // Check for duplicate classes
        const existingClass = classes.find(cls =>
          cls.name.toLowerCase() === classData.name.toLowerCase() &&
          cls.year === classData.year &&
          cls.section.toLowerCase() === classData.section.toLowerCase()
        )
        if (existingClass) {
          rowErrors.push("Class already exists")
        }

        // Check for duplicates within CSV data
        const duplicateInCsv = parsedData.find(existing =>
          existing.name.toLowerCase() === classData.name.toLowerCase() &&
          existing.year === classData.year &&
          existing.section.toLowerCase() === classData.section.toLowerCase()
        )
        if (duplicateInCsv) {
          rowErrors.push("Duplicate class found in CSV")
        }

        // Add enriched data
        const enrichedData: CsvClassData = {
          name: classData.name,
          year: classData.year,
          section: classData.section,
          stream: classData.stream,
          isValid: rowErrors.length === 0,
          errors: rowErrors
        }

        parsedData.push(enrichedData)

        if (rowErrors.length > 0) {
          errors.push(`Row ${i + 1}: ${rowErrors.join(', ')}`)
        }
      }

      setCsvData(parsedData)
      setValidationErrors(errors)
      setShowPreview(true)

      if (errors.length === 0) {
        toast({
          title: "CSV parsed successfully",
          description: `${parsedData.length} class(es) ready for creation`,
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

  // Handle bulk class creation
  const handleCreateBulkClasses = async () => {
    const validClasses = csvData.filter(cls => cls.isValid)

    if (validClasses.length === 0) {
      setError("No valid classes to create")
      return
    }

    setError("")
    setIsCreating(true)

    try {
      const createdClasses: ClassInfo[] = []

      for (const classData of validClasses) {
        try {
          const docRef = await addDoc(collection(db, "classes"), {
            name: classData.name,
            year: classData.year,
            section: classData.section,
            stream: classData.stream,
            adminId: userData?.uid,
            createdAt: new Date()
          })

          createdClasses.push({
            id: docRef.id,
            name: classData.name,
            year: classData.year,
            section: classData.section,
            stream: classData.stream,
            adminId: userData?.uid || "",
            createdAt: new Date(),
            studentCount: 0
          })
        } catch (error) {
          console.error(`Error creating class ${classData.name}:`, error)
        }
      }

      // Update local state
      setClasses(prev => [...createdClasses, ...prev])

      // Close dialog and show success
      setIsBulkDialogOpen(false)
      setCsvFile(null)
      setCsvData([])
      setShowPreview(false)

      toast({
        title: "Bulk classes created successfully",
        description: `${createdClasses.length} class(es) have been created.`,
      })

    } catch (error: any) {
      console.error("Error creating bulk classes:", error)
      setError(error.message || "Failed to create classes")
    } finally {
      setIsCreating(false)
    }
  }

  // Export functions
  const handleExport = () => {
    const dataToExport = classes.map(cls => {
      const exportData: any = {}

      selectedFields.forEach(field => {
        switch (field) {
          case 'name':
            exportData['Name'] = cls.name
            break
          case 'year':
            exportData['Year'] = cls.year
            break
          case 'section':
            exportData['Section'] = cls.section
            break
          case 'stream':
            exportData['Stream'] = cls.stream
            break
          case 'studentCount':
            exportData['Student Count'] = cls.studentCount || 0
            break
          case 'createdAt':
            exportData['Created At'] = cls.createdAt ? new Date(cls.createdAt.seconds * 1000).toLocaleDateString() : 'N/A'
            break
          case 'id':
            exportData['Class ID'] = cls.id
            break
          default:
            exportData[field] = (cls as any)[field] || 'N/A'
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
      description: `${classes.length} class records exported as ${exportFormat.toUpperCase()}`,
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
    a.download = `classes_export_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const exportToJSON = (data: any[]) => {
    const jsonContent = JSON.stringify(data, null, 2)
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `classes_export_${new Date().toISOString().split('T')[0]}.json`
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
    a.download = `classes_export_${new Date().toISOString().split('T')[0]}.xlsx`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  // Download CSV template
  const downloadCsvTemplate = () => {
    const headers = ['name', 'year', 'section', 'stream']
    const sampleData = ['Computer Science', '2024', 'A', 'B.Tech Computer Science']

    const csvContent = [headers.join(','), sampleData.join(',')].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'class_template.csv'
    a.click()
    window.URL.revokeObjectURL(url)
  }

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
          <div className="flex gap-2">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Single Class
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

            <Dialog open={isBulkDialogOpen} onOpenChange={setIsBulkDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="border-blue-200 text-blue-700 hover:bg-blue-50">
                  <Users2 className="h-4 w-4 mr-2" />
                  Bulk Create
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Bulk Create Classes</DialogTitle>
                  <DialogDescription>
                    Upload a CSV file to create multiple classes at once.
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
                              Select a CSV file with class data (name, year, section, stream)
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
                          <h3 className="text-lg font-semibold">Preview ({csvData.length} classes)</h3>
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
                          <table className="w-full">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-4 py-2 text-left">Status</th>
                                <th className="px-4 py-2 text-left">Name</th>
                                <th className="px-4 py-2 text-left">Year</th>
                                <th className="px-4 py-2 text-left">Section</th>
                                <th className="px-4 py-2 text-left">Stream</th>
                              </tr>
                            </thead>
                            <tbody>
                              {csvData.map((cls, index) => (
                                <tr key={index} className="border-t">
                                  <td className="px-4 py-2">
                                    {cls.isValid ? (
                                      <Check className="h-4 w-4 text-green-600" />
                                    ) : (
                                      <X className="h-4 w-4 text-red-600" />
                                    )}
                                  </td>
                                  <td className="px-4 py-2">{cls.name}</td>
                                  <td className="px-4 py-2">{cls.year}</td>
                                  <td className="px-4 py-2">{cls.section}</td>
                                  <td className="px-4 py-2">{cls.stream}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
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
                        Download the template file to see the required format for bulk class creation.
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
                    setError("")
                  }}>
                    Cancel
                  </Button>
                  {showPreview && (
                    <Button onClick={handleCreateBulkClasses} disabled={isCreating}>
                      <Plus className="h-4 w-4 mr-2" />
                      {isCreating ? "Creating..." : `Create ${csvData.filter(c => c.isValid).length} Classes`}
                    </Button>
                  )}
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
          <>
            {classes.length > 0 && (
              <div className="flex justify-end mb-4">
                <Button
                  variant="outline"
                  onClick={() => setExportDialog(true)}
                  className="border-blue-200 text-blue-700 hover:bg-blue-50"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export Data
                </Button>
              </div>
            )}
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
          </>
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

        {/* Export Dialog */}
        <Dialog open={exportDialog} onOpenChange={setExportDialog}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Export Class Data</DialogTitle>
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
                    { id: 'name', label: 'Name' },
                    { id: 'year', label: 'Year' },
                    { id: 'section', label: 'Section' },
                    { id: 'stream', label: 'Stream' },
                    { id: 'studentCount', label: 'Student Count' },
                    { id: 'createdAt', label: 'Created At' },
                    { id: 'id', label: 'Class ID' }
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
                Export {classes.length} Records
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
} 