'use client';

import { useState, useRef, useEffect } from 'react';
import { createWorker } from 'tesseract.js';
import { Button } from '@/components/ui/button';
import { Camera, CameraOff, RefreshCcw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface LicensePlateOCRProps {
  onCapture?: (text: string) => void;
  disabled?: boolean;
}

export default function LicensePlateOCR({ onCapture, disabled = false }: LicensePlateOCRProps) {
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [recognizedText, setRecognizedText] = useState<string>('');
  const [error, setError] = useState<string>('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  // Use any type to avoid TypeScript errors with Tesseract.js
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const workerRef = useRef<any>(null);
  
  useEffect(() => {
    let mounted = true;
    
    const initWorker = async () => {
      try {
        // Create worker with proper API for Tesseract.js v3
        const worker = await createWorker('eng');
        
        if (!mounted) return;
        
        // Set parameters specifically for Indian license plates
        await worker.setParameters({
          tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ',
          preserve_interword_spaces: '1',
          tessjs_create_hocr: '0',
          tessjs_create_tsv: '0',
        });
        
        workerRef.current = worker;
      } catch (err) {
        console.error('Failed to initialize Tesseract worker:', err);
        if (mounted) {
          setError(`OCR initialization error: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      }
    };
    
    initWorker();
    
    // Cleanup worker on component unmount
    return () => {
      mounted = false;
      
      const cleanupWorker = async () => {
        if (workerRef.current) {
          try {
            await workerRef.current.terminate();
          } catch (e) {
            console.error('Error terminating worker:', e);
          }
        }
      };
      
      cleanupWorker();
      
      if (streamRef.current) {
        stopCamera();
      }
    };
  }, []);
  
  const startCamera = async () => {
    try {
      setError('');
      
      // First check if camera access is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported in your browser');
      }
      
      // Try with different constraints - first attempt with both back/environment camera
      const constraints = {
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'environment' // Use back camera on mobile devices
        },
        audio: false
      };
      
      console.log('Requesting camera with constraints:', constraints);
      
      // Clear previous stream if any
      if (streamRef.current) {
        stopCamera();
      }
      
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (err) {
        console.warn('Failed with environment camera, trying default:', err);
        // If environment camera fails, try with default camera
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: true,
          audio: false
        });
      }
      
      console.log('Camera stream obtained successfully');
      streamRef.current = stream;
      
      // Ensure the video element exists before setting srcObject
      if (!videoRef.current) {
        throw new Error('Video element reference not available');
      }
      
      videoRef.current.srcObject = stream;
      
      // Make sure video element is not hidden or has zero dimensions
      videoRef.current.style.display = 'block';
      videoRef.current.style.width = '100%';
      videoRef.current.style.height = '100%';
      
      // Wait for the video to be ready
      videoRef.current.onloadedmetadata = () => {
        console.log('Video metadata loaded, playing...');
        
        if (!videoRef.current) {
          console.error('Video element lost after metadata loaded');
          setError('Video element reference lost');
          return;
        }
        
        videoRef.current.play()
          .then(() => {
            console.log('Video playback started successfully');
            setIsCameraActive(true);
          })
          .catch(e => {
            console.error('Error playing video:', e);
            setError(`Camera play error: ${e.message}`);
          });
      };
      
    } catch (err) {
      console.error('Error accessing camera:', err);
      let errorMessage = 'Please check camera permissions';
      
      if (err instanceof Error) {
        errorMessage = err.message;
        
        // Provide more specific error messages for common issues
        if (errorMessage.includes('denied') || errorMessage.includes('permission')) {
          errorMessage = 'Camera permission denied. Please enable camera access in your browser settings.';
        } else if (errorMessage.includes('not found') || errorMessage.includes('unavailable')) {
          errorMessage = 'No camera found. Please ensure your device has a working camera.';
        }
      }
      
      setError(`Camera access error: ${errorMessage}`);
      // Make sure to clean up if there was an error
      if (streamRef.current) {
        stopCamera();
      }
    }
  };
  
  const stopCamera = () => {
    console.log('Stopping camera...');
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        console.log(`Stopping track: ${track.kind}`);
        track.stop();
      });
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setIsCameraActive(false);
    console.log('Camera stopped successfully');
  };
  
  const captureImage = () => {
    if (!isCameraActive || !videoRef.current || !canvasRef.current || !workerRef.current) {
      setError('Cannot capture - camera or OCR engine not ready');
      return;
    }
    
    setIsProcessing(true);
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    if (!context) {
      setError('Could not get canvas context');
      setIsProcessing(false);
      return;
    }
    
    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    console.log(`Capturing image: ${video.videoWidth}x${video.videoHeight}`);
    
    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Apply pre-processing to enhance license plate visibility
    enhanceImage(canvas, context);
    
    // Process the enhanced image with OCR
    processImage(canvas);
  };

  // Image enhancement for better OCR results
  const enhanceImage = (canvas: HTMLCanvasElement, context: CanvasRenderingContext2D) => {
    try {
      // Get the image data
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      // Convert to grayscale and increase contrast
      for (let i = 0; i < data.length; i += 4) {
        // Convert to grayscale
        const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        
        // Apply threshold to increase contrast - helps with license plate recognition
        const threshold = 128;
        const newValue = gray > threshold ? 255 : 0;
        
        // Set RGB values
        data[i] = newValue;     // R
        data[i + 1] = newValue; // G
        data[i + 2] = newValue; // B
        // Alpha channel (data[i + 3]) remains unchanged
      }
      
      // Put the modified image data back on the canvas
      context.putImageData(imageData, 0, 0);
      
    } catch (err) {
      console.error('Error enhancing image:', err);
      // Continue with original image if enhancement fails
    }
  };
  
  const processImage = async (canvas: HTMLCanvasElement) => {
    try {
      if (!workerRef.current) {
        setError('OCR engine not initialized yet');
        setIsProcessing(false);
        return;
      }
      
      // Get image data from canvas
      const imageData = canvas.toDataURL('image/png');
      
      console.log('Processing image with OCR...');
      
      // Recognize text using Tesseract
      const result = await workerRef.current.recognize(imageData);
      const text = result.data.text;
      console.log('OCR result:', text);
      
      // Clean up the recognized text
      const cleanedText = formatLicensePlate(text);
      setRecognizedText(cleanedText);
      
      // Pass the recognized text to parent component
      if (cleanedText && onCapture) {
        onCapture(cleanedText);
      }
      
      setIsProcessing(false);
    } catch (err) {
      console.error('OCR processing error:', err);
      setError(`OCR processing error: ${err instanceof Error ? err.message : 'Failed to read license plate'}`);
      setIsProcessing(false);
    }
  };
  
  // Format recognized text to match Indian license plate format
  const formatLicensePlate = (text: string): string => {
    if (!text) return '';
    
    // Remove unwanted characters and normalize
    const cleaned = text.replace(/[\n\r\t]/g, ' ')
                      .replace(/\s+/g, ' ')
                      .trim()
                      .toUpperCase();
    
    // Extract alphanumeric characters 
    const alphanumeric = cleaned.replace(/[^A-Z0-9]/g, '');
    
    // Try to detect and format as Indian license plate (e.g., TN 04 Z 3535)
    // Indian format is typically: 2 letters + 2 digits + 1-2 letters + 4 digits
    
    if (alphanumeric.length >= 8) {
      const stateCode = alphanumeric.substring(0, 2);
      const districtCode = alphanumeric.substring(2, 4);
      
      // Extract the series letter(s)
      const seriesIndex = 4;
      let seriesEnd = 5;
      
      // Find where the numeric part starts after position 4
      for (let i = 4; i < alphanumeric.length - 4; i++) {
        if (/[0-9]/.test(alphanumeric[i])) {
          seriesEnd = i;
          break;
        }
      }
      
      const series = alphanumeric.substring(seriesIndex, seriesEnd);
      
      // The remaining should be the number part (typically 4 digits)
      const numberPart = alphanumeric.substring(seriesEnd);
      
      // Format with spaces as per Indian standard
      return `${stateCode} ${districtCode} ${series} ${numberPart}`;
    }
    
    // If we couldn't parse it in the expected format, return the cleaned string
    return cleaned;
  };
  
  const toggleCamera = () => {
    if (isCameraActive) {
      stopCamera();
    } else {
      startCamera();
    }
  };
  
  return (
    <Card className="mb-6 border border-blue-100 shadow-sm overflow-hidden">
      <CardHeader className="bg-blue-50 py-3 px-4 border-b border-blue-100">
        <CardTitle className="text-base font-bold text-blue-800 flex items-center">
          <Camera className="mr-2 h-5 w-5 text-blue-600" />
          License Plate Scanner
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-700 px-4 py-2 rounded-md text-sm">
              {error}
            </div>
          )}
          
          <div className="relative">
            <div className={isCameraActive ? "block" : "hidden"}>
              <div className="rounded-md overflow-hidden bg-gray-100 border border-gray-200">
                <video
                  ref={videoRef}
                  className="w-full h-48 object-cover"
                  autoPlay
                  playsInline
                  muted
                ></video>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="border-2 border-dashed border-blue-500 rounded-md w-3/4 h-16 flex items-center justify-center">
                    <span className="text-xs text-blue-700 bg-blue-100 px-2 py-1 rounded">
                      Position license plate here
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            {!isCameraActive && (
              <div className="h-48 w-full bg-gray-100 border border-gray-200 rounded-md flex items-center justify-center">
                <div className="text-gray-500 text-center p-4">
                  <CameraOff className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                  <p className="text-sm">Camera inactive</p>
                </div>
              </div>
            )}
            
            {/* Hidden canvas for image processing */}
            <canvas ref={canvasRef} className="hidden"></canvas>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant={isCameraActive ? "destructive" : "outline"}
              onClick={toggleCamera}
              disabled={disabled}
              className="flex-1"
            >
              {isCameraActive ? (
                <>
                  <CameraOff className="mr-2 h-4 w-4" />
                  Stop Camera
                </>
              ) : (
                <>
                  <Camera className="mr-2 h-4 w-4" />
                  Start Camera
                </>
              )}
            </Button>
            
            <Button
              type="button"
              variant="default"
              onClick={captureImage}
              disabled={!isCameraActive || isProcessing || disabled}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              {isProcessing ? (
                <>
                  <RefreshCcw className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Camera className="mr-2 h-4 w-4" />
                  Capture Plate
                </>
              )}
            </Button>
          </div>
          
          {recognizedText && (
            <div className="bg-green-50 p-3 rounded-md">
              <p className="text-sm font-medium text-gray-700">Detected License Plate:</p>
              <p className="text-lg font-bold text-green-800">{recognizedText}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}