import { useAtom } from 'jotai';
import { Vehicles, DailyStats } from '@/app/types/ReportTypes';
import {currentPageAtom,totalPagesAtom} from '../atoms/parkingAtoms'
import { startOfDay, endOfDay, differenceInMinutes, format } from 'date-fns';

export interface Stats {
  totalVehicles: number;
  carCount: number;
  bikeCount: number;
  totalRevenue: number;
  averageParkingTime: number;
  currentlyParked: number;
  todayRevenue: number;
  weeklyRevenue: number;
  occupancyRate: number;
  peakHour: string;
  slowestHour: string;
}
export function usePagination() {
    const [currentPage, setCurrentPage] = useAtom(currentPageAtom);
    const [totalPages] = useAtom(totalPagesAtom);
  
    const handlePrevPage = () => {
      if (currentPage > 1) {
        setCurrentPage(currentPage - 1);
      }
    };
  
    const handleNextPage = () => {
      if (currentPage < totalPages) {
        setCurrentPage(currentPage + 1);
      }
    };
  
    return { currentPage, totalPages, handlePrevPage, handleNextPage };
  }

export const calculateStats = (data: Vehicles[]): Stats => {
  const totalVehicles = data.length;
  const carCount = data.filter(v => v.vehicle_type.toLowerCase().includes('car')).length;
  const bikeCount = data.filter(v => v.vehicle_type.toLowerCase().includes('bike')).length;
  const currentlyParked = data.filter(v => v.status === 'parked').length;
  
  // Assume total capacity is 100 for occupancy rate calculation
  const totalCapacity = 100;
  const occupancyRate = (currentlyParked / totalCapacity) * 100;
  
  // Calculate total revenue from all payments
  const totalRevenue = data.reduce((sum, vehicle) => {
    return sum + parseFloat(vehicle.total_amount);
  }, 0);

  // Calculate today's revenue
  const today = new Date();
  const todayStart = startOfDay(today);
  const todayEnd = endOfDay(today);
  const todayRevenue = data
    .filter(vehicle => {
      const entryTime = new Date(vehicle.entry_time);
      return entryTime >= todayStart && entryTime <= todayEnd;
    })
    .reduce((sum, vehicle) => sum + parseFloat(vehicle.total_amount), 0);

  // Calculate weekly revenue (last 7 days)
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);
  const weeklyRevenue = data
    .filter(vehicle => new Date(vehicle.entry_time) >= weekStart)
    .reduce((sum, vehicle) => sum + parseFloat(vehicle.total_amount), 0);

  // Calculate average parking time for vehicles that have exit times
  let totalParkingMinutes = 0;
  let vehiclesWithExitTime = 0;
  
  data.forEach(vehicle => {
    if (vehicle.entry_time && vehicle.exit_time) {
      const entryTime = new Date(vehicle.entry_time);
      const exitTime = new Date(vehicle.exit_time);
      const parkingTimeMinutes = differenceInMinutes(exitTime, entryTime);
      totalParkingMinutes += parkingTimeMinutes;
      vehiclesWithExitTime++;
    }
  });

  const averageParkingTime = vehiclesWithExitTime > 0 
    ? Math.round(totalParkingMinutes / vehiclesWithExitTime) 
    : 0;

  return {
    totalVehicles,
    carCount,
    bikeCount,
    totalRevenue,
    averageParkingTime,
    currentlyParked,
    todayRevenue,
    weeklyRevenue,
    occupancyRate,
    peakHour: '14:00-15:00', // This would normally be calculated from actual data
    slowestHour: '03:00-04:00' // This would normally be calculated from actual data
  };
};

export const calculateDailyStats = (data: Vehicles[]): DailyStats[] => {
    // Create a map to group vehicles by date
    const dailyMap = new Map<string, Vehicles[]>();
    
    data.forEach(vehicle => {
      const entryDate = format(new Date(vehicle.entry_time), 'yyyy-MM-dd');
      if (!dailyMap.has(entryDate)) {
        dailyMap.set(entryDate, []);
      }
      dailyMap.get(entryDate)?.push(vehicle);
    });
    
    // Generate statistics for each day
    const dailyStatsArray: DailyStats[] = [];
    
    // Sort dates in descending order (most recent first)
    const sortedDates = Array.from(dailyMap.keys()).sort((a, b) => 
      new Date(b).getTime() - new Date(a).getTime()
    );
    
    sortedDates.forEach(date => {
      const vehiclesOnDay = dailyMap.get(date) || [];
      const revenue = vehiclesOnDay.reduce((sum, v) => sum + parseFloat(v.total_amount), 0);
      
      // Calculate average duration for vehicles with exit time
      let totalDuration = 0;
      let vehiclesWithDuration = 0;
      
      vehiclesOnDay.forEach(v => {
        if (v.entry_time && v.exit_time) {
          const duration = differenceInMinutes(new Date(v.exit_time), new Date(v.entry_time));
          totalDuration += duration;
          vehiclesWithDuration++;
        }
      });
      
      const averageDuration = vehiclesWithDuration > 0 ? totalDuration / vehiclesWithDuration : 0;
      
      dailyStatsArray.push({
        date,
        revenue,
        vehicleCount: vehiclesOnDay.length,
        averageDuration,
        cars: vehiclesOnDay.filter(v => v.vehicle_type.toLowerCase().includes('car')).length,
        bikes: vehiclesOnDay.filter(v => v.vehicle_type.toLowerCase().includes('bike')).length
      });
    });
    
    return dailyStatsArray;
  };

  export const calculateAvgRevenuePerVehicle = (stats: Stats): number => {
    return stats.totalVehicles > 0 
      ? stats.totalRevenue / stats.totalVehicles
      : 0;
  };
      
  // Calculate daily average revenue
  export const calculateDailyAvgRevenue = (stats: Stats): number => {
    return stats.weeklyRevenue / 7;
  };
  
  // You can also add a function to get both values at once if needed
  export const getAverageRevenueStats = (stats: Stats): { avgRevenuePerVehicle: number, dailyAvgRevenue: number } => {
    return {
      avgRevenuePerVehicle: calculateAvgRevenuePerVehicle(stats),
      dailyAvgRevenue: stats.weeklyRevenue / 7
    };
  };

  export const calculateParkingDuration = (entry: string, exit: string | null): string => {
    if (!exit) return 'Still parked';
    
    const entryTime = new Date(entry);
    const exitTime = new Date(exit);
    const minutes = differenceInMinutes(exitTime, entryTime);
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    return `${hours}h ${remainingMinutes}m`;
  };
  
  // Add a formatDuration utility function as well, since it's used with the duration
  export const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  export const getStatusColor = (status: string): string => {
    switch (status.toLowerCase()) {
      case 'parked':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800';
      case 'exited':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800';
      case 'reserved':
        return 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400 border-violet-200 dark:border-violet-800';
      default:
        return '';
    }
  };
