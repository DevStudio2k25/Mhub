"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createUserWithEmailAndPassword } from "firebase/auth"
import { collection, doc, setDoc, getDocs, query, where, orderBy, limit } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Shield, Eye, EyeOff, User, Mail, Lock, Key, Building, BookOpen, Check, X } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"

export default function Register() {
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [middleName, setMiddleName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordRequirements, setPasswordRequirements] = useState({
    minLength: true,
    uppercase: true,
    lowercase: true,
    numbers: true,
    specialChars: true
  })
  const router = useRouter()

  // Generate unique Super Admin ID
  const generateSuperAdminId = async () => {
    const prefix = "MHUEM" // MH (MentorHub) + UEM (UEM College)
    const currentYear = new Date().getFullYear().toString().slice(-2) // Last 2 digits of year

    try {
      // Simple approach: use timestamp for uniqueness
      const timestamp = Date.now().toString().slice(-8)
      return `${prefix}${currentYear}${timestamp}`
    } catch (error) {
      console.error("Error generating super admin ID:", error)
      // Fallback ID with random number
      const randomNum = Math.floor(Math.random() * 100000000).toString().padStart(8, '0')
      return `${prefix}${currentYear}${randomNum}`
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!firstName || !lastName || !email || !password || !confirmPassword) {
      setError("Please fill all required fields")
      return
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    // Dynamic password validation based on selected requirements
    const validationErrors = []

    if (passwordRequirements.minLength && password.length < 8) {
      validationErrors.push("at least 8 characters")
    }

    if (passwordRequirements.uppercase && !/[A-Z]/.test(password)) {
      validationErrors.push("uppercase letter")
    }

    if (passwordRequirements.lowercase && !/[a-z]/.test(password)) {
      validationErrors.push("lowercase letter")
    }

    if (passwordRequirements.numbers && !/\d/.test(password)) {
      validationErrors.push("number")
    }

    if (passwordRequirements.specialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      validationErrors.push("special character")
    }

    if (validationErrors.length > 0) {
      setError(`Password must contain: ${validationErrors.join(", ")}`)
      return
    }

    setIsLoading(true)

    try {
      // Generate unique Super Admin ID
      const superAdminId = await generateSuperAdminId()

      // Create super admin account
      const superAdminCredential = await createUserWithEmailAndPassword(auth, email, password)
      const superAdminUser = superAdminCredential.user

      // Save super admin data to super-admins collection
      const fullName = middleName 
        ? `${firstName} ${middleName} ${lastName}`
        : `${firstName} ${lastName}`
      
      const superAdminData = {
        uid: superAdminUser.uid,
        email: superAdminUser.email,
        firstName: firstName,
        lastName: lastName,
        middleName: middleName || undefined,
        name: fullName, // Keep for backward compatibility
        role: "super-admin",
        superAdminId: superAdminId,
        organization: "UEM College",
        createdAt: new Date().toISOString(),
        createdBy: "self", // First super admin creates themselves
        lastLogin: new Date().toISOString(),
        isActive: true
      }

      // Create document in Firestore
      await setDoc(doc(db, "super-admins", superAdminUser.uid), superAdminData)

      // Redirect to super admin dashboard
      router.push("/super-admin/dashboard")
    } catch (error: any) {
      console.error("Error creating super admin:", error)
      setError(error.message || "Failed to create account")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-red-100 to-orange-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center items-center gap-3 mb-4">
            <div className="bg-red-600 rounded-xl p-3 text-white shadow-lg">
              <BookOpen size={32} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">
                Mentor<span className="text-red-600">Hub</span>
              </h1>
              <p className="text-sm text-gray-600">UEM College</p>
            </div>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">System Administrator Setup</h2>
            <p className="text-gray-600 text-sm">Create the first Super Administrator account for the system</p>
          </div>
        </div>

        {/* Registration Card */}
        <Card className="border-0 shadow-2xl rounded-2xl overflow-hidden bg-white/95 backdrop-blur-sm">
          <CardHeader className="bg-gradient-to-r from-red-600 via-red-500 to-orange-500 text-white p-8">
            <div className="flex items-center justify-center mb-4">
              <div className="bg-white/20 p-4 rounded-full">
                <Shield className="h-10 w-10" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-center">Super Admin Registration</CardTitle>
            <CardDescription className="text-red-100 text-center text-lg">
              Secure account creation with unique identification
            </CardDescription>
          </CardHeader>

          <CardContent className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="p-4 text-sm text-white bg-red-500 rounded-lg border-l-4 border-red-700">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    {error}
                  </div>
                </div>
              )}

              {/* Personal Information Section */}
              <div className="bg-gray-50 rounded-xl p-6 space-y-4">
                <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <User className="h-5 w-5 text-red-600" />
                  Personal Information
                </h3>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName" className="text-sm font-medium text-gray-700">First Name *</Label>
                    <div className="relative mt-1">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        id="firstName"
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="Enter your first name"
                        className="pl-10 border-gray-300 focus:border-red-500 focus:ring-red-500"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="lastName" className="text-sm font-medium text-gray-700">Last Name *</Label>
                    <div className="relative mt-1">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        id="lastName"
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Enter your last name"
                        className="pl-10 border-gray-300 focus:border-red-500 focus:ring-red-500"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="middleName" className="text-sm font-medium text-gray-700">Middle Name (Optional)</Label>
                  <div className="relative mt-1">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      id="middleName"
                      type="text"
                      value={middleName}
                      onChange={(e) => setMiddleName(e.target.value)}
                      placeholder="Enter your middle name (optional)"
                      className="pl-10 border-gray-300 focus:border-red-500 focus:ring-red-500"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="email" className="text-sm font-medium text-gray-700">Email Address *</Label>
                  <div className="relative mt-1">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@uem.edu.in"
                      className="pl-10 border-gray-300 focus:border-red-500 focus:ring-red-500"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Security Section */}
              <div className="bg-gray-50 rounded-xl p-6 space-y-6">
                <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <Lock className="h-5 w-5 text-red-600" />
                  Security Credentials
                </h3>

                {/* Password Requirements Selector */}
                <div className="bg-white rounded-lg p-4 border">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Password Requirements (Select what to include)</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="minLength"
                        checked={passwordRequirements.minLength}
                        onCheckedChange={(checked) =>
                          setPasswordRequirements(prev => ({ ...prev, minLength: !!checked }))
                        }
                      />
                      <Label htmlFor="minLength" className="text-sm text-gray-600">
                        Minimum 8 characters
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="uppercase"
                        checked={passwordRequirements.uppercase}
                        onCheckedChange={(checked) =>
                          setPasswordRequirements(prev => ({ ...prev, uppercase: !!checked }))
                        }
                      />
                      <Label htmlFor="uppercase" className="text-sm text-gray-600">
                        Uppercase letters (A-Z)
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="lowercase"
                        checked={passwordRequirements.lowercase}
                        onCheckedChange={(checked) =>
                          setPasswordRequirements(prev => ({ ...prev, lowercase: !!checked }))
                        }
                      />
                      <Label htmlFor="lowercase" className="text-sm text-gray-600">
                        Lowercase letters (a-z)
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="numbers"
                        checked={passwordRequirements.numbers}
                        onCheckedChange={(checked) =>
                          setPasswordRequirements(prev => ({ ...prev, numbers: !!checked }))
                        }
                      />
                      <Label htmlFor="numbers" className="text-sm text-gray-600">
                        Numbers (0-9)
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="specialChars"
                        checked={passwordRequirements.specialChars}
                        onCheckedChange={(checked) =>
                          setPasswordRequirements(prev => ({ ...prev, specialChars: !!checked }))
                        }
                      />
                      <Label htmlFor="specialChars" className="text-sm text-gray-600">
                        Special characters (!@#$...)
                      </Label>
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="password" className="text-sm font-medium text-gray-700">Password *</Label>
                    <div className="relative mt-1">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        className="pl-10 pr-10 border-gray-300 focus:border-red-500 focus:ring-red-500"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>

                    {/* Real-time Password Validation */}
                    {password && (
                      <div className="mt-2 space-y-1">
                        <div className="text-xs">
                          {passwordRequirements.minLength && (
                            <div className={`flex items-center gap-1 ${password.length >= 8 ? 'text-green-600' : 'text-red-500'}`}>
                              {password.length >= 8 ? <Check size={12} /> : <X size={12} />}
                              <span>At least 8 characters</span>
                            </div>
                          )}
                          {passwordRequirements.uppercase && (
                            <div className={`flex items-center gap-1 ${/[A-Z]/.test(password) ? 'text-green-600' : 'text-red-500'}`}>
                              {/[A-Z]/.test(password) ? <Check size={12} /> : <X size={12} />}
                              <span>Uppercase letter</span>
                            </div>
                          )}
                          {passwordRequirements.lowercase && (
                            <div className={`flex items-center gap-1 ${/[a-z]/.test(password) ? 'text-green-600' : 'text-red-500'}`}>
                              {/[a-z]/.test(password) ? <Check size={12} /> : <X size={12} />}
                              <span>Lowercase letter</span>
                            </div>
                          )}
                          {passwordRequirements.numbers && (
                            <div className={`flex items-center gap-1 ${/\d/.test(password) ? 'text-green-600' : 'text-red-500'}`}>
                              {/\d/.test(password) ? <Check size={12} /> : <X size={12} />}
                              <span>Number</span>
                            </div>
                          )}
                          {passwordRequirements.specialChars && (
                            <div className={`flex items-center gap-1 ${/[!@#$%^&*(),.?":{}|<>]/.test(password) ? 'text-green-600' : 'text-red-500'}`}>
                              {/[!@#$%^&*(),.?":{}|<>]/.test(password) ? <Check size={12} /> : <X size={12} />}
                              <span>Special character</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">Confirm Password *</Label>
                    <div className="relative mt-1">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm your password"
                        className="pl-10 pr-10 border-gray-300 focus:border-red-500 focus:ring-red-500"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>

                    {/* Password Match Validation */}
                    {confirmPassword && (
                      <div className="mt-2">
                        <div className={`flex items-center gap-1 text-xs ${password === confirmPassword ? 'text-green-600' : 'text-red-500'}`}>
                          {password === confirmPassword ? <Check size={12} /> : <X size={12} />}
                          <span>Passwords match</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* System Information */}
              <div className="bg-blue-50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2 mb-4">
                  <Key className="h-5 w-5 text-blue-600" />
                  System Information
                </h3>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-blue-600" />
                    <span className="text-gray-600">Organization:</span>
                    <span className="font-medium">UEM College</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-blue-600" />
                    <span className="text-gray-600">Role:</span>
                    <span className="font-medium">Super Administrator</span>
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white py-3 text-lg font-semibold rounded-xl shadow-lg transition-all duration-200 transform hover:scale-[1.02]"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center gap-3">
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                    <span>Creating Super Admin Account...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-3">
                    <Shield className="h-5 w-5" />
                    <span>Create Super Admin Account</span>
                  </div>
                )}
              </Button>
            </form>

            <div className="mt-8 text-center">
              <div className="bg-gray-100 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-2">
                  Already have an account?
                </p>
                <button
                  onClick={() => router.push("/login")}
                  className="text-red-600 hover:text-red-700 font-medium text-sm underline"
                >
                  Sign in to your account
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-xs text-gray-500">
            © 2025 MentorHub - UEM College. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  )
}
