'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { LogOut, Briefcase, Users, ChevronDown } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

export function Header() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentTab = searchParams.get('tab') || 'leads';
  const isLeadsActive = pathname === '/admin' && currentTab !== 'users';
  const isUsersActive = pathname === '/admin' && currentTab === 'users';

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

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

        {/* Navigation links - for admin: Leads and Users */}
        {isAdmin && (
          <nav className="header-nav">
            <Link
              href="/admin?tab=leads"
              className={`nav-link ${isLeadsActive ? 'nav-link-active' : ''}`}
            >
              <Briefcase size={16} />
              <span>Leads</span>
            </Link>
            <Link
              href="/admin?tab=users"
              className={`nav-link ${isUsersActive ? 'nav-link-active' : ''}`}
            >
              <Users size={16} />
              <span>Users</span>
            </Link>
          </nav>
        )}

        {/* User profile dropdown trigger & popover */}
        <div className="header-user-section" ref={dropdownRef}>
          <button
            type="button"
            className={`user-menu-trigger ${dropdownOpen ? 'user-menu-trigger-active' : ''}`}
            onClick={() => setDropdownOpen((prev) => !prev)}
            aria-expanded={dropdownOpen}
            aria-haspopup="true"
          >
            <div className="user-avatar-circle">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <span className="user-trigger-name">{user.name}</span>
            <ChevronDown
              size={14}
              className={`user-chevron ${dropdownOpen ? 'user-chevron-open' : ''}`}
            />
          </button>

          {dropdownOpen && (
            <div className="user-dropdown-menu" role="menu">
              <div className="user-dropdown-header">
                <div className="user-dropdown-user-row">
                  <div className="user-dropdown-avatar">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="user-dropdown-details">
                    <span className="user-dropdown-name">{user.name}</span>
                    <span className="user-dropdown-email">{user.email}</span>
                  </div>
                </div>
                <div className="user-dropdown-role-tag">
                  <span className={`role-pill ${user.role === 'admin' ? 'role-pill-admin' : 'role-pill-member'}`}>
                    {user.role}
                  </span>
                </div>
              </div>

              <div className="user-dropdown-divider" />

              <div className="user-dropdown-actions">
                <button
                  type="button"
                  className="user-dropdown-item user-dropdown-logout"
                  onClick={() => {
                    setDropdownOpen(false);
                    logout();
                  }}
                  role="menuitem"
                >
                  <LogOut size={15} />
                  <span>Log out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
