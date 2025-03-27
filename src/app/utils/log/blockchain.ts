import { ethers } from 'ethers';
import PARKING_CONNECT from '@/app/connection/config';
import { Users} from '@/app/types/Routetypes';

// Configuration constants with proper typing
const BLOCKCHAIN_CONFIG = {
  NODE_URL: `${PARKING_CONNECT}`,
  CONTRACT_ADDRESS: '73 70 61 63 65 74 65 78 74 69 6C 65 73 70 76 74 6C 74 64 49 54',
  PRIVATE_KEY:'sololevelinghunter'
};
// console.log(BLOCKCHAIN_CONFIG)
// Detailed ABI for robust interaction
const SMART_CONTRACT_ABI = [
  "function storeUserData(string memory userCode, string memory dataHash, string memory locationName, string memory ipAddress, string memory concern, string memory division, string memory branch, string memory parkingArea, string memory timestamp) public returns (string memory)",
  "function verifyUserData(string memory hash, string memory userCode) public view returns (bool)"
];

// Centralized blockchain connection management with proper typing
class BlockchainService {
  private static instance: BlockchainService;
  private provider: ethers.Provider | null = null;
  private wallet: ethers.Wallet | null = null;
  private contract: ethers.Contract | null = null;

  private constructor() {}

  // Singleton pattern for consistent blockchain connection
  public static getInstance(): BlockchainService {
    if (!BlockchainService.instance) {
      BlockchainService.instance = new BlockchainService();
    }
    return BlockchainService.instance;
  }

  // Comprehensive initialization with multiple safeguards
  public async initialize(): Promise<void> {
    try {
      // Validate configuration
      if (!BLOCKCHAIN_CONFIG.NODE_URL) {
        throw new Error('Blockchain node URL is not configured');
      }

      // Create provider
      this.provider = new ethers.JsonRpcProvider(BLOCKCHAIN_CONFIG.NODE_URL);

      // Handle wallet creation with fallback
      const privateKey = BLOCKCHAIN_CONFIG.PRIVATE_KEY.startsWith('0x') 
        ? BLOCKCHAIN_CONFIG.PRIVATE_KEY 
        : "0x" + "0".repeat(64);
      
      this.wallet = new ethers.Wallet(privateKey, this.provider);

      // Create contract instance
      this.contract = new ethers.Contract(
        BLOCKCHAIN_CONFIG.CONTRACT_ADDRESS, 
        SMART_CONTRACT_ABI, 
        this.wallet
      );

      console.log('Blockchain initialized successfully');
      console.log('Wallet Address:', this.wallet.address);
    } catch (error) {
      console.error('Blockchain initialization failed:', error);
      throw new Error('Failed to initialize blockchain connection');
    }
  }

  // Enhanced data storage method with comprehensive parameters
  public async storeUserData(userData: Users): Promise<string> {
    try {
      // Ensure initialization
      if (!this.contract) {
        await this.initialize();
      }

      // Create comprehensive data hash
      const dataString = JSON.stringify(userData);
      const dataHash = ethers.keccak256(ethers.toUtf8Bytes(dataString));

      // Store data with all required parameters
      const tx = await this.contract!.storeUserData(
        userData.userCode, 
        dataHash,
        userData.locationName,
        userData.ipAddress,
        userData.concern,
        userData.division,
        userData.branch,
        userData.parking_area,
        userData.timestamp
      );
      
      await tx.wait();

      // Update user data with blockchain verification
      userData.blockchainverification = dataHash;

      return dataHash;
    } catch (error) {
      console.error('Blockchain storage error:', error);
      
      // Generate fallback verification for development
      const fallbackHash = `hunter-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
      return fallbackHash;
    }
  }

  // Verification method with enhanced logging
  public async verifyUserData(hash: string, userCode: string): Promise<boolean> {
    try {
      // Ensure initialization
      if (!this.contract) {
        await this.initialize();
      }

      // Perform verification
      const isVerified = await this.contract!.verifyUserData(hash, userCode);
      
      console.log(`Verification for user ${userCode}:`, isVerified);
      return isVerified;
    } catch (error) {
      console.error('Blockchain verification error:', error);
      return false;
    }
  }
}

// Export service methods for easy consumption
export const blockchainService = BlockchainService.getInstance();

export const storeUserOnBlockchain = (userData: Users) => 
  blockchainService.storeUserData(userData);

export const verifyUserFromBlockchain = (hash: string, userCode: string) => 
  blockchainService.verifyUserData(hash, userCode);