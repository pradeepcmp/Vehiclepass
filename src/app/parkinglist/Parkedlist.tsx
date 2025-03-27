import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Clock, Car, AlertTriangle, CheckCircle, Calendar } from 'lucide-react';
import { vehiclesAtom } from '@/app/atoms/parkingAtoms';
import { useAtom } from 'jotai';
import { Vehicle } from '@/app/types/parkingTypes';
import { getSortedFilteredVehicles } from '@/app/utils/parkingview';
import useSWR from 'swr';
import Cookies from 'js-cookie';
import { UserData } from '@/app/types/Routetypes'
import PrivateRoute from '@/app/protectedRoute'
import PARKING_CONNECT from '@/app/connection/config'

// Define a fetcher function for SWR
const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch vehicle data');
  }
  return response.json();
};

const ParkingDisplay = () => {
  const [vehicles, setVehicles] = useAtom(vehiclesAtom);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [blinkState, setBlinkState] = useState<boolean>(false);

  // Use SWR for data fetching
  const { error, isLoading } = useSWR(
    `${PARKING_CONNECT}/Parking-Vehicle_queue`,
    fetcher,
    {
      refreshInterval: 30000,
      onSuccess: (data) => {
        // Decode user data to get parking area
        const userData = decodeUserDataCookie();
        
        // Filter vehicles based on parking area
        const filteredVehicles = userData.parkingArea
          ? data.filter((vehicle: Vehicle) => vehicle.parkingArea === userData.parkingArea)
          : data;
  
        const sortedVehicles = getSortedFilteredVehicles(filteredVehicles, '', currentTime);
        setVehicles(sortedVehicles);
      }
    }
  );
  const decodeUserDataCookie = (): UserData => {
    try {
      const userCookieValue = Cookies.get('user');
      
      if (!userCookieValue) {
        throw new Error('User data cookie not found');
      }
  
      // Try to decode the cookie value
      let decodedValue = userCookieValue;
      try {
        // Attempt double decoding to handle URL-encoded values
        decodedValue = decodeURIComponent(userCookieValue);
        if (decodedValue.includes('%')) {
          decodedValue = decodeURIComponent(decodedValue);
        }
      } catch (e) {
        console.warn('Error decoding cookie, using original value', e);
      }
  
      // Parse the JSON 
      const userData = JSON.parse(decodedValue) as UserData;
  
      // Validate essential user data
      if (!userData.user_role && !userData.role) {
        throw new Error('Invalid user data: missing user role');
      }
  
      // Normalize parking area field
      return {
        ...userData,
        parkingArea: userData.parkingArea 
          || null
      };
  
    } catch (error) {
      console.error('Area filtering error:', error);
      throw error;
    }
  };
  // Blink effect for urgent vehicles - increased visibility with faster blink rate
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setBlinkState(prev => !prev);
    }, 600); // Faster blink rate for better visibility - 600ms

    return () => clearInterval(blinkInterval);
  }, []);

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Format date for display
  const formatTime = (dateString: string | Date | undefined) => {
    if (!dateString) return 'N/A';
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true
    });
  };

  // Get minutes until reach time
  const getMinutesUntil = (reachTime: string | Date | undefined) => {
    if (!reachTime) return null;
    const now = new Date();
    const reach = typeof reachTime === 'string' ? new Date(reachTime) : reachTime;
    return Math.floor((reach.getTime() - now.getTime()) / (1000 * 60));
  };

  // Get appropriate urgency level styling with blinking effect for urgent items
  const getUrgencyDisplay = (vehicle: Vehicle) => {
    const minutesUntil = vehicle.reachTime ? getMinutesUntil(vehicle.reachTime) : null;
    
    if (!minutesUntil) {
      return {
        color: 'bg-green-100 border-green-300',
        icon: <Car size={30} className="text-green-600" />,
        text: 'PARKED',
        textColor: 'text-green-700',
        blink: false
      };
    }
    
    if (minutesUntil <= 0) {
      return {
        color: blinkState ? 'bg-purple-300 border-purple-600' : 'bg-purple-100 border-purple-400',
        icon: <CheckCircle size={30} className={`${blinkState ? 'text-purple-800' : 'text-purple-600'}`} />,
        text: 'Waiting For Exist',
        textColor: blinkState ? 'text-purple-900' : 'text-purple-700',
        blink: true
      };
    }
    
    if (minutesUntil <= 10) {
      return {
        color: blinkState ? 'bg-red-300 border-red-600' : 'bg-red-100 border-red-400',
        icon: <AlertTriangle size={30} className={`${blinkState ? 'text-red-800' : 'text-red-600'}`} />,
        text: 'Almost Reach',
        textColor: blinkState ? 'text-red-900' : 'text-red-700',
        blink: true
      };
    }
    
    if (minutesUntil <= 30) {
      return {
        color: 'bg-yellow-100 border-yellow-300',
        icon: <Clock size={30} className="text-yellow-600" />,
        text: 'Waiting',
        textColor: 'text-yellow-700',
        blink: false
      };
    }
    
    return {
      color: 'bg-green-100 border-green-300',
      icon: <Clock size={30} className="text-green-600" />,
      text: 'LOW PRIORITY',
      textColor: 'text-green-700',
      blink: false
    };
  };

  // Get time-based urgency progress and color with enhanced blinking effect
  const getUrgencyInfo = (vehicle: Vehicle) => {
    const reachTime = vehicle.reachTime;
    const minutesUntil = reachTime ? getMinutesUntil(reachTime) : null;
    
    if (!minutesUntil || minutesUntil <= 0) {
      // CRITICAL - match the urgency level color
      return { 
        progress: 100, 
        color: blinkState ? 'bg-purple-700' : 'bg-purple-500',
        blink: true
      };
    }
    
    if (minutesUntil <= 10) {
      // HIGH URGENCY - match the urgency level color
      return { 
        progress: 100 - ((minutesUntil / 10) * 100), 
        color: blinkState ? 'bg-red-700' : 'bg-red-500',
        blink: true
      };
    }
    
    if (minutesUntil <= 30) {
      // MEDIUM URGENCY - match the urgency level color
      return { 
        progress: 100 - ((minutesUntil / 30) * 100), 
        color: 'bg-yellow-500',
        blink: false
      };
    }
    
    // LOW URGENCY - match the urgency level color
    return { 
      progress: 100 - Math.min(((minutesUntil / 60) * 100), 100), 
      color: 'bg-green-500',
      blink: false
    };
  };

  // Get row background color based on urgency
  const getRowBackgroundColor = (vehicle: Vehicle) => {
    const minutesUntil = vehicle.reachTime ? getMinutesUntil(vehicle.reachTime) : null;
    
    if (!minutesUntil) return '';
    
    if (minutesUntil <= 0) {
      return blinkState ? 'bg-purple-50' : '';
    }
    
    if (minutesUntil <= 10) {
      return blinkState ? 'bg-red-50' : '';
    }
    
    return '';
  };

  // Get vehicle type badge styling with icons
  const getVehicleTypeBadge = (type: string | undefined) => {
    switch (type?.toLowerCase()) {
      case 'car':
        return { 
          color: 'bg-blue-100 text-blue-800 border-blue-300',
          icon: <Car size={24} className="text-blue-600 mr-2" />
        };
      default:
        return { 
          color: 'bg-gray-100 text-gray-800 border-gray-300',
          icon: <Car size={24} className="text-gray-600 mr-2" />
        };
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-blue-100 to-blue-50">
        <div className="text-center">
          <div className="text-8xl font-bold text-blue-700 mb-8">Loading Vehicle Queue</div>
          <Progress value={50} className="w-full max-w-4xl h-8 bg-blue-200" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-red-50 to-white">
        <div className="text-center p-16 bg-red-50 rounded-3xl shadow-2xl border-2 border-red-200">
          <AlertTriangle size={120} className="text-red-500 mx-auto mb-8" />
          <div className="text-7xl text-red-600 font-bold mb-6">Failed to fetch vehicle data</div>
          <div className="text-3xl text-red-500">Please check your connection and try again</div>
        </div>
      </div>
    );
  }

  return (
    <PrivateRoute>
    <div className="bg-gradient-to-br from-blue-100 to-white min-h-screen p-8">
      <header className="mb-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-7xl font-extrabold text-blue-800 mb-4">
              VEHICLE QUEUE MANAGEMENT
            </h1>
            <div className="flex items-center text-4xl text-gray-600">
              <Calendar size={40} className="mr-4 text-blue-600" />
              <span>{currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
            </div>
          </div>
          <div className="text-center bg-white p-8 rounded-2xl shadow-xl border-2 border-blue-100">
            <div className="flex items-center justify-center text-6xl font-bold text-blue-700 mb-3">
              <Clock size={48} className="mr-4 text-blue-600" />
              {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
            </div>
          </div>
        </div>
      </header>

      <Card className="w-full bg-white shadow-2xl border-2 border-blue-200 rounded-2xl overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-b-4 border-blue-200 bg-gradient-to-r from-blue-600 to-blue-500">
                <TableHead className="text-4xl font-bold text-white py-6 px-6">Vehicle No</TableHead>
                <TableHead className="text-4xl font-bold text-white py-6 px-6">Type</TableHead>
                <TableHead className="text-4xl font-bold text-white py-6 px-6">Entry Time</TableHead>
                <TableHead className="text-4xl font-bold text-white py-6 px-6">Expected Arrival</TableHead>
                <TableHead className="text-4xl font-bold text-white py-6 px-6">Status Level</TableHead>
                <TableHead className="text-4xl font-bold text-white py-6 px-6">Time Indicator</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vehicles.map((vehicle, index) => {
                const urgencyDisplay = getUrgencyDisplay(vehicle);
                const urgencyInfo = getUrgencyInfo(vehicle);
                const typeBadge = getVehicleTypeBadge(vehicle.vehicle_type);
                const rowBackground = getRowBackgroundColor(vehicle);
                const minutesUntil = vehicle.reachTime ? getMinutesUntil(vehicle.reachTime) : null;
                
                // Enhanced row highlighting for urgent vehicles with better transitions
                const baseRowClass = index % 2 === 0 ? 'bg-gray-50' : 'bg-white';
                const rowClasses = `border-b-2 border-gray-200 hover:bg-blue-50 transition-all duration-300 ${rowBackground || baseRowClass}`;
                
                return (
                  <TableRow 
                    key={vehicle.id || index} 
                    className={rowClasses}
                  >
                    <TableCell className="text-5xl font-bold text-blue-800 py-6 px-6">{vehicle.vehicle_no}</TableCell>
                    <TableCell className="py-6 px-6">
                      <Badge 
                        variant="outline" 
                        className={`text-2xl py-3 px-4 font-semibold border-2 flex items-center ${typeBadge.color}`}
                      >
                        {typeBadge.icon}
                        <span>{vehicle.vehicle_type}</span>
                      </Badge>
                    </TableCell>
                    <TableCell className="text-3xl text-gray-700 py-6 px-6">{formatTime(vehicle.entry_time)}</TableCell>
                    <TableCell className="text-3xl font-semibold text-gray-900 py-6 px-6">{formatTime(vehicle.reachTime)}</TableCell>
                    <TableCell className="py-6 px-6">
                      <div className={`inline-flex items-center gap-3 px-6 py-3 rounded-xl border-2 ${urgencyDisplay.color} transition-all duration-300`}>
                        {urgencyDisplay.icon}
                        <span className={`text-3xl font-bold ${urgencyDisplay.textColor}`}>{urgencyDisplay.text}</span>
                      </div>
                    </TableCell>
                    <TableCell className="w-64 py-6 px-6">
                      {vehicle.reachTime && (
                        <div className="w-full">
                          <Progress 
                            value={urgencyInfo.progress} 
                            className={`h-8 w-full bg-gray-100 rounded-full transition-all duration-300`}
                            style={{ background: 'linear-gradient(to right, #e0e0e0, #f5f5f5)' }}
                            color={urgencyInfo.color}
                          />
                          {minutesUntil !== null && (
                            <div className={`text-right mt-2 font-bold ${
                              minutesUntil <= 0 ? 'text-purple-600' : 
                              minutesUntil <= 10 ? 'text-red-600' : 
                              minutesUntil <= 30 ? 'text-yellow-600' : 
                              'text-green-600'
                            }`}>
                              {minutesUntil <= 0 ? 'NOW' : `${minutesUntil} MIN`}
                            </div>
                          )}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <footer className="mt-8 text-center text-2xl text-gray-500 font-semibold">
        PARKING MANAGEMENT SYSTEM • VEHICLE QUEUE DISPLAY
      </footer>
    </div>
    </PrivateRoute>
  );
};

export default ParkingDisplay;