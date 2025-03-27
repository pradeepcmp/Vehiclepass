import { TileLink } from '@/app/types/HomeTypes';

export const tileLinksData: TileLink[] = [
  {
    id: 1,
    title: 'Parking Solution',
    description: 'Custom enterprise software for large-scale organizations',
    iconPath: 'M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z',
    href: '/parkingsystem',
    bgColor: 'from-blue-50 to-blue-100',
    hoverColor: 'from-blue-100 to-blue-200',
    screenName: "parkingsystem"
  },
  {
    id: 2,
    title: 'Parking Vehicle Pass',
    description: 'Scalable and secure parking solutions',
    iconPath: 'M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z',
    href: '/track',
    bgColor: 'from-purple-50 to-purple-100',
    hoverColor: 'from-purple-100 to-purple-200',
    screenName: "parkingsystem"
  },
  {
    id: 3,
    title: 'Parking Management Report',
    description: 'Transform your data into actionable insights',
    iconPath: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
    href: '/parkingreport',
    bgColor: 'from-green-50 to-green-100',
    hoverColor: 'from-green-100 to-green-200',
    screenName: "parkingreport"
  },
  {
    id: 4,
    title: 'Parking Amount Approval',
    description: 'Approve the mismatch amounts',
    iconPath: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
    href: '/parkingauthorized',
    bgColor: 'from-red-50 to-red-100',
    hoverColor: 'from-red-100 to-red-200',
    screenName: "parkingauthorized"
  },
  {
    id: 5,
    title: 'Parked Vehicle List',
    description: 'Modernize your business processes for the digital era',
    iconPath: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
    href: '/parkinglist',
    bgColor: 'from-amber-50 to-amber-100',
    hoverColor: 'from-amber-100 to-amber-200',
    screenName: "parkinglist"
  },
  // {
  //   id: 6,
  //   title: 'Consulting Services',
  //   description: 'Expert advice from industry-leading professionals',
  //   iconPath: 'M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
  //   href: '/consulting',
  //   bgColor: 'from-indigo-50 to-indigo-100',
  //   hoverColor: 'from-indigo-100 to-indigo-200',
  //   screenName: "ho_accept"
  // },
];