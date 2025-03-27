import { Vehicle } from '../types/parkingTypes';
// Updated function to handle undefined entry_time
export function calculateParkingCharges(vehicle: Vehicle, exitTime: Date): {
  advance_payment: number;
  hours: number;
  hourlyRate: number;
  finalCharge: number;
  refundAmount: number;
  dueAmount: number;
} {
  // Safely handle entry_time which might be a string, Date object, or undefined
  const entry = vehicle.entry_time ? new Date(vehicle.entry_time) : new Date();
  const diffMs = exitTime.getTime() - entry.getTime();
  
  // Handle both vehicleType and vehicle_type property names
  const type = vehicle.vehicleType || vehicle.vehicle_type || 'bike';
  
  // Determine hourly rate based on vehicle type (MODIFIED RATES)
  const hourlyRate = type === 'car' ? 100 : 50;
  
  // Extract advance payment directly from the API response
  // First check if property exists in the response before using default values
  const advance_payment = vehicle.advance_payment !== undefined ? vehicle.advance_payment : 
                          (type === 'car' ? 100 : 0);
  
  // Calculate completed hours only (no rounding up)
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const finalCharge = hours * hourlyRate;
  
  // Calculate due amount or refund based on advance payment
  let dueAmount = 0;
  let refundAmount = 0;
  if (finalCharge > advance_payment) {
    dueAmount = finalCharge - advance_payment;
    refundAmount = 0;
  } else {
    dueAmount = 0;
    refundAmount = advance_payment - finalCharge;
  }
  
  return {
    hours,
    hourlyRate,
    finalCharge,
    advance_payment,
    refundAmount,
    dueAmount
  };
}
// Updated formatDuration function to handle potential null/undefined values
export function formatDuration(entryTime: Date | string | undefined, exitTime: Date | string): string {
  // Handle undefined entry time
  if (!entryTime) {
    return "N/A";
  }
  
  // Convert string to Date if needed
  const entry = entryTime instanceof Date ? entryTime : new Date(entryTime);
  const exit = exitTime instanceof Date ? exitTime : new Date(exitTime);
  
  // Check for invalid dates
  if (isNaN(entry.getTime()) || isNaN(exit.getTime())) {
    return "Invalid date";
  }
  
  const diffMs = exit.getTime() - entry.getTime();
  const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const diffSecs = Math.floor((diffMs % (1000 * 60)) / 1000);
  return `${diffHrs}h ${diffMins}m ${diffSecs}s`;
}