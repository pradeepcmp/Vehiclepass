import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useGeolocated } from 'react-geolocated';
import { LocationData } from '@/app/types/LoginTypes';

interface LocationState {
  isLoading: boolean;
  showError: boolean;
  showSuccess: boolean;
  data: LocationData | null;
}

export const useLocation = () => {
  const [locationState, setLocationState] = useState<LocationState>({
    isLoading: true,
    showError: false,
    showSuccess: false,
    data: null,
  });

  // Geolocation hook
  const { coords, isGeolocationEnabled, getPosition } = useGeolocated({
    positionOptions: {
      enableHighAccuracy: true,
    },
    userDecisionTimeout: 5000,
    watchLocationPermissionChange: true,
  });

  // Get location and IP information
  const getLocationAndIP = useCallback(async (latitude: number, longitude: number) => {
    try {
      const [locationResponse, ipResponse] = await Promise.all([
        axios.get(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`
        ),
        axios.get('https://api.ipify.org?format=json'),
      ]);

      const address = locationResponse.data.address;
      let locationString = '';

      if (address.suburb) locationString += address.suburb;
      if (address.city_district)
        locationString += (locationString ? ', ' : '') + address.city_district;
      if (address.city)
        locationString += (locationString ? ', ' : '') + address.city;

      const newLocationData = {
        locationName: locationString || 'Unknown Location',
        ip: ipResponse.data.ip,
      };

      setLocationState((prev) => ({
        ...prev,
        isLoading: false,
        showSuccess: true,
        showError: false,
        data: newLocationData,
      }));

      // Hide success message after 3 seconds
      setTimeout(() => {
        setLocationState((prev) => ({
          ...prev,
          showSuccess: false,
        }));
      }, 3000);

      return newLocationData;
    } catch (error) {
      console.error('Error getting location:', error);
      setLocationState((prev) => ({
        ...prev,
        isLoading: false,
        showError: true,
        showSuccess: false,
        data: null,
      }));
      return null;
    }
  }, []);

  // Handle location updates
  useEffect(() => {
    let isMounted = true;

    const handleLocationUpdate = async () => {
      if (!isMounted) return;

      setLocationState((prev) => ({
        ...prev,
        isLoading: true,
        showError: false,
      }));

      if (coords) {
        const locationInfo = await getLocationAndIP(
          coords.latitude,
          coords.longitude
        );
        if (isMounted) {
          if (locationInfo) {
            setLocationState((prev) => ({
              ...prev,
              showError: false,
              data: locationInfo,
            }));
          } else {
            setLocationState((prev) => ({
              ...prev,
              showError: true,
              data: null,
            }));
          }
        }
      } else if (isGeolocationEnabled === false) {
        if (isMounted) {
          setLocationState((prev) => ({
            ...prev,
            isLoading: false,
            showError: true,
            data: null,
          }));
        }
      }
    };

    handleLocationUpdate();

    return () => {
      isMounted = false;
    };
  }, [coords, isGeolocationEnabled, getLocationAndIP]);

  // Location refresh handler
  const refreshLocation = () => {
    setLocationState({
      isLoading: true,
      showError: false,
      showSuccess: false,
      data: null,
    });
    getPosition();
  };

  return {
    locationState,
    refreshLocation,
  };
};

export default useLocation;