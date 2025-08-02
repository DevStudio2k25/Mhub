"use client"

import DashboardLayout from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Shield, Lock } from "lucide-react"

export default function ManageMentors() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Manage Mentors Access</h1>
          <p className="text-muted-foreground text-lg mt-2">Control admin access for mentors in the system</p>
        </div>

        <Card className="border-0 shadow-lg rounded-xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-red-500 to-red-700 text-white">
            <div className="flex items-center space-x-3">
              <Lock className="h-8 w-8" />
              <div>
                <CardTitle className="text-xl">Access Restricted</CardTitle>
                <p className="text-red-100 mt-1">This feature is now limited to Super Admin accounts</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <Shield className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-gray-800 mb-2">Admin+Mentor Role Assignment</h3>
                  <p className="text-gray-600 leading-relaxed">
                    The ability to grant admin access to mentors has been moved to Super Admin accounts for enhanced security and better role management.
                  </p>
                </div>
              </div>
              
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <div className="h-5 w-5 bg-amber-400 rounded-full flex-shrink-0 mt-0.5"></div>
                  <div>
                    <h4 className="font-medium text-amber-800 mb-1">What this means:</h4>
                    <ul className="text-sm text-amber-700 space-y-1">
                      <li>• Only Super Admins can now assign admin privileges to mentors</li>
                      <li>• Existing admin+mentor accounts will continue to work normally</li>
                      <li>• Contact your Super Admin for any role changes needed</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <div className="h-5 w-5 bg-blue-400 rounded-full flex-shrink-0 mt-0.5"></div>
                  <div>
                    <h4 className="font-medium text-blue-800 mb-1">Need admin access for a mentor?</h4>
                    <p className="text-sm text-blue-700">
                      Please contact your Super Admin to request admin privileges for specific mentors. This ensures proper oversight and security compliance.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}