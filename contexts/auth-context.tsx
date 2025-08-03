"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import {
  type User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth"
import { doc, setDoc, getDoc } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"
import { useMounted } from "@/hooks/use-mounted"

type UserRole = "super-admin" | "admin" | "mentor" | "mentee"

interface UserData {
  uid: string
  email: string | null
  firstName: string
  lastName: string
  middleName?: string
  isActive: boolean
  role: UserRole
  canBeMentor?: boolean // Admin can also be mentor
  currentRole?: UserRole // Currently active role for switching
  assignedMentorId?: string
  profileImage?: string
  photoURL?: string
  // Keep name for backward compatibility
  name?: string
}

interface AuthContextType {
  user: User | null
  userData: UserData | null
  loading: boolean
  signUp: (email: string, password: string, firstName: string, lastName: string, role: UserRole, mentorId?: string, middleName?: string) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  switchRole: (newRole: UserRole) => void
  getAvailableRoles: () => UserRole[]
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [userData, setUserData] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const mounted = useMounted()

  useEffect(() => {
    if (!mounted) return

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user)

      if (user) {
        // Check different collections based on user type
        let userData = null

        try {
          // Check all role-specific collections
          
          // First check super-admins collection
          const superAdminDoc = await getDoc(doc(db, "super-admins", user.uid))
          if (superAdminDoc.exists()) {
            userData = superAdminDoc.data() as UserData
          } else {
            // Check admins collection
            const adminDoc = await getDoc(doc(db, "admins", user.uid))
            if (adminDoc.exists()) {
              userData = adminDoc.data() as UserData
            } else {
              // Check mentors collection
              const mentorDoc = await getDoc(doc(db, "mentors", user.uid))
              if (mentorDoc.exists()) {
                userData = mentorDoc.data() as UserData
              } else {
                // Check mentees collection
                const menteeDoc = await getDoc(doc(db, "mentees", user.uid))
                if (menteeDoc.exists()) {
                  userData = menteeDoc.data() as UserData
                }
              }
            }
          }

          if (userData) {
            setUserData(userData)
          }
        } catch (error: any) {
          // Handle permission errors gracefully during admin creation process
          if (error.code === 'permission-denied' || error.message?.includes('insufficient permissions')) {
            console.log("⚠️ Temporary permission issue during account creation process - this is normal")
            // Don't log as error, this happens during admin creation when auth context switches
          } else {
            console.error("Error fetching user data:", error)
          }
        }
        
        setLoading(false)
      } else {
        setUserData(null)
        setLoading(false)
      }
    })

    return () => unsubscribe()
  }, [mounted])

  const signUp = async (email: string, password: string, firstName: string, lastName: string, role: UserRole, mentorId?: string, middleName?: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      const user = userCredential.user

      // Create user document in Firestore
      const userData: UserData = {
        uid: user.uid,
        email: user.email,
        firstName,
        lastName,
        middleName: middleName || undefined,
        isActive: true,
        // Create full name for backward compatibility
        name: middleName ? `${firstName} ${middleName} ${lastName}` : `${firstName} ${lastName}`,
        role,
        ...(role === "mentee" && mentorId ? { assignedMentorId: mentorId } : {}),
      }

      // Store in appropriate collection based on role
      let collectionName = "users" // fallback
      switch (role) {
        case "super-admin":
          collectionName = "super-admins"
          break
        case "admin":
          collectionName = "admins"
          break
        case "mentor":
          collectionName = "mentors"
          break
        case "mentee":
          collectionName = "mentees"
          break
        default:
          collectionName = "users"
      }

      await setDoc(doc(db, collectionName, user.uid), userData)
      setUserData(userData)
    } catch (error) {
      console.error("Error signing up:", error)
      throw error
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password)
    } catch (error) {
      console.error("Error signing in:", error)
      throw error
    }
  }

  const logout = async () => {
    try {
      await signOut(auth)
    } catch (error) {
      console.error("Error signing out:", error)
      throw error
    }
  }

  const switchRole = (newRole: UserRole) => {
    if (userData && getAvailableRoles().includes(newRole)) {
      setUserData({
        ...userData,
        currentRole: newRole
      })
    }
  }

  const getAvailableRoles = (): UserRole[] => {
    if (!userData) return []
    
    const roles: UserRole[] = [userData.role]
    
    // If admin can be mentor, add mentor role
    if (userData.role === "admin" && userData.canBeMentor) {
      roles.push("mentor")
    }
    
    return roles
  }

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return (
      <AuthContext.Provider value={{ user: null, userData: null, loading: true, signUp, signIn, logout, switchRole, getAvailableRoles }}>
        {children}
      </AuthContext.Provider>
    )
  }

  return (
    <AuthContext.Provider value={{ user, userData, loading, signUp, signIn, logout, switchRole, getAvailableRoles }}>{children}</AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
