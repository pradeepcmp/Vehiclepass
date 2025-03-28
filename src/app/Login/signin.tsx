'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { setCookie, deleteCookie, getCookie } from 'cookies-next';
import logo from '@/app/Images/SPACE LOGO 3D 03.png';
import Image from 'next/image';
import { FormData, CombinedData } from '@/app/types/LoginTypes';
import useLocation  from '@/app/utils/log/useLocation';
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, MapPin, AlertCircle, CheckCircle, RefreshCw,HelpCircle, Eye, EyeOff, UserIcon, BuildingIcon,Globe, Moon, Sun, Languages, Lock, Fingerprint, BriefcaseIcon, CircleAlert} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { storeUserOnBlockchain } from '@/app/utils/log/blockchain'
import { verifyBlockchainUser } from '@/app/utils/log/blockchainUtils';
import PARKING_CONNECT from '@/app/connection/config'
import { jwtDecode } from 'jwt-decode';

const LoginForm = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [, setOtpSent] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isFormDisabled, setIsFormDisabled] = useState(true);
  const [, setDataFetched] = useState(false);
  const [selectedConcern, setSelectedConcern] = useState<string>('');
  const [selectedDivision, setSelectedDivision] = useState<string>('');
  const [showOtp, setShowOtp] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [combinedData, setCombinedData] = useState<CombinedData | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  const [loginStep, setLoginStep] = useState(1);
  const [userPin, setUserPin] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    userCode: '',
    concern: '',
    division: '',
    branch: '',
    parkingArea: '',
    otp: '',
  });
  const { locationState, refreshLocation } = useLocation();
  const [userPermissions, setUserPermissions] = useState({
    hasParkingAccess: false, hasParkingEntryAccess: false
  });
  // Animation states
  const [formVisible, setFormVisible] = useState(false);
  // Reset form data except userCode
  const resetFormFields = () => {
    setFormData(prev => ({
      ...prev,
      concern: '',
      division: '',
      branch: '',
      otp: '',
    }));
    setSelectedConcern('');
    setSelectedDivision('');
    setOtpSent(false);
    setDataFetched(false);
    setCombinedData(null);
    setLoginStep(1);
  };

  // Fetch combined data (roles, concerns, divisions, branches)
  const fetchCombinedData = useCallback(async () => {
    if (!formData.userCode || formData.userCode.trim() === '') {
      resetFormFields();
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage('');
      setIsFormDisabled(true);
      const response = await axios.get(`${PARKING_CONNECT}/getCombinedUserRoleDatas/${formData.userCode}`);
      
      const data = response.data;
      
      // Extract divisions from divisionBranches
      const divisions = Object.keys(data.divisionBranches).map(key => ({
        value: data.divisionBranches[key].value,
        label: data.divisionBranches[key].label,
        concern: data.divisionBranches[key].concern
      }));
      
      // Add divisions to the data
      const enrichedData = {
        ...data,
        divisions: divisions
      };
//   console.info(enrichedData);    
      setCombinedData(enrichedData);
      setDataFetched(true);
  
      // Ensure userRoles exist
      if (!data?.userRoles || data.userRoles.length === 0) {
        console.log("Data not found");
        setErrorMessage("Unauthorized");
        setIsFormDisabled(true)
        return;
      }
  
      // Extract authorized screens for the first portal
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let allAuthorizedScreens: any[] = [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data.userRoles.forEach((role: { portals: { screens: any; }[]; }) => {
        if (role.portals && Array.isArray(role.portals)) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          role.portals.forEach((portal: { screens: any; }) => {
            if (portal.screens && Array.isArray(portal.screens)) {
              allAuthorizedScreens = [...allAuthorizedScreens, ...portal.screens];
            }
          });
        }
      });
  // console.info("Found authorized screens",allAuthorizedScreens)
const hasParkingAccess = allAuthorizedScreens.some((screen: { value: string; }) => screen.value.toLowerCase() === "parkinghome");
const hasParkingEntryAccess = allAuthorizedScreens.some((screen: { value: string; }) => screen.value.toLowerCase() === "parkingsystem");
setUserPermissions({hasParkingAccess,hasParkingEntryAccess});
const userPin = data.user.method || null; // Extract PIN if it exists
console.info(userPin)
if (userPin) {
  // If PIN exists, set it in state for later use
  setUserPin(userPin);
}
// Check if any valid screen access exists
if (hasParkingAccess || hasParkingEntryAccess) {
  setIsFormDisabled(false);
} else {
  setErrorMessage("Unauthorized: No Portal Access");
  setIsFormDisabled(true);
  return;
}
      setIsFormDisabled(false);
      // Pre-select concern if only one exists
      if (data.concerns && data.concerns.length === 1) {
        const selectedConcern = data.concerns[0].value;
        setSelectedConcern(selectedConcern);
        setFormData(prev => ({ ...prev, concern: selectedConcern }));
      }
  
    } catch (error) {
      console.error('Error fetching data:', error);
      // Don't show error message for failed data fetch
    } finally {
      setIsLoading(false);
    }
  }, [formData.userCode]);

  // Load initial data when userCode changes
  useEffect(() => {
    if (formData.userCode && mounted) {
      fetchCombinedData();
    }
  }, [formData.userCode, mounted, fetchCombinedData]);

  // Set mounted state and trigger form animation
  useEffect(() => {
    setMounted(true);
    setTimeout(() => setFormVisible(true), 100);
    
    // Check for dark mode preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setDarkMode(prefersDark);
  }, []);

  useEffect(() => {
    const checkAuthentication = () => {
      const token = getCookie('token') as string | undefined;
      const user = getCookie('user') as string | undefined;
    
      if (token && user) {
        try {
          // Verify token expiration
          const decodedToken = jwtDecode(token);
          const currentTime = Date.now() / 1000;
    
          // Add a null check for exp
          if (decodedToken.exp && decodedToken.exp > currentTime) {
            // Parse user data safely
            const userData = JSON.parse(user);
            
            // Use window.location for more reliable cross-device redirection
            if (userData.hasParkingAccess || userData.parkingAccess) {
              window.location.href = "/parkinghome";
              return;
            } else if (userData.hasParkingEntryAccess) {
              window.location.href = "/parkingsystem";
              return;
            }
          }
        } catch (error) {
          console.error('Token verification failed', error);
          // Clear invalid tokens
          deleteCookie('token');
          deleteCookie('user');
        }
      }
    };
    
      checkAuthentication();
    }, [router]);

  // Toggle dark mode
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  // Handle input changes
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = e.target;
    
    if (name === 'userCode') {
      // Convert to uppercase and allow only alphabets and numbers
      const uppercaseValue = value.toUpperCase();
      const alphanumericValue = uppercaseValue.replace(/[^A-Z0-9]/g, '');
      
      if (alphanumericValue !== formData.userCode) {
        resetFormFields();
      }
      
      setFormData((prev) => ({ ...prev, [name]: alphanumericValue }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  // Handle select changes
  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (name === 'concern') {
      setSelectedConcern(value);
      setSelectedDivision('');
      setFormData((prev) => ({ ...prev, division: '', branch: '', parkingArea: '' }));
    }

    if (name === 'division') {
      setSelectedDivision(value);
      setFormData((prev) => ({ ...prev, branch: '', parkingArea: '' }));
    }
  };

  // Toggle OTP visibility
  const toggleOtpVisibility = () => {
    setShowOtp(!showOtp);
  };

  // Proceed to next step
  const proceedToNextStep = () => {
    if (loginStep === 1 && formData.userCode) {
      setLoginStep(2);
    }
  };

 // Modify the sendOTP function
const sendOTP = async () => {
  if (!locationState.data) {
    setErrorMessage('Please allow location access to continue');
    return;
  }

  setIsLoading(true);
  setErrorMessage('');

  // If PIN exists, skip OTP and go directly to verification step
  if (userPin==="PIN") {
    setOtpSent(true);
    setRememberMe(true);
    setLoginStep(3);
    setIsLoading(false);
    return;
  }

  try {
    const response = await axios.post(`${PARKING_CONNECT}/order-send-otp`, {
      userCode: formData.userCode,
      concern: formData.concern,
      division: formData.division,
      branch: formData.branch,
      parking_area: formData.parkingArea,
      portal:"Parking System"
    });

    if (response.data.success) {
      setOtpSent(true);
      setLoginStep(3);
    } else {
      setErrorMessage(response.data.message || 'Failed to send OTP');
    }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error('Error sending OTP:', error);
    setErrorMessage(
      error.response?.data?.message || 'Failed to send OTP. Please try again.'
    );
  } finally {
    setIsLoading(false);
  }
};


  // Modify the verifyOTP function
  const verifyOTP = async () => {
    if (!locationState?.data) {
      setErrorMessage("Please allow location access to continue");
      return;
    }
  
    setIsLoading(true);
    setErrorMessage("");
  
    try {
      const otpToVerify = userPin === "PIN" ? formData.otp : formData.otp;
    
      const response = await axios.post(`${PARKING_CONNECT}/order-verify-otp`, {
        user_code: formData.userCode,
        user_approval_concern: formData.concern,
        user_approval_branch: formData.branch,
        parking_area: formData.parkingArea,
        otp: otpToVerify,
        location: locationState.data.locationName,
        ip: locationState.data.ip,
        method: userPin,
        portal:"Parking System"
      });
  
      if (response.data.success) {
        // Clear existing cookies first
        deleteCookie("token");
        deleteCookie("user");
        deleteCookie("accesspoint_hash");

        // Prepare user data with extended information
        const cookieExpiry = rememberMe ? 7 * 24 * 60 * 60 : 24 * 60 * 60;
        
        const blockchainUserData = {
          userCode: formData.userCode,
          concern: formData.concern,
          division: formData.division,
          branch: formData.branch,
          parking_area: formData.parkingArea,
          timestamp: new Date().toISOString(),
          locationName: locationState.data.locationName,
          ipAddress: locationState.data.ip
        };
        
        const blockchainHash = await storeUserOnBlockchain(blockchainUserData);
        
        const userData = {
          ...response.data.user,
          blockchainVerification: blockchainHash,
          parkingArea: formData.parkingArea,
          hasParkingAccess: userPermissions.hasParkingAccess,
          hasParkingEntryAccess: userPermissions.hasParkingEntryAccess
        };

        // Set cookies with clear expiration
        setCookie("token", String(response.data.token), { 
          maxAge: cookieExpiry,
          path: '/' 
        });
        setCookie("user", JSON.stringify(userData), { 
          maxAge: cookieExpiry,
          path: '/' 
        });
        setCookie("accesspoint_hash", String(blockchainHash), { 
          maxAge: cookieExpiry,
          path: '/' 
        });

        // Use replace to prevent going back to login
        if (userPermissions.hasParkingAccess) {
          router.replace("/parkinghome");
        } else if (userPermissions.hasParkingEntryAccess) {
          router.replace("/parkingsystem");
        }
      } else {
        setErrorMessage(response.data.message || "Invalid Authentication");
      }
    } catch (error) {
      console.error("Authentication Error:", error);
      setErrorMessage("Authentication failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

// Add this useEffect to check blockchain verification on mount
useEffect(() => {
  if (mounted && formData.userCode) {
    verifyBlockchainUser(formData.userCode, setErrorMessage);
  }
}, [mounted, formData.userCode]);

  // Form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginStep === 1) {
      proceedToNextStep();
    } else if (loginStep === 2) {
      sendOTP();
    } else if (loginStep === 3) {
      verifyOTP();
    }
  };

  // Filter divisions based on selected concern
  const filteredDivisions = combinedData?.divisions.filter(
    (division) => !selectedConcern || division.concern === selectedConcern
  ) || [];

  // Get branches for selected division
  const availableBranches = 
    selectedDivision && combinedData?.divisionBranches[selectedDivision]?.branches || [];

  // Check if form is ready for OTP
  const isReadyForOTP = !isFormDisabled && 
                      formData.userCode && 
                      formData.concern && 
                      formData.division && 
                      formData.branch &&
                      formData.parkingArea;

  if (!mounted) {
    return null;
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 relative bg-pattern flex items-center justify-center p-4 ${darkMode ? 'bg-slate-900' : 'bg-gradient-to-br from-slate-100 to-slate-200'}`}>
      {/* Background pattern overlay */}
      <div className="absolute inset-0 bg-grid-pattern opacity-5 pointer-events-none"></div>
      
      {/* Theme Toggle */}
      <div className="absolute top-4 right-4">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="outline" 
                size="icon" 
                onClick={toggleDarkMode}
                className={`rounded-full p-2 ${darkMode ? 'bg-slate-800 text-yellow-400 border-slate-700' : 'bg-white text-slate-700'}`}
              >
                {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Toggle {darkMode ? 'Light' : 'Dark'} Mode</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      
      <Card 
        className={`w-full max-w-md shadow-2xl border-0 overflow-hidden transition-all duration-500 ease-in-out ${formVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'} ${darkMode ? 'bg-slate-800 text-white' : 'bg-white'}`}
        style={{ borderRadius: '1rem' }}
      >
        {/* Premium gradient header */}
        <div className="bg-gradient-to-r from-indigo-700 via-blue-600 to-purple-700 h-3 w-full"></div>     
        <CardHeader className="space-y-4 text-center pt-2 pb-2">
          <div className="flex justify-center items-center w-full">
            <div className={`relative ${darkMode ? 'drop-shadow-glow-blue' : ''}`}>
              <Image
                src={logo}
                alt="space"
                width={400}
                height={400}
                priority
                className="object-contain"
                style={{ 
                  filter: darkMode 
                    ? 'drop-shadow(0 0 8px rgba(59, 130, 246, 0.5))' 
                    : 'drop-shadow(0px 2px 4px rgba(0,0,0,0.2))' 
                }}
              />
            </div>
          </div>
          <div>
            <Badge 
              variant="outline" 
              className={` ${darkMode ? 'bg-indigo-900/30 text-indigo-300 border-indigo-700' : 'bg-indigo-50 text-indigo-700 border-indigo-200'}`}
            >
              <BriefcaseIcon className="h-3 w-3 mr-1" />
              Parking System Portal
            </Badge>
          </div>
        </CardHeader>
        
        {/* Login Steps Indicator */}
        <div className="px-6 mb-4">
          <div className="flex items-center justify-between">
            {[1, 2, 3].map((step) => (
              <React.Fragment key={step}>
                <div className="flex flex-col items-center">
                  <div 
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      loginStep === step 
                        ? 'bg-blue-600 text-white' 
                        : loginStep > step 
                          ? 'bg-green-600 text-white' 
                          : darkMode 
                            ? 'bg-slate-700 text-slate-300' 
                            : 'bg-slate-200 text-slate-600'
                    } transition-colors`}
                  >
                    {loginStep > step ? <CheckCircle className="h-5 w-5" /> : step}
                  </div>
                  <span className={`text-xs mt-1 ${
                    loginStep === step 
                      ? darkMode ? 'text-blue-300' : 'text-blue-600' 
                      : darkMode ? 'text-slate-500' : 'text-slate-500'
                  }`}>
                    {step === 1 ? 'Identity' : step === 2 ? 'Access' : 'Verify'}
                  </span>
                </div>
                {step < 3 && (
                  <div className={`w-full h-1 mx-2 rounded ${
                    loginStep > step 
                      ? 'bg-green-500' 
                      : darkMode ? 'bg-slate-700' : 'bg-slate-200'
                  }`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
        
        <CardContent className="space-y-5">
          {/* Location Status */}
          {locationState.isLoading ? (
            <Alert variant="default" className={`${darkMode ? 'bg-blue-900/30 border-blue-800' : 'bg-blue-50 border-blue-200'} shadow-sm`}>
              <div className="flex items-center space-x-2">
                <Loader2 className={`h-4 w-4 animate-spin ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                <AlertDescription className="font-medium">Getting your location...</AlertDescription>
              </div>
            </Alert>
          ) : locationState.showError ? (
            <Alert variant="destructive" className={`${darkMode ? 'bg-red-900/30 border-red-800' : 'bg-red-50 border-red-300'} shadow-sm`}>
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center space-x-2">
                  <AlertCircle className={`h-4 w-4 ${darkMode ? 'text-red-400' : 'text-red-600'}`} />
                  <AlertDescription className={`font-medium ${darkMode ? 'text-red-300' : 'text-red-700'}`}>Location access denied</AlertDescription>
                </div>
                <Button 
                  onClick={refreshLocation} 
                  variant="outline" 
                  size="sm"
                  className={`h-8 px-2 ml-2 ${
                    darkMode 
                      ? 'border-red-800 text-red-400 hover:bg-red-900/50' 
                      : 'border-red-300 text-red-600 hover:bg-red-50'
                  } transition-colors`}
                >
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Retry
                </Button>
              </div>
            </Alert>
          ) : locationState.showSuccess ? (
            <Alert variant="default" className={`${
              darkMode 
                ? 'bg-green-900/30 border-green-800 text-green-300' 
                : 'bg-green-50 border-green-200 text-green-700'
            } shadow-sm`}>
              <div className="flex items-center space-x-2">
                <CheckCircle className={`h-4 w-4 ${darkMode ? 'text-green-400' : 'text-green-600'}`} />
                <AlertDescription className="font-medium">Location access granted: {locationState.data?.locationName}</AlertDescription>
              </div>
            </Alert>
          ) : locationState.data ? (
            <div className={`flex items-center text-sm space-x-2 p-1 rounded-lg border shadow-sm ${
              darkMode 
                ? 'bg-slate-700/50 border-slate-600 text-slate-300' 
                : 'bg-slate-50 border-slate-200 text-slate-600'
            }`}>
              <MapPin className={`h-4 w-4 ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
              <span className={`${darkMode ? 'text-slate-200' : 'text-sky-700'} text-xs font-medium`}>
                {locationState.data.locationName}
              </span>
            </div>
          ) : null}

          {errorMessage && (
            <Alert variant="destructive" className={`${
              darkMode 
                ? 'bg-red-900/30 border-red-800' 
                : 'bg-red-50 border-red-300'
            } shadow-sm`}>
              <AlertDescription className={`${darkMode ? 'text-red-300' : 'text-red-700'} font-medium`}>
                {errorMessage}
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Step 1: Identity */}
            {loginStep === 1 && (
              <div className="space-y-4 animate-fadeIn">
                <div className="space-y-2">
                  <label htmlFor="userCode" className={`text-sm font-semibold flex items-center ${
                    darkMode ? 'text-slate-300' : 'text-slate-700'
                  }`}>
                    <UserIcon className="h-4 w-4 mr-2" />
                    User Code
                  </label>
                  <div className="relative">
                    <Input
                      id="userCode"
                      name="userCode"
                      value={formData.userCode}
                      onChange={handleInputChange}
                      maxLength={8}
                      disabled={locationState.showError || locationState.isLoading} 
                      className={`w-full pl-10 ${
                        darkMode 
                          ? 'bg-slate-700 border-slate-600 text-white focus:border-blue-500 focus:ring-blue-500' 
                          : 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-500'
                      } rounded-md shadow-sm`}
                      placeholder="Enter your user code"
                      required
                    />
                    <Fingerprint className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 ${
                      darkMode ? 'text-slate-400' : 'text-slate-500'
                    }`} />
                  </div>
                </div>
                
                {/* Help text */}
                <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'} flex items-start space-x-2`}>
                  <HelpCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <p>Enter your unique user code to identify yourself and access your account securely.</p>
                </div>
              </div>
            )}
            
            {/* Step 2: Access Selection */}
            {loginStep === 2 && (
              <div className="space-y-4 animate-fadeIn">
                {/* Concern Field */}
                <div className="space-y-2">
                  <label htmlFor="concern" className={`text-sm font-semibold flex items-center ${
                    darkMode ? 'text-slate-300' : 'text-slate-700'
                  }`}>
                    <BuildingIcon className="h-4 w-4 mr-2" />
                    Concern
                  </label>
                  <Select
                    disabled={Boolean(isFormDisabled || !combinedData || (combinedData?.concerns?.length === 1 && selectedConcern))}
                    value={formData.concern}
                    onValueChange={(value) => handleSelectChange('concern', value)}
                  >
                    <SelectTrigger className={`w-full ${
                      darkMode 
                        ? 'bg-slate-700 border-slate-600 text-white' 
                        : 'border-slate-300 bg-white'
                    } focus:border-indigo-500 rounded-md shadow-sm`}>
                      <SelectValue placeholder="Select Concern" />
                    </SelectTrigger>
                    <SelectContent className={`${
                      darkMode ? 'bg-slate-800 border-slate-700' : 'border-slate-200'
                    } shadow-md`}>
                      {combinedData?.concerns?.map((concern) => (
                        <SelectItem 
                          key={concern.value} 
                          value={concern.value} 
                          className={`${
                            darkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-100'
                          }`}
                        >
                          {concern.label}
                        </SelectItem>
                      )) || []}
                    </SelectContent>
                  </Select>
                </div>

                {/* Division Field */}
                <div className="space-y-2">
                  <label htmlFor="division" className={`text-sm font-semibold flex items-center ${
                    darkMode ? 'text-slate-300' : 'text-slate-700'
                  }`}>
                    <Globe className="h-4 w-4 mr-2" />
                    Division
                  </label>
                  <Select
                    disabled={Boolean(isFormDisabled || !selectedConcern)}
                    value={formData.division}
                    onValueChange={(value) => handleSelectChange('division', value)}
                  >
                    <SelectTrigger className={`w-full ${
                      darkMode 
                        ? 'bg-slate-700 border-slate-600 text-white' 
                        : 'border-slate-300 bg-white'
                    } focus:border-indigo-500 rounded-md shadow-sm`}>
                      <SelectValue placeholder="Select Division" />
                    </SelectTrigger>
                    <SelectContent className={`${
                      darkMode ? 'bg-slate-800 border-slate-700' : 'border-slate-200'
                    } shadow-md`}>
                      {filteredDivisions.map((division) => (
                        <SelectItem 
                          key={division.value} 
                          value={division.value} 
                          className={`${
                            darkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-100'
                          }`}
                        >
                          {division.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Branch Field */}
                <div className="space-y-2">
                  <label htmlFor="branch" className={`text-sm font-semibold flex items-center ${
                    darkMode ? 'text-slate-300' : 'text-slate-700'
                  }`}>
                    <MapPin className="h-4 w-4 mr-2" />
                    Branch
                  </label>
                  <Select
                    disabled={Boolean(isFormDisabled || !selectedDivision)}
                    value={formData.branch}
                    onValueChange={(value) => handleSelectChange('branch', value)}
                  >
                    <SelectTrigger className={`w-full ${
                      darkMode 
                        ? 'bg-slate-700 border-slate-600 text-white' 
                        : 'border-slate-300 bg-white'
                    } focus:border-indigo-500 rounded-md shadow-sm`}>
                      <SelectValue placeholder="Select Branch" />
                    </SelectTrigger>
                    <SelectContent className={`${
                      darkMode ? 'bg-slate-800 border-slate-700' : 'border-slate-200'
                    } shadow-md`}>
                      {availableBranches.map((branch) => (
                        <SelectItem 
                          key={branch.value} 
                          value={branch.value}
                          className={`${
                            darkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-100'
                          }`}
                        >
                          {branch.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {/* Parking Area Field */}
<div className="space-y-2">
  <label htmlFor="parkingArea" className={`text-sm font-semibold flex items-center ${
    darkMode ? 'text-slate-300' : 'text-slate-700'
  }`}>
    <MapPin className="h-4 w-4 mr-2" />
    Login Parking Area
  </label>
  <Select
    disabled={Boolean(isFormDisabled || !formData.branch)}
    value={formData.parkingArea}
    onValueChange={(value) => handleSelectChange('parkingArea', value)}
  >
    <SelectTrigger className={`w-full ${
      darkMode 
        ? 'bg-slate-700 border-slate-600 text-white' 
        : 'border-slate-300 bg-white'
    } focus:border-indigo-500 rounded-md shadow-sm`}>
      <SelectValue placeholder="Select Parking Area" />
    </SelectTrigger>
    <SelectContent className={`${
      darkMode ? 'bg-slate-800 border-slate-700' : 'border-slate-200'
    } shadow-md`}>
      {/* Hard-coded parking areas */}
      <SelectItem value="Valet Parking">Valet Parking</SelectItem>
      <SelectItem value="Puzzle Parking">Puzzle Parking</SelectItem>
      <SelectItem value="L-Kart Parking">L-Kart Parking</SelectItem>
      <SelectItem value="Surface Parking (F)">Surface Parking (F)</SelectItem>
      <SelectItem value="Surface Parking (P)">Surface Parking (P)</SelectItem>
      <SelectItem value="Season Parking (A)">Season Parking (A)</SelectItem>
      <SelectItem value="Season Parking (L)">Season Parking (L)</SelectItem>
      <SelectItem value="Basement Parking">Basement Parking</SelectItem>
      <SelectItem value="Surface Parking">Surface Parking</SelectItem>
    </SelectContent>
  </Select>
</div>

                {/* Secure access message */}
                <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'} flex items-start space-x-2 mt-3`}>
                  <Lock className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <p>Secure access requires specific role permissions. OTP will be sent to your registered device.</p>
                </div>
              </div>
            )}

            {/* Step 3: OTP/PIN Verification */}
{loginStep === 3 && (
  <div className="space-y-4 animate-fadeIn">
    <div className={`p-3 rounded-lg ${
      darkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-700'
    }`}>
      <div className="flex items-center mb-2">
        <Languages className={`h-4 w-4 mr-2 ${
          darkMode ? 'text-blue-400' : 'text-blue-600'
        }`} />
        <span className="text-sm font-medium">
          {userPin === "PIN" ? "PIN Authentication" : "Authentication Code Sent"}
        </span>
      </div>
      <p className="text-xs">
        {userPin === "PIN"
          ? "Please enter your PIN to complete authentication."
          : "A one-time password has been sent to your registered mobile device. Please enter it below."
        }
      </p>
    </div>

    <div className="space-y-2">
      <label htmlFor="otp" className={`text-sm font-semibold flex items-center ${
        darkMode ? 'text-slate-300' : 'text-slate-700'
      }`}>
        <Fingerprint className="h-4 w-4 mr-2" />
        {userPin === "PIN" ? "PIN Verification" : "OTP Verification"}
      </label>
      <div className="relative">
        <Input
          id="otp"
          name="otp"
          value={formData.otp}
          onChange={handleInputChange}
          className={`w-full pl-10 pr-10 ${
            darkMode 
              ? 'bg-slate-700 border-slate-600 text-white focus:border-blue-500 focus:ring-blue-500' 
              : 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-500'
          } rounded-md shadow-sm`}
          placeholder={userPin === "PIN" ? "Enter your PIN" : "Enter 6-digit OTP"}
          type={showOtp ? 'text' : 'password'}
          required
          pattern={userPin==="PIN" ? undefined : "[0-9]{6}"}
          autoComplete={userPin==="PIN" ? "current-password" : "one-time-code"}
          maxLength={userPin==="PIN" ? undefined : 6}
        />
        <Lock className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 ${
          darkMode ? 'text-slate-400' : 'text-slate-500'
        }`} />
        <button
          type="button"
          onClick={toggleOtpVisibility}
          className="absolute right-3 top-1/2 transform -translate-y-1/2"
        >
          {showOtp ? (
            <EyeOff className={`h-4 w-4 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`} />
          ) : (
            <Eye className={`h-4 w-4 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`} />
          )}
        </button>
      </div>
    </div>

    {/* Only show Resend OTP button if not using PIN */}
    <div className="flex items-center space-x-2">
  <Checkbox
    id="rememberMe"
    // checked={rememberMe}
    onCheckedChange={(checked) => setRememberMe(checked === true)}
    className={darkMode ? 'data-[state=checked]:bg-blue-600 border-slate-600' : 'data-[state=checked]:bg-blue-600'}
  />
  <label
    htmlFor="rememberMe"
    className={`text-sm font-medium ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}
  >
    {userPin === "PIN" ? "Remember me" : "Remember me for 7 days"}
  </label>
</div>
  </div>
)}

            {/* Action buttons */}
            <div className="pt-2">
              {loginStep === 1 && (
                <Button
                  type="submit"
                  className={`w-full py-6 font-semibold ${
                    isFormDisabled || !formData.userCode
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700'
                  } transition-colors`}
                  disabled={isFormDisabled || !formData.userCode}
                >
                  {isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  ) : (
                    <>Next <span className="ml-1">→</span></>
                  )}
                </Button>
              )}

              {loginStep === 2 && (
                <div className="flex flex-col space-y-2">
                  <Button
  type="submit"
  className={`w-full py-6 font-semibold ${
    !isReadyForOTP
      ? 'bg-gray-400 cursor-not-allowed'
      : 'bg-blue-600 hover:bg-blue-700'
  } transition-colors`}
  disabled={!isReadyForOTP}
>
  {isLoading ? (
    <Loader2 className="h-5 w-5 animate-spin mr-2" />
  ) : (
    <>{userPin === "PIN" ? "Use PIN" : "Send OTP"}</>
  )}
</Button>
                  <Button
                    type="button"
                    variant="outline"
                    className={`w-full font-medium ${
                      darkMode 
                        ? 'border-slate-700 text-slate-300 hover:bg-slate-800' 
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                    onClick={() => setLoginStep(1)}
                  >
                    <span className="mr-1">←</span> Back
                  </Button>
                </div>
              )}

{loginStep === 3 && (
  <div className="flex flex-col space-y-2">
    <Button
      type="submit"
      className={`w-full py-6 font-semibold ${
        (!formData.otp || (formData.otp.length !== 6 && !userPin))
          ? 'bg-gray-400 cursor-not-allowed'
          : 'bg-blue-600 hover:bg-blue-700'
      } transition-colors`}
      disabled={!formData.otp || (formData.otp.length !== 6 && !userPin)}
    >
      {isLoading ? (
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
      ) : (
        <>Verify & Login</>
      )}
    </Button>
    <div className="flex justify-between">
      <Button
        type="button"
        variant="ghost"
        className={`font-medium ${
          darkMode 
            ? 'text-slate-300 hover:bg-slate-800' 
            : 'text-slate-700 hover:bg-slate-100'
        }`}
        onClick={() => setLoginStep(2)}
      >
        <span className="mr-1">←</span> Back
      </Button>
      {!userPin && (
        <Button
          type="button"
          variant="ghost"
          className={`font-medium ${
            darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'
          }`}
          onClick={sendOTP}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-1" />
          ) : (
            <>Resend OTP</>
          )}
        </Button>
      )}
    </div>
  </div>
)}
            </div>
          </form>
        </CardContent>
        
        <Separator className={darkMode ? 'bg-slate-700' : 'bg-slate-200'} />
        
        <CardFooter className="pt-4 pb-5 flex flex-col">
          <div className="flex items-center justify-center space-x-1">
            <CircleAlert className={`h-4 w-4 ${darkMode ? 'text-amber-400' : 'text-amber-600'}`} />
            <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Secure enterprise access for authorized person only
            </p>
          </div>
          <div className="mt-3 text-center">
            <p className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
              © {new Date().getFullYear()} Space Textiles Ltd. All rights reserved.
            </p>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default LoginForm;