'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { LogOut, LayoutDashboard, ShieldCheck, Users } from 'lucide-react';

export function Header() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  if (!user) {
    return null;
  }

  const isAdmin = user.role === 'admin';

  return (
    <header className="site-header">
      <div className="header-container">
        {/* Brand Logo */}
        <Link href={isAdmin ? '/admin' : '/dashboard'} className="header-brand">
          <div className="brand-icon-box">
            <span className="brand-dot-accent" />
            <span className="brand-letter">L</span>
          </div>
          <span className="brand-title">
            Lead<span className="brand-title-accent">Desk</span>
            <span className="brand-dot-pulse" />
          </span>
        </Link>

        {/* Navigation links */}
        <nav className="header-nav">
          {isAdmin ? (
            <>
              <Link
                href="/admin"
                className={`nav-link ${pathname === '/admin' ? 'nav-link-active' : ''}`}
              >
                <ShieldCheck size={16} />
                <span>Admin Console</span>
              </Link>
              <Link
                href="/dashboard"
                className={`nav-link ${pathname === '/dashboard' ? 'nav-link-active' : ''}`}
              >
                <LayoutDashboard size={16} />
                <span>My Leads</span>
              </Link>
            </>
          ) : (
            <Link
              href="/dashboard"
              className={`nav-link ${pathname === '/dashboard' ? 'nav-link-active' : ''}`}
            >
              <LayoutDashboard size={16} />
              <span>Dashboard</span>
            </Link>
          )}
        </nav>

        {/* User profile & actions */}
        <div className="header-user-section">
          <div className="user-profile-badge">
            <div className="user-avatar-circle">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="user-info-text">
              <span className="user-name">{user.name}</span>
              <div className="user-role-row">
                <span className={`role-pill ${user.role === 'admin' ? 'role-pill-admin' : 'role-pill-member'}`}>
                  {user.role}
                </span>
                <span className="user-email-secondary">{user.email}</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => logout()}
            className="btn-logout"
            title="Sign out of LeadDesk"
            type="button"
          >
            <LogOut size={16} />
            <span className="logout-text">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}
