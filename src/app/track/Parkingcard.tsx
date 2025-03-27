import React, { useState, useEffect } from 'react';
import useSWR from 'swr';
import axios from 'axios';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ExtendedVehicle } from '@/app/types/parkingTypes';
import { formatDuration } from '@/app/utils/parking';
import QRCodeGenerator from '@/app/service/QRGenerator';
import LoadingAnimation from '@/app/service/Loadinganimation';
import NoVehiclesAnimation from '@/app/service/NoVehiclesFound';
import { useNotification } from '@/app/service/NotificationSystem';
import logo from '@/app/Images/SPACE LOGO 3D 03.png';
import Image from 'next/image';
import PARKING_CONNECT from '@/app/connection/config'

const calculateDuration = (entryTimeStr: string | undefined): string => {
  if (!entryTimeStr) return "N/A";
  
  try {
    const entryTime = new Date(entryTimeStr);
    const currentTime = new Date();
    if (isNaN(entryTime.getTime())) {
      return "Invalid date";
    }
    return formatDuration(entryTime, currentTime);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    return "Error calculating duration";
  }
};

const roundUpHours = (entryTimeStr: string | undefined): number => {
  if (!entryTimeStr) return 0;
  
  try {
    const entryTime = new Date(entryTimeStr);
    const currentTime = new Date();
    if (isNaN(entryTime.getTime())) {
      return 0;
    }
    const diffMs = currentTime.getTime() - entryTime.getTime();
    return Math.max(Math.ceil(diffMs / (1000 * 60 * 60)), 1);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    return 0;
  }
};

const formatTime = (dateInput: Date | string): string => {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  
  if (isNaN(date.getTime())) {
    return "Invalid time";
  }
  
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
};
// Component for live timer display
const LiveTimer = ({ entryTimeStr }: { entryTimeStr: string | undefined }) => {
  const [duration, setDuration] = useState<string>("Calculating...");
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
    if (!entryTimeStr) {
      setDuration("N/A");
      return;
    }
    const updateTimer = () => {
      setDuration(calculateDuration(entryTimeStr));
    };
    updateTimer();
    const intervalId = setInterval(updateTimer, 1000);

    return () => clearInterval(intervalId);
  }, [entryTimeStr]);

  if (!mounted) {
    return <span>Loading...</span>;
  }
  return <span>{duration}</span>;
};

const fetcher = async (url: string) => {
  const response = await axios.get(url);
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const processedVehicles = response.data.map((vehicle: any) => ({
    ...vehicle,
    reachTime: vehicle.reachTime ? String(vehicle.reachTime) : undefined,
    entry_time: vehicle.entry_time || vehicle.entryTime,
    formattedReachTime: vehicle.reachTime ? formatTime(String(vehicle.reachTime)) : undefined,
    key_handover: vehicle.key_handover || "no"
  }));
  
  return processedVehicles;
};

const ParkingCard = () => {
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<ExtendedVehicle | null>(null);
  const [reachTime, setReachTime] = useState('15');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [mounted, setMounted] = useState(false);
  const [mobileNo, setMobileNo] = useState<string | null>(null);
  const { showNotification } = useNotification();
  const [qrCodeDialog, setQrCodeDialog] = useState(false);
  const [qrCodeData, setQrCodeData] = useState<{sessionId: string, mobileNo: string}>({sessionId: '', mobileNo: ''});

  useEffect(() => {
    setMounted(true);

    const urlParams = new URLSearchParams(window.location.search);
    setMobileNo(urlParams.get('m'));
  }, []);

  const { data: vehicles, error, isLoading, mutate } = useSWR(
    mobileNo && mounted ? `${PARKING_CONNECT}/Parking-service?m=${mobileNo}` : null,
    fetcher,
    {
      refreshInterval: 30000,
      revalidateOnFocus: true,
      dedupingInterval: 5000,
    }
  );
  useEffect(() => {
    if (!mounted) return;

    const intervalId = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(intervalId);
  }, [mounted]);

  const handleReachedParking = (vehicle: ExtendedVehicle) => {
    setSelectedVehicle(vehicle);
    setOpenDialog(true);
  };
  const handleQrCodeClick = (sessionId: string, mobileNo: string) => {
    setQrCodeData({sessionId, mobileNo});
    setQrCodeDialog(true);
  };
  const handleSubmitReachTime = async () => {
    if (!selectedVehicle) return;

    setUpdatingStatus(true);

    try {
      const now = new Date();
      const reachTimeDate = new Date(now.getTime() + parseInt(reachTime) * 60 * 1000);
      const reachTimeISOString = reachTimeDate.toISOString();

      await axios.post(`${PARKING_CONNECT}/Parking-UpdateReachTime`, {
        vehicleId: selectedVehicle.id,
        reachTime: reachTimeISOString,
        currentTime: now.toISOString(),
        estimatedMinutes: parseInt(reachTime)
      });

      if (vehicles) {
        const updatedVehicles = vehicles.map((v: { id: string; }) => 
          v.id === selectedVehicle.id 
            ? { 
                ...v, 
                reachTime: reachTimeISOString,
                formattedReachTime: formatTime(reachTimeDate)
              } 
            : v
        );
        mutate(updatedVehicles, false);
        mutate();
      }
      setOpenDialog(false);
      setUpdatingStatus(false);
      showNotification({
        type: 'success',
        title: 'On My Way!',
        message: `You're expected to reach parking at ${formatTime(reachTimeDate)}. A reminder has been set.`,
        duration: 7000,
        action: {
          label: 'View Details',
          onClick: () => {
            const vehicleCard = document.getElementById(`vehicle-card-${selectedVehicle.id}`);
            if (vehicleCard) {
              vehicleCard.scrollIntoView({ behavior: 'smooth' });
              vehicleCard.classList.add('highlight-pulse');
              setTimeout(() => {
                vehicleCard.classList.remove('highlight-pulse');
              }, 2000);
            }
          }
        }
      });

      const remainingTimeMs = reachTimeDate.getTime() - now.getTime();
      if (remainingTimeMs > 60000) {
        const reminderTime = Math.max(remainingTimeMs - 60000, 1000);
        setTimeout(() => {
          showNotification({
            type: 'info',
            title: 'Almost There!',
            message: `You're expected to reach parking in about 1 minute. The parking gate will be ready.`,
            duration: 10000
          });
        }, reminderTime);
      }
    } catch (err) {
      console.error("Error updating reach time:", err);
      setUpdatingStatus(false);
      showNotification({
        type: 'error',
        title: 'Update Failed',
        message: 'Failed to update reach time. Please try again.',
        duration: 5000,
        action: {
          label: 'Retry',
          onClick: () => handleReachedParking(selectedVehicle)
        }
      });
    }
  };
  const isReaching = (vehicle: ExtendedVehicle): boolean => {
    if (!vehicle.reachTime || !mounted) return false;

    try {
      const reachTime = new Date(vehicle.reachTime);

      if (reachTime.getTime() <= currentTime.getTime()) {
        const bufferTime = new Date(reachTime.getTime() + 60000);

        if (currentTime.getTime() > bufferTime.getTime()) {
          return false;
        }

        return true;
      }
      return true;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      return false;
    }
  };
  // Calculate time remaining until button unlocks (for display purposes)
  const getRemainingTime = (vehicle: ExtendedVehicle): string => {
    if (!vehicle.reachTime || !mounted) return "";

    try {
      const reachTime = new Date(vehicle.reachTime);
      const bufferTime = new Date(reachTime.getTime() + 60000);
      if (currentTime.getTime() > bufferTime.getTime()) {
        return "";
      }
      if (reachTime.getTime() > currentTime.getTime()) {
        const diffMs = reachTime.getTime() - currentTime.getTime();
        const diffSec = Math.ceil(diffMs / 1000);
        if (diffSec < 60) {
          return `(Unlocks in ${diffSec}s)`;
        } else {
          const diffMin = Math.ceil(diffSec / 60);
          return `(Unlocks in ${diffMin}m)`;
        }
      }
      const diffMs = bufferTime.getTime() - currentTime.getTime();
      const diffSec = Math.ceil(diffMs / 1000);
      return `(Unlocks in ${diffSec}s)`;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      return "";
    }
  };
  if (!mounted) {
    return <div className="w-full h-64 flex items-center justify-center">Loading...</div>;
  }
  if (isLoading) return <LoadingAnimation />;
  if (error) return <div className="bg-red-100 p-4 rounded text-red-700">Error loading data</div>;
  if (!vehicles || vehicles.length === 0) return <NoVehiclesAnimation />;

  return (
    <>
        <div className="flex flex-col justify-center items-center w-full h-full mb-6 space-y-0">
          <Image src={logo} alt="space" width={600} height={450} priority className="drop-shadow-lg"/>
          <h1 className="bg-gradient-to-r from-blue-400 to-indigo-500 text-transparent bg-clip-text text-lg font-bold mb-1">SmartLane Access</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
        {vehicles.map((vehicle: ExtendedVehicle) => {
          const vehicleNumber = vehicle.vehicle_no || vehicle.plateNumber || 'Unknown';
          const entryTimeDisplay = vehicle.entry_time || vehicle.entryTime || '';
          const exitTimeDisplay = vehicle.exit_time || vehicle.exitTime || '';
          const exitcustomer = vehicle.status
          const parkingSlot = vehicle.keyhandover || 'Unknown';
          const parkingid = vehicle.id? `${vehicle.id}`: 'Unknown';
          const parkingArea = vehicle.parkingArea || 'Unknown';
          const mobileno = vehicle.mobileno || 'Unknown';
          const roundedHours = entryTimeDisplay ? roundUpHours(entryTimeDisplay) : 0;
          const vehicleReaching = isReaching(vehicle);
          const remainingTime = vehicleReaching ? getRemainingTime(vehicle) : '';
          const formattedReachTime = vehicle.formattedReachTime || (vehicle.reachTime ? formatTime(vehicle.reachTime) : '');
          return (
            <div key={vehicle.id} className="bg-gradient-to-br from-gray-50 via-white to-zinc-200 rounded-2xl overflow-hidden shadow-2xl transform transition-all border border-zinc-100 relative">
              <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white via-zinc-100 to-zinc-200 opacity-50 z-0"></div>
              <div className="absolute top-0 left-0 right-0 h-1/3 bg-gradient-to-b from-white to-transparent opacity-80 z-10 blur-sm"></div>
              <div className="absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br from-white to-zinc-200 rounded-full opacity-70 blur-xl z-0"></div>
              <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-gradient-to-tr from-white to-zinc-200 rounded-full opacity-70 blur-xl z-0"></div>
              <div className="absolute -top-10 -left-10 bottom-10 right-10 bg-gradient-to-br from-white to-transparent opacity-30 transform rotate-12 z-0"></div>
              <div className="p-6 relative bg-opacity-40 backdrop-blur-sm z-20">
                <div className="absolute top-0 left-5 w-2/3 h-1 bg-white opacity-80 transform -rotate-45 blur-sm z-10"></div>
                <div className="absolute bottom-10 right-5 w-1/2 h-1 bg-white opacity-60 transform rotate-45 blur-sm z-10"></div>
                <div className="flex justify-between items-start mb-6">
                  <div className="relative">
                    <div className="bg-gradient-to-r from-blue-400 to-indigo-500 text-transparent bg-clip-text text-sm font-bold mb-1">Parking Status</div>
                    <div className="text-gray-700 text-xl font-bold flex items-center">
                      <span className="mr-2">Vehicle #{vehicleNumber}</span>
                      <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                    </div>
                    <div className="absolute -bottom-1 left-0 w-12 h-px bg-gradient-to-r from-blue-400 to-indigo-500"></div>
                  </div>
                  <div className="relative bg-white p-1 rounded-lg shadow-lg overflow-hidden" onClick={() => handleQrCodeClick(vehicle.id || "unknown", mobileno)}>
                    <QRCodeGenerator sessionId={vehicle.id || "unknown"} mobileNo={mobileno} size={64}/>
                    <div className="absolute top-0 left-0 right-0 h-1/4 bg-gradient-to-b from-white to-transparent opacity-60"></div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-gray-700 text-sm mt-4">
                  <div className="bg-gradient-to-br from-white to-zinc-100 p-3 rounded-lg shadow-md backdrop-blur-sm border border-zinc-100 overflow-hidden relative">
                    <div className="absolute top-0 left-0 right-0 h-1/3 bg-gradient-to-b from-white to-transparent opacity-80"></div>
                    <p className="text-gray-500 text-xs font-medium relative z-10">Key Handover</p>
                    <p className="mb-0 font-semibold relative z-10">{parkingSlot}</p>
                  </div>
                  <div className="bg-gradient-to-br from-white to-zinc-100 p-3 rounded-lg shadow-md backdrop-blur-sm border border-zinc-100 overflow-hidden relative">
                    <div className="absolute top-0 left-0 right-0 h-1/3 bg-gradient-to-b from-white to-transparent opacity-80"></div>
                    <p className="text-gray-500 text-xs font-medium relative z-10">Area</p>
                    <p className="mb-0 font-semibold relative z-10">{parkingArea}</p>
                  </div>
                  <div className="bg-gradient-to-br from-white to-zinc-100 p-3 rounded-lg shadow-md backdrop-blur-sm border border-zinc-100 overflow-hidden relative">
                    <div className="absolute top-0 left-0 right-0 h-1/3 bg-gradient-to-b from-white to-transparent opacity-80"></div>
                    <p className="text-gray-500 text-xs font-medium relative z-10">Mobile</p>
                    <p className="mb-0 font-semibold relative z-10">{mobileno}</p>
                  </div>
                  <div className="bg-gradient-to-br from-white to-zinc-100 p-3 rounded-lg shadow-md backdrop-blur-sm border border-zinc-100 overflow-hidden relative">
                    <div className="absolute top-0 left-0 right-0 h-1/3 bg-gradient-to-b from-white to-transparent opacity-80"></div>
                    <p className="text-gray-500 text-xs font-medium relative z-10">Payment</p>
                    <p className={`mb-0 font-semibold relative z-10 ${((vehicle.advance_payment || 0) > 0 ? 'text-green-600' : 'text-amber-500')}`}>
                      {(vehicle.advance_payment || 0) > 0 ? `Advance Paid: ₹${vehicle.advance_payment}` : "No Advance Payment"}
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-white to-zinc-100 p-3 rounded-lg shadow-md backdrop-blur-sm border border-zinc-100 overflow-hidden relative">
                    <div className="absolute top-0 left-0 right-0 h-1/3 bg-gradient-to-b from-white to-transparent opacity-80"></div>
                    <p className="text-gray-500 text-xs font-medium relative z-10">Duration</p>
                    <p className="mb-0 font-semibold relative z-10">
                      <LiveTimer entryTimeStr={entryTimeDisplay} />
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-white to-zinc-100 p-3 rounded-lg shadow-md backdrop-blur-sm border border-zinc-100 overflow-hidden relative">
                    <div className="absolute top-0 left-0 right-0 h-1/3 bg-gradient-to-b from-white to-transparent opacity-80"></div>
                    <p className="text-gray-500 text-xs font-medium relative z-10">Round Of Hours</p>
                    <p className="mb-0 font-semibold relative z-10">{roundedHours} hrs</p>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-gradient-to-br from-white to-zinc-100 rounded-lg shadow-md backdrop-blur-sm border border-zinc-100 relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-1/3 bg-gradient-to-b from-white to-transparent opacity-80"></div>
                  <p className="text-gray-500 text-xs relative z-10">
                    Entry: {entryTimeDisplay ? new Date(entryTimeDisplay).toLocaleString() : 'Unknown'}
                  </p>
                  {formattedReachTime && (
                    <p className="text-orange-500 text-xs mt-1 relative z-10">
                    Recent Expected Arrival: {formattedReachTime}
                    </p>
                  )}
                </div>
                <div className="mt-6 p-4 bg-gradient-to-br from-white to-zinc-100 rounded-lg shadow-md backdrop-blur-sm border border-zinc-100 relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-1/3 bg-gradient-to-b from-white to-transparent opacity-80"></div>
                  <p className={`text-blue-800 text-xs relative z-10 ${exitcustomer === 'exited' ? 'text-red-600 font-bold' : ''}`}>
                    {exitTimeDisplay ? `Exit: ${new Date(exitTimeDisplay).toLocaleString()}` : 'Thank you for shopping with us! Have a wonderful day..!'}</p>
                  <p className={`text-green-600 text-xs mt-1 relative z-10 ${exitcustomer === 'exited' ? 'text-red-600 font-bold' : ''}`}>
                    {exitcustomer === 'exited' ? "You're now exited" : exitcustomer === 'parked'? "Now On Shopping" : null}</p>
                </div>
              </div>
              <div className="bg-gradient-to-br from-zinc-50 to-zinc-200 p-5 flex items-center justify-between border-t border-zinc-100 relative z-10 overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white to-transparent opacity-50"></div>
                <div className="text-sky-700 text-lg font-bold flex items-center relative z-10">
                  <span className="bg-gradient-to-r from-blue-400 to-indigo-500 h-5 w-1 rounded-full mr-2"></span>
                  ParkID: {`${parkingid}`}
                </div>
                <div className="flex flex-col items-end relative z-10">
  {parkingSlot === "yes" && (
    <button 
      onClick={() => handleReachedParking(vehicle)}
      disabled={vehicleReaching}
      className={`${vehicleReaching 
        ? 'bg-gray-300 cursor-not-allowed' 
        : 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700'} text-white rounded-md px-4 py-2 text-sm flex items-center transition-all shadow-lg relative overflow-hidden`}
    >
      {!vehicleReaching && (
        <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white to-transparent opacity-30"></div>
      )}
      {vehicleReaching ? (
        <svg xmlns="https://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      ) : (
        <svg xmlns="https://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
        </svg>
      )}
      {vehicleReaching ? 'Already On The Way' : 'Reached To Parking'}
    </button>
  )}
  {remainingTime && (
    <span className="text-xs text-gray-500 mt-1 bg-white px-3 py-1 rounded-full shadow-md relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white to-transparent opacity-60"></div>
      <span className="relative z-10">{remainingTime}</span>
    </span>
  )}
</div>
              </div>
              <p className="text-sm text-center text-red-900 italic">Terms & Conditions Apply*</p>
            </div>
          );
        })}
      </div>
      {mounted && (
        <>
        <Dialog open={openDialog} onOpenChange={setOpenDialog}>
          <DialogContent className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 sm:max-w-md bg-gradient-to-br from-white to-zinc-100 border border-zinc-100 shadow-xl overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1/4 bg-gradient-to-b from-white to-transparent opacity-70 z-0"></div>
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br from-white to-zinc-200 rounded-full opacity-50 blur-xl z-0"></div>
            <div className="absolute bottom-0 left-0 w-1/2 h-1/3 bg-gradient-to-tr from-white to-transparent opacity-30 z-0"></div>
            <DialogHeader className="relative z-10">
              <DialogTitle className="text-gray-800 relative">
                <span className="bg-gradient-to-r from-blue-500 to-indigo-600 text-transparent bg-clip-text">Set Reach Time</span>
                <div className="absolute -bottom-1 left-0 w-12 h-px bg-gradient-to-r from-blue-400 to-indigo-500"></div>
              </DialogTitle>
            </DialogHeader>
            <div className="p-4 relative z-10">
              <p className="text-sm text-gray-600 mb-4">
                When will you reach the parking area? Select an estimated time:
              </p>
              <Select value={reachTime} onValueChange={setReachTime}>
                <SelectTrigger className="w-full mb-4 bg-white border-zinc-200 shadow-md relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white to-transparent opacity-50"></div>
                  <SelectValue placeholder="Select time" className="relative z-10" />
                </SelectTrigger>
                <SelectContent className="bg-white border-zinc-200 shadow-lg">
                  {[15, 20, 25, 30].map(minutes => (
                    <SelectItem key={minutes} value={minutes.toString()} className="hover:bg-zinc-50">
                      {minutes} minutes
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-gray-600 mb-4">
                You will reach at: {formatTime(new Date(Date.now() + parseInt(reachTime) * 60 * 1000))}
              </p>
              <Button
                onClick={handleSubmitReachTime}
                className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 relative overflow-hidden"
                disabled={updatingStatus}
              >
                {!updatingStatus && (
                  <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white to-transparent opacity-30"></div>
                )}
                <span className="relative z-10">{updatingStatus ? 'Saving...' : 'Confirm'}</span>
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        <Dialog open={qrCodeDialog} onOpenChange={setQrCodeDialog}>
        <DialogContent className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 sm:max-w-md bg-gradient-to-br from-white to-zinc-100 border border-zinc-100 shadow-xl overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1/4 bg-gradient-to-b from-white to-transparent opacity-70 z-0"></div>
          <div className="absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br from-white to-zinc-200 rounded-full opacity-50 blur-xl z-0"></div>
          <div className="absolute bottom-0 left-0 w-1/2 h-1/3 bg-gradient-to-tr from-white to-transparent opacity-30 z-0"></div>
          <DialogHeader className="relative z-10">
            <DialogTitle className="text-gray-800 relative">
              <span className="bg-gradient-to-r from-blue-500 to-indigo-600 text-transparent bg-clip-text">Parking QR Code</span>
              <div className="absolute -bottom-1 left-0 w-12 h-px bg-gradient-to-r from-blue-400 to-indigo-500"></div>
            </DialogTitle>
          </DialogHeader>
          <div className="p-4 relative z-10 flex flex-col items-center">
            <div className="bg-white p-4 rounded-lg shadow-lg overflow-hidden relative mb-4">
              <QRCodeGenerator sessionId={qrCodeData.sessionId} mobileNo={qrCodeData.mobileNo} size={200} />
              <div className="absolute top-0 left-0 right-0 h-1/4 bg-gradient-to-b from-white to-transparent opacity-60"></div>
            </div>
                <p className="text-xs text-gray-500 italic">
                  Present this QR code at the parking gate for quick access
                </p>
                <Button
                  onClick={() => setQrCodeDialog(false)}
                  className="w-full mt-4 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white to-transparent opacity-30"></div>
                  <span className="relative z-10">Close</span>
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}
    </>
  );
};

export default ParkingCard;