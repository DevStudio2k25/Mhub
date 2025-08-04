"use client"

import { useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { RefreshCw, ArrowRightLeft, ShieldCheck, UserCog } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

export default function AccountSwitcher() {
  const { userData, switchToLinkedAccount } = useAuth()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  if (!userData?.hasLinkedAccount) return null

  const currentAccountType = userData.role
  const targetAccountType = userData.linkedAccountType

  const getAccountIcon = (accountType: string) => {
    switch (accountType) {
      case "admin":
        return <ShieldCheck className="h-4 w-4" />
      case "mentor":
        return <UserCog className="h-4 w-4" />
      default:
        return null
    }
  }

  const getAccountLabel = (accountType: string) => {
    switch (accountType) {
      case "admin":
        return "Administrator"
      case "mentor":
        return "Mentor"
      default:
        return accountType
    }
  }

  const getAccountBadgeClass = (accountType: string) => {
    switch (accountType) {
      case "admin":
        return "bg-amber-100 text-amber-800 border-amber-200"
      case "mentor":
        return "bg-blue-100 text-blue-800 border-blue-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const handleAccountSwitch = async () => {
    if (!targetAccountType) return

    setIsLoading(true)
    try {
      await switchToLinkedAccount()
      
      // Redirect to appropriate dashboard
      if (targetAccountType === "admin") {
        router.push("/admin/dashboard")
      } else if (targetAccountType === "mentor") {
        router.push("/mentor/dashboard")
      }

      toast.success(`Successfully switched to ${getAccountLabel(targetAccountType)} account`)
      
    } catch (error: any) {
      console.error("Error switching account:", error)
      toast.error(error.message || "Failed to switch account")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500 hidden sm:block">Account:</span>
      
      {/* Current Account Badge */}
      <Badge className={`${getAccountBadgeClass(currentAccountType)} text-xs px-2 py-1 flex items-center gap-1`}>
        {getAccountIcon(currentAccountType)}
        {getAccountLabel(currentAccountType)}
      </Badge>

      {/* Switch Button */}
      <Button
        onClick={handleAccountSwitch}
        disabled={isLoading}
        size="sm"
        className="h-8 gap-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white border-0 shadow-md hover:shadow-lg transition-all duration-200"
      >
        {isLoading ? (
          <RefreshCw className="h-4 w-4 animate-spin" />
        ) : (
          <ArrowRightLeft className="h-4 w-4" />
        )}
        <span className="hidden sm:inline">Switch to</span>
        <Badge className={`${getAccountBadgeClass(targetAccountType || '')} text-xs px-2 py-0.5 flex items-center gap-1`}>
          {getAccountIcon(targetAccountType || '')}
          <span className="hidden sm:inline">{getAccountLabel(targetAccountType || '')}</span>
        </Badge>
      </Button>
    </div>
  )
}