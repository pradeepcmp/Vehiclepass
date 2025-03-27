
import { Card,CardContent,CardHeader,CardDescription } from '@/components/ui/card';
import { Tabs,TabsContent,TabsList,TabsTrigger } from '@/components/ui/tabs';
import ParkingEntryForm from './parking';
import ParkingView from './parkingview';
import PrivateRoute from '@/app/protectedRoute'

export default function ParkingScreen() {

  return (
    <PrivateRoute>
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 to-zinc-100 flex items-center justify-center p-4 md:p-6">
      <div className="container mx-auto max-w-6xl mt-20">
        <div className="mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center">
              </div>
            </div>
          </div>
        </div>

        <Card className="shadow-xl border-0 bg-white overflow-hidden rounded-xl">
        <CardHeader className="relative p-4 overflow-hidden">
      {/* Background with a sky gradient and subtle clouds */}
      <div className="absolute inset-0 bg-gradient-to-b from-sky-400 to-blue-500">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.8),rgba(255,255,255,0.1))] opacity-50" />
      </div>

      {/* Content Section */}
      <div className="relative">
        <div className="flex flex-col items-center justify-center w-full">
          <CardDescription 
            className="text-white mb-1 text-sm font-bold text-center w-full transform transition-all duration-300 drop-shadow-[0_4px_3px_rgba(0,0,0,0.25)]"
            style={{
              textShadow: `-1px -1px 0 rgba(0,0,0,0.2),1px 1px 0 rgba(255,255,255,0.3),2px 2px 3px rgba(0,0,0,0.2),3px 3px 4px rgba(0,0,0,0.15)`,
              transition: 'all 0.3s ease',
              willChange: 'transform'
            }}
          >
            Real-time monitoring and management of all parking facilities
          </CardDescription>
        </div>
      </div>
    </CardHeader>

          <CardContent className="p-0">
            <Tabs defaultValue="entry" className="w-full">
            <TabsList className="flex bg-gray-50 w-full rounded-none border-b border-gray-200 p-0 h-auto">
      <TabsTrigger 
        value="entry" 
        className="
          flex-1 
          py-4 
          font-medium 
          rounded-none 
          transition-all 
          duration-300
          group
          data-[state=active]:shadow-lg
          data-[state=active]:bg-white
          data-[state=active]:border-b-2 
          data-[state=active]:border-blue-600
        "
      >
        <div 
          className="
            flex 
            items-center 
            justify-center
            transform 
            transition-transform 
            duration-300 
            group-data-[state=active]:scale-105
          "
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-5 w-5 mr-2 text-blue-600" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" 
            />
          </svg>
          <span 
            className="
              font-bold 
              text-blue-600 
              group-data-[state=active]:text-blue-700
              transition-all 
              duration-300
              drop-shadow-md
              group-data-[state=active]:drop-shadow-lg
            "
            style={{
              textShadow: `
                -1px -1px 0 rgba(0,0,0,0.1),
                1px 1px 0 rgba(255,255,255,0.3),
                2px 2px 3px rgba(0,0,0,0.1)
              `
            }}
          >
            Vehicle Entry
          </span>
        </div>
      </TabsTrigger>
      
      <TabsTrigger 
        value="parked" 
        className="
          flex-1 
          py-4 
          font-medium 
          rounded-none 
          transition-all 
          duration-300
          group
          data-[state=active]:shadow-lg
          data-[state=active]:bg-white
          data-[state=active]:border-b-2 
          data-[state=active]:border-green-600
        "
      >
        <div 
          className="
            flex 
            items-center 
            justify-center
            transform 
            transition-transform 
            duration-300 
            group-data-[state=active]:scale-105
          "
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-5 w-5 mr-2 text-green-600" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" 
            />
          </svg>
          <span 
            className="
              font-bold 
              text-green-600 
              group-data-[state=active]:text-green-700
              transition-all 
              duration-300
              drop-shadow-md
              group-data-[state=active]:drop-shadow-lg
            "
            style={{
              textShadow: `
                -1px -1px 0 rgba(0,0,0,0.1),
                1px 1px 0 rgba(255,255,255,0.3),
                2px 2px 3px rgba(0,0,0,0.1)
              `
            }}
          >
            Parked Vehicles
          </span>
        </div>
      </TabsTrigger>
    </TabsList>

              <div className="p-6">
                <TabsContent value="entry" className="mt-0">
                    <ParkingEntryForm/>
                </TabsContent>

                <TabsContent value="parked" className="mt-0">
                  <ParkingView />
                </TabsContent>
              </div>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
    </PrivateRoute>
  );
}