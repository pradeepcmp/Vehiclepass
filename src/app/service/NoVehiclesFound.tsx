"use client"
import React, { useEffect, useState } from 'react';

const NoVehiclesAnimation = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [searchActive, setSearchActive] = useState(false);
  
  useEffect(() => {
    setIsLoaded(true);
    
    // Start search animation after component loads
    const timer = setTimeout(() => {
      setSearchActive(true);
    }, 800);
    
    return () => {
      setIsLoaded(false);
      clearTimeout(timer);
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] py-16 px-6 bg-gradient-to-br from-slate-50 via-white to-slate-100 overflow-hidden">
      {/* Abstract background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full opacity-5">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
            <path d="M0,0 L100,0 L100,100 L0,100 Z" fill="url(#grid-pattern)" />
          </svg>
          <svg width="0" height="0">
            <defs>
              <pattern id="grid-pattern" width="10" height="10" patternUnits="userSpaceOnUse">
                <path d="M10,0 L0,0 L0,10" fill="none" stroke="#6366F1" strokeWidth="0.5" />
              </pattern>
            </defs>
          </svg>
        </div>
        
        {/* Floating tech elements */}
        {Array.from({ length: 6 }).map((_, i) => (
          <div 
            key={i}
            className="absolute opacity-5 animate-float"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              transform: `rotate(${Math.random() * 360}deg)`,
              animationDuration: `${Math.random() * 15 + 20}s`,
              animationDelay: `${Math.random() * 5}s`,
            }}
          >
            {i % 2 === 0 ? (
              <svg width="100" height="100" viewBox="0 0 100 100" fill="none">
                <circle cx="50" cy="50" r="45" stroke="#3B82F6" strokeWidth="2" />
                <circle cx="50" cy="50" r="35" stroke="#3B82F6" strokeWidth="1.5" />
                <path d="M20,50 L80,50" stroke="#3B82F6" strokeWidth="1" />
                <path d="M50,20 L50,80" stroke="#3B82F6" strokeWidth="1" />
              </svg>
            ) : (
              <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
                <rect x="10" y="10" width="100" height="100" stroke="#6366F1" strokeWidth="2" rx="10" />
                <rect x="30" y="30" width="60" height="60" stroke="#6366F1" strokeWidth="1.5" rx="5" />
                <path d="M30,60 L90,60" stroke="#6366F1" strokeWidth="1" />
                <path d="M60,30 L60,90" stroke="#6366F1" strokeWidth="1" />
              </svg>
            )}
          </div>
        ))}
      </div>
      
      {/* Main animation container */}
      <div className={`relative w-96 h-96 mb-4 transform transition-all duration-1000 ${isLoaded ? 'scale-100 opacity-100' : 'scale-90 opacity-0'}`}>
        {/* High-tech circular search scanner */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className={`w-80 h-80 rounded-full border-4 border-slate-200 transition-all duration-1000 ${searchActive ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}>
            <div className="absolute inset-4 rounded-full border-2 border-slate-300"></div>
            <div className="absolute inset-8 rounded-full border border-slate-300"></div>
            
            {/* Radar sweep animation */}
            <div className={`absolute top-1/2 left-1/2 w-36 h-36 transition-all duration-1000 ${searchActive ? 'opacity-50' : 'opacity-0'}`} style={{transform: 'translate(-50%, -50%)'}}>
              <div className="absolute top-0 bottom-0 left-0 right-0 origin-center animate-radar">
                <div className="absolute top-0 left-1/2 bottom-0 w-1 transform -translate-x-1/2">
                  <div className="w-full h-1/2 bg-gradient-to-b from-blue-500 to-transparent"></div>
                </div>
              </div>
            </div>
            
            {/* Data points around the circle */}
            {Array.from({ length: 12 }).map((_, i) => (
              <div 
                key={i}
                className={`absolute w-2 h-2 transition-all duration-500 delay-${(i % 5) * 100}`}
                style={{
                  top: `${50 + 40 * Math.sin(i * 30 * Math.PI / 180)}%`,
                  left: `${50 + 40 * Math.cos(i * 30 * Math.PI / 180)}%`,
                  transform: 'translate(-50%, -50%)',
                  opacity: searchActive ? (i % 3 === 0 ? 0.9 : 0.4) : 0,
                  backgroundColor: i % 3 === 0 ? '#3B82F6' : '#CBD5E1',
                  animationDelay: `${i * 200}ms`
                }}
              ></div>
            ))}
          </div>
        </div>
        
        {/* Smart parking visualization */}
        <div className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 transition-all duration-1000 delay-500 ${searchActive ? 'scale-100 opacity-100' : 'scale-90 opacity-0'}`}>
          {/* Parking lot grid with slick 3D perspective */}
          <div className="relative w-64 h-32 transform perspective-1000 rotateX-10">
            <div className="absolute inset-0 grid grid-cols-4 grid-rows-2 gap-1">
              {Array.from({ length: 8 }).map((_, i) => (
                <div 
                  key={i}
                  className={`bg-slate-100 border border-slate-200 rounded transition-all duration-300 flex items-center justify-center ${searchActive ? 'opacity-100' : 'opacity-0'}`}
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  <div className="w-full h-full bg-slate-200 rounded opacity-40 transform scale-90"></div>
                </div>
              ))}
            </div>
            
            {/* Empty parking spot highlight */}
            <div className="absolute top-1/4 left-1/4 right-1/4 bottom-1/4 flex items-center justify-center">
              <div className={`relative w-24 h-14 border-2 rounded transition-all duration-700 delay-1000 ${searchActive ? 'border-red-400 opacity-100' : 'border-transparent opacity-0'}`}>
                <div className="absolute inset-0 bg-red-100 opacity-20 animate-pulse"></div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full animate-pulse flex items-center justify-center">
                  <span className="text-white text-xs font-bold">!</span>
                </div>
              </div>
            </div>
            
            {/* Searching indicator */}
            <div className={`absolute left-1/2 transform -translate-x-1/2 -top-10 transition-opacity duration-1000 ${searchActive ? 'opacity-100' : 'opacity-0'}`}>
              <div className="flex items-center space-x-2 bg-slate-50 px-3 py-1 rounded-full shadow-lg border border-slate-200">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span className="text-xs font-medium text-slate-600">Scanning Parking Area</span>
              </div>
            </div>
          </div>
          
          {/* No vehicles found indicator */}
          <div className={`absolute top-full left-1/2 transform -translate-x-1/2 mt-6 transition-all duration-1000 delay-1500 ${searchActive ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
            <div className="relative">
              <div className="flex items-center justify-center w-12 h-12 mx-auto mb-3 rounded-full bg-gradient-to-br from-red-50 to-red-100 border border-red-200">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              
              <span className="block text-slate-400 text-sm font-medium tracking-wide uppercase">Vehicle Not Detected</span>
            </div>
          </div>
        </div>
        
        {/* Data stream effects */}
        <div className={`absolute inset-0 pointer-events-none overflow-hidden transition-opacity duration-1000 ${searchActive ? 'opacity-30' : 'opacity-0'}`}>
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="absolute h-px bg-gradient-to-r from-transparent via-blue-400 to-transparent animate-dataStream"
              style={{
                top: `${10 + (i * 8)}%`,
                left: '0',
                right: '0',
                animationDelay: `${i * 300}ms`,
                animationDuration: `${3 + Math.random() * 4}s`
              }}
            ></div>
          ))}
        </div>
      </div>
      
      {/* Text content with corporate styling */}
      <div className={`text-center max-w-lg transform transition-all duration-1000 delay-500 ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
        <h3 className="text-2xl font-bold text-slate-800 mb-2">No Vehicles Currently Parked</h3>
        <p className="text-slate-500 mb-8 text-lg leading-relaxed">Our system cannot locate any vehicles registered to this account in our parking facilities.</p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button className="group relative px-6 py-3 overflow-hidden bg-white rounded-lg shadow-lg border border-slate-200 text-slate-700 hover:text-blue-600 transition-all duration-300">
            <div className="absolute inset-0 opacity-0 group-hover:opacity-10 bg-blue-500 transition-opacity duration-300"></div>
            <div className="relative z-10 flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7m-7-7v14" />
              </svg>
              <span className="font-medium">Return Home</span>
            </div>
          </button>
        </div>
      </div>
      
      {/* Company logo/branding element */}
      <div className={`absolute bottom-6 opacity-50 transition-opacity duration-1000 hover:opacity-100`}>
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m-8-8h1m14 0h1m-10-8v1m0 14v1m-7-7h14" />
            </svg>
          </div>
          <span className="text-slate-400 text-sm font-semibold tracking-wide">SmartPark™ Enterprise</span>
        </div>
      </div>
    </div>
  );
};

export default NoVehiclesAnimation;