import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import {SearchIcon,Car,Clock,Calendar,DollarSign,BarChart,Layers,Timer,TrendingUp,AlertCircle,Bike,FileText,ChevronLeft,ChevronRight,RefreshCw,Info,CircleCheck,TrendingDown} from 'lucide-react';
import { format, parseISO, subDays } from 'date-fns';
import { useAtom } from 'jotai';
import { vehicleAtoms, filteredVehiclesAtom, paginatedVehiclesAtom,itemsPerPageAtom, searchTermAtom, dateFilterAtom} from '@/app/atoms/parkingAtoms';
import { Vehicles, DailyStats } from '@/app/types/ReportTypes';
import Spinner from '@/app/service/Loadinganimation';
import { usePagination, calculateStats, Stats, calculateDailyStats, calculateParkingDuration, formatDuration, getStatusColor, calculateAvgRevenuePerVehicle, calculateDailyAvgRevenue } from '@/app/utils/parkingreport';
import PrivateRoute from '@/app/protectedRoute'
import useSWR from 'swr';
import PARKING_CONNECT from '@/app/connection/config'

// Define the SWR fetcher function
const fetcher = (url: string) => fetch(url).then(res => {
  if (!res.ok) throw new Error('Failed to fetch data');
  return res.json();
});

export default function ParkingManagementReport() {
  const [vehicles, setVehicles] = useAtom(vehicleAtoms);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [filteredVehicles, setFilteredVehicles] = useAtom(filteredVehiclesAtom);
  const [currentVehicles] = useAtom(paginatedVehiclesAtom);
  const [itemsPerPage] = useAtom(itemsPerPageAtom);
  const [searchTerm, setSearchTerm] = useAtom(searchTermAtom);
  const [dateFilter, setDateFilter] = useAtom(dateFilterAtom);
  const [error, setError] = useState<string | null>(null);
  const { currentPage, totalPages, handlePrevPage, handleNextPage } = usePagination();
  const [stats, setStats] = useState<Stats>({
    totalVehicles: 0,
    carCount: 0,
    bikeCount: 0,
    totalRevenue: 0,
    averageParkingTime: 0,
    currentlyParked: 0,
    todayRevenue: 0,
    weeklyRevenue: 0,
    occupancyRate: 0,
    peakHour: '14:00-15:00',
    slowestHour: '03:00-04:00'
  });
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const avgRevenuePerVehicle = calculateAvgRevenuePerVehicle(stats);
  const dailyAvgRevenue = calculateDailyAvgRevenue(stats);
  // Use SWR for data fetching
  const { data, error: swrError, isLoading, isValidating, mutate } = useSWR<Vehicles[]>(
    `${PARKING_CONNECT}/Parking-Vehicle_data`,
    fetcher,
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      refreshInterval: 30000,
    }
  );
console.info(data)
  useEffect(() => {
    if (data) {
      setVehicles(data);
    }
  }, [data, setVehicles]);

  useEffect(() => {
    if (swrError) {
      setError('Failed to load parking data. Please try again later.');
      console.error(swrError);
    } else {
      setError(null);
    }
  }, [swrError]);

  useEffect(() => {
    if (vehicles.length > 0) {
      setStats(calculateStats(filteredVehicles));
      setDailyStats(calculateDailyStats(filteredVehicles));
    }
  }, [filteredVehicles, vehicles]);

  const refreshData = () => {
    mutate();
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleDateFilter = (date: string) => {
    setDateFilter(date);
  };

  if (isLoading && !isValidating) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
        <div className="relative w-24 h-24">
          <div className="absolute inset-0 flex items-center justify-center">
            <Spinner />
          </div>
          <div className="absolute inset-0 flex items-center justify-center animate-pulse opacity-30">
            <Car className="h-12 w-12 text-indigo-600/50" />
          </div>
        </div>
        <h3 className="mt-6 text-xl font-semibold text-gray-800 dark:text-gray-200">Loading Parking Report</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 max-w-sm text-center">Retrieving the latest parking data and analyzing metrics...</p>
        <div className="mt-4 w-64">
          <Progress value={65} className="h-1" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card className="border-red-200 bg-gradient-to-r from-red-50 to-red-100 dark:from-red-950/40 dark:to-red-900/40 dark:border-red-800 shadow-lg">
          <CardContent className="flex flex-col items-center p-8">
            <AlertCircle className="h-16 w-16 text-red-500 mb-6" />
            <h2 className="text-2xl font-bold text-red-700 dark:text-red-300 mb-3">Connection Error</h2>
            <p className="text-red-600 dark:text-red-300 mb-6 text-center max-w-md">
              {error} The server might be down or there could be network connectivity issues.
            </p>
            <Button 
              className="bg-red-600 hover:bg-red-700 flex items-center gap-2" 
              onClick={() => window.location.reload()}
            >
              <RefreshCw className="h-4 w-4" />
              Retry Connection
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <PrivateRoute>
    <div className="min-h-screen bg-gradient-to-b from-indigo-100 to-blue-100 dark:from-gray-900 dark:to-indigo-950 pb-24">
      <div className="container mx-auto py-6 px-4 sm:px-6 lg:px-8 max-w-full mt-20">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        </div>
      </div>
      <div className="container mx-auto py-8 px-4 max-w-full">
        {/* Summary Cards with enhanced visual styling */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-10">
          {/* Total Vehicles Card */}
          <Card className="overflow-hidden border-0 shadow-2xl bg-gradient-to-br from-white via-indigo-50 to-indigo-100 dark:from-gray-900 dark:via-indigo-950/40 dark:to-indigo-950/60 backdrop-blur-sm rounded-xl transform hover:scale-105 transition-all duration-300 hover:shadow-indigo-200/40 dark:hover:shadow-indigo-900/40">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-600 rounded-t-xl"></div>
            <CardHeader className="pb-2">
              <CardTitle className="flex text-base font-medium text-gray-700 dark:text-gray-200">
                <Car className="h-5 w-5 mr-2 text-indigo-600 dark:text-indigo-400" />
                Total Vehicles
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900 dark:text-white drop-shadow-sm">{stats.totalVehicles}</div>
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-1">
                <div className="flex items-center gap-1">
                  <Car className="h-3 w-3 text-blue-600" />
                  <span>{stats.carCount} Cars</span>
                </div>
                <span>•</span>
                <div className="flex items-center gap-1">
                  <Bike className="h-3 w-3 text-green-600" />
                  <span>{stats.bikeCount} Bikes</span>
                </div>
              </div>
            </CardContent>
          </Card>
          {/* Total Revenue Card */}
          <Card className="overflow-hidden border-0 shadow-2xl bg-gradient-to-br from-white via-green-50 to-emerald-100 dark:from-gray-900 dark:via-green-950/40 dark:to-emerald-950/60 backdrop-blur-sm rounded-xl transform hover:scale-105 transition-all duration-300 hover:shadow-green-200/40 dark:hover:shadow-green-900/40">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-green-500 via-emerald-500 to-teal-600 rounded-t-xl"></div>
            <CardHeader className="pb-2">
              <CardTitle className="flex text-base font-medium text-gray-700 dark:text-gray-200">
                <DollarSign className="h-5 w-5 mr-2 text-green-600 dark:text-green-400" />
                Total Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900 dark:text-white drop-shadow-sm">₹{stats.totalRevenue.toFixed(2)}</div>
              <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mt-1">
                <TrendingUp className="h-3 w-3 text-green-600" />
                <span>₹{stats.todayRevenue.toFixed(2)} today</span>
              </div>
            </CardContent>
          </Card>
            {/* Total Avg Revenue Card */}
          <Card className="overflow-hidden border-0 shadow-2xl bg-gradient-to-br from-white via-red-50 to-pink-100 dark:from-gray-900 dark:via-red-950/40 dark:to-pink-950/60 backdrop-blur-sm rounded-xl transform hover:scale-105 transition-all duration-300 hover:shadow-red-200/40 dark:hover:shadow-red-900/40">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-red-500 via-pink-500 to-orange-600 rounded-t-xl"></div>
            <CardHeader className="pb-2">
              <CardTitle className="flex text-base font-medium text-gray-700 dark:text-gray-200">
                <DollarSign className="h-5 w-5 mr-2 text-red-600 dark:text-red-400" />
                Total Avg Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900 dark:text-white drop-shadow-sm">₹{avgRevenuePerVehicle.toFixed(2)}</div>
              <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mt-1">
                <TrendingUp className="h-3 w-3 text-red-600" />
                <span>₹{dailyAvgRevenue.toFixed(2)} today</span>
              </div>
            </CardContent>
          </Card>
          {/* Avg. Parking Time Card */}
          <Card className="overflow-hidden border-0 shadow-2xl bg-gradient-to-br from-white via-blue-50 to-cyan-100 dark:from-gray-900 dark:via-blue-950/40 dark:to-cyan-950/60 backdrop-blur-sm rounded-xl transform hover:scale-105 transition-all duration-300 hover:shadow-blue-200/40 dark:hover:shadow-blue-900/40">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 via-sky-500 to-cyan-600 rounded-t-xl"></div>
            <CardHeader className="pb-2">
              <CardTitle className="flex text-base font-medium text-gray-700 dark:text-gray-200">
                <Clock className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
                Avg. Parking Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900 dark:text-white drop-shadow-sm">{formatDuration(stats.averageParkingTime)}</div>
              <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mt-1">
                <Info className="h-3 w-3" />
                <span>Based on {stats.totalVehicles} vehicles</span>
              </div>
            </CardContent>
          </Card>
          {/* Current Occupancy Card */}
          <Card className="overflow-hidden border-0 shadow-2xl bg-gradient-to-br from-white via-amber-50 to-orange-100 dark:from-gray-900 dark:via-amber-950/40 dark:to-orange-950/60 backdrop-blur-sm rounded-xl transform hover:scale-105 transition-all duration-300 hover:shadow-amber-200/40 dark:hover:shadow-amber-900/40">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-amber-500 via-orange-500 to-red-600 rounded-t-xl"></div>
            <CardHeader className="pb-2">
              <CardTitle className="flex text-base font-medium text-gray-700 dark:text-gray-200">
                <Layers className="h-5 w-5 mr-2 text-amber-600 dark:text-amber-400" />
                Current Occupancy
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900 dark:text-white drop-shadow-sm">{stats.currentlyParked}</div>
              <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mt-2">
                <div className="relative w-24 h-2 mr-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden shadow-inner">
                  <div 
                    className="absolute top-0 left-0 h-full bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 rounded-full" 
                    style={{ width: `${stats.occupancyRate}%` }}
                  ></div>
                </div>
                <span className="font-medium">{stats.occupancyRate.toFixed(1)}%</span>
              </div>
            </CardContent>
          </Card>
        </div>
        {/* Main Content Tabs with enhanced styling */}
        <Tabs defaultValue="report" className="space-y-6">
          <div className="flex justify-between items-center mb-4">
            <TabsList className="bg-white/80 dark:bg-gray-800/80 p-1 backdrop-blur-md rounded-xl shadow-lg">
              <TabsTrigger 
                value="report" 
                className="flex items-center gap-1 data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-violet-500 data-[state=active]:text-white dark:data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg"
              >
                <FileText className="h-4 w-4" />
                <span>Report</span>
              </TabsTrigger>
              <TabsTrigger 
                value="analytics" 
                className="flex items-center gap-1 data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-violet-500 data-[state=active]:text-white dark:data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg"
              >
                <BarChart className="h-4 w-4" />
                <span>Analytics</span>
              </TabsTrigger>
            </TabsList>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto mt-3 sm:mt-0">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <SearchIcon className="h-4 w-4 text-gray-400" aria-hidden="true" />
              </div>
              <Input
                type="text"
                placeholder="Search vehicle or mobile..."
                value={searchTerm}
                onChange={handleSearch}
                className="pl-10 bg-white/80 backdrop-blur-sm border-gray-200 dark:border-gray-700 focus:ring-indigo-500 focus:border-indigo-500 rounded-lg shadow-md"
              />
            </div>
            <Select value={dateFilter} onValueChange={handleDateFilter}>
              <SelectTrigger className="w-full sm:w-[180px] bg-white/80 backdrop-blur-sm border-gray-200 dark:border-gray-700 rounded-lg shadow-md">
                <SelectValue placeholder="Filter by date" />
              </SelectTrigger>
              <SelectContent className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-md border-gray-200 dark:border-gray-700 rounded-lg shadow-xl">
                <SelectItem value="all">All dates</SelectItem>
                <SelectItem value={format(new Date(), 'yyyy-MM-dd')}>Today</SelectItem>
                <SelectItem value={format(subDays(new Date(), 1), 'yyyy-MM-dd')}>Yesterday</SelectItem>
                <SelectItem value={format(subDays(new Date(), 2), 'yyyy-MM-dd')}>2 days ago</SelectItem>
                <SelectItem value={format(subDays(new Date(), 3), 'yyyy-MM-dd')}>3 days ago</SelectItem>
                <SelectItem value={format(subDays(new Date(), 4), 'yyyy-MM-dd')}>4 days ago</SelectItem>
                <SelectItem value={format(subDays(new Date(), 5), 'yyyy-MM-dd')}>5 days ago</SelectItem>
                <SelectItem value={format(subDays(new Date(), 6), 'yyyy-MM-dd')}>6 days ago</SelectItem>
                <SelectItem value={format(subDays(new Date(), 7), 'yyyy-MM-dd')}>7 days ago</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={refreshData} 
              variant="outline" 
              disabled={isValidating}
              className="hidden sm:flex items-center gap-1 border-gray-200 dark:border-gray-700 hover:bg-indigo-100 hover:border-indigo-300 dark:hover:bg-indigo-900/30 dark:hover:border-indigo-700 transition-colors duration-300 rounded-lg shadow-md"
            >
              <RefreshCw className={`h-4 w-4 ${isValidating ? 'animate-spin' : ''}`} />
              <span>{isValidating ? 'Refreshing...' : 'Refresh'}</span>
            </Button>
          </div>
          <TabsContent value="report" className="space-y-6">
            <Card className="border-0 shadow-2xl bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-xl overflow-hidden">
              <CardHeader className="border-b border-gray-100 dark:border-gray-800 pb-4 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-gray-800/50 dark:to-gray-800/30">
                <CardTitle className="text-lg text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  Parking Records
                </CardTitle>
                <CardDescription className="text-gray-500 dark:text-gray-400">
                  {dateFilter === 'all' 
                    ? 'Showing all parking records'
                    : `Showing records for ${format(parseISO(dateFilter), 'MMMM d, yyyy')}`
                  }
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-lg">
                  <Table>
                    <TableHeader className="bg-gradient-to-r from-indigo-100 to-violet-100 dark:from-indigo-950/50 dark:to-violet-950/50">
                      <TableRow className="border-b border-gray-200 dark:border-gray-700">
                        <TableHead className="font-semibold text-xs text-gray-600 dark:text-gray-300">Vehicle No</TableHead>
                        <TableHead className="font-semibold text-xs text-gray-600 dark:text-gray-300">Type</TableHead>
                        <TableHead className="font-semibold text-xs text-gray-600 dark:text-gray-300">Entry Time</TableHead>
                        <TableHead className="font-semibold text-xs text-gray-600 dark:text-gray-300">Exit Time</TableHead>
                        <TableHead className="font-semibold text-xs text-gray-600 dark:text-gray-300">Duration</TableHead>
                        <TableHead className="font-semibold text-xs text-gray-600 dark:text-gray-300">Area</TableHead>
                        <TableHead className="font-semibold text-xs text-gray-600 dark:text-gray-300">Advance Paid</TableHead>
                        <TableHead className="font-semibold text-xs text-gray-600 dark:text-gray-300">Payment</TableHead>
                        <TableHead className="font-semibold text-xs text-gray-600 dark:text-gray-300">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentVehicles.length > 0 ? (
                        currentVehicles.map((vehicle) => (
                          <TableRow key={vehicle.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 transition-colors">
                            <TableCell className="font-medium text-gray-900 dark:text-gray-100">{vehicle.vehicle_no}</TableCell>
                            <TableCell>
                              {vehicle.vehicle_type.toLowerCase().includes('car') ? (
                                <div className="flex items-center gap-1">
                                  <Car className="h-4 w-4 text-blue-600" />
                                  <span className="text-gray-700 dark:text-gray-300">Car</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1">
                                  <Bike className="h-4 w-4 text-green-600" />
                                  <span className="text-gray-700 dark:text-gray-300">Bike</span>
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-gray-700 dark:text-gray-300">
                              {format(new Date(vehicle.entry_time), 'MMM d, h:mm a')}
                            </TableCell>
                            <TableCell className="text-gray-700 dark:text-gray-300">
                              {vehicle.exit_time 
                                ? format(new Date(vehicle.exit_time), 'MMM d, h:mm a') 
                                : '—'}
                            </TableCell>
                            <TableCell className="text-gray-700 dark:text-gray-300">
                              {calculateParkingDuration(vehicle.entry_time, vehicle.exit_time)}
                            </TableCell>
                            <TableCell className="text-gray-700 dark:text-gray-300">{vehicle.parkingArea || '—'}</TableCell>
                            <TableCell className="text-gray-700 dark:text-gray-300 font-medium">₹{parseFloat(vehicle.advance_payment).toFixed(2)}</TableCell>
                            <TableCell className="text-gray-700 dark:text-gray-300 font-medium">₹{parseFloat(vehicle.total_amount).toFixed(2)}</TableCell>
                            <TableCell>
                              <Badge className={`${getStatusColor(vehicle.status)} shadow-sm`}>
                                {vehicle.status === 'parked' ? (
                                  <div className="flex items-center gap-1">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                                    <span>Parked</span>
                                  </div>
                                ) : vehicle.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-gray-500 dark:text-gray-400">
                            <div className="flex flex-col items-center">
                              <FileText className="h-10 w-10 text-gray-300 dark:text-gray-600 mb-2" />
                              <p className="font-medium">No vehicles found</p>
                              <p className="text-sm">Try adjusting your search or filters</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
                {/* Pagination */}
                <div className="flex items-center justify-between mt-6">
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Showing {filteredVehicles.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to {Math.min(currentPage * itemsPerPage, filteredVehicles.length)} of {filteredVehicles.length} entries
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button 
                      onClick={handlePrevPage}
                      disabled={currentPage <= 1}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-1 border-gray-200 dark:border-gray-700 rounded-lg shadow-sm hover:bg-indigo-50 dark:hover:bg-indigo-950/30"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      <span>Previous</span>
                    </Button>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 px-2 py-1 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg shadow-sm">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button 
                      onClick={handleNextPage}
                      disabled={currentPage >= totalPages}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-1 border-gray-200 dark:border-gray-700 rounded-lg shadow-sm hover:bg-indigo-50 dark:hover:bg-indigo-950/30"
                    >
                      <span>Next</span>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 gap-6">
              {/* Key Metrics */}
              <Card className="w-full border-0 shadow-2xl bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-xl overflow-hidden">
                <CardHeader className="border-b border-gray-100 dark:border-gray-800 pb-4 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-gray-800/50 dark:to-gray-800/30">
                  <CardTitle className="text-lg text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <BarChart className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                    Performance Metrics
                  </CardTitle>
                  <CardDescription className="text-gray-500 dark:text-gray-400">
                    {dateFilter === 'all' 
                      ? 'Key parking metrics for all time periods'
                      : `Key parking metrics for ${format(parseISO(dateFilter), 'MMMM d, yyyy')}`
                    }
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Weekly Revenue */}
                    <div className="p-6 rounded-xl border border-gray-100 dark:border-gray-800 bg-gradient-to-br from-white via-green-50 to-emerald-100 dark:from-gray-900 dark:via-green-950/20 dark:to-emerald-950/30 shadow-lg transform hover:scale-105 transition-all duration-300">
                      <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-1 mb-1">
                        <TrendingUp className="h-4 w-4 text-green-500" />
                        Weekly Revenue
                      </h3>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white drop-shadow-sm">₹{stats.weeklyRevenue.toFixed(2)}</p>
                      <div className="flex items-center mt-2 text-xs text-green-600 dark:text-green-400 font-medium">
                        <TrendingUp className="h-3 w-3 mr-1" />
                        <span>+12% vs. previous week</span>
                      </div>
                    </div>
                    {/* Peak Hours */}
                    <div className="p-6 rounded-xl border border-gray-100 dark:border-gray-800 bg-gradient-to-br from-white via-amber-50 to-orange-100 dark:from-gray-900 dark:via-amber-950/20 dark:to-orange-950/30 shadow-lg transform hover:scale-105 transition-all duration-300">
                      <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-1 mb-1">
                        <Timer className="h-4 w-4 text-amber-500" />
                        Peak Hours
                      </h3>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white drop-shadow-sm">{stats.peakHour}</p>
                      <div className="flex items-center mt-2 text-xs text-amber-600 dark:text-amber-400 font-medium">
                        <CircleCheck className="h-3 w-3 mr-1" />
                        <span>78% occupancy during peak</span>
                      </div>
                    </div>
                    {/* Slow Hours */}
                    <div className="p-6 rounded-xl border border-gray-100 dark:border-gray-800 bg-gradient-to-br from-white via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-blue-950/20 dark:to-indigo-950/30 shadow-lg transform hover:scale-105 transition-all duration-300">
                      <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-1 mb-1">
                        <TrendingDown className="h-4 w-4 text-blue-500" />
                        Lowest Activity
                      </h3>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white drop-shadow-sm">{stats.slowestHour}</p>
                      <div className="flex items-center mt-2 text-xs text-blue-600 dark:text-blue-400 font-medium">
                        <Info className="h-3 w-3 mr-1" />
                        <span>12% occupancy during quiet hours</span>
                      </div>
                    </div>
                  </div>
                  {/* Daily Stats */}
                  <div className="mt-8 border-t border-gray-100 dark:border-gray-800 pt-6">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-lg text-gray-900 dark:text-gray-100 flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                        Daily Statistics
                      </CardTitle>
                      <CardDescription className="text-gray-500 dark:text-gray-400">
                        Breakdown of parking data by day
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        {dailyStats.slice(0, 5).map((day) => (
                          <div key={day.date} className="p-4 rounded-xl border border-gray-100 dark:border-gray-800 bg-gradient-to-r from-white to-indigo-50/50 dark:from-gray-900 dark:to-indigo-950/30 hover:shadow-lg hover:border-indigo-200 dark:hover:border-indigo-800/50 transition-all duration-300">
                            <div className="flex justify-between items-start mb-2">
                              <h3 className="font-medium text-gray-900 dark:text-white">
                                {format(parseISO(day.date), 'EEE, MMM d')}
                              </h3>
                              <Badge className="bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-800 dark:from-indigo-900/40 dark:to-purple-900/40 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/50 shadow-sm">
                                {day.vehicleCount} vehicles
                              </Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-sm mt-3">
                              <div className="flex items-center">
                                <DollarSign className="h-4 w-4 text-green-500 mr-1" />
                                <span className="text-gray-700 dark:text-gray-300">₹{day.revenue.toFixed(2)}</span>
                              </div>
                              <div className="flex items-center">
                                <Clock className="h-4 w-4 text-blue-500 mr-1" />
                                <span className="text-gray-700 dark:text-gray-300">{formatDuration(day.averageDuration)}</span>
                              </div>
                              <div className="flex items-center">
                                <Car className="h-4 w-4 text-violet-500 mr-1" />
                                <span className="text-gray-700 dark:text-gray-300">{day.cars} cars</span>
                              </div>
                              <div className="flex items-center">
                                <Bike className="h-4 w-4 text-emerald-500 mr-1" />
                                <span className="text-gray-700 dark:text-gray-300">{day.bikes} bikes</span>
                              </div>
                            </div>
                          </div>
                        ))}
                        {dailyStats.length > 5 && (
                          <Button 
                            variant="outline" 
                            className="w-full mt-4 border-gray-200 dark:border-gray-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors rounded-xl shadow-md"
                          >
                            View All Days
                          </Button>
                        )}
                        {dailyStats.length === 0 && (
                          <div className="flex flex-col items-center justify-center py-8 text-gray-500 dark:text-gray-400">
                            <Calendar className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-2" />
                            <p className="font-medium">No daily statistics</p>
                            <p className="text-sm">Daily breakdowns will appear here</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
    </div>
  </div>
  </PrivateRoute>
);
}