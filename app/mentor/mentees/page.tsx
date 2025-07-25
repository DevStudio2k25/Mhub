"use client"

import { useEffect, useState, Suspense } from "react"
import { ref, get, set } from "firebase/database"
import { db, auth } from "@/lib/firebase"
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
  UserPlus, 
  Check, 
  X, 
  Plus, 
  Filter, 
  ChevronDown, 
  Edit, 
  Eye, 
  EyeOff,
  CheckCircle2,
  LogIn,
  UserPlus2,
  Download
} from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createUserWithEmailAndPassword, sendEmailVerification, signInWithEmailAndPassword, signOut } from "firebase/auth"
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
  description: string
  mentorId: string
}

interface Mentee {
  uid: string
  name: string
  email: string
  enrollmentNo: string
  class: string
  year: string
  section: string
  assignedMentorId: string
  classId?: string
  profileImage?: string
  photoURL?: string
  parentMobile?: string
  password?: string
  hasEdited?: boolean
}

function MentorMenteesContent() {
  const { userData } = useAuth()
  const [mentees, setMentees] = useState<Mentee[]>([])
  const [filteredMentees, setFilteredMentees] = useState<Mentee[]>([])
  const [classes, setClasses] = useState<ClassInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isSuccessDialogOpen, setIsSuccessDialogOpen] = useState(false)
  const [createdMentee, setCreatedMentee] = useState<Mentee | null>(null)
  const [selectedClassId, setSelectedClassId] = useState<string>("")
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({})
  const [newMentee, setNewMentee] = useState({
    name: "",
    email: "",
    password: generateRandomPassword(), // Auto-generate password initially
    enrollmentNo: "",
    class: "",
    year: "",
    section: "",
    classId: "",
    parentMobile: "",
  })
  
  // Function to generate a secure random password
  function generateRandomPassword() {
    const lowercase = Math.random().toString(36).slice(-6); // 6 lowercase chars
    const uppercase = Math.random().toString(36).toUpperCase().slice(-2); // 2 uppercase chars
    const numbers = Math.floor(Math.random() * 90 + 10); // 2 digit number
    const special = "!@#$%^&*"[Math.floor(Math.random() * 8)]; // 1 special character
    
    // Combine and shuffle
    const combined = lowercase + uppercase + numbers + special;
    return combined.split('').sort(() => 0.5 - Math.random()).join('');
  }
  const [error, setError] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [mentorPassword, setMentorPassword] = useState("")
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const [redirectCountdown, setRedirectCountdown] = useState(0)
  const [showRedirectCountdown, setShowRedirectCountdown] = useState(false)
  const [menteePassword, setMenteePassword] = useState("")
  const router = useRouter()
  const searchParams = useSearchParams()
  const classIdParam = searchParams.get('classId')

  useEffect(() => {
    const fetchClasses = async () => {
      if (!userData) return

      try {
        // Fetch classes from Realtime Database
        const classesRef = ref(db, "classes")
        const classesSnapshot = await get(classesRef)

        const classesData: ClassInfo[] = []
        if (classesSnapshot.exists()) {
          const allClasses = classesSnapshot.val()

          // Filter classes created by this mentor
          Object.entries(allClasses).forEach(([id, data]: [string, any]) => {
            if (data.mentorId === userData.uid) {
              classesData.push({
                id,
                ...data,
              })
            }
          })
        }

        setClasses(classesData)
        
        // If there's a classId in the URL, set it as the selected class
        if (classIdParam) {
          setSelectedClassId(classIdParam)
        }
      } catch (error) {
        console.error("Error fetching classes:", error)
      }
    }

    if (userData && userData.role === "mentor") {
      fetchClasses()
    }
  }, [userData, classIdParam])

  useEffect(() => {
    const fetchMentees = async () => {
      if (!userData) return

      try {
        setLoading(true);
        // Fetch users from Realtime Database
        const usersRef = ref(db, "users")
        const usersSnapshot = await get(usersRef)

        const menteesData: Mentee[] = []
        if (usersSnapshot.exists()) {
          const allUsers = usersSnapshot.val()

          // Filter mentees assigned to this mentor
          await Promise.all(
            Object.entries(allUsers).map(async ([uid, data]: [string, any]) => {
              if (data.role === "mentee" && data.assignedMentorId === userData.uid) {
                // Get additional mentee data if needed
                const menteeRef = ref(db, `mentees/${uid}`)
                const menteeSnapshot = await get(menteeRef)
                const additionalData = menteeSnapshot.exists() ? menteeSnapshot.val() : {}

                menteesData.push({
                  uid,
                  ...data,
                  ...additionalData,
                  // Ensure these fields exist
                  enrollmentNo: data.enrollmentNo || additionalData.enrollmentNo || '',
                  name: data.name || additionalData.name || '',
                  email: data.email || additionalData.email || '',
                  classId: data.classId || additionalData.classId || '',
                  parentMobile: data.parentMobile || additionalData.parentMobile || '',
                  password: data.password || additionalData.password || ''
                })
              }
            })
          )
        }

        // Sort mentees by name
        menteesData.sort((a, b) => a.name.localeCompare(b.name))

        setMentees(menteesData)
        setFilteredMentees(filterMenteesByClass(menteesData, selectedClassId))
        
        if (menteesData.length === 0) {
          toast.info("No mentees found. Add mentees to get started.")
        }
      } catch (error) {
        console.error("Error fetching mentees:", error)
        toast.error("Failed to fetch mentees. Please refresh the page.")
      } finally {
        setLoading(false)
      }
    }

    if (userData && userData.role === "mentor") {
      fetchMentees()
    }
  }, [userData, selectedClassId])

  // Filter mentees by class
  const filterMenteesByClass = (menteesList: Mentee[], classId: string): Mentee[] => {
    if (!classId) {
      return menteesList;
    } else {
      return menteesList.filter(mentee => mentee.classId === classId);
    }
  }

  // When selected class changes, update filtered mentees
  useEffect(() => {
    setFilteredMentees(filterMenteesByClass(mentees, selectedClassId))
  }, [selectedClassId, mentees])

  // Check if enrollment number already exists
  const checkDuplicateEnrollment = async (enrollmentNo: string) => {
    try {
      const usersRef = ref(db, 'users')
      const usersSnapshot = await get(usersRef)
      
      if (usersSnapshot.exists()) {
        const users = usersSnapshot.val()
        return Object.values(users).some((user: any) => 
          user.enrollmentNo === enrollmentNo
        )
      }
      return false
    } catch (error) {
      console.error('Error checking enrollment number:', error)
      return false
    }
  }

  const handleCreateMentee = async () => {
    if (!newMentee.name || !newMentee.email || !newMentee.password || 
        !newMentee.enrollmentNo || !newMentee.class || !newMentee.year || 
        !newMentee.section || !newMentee.classId || !newMentee.parentMobile) {
      setError("Please fill all fields")
      return
    }

    // Check for duplicate enrollment number
    const isDuplicate = await checkDuplicateEnrollment(newMentee.enrollmentNo)
    if (isDuplicate) {
      setError("A mentee with this enrollment number already exists")
      return
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(newMentee.email)) {
      setError("Please enter a valid email address")
      return
    }

    // Password validation (at least 6 characters)
    if (newMentee.password.length < 6) {
      setError("Password must be at least 6 characters long")
      return
    }

    setIsCreating(true)
    setError("")

    try {
      // Store current mentor credentials
      const mentorEmail = auth.currentUser?.email
      const mentorUid = auth.currentUser?.uid

      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        newMentee.email,
        newMentee.password
      )

      const user = userCredential.user

      // Create user document in Firestore
      const menteeUserData = {
        uid: user.uid,
        name: newMentee.name,
        email: newMentee.email,
        enrollmentNo: newMentee.enrollmentNo,
        class: newMentee.class,
        year: newMentee.year,
        section: newMentee.section,
        classId: newMentee.classId,
        role: "mentee",
        assignedMentorId: userData?.uid || "",
        parentMobile: newMentee.parentMobile,
        password: newMentee.password, // Store password for export
        createdAt: new Date().toISOString(),
      }

      // Add user to users collection
      const usersRef = ref(db, `users/${user.uid}`)
      await set(usersRef, menteeUserData)

      // Sign out the newly created mentee account and sign back in as mentor
      await signOut(auth)
      
      // Sign back in as mentor
      if (mentorEmail) {
        try {
          await signInWithEmailAndPassword(auth, mentorEmail, mentorPassword)
        } catch (error) {
          console.error("Error signing back in as mentor:", error)
        }
      }

      // Update mentees list
      setMentees([...mentees, { ...menteeUserData, uid: user.uid }])
      
      // Store created mentee data for success dialog
      setCreatedMentee({ ...menteeUserData, uid: user.uid })
      
      // Store the password for login purposes
      setMenteePassword(newMentee.password)
      
      // Close the create dialog and open success dialog
      setIsDialogOpen(false)
      setIsSuccessDialogOpen(true)
      
      // Start countdown for redirection
      setRedirectCountdown(15)
      setShowRedirectCountdown(true)
      
      // Filter mentees if a class is selected
      if (selectedClassId) {
        const updatedMentees = [...mentees, { ...menteeUserData, uid: user.uid }];
        const filteredMentees = filterMenteesByClass(updatedMentees, selectedClassId);
        setFilteredMentees(filteredMentees);
      }

      // Reset form
      setNewMentee({
        name: "",
        email: "",
        password: generateRandomPassword(), // Generate a new random password for the next mentee
        enrollmentNo: "",
        class: "",
        year: "",
        section: "",
        classId: "",
        parentMobile: "",
      })
    } catch (error: any) {
      console.error("Error creating mentee:", error)
      setError(error.message)
    } finally {
      setIsCreating(false)
    }
  }
  
  const handleOpenMenteeAccount = (menteeId: string) => {
    router.push(`/mentor/edit-mentee/${menteeId}`)
  }
  
  // Handle login as mentee
  const handleLoginAsMentee = async () => {
    if (!createdMentee) return
    
    try {
      // Sign out current user (mentor)
      await signOut(auth);
      
      // Sign in as mentee
      await signInWithEmailAndPassword(auth, createdMentee.email, menteePassword);
      
      // Redirect to mentee dashboard
      router.push("/mentee/dashboard");
    } catch (error) {
      console.error("Error logging in as mentee:", error);
    }
  }
  
  // Handle add another mentee
  const handleAddAnotherMentee = () => {
    setIsSuccessDialogOpen(false)
    setIsDialogOpen(true)
  }

  // Get the selected class name for display
  const getSelectedClassName = () => {
    if (!selectedClassId) return "All Classes"
    const selectedClass = classes.find(c => c.id === selectedClassId)
    return selectedClass ? `${selectedClass.name} - ${selectedClass.year} (${selectedClass.section})` : "Selected Class"
  }

  // Export mentee details for a specific class
  const exportMenteeDetails = async (classId: string) => {
    try {
      // Get the class info
      const classInfo = classes.find(c => c.id === classId);
      if (!classInfo) {
        toast.error("Class information not found");
        return;
      }

      // Get all mentees for this class and sort by enrollment number
      const menteesInClass = mentees
        .filter(mentee => mentee.classId === classId)
        .sort((a, b) => {
          // Convert enrollment numbers to numbers for proper sorting
          const enrollA = parseInt(a.enrollmentNo || '0');
          const enrollB = parseInt(b.enrollmentNo || '0');
          return enrollA - enrollB;
        });

      if (menteesInClass.length === 0) {
        toast.error("No mentees found in this class");
        return;
      }

      // Prepare header row
      const header = [
        'Enrollment No.',
        'Student Name',
        'Account Password',
        'Class Details'
      ];

      // Prepare data rows with proper checks
      const data = menteesInClass.map(mentee => [
        mentee.enrollmentNo || 'Not assigned',
        mentee.name || 'Not provided',
        mentee.password || 'Contact administrator',
        `${classInfo.name} - ${classInfo.year} ${classInfo.section}`
      ]);

      // Create worksheet
      const ws = XLSX.utils.aoa_to_sheet([header, ...data]);

      // Set column widths
      const colWidths = [15, 25, 20, 25];
      ws['!cols'] = colWidths.map(width => ({ width }));

      // Style the header row
      for (let i = 0; i < header.length; i++) {
        const cellRef = XLSX.utils.encode_cell({ r: 0, c: i });
        if (!ws[cellRef]) ws[cellRef] = {};
        ws[cellRef].s = {
          font: { bold: true, color: { rgb: "000000" } },
          fill: { fgColor: { rgb: "FFE9A0" } }, // Light amber background
          alignment: { horizontal: "center", vertical: "center" },
          border: {
            top: { style: "thin" },
            bottom: { style: "thin" },
            left: { style: "thin" },
            right: { style: "thin" }
          }
        };
      }

      // Style data cells
      data.forEach((row, rowIndex) => {
        row.forEach((_, colIndex) => {
          const cellRef = XLSX.utils.encode_cell({ r: rowIndex + 1, c: colIndex });
          if (!ws[cellRef]) ws[cellRef] = {};
          ws[cellRef].s = {
            alignment: { horizontal: "left", vertical: "center" },
            border: {
              top: { style: "thin" },
              bottom: { style: "thin" },
              left: { style: "thin" },
              right: { style: "thin" }
            }
          };
        });
      });

      // Create workbook and add the worksheet
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, `${classInfo.name} Mentees`);

      // Generate filename with current date
      const currentDate = new Date().toLocaleDateString('en-IN').replace(/\//g, '-');
      const filename = `Class_${classInfo.name}_${classInfo.year}_${classInfo.section}_Mentees_${currentDate}.xlsx`;

      // Save file
      XLSX.writeFile(wb, filename);
      toast.success("Class details exported successfully!");

    } catch (error) {
      console.error("Error exporting class details:", error);
      toast.error("Failed to export class details. Please try again.");
    }
  };

  // Toggle card expansion
  const toggleCardExpansion = (menteeId: string) => {
    setExpandedCards(prev => ({
      ...prev,
      [menteeId]: !prev[menteeId]
    }))
  }

  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    if (showRedirectCountdown && redirectCountdown > 0) {
      timer = setTimeout(() => {
        setRedirectCountdown(redirectCountdown - 1);
      }, 1000);
    } else if (showRedirectCountdown && redirectCountdown === 0 && createdMentee) {
      // Redirect to mentee login
      setShowRedirectCountdown(false);
      handleLoginAsMentee();
    }
    
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [showRedirectCountdown, redirectCountdown, createdMentee]);

  if (!userData || userData.role !== "mentor") {
    return null
  }

  return (
    <DashboardLayout>
      <Toaster richColors position="top-center" />
      <div className="space-y-6 sm:space-y-8 px-4 sm:px-0">
        <div>
          <h1 className="text-2xl sm:text-4xl font-bold text-gray-800">My Mentees</h1>
          <p className="text-muted-foreground text-base sm:text-lg mt-2">View and manage your assigned mentees</p>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-2 w-full sm:w-auto">
            <Button 
              variant="outline" 
              className="border-amber-200 hover:bg-amber-50 text-amber-700 w-full sm:w-auto"
              asChild
            >
              <Link href="/mentor/classes">
                <Plus className="h-4 w-4 mr-2" />
                Manage Classes
              </Link>
            </Button>
            
            <div className="flex items-center gap-2 w-full sm:w-auto sm:ml-4">
              <Filter className="h-4 w-4 text-gray-500 flex-shrink-0" />
              <Select 
                value={selectedClassId || "all"} 
                onValueChange={(value) => setSelectedClassId(value === "all" ? "" : value)}
              >
                <SelectTrigger className="w-full sm:w-[250px] border-amber-200 focus:ring-amber-500">
                  <SelectValue placeholder="Filter by class" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {classes.map((classInfo) => (
                    <SelectItem key={classInfo.id} value={classInfo.id}>
                      {classInfo.name} - {classInfo.year} ({classInfo.section})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            
            // When opening the dialog
            if (open) {
              // Generate a new password if needed
              const newPassword = !newMentee.password ? generateRandomPassword() : newMentee.password;
              
              // If a class is selected in the filter, auto-select it in the form
              if (selectedClassId) {
                const selectedClass = classes.find(c => c.id === selectedClassId);
                
                if (selectedClass) {
                  // Auto-populate class details from the selected filter
                  setNewMentee(prev => ({
                    ...prev,
                    password: newPassword,
                    classId: selectedClassId,
                    class: selectedClass.name,
                    year: selectedClass.year,
                    section: selectedClass.section
                  }));
                } else {
                  // Just update the password if no class found
                  setNewMentee(prev => ({
                    ...prev,
                    password: newPassword
                  }));
                }
              } else {
                // Just update the password if no class selected
                setNewMentee(prev => ({
                  ...prev,
                  password: newPassword
                }));
              }
            }
          }}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2 w-full sm:w-auto">
                <UserPlus className="h-4 w-4" />
                <span>Add Mentee</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[800px]">
              <DialogHeader>
                <DialogTitle>Add New Mentee</DialogTitle>
                <DialogDescription>
                  Create a new mentee account. They will be able to log in with these credentials.
                </DialogDescription>
              </DialogHeader>
              {error && <div className="p-3 mb-4 text-sm text-white bg-red-500 rounded-md">{error}</div>}
              
              <div className="space-y-4 py-4">
                {/* Row 1: Name, Email, Password */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={newMentee.name}
                      onChange={(e) => setNewMentee({ ...newMentee, name: e.target.value })}
                      placeholder="Full Name"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newMentee.email}
                      onChange={(e) => setNewMentee({ ...newMentee, email: e.target.value })}
                      placeholder="email@example.com"
                    />
                  </div>
                  
                  <div className="space-y-2 relative">
                    <div className="flex justify-between">
                      <Label htmlFor="password">Password</Label>
                      <button
                        type="button"
                        onClick={() => {
                          const newPassword = generateRandomPassword();
                          setNewMentee({ ...newMentee, password: newPassword });
                        }}
                        className="text-xs text-blue-600 hover:text-blue-800"
                      >
                        Generate Random
                      </button>
                    </div>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={newMentee.password}
                        onChange={(e) => setNewMentee({ ...newMentee, password: e.target.value })}
                        placeholder="••••••••"
                      />
                      <button 
                        type="button" 
                        className="absolute right-3 top-1/2 -translate-y-1/2"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-gray-500" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-500" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* Row 2: Enrollment No, Class Selection */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="enrollmentNo">Enrollment No.</Label>
                    <Input
                      id="enrollmentNo"
                      value={newMentee.enrollmentNo}
                      onChange={(e) => setNewMentee({ ...newMentee, enrollmentNo: e.target.value })}
                      placeholder="e.g., 2023001"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="classId">Assign to Class</Label>
                    <Select 
                      value={newMentee.classId} 
                      onValueChange={(value) => {
                        // Handle "none" value
                        if (value === "none") {
                          setNewMentee({
                            ...newMentee,
                            classId: "",
                            class: "",
                            year: "",
                            section: ""
                          });
                          return;
                        }
                        
                        // Find the selected class
                        const selectedClass = classes.find(c => c.id === value);
                        
                        if (selectedClass) {
                          // Auto-populate class details
                          setNewMentee({
                            ...newMentee,
                            classId: value,
                            class: selectedClass.name,
                            year: selectedClass.year,
                            section: selectedClass.section
                          });
                        } else {
                          setNewMentee({
                            ...newMentee,
                            classId: value
                          });
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a class" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {classes.map((classInfo) => (
                          <SelectItem key={classInfo.id} value={classInfo.id}>
                            {classInfo.name} - {classInfo.year} ({classInfo.section})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Parent Mobile</Label>
                    <Input
                      id="parentMobile"
                      value={newMentee.parentMobile}
                      onChange={(e) => setNewMentee({ ...newMentee, parentMobile: e.target.value })}
                      placeholder="Parent's Mobile Number"
                    />
                  </div>
                </div>
                
                {/* Row 3: Class Details (auto-populated) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="class">Class</Label>
                    <Input
                      id="class"
                      value={newMentee.class}
                      onChange={(e) => setNewMentee({ ...newMentee, class: e.target.value })}
                      placeholder="e.g., B.Tech"
                      className={newMentee.classId !== "" ? "bg-gray-100" : ""}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="year">Year</Label>
                    <Input
                      id="year"
                      value={newMentee.year}
                      onChange={(e) => setNewMentee({ ...newMentee, year: e.target.value })}
                      placeholder="e.g., 2023"
                      className={newMentee.classId !== "" ? "bg-gray-100" : ""}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="section">Section</Label>
                    <Input
                      id="section"
                      value={newMentee.section}
                      onChange={(e) => setNewMentee({ ...newMentee, section: e.target.value })}
                      placeholder="e.g., A"
                      className={newMentee.classId !== "" ? "bg-gray-100" : ""}
                    />
                  </div>
                </div>
              </div>
              
              <DialogFooter className="mt-4">
                <Button type="submit" onClick={() => setShowPasswordDialog(true)} disabled={isCreating} className="bg-amber-500 hover:bg-amber-600">
                  {isCreating ? (
                    <span className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                      Creating...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <UserPlus className="h-4 w-4" />
                      Create Mentee
                    </span>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Success Dialog */}
        <Dialog open={isSuccessDialogOpen} onOpenChange={setIsSuccessDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                Mentee Account Created Successfully
              </DialogTitle>
              <DialogDescription>
                The mentee account has been created and is ready to use.
              </DialogDescription>
            </DialogHeader>
            <div className="p-4 bg-gray-50 rounded-md">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                  <User className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="font-medium">{createdMentee?.name}</p>
                  <p className="text-sm text-muted-foreground">{createdMentee?.email}</p>
                </div>
              </div>
              
              {showRedirectCountdown && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-md">
                  <p className="text-sm text-blue-700 flex items-center gap-2">
                    <span className="animate-pulse">⏱️</span>
                    Redirecting to mentee account in {redirectCountdown} seconds...
                  </p>
                </div>
              )}
            </div>
            <DialogFooter className="flex flex-col sm:flex-row gap-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsSuccessDialogOpen(false);
                  setShowRedirectCountdown(false);
                }}
                className="sm:flex-1"
              >
                Stay as Mentor
              </Button>
              <Button 
                onClick={handleLoginAsMentee}
                className="bg-amber-500 hover:bg-amber-600 sm:flex-1"
              >
                <LogIn className="h-4 w-4 mr-2" />
                Login as Mentee
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Mentor Password Dialog */}
        <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Confirm Your Password</DialogTitle>
              <DialogDescription>
                Please enter your password to continue. This is needed to sign back in after creating the mentee account.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="mentor-password">Your Password</Label>
                <div className="relative">
                  <Input
                    id="mentor-password"
                    type={showPassword ? "text" : "password"}
                    value={mentorPassword}
                    onChange={(e) => setMentorPassword(e.target.value)}
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
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setShowPasswordDialog(false)}
              >
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  setShowPasswordDialog(false);
                  handleCreateMentee();
                }}
                className="bg-amber-500 hover:bg-amber-600"
              >
                Continue
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Class filter indicator */}
        {selectedClassId && (
          <div className="bg-amber-50 p-3 sm:p-4 rounded-lg border border-amber-200 mb-6">
            <p className="text-amber-800 font-medium flex items-center text-sm sm:text-base">
              <Filter className="h-4 w-4 mr-2 flex-shrink-0" />
              <span className="break-words">Showing mentees from: {getSelectedClassName()}</span>
            </p>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500"></div>
          </div>
        ) : filteredMentees.length > 0 ? (
          <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0 mb-4 bg-amber-50 p-3 sm:p-4 rounded-lg">
              <div>
                <h2 className="text-lg sm:text-xl font-semibold text-gray-800 break-words">{getSelectedClassName()}</h2>
                <p className="text-sm text-gray-600 mt-1">{filteredMentees.length} mentees</p>
              </div>
              <Button
                variant="outline"
                onClick={() => exportMenteeDetails(selectedClassId || '')}
                className="flex items-center gap-2 border-amber-200 hover:bg-amber-100 text-amber-700 w-full sm:w-auto text-sm"
              >
                <Download className="h-4 w-4" />
                <span className="sm:inline">Export Class Details</span>
              </Button>
            </div>
            <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {filteredMentees.map((mentee) => (
                <Card key={mentee.uid} className="border-0 shadow-lg rounded-xl overflow-hidden group hover:ring-2 hover:ring-amber-200 transition-all">
                  <CardHeader className="bg-gradient-to-r from-amber-500 to-amber-600 text-white p-3 sm:p-4 flex flex-row items-center justify-between">
                    <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                      <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-white p-1 relative flex-shrink-0">
                        {mentee.photoURL ? (
                          <img 
                            src={mentee.photoURL} 
                            alt={mentee.name} 
                            className="h-full w-full rounded-full object-cover"
                          />
                        ) : (
                          <div className="h-full w-full rounded-full bg-amber-100 flex items-center justify-center">
                            <User className="h-5 w-5 sm:h-6 sm:w-6 text-amber-600" />
                          </div>
                        )}
                        {mentee.hasEdited && (
                          <div className="absolute -top-1 -right-1 h-3 w-3 sm:h-4 sm:w-4 bg-green-500 rounded-full flex items-center justify-center" title="Profile Updated">
                            <Check className="h-2 w-2 sm:h-3 sm:w-3 text-white" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-base sm:text-lg flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                          <span className="truncate">{mentee.name}</span>
                          {!mentee.hasEdited && (
                            <span className="text-xs bg-amber-400/20 px-2 py-0.5 rounded-full self-start sm:self-auto">
                              Not Updated
                            </span>
                          )}
                        </CardTitle>
                        <p className="text-xs sm:text-sm text-amber-100 truncate">{mentee.email}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-white hover:bg-amber-400/20 flex-shrink-0 h-8 w-8 sm:h-10 sm:w-10"
                      onClick={() => toggleCardExpansion(mentee.uid)}
                    >
                      <ChevronDown
                        className={cn(
                          "h-5 w-5 sm:h-6 sm:w-6 transform transition-transform",
                          expandedCards[mentee.uid] ? "rotate-180" : ""
                        )}
                      />
                    </Button>
                  </CardHeader>
                  <AnimatePresence>
                    {expandedCards[mentee.uid] && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="p-3 sm:p-4 space-y-3 sm:space-y-4">
                          <div className="space-y-2 sm:space-y-3">
                            <div className="bg-amber-50 p-3 sm:p-3 rounded-lg">
                              <p className="text-xs sm:text-sm text-amber-600 mb-1">Enrollment No.</p>
                              <p className="font-medium text-sm sm:text-base break-all">{mentee.enrollmentNo}</p>
                            </div>
                            <div className="bg-amber-50 p-3 sm:p-3 rounded-lg">
                              <p className="text-xs sm:text-sm text-amber-600 mb-1">Parent Mobile</p>
                              <p className="font-medium text-sm sm:text-base">{mentee.parentMobile || "Not updated"}</p>
                            </div>
                            <div className="bg-amber-50 p-3 sm:p-3 rounded-lg">
                              <p className="text-xs sm:text-sm text-amber-600 mb-1">Class Details</p>
                              <p className="font-medium text-sm sm:text-base break-words">{mentee.class} - {mentee.year} ({mentee.section})</p>
                            </div>
                            <div className="bg-amber-50 p-3 sm:p-3 rounded-lg">
                              <p className="text-xs sm:text-sm text-amber-600 mb-1">Profile Status</p>
                              <p className="font-medium text-sm sm:text-base flex items-center gap-2">
                                {mentee.hasEdited ? (
                                  <>
                                    <span className="text-green-600">Updated</span>
                                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                                  </>
                                ) : (
                                  <>
                                    <span className="text-amber-600">Not Updated</span>
                                    <Edit className="h-4 w-4 text-amber-600" />
                                  </>
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="mt-3 sm:mt-4">
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full h-10 sm:h-8 justify-center border-amber-200 hover:bg-amber-50 text-amber-700"
                              asChild
                            >
                              <Link href={`/mentor/edit-mentee/${mentee.uid}`} className="flex items-center">
                                <Edit className="h-4 w-4 mr-2" />
                                Edit Profile
                              </Link>
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          <Card className="border-0 shadow-lg rounded-xl overflow-hidden">
            <CardContent className="flex flex-col items-center justify-center p-6 sm:p-8">
              <User className="h-12 w-12 sm:h-16 sm:w-16 text-amber-300 mb-4" />
              {classes.length > 0 ? (
                <>
                  <div className="flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-0 mb-4 w-full">
                    <h2 className="text-lg sm:text-xl font-semibold text-gray-800 text-center sm:text-left break-words">
                      {getSelectedClassName()}
                    </h2>
                    {selectedClassId && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => exportMenteeDetails(selectedClassId)}
                        className="flex items-center gap-2 border-amber-200 hover:bg-amber-50 text-amber-700 w-full sm:w-auto"
                      >
                        <Download className="h-4 w-4" />
                        Export Class Details
                      </Button>
                    )}
                  </div>
                  <p className="text-lg sm:text-xl font-medium text-gray-800 mb-2 text-center">
                    {selectedClassId ? "No mentees in this class" : "No mentees assigned yet"}
                  </p>
                  <p className="text-sm text-muted-foreground text-center mb-4 px-4">
                    {selectedClassId 
                      ? "This class doesn't have any mentees yet. Add mentees to this class."
                      : "You don't have any mentees assigned to you at the moment"}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-lg sm:text-xl font-medium text-gray-800 mb-2 text-center">No classes created yet</p>
                  <p className="text-sm text-muted-foreground text-center mb-4 px-4">
                    Create classes first to organize your mentees
                  </p>
                  <Button 
                    className="bg-amber-500 hover:bg-amber-600 mb-2 w-full sm:w-auto"
                    asChild
                  >
                    <Link href="/mentor/classes">
                      <Plus className="h-4 w-4 mr-2" />
                      Create Classes
                    </Link>
                  </Button>
                </>
              )}
              {classes.length > 0 && (
                <Button 
                  className="bg-amber-500 hover:bg-amber-600 w-full sm:w-auto"
                  onClick={() => setIsDialogOpen(true)}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Mentee
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}

// Main export with Suspense wrapper
export default function MentorMentees() {
  return (
    <Suspense fallback={
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500"></div>
        </div>
      </DashboardLayout>
    }>
      <MentorMenteesContent />
    </Suspense>
  )
}
