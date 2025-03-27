import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { NotificationProvider } from '@/app/service/NotificationSystem';
import Header from "./Header";
import PrivateRoute from '@/app/protectedRoute'

const geistSans = Geist({ 
  variable: "--font-geist-sans", 
  subsets: ["latin"], 
});

const geistMono = Geist_Mono({ 
  variable: "--font-geist-mono", 
  subsets: ["latin"], 
});

export const metadata: Metadata = { 
  title: "Parking Management", 
  description: "Connect With Us", 
};

export default function RootLayout({ 
  children, 
}: Readonly<{ 
  children: React.ReactNode; 
}>) { 
  return ( 
    <html lang="en"> 
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}> 
        <PrivateRoute>
        <NotificationProvider> 
          <Header />
          <main className="min-h-screen">
            {children} 
          </main>
        </NotificationProvider> 
        </PrivateRoute>
      </body> 
    </html> 
  ); 
}