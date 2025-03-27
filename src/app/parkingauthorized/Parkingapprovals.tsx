import React, { useState } from 'react';
import useSWR, { mutate } from 'swr';
import axios from 'axios';
import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, Check, Search, FileText, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAtom } from 'jotai';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Vehicle, approvalSchema, ApprovalFormData } from '@/app/types/parkingTypes';
import { vehiclesAtom } from '@/app/atoms/parkingAtoms';
import { useNotification } from '@/app/service/NotificationSystem';
import LoadingAnimation from '@/app/service/Loadinganimation';
import PARKING_CONNECT from '@/app/connection/config'

// Fetcher function for SWR
const fetcher = async (url: string) => {
  const response = await axios.get(url);
  return response.data;
};

const PaymentMismatchApproval = () => {
  const [vehicles, setVehicles] = useAtom(vehiclesAtom);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showNotification } = useNotification();

  // SWR hook for data fetching
  const { error: fetchError, isLoading } = useSWR(
    `${PARKING_CONNECT}/Parking-Exit_Mismatch`,
    fetcher,
    {
      onSuccess: (data) => {
        setVehicles(data);
      },
      refreshInterval: 30000, // Refresh every 30 seconds
      revalidateOnFocus: true,
      shouldRetryOnError: true,
      errorRetryCount: 3
    }
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<ApprovalFormData>({
    resolver: zodResolver(approvalSchema),
    defaultValues: {
      message: ''
    }
  });

  // Calculate the payment mismatch amount
  const getMismatchAmount = (vehicle: Vehicle) => {
    const total = parseFloat(vehicle.total_amount || '0');
    const taken = parseFloat(vehicle.amountTaken || '0');
    return (total - taken).toFixed(2);
  };

  // Filter vehicles based on search term
  const filteredVehicles = vehicles.filter(vehicle => 
    (vehicle.vehicle_no?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
    (vehicle.mobileno?.includes(searchTerm) || false)
  );

  const handleApprove = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    reset({ message: '' }); // Reset form when opening dialog
    setShowDialog(true);
  };

  const onSubmit = async (data: ApprovalFormData) => {
    if (!selectedVehicle) return;
    
    setIsSubmitting(true);
    
    try {
      // Show loading notification
      showNotification({
        type: 'info',
        title: 'Processing',
        message: 'Submitting approval request...',
        duration: 0,
      });
      
      // Call your API endpoint to handle the approval with the message
      const endpoint = `${PARKING_CONNECT}/Parking-approve-payment-mismatch/${selectedVehicle.id}`;
      
      await axios.post(endpoint, { message: data.message });
      
      // Update the Jotai atom to remove the processed vehicle
      setVehicles(currentVehicles => 
        currentVehicles.filter(v => v.id !== selectedVehicle.id)
      );
      
      // Revalidate the SWR cache
      mutate(`${PARKING_CONNECT}/Parking-Exit_Mismatch`);
      
      // Show success notification
      showNotification({
        type: 'success',
        title: 'Approval Successful',
        message: `Vehicle ${selectedVehicle.vehicle_no} payment mismatch approved.`,
        duration: 5000,
      });
      
      setActionSuccess(`Vehicle ${selectedVehicle.vehicle_no} payment mismatch approved successfully`);
      
      // Close the dialog
      setShowDialog(false);
      
      // Clear the success message after 3 seconds
      setTimeout(() => {
        setActionSuccess(null);
      }, 3000);
      
    } catch (err) {
      console.error(`Error in approval action:`, err);
      
      // Show error notification
      showNotification({
        type: 'error',
        title: 'Approval Failed',
        message: 'Unable to process your approval request. Please try again.',
        duration: 5000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto py-6 px-4 md:px-6 mt-20">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-green-800">Payment Approval</h1>
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-sm py-1 px-3">
            {filteredVehicles.length} Pending Approvals
          </Badge>
        </div>
        
        {actionSuccess && (
          <Alert className="bg-green-50 border-green-500">
            <Check className="h-4 w-4 text-green-600" />
            <AlertTitle>Success</AlertTitle>
            <AlertDescription>{actionSuccess}</AlertDescription>
          </Alert>
        )}
        
        {fetchError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>Failed to fetch mismatched payment data</AlertDescription>
          </Alert>
        )}
        
        <div className="flex flex-col md:flex-row justify-between gap-4">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search by vehicle no or mobile"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
        
        {/* Card View Only */}
        <div className="mt-4">
          {isLoading ? (
            <LoadingAnimation />
          ) : filteredVehicles.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredVehicles.map((vehicle) => (
                <Card key={vehicle.id} className="overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-300">
                  <CardHeader className="bg-gray-50 pb-3">
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-lg text-blue-800">{vehicle.vehicle_no}</CardTitle>
                      <Badge className="capitalize bg-blue-100 text-blue-800 hover:bg-blue-200">{vehicle.vehicle_type}</Badge>
                    </div>
                    <CardDescription className="text-gray-600">
                      Mobile: {vehicle.mobileno || 'N/A'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Billed Amount:</span>
                        <span className="font-medium">{vehicle.total_amount}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Amount Taken:</span>
                        <span className="font-medium">{vehicle.amountTaken}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Difference:</span>
                        <span className="font-semibold text-red-600">{getMismatchAmount(vehicle)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Parking Area:</span>
                        <span>{vehicle.parkingArea || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Entry Time:</span>
                        <span>
                          {vehicle.entry_time ? format(new Date(vehicle.entry_time), 'dd MMM yyyy, hh:mm a') : 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Exit Time:</span>
                        <span>
                          {vehicle.exit_time ? format(new Date(vehicle.exit_time), 'dd MMM yyyy, hh:mm a') : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between gap-2 bg-gray-50 pt-3 pb-3">
                    <Button
                      className="w-full bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => handleApprove(vehicle)}
                    >
                      <Check className="h-4 w-4 mr-2" /> Approve Variance
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-gray-600">No payment mismatches found</h3>
              <p className="text-gray-500 mt-1">All payment records are reconciled</p>
            </div>
          )}
        </div>
      </div>
      
      <Dialog open={showDialog} onOpenChange={(open) => {
        // Only allow closing if not submitting
        if (!isSubmitting || !open) {
          setShowDialog(open);
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-blue-800">
              Approve Payment Variance
            </DialogTitle>
            <DialogDescription>
              Please enter a justification for approving this payment difference.
            </DialogDescription>
          </DialogHeader>
          
          {selectedVehicle && (
            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="py-4 space-y-3">
                <div className="flex justify-between">
                  <span className="font-medium text-gray-700">Vehicle:</span>
                  <span className="text-blue-800 font-semibold">{selectedVehicle.vehicle_no}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-gray-700">Total Amount:</span>
                  <span>{selectedVehicle.total_amount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-gray-700">Amount Taken:</span>
                  <span>{selectedVehicle.amountTaken}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-gray-700">Difference:</span>
                  <span className="text-red-600 font-semibold">
                    {getMismatchAmount(selectedVehicle)}
                  </span>
                </div>
                
                <div className="pt-2">
                  <label htmlFor="message" className="block text-sm font-medium mb-1 text-gray-700">
                    Approval Justification: <span className="text-red-500">*</span>
                  </label>
                  <Textarea
                    id="message"
                    {...register('message')}
                    placeholder="Enter reason for approving this payment variance"
                    className={`w-full ${errors.message ? 'border-red-500 focus:ring-red-500' : ''}`}
                    rows={3}
                    disabled={isSubmitting}
                  />
                  {errors.message && (
                    <div className="mt-1 text-sm text-red-600 flex items-center">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      {errors.message.message}
                    </div>
                  )}
                </div>
              </div>
              
              <DialogFooter className="sm:justify-between">
                <Button 
                  type="button"
                  variant="outline" 
                  onClick={() => setShowDialog(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-green-600 hover:bg-green-700 text-white"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" /> Confirm Approval
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PaymentMismatchApproval;