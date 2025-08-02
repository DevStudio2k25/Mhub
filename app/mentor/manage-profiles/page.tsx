"use client"

import { useEffect, useState } from "react"
import { collection, doc, getDoc, getDocs, updateDoc, query, where } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/contexts/auth-context"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import { toast } from "sonner"

interface Mentee {
  uid: string
  name: string
  email: string
  enrollmentNo?: string
  classId?: string
  hasEdited?: boolean
  profileEditAllowed?: {
    allowedAt: number
    expiresAt: number
    allowedBy: string
  }
}

interface Class {
  id: string
  name: string
  year: string
  section: string
}

export default function ManageProfiles() {
  const { userData } = useAuth()
  const [mentees, setMentees] = useState<Mentee[]>([])
  const [classes, setClasses] = useState<Class[]>([])
  const [selectedClassId, setSelectedClassId] = useState<string | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMentees, setSelectedMentees] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [userData])

  const fetchData = async () => {
    if (!userData) return

    try {
      // Fetch classes created by this mentor from Firestore
      const classesQuery = query(collection(db, "classes"), where("mentorId", "==", userData.uid))
      const classesSnapshot = await getDocs(classesQuery)
      const classesData: Class[] = []

      classesSnapshot.forEach((doc) => {
        const data = doc.data()
        classesData.push({
          id: doc.id,
          name: data.name,
          year: data.year,
          section: data.section
        })
      })
      setClasses(classesData)

      // Fetch mentees assigned to this mentor from Firestore
      const menteesQuery = query(collection(db, "mentees"), where("assignedMentorId", "==", userData.uid))
      const menteesSnapshot = await getDocs(menteesQuery)
      const menteesData: Mentee[] = []

      menteesSnapshot.forEach((doc) => {
        const data = doc.data()
        menteesData.push({
          uid: doc.id,
          name: data.name,
          email: data.email,
          enrollmentNo: data.enrollmentNo,
          classId: data.classId,
          hasEdited: data.hasEdited,
          profileEditAllowed: data.profileEditAllowed
        })
      })
      setMentees(menteesData)
      setLoading(false)
    } catch (error) {
      console.error("Error fetching data:", error)
      setLoading(false)
    }
  }

  const toggleMenteeSelection = (menteeId: string) => {
    const newSelected = new Set(selectedMentees)
    if (newSelected.has(menteeId)) {
      newSelected.delete(menteeId)
    } else {
      newSelected.add(menteeId)
    }
    setSelectedMentees(newSelected)
  }

  const allowProfileEdits = async () => {
    if (!userData) {
      toast.error("Not authorized");
      return;
    }

    if (selectedMentees.size === 0) {
      toast.error("Please select at least one mentee")
      return
    }

    try {
      const now = Date.now();
      const expiresAt = now + (24 * 60 * 60 * 1000); // 24 hours from now

      const profileEditData = {
        allowedAt: now,
        expiresAt,
        allowedBy: userData.uid
      };

      // Update each selected mentee in Firestore
      await Promise.all(
        Array.from(selectedMentees).map(async (menteeId) => {
          const menteeRef = doc(db, "mentees", menteeId)
          
          // Update mentee document with new profile edit permissions
          await updateDoc(menteeRef, {
            hasEdited: false, // Reset hasEdited to false when allowing new edits
            profileEditAllowed: profileEditData
          })
        })
      );

      toast.success("Profile edit permissions granted successfully!");
      setSelectedMentees(new Set());
      fetchData(); // Refresh the list
    } catch (error) {
      console.error("Error allowing profile edits:", error);
      toast.error("Failed to grant profile edit permissions");
    }
  };

  const getFilteredMentees = () => {
    return mentees.filter(mentee => {
      const matchesClass = selectedClassId === "all" || mentee.classId === selectedClassId;
      const searchTerm = searchQuery.toLowerCase().trim();
      const matchesSearch = !searchTerm ||
        mentee.name.toLowerCase().includes(searchTerm) ||
        (mentee.enrollmentNo?.toLowerCase() || "").includes(searchTerm);
      return matchesClass && matchesSearch;
    });
  }

  const isProfileEditAllowed = (mentee: Mentee) => {
    if (!mentee.profileEditAllowed) return false
    return Date.now() < mentee.profileEditAllowed.expiresAt
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto py-4 sm:py-6 px-4 sm:px-6 space-y-4 sm:space-y-6">
        <Card>
          <CardHeader className="pb-4 sm:pb-6">
            <CardTitle className="text-xl sm:text-2xl">Manage Profile Edit Permissions</CardTitle>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            <div className="space-y-4 sm:space-y-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
                <div className="flex-1 relative">
                  <Input
                    type="text"
                    placeholder="Search by name or enrollment no"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-10 sm:h-9"
                  />
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
                <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                  <SelectTrigger className="w-full sm:w-[240px] h-10 sm:h-9">
                    <SelectValue placeholder="Filter by class" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Classes</SelectItem>
                    {classes.map(cls => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.name} - {cls.year} {cls.section}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  onClick={allowProfileEdits}
                  disabled={selectedMentees.size === 0}
                  className="bg-amber-500 hover:bg-amber-600 h-10 sm:h-9 w-full sm:w-auto"
                >
                  Allow Profile Edits (24h)
                </Button>
              </div>

              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-amber-500"></div>
                </div>
              ) : (
                <div className="grid gap-3 sm:gap-4 grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
                  {getFilteredMentees().map(mentee => (
                  <Card key={mentee.uid} className={`relative min-h-[140px] ${isProfileEditAllowed(mentee) ? 'border-green-200 bg-green-50' : ''
                    }`}>
                    <CardContent className="pt-4 sm:pt-6 px-4 sm:px-6 pb-4 sm:pb-6">
                      <div className="absolute top-3 sm:top-4 right-3 sm:right-4">
                        <Checkbox
                          checked={selectedMentees.has(mentee.uid)}
                          onCheckedChange={() => toggleMenteeSelection(mentee.uid)}
                          disabled={isProfileEditAllowed(mentee) && !mentee.hasEdited}
                          className="h-4 w-4 sm:h-5 sm:w-5"
                        />
                      </div>
                      <div className="space-y-2 pr-8">
                        <h3 className="font-medium text-sm sm:text-base flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                          <span className="break-words">{mentee.name}</span>
                          {mentee.hasEdited && (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-normal self-start">
                              Updated
                            </span>
                          )}
                        </h3>
                        <p className="text-xs sm:text-sm text-gray-500 break-all">{mentee.enrollmentNo}</p>
                        {isProfileEditAllowed(mentee) && (
                          <div className="space-y-1">
                            <p className="text-xs text-green-600 break-words">
                              Profile edit enabled until{" "}
                              {new Date(mentee.profileEditAllowed!.expiresAt).toLocaleString()}
                            </p>
                            {!mentee.hasEdited ? (
                              <p className="text-xs text-amber-600">
                                Waiting for mentee to update profile
                              </p>
                            ) : (
                              <p className="text-xs text-blue-600">
                                Profile updated - You can allow new edits
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
