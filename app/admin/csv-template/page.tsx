"use client"

import { useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Download, FileText, Upload, Users2, Info, Plus, Trash2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface ClassData {
  name: string
  year: string
  section: string
  stream: string
}

interface MenteeData {
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
}

interface MentorData {
  name: string
  email: string
  mentorId: string
  phone: string
  department: string
  qualification: string
}

export default function CsvTemplatePage() {
  const { userData } = useAuth()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState("mentee")

  // Class form state
  const [classes, setClasses] = useState<ClassData[]>([])
  const [newClass, setNewClass] = useState<ClassData>({
    name: "",
    year: "",
    section: "",
    stream: ""
  })

  // Mentee form state
  const [mentees, setMentees] = useState<MenteeData[]>([])
  const [newMentee, setNewMentee] = useState<MenteeData>({
    firstName: "",
    lastName: "",
    middleName: "",
    email: "",
    enrollmentNo: "",
    registrationNo: "",
    parentsName: "",
    parentsContact: "",
    className: "",
    admissionBatch: "",
    classRollNo: "",
    dob: "",
    section: "",
    stream: "",
    assignedMentorName: ""
  })

  // Mentor form state
  const [mentors, setMentors] = useState<MentorData[]>([])
  const [newMentor, setNewMentor] = useState<MentorData>({
    name: "",
    email: "",
    mentorId: "",
    phone: "",
    department: "",
    qualification: ""
  })

  // Add class to list
  const addClass = () => {
    if (!newClass.name || !newClass.year || !newClass.section || !newClass.stream) {
      toast({
        title: "Error",
        description: "Please fill all required fields",
        variant: "destructive"
      })
      return
    }
    setClasses([...classes, newClass])
    setNewClass({ name: "", year: "", section: "", stream: "" })
    toast({
      title: "Success",
      description: "Class added to list",
    })
  }

  // Add mentee to list
  const addMentee = () => {
    if (!newMentee.firstName || !newMentee.lastName || !newMentee.email || 
        !newMentee.enrollmentNo || !newMentee.registrationNo || !newMentee.parentsName || 
        !newMentee.parentsContact || !newMentee.className || !newMentee.admissionBatch || 
        !newMentee.classRollNo || !newMentee.dob || !newMentee.section || !newMentee.stream) {
      toast({
        title: "Error",
        description: "Please fill all required fields",
        variant: "destructive"
      })
      return
    }
    setMentees([...mentees, newMentee])
    setNewMentee({
      firstName: "",
      lastName: "",
      middleName: "",
      email: "",
      enrollmentNo: "",
      registrationNo: "",
      parentsName: "",
      parentsContact: "",
      className: "",
      admissionBatch: "",
      classRollNo: "",
      dob: "",
      section: "",
      stream: "",
      assignedMentorName: ""
    })
    toast({
      title: "Success",
      description: "Mentee added to list",
    })
  }

  // Add mentor to list
  const addMentor = () => {
    if (!newMentor.name || !newMentor.email || !newMentor.mentorId || 
        !newMentor.phone || !newMentor.department || !newMentor.qualification) {
      toast({
        title: "Error",
        description: "Please fill all required fields",
        variant: "destructive"
      })
      return
    }
    setMentors([...mentors, newMentor])
    setNewMentor({
      name: "",
      email: "",
      mentorId: "",
      phone: "",
      department: "",
      qualification: ""
    })
    toast({
      title: "Success",
      description: "Mentor added to list",
    })
  }

  // Remove item from list
  const removeClass = (index: number) => {
    setClasses(classes.filter((_, i) => i !== index))
  }

  const removeMentee = (index: number) => {
    setMentees(mentees.filter((_, i) => i !== index))
  }

  const removeMentor = (index: number) => {
    setMentors(mentors.filter((_, i) => i !== index))
  }

  // Download CSV functions
  const downloadClassCsv = () => {
    if (classes.length === 0) {
      toast({
        title: "Error",
        description: "No classes added to list",
        variant: "destructive"
      })
      return
    }

    const headers = ['name', 'year', 'section', 'stream']
    const csvContent = [
      headers.join(','),
      ...classes.map(cls => [cls.name, cls.year, cls.section, cls.stream].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'classes.csv'
    a.click()
    window.URL.revokeObjectURL(url)
    
    toast({
      title: "Success",
      description: "Classes CSV downloaded successfully!",
    })
  }

  const downloadMenteeCsv = () => {
    if (mentees.length === 0) {
      toast({
        title: "Error",
        description: "No mentees added to list",
        variant: "destructive"
      })
      return
    }

    const headers = [
      'firstName', 'lastName', 'middleName', 'email', 'enrollmentNo', 
      'registrationNo', 'parentsName', 'parentsContact', 'className', 
      'admissionBatch', 'classRollNo', 'dob', 'section', 'stream', 'assignedMentorName'
    ]
    const csvContent = [
      headers.join(','),
      ...mentees.map(mentee => [
        mentee.firstName, mentee.lastName, mentee.middleName, mentee.email,
        mentee.enrollmentNo, mentee.registrationNo, mentee.parentsName, mentee.parentsContact,
        mentee.className, mentee.admissionBatch, mentee.classRollNo, mentee.dob,
        mentee.section, mentee.stream, mentee.assignedMentorName
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'mentees.csv'
    a.click()
    window.URL.revokeObjectURL(url)
    
    toast({
      title: "Success",
      description: "Mentees CSV downloaded successfully!",
    })
  }

  const downloadMentorCsv = () => {
    if (mentors.length === 0) {
      toast({
        title: "Error",
        description: "No mentors added to list",
        variant: "destructive"
      })
      return
    }

    const headers = ['name', 'email', 'mentorId', 'phone', 'department', 'qualification']
    const csvContent = [
      headers.join(','),
      ...mentors.map(mentor => [
        mentor.name, mentor.email, mentor.mentorId, mentor.phone,
        mentor.department, mentor.qualification
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'mentors.csv'
    a.click()
    window.URL.revokeObjectURL(url)
    
    toast({
      title: "Success",
      description: "Mentors CSV downloaded successfully!",
    })
  }

  if (!userData || userData.role !== "admin") {
    return null
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto py-8 px-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">CSV Creator</h1>
          <p className="text-muted-foreground">Create CSV files with your data for bulk import</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="mentee">Mentee CSV</TabsTrigger>
            <TabsTrigger value="class">Class CSV</TabsTrigger>
            <TabsTrigger value="mentor">Mentor CSV</TabsTrigger>
          </TabsList>

          {/* Mentee CSV Creator */}
          <TabsContent value="mentee" className="space-y-6">
            <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users2 className="h-5 w-5" />
                  Create Mentee CSV
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Add Mentee Form */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input
                      id="firstName"
                      value={newMentee.firstName}
                      onChange={(e) => setNewMentee({...newMentee, firstName: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="middleName">Middle Name</Label>
                    <Input
                      id="middleName"
                      value={newMentee.middleName}
                      onChange={(e) => setNewMentee({...newMentee, middleName: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input
                      id="lastName"
                      value={newMentee.lastName}
                      onChange={(e) => setNewMentee({...newMentee, lastName: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newMentee.email}
                      onChange={(e) => setNewMentee({...newMentee, email: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="enrollmentNo">Enrollment No *</Label>
                    <Input
                      id="enrollmentNo"
                      value={newMentee.enrollmentNo}
                      onChange={(e) => setNewMentee({...newMentee, enrollmentNo: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="registrationNo">Registration No *</Label>
                    <Input
                      id="registrationNo"
                      value={newMentee.registrationNo}
                      onChange={(e) => setNewMentee({...newMentee, registrationNo: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="parentsName">Parents Name *</Label>
                    <Input
                      id="parentsName"
                      value={newMentee.parentsName}
                      onChange={(e) => setNewMentee({...newMentee, parentsName: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="parentsContact">Parents Contact *</Label>
                    <Input
                      id="parentsContact"
                      value={newMentee.parentsContact}
                      onChange={(e) => setNewMentee({...newMentee, parentsContact: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="className">Class Name *</Label>
                    <Input
                      id="className"
                      value={newMentee.className}
                      onChange={(e) => setNewMentee({...newMentee, className: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="admissionBatch">Admission Batch *</Label>
                    <Input
                      id="admissionBatch"
                      value={newMentee.admissionBatch}
                      onChange={(e) => setNewMentee({...newMentee, admissionBatch: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="classRollNo">Class Roll No *</Label>
                    <Input
                      id="classRollNo"
                      value={newMentee.classRollNo}
                      onChange={(e) => setNewMentee({...newMentee, classRollNo: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="dob">Date of Birth *</Label>
                    <Input
                      id="dob"
                      type="date"
                      value={newMentee.dob}
                      onChange={(e) => setNewMentee({...newMentee, dob: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="section">Section *</Label>
                    <Input
                      id="section"
                      value={newMentee.section}
                      onChange={(e) => setNewMentee({...newMentee, section: e.target.value})}
                    />
                </div>
                <div>
                    <Label htmlFor="stream">Stream *</Label>
                    <Input
                      id="stream"
                      value={newMentee.stream}
                      onChange={(e) => setNewMentee({...newMentee, stream: e.target.value})}
                    />
                </div>
                  <div>
                    <Label htmlFor="assignedMentorName">Assigned Mentor</Label>
                    <Input
                      id="assignedMentorName"
                      value={newMentee.assignedMentorName}
                      onChange={(e) => setNewMentee({...newMentee, assignedMentorName: e.target.value})}
                    />
              </div>
                </div>

                <Button onClick={addMentee} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Mentee to List
                </Button>

                {/* Mentee List */}
                {mentees.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Mentees in List ({mentees.length})</h3>
                    <div className="grid gap-2">
                      {mentees.map((mentee, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <span>{mentee.firstName} {mentee.lastName} - {mentee.email}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeMentee(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                    <Button onClick={downloadMenteeCsv} className="w-full">
                      <Download className="h-4 w-4 mr-2" />
                      Download Mentees CSV
                </Button>
              </div>
                )}
            </CardContent>
          </Card>
          </TabsContent>

          {/* Class CSV Creator */}
          <TabsContent value="class" className="space-y-6">
            <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Create Class CSV
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Add Class Form */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor="className">Class Name *</Label>
                    <Input
                      id="className"
                      value={newClass.name}
                      onChange={(e) => setNewClass({...newClass, name: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="classYear">Year *</Label>
                    <Input
                      id="classYear"
                      value={newClass.year}
                      onChange={(e) => setNewClass({...newClass, year: e.target.value})}
                    />
                </div>
                <div>
                    <Label htmlFor="classSection">Section *</Label>
                    <Input
                      id="classSection"
                      value={newClass.section}
                      onChange={(e) => setNewClass({...newClass, section: e.target.value})}
                    />
                </div>
                  <div>
                    <Label htmlFor="classStream">Stream *</Label>
                    <Input
                      id="classStream"
                      value={newClass.stream}
                      onChange={(e) => setNewClass({...newClass, stream: e.target.value})}
                    />
              </div>
                </div>

                <Button onClick={addClass} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Class to List
                </Button>

                {/* Class List */}
                {classes.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Classes in List ({classes.length})</h3>
                    <div className="grid gap-2">
                      {classes.map((cls, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <span>{cls.name} - {cls.stream} ({cls.year}, Section {cls.section})</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeClass(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                    <Button onClick={downloadClassCsv} className="w-full">
                      <Download className="h-4 w-4 mr-2" />
                      Download Classes CSV
                </Button>
              </div>
                )}
            </CardContent>
          </Card>
          </TabsContent>

          {/* Mentor CSV Creator */}
          <TabsContent value="mentor" className="space-y-6">
            <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users2 className="h-5 w-5" />
                  Create Mentor CSV
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Add Mentor Form */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="mentorName">Name *</Label>
                    <Input
                      id="mentorName"
                      value={newMentor.name}
                      onChange={(e) => setNewMentor({...newMentor, name: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="mentorEmail">Email *</Label>
                    <Input
                      id="mentorEmail"
                      type="email"
                      value={newMentor.email}
                      onChange={(e) => setNewMentor({...newMentor, email: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="mentorId">Mentor ID *</Label>
                    <Input
                      id="mentorId"
                      value={newMentor.mentorId}
                      onChange={(e) => setNewMentor({...newMentor, mentorId: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="mentorPhone">Phone *</Label>
                    <Input
                      id="mentorPhone"
                      value={newMentor.phone}
                      onChange={(e) => setNewMentor({...newMentor, phone: e.target.value})}
                    />
                </div>
                <div>
                    <Label htmlFor="mentorDepartment">Department *</Label>
                    <Input
                      id="mentorDepartment"
                      value={newMentor.department}
                      onChange={(e) => setNewMentor({...newMentor, department: e.target.value})}
                    />
                </div>
                  <div>
                    <Label htmlFor="mentorQualification">Qualification *</Label>
                    <Input
                      id="mentorQualification"
                      value={newMentor.qualification}
                      onChange={(e) => setNewMentor({...newMentor, qualification: e.target.value})}
                    />
              </div>
                </div>

                <Button onClick={addMentor} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Mentor to List
                </Button>

                {/* Mentor List */}
                {mentors.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Mentors in List ({mentors.length})</h3>
                    <div className="grid gap-2">
                      {mentors.map((mentor, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <span>{mentor.name} - {mentor.email} ({mentor.mentorId})</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeMentor(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                    <Button onClick={downloadMentorCsv} className="w-full">
                      <Download className="h-4 w-4 mr-2" />
                      Download Mentors CSV
                </Button>
              </div>
                )}
            </CardContent>
          </Card>
          </TabsContent>
        </Tabs>

        {/* Instructions */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              How to Use CSV Creator
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 text-sm">
              <div>
                <h4 className="font-medium mb-2">Step 1: Fill Data</h4>
                <p className="text-muted-foreground">Use the forms above to add your data. Fill in all required fields marked with *.</p>
              </div>
              <div>
                <h4 className="font-medium mb-2">Step 2: Add to List</h4>
                <p className="text-muted-foreground">Click "Add to List" to add each entry to your CSV list. You can add multiple entries.</p>
              </div>
              <div>
                <h4 className="font-medium mb-2">Step 3: Download CSV</h4>
                <p className="text-muted-foreground">Once you have all your data in the list, click "Download CSV" to get your CSV file.</p>
              </div>
              <div>
                <h4 className="font-medium mb-2">Step 4: Import Data</h4>
                <p className="text-muted-foreground">Go to the respective management page (Mentees, Mentors, or Classes) and use the bulk create feature to upload your CSV file.</p>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg">
                <h4 className="font-medium text-yellow-800 mb-2">Important Notes:</h4>
                <ul className="list-disc list-inside space-y-1 text-yellow-700 text-xs">
                  <li>All required fields must be filled before adding to list</li>
                  <li>Email addresses must be unique and valid</li>
                  <li>For mentees, ensure the className matches exactly with existing classes</li>
                  <li>For mentees, ensure the assignedMentorName matches exactly with existing mentors</li>
                  <li>Dates should be in YYYY-MM-DD format</li>
                  <li>You can remove items from the list before downloading</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
} 