import { getCookie, deleteCookie } from 'cookies-next';
import { verifyUserFromBlockchain } from '@/app/utils/log/blockchain';

// Verify blockchain user data
export const verifyBlockchainUser = async (
  userCode: string,
  setErrorMessage: React.Dispatch<React.SetStateAction<string>>
) => {
  try {
    const userCookie = getCookie("user");
    const blockchainHash = getCookie("accesspoint_hash");
    
    if (userCookie && blockchainHash) {
      const userData = JSON.parse(String(userCookie));
      
      // Verify user data from blockchain
      const isVerified = await verifyUserFromBlockchain(String(blockchainHash), userData.userCode);
      
      if (!isVerified) {
        // Clear cookies if verification fails
        deleteCookie("token");
        deleteCookie("user");
        deleteCookie("accesspoint_hash");
        setErrorMessage("Blockchain verification failed. Please log in again.");
      }
    }
  } catch (error) {
    console.error("Blockchain verification error:", error);
  }
};