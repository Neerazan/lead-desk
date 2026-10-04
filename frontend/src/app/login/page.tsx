'use client';

import { useAuth } from '@/context/AuthContext';
import { ApiError } from '@/lib/api';
import { ArrowRight, Lock, Mail } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { Suspense, useEffect, useState } from 'react';
import { toast } from 'sonner';

function LoginForm() {
  const { user, isLoading, login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If already logged in, redirect away from /login
  useEffect(() => {
    if (!isLoading && user) {
      if (redirectUrl && !redirectUrl.startsWith('/login')) {
        if (redirectUrl.startsWith('/admin') && user.role !== 'admin') {
          router.replace('/dashboard');
        } else {
          router.replace(redirectUrl);
        }
      } else {
        router.replace(user.role === 'admin' ? '/admin' : '/dashboard');
      }
    }
  }, [user, isLoading, redirectUrl, router]);

  const validate = (): string[] => {
    const validationErrors: string[] = [];
    if (!email.trim()) {
      validationErrors.push('Email is required');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      validationErrors.push('Please enter a valid email address');
    }

    if (!password) {
      validationErrors.push('Password is required');
    }

    return validationErrors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationErrors = validate();
    if (validationErrors.length > 0) {
      toast.error(validationErrors.join('. '));
      return;
    }

    setIsSubmitting(true);
    try {
      const loggedInUser = await login(email.trim(), password);

      if (redirectUrl && !redirectUrl.startsWith('/login')) {
        if (redirectUrl.startsWith('/admin') && loggedInUser.role !== 'admin') {
          router.replace('/dashboard');
        } else {
          router.replace(redirectUrl);
        }
      } else {
        router.replace(loggedInUser.role === 'admin' ? '/admin' : '/dashboard');
      }
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        toast.error(err.message);
      } else {
        toast.error('Unable to connect to authentication service');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-card">
      <div className="auth-brand-wrap">
        <div className="auth-badge-icon">
          <span className="brand-dot-accent" />
          <span>L</span>
        </div>
        <h1 className="auth-title">Welcome to LeadDesk</h1>
        <p className="auth-subtitle">
          Sign in to access your sales leads and CRM management console
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
        <div className="form-group">
          <label htmlFor="login-email" className="form-label">
            Email Address
          </label>
          <div style={{ position: 'relative' }}>
            <input
              id="login-email"
              type="email"
              className="form-input"
              style={{ width: '100%', paddingLeft: '2.5rem' }}
              placeholder="name@leaddesk.test"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSubmitting}
              autoComplete="email"
            />
            <Mail
              size={16}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--color-neutral-400)',
              }}
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="login-password" className="form-label">
            Password
          </label>
          <div style={{ position: 'relative' }}>
            <input
              id="login-password"
              type="password"
              className="form-input"
              style={{ width: '100%', paddingLeft: '2.5rem' }}
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isSubmitting}
              autoComplete="current-password"
            />
            <Lock
              size={16}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--color-neutral-400)',
              }}
            />
          </div>
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          style={{ width: '100%', padding: '0.8rem', marginTop: '0.5rem' }}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <span className="spinner-mini" />
              Signing in...
            </>
          ) : (
            <>
              <span>Sign In</span>
              <ArrowRight size={16} />
            </>
          )}
        </button>
      </form>

    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="auth-page-container">
      <Suspense
        fallback={
          <div className="loading-card">
            <div className="spinner-royal" />
            <h2 className="loading-title">Loading LeadDesk</h2>
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}
