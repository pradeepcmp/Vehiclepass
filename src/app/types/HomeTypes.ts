export interface UserData {
    user_code: string;
    user_name: string;
    user_role: string;
    portalNames: Array<{ value: string; label: string }>;
    screens: Array<{ value: string; label: string }>;
    concern: string;
    division: string;
    branch: string;
    location: string;
  }

export interface ApiResponse {
    success: boolean;
    data: {
      raw_approvals: Array<{
        user_screen: string;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        [key: string]: any;
      }>;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      [key: string]: any;
    };
  }

export interface TileLink {
    id: number;
    title: string;
    description: string;
    iconPath: string;
    href: string;
    bgColor: string;
    hoverColor: string;
    screenName?: string;
  }