import { atom } from 'jotai';
import { Vehicle, ParkingSlot } from '../types/parkingTypes';
import {Vehicles} from '../types/ReportTypes'

export const vehiclesAtom = atom<Vehicle[]>([]);

export const parkingSlotsAtom = atom<ParkingSlot[]>([]);

export const selectedVehicleAtom = atom<Vehicle | null>(null);

export const showExitConfirmAtom = atom(false);

export const vehicleAtoms = atom<Vehicles[]>([]);

// Pagination atoms
export const currentPageAtom = atom<number>(1);
export const itemsPerPageAtom = atom<number>(15);
export const searchTermAtom = atom<string>('');
export const dateFilterAtom = atom<string>('all');

// Derived atom for filtered vehicles
export const filteredVehiclesAtom = atom<Vehicles[]>(
  (get) => {
    const vehicles = get(vehicleAtoms);
    const searchTerm = get(searchTermAtom);
    const dateFilter = get(dateFilterAtom);
    
    let filtered = vehicles;
    
    // Apply search filter if search term exists
    if (searchTerm.trim() !== '') {
      filtered = filtered.filter(vehicle => 
        vehicle.vehicle_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vehicle.mobileno.includes(searchTerm) ||
        (vehicle.parkingArea && vehicle.parkingArea.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
    // Apply date filter if not set to 'all'
    if (dateFilter !== 'all') {
      filtered = filtered.filter(vehicle => {
        const entryDate = new Date(vehicle.entry_time).toISOString().split('T')[0];
        return entryDate === dateFilter;
      });
    }
    
    return filtered;
  }
);

// Derived atom for paginated vehicles
export const paginatedVehiclesAtom = atom<Vehicles[]>(
  (get) => {
    const filteredVehicles = get(filteredVehiclesAtom);
    const currentPage = get(currentPageAtom);
    const itemsPerPage = get(itemsPerPageAtom);
    
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    
    return filteredVehicles.slice(startIndex, endIndex);
  }
);

// Derived atom for total pages
export const totalPagesAtom = atom<number>(
  (get) => {
    const filteredVehicles = get(filteredVehiclesAtom);
    const itemsPerPage = get(itemsPerPageAtom);
    
    return Math.ceil(filteredVehicles.length / itemsPerPage);
  }
);

// Write-only atom for next page action
export const nextPageAtom = atom(
  null,
  (get, set) => {
    const currentPage = get(currentPageAtom);
    const totalPages = get(totalPagesAtom);
    
    if (currentPage < totalPages) {
      set(currentPageAtom, currentPage + 1);
    }
  }
);

// Write-only atom for previous page action
export const prevPageAtom = atom(
  null,
  (get, set) => {
    const currentPage = get(currentPageAtom);
    
    if (currentPage > 1) {
      set(currentPageAtom, currentPage - 1);
    }
  }
);

// Write-only atom for go to specific page action
export const goToPageAtom = atom(
  null,
  (get, set, pageNumber: number) => {
    const totalPages = get(totalPagesAtom);
    
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      set(currentPageAtom, pageNumber);
    }
  }
);


export const parkedVehiclesAtom = atom(
  (get) => get(vehiclesAtom).filter(vehicle => vehicle.status === 'parked'),
  (get, set, update: Vehicle[] | ((prevState: Vehicle[]) => Vehicle[])) => {
    const currentParkedVehicles = get(vehiclesAtom).filter(v => v.status === 'parked');
    
    const processedUpdate = typeof update === 'function' 
      ? update(currentParkedVehicles) 
      : update;

    set(vehiclesAtom, (prevVehicles) => 
      prevVehicles.map(v => 
        v.status === 'parked' 
          ? processedUpdate.find(nv => nv.id === v.id) || v 
          : v
      )
    );
  }
);
export const selectedVehicleTypeAtom = atom<'car' | 'bike'>('car');
export const availableSlotsAtom = atom<ParkingSlot[]>(get => {
  const slots = get(parkingSlotsAtom);
  return slots.filter(slot => !slot.occupied);
});