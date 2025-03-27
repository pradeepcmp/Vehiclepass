import * as z from 'zod';

export interface Vehicle {
  id: string;
  status: string;
  paid: boolean;
  plateNumber?: string;
  vehicle_no?: string;
  vehicleType?: string;
  vehicle_type?: string;
  entryTime?: Date | string;
  entry_time?: Date | string;
  exitTime?: Date | string;
  exit_time?: Date | string;
  reachTime?: Date | string;
  advancePayment?: number;
  advance_payment?: number;
  balanceAmount?: number;
  balance_amount?: number;
  totalAmount?: number;
  total_amount?: string;
  amountTaken?: string;
  mobileno?: string;
  refundAmount?: number;
  parkingArea?: string;
  keyHandover?: string;
  keyhandover?: string;
  redeem_status?: string;
  paymentMethod?:string;
}

export interface ParkingSlot {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  area: any;
  id: string;
  type: 'car' | 'bike' | 'truck';
  occupied: boolean;
  vehicleId?: string;
}

export interface ExtendedVehicle extends Vehicle {
  reachTime?: string;
  formattedReachTime?: string;
  entry_time?: string;
  entryTime?: string;
  vehicle_no?: string;
  plateNumber?: string;
  slot_id?: string;
  parkingArea?: string;
  mobileno?: string;
  advance_payment?: number;
  redeem_status?: string;
}

export const approvalSchema = z.object({
  message: z.string().min(1, { message: "Justification is required" })
    .min(2, { message: "Justification must be at least 2 characters" })
});

export type ApprovalFormData = z.infer<typeof approvalSchema>;

export const entryFormSchema = z.object({
  plateNumber: z.string().min(3, {
    message: "Plate number must be at least 3 characters.",
  }),
  mobileno: z.string().length(10, {
    message: "Mobile number must be exactly 10 digits.",
  }),
  parkingArea: z.string().min(3, {
    message: "Plate number must be at least 3 characters.",
  }),
  vehicleType: z.string().min(3, {
    message: "Plate number must be at least 3 characters.",
  }),
  paymentMethod: z.enum(["cash", "upi"]),
  // vehicleType: z.enum(['car', 'bike']),
  //parkingArea: z.enum(['Valet Parking', 'Puzzle Parking', 'L-Kart Parking', 'Surface Parking (F)', 'Surface Parking  (P)', 'Season Parking (A)','Season Parking (L)','Basement Parking']),
  keyHandover: z.enum(["yes", "no"]).optional(),
});

export type EntryFormValues = z.infer<typeof entryFormSchema>;