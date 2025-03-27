
import { Vehicle } from '../types/parkingTypes';
import { calculateParkingCharges } from './parking';
/**
 * Checks if a vehicle was parked less than 5 minutes ago
 * @param vehicle The vehicle to check
 * @param currentTime The current date/time
 * @returns Boolean indicating if the vehicle was recently parked
 */
export const isRecentlyParked = (vehicle: Vehicle, currentTime: Date): boolean => {
  if (!vehicle.entry_time) return false;
  
  const entryTime = new Date(vehicle.entry_time);
  const timeDiffInMinutes = (currentTime.getTime() - entryTime.getTime()) / (1000 * 60);
  
  return timeDiffInMinutes <= 5;
};

/**
 * Checks if the return button should still be visible (within 10 minutes of parking)
 * @param vehicle The vehicle to check
 * @param currentTime The current date/time
 * @returns Boolean indicating if the return option should be visible
 */
export const isReturnVisible = (vehicle: Vehicle, currentTime: Date): boolean => {
  if (!vehicle.entry_time) return false;
  
  const entryTime = new Date(vehicle.entry_time);
  const timeDiffInMinutes = (currentTime.getTime() - entryTime.getTime()) / (1000 * 60);
  
  return timeDiffInMinutes <= 10;
};

/**
 * Formats a reach time and calculates time remaining
 * @param reachTimeStr The reach time as string, number or Date
 * @param currentTime The current date/time
 * @returns Object containing formatted time and time remaining
 */
export const formatReachTime = (
  reachTimeStr: string | number | Date,
  currentTime: Date
): { formattedTime: string; timeRemaining: string | null } => {
  if (!reachTimeStr) return { formattedTime: 'N/A', timeRemaining: null };
  
  const reachTime = new Date(reachTimeStr);
  const formattedTime = reachTime.toLocaleString();
  
  // Calculate time difference - use getTime() to get timestamps in milliseconds
  const diffMs = reachTime.getTime() - currentTime.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const remainingMins = diffMins % 60;
  
  let timeRemaining = '';
  if (diffMs < 0) {
    // Time has passed
    const pastMins = Math.abs(diffMins);
    const pastHours = Math.floor(pastMins / 60);
    const pastRemainingMins = pastMins % 60;
    
    if (pastHours > 0) {
      timeRemaining = `${pastHours}h ${pastRemainingMins}m ago`;
    } else {
      timeRemaining = `${pastRemainingMins}m ago`;
    }
  } else {
    // Time is in future
    if (diffHours > 0) {
      timeRemaining = `${diffHours}h ${remainingMins}m left`;
    } else {
      timeRemaining = `${remainingMins}m left`;
    }
  }
  
  return { formattedTime, timeRemaining };
};

/**
 * Determines the background color for a vehicle card based on its status
 * @param vehicle The vehicle to check
 * @param currentTime The current date/time
 * @param exitingVehicleId Optional ID of a vehicle that is currently exiting
 * @returns CSS class string for the background color
 */
export const getPaymentStatusBgColor = (
  vehicle: Vehicle, 
  currentTime: Date, 
  exitingVehicleId: string | null = null
): string => {
  if (exitingVehicleId === vehicle.id) {
    return 'bg-red-100'; // Red background for exiting vehicles
  }
  
  // Check for reach time first
  if (vehicle.reachTime) {
    const reachTime = new Date(vehicle.reachTime);
    const isReachTimeCrossed = reachTime < currentTime;
    
    if (!isReachTimeCrossed) {
      // Upcoming reach time - red background
      return 'bg-red-100';
    } else {
      // Crossed reach time - pink background
      return 'bg-pink-100';
    }
  }

  // If no reach time, use the existing logic
  if (isRecentlyParked(vehicle, currentTime)) {
    return 'bg-yellow-50'; // Yellow background for recently parked vehicles
  }

  // Ensure entry_time is valid
  const entryTime = vehicle.entry_time ? new Date(vehicle.entry_time) : new Date();

  // Calculate parking charges
  const charges = calculateParkingCharges({ ...vehicle, entry_time: entryTime }, currentTime);

  // Fully paid vehicle (no remaining balance)
  if (charges.dueAmount === 0) {
    return 'bg-green-50'; // Green background
  }

  // Vehicle has advance payment but still has a remaining balance
  if (vehicle.advance_payment && vehicle.advance_payment > 0) {
    return 'bg-blue-50'; // Blue background
  }

  // No advance payment (default)
  return 'bg-purple-50';
};

/**
 * Sorts and filters vehicles based on search criteria and time-based priorities
 * @param parkedVehicles - List of all parked vehicles
 * @param mobileSearch - Search string for mobile number filtering
 * @param currentTime - Current date/time for comparative operations
 * @returns Sorted and filtered array of vehicles
 */
export const getSortedFilteredVehicles = (
  parkedVehicles: Vehicle[],
  mobileSearch: string,
  currentTime: Date
): Vehicle[] => {
  // Start with all vehicles
  let filtered = [...parkedVehicles];
    
  // Apply mobile search filter if needed
  if (mobileSearch.trim() !== '') {
    filtered = filtered.filter(vehicle =>
      vehicle.mobileno && 
      vehicle.mobileno.toString().includes(mobileSearch.trim())
    );
  }

  // Split vehicles into three categories for proper sorting
  const upcomingReachTimeVehicles: Vehicle[] = [];
  const passedReachTimeVehicles: Vehicle[] = [];
  const regularVehicles: Vehicle[] = [];
    
  // Categorize vehicles
  filtered.forEach(vehicle => {
    if (vehicle.reachTime) {
      const reachTime = new Date(vehicle.reachTime);
      if (reachTime > currentTime) {
        upcomingReachTimeVehicles.push(vehicle);
      } else {
        passedReachTimeVehicles.push(vehicle);
      }
    } else {
      regularVehicles.push(vehicle);
    }
  });

  // Sort upcoming reach time vehicles by reach time (closest first)
  upcomingReachTimeVehicles.sort((a, b) => {
    const aReachTime = new Date(a.reachTime as string | number | Date);
    const bReachTime = new Date(b.reachTime as string | number | Date);
    return aReachTime.getTime() - bReachTime.getTime();
  });

  // Sort passed reach time vehicles by how recently they passed (most recent first)
  passedReachTimeVehicles.sort((a, b) => {
    const aReachTime = new Date(a.reachTime as string | number | Date);
    const bReachTime = new Date(b.reachTime as string | number | Date);
    return bReachTime.getTime() - aReachTime.getTime();
  });

  // Sort regular vehicles by entry time (newest first)
  regularVehicles.sort((a, b) => {
    const aEntryTime = a.entry_time ? new Date(a.entry_time as string | number | Date) : new Date(0);
    const bEntryTime = b.entry_time ? new Date(b.entry_time as string | number | Date) : new Date(0);
    return bEntryTime.getTime() - aEntryTime.getTime();
  });

  // Combine all categories in priority order
  return [
    ...upcomingReachTimeVehicles,
    ...passedReachTimeVehicles,
    ...regularVehicles
  ];
};