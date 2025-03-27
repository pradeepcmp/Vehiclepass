import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import axios from 'axios';
import { UserData, ApiResponse, TileLink } from '@/app/types/HomeTypes';
import { tileLinksData } from '@/app/parkinghome/tilelink';
import PrivateRoute from '@/app/protectedRoute';
import PARKING_CONNECT from '@/app/connection/config'

const Parking_API = `${PARKING_CONNECT}`;

const api = axios.create({
  baseURL: `${Parking_API}`,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add retry interceptor
api.interceptors.response.use(undefined, async (error) => {
  const { config } = error;
  if (!config || !config.retry) {
    return Promise.reject(error);
  }

  config.retry -= 1;
  config.timeout = config.timeout * 1.5; // Increase timeout for each retry

  // Delay before retrying
  const delay = new Promise(resolve => setTimeout(resolve, 2000));
  await delay;

  return api(config);
});

const decodeUserDataCookie = () => {
  try {
    const cookieString = document.cookie;
    const cookies = cookieString.split(';').map(cookie => cookie.trim());
    
    // Find the userdata cookie - note the case sensitivity
    const userDataCookie = cookies.find(cookie => 
      cookie.toLowerCase().startsWith('user=') || 
      cookie.toLowerCase().startsWith('userdata=')
    );

    if (!userDataCookie) {
      throw new Error('User data cookie not found');
    }

    // Get the encoded value part
    const encodedValue = userDataCookie.split('=')[1];

    // First decode the URL encoding
    const firstDecode = decodeURIComponent(encodedValue);
    
    // The cookie value might be double-encoded, so we need to decode it again
    const decodedValue = decodeURIComponent(firstDecode);
    
    // Now parse the JSON
    const userData = JSON.parse(decodedValue);
    
    // Validate the required fields
    if (!userData.user_role) {
      throw new Error('Invalid user data: missing user_role');
    }

    return userData;
  } catch (error) {
    console.error('Cookie parsing error:', error);
    throw error;
  }
};

export default function Home() {
  const [tileLinks] = useState<TileLink[]>(tileLinksData);
  const [isLoaded, setIsLoaded] = useState(false);
  const [, setUserData] = useState<UserData | null>(null);
  const [userScreens, setUserScreens] = useState<string[]>([]);
  const [, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [, setIsMobile] = useState(false);

  // Check if mobile view
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    // Initial check
    handleResize();
    
    // Set up listener
    window.addEventListener('resize', handleResize);
    
    // Clean up
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    const fetchUserData = () => {
      try {
        const userData = decodeUserDataCookie();
        setUserData(userData);
        return userData.user_role;
      } catch (error) {
        console.error('Error getting user data:', error);
        setError('Unable to load user data. Please try logging in again.');
        return null;
      }
    };

    const fetchUserScreens = async (userRole: string | null) => {
      if (!userRole) {
        setError('No user role available');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        const encodedRole = encodeURIComponent(userRole.trim());
        const response = await api.get<ApiResponse>(`/user-approvals/role/${encodedRole}`);

        // console.log('API Response:', response.data); // Debug log

        if (response.data && response.data.success) {
          let screens: string[] = [];

          // Handle different possible data structures
          if (Array.isArray(response.data.data)) {
            // If data is an array directly
            screens = response.data.data
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              .map(item => typeof item === 'string' ? item : (item as any).user_screen)
              .filter(screen => screen);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } else if (response.data.data && Array.isArray((response.data.data as any).raw_approvals)) {
            // If data contains raw_approvals array
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            screens = (response.data.data as any).raw_approvals
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              .map((item: any) => item.user_screen)
              .filter((screen: string) => screen);
          } else if (typeof response.data.data === 'object' && response.data.data !== null) {
            // If data is an object with user_screen properties
            screens = Object.values(response.data.data)
              .filter(item => item && typeof item === 'object' && 'user_screen' in item)
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              .map(item => (item as any).user_screen)
              .filter(screen => screen);
          }

          // console.log('Processed screens:', screens); // Debug log
          setUserScreens(Array.from(new Set(screens)));
        } else {
          throw new Error('Invalid response format from server');
        }
      } catch (error) {
        console.error('Full error details:', error); // Debug log
        if (axios.isAxiosError(error)) {
          setError(error.response?.data?.message || 'Error fetching user screens');
          console.error('API Error:', error.message);
        } else {
          setError('An unexpected error occurred');
          console.error('Error:', error);
        }
      } finally {
        setIsLoading(false);
      }
    };

    // Initial fetch
    const userRole = fetchUserData();
    fetchUserScreens(userRole);

    // Setup refresh handlers
    const handleFocus = () => {
      const userRole = fetchUserData();
      fetchUserScreens(userRole);
    };

    const interval = setInterval(() => {
      const userRole = fetchUserData();
      fetchUserScreens(userRole);
    }, 300000);
    
    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
      clearInterval(interval);
    };
  }, []);

  // Get filtered stacks based on user screens
  const filteredTiles = tileLinks.filter(tile => 
    tile.screenName ? userScreens.includes(tile.screenName) : true
  );

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] }
    }
  };

  return (
    <PrivateRoute>
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 to-zinc-100 mt-20">
      <main className="py-8 px-6">
        <div className="max-w-6xl mx-auto">
          {/* Error display */}
          {error && (
            <div className="mb-18 p-4">
              <p>{error}</p>
            </div>
          )}

          {/* Enhanced Tile Section */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate={isLoaded ? "visible" : "hidden"}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            {/* Filter tiles based on user screens if needed */}
            {filteredTiles.map((tile) => (
              <motion.div 
                key={tile.id}
                variants={itemVariants}
                whileHover={{ 
                  scale: 1.02,
                  boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
                }}
                className="h-full"
              >
                <Link href={tile.href} passHref>
                  <div className={`relative overflow-hidden h-full rounded-xl shadow-lg bg-gradient-to-br ${tile.bgColor} hover:bg-gradient-to-br ${tile.hoverColor} transition-all duration-300 cursor-pointer group`}>
                    {/* Decorative elements for enterprise feel */}
                    <div className="absolute -top-4 -right-4 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
                    <div className="absolute top-1/2 left-0 w-full h-px bg-gradient-to-r from-transparent via-slate-300/30 to-transparent"></div>
                    
                    <div className="relative p-8 flex flex-col h-full">
                      <div className="flex items-center mb-6">
                        <div className="p-3 rounded-lg bg-white/80 backdrop-blur-sm shadow-md">
                          <svg className="h-8 w-8 text-slate-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d={tile.iconPath} />
                          </svg>
                        </div>
                        <div className="ml-4 flex-grow">
                          <h3 className="text-xl font-semibold text-slate-800 group-hover:text-slate-900">{tile.title}</h3>
                        </div>
                      </div>
                      
                      <p className="text-slate-600 group-hover:text-slate-700 mb-6">{tile.description}</p>
                      
                      <div className="mt-auto flex justify-between items-center">
                        <span className="text-sm font-medium text-slate-500">Learn more</span>
                        <div className="w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center shadow-sm transform group-hover:translate-x-1 transition-transform duration-200">
                          <svg className="w-4 h-4 text-slate-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                    
                    {/* Subtle enterprise pattern overlay */}
                    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMxLjIgMCAyLjEuOSAyLjEgMi4xdjE5LjhjMCAxLjItLjkgMi4xLTIuMSAyLjFIMTguMWMtMS4yIDAtMi4xLS45LTIuMS0yLjFWMjAuMWMwLTEuMi45LTIuMSAyLjEtMi4xaDE3Ljh6IiBzdHJva2U9InJnYmEoMCwwLDAsMC4wMikiIHN0cm9rZS13aWR0aD0iMiIvPjwvZz48L3N2Zz4=')] opacity-5"></div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </main>
    </div>
    </PrivateRoute>
  );
}