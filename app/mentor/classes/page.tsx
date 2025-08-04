"use client"

import { useEffect, useState } from "react"
import { collection, getDocs, query, where } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/contexts/auth-context"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Users, Eye, GraduationCap } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface ClassInfo {
  id: string
  name: string
  year: string
  section: string
  stream: string
  description: string
  adminId: string
  createdAt: any
  studentCount?: number
}

interface Mentee {
  uid: string
  firstName: string
  lastName: string
  email: string
  classId: string
  className: string
  assignedMentorId: string
}

export default function MentorClasses() {
  const { userData } = useAuth()
  const { toast } = useToast()
  const [classes, setClasses] = useState<ClassInfo[]>([])
  const [mentees, setMentees] = useState<Mentee[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      if (!userData) return

      try {
        // Fetch all classes from Firestore
        const classesRef = collection(db, "classes")
        const classesSnapshot = await getDocs(classesRef)

        const allClasses: ClassInfo[] = []
        classesSnapshot.forEach((doc) => {
          const data = doc.data()
          allClasses.push({
            id: doc.id,
            ...data,
          })
        })

        // Fetch mentees assigned to this mentor
        const menteesRef = collection(db, "mentees")
        const menteesQuery = query(menteesRef, where("assignedMentorId", "==", userData.uid))
        const menteesSnapshot = await getDocs(menteesQuery)

        const assignedMentees: Mentee[] = []
        menteesSnapshot.forEach((doc) => {
          const data = doc.data()
          assignedMentees.push({
            uid: doc.id,
            ...data,
          })
        })

        // Get unique class IDs from assigned mentees
        const assignedClassIds = [...new Set(assignedMentees.map(mentee => mentee.classId))]

        // Filter classes that have mentees assigned to this mentor
        const mentorClasses = allClasses.filter(cls => assignedClassIds.includes(cls.id))

        // Add student count to each class
        const classesWithCounts = mentorClasses.map(cls => ({
          ...cls,
          studentCount: assignedMentees.filter(mentee => mentee.classId === cls.id).length
        }))

        setClasses(classesWithCounts)
        setMentees(assignedMentees)
      } catch (error) {
        console.error("Error fetching data:", error)
        toast({
          title: "Error",
          description: "Failed to load classes",
          variant: "destructive"
        })
      } finally {
        setLoading(false)
      }
    }

    if (userData && userData.role === "mentor") {
      fetchData()
    }
  }, [userData, toast])

  if (!userData || userData.role !== "mentor") {
    return null
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto py-8 px-6">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">My Classes</h1>
            <p className="text-muted-foreground">Classes assigned to you by admins</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : classes.length === 0 ? (
          <div className="text-center py-12">
            <GraduationCap className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">No Classes Assigned</h3>
            <p className="text-gray-500">You haven't been assigned any classes yet. Contact an admin to get started.</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {classes.map((classInfo) => {
              const classMentees = mentees.filter(mentee => mentee.classId === classInfo.id)
              
              return (
                <Card key={classInfo.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{classInfo.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {classInfo.stream} • Year {classInfo.year} • Section {classInfo.section}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {classInfo.description && (
                      <p className="text-sm text-gray-600 mb-4">{classInfo.description}</p>
                    )}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="h-4 w-4" />
                        <span>{classMentees.length} mentees assigned</span>
                      </div>
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-2" />
                        View Mentees
                      </Button>
                    </div>
                    
                    {classMentees.length > 0 && (
                      <div className="mt-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Assigned Mentees:</h4>
                        <div className="space-y-1">
                          {classMentees.slice(0, 3).map((mentee) => (
                            <div key={mentee.uid} className="flex items-center gap-2 text-sm">
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                              <span>{mentee.firstName} {mentee.lastName}</span>
                            </div>
                          ))}
                          {classMentees.length > 3 && (
                            <div className="text-xs text-gray-500">
                              +{classMentees.length - 3} more mentees
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
