import { useState,useEffect,useMemo } from 'react';
import { useAtom } from 'jotai';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import { vehiclesAtom,parkingSlotsAtom,selectedVehicleTypeAtom } from '@/app/atoms/parkingAtoms';
import { Vehicle,EntryFormValues, entryFormSchema } from '@/app/types/parkingTypes';
import { useNotification } from '@/app/service/NotificationSystem';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Form,FormControl,FormDescription,FormField,FormItem,FormLabel,FormMessage } from '@/components/ui/form';
import { Select,SelectContent,SelectItem,SelectTrigger,SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { CarFront, Bike, Clock, CreditCard, Receipt, MapPin, AlertTriangle, Key } from 'lucide-react';
import Cookies from 'js-cookie';
import useSWR from 'swr';
import { UserData } from '@/app/types/Routetypes'
import PARKING_CONNECT from '@/app/connection/config'

const fetcher = (url: string) => axios.get(url).then(res => res.data);

export default function ParkingEntryForm() {
  const [vehicles, setVehicles] = useAtom(vehiclesAtom);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [parkingSlots, setParkingSlots] = useAtom(parkingSlotsAtom);
  const [, setSelectedVehicleType] = useAtom(selectedVehicleTypeAtom);
  const [submitting, setSubmitting] = useState(false);
  const [mobileExists, setMobileExists] = useState(false);
  const [checking, setChecking] = useState(false);
  const [notificationShown, setNotificationShown] = useState(false);
  const { showNotification } = useNotification();
  const defaultValues: Partial<EntryFormValues> = {
    plateNumber: "",
    mobileno: "",
    // vehicleType: "car",
    parkingArea: "",
    keyHandover: "no",
    paymentMethod: "cash",
  };

  const [isStatsPopupOpen, setIsStatsPopupOpen] = useState(false);

  const form = useForm<EntryFormValues>({
    resolver: zodResolver(entryFormSchema),
    defaultValues,
  });

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
  
// Add this new effect to fetch the parking statistics
const { data: statsData, error: statsError, mutate: mutateStats } = useSWR(() => {
  try {
    const userData = decodeUserDataCookie();
    const parkingArea = userData.parkingArea?.trim();
    
    if (!parkingArea) return null;
    
    return `${PARKING_CONNECT}/Parking-statics/${encodeURIComponent(parkingArea)}`;
  } catch (error) {
    console.error('Error getting parking area for stats:', error);
    return null;
  }
}, fetcher);

// Create a derived parkingStats object from the SWR data
const parkingStats = useMemo(() => {
  if (!statsData || !statsData.statistics) {
    return {
      exitVehicleCount: 0,
      parkedVehicleCount: 0,
      advancePaymentCount: 0,
      advanceAmount: 0, // Add this line
      totalAmount: 0,
      amountTaken: 0
    };
  }
  
  try {
    const userData = decodeUserDataCookie();
    const parkingArea = userData.parkingArea?.trim();
    
    if (!parkingArea) return {
      exitVehicleCount: 0,
      parkedVehicleCount: 0,
      advancePaymentCount: 0,
      advanceAmount: 0, // Add this line
      totalAmount: 0,
      amountTaken: 0
    };
    
    const areaStats = statsData.statistics.byParkingArea[parkingArea] || {
      parked: 0,
      exited: 0,
      advancePayments: 0,
      totalAmount: 0,
      amountCollected: 0,
      advanceAmount: 0 // Add this line
    };
    
    return {
      exitVehicleCount: areaStats.exited,
      parkedVehicleCount: areaStats.parked,
      advancePaymentCount: areaStats.advancePayments,
      advanceAmount: areaStats.advanceAmount, // Add this line
      totalAmount: areaStats.totalAmount,
      amountTaken: areaStats.amountCollected
    };
  } catch (error) {
    console.error('Error processing stats data:', error);
    return {
      exitVehicleCount: 0,
      parkedVehicleCount: 0,
      advancePaymentCount: 0,
      advanceAmount: 0, // Add this line
      totalAmount: 0,
      amountTaken: 0
    };
  }
}, [statsData]);

  const vehicleType = form.watch("vehicleType");
  const mobileNo = form.watch("mobileno");
  const parkingArea = form.watch("parkingArea");

  useEffect(() => {
    try {
      const userData = decodeUserDataCookie();
  
      if (userData.parkingArea) {
        const normalizedUserParkingArea = userData.parkingArea.trim().toLowerCase();
  
        const carParkingAreas = [
          "valet parking",
          "puzzle parking",
          "l-kart parking",
          "surface parking (f)",
          "surface parking (p)",
          "season parking (a)",
          "season parking (l)",
          "basement parking",
        ];
        const bikeParkingAreas = ["surface parking", "basement parking"];
  
        let vehicleType = "";
  
        if (carParkingAreas.includes(normalizedUserParkingArea)) {
          vehicleType = "car";
        } else if (bikeParkingAreas.includes(normalizedUserParkingArea)) {
          vehicleType = "bike";
        }
  
        if (vehicleType) {
          form.setValue("vehicleType", vehicleType, {
            shouldValidate: true,
            shouldDirty: true,
          });
  
          form.setValue("parkingArea", userData.parkingArea, {
            shouldValidate: true,
            shouldDirty: true,
          });
        }
      }
    } catch (error) {
      console.error("Error setting vehicle type and parking area:", error);
    }
  }, [form, parkingArea]);
  useEffect(() => {
    setSelectedVehicleType(vehicleType as 'car' | 'bike');
  
    if (vehicleType === 'bike') {
      form.setValue('keyHandover', 'no');
      form.setValue('parkingArea', 'Basement Parking');
    } else if (vehicleType === 'car') {
      // If it's a car and no parking area is set, try to use the user's parking area
      if (!form.getValues('parkingArea')) {
        try {
          const userData = decodeUserDataCookie();
          if (userData.parkingArea) {
            form.setValue('parkingArea', userData.parkingArea);
          }
        } catch (error) {
          console.error("Error setting parking area for car:", error);
        }
      }
    }
  }, [vehicleType, setSelectedVehicleType, form]);
  
  const handlePlateNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const filteredValue = value.replace(/[^a-zA-Z0-9]/g, '');
    form.setValue('plateNumber', filteredValue.toUpperCase(), { shouldValidate: true });
  };

  // Replace your useEffect for mobile number checking with this:
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const { data: mobileCheckData, error: mobileCheckError } = useSWR(
  () => mobileNo && mobileNo.length === 10 ? `${PARKING_CONNECT}/Parking-checkparking/${mobileNo}` : null,
  fetcher,
  { 
    dedupingInterval: 2000,
    onSuccess: (data) => {
      if (data?.exists && !notificationShown) {
        showNotification({
          type: 'warning',
          title: 'Vehicle Already Parked',
          message: `Mobile number ${mobileNo} already has a vehicle parked in the system.`,
          duration: 5000,
        });
        setNotificationShown(true);
      } else if (!data?.exists) {
        setNotificationShown(false);
      }
    }
  }
);

// Update the mobileExists state to use SWR data
useEffect(() => {
  if (mobileCheckData) {
    setMobileExists(mobileCheckData.exists);
    setChecking(false);
  } else {
    setMobileExists(false);
  }
}, [mobileCheckData]);

// Update the checking state
useEffect(() => {
  if (mobileNo && mobileNo.length === 10) {
    setChecking(true);
  } else {
    setChecking(false);
    setMobileExists(false);
    setNotificationShown(false);
  }
}, [mobileNo]);

  useEffect(() => {
    setSelectedVehicleType(vehicleType as 'car' | 'bike');

    if (vehicleType === 'bike') {
      form.setValue('keyHandover', 'no');
      form.setValue('parkingArea', 'Basement Parking');
    }
  }, [vehicleType, setSelectedVehicleType, form]);

  // Calculate rates based on vehicle type
  const hourlyRate = vehicleType === 'car' ? 100 : 50;
  const estimatedAmount = 2 * hourlyRate;
  const advancePayment = vehicleType === 'car' ? 100 : 0;

  async function onSubmit(data: EntryFormValues) {
   const userData = decodeUserDataCookie();
    try {
      setSubmitting(true);
      const checkResponse = await axios.get(`${PARKING_CONNECT}/Parking-checkparking/${data.mobileno}`);

      if (checkResponse.data.exists) {
        showNotification({
          type: 'error',
          title: 'Registration Failed',
          message: `Mobile number ${data.mobileno} already has a vehicle parked in the system.`,
          duration: 5000,
        });
        setSubmitting(false);
        return;
      }
    } catch (error) {
      console.error('Error checking mobile number during submission:', error);
    }
    const vehicleData = {
      vehicle_no: data.plateNumber,
      mobileno: data.mobileno,
      vehicle_type: data.vehicleType,
      parking_area: data.parkingArea,
      entry_time: new Date().toISOString(),
      advance_payment: advancePayment,
      payment_method: data.vehicleType === 'car' ? data.paymentMethod : 'not paid',
      total_amount: estimatedAmount,
      balance_amount: estimatedAmount - advancePayment,
      paid: advancePayment >= estimatedAmount,
      key_handover: data.vehicleType === 'car' ? data.keyHandover : 'no',
      status: 'parked',
      branch: userData.branch || null,
    };

    try {
      const response = await axios.post(`${PARKING_CONNECT}/Parking-Register`, vehicleData);

      const newVehicleEntry: Vehicle = {
        id: response.data.id || uuidv4(),
        plateNumber: data.plateNumber,
        mobileno: data.mobileno,
        vehicleType: data.vehicleType,
        parkingArea: data.parkingArea,
        entryTime: new Date().toISOString(),
        advancePayment: advancePayment,
        paymentMethod: data.vehicleType === 'car' ? data.paymentMethod : 'not paid',
        totalAmount: estimatedAmount,
        balanceAmount: estimatedAmount - advancePayment,
        paid: advancePayment >= estimatedAmount,
        keyHandover: data.vehicleType === 'car' ? data.keyHandover : 'no',
        status: 'parked',
      };

      setVehicles([...vehicles, newVehicleEntry]);

      showNotification({
        type: 'success',
        title: 'Success',
        message: 'Vehicle entry registered successfully!',
        action: {
          label: 'View Details',
          onClick: () => {
            console.log('View vehicle details:', newVehicleEntry);
          }
        }
      });
      mutateStats();
      form.reset(defaultValues);
      setMobileExists(false);
    } catch (error) {
      console.error('Error registering vehicle:', error);
      showNotification({
        type: 'error',
        title: 'Registration Failed',
        message: 'Failed to register vehicle entry. Please try again.',
        duration: 8000,
      });
    } finally {
      setSubmitting(false);
    }
  }

  const isButtonDisabled = submitting|| mobileExists || checking || mobileNo?.length !== 10;

  return (
    <div className="w-full">
              {/* Add Statistics Button */}
<div className="mt-4 flex justify-end">
  <Button 
    type="button"
    onClick={() => setIsStatsPopupOpen(true)}
    className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg shadow-md text-sm font-medium"
  >
    Show Statistics
  </Button>
</div>

{/* Statistics Popup */}
{isStatsPopupOpen && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
      {/* Header remains the same */}
      <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-blue-50">
        <h3 className="text-lg font-bold text-blue-700">Parking Area Statistics</h3>
        <Button 
          type="button" 
          onClick={() => setIsStatsPopupOpen(false)}
          variant="ghost" 
          className="h-8 w-8 p-0 rounded-full"
        >
          ✕
        </Button>
      </div>
      <div className="p-6">
        {!statsData && !statsError ? (
          <div className="flex justify-center items-center py-8">
            <svg className="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        ) : statsError ? (
          <div className="text-red-500 text-center py-8">
            Failed to load statistics. Please try again.
          </div>
        ) : (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-600">Parked Vehicles</span>
            <span className="font-bold text-blue-600">{parkingStats.parkedVehicleCount}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-600">Exited Vehicles</span>
            <span className="font-bold text-green-600">{parkingStats.exitVehicleCount}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-600">Advance Payments</span>
            <span className="font-bold text-amber-600">{parkingStats.advancePaymentCount}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-600">Advance Amount</span>
            <span className="font-bold text-purple-600">₹{parkingStats.advanceAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-600">Total Amount</span>
            <span className="font-bold text-green-600">₹{parkingStats.totalAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-600">Amount Collected</span>
            <span className="font-bold text-red-600">₹{parkingStats.amountTaken.toFixed(2)}</span>
          </div>
        </div>
        )}
      </div>
    </div>
  </div>
)}
      <CardContent className="pt-6">

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <FormField
                control={form.control}
                name="plateNumber"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel className="text-gray-800 font-semibold text-sm tracking-wide">Vehicle Plate Number</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="TN XX AA XXXX" 
                        value={field.value}
                        onChange={(e) => {
                          handlePlateNumberChange(e);
                        }}
                        onBlur={field.onBlur}
                        name={field.name}
                        className={`border-gray-300 focus:ring-blue-500 focus:border-blue-500 shadow-sm ${fieldState.invalid ? 'border-red-500 ring-red-500' : ''}`}
                        maxLength={14}
                        style={{ textTransform: 'uppercase' }}
                      />
                    </FormControl>
                    <FormMessage className="text-xs font-medium" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="mobileno"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel className="text-gray-800 font-semibold text-sm tracking-wide">Mobile Number</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input 
                          placeholder="Mobile No Must 10 digit" 
                          {...field} 
                          className={`border-gray-300 focus:ring-blue-500 focus:border-blue-500 shadow-sm 
                            ${fieldState.invalid ? 'border-red-500 ring-red-500' : ''}
                            ${mobileExists ? 'border-amber-500 ring-amber-500' : ''}`}
                          maxLength={10}
                        />
                        {checking && (
                          <div className="absolute right-2 top-2">
                            <svg className="animate-spin h-5 w-5 text-blue-500" xmlns="https://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                          </div>
                        )}
                        {mobileExists && !checking && field.value?.length === 10 && (
                          <div className="absolute right-2 top-2 text-amber-500">
                            <AlertTriangle className="h-5 w-5" />
                          </div>
                        )}
                      </div>
                    </FormControl>
                    <FormMessage className="text-xs font-medium" />
                    {mobileExists && !checking && field.value?.length === 10 && (
                      <div className="text-amber-600 text-xs font-medium mt-1">
                        This mobile number already has a vehicle parked in the system.
                      </div>
                    )}
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="vehicleType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-800 font-semibold text-sm tracking-wide">Vehicle Type</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="border-gray-300 focus:ring-blue-500 focus:border-blue-500 shadow-sm">
                          <SelectValue placeholder="Select vehicle type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="car">
                          <div className="flex items-center">
                            <CarFront className="mr-2 h-4 w-4 text-blue-600" />
                            <span className="font-medium">Car</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="bike">
                          <div className="flex items-center">
                            <Bike className="mr-2 h-4 w-4 text-green-600" />
                            <span className="font-medium">Bike</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-xs font-medium" />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
<FormField
  control={form.control}
  name="parkingArea"
  render={({ field, fieldState }) => (
    <FormItem>
      <FormLabel className="text-gray-800 font-semibold text-sm tracking-wide">
        Parking Area
      </FormLabel>
      <FormControl>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-blue-800" />
          <Input
            placeholder="Enter Parking Area"
            {...field}
            disabled
            className={`pl-10 border-gray-300 focus:ring-blue-500 focus:border-blue-500 shadow-sm 
              ${fieldState.invalid ? 'border-red-500 ring-red-500' : ''}`}
          />
        </div>
      </FormControl>
      <FormMessage className="text-xs font-medium" />
    </FormItem>
  )}
/>


{vehicleType === 'car' && (
                <FormField
                  control={form.control}
                  name="keyHandover"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-800 font-semibold text-sm tracking-wide">Key Handover</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="border-gray-300 focus:ring-blue-500 focus:border-blue-500 shadow-sm">
                            <SelectValue placeholder="Key handover status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="yes">
                            <div className="flex items-center">
                              <Key className="mr-2 h-4 w-4 text-green-600" />
                              <span className="font-medium">Yes</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="no">
                            <div className="flex items-center">
                              <Key className="mr-2 h-4 w-4 text-red-600" />
                              <span className="font-medium">No</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription className="text-gray-500 text-xs font-medium">
                        Indicate if the car key was handed over
                      </FormDescription>
                      <FormMessage className="text-xs font-medium" />
                    </FormItem>
                  )}
                />
            )}
                        {vehicleType === 'car' && (
  <FormField
    control={form.control}
    name="paymentMethod"
    render={({ field }) => (
      <FormItem>
        <FormLabel className="text-gray-800 font-semibold text-sm tracking-wide">Advance Payment Method</FormLabel>
        <Select 
          onValueChange={field.onChange} 
          defaultValue={field.value}
        >
          <FormControl>
            <SelectTrigger className="border-gray-300 focus:ring-blue-500 focus:border-blue-500 shadow-sm">
              <SelectValue placeholder="Select payment method" />
            </SelectTrigger>
          </FormControl>
          <SelectContent>
            <SelectItem value="cash">
              <div className="flex items-center">
                <CreditCard className="mr-2 h-4 w-4 text-green-600" />
                <span className="font-medium">Cash</span>
              </div>
            </SelectItem>
            <SelectItem value="upi">
              <div className="flex items-center">
                <CreditCard className="mr-2 h-4 w-4 text-blue-600" />
                <span className="font-medium">UPI</span>
              </div>
            </SelectItem>
            <SelectItem value="card">
              <div className="flex items-center">
                <CreditCard className="mr-2 h-4 w-4 text-blue-600" />
                <span className="font-medium">Card</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
        <FormDescription className="text-gray-500 text-xs font-medium">
          Select payment method for advance payment
        </FormDescription>
        <FormMessage className="text-xs font-medium" />
      </FormItem>
    )}
  />
)}
            </div>


            <Separator className="my-6" />

            <Card className="border border-gray-200 shadow-sm overflow-hidden">
              <div className="bg-gray-50 py-3 px-4 border-b border-gray-200">
                <h3 className="text-base font-bold text-gray-800">Fee Details</h3>
              </div>
              <div className="p-4">
                <div className="flex flex-col space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <div className="bg-blue-50 p-2 rounded-full mr-3">
                        <Clock className="h-4 w-4 text-blue-600" />
                      </div>
                      <span className="text-sm font-medium text-gray-600">Hourly Rate</span>
                    </div>
                    <span className="font-bold text-blue-600">₹{hourlyRate.toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <div className="bg-amber-50 p-2 rounded-full mr-3">
                        <Receipt className="h-4 w-4 text-amber-600" />
                      </div>
                      <span className="text-sm font-medium text-gray-600">Est. Amount (2hrs)</span>
                    </div>
                    <span className="font-bold text-amber-600">₹{estimatedAmount.toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <div className="bg-green-50 p-2 rounded-full mr-3">
                        <CreditCard className="h-4 w-4 text-green-600" />
                      </div>
                      <span className="text-sm font-medium text-gray-600">Advance Payment</span>
                    </div>
                    <span className="font-bold text-green-600">₹{advancePayment.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </Card>

            <div className="flex justify-end">
            <Button type="submit" size="lg" className={`relative bg-blue-600 hover:bg-blue-700text-white py-2 px-6 rounded-lg shadow-lg transition-all font-medium 
        text-sm transform hover:-translate-y-1 active:translate-y-0 3d-button-effect ${isButtonDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      style={{boxShadow: `0 4px 6px -1px rgba(0, 0, 0, 0.1),0 2px 4px -1px rgba(0, 0, 0, 0.06),inset 0 2px 4px rgba(255, 255, 255, 0.1)`,transition: 'all 0.3s ease'}}
      disabled={isButtonDisabled}
      title={mobileExists ? "This mobile number already has a vehicle parked" : ""}
    >
      {submitting ? (
        <span className="flex items-center">
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Registering...
        </span>
      ) : (
        <span className="flex items-center">
          <div className="h-5 w-2" />
          Register & Proceed Payment
        </span>
      )}
    </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </div>
  );
}