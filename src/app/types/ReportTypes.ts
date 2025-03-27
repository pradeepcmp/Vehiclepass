export interface Vehicles {
    id: number;
    vehicle_no: string;
    mobileno: string;
    vehicle_type: string;
    entry_time: string;
    exit_time: string | null;
    advance_payment: string;
    total_amount: string;
    balance_amount: string;
    paid: boolean;
    payment_method: string;
    slot_id: string;
    parkingArea: string | null;
    reachTime: string;
    status: string;
    createdAt: string;
    updatedAt: string;
    ParkingSlot?: {
      type: string;
    };
  }
  
export interface DailyStats {
    date: string;
    revenue: number;
    vehicleCount: number;
    averageDuration: number;
    cars: number;
    bikes: number;
  }