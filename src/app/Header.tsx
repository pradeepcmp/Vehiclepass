"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button";
import { LogOut, Menu, X, Copyright } from "lucide-react";
import logo from '@/app/Images/SPACE LOGO 3D 03.png';
import Image from 'next/image';
import axios from 'axios'
import { Alert, AlertDescription } from '@/components/ui/alert'
import PrivateRoute from '@/app/protectedRoute'

const api = axios.create({
  baseURL: 'https://cust.spacetextiles.net',
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json',
  },
})

export default function HeaderWithFooter() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const router = useRouter()
  const [error, setError] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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
      
      // Fallback logout mechanism
      clearSpecificCookies()
      
      setErrorMessage('Logout failed. Redirecting...')
      setError(true)
      
      setTimeout(() => router.push('/login'), 1500)
    } finally {

    }
  }

  if (pathname === "/" || pathname === "/track" || pathname === "/parkinglist") {
    return <></>;
  }

  return (
    <>
    <PrivateRoute>
      <header
        className={`fixed top-0 z-50 w-full transition-all duration-300 ${
          scrolled
            ? "bg-white dark:bg-slate-900/20 backdrop-blur-sm shadow-lg"
            : "bg-white dark:bg-white"
        }`}
      >
        <div className="mx-auto max-w-12xl">
          <div className="flex h-20 items-center justify-between px-4 lg:px-8">
            {/* Logo and Company Name */}
            <div onClick={() => router.push('/parkinghome')} className="flex items-center space-x-4 group">
              <div className="relative h-14 w-auto transition-transform duration-300 group-hover:scale-105">
                <Image
                  src={logo}
                  alt="Space Textiles"
                  width={100}
                  height={100}
                  priority
                  className="h-14 w-auto justify-items-start object-contain"
                />
              </div>
              <div className="border-l border-gray-300 dark:border-gray-700 h-10 mx-2 hidden md:block"></div>
              <div className="hidden md:block">
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600 text-transparent bg-clip-text tracking-tight">
                  Space Group of Companies
                </h1>
                <p className="text-sm font-medium text-blue-600 dark:text-blue-400 tracking-wide">
                  Enterprise Smart Parking Management
                </p>
              </div>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <div className="hidden md:flex items-center space-x-3 bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-100">
                <span className="flex items-center text-gray-700">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 mr-2 animate-pulse"></span>
                  <span className="font-medium text-sm">System Active</span>
                </span>
                <span className="text-gray-300">|</span>
                <span className="text-gray-700 font-medium text-sm">{new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
              </div>
            </div>
              <Button
                onClick={handleLogout}
                variant="outline"
                size="sm"
                className="bg-gradient-to-r from-red-700 via-red-600 to-red-500 text-white border-none shadow-lg hover:from-red-800 hover:via-red-700 hover:to-red-600 transition-all rounded-lg px-4 py-2"
              >
                <LogOut className="mr-2 h-4 w-4 text-white" />
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

            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="h-5 w-5 text-red-500" /> : <Menu className="h-5 w-5 text-blue-500" />}
              <span className="sr-only">Toggle menu</span>
            </Button>
            {isMenuOpen && (
              <div 
                className="md:hidden fixed inset-0 bg-black/20 z-40" 
                onClick={() => setIsMenuOpen(false)}
              >
                <div 
                  className="absolute top-20 left-0 w-full bg-white dark:bg-slate-900 shadow-lg"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex flex-col space-y-4 p-4">
                    <div className="block md:hidden text-center">
                      <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600 text-transparent bg-clip-text tracking-tight">
                        Space Group of Companies
                      </h1>
                      <p className="text-sm font-medium text-blue-600 dark:text-blue-400 tracking-wide">
                        Enterprise Smart Parking Management
                      </p>
                    </div>
                    <Button
                onClick={handleLogout}
                variant="outline"
                size="sm"
                className="bg-gradient-to-r from-red-700 via-red-600 to-red-500 text-white border-none shadow-lg hover:from-red-800 hover:via-red-700 hover:to-red-600 transition-all rounded-lg px-4 py-2"
              >
                <LogOut className="mr-2 h-4 w-4 text-white" />
                Logout
              </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 w-full bg-white dark:bg-slate-900/20 backdrop-blur-sm shadow-lg py-2 z-50">
        <div className="container mx-auto px-4 flex items-center justify-center text-gray-600 dark:text-gray-300">
          <Copyright className="mr-2 h-4 w-4 text-blue-500" />
          <span className="text-sm font-bold bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600 text-transparent bg-clip-text">
            {new Date().getFullYear()} Space Textiles Pvt Ltd All Rights Reserved.
          </span>
        </div>
      </footer>
      </PrivateRoute>
    </>
  );
}