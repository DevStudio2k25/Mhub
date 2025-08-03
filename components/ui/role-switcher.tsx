"use client"

import { useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { ChevronDown, ShieldCheck, UserCog, RefreshCw } from "lucide-react"
import { useRouter } from "next/navigation"

export default function RoleSwitcher() {
  const { userData, switchRole, getAvailableRoles } = useAuth()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  if (!userData) return null

  const availableRoles = getAvailableRoles()
  const currentRole = userData.currentRole || userData.role

  // Don't show switcher if user has only one role
  if (availableRoles.length <= 1) return null

  const handleRoleSwitch = async (newRole: string) => {
    if (newRole === currentRole) return

    setIsLoading(true)
    try {
      switchRole(newRole as any)
      
      // Redirect to appropriate dashboard
      if (newRole === "admin") {
        router.push("/admin/dashboard")
      } else if (newRole === "mentor") {
        router.push("/mentor/dashboard")
      }
    } catch (error) {
      console.error("Error switching role:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin":
        return <ShieldCheck className="h-4 w-4" />
      case "mentor":
        return <UserCog className="h-4 w-4" />
      default:
        return null
    }
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "admin":
        return "Administrator"
      case "mentor":
        return "Mentor"
      default:
        return role
    }
  }

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-amber-100 text-amber-800 border-amber-200"
      case "mentor":
        return "bg-blue-100 text-blue-800 border-blue-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500 hidden sm:block">Role:</span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-2 border-amber-200 hover:bg-amber-50"
            disabled={isLoading}
          >
            {isLoading ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              getRoleIcon(currentRole)
            )}
            <Badge className={`${getRoleBadgeClass(currentRole)} text-xs px-2 py-0.5`}>
              {getRoleLabel(currentRole)}
            </Badge>
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {availableRoles.map((role) => (
            <DropdownMenuItem
              key={role}
              onClick={() => handleRoleSwitch(role)}
              className={`flex items-center gap-2 cursor-pointer ${
                role === currentRole ? "bg-amber-50" : ""
              }`}
            >
              {getRoleIcon(role)}
              <span className="flex-1">{getRoleLabel(role)}</span>
              {role === currentRole && (
                <Badge className="bg-green-100 text-green-800 text-xs">
                  Active
                </Badge>
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}