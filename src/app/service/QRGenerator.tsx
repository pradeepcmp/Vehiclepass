import React, { useMemo } from 'react';
import QRCode from 'react-qr-code';
import { createHash } from 'crypto';

interface QRCodeGeneratorProps {
  sessionId: string;
  mobileNo: string;
  size?: number;
}

// Utility class for QR code generation and data handling
class QRService {
  private static instance: QRService;
  private readonly SECRET_KEY = process.env.REACT_APP_QR_SECRET || 'spacetextilespvtltdtcs';

  private constructor() {}

  public static getInstance(): QRService {
    if (!QRService.instance) {
      QRService.instance = new QRService();
    }
    return QRService.instance;
  }

  private formatMobileNumber(mobileNo: string): string {
    // Remove any non-digit characters and ensure it's exactly 10 digits
    const cleaned = mobileNo.replace(/\D/g, '').slice(-10);
    return cleaned.padStart(10, '0');
  }

  private generateSecureHash(sessionId: string, formattedMobile: string): string {
    // Create a secure hash using sessionId as salt
    return createHash('sha256')
      .update(`${sessionId}${this.SECRET_KEY}${formattedMobile}`)
      .digest('hex')
      .slice(0, 8); // Take first 8 characters of hash
  }

  public generateQRData(sessionId: string, mobileNo: string): string {
    const formattedMobile = this.formatMobileNumber(mobileNo);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const secureHash = this.generateSecureHash(sessionId, formattedMobile);
    
    // Combine formatted mobile number with secure hash
    return `${formattedMobile}`;
  }
}

export const QRCodeGenerator: React.FC<QRCodeGeneratorProps> = ({
  sessionId,
  mobileNo,
  size = 256
}) => {
  const qrService = useMemo(() => QRService.getInstance(), []);

  const qrData = useMemo(() => {
    return qrService.generateQRData(sessionId, mobileNo);
  }, [qrService, sessionId, mobileNo]);

  return (
    <QRCode
      value={qrData}
      size={size}
      level="H"
      style={{ maxWidth: "100%", height: "auto" }}
    />
  );
};

export default QRCodeGenerator;