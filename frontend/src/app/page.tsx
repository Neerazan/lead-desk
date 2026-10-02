'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function HomePage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.replace('/login');
      } else if (user.role === 'admin') {
        router.replace('/admin');
      } else {
        router.replace('/dashboard');
      }
    }
  }, [user, isLoading, router]);

  return (
    <div className="loading-screen-container">
      <div className="loading-card">
        <div className="spinner-royal" />
        <h2 className="loading-title">LeadDesk</h2>
        <p className="loading-subtitle">Redirecting to your workspace...</p>
      </div>
    </div>
  );
}
