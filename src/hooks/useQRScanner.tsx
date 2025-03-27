'use client';
import { useState, useCallback } from 'react';

/**
 * Custom hook to manage QR scanner state and functionality
 * Returns the necessary state and handlers for the QR scanner
 */
export function useQRScanner({ onScanSuccess }: { onScanSuccess: (result: string) => void }) {
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);

  // Open the QR scanner
  const openQRScanner = useCallback(() => {
    setIsQRScannerOpen(true);
  }, []);

  // Close the QR scanner
  const closeQRScanner = useCallback(() => {
    setIsQRScannerOpen(false);
  }, []);

  // Handle successful scan
  const handleScan = useCallback((result: string) => {
    if (result && onScanSuccess) {
      onScanSuccess(result);
    }
  }, [onScanSuccess]);

  return {
    isQRScannerOpen,
    openQRScanner,
    closeQRScanner,
    handleScan
  };
}

export default useQRScanner;