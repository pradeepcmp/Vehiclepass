"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import { LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import PARKING_CONNECT from '@/app/connection/config'

const api = axios.create({
  baseURL: `${PARKING_CONNECT}`,
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json',
  },
})

const LogoutButton = () => {
  const router = useRouter()
  const [error, setError] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const clearSpecificCookies = () => {
    try {
      // List of cookies to clear
      const cookiesToClear = ['user', 'token', 'accesspoint_hash', 'session']
      
      // List of paths where cookies might be set
      const paths = ['/', '/parkinghome' ]
      
      cookiesToClear.forEach(cookieName => {
        paths.forEach(path => {
          document.cookie = `${cookieName}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=${path}`
        })
      })
      
      console.log('Specific cookies cleared successfully')
      return true
    } catch (e) {
      console.error('Error clearing cookies:', e)
      return false
    }
  }

  const getUserDataFromCookie = () => {
    try {
      const cookies = document.cookie.split(';')
      
      for (const cookie of cookies) {
        const [name, value] = cookie.trim().split('=')
        
        if (name.trim() === 'user') {
          const decodedValue = decodeURIComponent(value)
          const userData = JSON.parse(decodedValue)
          
          if (userData && userData.user_code) {
            return {
              user_code: userData.user_code,
              user_name: userData.user_name
            }
          }
        }
      }
      return null
    } catch (e) {
      console.error('Error getting user data from cookie:', e)
      return null
    }
  }

  const handleLogout = async () => {
    try {
      const userData = getUserDataFromCookie()
      
      if (!userData || !userData.user_code) {
        // If no user data found, just clear cookies and redirect
        clearSpecificCookies()
        router.push('/')
        return
      }
      
      const response = await api.post('/order-logout', {
        user_code: userData.user_code
      })
      
      if (response.data.success) {
        clearSpecificCookies()
        router.push('/')
      } else {
        throw new Error(response.data.message || 'Logout failed')
      }
    } catch (error) {
      console.error('Logout error:', error)
      
      // Even if the server request fails, clear cookies locally
      clearSpecificCookies()
      
      setErrorMessage('Logging out...')
      setError(true)
      
      // Redirect after a short delay
      setTimeout(() => router.push('/login'), 1500)
    }
  }

  return (
    <div className="relative">
      <Button 
        onClick={handleLogout}
        variant="destructive" 
        className="absolute top-5 right-5 px-4 py-2 bg-red-600 hover:bg-red-700 transition-all hover:scale-105"
      >
        <LogOut className="mr-2 h-4 w-4" />
        Logout
      </Button>
      
      {error && (
        <Alert 
          variant="destructive"
          className="absolute top-20 right-5 w-64 bg-red-50 border-red-200"
        >
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}

export default LogoutButton