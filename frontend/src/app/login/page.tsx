'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ApiError } from '@/lib/api';
import { ArrowRight, Lock, Mail, AlertCircle } from 'lucide-react';

function LoginForm() {
  const { user, isLoading, login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
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

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!email.trim()) {
      errs.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errs.email = 'Please enter a valid email address';
    }

    if (!password) {
      errs.password = 'Password is required';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGlobalError(null);

    if (!validate()) return;

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
        setGlobalError(err.message);
      } else {
        setGlobalError('Unable to connect to authentication service');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const fillCredentials = (userEmail: string, userPass: string) => {
    setEmail(userEmail);
    setPassword(userPass);
    setErrors({});
    setGlobalError(null);
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

      {globalError && (
        <div
          className="alert-banner alert-banner-error"
          style={{ margin: '0 0 1.25rem 0' }}
        >
          <AlertCircle size={16} />
          <span>{globalError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
        <div className="form-group">
          <label htmlFor="login-email" className="form-label">
            Email Address
          </label>
          <div style={{ position: 'relative' }}>
            <input
              id="login-email"
              type="email"
              className={`form-input ${errors.email ? 'form-input-error' : ''}`}
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
          {errors.email && <span className="form-field-error">{errors.email}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="login-password" className="form-label">
            Password
          </label>
          <div style={{ position: 'relative' }}>
            <input
              id="login-password"
              type="password"
              className={`form-input ${errors.password ? 'form-input-error' : ''}`}
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
          {errors.password && (
            <span className="form-field-error">{errors.password}</span>
          )}
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

      {/* Demo Seed Credentials Box */}
      <div className="credentials-hint-box">
        <div className="hint-title">Seed Demo Credentials (Click to fill)</div>
        <div className="hint-chip-row">
          <button
            type="button"
            className="hint-chip"
            onClick={() => fillCredentials('admin@leaddesk.test', 'Admin@123')}
          >
            <span className="hint-role hint-role-admin">Admin Account</span>
            <span className="hint-pass">admin@leaddesk.test</span>
          </button>
          <button
            type="button"
            className="hint-chip"
            onClick={() => fillCredentials('member@leaddesk.test', 'Member@123')}
          >
            <span className="hint-role">Member Account</span>
            <span className="hint-pass">member@leaddesk.test</span>
          </button>
        </div>
      </div>
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
