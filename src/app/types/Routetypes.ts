export interface UserData {
    user_code?: string;
    user_name?: string;
    user_role?: string;
    parkingArea: string | null;
    // Add fallback properties to handle different data structures
    screens?: Array<{
      value: string;
      label: string;
    }>;
    portalNames?: Array<{
      value: string;
      label: string;
    }>;
    // Additional properties from the response in LoginForm
    role?: string;
    portals?: Array<{
      value: string;
      label: string;
      screens?: Array<{
        value: string;
        label: string;
      }>;
    }>;
  }
  
export interface PortalWiseApproval {
    portal_name: string;
    screens: string[];
  }
  
export interface UserApprovalResponse {
    success: boolean;
    data: {
      portal_wise: PortalWiseApproval[];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      [key: string]: any;
    };
  }
  
export interface AuthState {
    isAuthenticated: boolean;
    userRole: string | null;
    allowedScreens: string[];
    isLoading: boolean;
    lastUpdateTime: number;
    isUpdating: boolean;
  }


  export interface Users {
    userCode: string;
    concern: string;
    division: string;
    branch: string;
    parking_area: string;
    timestamp: string;
    locationName: string;
    ipAddress: string;
    user_name?: string;
    user_role?: string;
    blockchainverification?: string;
  }

  
  export interface RoleApprovalResponse {
    success: boolean;
    role: string;
    data: {
      raw_approvals: Array<{
        user_role: string;
        user_portal: string | null;
        user_screen: string | null;
        user_approval_concern: string;
        user_approval_branch: string;
        user_approval_branch_division: string;
        portal_screen_valid: boolean;
      }>;
      portal_wise: Array<{
        portal_name: string;
        screens: string[];
        concerns: string[];
        branches: string[];
        divisions: string[];
      }>;
    };
  }
  
  export interface RouteState {
    protectedRoutes: Set<string>;
    isLoading: boolean;
    error: string | null;
    lastUpdateTime: number;
    isAuthenticated: boolean;
  }