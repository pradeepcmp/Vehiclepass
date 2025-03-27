"use client"
import React from 'react';

export const Spinner = () => (
  <div className="flex items-center justify-center">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);
const LoadingAnimation = () => {
  return (
    <div className="flex justify-center items-center h-64 w-full">
      <div className="relative">
        {/* Main circle container */}
        <div className="w-20 h-20 relative">
          {/* Spinning outer ring */}
          <div className="absolute inset-0 rounded-full border-t-4 border-blue-500 border-opacity-30 animate-spin"></div>
          
          {/* Secondary spinning ring */}
          <div className="absolute inset-0 rounded-full border-r-4 border-indigo-600 border-opacity-50 animate-spin animation-delay-150"></div>
          
          {/* Center gradient circle */}
          <div className="absolute top-2 left-2 right-2 bottom-2 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 animate-pulse flex items-center justify-center shadow-lg">
            <div className="absolute inset-1 rounded-full bg-white opacity-20 animate-ping"></div>
            
            {/* Top glossy shine */}
            <div className="absolute top-0 left-0 right-0 h-1/3 bg-gradient-to-b from-white to-transparent opacity-40"></div>
            
            {/* Inner "P" letter for Parking */}
            <span className="text-white font-bold text-xl relative z-10">P</span>
          </div>
        </div>
        
        {/* Text below the spinner */}
        <div className="mt-6 text-center">
          <div className="text-gray-700 font-medium">Loading</div>
          <div className="flex justify-center mt-2">
            <span className="h-2 w-2 bg-blue-400 rounded-full mx-1 animate-bounce"></span>
            <span className="h-2 w-2 bg-blue-500 rounded-full mx-1 animate-bounce animation-delay-150"></span>
            <span className="h-2 w-2 bg-indigo-500 rounded-full mx-1 animate-bounce animation-delay-300"></span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Add this to your globals.css
// .animation-delay-150 {
//   animation-delay: 150ms;
// }
// .animation-delay-300 {
//   animation-delay: 300ms;
// }

export default LoadingAnimation;