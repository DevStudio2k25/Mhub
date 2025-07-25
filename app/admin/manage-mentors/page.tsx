"use client"

import { useEffect, useState } from "react"
import { ref, get, update } from "firebase/database"
import { db } from "@/lib/firebase"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { Card, CardContent } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import { Image } from "@/components/ui/image"
import { ChevronDown, ChevronUp } from "lucide-react"

interface Mentor {
  uid: string
  name: string
  email: string
  profileImage?: string
  photoURL?: string
  hasAdminAccess?: boolean
}

export default function ManageMentors() {
  const [mentors, setMentors] = useState<Mentor[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({})
  const { toast } = useToast()

  // Fetch all mentors
  useEffect(() => {
    const fetchMentors = async () => {
      try {
        const usersRef = ref(db, 'users')
        const snapshot = await get(usersRef)
        const users = snapshot.val()

        if (users) {
          const mentorsList = Object.values(users)
            .filter((user: any) => user.role === "mentor")
            .map((mentor: any) => ({
              uid: mentor.uid,
              name: mentor.name,
              email: mentor.email,
              profileImage: mentor.profileImage,
              photoURL: mentor.photoURL,
              hasAdminAccess: mentor.hasAdminAccess || false
            }))
          setMentors(mentorsList)
        }
        setLoading(false)
      } catch (error) {
        console.error("Error fetching mentors:", error)
        setLoading(false)
      }
    }

    fetchMentors()
  }, [])

  // Toggle card expansion
  const toggleCardExpansion = (mentorId: string) => {
    setExpandedCards(prev => ({
      ...prev,
      [mentorId]: !prev[mentorId]
    }))
  }

  // Toggle admin access for a mentor
  const toggleAdminAccess = async (mentorId: string, currentValue: boolean) => {
    try {
      const mentorRef = ref(db, `users/${mentorId}`)
      await update(mentorRef, {
        hasAdminAccess: !currentValue
      })

      // Update local state
      setMentors(mentors.map(mentor =>
        mentor.uid === mentorId
          ? { ...mentor, hasAdminAccess: !currentValue }
          : mentor
      ))

      toast({
        title: "Access Updated",
        description: `Admin access ${!currentValue ? "enabled" : "disabled"} for ${mentors.find(m => m.uid === mentorId)?.name}`,
      })
    } catch (error) {
      console.error("Error updating mentor access:", error)
      toast({
        title: "Error",
        description: "Failed to update mentor access",
        variant: "destructive",
      })
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Manage Mentors Access</h1>
          <p className="text-muted-foreground text-lg mt-2">Control admin access for mentors in the system</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {mentors.map((mentor) => (
              <Card key={mentor.uid} className="border-0 shadow-lg rounded-xl overflow-hidden w-full">
                <CardContent className="p-0">
                  {/* Header - Always visible */}
                  <div
                    className="bg-gradient-to-r from-purple-500 to-purple-700 p-4 flex items-center justify-between cursor-pointer hover:from-purple-600 hover:to-purple-800 transition-colors w-full"
                    onClick={() => toggleCardExpansion(mentor.uid)}
                  >
                    <div className="flex items-center space-x-4 flex-1 min-w-0">
                      <div className="h-12 w-12 rounded-full bg-purple-300 flex items-center justify-center text-purple-800 font-semibold relative overflow-hidden flex-shrink-0">
                        {mentor.profileImage || mentor.photoURL ? (
                          <Image
                            src={mentor.profileImage || mentor.photoURL || ''}
                            alt={mentor.name}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          mentor.name.substring(0, 2).toUpperCase()
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-white truncate">{mentor.name}</h3>
                        <p className="text-sm text-purple-100 truncate">{mentor.email}</p>
                      </div>
                    </div>

                    <div className="flex-shrink-0">
                      {expandedCards[mentor.uid] ? (
                        <ChevronUp className="h-5 w-5 text-purple-100" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-purple-100" />
                      )}
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {expandedCards[mentor.uid] && (
                    <div className="p-6 bg-white">
                      <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <label className="text-sm font-medium text-gray-500 block mb-1">Name</label>
                            <p className="text-gray-800 font-medium">{mentor.name}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-500 block mb-1">Email</label>
                            <p className="text-gray-800 break-all">{mentor.email}</p>
                          </div>
                        </div>

                        <div className="border-t pt-6">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-800 mb-2">Admin Access Control</h4>
                              <p className="text-sm text-gray-500">
                                {mentor.hasAdminAccess
                                  ? "This mentor has admin privileges and can access admin features"
                                  : "This mentor has standard mentor privileges only"
                                }
                              </p>
                            </div>
                            <div className="flex-shrink-0">
                              <Switch
                                checked={mentor.hasAdminAccess}
                                onCheckedChange={() => toggleAdminAccess(mentor.uid, mentor.hasAdminAccess || false)}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
