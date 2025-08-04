"use client"

import { useEffect, useState, Suspense } from "react"
import { collection, getDocs, query, where } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/contexts/auth-context"
import { toast, Toaster } from "sonner"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import * as XLSX from 'xlsx'
import { 
  FileText, 
  MessageSquare, 
  User, 
  ChevronRight, 
  Check, 
  X, 
  Filter, 
  ChevronDown, 
  Edit, 
  Eye, 
  EyeOff,
  CheckCircle2,
  LogIn,
  Download,
  GraduationCap
} from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"
import { cn } from "@/lib/utils"

interface ClassInfo {
  id: string
  name: string
  year: string
  section: string
  stream: string
  adminId: string
}

interface Mentee {
  uid: string
  firstName: string
  lastName: string
  middleName?: string
  email: string
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
  assignedMentorId: string
  assignedMentorName?: string
  profileImage?: string
  photoURL?: string
  hasEdited?: boolean
}

function MentorMenteesContent() {
  const { userData } = useAuth()
  const [mentees, setMentees] = useState<Mentee[]>([])
  const [filteredMentees, setFilteredMentees] = useState<Mentee[]>([])
  const [classes, setClasses] = useState<ClassInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedClassId, setSelectedClassId] = useState<string>("")
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({})
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    const fetchData = async () => {
      if (!userData) return

      try {
        // Fetch mentees assigned to this mentor
        const menteesRef = collection(db, "mentees")
        const menteesQuery = query(menteesRef, where("assignedMentorId", "==", userData.uid))
        const menteesSnapshot = await getDocs(menteesQuery)

        const assignedMentees: Mentee[] = []
        menteesSnapshot.forEach((doc) => {
          const data = doc.data()
          assignedMentees.push({
            uid: doc.id,
            firstName: data.firstName || "",
            lastName: data.lastName || "",
            middleName: data.middleName || "",
            email: data.email || "",
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
            profileImage: data.profileImage || "",
            photoURL: data.photoURL || "",
            hasEdited: data.hasEdited || false
          })
        })

        // Fetch all classes to get class details
        const classesRef = collection(db, "classes")
        const classesSnapshot = await getDocs(classesRef)

        const allClasses: ClassInfo[] = []
        classesSnapshot.forEach((doc) => {
          const data = doc.data()
          allClasses.push({
            id: doc.id,
            name: data.name || "",
            year: data.year || "",
            section: data.section || "",
            stream: data.stream || "",
            adminId: data.adminId || ""
          })
        })

        setMentees(assignedMentees)
        setFilteredMentees(assignedMentees)
        setClasses(allClasses)
      } catch (error) {
        console.error("Error fetching data:", error)
        toast.error("Failed to load mentees")
      } finally {
        setLoading(false)
      }
    }

    if (userData && userData.role === "mentor") {
      fetchData()
    }
  }, [userData])

  // Filter mentees by class
  const filterMenteesByClass = (menteesList: Mentee[], classId: string): Mentee[] => {
    if (!classId) return menteesList
    return menteesList.filter(mentee => mentee.classId === classId)
  }

  // Filter mentees by search term
  const filterMenteesBySearch = (menteesList: Mentee[], search: string): Mentee[] => {
    if (!search) return menteesList
    const searchLower = search.toLowerCase()
    return menteesList.filter(mentee => 
      mentee.firstName?.toLowerCase().includes(searchLower) ||
      mentee.lastName?.toLowerCase().includes(searchLower) ||
      mentee.email?.toLowerCase().includes(searchLower) ||
      mentee.enrollmentNo?.toLowerCase().includes(searchLower)
    )
  }

  // Handle class filter change
  const handleClassFilterChange = (classId: string) => {
    setSelectedClassId(classId)
    let filtered = mentees
    filtered = filterMenteesByClass(filtered, classId)
    filtered = filterMenteesBySearch(filtered, searchTerm)
    setFilteredMentees(filtered)
  }

  // Handle search term change
  const handleSearchChange = (search: string) => {
    setSearchTerm(search)
    let filtered = mentees
    filtered = filterMenteesByClass(filtered, selectedClassId)
    filtered = filterMenteesBySearch(filtered, search)
    setFilteredMentees(filtered)
  }

  const getSelectedClassName = () => {
    if (!selectedClassId) return "All Classes"
    const selectedClass = classes.find(cls => cls.id === selectedClassId)
    return selectedClass ? selectedClass.name : "All Classes"
  }

  const exportMenteeDetails = async (classId: string) => {
    try {
      const classMentees = mentees.filter(mentee => mentee.classId === classId)
      const selectedClass = classes.find(cls => cls.id === classId)
      
      if (classMentees.length === 0) {
        toast.error("No mentees found for this class")
        return
      }

      const exportData = classMentees.map(mentee => ({
        'First Name': mentee.firstName,
        'Last Name': mentee.lastName,
        'Middle Name': mentee.middleName || '',
        'Email': mentee.email,
        'Enrollment No': mentee.enrollmentNo,
        'Registration No': mentee.registrationNo,
        'Parents Name': mentee.parentsName,
        'Parents Contact': mentee.parentsContact,
        'Class': mentee.className,
        'Admission Batch': mentee.admissionBatch,
        'Class Roll No': mentee.classRollNo,
        'Date of Birth': mentee.dob,
        'Section': mentee.section,
        'Stream': mentee.stream
      }))

      const ws = XLSX.utils.json_to_sheet(exportData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, "Mentees")
      
      const fileName = `${selectedClass?.name || 'Class'}_Mentees_${new Date().toISOString().split('T')[0]}.xlsx`
      XLSX.writeFile(wb, fileName)
      
      toast.success("Mentee details exported successfully!")
    } catch (error) {
      console.error("Error exporting mentee details:", error)
      toast.error("Failed to export mentee details")
    }
  }

  const toggleCardExpansion = (menteeId: string) => {
    setExpandedCards(prev => ({
      ...prev,
      [menteeId]: !prev[menteeId]
    }))
  }

  if (!userData || userData.role !== "mentor") {
    return null
  }

  return (
    <div className="space-y-8">
        <div>
        <h1 className="text-4xl font-bold text-gray-800">My Mentees</h1>
        <p className="text-muted-foreground text-lg mt-2">Manage mentees assigned to you by admins</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search mentees..."
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          />
        </div>

        <div className="flex gap-2">
          <Select value={selectedClassId} onValueChange={handleClassFilterChange}>
            <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filter by class" />
                </SelectTrigger>
                <SelectContent>
              <SelectItem value="">All Classes</SelectItem>
              {classes.map((cls) => (
                <SelectItem key={cls.id} value={cls.id}>
                  {cls.name} - {cls.stream}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

          {selectedClassId && (
            <Button
              onClick={() => exportMenteeDetails(selectedClassId)}
              className="bg-green-600 hover:bg-green-700"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
              </Button>
          )}
                </div>
              </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500"></div>
          </div>
      ) : mentees.length === 0 ? (
        <Card className="border-0 shadow-lg rounded-xl overflow-hidden">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <GraduationCap className="h-16 w-16 text-amber-300 mb-4" />
            <p className="text-xl font-medium text-gray-800 mb-2">No mentees assigned yet</p>
            <p className="text-sm text-muted-foreground text-center mb-4">
              You haven't been assigned any mentees yet. Contact an admin to get started.
            </p>
          </CardContent>
        </Card>
      ) : filteredMentees.length === 0 ? (
        <Card className="border-0 shadow-lg rounded-xl overflow-hidden">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <User className="h-16 w-16 text-amber-300 mb-4" />
            <p className="text-xl font-medium text-gray-800 mb-2">No mentees found</p>
            <p className="text-sm text-muted-foreground text-center">
              No mentees match your current filters.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence>
            {filteredMentees.map((mentee) => (
              <motion.div
                key={mentee.uid}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="border-0 shadow-lg rounded-xl overflow-hidden card-hover">
                  <CardHeader className="bg-gradient-to-r from-amber-500/20 to-amber-500/5">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        {mentee.profileImage || mentee.photoURL ? (
                          <Image
                            src={mentee.profileImage || mentee.photoURL || ""}
                            alt={mentee.firstName}
                            width={48}
                            height={48}
                            className="rounded-full"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                            <span className="text-amber-600 font-semibold text-lg">
                              {mentee.firstName?.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        {mentee.hasEdited && (
                          <div className="absolute -top-1 -right-1 bg-green-500 rounded-full p-1">
                            <Check className="h-3 w-3 text-white" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-lg">
                          {mentee.firstName} {mentee.lastName}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">{mentee.email}</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600 font-medium">Enrollment No</p>
                          <p className="text-gray-800">{mentee.enrollmentNo}</p>
                        </div>
                        <div>
                          <p className="text-gray-600 font-medium">Class</p>
                          <p className="text-gray-800">{mentee.className}</p>
                        </div>
                        <div>
                          <p className="text-gray-600 font-medium">Section</p>
                          <p className="text-gray-800">{mentee.section}</p>
                        </div>
                        <div>
                          <p className="text-gray-600 font-medium">Stream</p>
                          <p className="text-gray-800">{mentee.stream}</p>
                        </div>
                      </div>

                    {expandedCards[mentee.uid] && (
                      <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="space-y-3 pt-3 border-t border-gray-200"
                        >
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-gray-600 font-medium">Registration No</p>
                              <p className="text-gray-800">{mentee.registrationNo}</p>
                            </div>
                            <div>
                              <p className="text-gray-600 font-medium">Admission Batch</p>
                              <p className="text-gray-800">{mentee.admissionBatch}</p>
                            </div>
                            <div>
                              <p className="text-gray-600 font-medium">Class Roll No</p>
                              <p className="text-gray-800">{mentee.classRollNo}</p>
                            </div>
                            <div>
                              <p className="text-gray-600 font-medium">Date of Birth</p>
                              <p className="text-gray-800">{mentee.dob}</p>
                            </div>
                            <div className="col-span-2">
                              <p className="text-gray-600 font-medium">Parents Name</p>
                              <p className="text-gray-800">{mentee.parentsName}</p>
                            </div>
                            <div className="col-span-2">
                              <p className="text-gray-600 font-medium">Parents Contact</p>
                              <p className="text-gray-800">{mentee.parentsContact}</p>
                            </div>
                          </div>
                        </motion.div>
                      )}

                      <div className="flex justify-between items-center pt-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleCardExpansion(mentee.uid)}
                          className="border-amber-200 hover:bg-amber-50 text-amber-700"
                        >
                          {expandedCards[mentee.uid] ? (
                            <>
                              <EyeOff className="h-4 w-4 mr-2" />
                              Show Less
                            </>
                          ) : (
                            <>
                              <Eye className="h-4 w-4 mr-2" />
                              Show More
                            </>
                          )}
                        </Button>

                        <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              asChild
                            >
                            <Link href={`/mentor/edit-mentee/${mentee.uid}`}>
                                <Edit className="h-4 w-4 mr-2" />
                              Edit
                              </Link>
                            </Button>
                          </div>
                        </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
              ))}
          </AnimatePresence>
          </div>
      )}

      <Toaster />
      </div>
  )
}

export default function MentorMentees() {
  return (
      <DashboardLayout>
      <Suspense fallback={<div>Loading...</div>}>
      <MentorMenteesContent />
    </Suspense>
    </DashboardLayout>
  )
}
