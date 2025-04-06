import { useState, useEffect } from 'react';
import useSWR, { mutate } from 'swr';
import axios from 'axios';
import { useAtom } from 'jotai';
import { motion, AnimatePresence } from 'framer-motion';
import { vehiclesAtom,parkedVehiclesAtom } from '@/app/atoms/parkingAtoms';
import { Vehicle } from '@/app/types/parkingTypes';
import { calculateParkingCharges, formatDuration } from '@/app/utils/parking';
import { CardContent,CardHeader,CardTitle,CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { CarFront, Bike, RefreshCw, LogOut, RotateCcw, Search, Clock, X, CreditCard, Banknote, QrCode } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { isRecentlyParked,isReturnVisible,formatReachTime,getPaymentStatusBgColor,getSortedFilteredVehicles } from '@/app/utils/parkingview';
import { useNotification } from '@/app/service/NotificationSystem';
import QRScanner from '@/app/service/QRscanner'
import Cookies from 'js-cookie';
import { UserData } from '@/app/types/Routetypes'
import PARKING_CONNECT from '@/app/connection/config'

// API fetcher function for SWR
const fetcher = async (url: string) => {
  const response = await axios.get(url);
  return response.data;
};

export default function ParkingView() {
  const [vehicles, setVehicles] = useAtom(vehiclesAtom);
  const [parkedVehicles, setParkedVehicles] = useAtom(parkedVehiclesAtom);
  const { showNotification } = useNotification();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [exitVehicle, setExitVehicle] = useState<Vehicle | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [exitingVehicleId, setExitingVehicleId] = useState<string | null>(null);
  const [showReturnDialog, setShowReturnDialog] = useState(false);
  const [returnVehicle, setReturnVehicle] = useState<Vehicle | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string>("cash");
  const [mobileSearch, setMobileSearch] = useState("");
  const [filteredVehicles, setFilteredVehicles] = useState<Vehicle[]>([]);
  const [amountTaken, setAmountTaken] = useState("");
  const [amountError, setAmountError] = useState(false);
  // QR scanner states
  const [showQrScanner, setShowQrScanner] = useState(false);

  const { data: parkedData, error, isLoading, isValidating } = useSWR(
    `${PARKING_CONNECT}/Parking-Parked`,
    fetcher,
    {
      refreshInterval: 10000,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 2000,
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
  useEffect(() => {
    if (parkedData) {
      try {
        const userData = decodeUserDataCookie();
        const vehiclesData = Array.isArray(parkedData) ? parkedData : [parkedData];
        
        // Filter vehicles by parking area
        const filteredVehiclesData = userData.parkingArea 
          ? vehiclesData.filter(vehicle => 
              vehicle.parkingArea === userData.parkingArea
            ) 
          : vehiclesData;
  
        setVehicles(filteredVehiclesData);
  
        const parkedVehiclesList = filteredVehiclesData.filter((vehicle) => 
          vehicle.status === 'parked'
        );
  
        setParkedVehicles(parkedVehiclesList);
      } catch (error) {
        console.error('Error filtering vehicles:', error);
        // Fallback to original behavior if cookie decoding fails
        const vehiclesData = Array.isArray(parkedData) ? parkedData : [parkedData];
        setVehicles(vehiclesData);
        
        const parkedVehiclesList = vehiclesData.filter((vehicle) => 
          vehicle.status === 'parked'
        );
  
        setParkedVehicles(parkedVehiclesList);
      }
    }
  }, [parkedData, setVehicles, setParkedVehicles]);

  useEffect(() => {
    if (parkedVehicles) {
      setFilteredVehicles(getSortedFilteredVehicles(parkedVehicles, mobileSearch, currentTime));
    }
  }, [mobileSearch, parkedVehicles, currentTime]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // QR Scanner effect
useEffect(() => {
  if (showQrScanner) {
    // Short delay to let the scanner initialize
    const timer = setTimeout(() => {
      // Add custom styling to scanner elements
      const scannerElement = document.getElementById("qr-reader");
      if (scannerElement) {
        // Find and style the scanner region
        const scanRegion = scannerElement.querySelector("video");
        if (scanRegion) {
          scanRegion.style.objectFit = "cover";
          scanRegion.style.borderRadius = "8px";
        }
      }
    }, 500);
    
    return () => clearTimeout(timer);
  }
}, [showQrScanner]);

const handleQrCodeSuccess = (decodedText: string) => {
  console.log("QR Code detected:", decodedText);
  const mobileRegex = /\b\d{10,12}\b/;
  const match = decodedText.match(mobileRegex);
  
  if (match) {
    setMobileSearch(match[0]);
    showNotification({
      type: 'success',
      title: 'QR Scanned Successfully',
      message: `Mobile number detected: ${match[0]}`,
      duration: 3000
    });
  } else {
    setMobileSearch(decodedText);
    showNotification({
      type: 'info',
      title: 'QR Scanned',
      message: `Searching for: ${decodedText}`,
      duration: 3000
    });
  }
};
  const manualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await mutate(`${PARKING_CONNECT}/Parking-Parked`);
      showNotification({type: 'success',title: 'Refreshed',message: 'Vehicle data has been updated',duration: 5000});
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      showNotification({type: 'error',title: 'Error',message: 'Failed to refresh data',duration: 5000});
    } finally {
      setIsRefreshing(false);
    }
  };

  const clearSearch = () => {
    setMobileSearch('');
  };

  const handleVehicleExit = (vehicle: Vehicle) => {
    setExitVehicle(vehicle);
    // Set default payment method based on refund and redeem status
    const entryTime = vehicle.entry_time ? new Date(vehicle.entry_time) : new Date();
    const charges = calculateParkingCharges({...vehicle, entry_time: entryTime}, currentTime);
    const hoursPassed = (currentTime.getTime() - entryTime.getTime()) / (1000 * 60 * 60);
    
    if (vehicle.redeem_status === "Y") {
      setPaymentMethod("billed");
    } else if (charges.refundAmount > 0) {
      setPaymentMethod("refund");
    } else if (vehicle.redeem_status === "N" && hoursPassed > 1 && hoursPassed <= 2) {
      setPaymentMethod("advance paid");
    } else {
      setPaymentMethod("free Exit");
    }
    
    setAmountTaken("");
    setAmountError(false);
    setShowExitDialog(true);
  };

  const handleVehicleReturn = (vehicle: Vehicle) => {
    setReturnVehicle(vehicle);
    setShowReturnDialog(true);
  };

  const confirmVehicleReturn = async () => {
    if (returnVehicle) {
      try {
        setExitingVehicleId(returnVehicle.id);

        const returnVehicleData = {
          id: returnVehicle.id,
          status: 'exited',
          exitTime: currentTime,
          paid: true,
          balanceAmount: 0,
          totalAmount: 0,
          advancePayment: 0,
          refundAmount: 0,
          paymentMethod: "return"
        };

        setShowReturnDialog(false);
        await new Promise(resolve => setTimeout(resolve, 500));

        await axios.post(`${PARKING_CONNECT}/Parking-Exit`, {vehicleId: returnVehicle.id,exitDetails: returnVehicleData});

        setVehicles(vehicles.map(v => 
          v.id === returnVehicle.id ? { 
            ...v, 
            ...returnVehicleData
          } : v
        ));

        setTimeout(() => {
          setParkedVehicles(parkedVehicles.filter(v => v.id !== returnVehicle.id));
          setExitingVehicleId(null);

          mutate(`${PARKING_CONNECT}/Parking-Parked`);
          showNotification({type: 'info',title: 'Quick Return',message: `Vehicle ${returnVehicle.plateNumber || returnVehicle.vehicle_no} has returned within 5 minutes. No charge applied.`,duration: 5000});
          setReturnVehicle(null);
        }, 500);

      } catch (error) {
        console.error('Error processing vehicle return:', error);
        showNotification({type: 'error',title: 'Error', message: 'Failed to process vehicle return',duration: 5000});
        setExitingVehicleId(null);
        setShowReturnDialog(false);
        setReturnVehicle(null);
      }
    }
  };

const confirmVehicleExit = async () => {
  if (exitVehicle) {
    try {
      const entryTime = exitVehicle.entry_time ? new Date(exitVehicle.entry_time) : new Date();
      const charges = calculateParkingCharges({...exitVehicle, entry_time: entryTime}, currentTime);
      
// Validate amount taken if payment is needed and not billed or refund
if (paymentMethod !== "billed" && paymentMethod !== "refund" && charges.dueAmount > 0 && exitVehicle.redeem_status !== "Y") {
  if (!amountTaken.trim()) {
    setAmountError(true);
    return;
  }
  
  const amountValue = parseFloat(amountTaken);
  if (amountValue > charges.dueAmount) {
    setAmountError(true);
    return;
  }
}
      
      setExitingVehicleId(exitVehicle.id);
      
      // Adjust charges based on payment method
      let finalCharges = charges.finalCharge;
      let finalDueAmount = charges.dueAmount;
      
      if (paymentMethod === "billed") {
        finalCharges = 0;
        finalDueAmount = 0;
      } else if (paymentMethod === "refund") {
        // For refund, ensure we're recording the refund amount
        finalCharges = 0;
        finalDueAmount = 0;
      }
      
      const updatedVehicleData = {
        id: exitVehicle.id,
        status: 'exited',
        exitTime: currentTime,
        paid: paymentMethod === "billed" || paymentMethod === "refund" || charges.dueAmount === 0,
        balanceAmount: finalDueAmount,
        totalAmount: finalCharges,
        advancePayment: charges.advance_payment,
        refundAmount: paymentMethod === "billed" ? 0 : charges.refundAmount,
        paymentMethod: paymentMethod,
        amountTaken: (paymentMethod === "billed" || paymentMethod === "refund") ? "0" : (amountTaken || charges.dueAmount.toString())
      };
  
        setShowExitDialog(false);
  
        await new Promise(resolve => setTimeout(resolve, 500));
  
        await axios.post(`${PARKING_CONNECT}/Parking-Exit`, {vehicleId: exitVehicle.id,exitDetails: updatedVehicleData});
  
        // Rest of the function remains the same
        setVehicles(vehicles.map(v => v.id === exitVehicle.id ? { ...v, ...updatedVehicleData} : v));
  
        setTimeout(() => {
          setParkedVehicles(parkedVehicles.filter(v => v.id !== exitVehicle.id));
          setExitingVehicleId(null);
  
          mutate(`${PARKING_CONNECT}/Parking-Parked`);
  
          showNotification({type: 'success',title: 'Vehicle Exit',message: `Vehicle ${exitVehicle.plateNumber || exitVehicle.vehicle_no} has exited successfully. Payment: ${paymentMethod.toUpperCase()}`,duration: 5000});
          setExitVehicle(null);
        }, 500);
  
      } catch (error) {
        console.error('Error processing vehicle exit:', error);
        showNotification({type: 'error',title: 'Error',message: 'Failed to process vehicle exit',duration: 5000});
        setExitingVehicleId(null);
        setShowExitDialog(false);
        setExitVehicle(null);
      }
    }
  };

  const vehicleCardVariants = {
    hidden: { opacity: 0, x: 0 },
    visible: { opacity: 1, x: 0, transition: { type: 'spring', stiffness: 300, damping: 25 } },
    exit: { opacity: 0, x: 500,
    transition: { type: 'spring', stiffness: 300, damping: 20, duration: 0.5}}
  };

  return (
    <div className="w-full overflow-hidden">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Parked Vehicles</CardTitle>
            <CardDescription>Currently parked vehicles in the facility</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="py-1">
              Total: {parkedVehicles.length}
            </Badge>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={manualRefresh}
              disabled={isRefreshing || isValidating}
              className="h-8 px-2"
            >
              <RefreshCw className={`w-4 h-4 mr-1 ${(isRefreshing || isValidating) ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Search Filter */}
        <div className="mb-4 relative">
  <div className="flex items-center">
    <div className="relative flex-grow">
      <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
      <Input
        type="text"
        placeholder="Search by mobile number..."
        value={mobileSearch}
        onChange={(e) => setMobileSearch(e.target.value)}
        className="pl-8 pr-8"
      />
      {mobileSearch && (
        <button 
          onClick={clearSearch}
          className="absolute right-2 top-2.5 text-slate-400 hover:text-slate-600"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
    <Button 
      variant="outline" 
      size="sm" 
      onClick={() => setShowQrScanner(true)}
      className="ml-2 h-10"
    >
      <QrCode className="w-4 h-4 mr-1" />
      Scan
    </Button>
  </div>
  {mobileSearch && (
    <div className="mt-2 text-sm text-slate-500">
      Found {filteredVehicles.length} vehicle(s) with mobile number containing &quot;{mobileSearch}&quot;
    </div>
  )}
</div>

        {isLoading ? (
          <div className="text-center py-8 text-slate-500">
            <p>Loading parked vehicles...</p>
          </div>
        ) : error ? (
          <div className="text-center py-8 text-red-500">
            <p>Error loading vehicles. Please try refreshing.</p>
          </div>
        ) : filteredVehicles.length > 0 ? (
          <div className="border rounded-md overflow-hidden">
            <AnimatePresence>
              {filteredVehicles.map((vehicle) => {
                // Get reach time information if available
                const reachTimeInfo = vehicle.reachTime 
                  ? formatReachTime(vehicle.reachTime, currentTime)
                  : { formattedTime: null, timeRemaining: null };
                // Determine if reach time is crossed
                const isReachTimeCrossed = vehicle.reachTime 
                  ? new Date(vehicle.reachTime) < currentTime
                  : false;
                return (
                  <motion.div 
                    key={vehicle.id} 
                    className={`p-4 ${getPaymentStatusBgColor(vehicle, currentTime)} transition-colors duration-300 border-b last:border-b-0`}
                    initial="hidden"
                    animate={exitingVehicleId === vehicle.id ? "exit" : "visible"}
                    exit="exit"
                    variants={vehicleCardVariants}
                    layout
                  >
                    <div className="flex justify-between mb-2">
                      <div className="font-medium flex items-center">
                        {vehicle.vehicleType === 'car' || vehicle.vehicle_type === 'car' ? (
                          <CarFront className="w-4 h-4 mr-2 text-blue-600" />
                        ) : (
                          <Bike className="w-4 h-4 mr-2 text-green-600" />
                        )}
                        {vehicle.plateNumber || vehicle.vehicle_no}
                        {/* Reach Time Badge */}
                        {vehicle.reachTime && (
                          <Badge 
                            variant="outline"
                            className={`ml-2 ${isReachTimeCrossed 
                              ? 'bg-pink-50 text-pink-700 border-pink-200' 
                              : 'bg-red-50 text-red-700 border-red-200'}`}
                          >
                            <Clock className="w-3 h-3 mr-1" />
                            {isReachTimeCrossed ? 'Time Passed' : 'Expected'}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {isRecentlyParked(vehicle, currentTime) && !vehicle.reachTime && (
                          <Badge 
                            variant="secondary"
                            className="bg-yellow-50 text-yellow-700 border-yellow-200"
                          >
                            Recent
                          </Badge>
                        )}
                        {!isRecentlyParked(vehicle, currentTime) && !vehicle.reachTime && (
                          <Badge 
                            variant={vehicle.paid ? "outline" : "secondary"}
                            className={vehicle.paid ? "bg-green-50 text-green-700 border-green-200" : 
                                    ((vehicle.advance_payment || 0) > 0 ? "bg-blue-50 text-blue-700 border-blue-200" : 
                                    "bg-purple-50 text-purple-700 border-purple-200")}
                          >
                            {vehicle.paid ? "Paid" : ((vehicle.advance_payment || 0) > 0 ? "Advance Paid" : "Unpaid")}
                          </Badge>
                        )}
                        {isReturnVisible(vehicle, currentTime) && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="h-7 text-yellow-600 border-yellow-200 hover:bg-yellow-50 hover:text-yellow-700 transition-colors duration-300"
                            onClick={() => handleVehicleReturn(vehicle)}
                            disabled={exitingVehicleId !== null}
                          >
                            <RotateCcw className="w-3 h-3 mr-1" />
                            Return
                          </Button>
                        )}
                        <Button 
                          variant="outline" 
                          size="sm"
                          className={`h-7 ${exitingVehicleId === vehicle.id 
                            ? 'text-white bg-red-600 border-red-600' 
                            : 'text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700'
                          } transition-colors duration-300`}
                          onClick={() => handleVehicleExit(vehicle)}
                          disabled={exitingVehicleId !== null || isReturnVisible(vehicle, currentTime)}
                        >
                          <LogOut className="w-3 h-3 mr-1" />
                          Exit
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1 text-sm">
                      {/* Reach Time section - shown at the top if available */}
                      {vehicle.reachTime && (
                        <>
                          <div className="text-slate-500 font-medium">Expected Arrival:</div>
                          <div className="md:col-span-2 font-medium">
                            <span className={isReachTimeCrossed ? "text-pink-700" : "text-red-700"}>
                              {reachTimeInfo.formattedTime} 
                              {reachTimeInfo.timeRemaining && (
                                <span className="ml-2 font-normal">
                                  ({reachTimeInfo.timeRemaining})
                                </span>
                              )}
                            </span>
                          </div>
                        </>
                      )}
                      <div className="text-slate-500">Parking Area:</div>
                      <div className="md:col-span-2">{vehicle.parkingArea}</div>
                      <div className="text-slate-500">Mobile:</div>
                      <div className="md:col-span-2">
                        <span className={mobileSearch && vehicle.mobileno?.includes(mobileSearch) ? "bg-yellow-100 px-1 rounded" : ""}>
                          {vehicle.mobileno}
                        </span>
                      </div>
                      <div className="text-slate-500">Entry Time:</div>
                      <div className="md:col-span-2">
                        {vehicle.entry_time ? new Date(vehicle.entry_time).toLocaleString() : 'N/A'}
                      </div>
                      <div className="text-slate-500">Duration:</div>
                      <div className="md:col-span-2">
                        {vehicle.entry_time ? formatDuration(new Date(vehicle.entry_time), currentTime) : 'N/A'}
                      </div>
                      <div className="text-slate-500">Payment Status:</div>
                      <div className="md:col-span-2">
                        {
                          ((vehicle.advance_payment || 0) > 0 ? 
                            `Advance Paid: ₹${vehicle.advance_payment}` : 
                            "No Advance Payment")}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        ) : (
          <div className="text-center py-8 text-slate-500">
            {mobileSearch ? (
              <p>No vehicles found with mobile number containing &quot;{mobileSearch}&quot;</p>
            ) : (
              <p>No vehicles currently parked</p>
            )}
          </div>
        )}
      </CardContent>
      {/* QR Scanner Dialog */}
<QRScanner 
  isOpen={showQrScanner} 
  onClose={() => setShowQrScanner(false)} 
  onScanSuccess={handleQrCodeSuccess} 
/>

      {/* Regular Exit Dialog */}
      <Dialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Vehicle Exit</DialogTitle>
            <DialogDescription>
              Record the exit of this vehicle from the parking facility.
            </DialogDescription>
          </DialogHeader>
          {exitVehicle && (() => {
            // Ensure entry_time is a valid Date before calculating charges
            const entryTime = exitVehicle.entry_time ? new Date(exitVehicle.entry_time) : new Date();
  const charges = calculateParkingCharges({...exitVehicle, entry_time: entryTime}, currentTime);
  
  // Calculate hours passed for conditional logic
  const hoursPassed = (currentTime.getTime() - entryTime.getTime()) / (1000 * 60 * 60);

            let dialogBgColor = "bg-blue-50 border-blue-100";
            if (charges.dueAmount === 0 && charges.refundAmount === 0) {
              dialogBgColor = "bg-green-50 border-green-100";
            } else if (charges.advance_payment === 0) {
              dialogBgColor = "bg-purple-50 border-purple-100";
            }

            return (
              <div className="space-y-4 py-2">
                <div className={`p-4 rounded-lg border ${dialogBgColor}`}>
                  <div className="grid grid-cols-2 gap-y-2 text-sm">
                    <div className="text-slate-500">Plate Number:</div>
                    <div className="font-medium">{exitVehicle.vehicle_no || exitVehicle.plateNumber}</div>
                    <div className="text-slate-500">Vehicle Type:</div>
                    <div className="font-medium capitalize">
                      {exitVehicle.vehicle_type || exitVehicle.vehicleType}
                    </div>
                    <div className="text-slate-500">Entry Time:</div>
                    <div className="font-medium">{entryTime.toLocaleString()}</div>
                    <div className="text-slate-500">Exit Time:</div>
                    <div className="font-medium">{currentTime.toLocaleString()}</div>
                    <div className="text-slate-500">Duration:</div>
                    <div className="font-medium">
                      {formatDuration(entryTime, currentTime)}
                    </div>
                    <div className="text-slate-500">Total Hours (rounded):</div>
                    <div className="font-medium">{charges.hours} hours</div>
                    <div className="text-slate-500">Hourly Rate:</div>
                    <div className="font-medium">₹{charges.hourlyRate}</div>
                    <div className="text-slate-500">Advance Payment:</div>
                    <div className="font-medium">₹{charges.advance_payment}</div>
                    <div className="text-slate-500">Total Charges:</div>
<div className="font-medium">
  {paymentMethod === "billed" ? "₹0 (Billed)" : `₹${charges.finalCharge}`}
</div>
{paymentMethod !== "billed" && charges.dueAmount > 0 && (
  <>
    <div className="text-slate-500">Balance Due:</div>
    <div className="font-medium text-red-600">₹{charges.dueAmount}</div>
  </>
)}
{paymentMethod !== "billed" && charges.refundAmount > 0 && hoursPassed < 1 && (
  <>
    <div className="text-slate-500">Refund Amount:</div>
    <div className="font-medium text-green-600">₹{charges.refundAmount}</div>
  </>
)}
                  </div>
                </div>
                {paymentMethod === "billed" ? (
  <div className="bg-purple-50 p-3 rounded-lg border border-purple-200 text-sm">
    <p className="font-medium text-purple-700">
      Vehicle will be marked as exited with zero payment. No Charges will be billed Customers.
    </p>
  </div>
) : charges.dueAmount > 0 ? (
  <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 text-sm">
    <p className="font-medium text-amber-700">
      Please collect the remaining payment of ₹{charges.dueAmount} before allowing exit.
    </p>
  </div>
) : charges.refundAmount > 0 ? (
  <div className="bg-green-50 p-3 rounded-lg border border-green-200 text-sm">
    <p className="font-medium text-green-700">
      Please refund ₹{charges.refundAmount} to the customer as excess payment.
    </p>
  </div>
) : (
  <div className="bg-green-50 p-3 rounded-lg border border-green-200 text-sm">
    <p className="font-medium text-green-700">
      Payment is exact. No additional collection or refund needed.
    </p>
  </div>
)}
              {/* Payment Method Selection - Only show if payment is needed */}
              {(charges.dueAmount > 0 || charges.refundAmount > 0) && (
  <div className="space-y-3">
    <h4 className="text-sm font-medium">Payment Method</h4>
    <RadioGroup 
      value={paymentMethod} 
      onValueChange={setPaymentMethod}
      className="grid grid-cols-3 gap-2"
    >
      {/* If redeem_status is Y and hours >= 1, only show Billed option */}
      {/* Payment Method Selection Conditions */}
{exitVehicle.redeem_status === "Y" ? (
  <div className="flex items-center space-x-2">
    <RadioGroupItem value="billed" id="billed" />
    <Label htmlFor="billed" className="flex items-center cursor-pointer">
      <QrCode className="w-4 h-4 mr-2 text-purple-600" />
      Billed
    </Label>
  </div>
  ) : (exitVehicle.vehicle_type === 'bike' || exitVehicle.vehicleType === 'bike') && exitVehicle.redeem_status === "N" ? (
    <>
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="cash" id="cash" />
        <Label htmlFor="cash" className="flex items-center cursor-pointer">
          <Banknote className="w-4 h-4 mr-2 text-green-600" />
          Cash
        </Label>
      </div>
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="UPI" id="UPI" />
        <Label htmlFor="UPI" className="flex items-center cursor-pointer">
          <CreditCard className="w-4 h-4 mr-2 text-blue-600" />
          UPI
        </Label>
      </div>
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="billed" id="billed" />
        <Label htmlFor="billed" className="flex items-center cursor-pointer">
          <QrCode className="w-4 h-4 mr-2 text-purple-600" />
          Billed
        </Label>
      </div>
    </>
) : charges.refundAmount > 0 ? (
  <div className="flex items-center space-x-2">
    <RadioGroupItem value="refund" id="refund" />
    <Label htmlFor="refund" className="flex items-center cursor-pointer">
      <RotateCcw className="w-4 h-4 mr-2 text-green-600" />
      Refund
    </Label>
  </div>
) : (exitVehicle.redeem_status === "N" && hoursPassed > 1 && hoursPassed <= 2)  ? (
  <>
    <div className="flex items-center space-x-2">
      <RadioGroupItem value="cash" id="cash" />
      <Label htmlFor="cash" className="flex items-center cursor-pointer">
        <Banknote className="w-4 h-4 mr-2 text-green-600" />
        Cash
      </Label>
    </div>
    <div className="flex items-center space-x-2">
      <RadioGroupItem value="UPI" id="UPI" />
      <Label htmlFor="UPI" className="flex items-center cursor-pointer">
        <CreditCard className="w-4 h-4 mr-2 text-blue-600" />
        UPI
      </Label>
    </div>
  </>
) : (
  <>
    <div className="flex items-center space-x-2">
      <RadioGroupItem value="cash" id="cash" />
      <Label htmlFor="cash" className="flex items-center cursor-pointer">
        <Banknote className="w-4 h-4 mr-2 text-green-600" />
        Cash
      </Label>
    </div>
    <div className="flex items-center space-x-2">
      <RadioGroupItem value="UPI" id="UPI" />
      <Label htmlFor="UPI" className="flex items-center cursor-pointer">
        <CreditCard className="w-4 h-4 mr-2 text-blue-600" />
        UPI
      </Label>
    </div>
    <div className="flex items-center space-x-2">
      <RadioGroupItem value="billed" id="billed" />
      <Label htmlFor="billed" className="flex items-center cursor-pointer">
        <QrCode className="w-4 h-4 mr-2 text-purple-600" />
        Billed
      </Label>
    </div>
  </>
)}
    </RadioGroup>
  </div>
)}
                {/* Amount Taken Input - Only show if payment is needed AND not billed AND redeem status is "N" */}
                {charges.dueAmount > 0 && 
  charges.refundAmount === 0 && 
  paymentMethod !== "billed" &&
  exitVehicle.redeem_status !== "Y" && (
    <div className="space-y-3 mt-2">
      <h4 className="text-sm font-medium">Amount Taken</h4>
      <div className="relative">
        <span className="absolute left-3 top-2.5">₹</span>
        <Input
          type="text"
          placeholder="Enter amount"
          value={amountTaken}
          maxLength={4}
          onChange={(e) => {
            const newAmount = e.target.value;
            setAmountTaken(newAmount);
            setAmountError(false);
            
            // Prevent amount greater than due amount
            if (newAmount && parseFloat(newAmount) > charges.dueAmount) {
              setAmountError(true);
            }
          }}
          className={`pl-8 ${amountError ? 'border-red-300' : ''}`}
        />
{amountError && (
  <p className="text-red-500 text-xs mt-1">
    {amountTaken ? `Amount cannot exceed ₹${charges.dueAmount}` : 'Amount is required'}
  </p>
)}
      </div>
    </div>
  )}
              </div>
            );
          })()}

          <DialogFooter className="flex flex-col sm:flex-row gap-3">
            <Button 
              variant="outline"
              onClick={() => setShowExitDialog(false)}
              className="sm:w-auto w-full"
              disabled={exitingVehicleId !== null}
            >
              Cancel
            </Button>

            <Button 
              onClick={confirmVehicleExit}
              className="sm:w-auto w-full bg-red-600 hover:bg-red-700"
              disabled={exitingVehicleId !== null}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Confirm Exit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick Return Dialog */}
      <Dialog open={showReturnDialog} onOpenChange={setShowReturnDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Quick Vehicle Return</DialogTitle>
            <DialogDescription>
              Process a free return for a vehicle that was parked less than 5 minutes ago.
            </DialogDescription>
          </DialogHeader>
          {returnVehicle && (
            <div className="space-y-4 py-2">
              <div className="p-4 rounded-lg border bg-yellow-50 border-yellow-100">
                <div className="grid grid-cols-2 gap-y-2 text-sm">
                  <div className="text-slate-500">Plate Number:</div>
                  <div className="font-medium">{returnVehicle.vehicle_no || returnVehicle.plateNumber}</div>
                  <div className="text-slate-500">Vehicle Type:</div>
                  <div className="font-medium capitalize">
                    {returnVehicle.vehicle_type || returnVehicle.vehicleType}
                  </div>
                  <div className="text-slate-500">Entry Time:</div>
                  <div className="font-medium">
                    {returnVehicle.entry_time ? new Date(returnVehicle.entry_time).toLocaleString() : 'N/A'}
                  </div>
                  <div className="text-slate-500">Current Time:</div>
                  <div className="font-medium">{currentTime.toLocaleString()}</div>
                  <div className="text-slate-500">Duration:</div>
                  <div className="font-medium">
                    {returnVehicle.entry_time 
                      ? formatDuration(new Date(returnVehicle.entry_time), currentTime) 
                      : 'N/A'}
                  </div>
                  <div className="text-slate-500">Advance Payment:</div>
                  <div className="font-medium">₹{returnVehicle.advance_payment || 0}</div>
                </div>
              </div>
              <div className="bg-green-50 p-3 rounded-lg border border-green-200 text-sm">
                <p className="font-medium text-green-700">
                  This vehicle will be processed as a free return. Any advance payment (₹{returnVehicle.advance_payment || 0}) will be refunded.
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="flex flex-col sm:flex-row gap-3">
            <Button 
              variant="outline"
              onClick={() => setShowReturnDialog(false)}
              className="sm:w-auto w-full"
              disabled={exitingVehicleId !== null}
            >
              Cancel
            </Button>

            <Button 
              onClick={confirmVehicleReturn}
              className="sm:w-auto w-full bg-yellow-600 hover:bg-yellow-700"
              disabled={exitingVehicleId !== null}
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Confirm Return
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}