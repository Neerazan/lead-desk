'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { ShieldAlert, ArrowLeft, LayoutDashboard, LogIn } from 'lucide-react';

export default function ForbiddenPage() {
  const { user } = useAuth();

  return (
    <div className="auth-page-container">
      <div className="auth-card" style={{ textAlign: 'center' }}>
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: 'var(--color-accent-muted)',
            color: 'var(--color-accent)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1.25rem',
            border: '1px solid var(--color-accent-border)',
          }}
        >
          <ShieldAlert size={32} />
        </div>

        <h1
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '1.75rem',
            fontWeight: 800,
            marginBottom: '0.5rem',
          }}
        >
          Access Forbidden (403)
        </h1>

        <p
          style={{
            color: 'var(--color-neutral-600)',
            fontSize: '0.925rem',
            lineHeight: 1.5,
            marginBottom: '2rem',
          }}
        >
          You do not have the required permissions to view this resource.
          {user ? (
            <>
              {' '}You are currently signed in as a{' '}
              <strong style={{ textTransform: 'capitalize', color: 'var(--color-neutral-900)' }}>
                {user.role}
              </strong>
              .
            </>
          ) : (
            ' Please sign in with an account that has administrator privileges.'
          )}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {user ? (
            <Link
              href="/dashboard"
              className="btn btn-primary"
              style={{ padding: '0.75rem' }}
            >
              <LayoutDashboard size={16} />
              <span>Return to My Dashboard</span>
            </Link>
          ) : (
            <Link
              href="/login"
              className="btn btn-primary"
              style={{ padding: '0.75rem' }}
            >
              <LogIn size={16} />
              <span>Sign In to LeadDesk</span>
            </Link>
          )}

          <Link
            href="/"
            className="btn btn-secondary"
            style={{ padding: '0.75rem' }}
          >
            <ArrowLeft size={16} />
            <span>Go to Home</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
