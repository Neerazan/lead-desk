'use client';

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { UserRole } from '@/types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export function ProtectedRoute({
  children,
  allowedRoles,
}: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        const returnUrl = encodeURIComponent(pathname);
        router.replace(`/login?redirect=${returnUrl}`);
      } else if (allowedRoles && !allowedRoles.includes(user.role)) {
        router.replace('/forbidden');
      }
    }
  }, [user, isLoading, allowedRoles, pathname, router]);

  if (isLoading) {
    return (
      <div className="loading-screen-container">
        <div className="loading-card">
          <div className="spinner-royal" />
          <h2 className="loading-title">Verifying Session</h2>
          <p className="loading-subtitle">Authenticating with LeadDesk server...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return null;
  }

  return <>{children}</>;
}
