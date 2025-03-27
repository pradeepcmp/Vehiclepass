import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeScanType, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

interface QRScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (decodedText: string) => void;
}

const QRScanner: React.FC<QRScannerProps> = ({ isOpen, onClose, onScanSuccess }) => {
  const [isScanning, setIsScanning] = useState(false);
  const qrScannerRef = useRef<Html5Qrcode | null>(null);
  const qrContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      startScanner();
    } else {
      stopScanner();
    }

    return () => {
      stopScanner();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Add styling to scanner UI
  useEffect(() => {
    if (isOpen) {
      // Short delay to let the scanner initialize
      const timer = setTimeout(() => {
        // Add custom styling to scanner elements
        const scannerElement = document.getElementById("qr-reader");
        if (scannerElement) {
          // Find and style the scanner region
          const scanRegion = scannerElement.querySelector("video");
          if (scanRegion) {
            scanRegion.style.objectFit = "cover";
            scanRegion.style.borderRadius = "8px";
          }
        }
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const startScanner = () => {
    setIsScanning(true);
    
    // Short delay to ensure the DOM is updated
    setTimeout(() => {
      if (qrContainerRef.current) {
        // Initialize QR scanner with high-resolution settings
        const html5QrCode = new Html5Qrcode("qr-reader", { 
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          verbose: false 
        });
        qrScannerRef.current = html5QrCode;
        
        // Improve scanner settings
        const qrConfig = { 
          fps: 20,  // Higher FPS for faster scanning
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
          rememberLastUsedCamera: true,
          supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA]
        };
        
        html5QrCode.start(
          { facingMode: "environment" },
          qrConfig,
          handleQrCodeSuccess,
          handleQrCodeError
        ).catch((err) => {
          console.error("QR Scanner error:", err);
          stopScanner();
        });
      }
    }, 100);
  };

  const stopScanner = () => {
    if (qrScannerRef.current && qrScannerRef.current.isScanning) {
      qrScannerRef.current.stop().then(() => {
        qrScannerRef.current = null;
        setIsScanning(false);
      }).catch(err => {
        console.error("Error stopping QR scanner:", err);
        setIsScanning(false);
      });
    } else {
      setIsScanning(false);
    }
  };

  const handleQrCodeSuccess = (decodedText: string) => {
    stopScanner();
    onScanSuccess(decodedText);
    onClose();
  };

  const handleQrCodeError = (error: string | string[]) => {
    if (error && !error.includes("No QR code found")) {
      console.error("QR Scan Error:", error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Scan QR Code</DialogTitle>
          <DialogDescription>
            Scan a QR code to search for vehicle.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col items-center justify-center">
          <div id="qr-reader" ref={qrContainerRef} className="w-full max-w-xs h-64 qr-scanner-container"></div>
          {isScanning && (
            <div className="text-sm text-slate-600 mt-2 space-y-1">
              <p>Scanning... Position QR code in the frame.</p>
              <p>• Hold steady for best results</p>
              <p>• Move closer for small QR codes</p>
              <p>• Ensure good lighting</p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={onClose} 
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default QRScanner;