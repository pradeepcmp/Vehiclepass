// app/RootLayoutClient.tsx
"use client";

import { ProtectedRoute } from '@/app/protectedRoute';

interface RootLayoutClientProps {
  children: React.ReactNode;
}

export default function RootLayoutClient({ children }: RootLayoutClientProps) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}