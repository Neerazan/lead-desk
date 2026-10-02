'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { StatusBadge } from '@/components/StatusBadge';
import { LeadModal } from '@/components/LeadModal';
import { Lead, LeadStatus, User } from '@/types';
import { apiFetch, ApiError } from '@/lib/api';
import {
  ShieldCheck,
  Users,
  Briefcase,
  Search,
  Plus,
  Trash2,
  Globe,
  RefreshCw,
  FolderOpen,
  AlertCircle,
  UserCheck,
  CheckCircle2,
} from 'lucide-react';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<'leads' | 'users'>('leads');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoadingLeads, setIsLoadingLeads] = useState(true);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Fetch all leads across all members
  const fetchAllLeads = useCallback(async () => {
    setIsLoadingLeads(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      if (search.trim()) {
        params.append('search', search.trim());
      }

      const queryString = params.toString() ? `?${params.toString()}` : '';
      const data = await apiFetch<Lead[]>(`/api/leads${queryString}`);
      setLeads(data);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to fetch platform leads.');
      }
    } finally {
      setIsLoadingLeads(false);
    }
  }, [search, statusFilter]);

  // Fetch users from /api/admin/users
  const fetchUsers = useCallback(async () => {
    setIsLoadingUsers(true);
    try {
      const data = await apiFetch<User[]>('/api/admin/users');
      setUsers(data);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to fetch system users.');
      }
    } finally {
      setIsLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    fetchAllLeads();
  }, [fetchAllLeads]);

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    }
  }, [activeTab, fetchUsers]);

  // Auto-dismiss success notification
  useEffect(() => {
    if (actionSuccess) {
      const timer = setTimeout(() => setActionSuccess(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [actionSuccess]);

  // Admin status update action
  const handleStatusChange = async (leadId: string, newStatus: LeadStatus) => {
    try {
      const updated = await apiFetch<Lead>(`/api/leads/${leadId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });

      setLeads((prev) => prev.map((l) => (l.id === leadId ? updated : l)));
      setActionSuccess(`Updated status of "${updated.name}" to ${newStatus}`);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        alert(`Status update failed: ${err.message}`);
      }
    }
  };

  // Admin delete lead action
  const handleDeleteLead = async (lead: Lead) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete lead "${lead.name}" (${lead.company})? This cannot be undone.`
    );
    if (!confirmed) return;

    try {
      await apiFetch(`/api/leads/${lead.id}`, { method: 'DELETE' });
      setLeads((prev) => prev.filter((l) => l.id !== lead.id));
      setActionSuccess(`Deleted lead "${lead.name}" successfully`);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        alert(`Delete failed: ${err.message}`);
      }
    }
  };

  const handleLeadSaved = (newOrUpdatedLead: Lead) => {
    setLeads((prev) => {
      const index = prev.findIndex((l) => l.id === newOrUpdatedLead.id);
      if (index >= 0) {
        const copy = [...prev];
        copy[index] = newOrUpdatedLead;
        return copy;
      }
      return [newOrUpdatedLead, ...prev];
    });
    setActionSuccess(`Lead "${newOrUpdatedLead.name}" saved`);
  };

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <main className="main-content">
        {/* Page Header */}
        <div className="page-header-row">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <span className="role-pill role-pill-admin">Administrator Console</span>
            </div>
            <h1 className="page-title">Executive Overview</h1>
            <p className="page-description">
              Supervise all organization leads, monitor assignments, and manage registered members
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              onClick={() => setIsModalOpen(true)}
              className="btn btn-primary"
              type="button"
            >
              <Plus size={18} />
              <span>Create Lead</span>
            </button>
          </div>
        </div>

        {/* Success Alert Banner */}
        {actionSuccess && (
          <div
            className="alert-banner"
            style={{
              backgroundColor: '#ecfdf5',
              color: '#065f46',
              border: '1px solid #a7f3d0',
              margin: '0 0 1.5rem 0',
            }}
          >
            <CheckCircle2 size={16} />
            <span>{actionSuccess}</span>
          </div>
        )}

        {/* Global Statistics */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon-wrap">
              <Briefcase size={22} />
            </div>
            <div>
              <div className="stat-value">{leads.length}</div>
              <div className="stat-label">Platform Leads</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon-wrap" style={{ color: '#16a34a', background: 'rgba(22, 163, 74, 0.08)' }}>
              <UserCheck size={22} />
            </div>
            <div>
              <div className="stat-value">
                {leads.filter((l) => l.status === 'qualified').length}
              </div>
              <div className="stat-label">Qualified Leads</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon-wrap stat-icon-wrap-accent">
              <Users size={22} />
            </div>
            <div>
              <div className="stat-value">{users.length > 0 ? users.length : 2}</div>
              <div className="stat-label">System Users</div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="tabs-nav">
          <button
            type="button"
            onClick={() => setActiveTab('leads')}
            className={`tab-btn ${activeTab === 'leads' ? 'tab-btn-active' : ''}`}
          >
            <Briefcase size={16} />
            <span>All Leads</span>
            <span className="tab-count-badge">{leads.length}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`tab-btn ${activeTab === 'users' ? 'tab-btn-active' : ''}`}
          >
            <Users size={16} />
            <span>System Users</span>
            {users.length > 0 && <span className="tab-count-badge">{users.length}</span>}
          </button>
        </div>

        {activeTab === 'leads' && (
          <>
            {/* Leads Filter Bar */}
            <div className="controls-card">
              <div className="search-input-wrap">
                <Search size={16} className="search-icon" />
                <input
                  type="text"
                  className="search-input"
                  placeholder="Search across all team leads, company or owner..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <div className="filter-actions">
                <select
                  className="filter-select"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">All Stages</option>
                  <option value="new">New</option>
                  <option value="contacted">Contacted</option>
                  <option value="qualified">Qualified</option>
                  <option value="lost">Lost</option>
                </select>

                <button
                  onClick={() => fetchAllLeads()}
                  className="btn btn-secondary"
                  type="button"
                >
                  <RefreshCw size={15} />
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            {/* Table */}
            {isLoadingLeads ? (
              <div className="state-box">
                <div className="spinner-royal" />
                <h3 className="state-title">Loading Organization Leads</h3>
                <p className="state-desc">Aggregating leads across all users...</p>
              </div>
            ) : error ? (
              <div className="state-box">
                <div className="state-icon-circle" style={{ color: 'var(--color-accent)' }}>
                  <AlertCircle size={28} />
                </div>
                <h3 className="state-title">Error Loading Leads</h3>
                <p className="state-desc">{error}</p>
                <button
                  onClick={() => fetchAllLeads()}
                  className="btn btn-primary"
                  type="button"
                >
                  <RefreshCw size={15} />
                  <span>Try Again</span>
                </button>
              </div>
            ) : leads.length === 0 ? (
              <div className="state-box">
                <div className="state-icon-circle">
                  <FolderOpen size={28} />
                </div>
                <h3 className="state-title">No leads found</h3>
                <p className="state-desc">
                  No records match your criteria. Create a lead to get started.
                </p>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="btn btn-primary"
                  type="button"
                >
                  <Plus size={16} />
                  <span>Create Lead</span>
                </button>
              </div>
            ) : (
              <div className="table-container">
                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Lead</th>
                        <th>Company</th>
                        <th>Owner</th>
                        <th>Status (Admin Edit)</th>
                        <th>Created</th>
                        <th style={{ textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leads.map((lead) => (
                        <tr key={lead.id}>
                          <td>
                            <span className="lead-name-cell">{lead.name}</span>
                            <span className="lead-email-sub">{lead.email}</span>
                          </td>
                          <td>
                            <strong>{lead.company}</strong>
                            {lead.website && (
                              <div style={{ marginTop: '2px' }}>
                                <a
                                  href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="lead-link"
                                  style={{ fontSize: '0.75rem' }}
                                >
                                  <Globe size={11} />
                                  <span>{lead.website.replace(/^https?:\/\//, '')}</span>
                                </a>
                              </div>
                            )}
                          </td>
                          <td>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                padding: '2px 8px',
                                background: 'var(--color-neutral-100)',
                                borderRadius: 'var(--radius-sm)',
                                fontSize: '0.8rem',
                                fontWeight: 500,
                              }}
                            >
                              <Users size={12} style={{ color: 'var(--color-neutral-500)' }} />
                              {lead.owner_name || 'Assigned'}
                            </span>
                          </td>
                          <td>
                            <select
                              value={lead.status}
                              onChange={(e) =>
                                handleStatusChange(lead.id, e.target.value as LeadStatus)
                              }
                              className="form-select"
                              style={{
                                padding: '4px 8px',
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              <option value="new">New</option>
                              <option value="contacted">Contacted</option>
                              <option value="qualified">Qualified</option>
                              <option value="lost">Lost</option>
                            </select>
                          </td>
                          <td style={{ color: 'var(--color-neutral-500)', fontSize: '0.8rem' }}>
                            {new Date(lead.created_at).toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <button
                              type="button"
                              onClick={() => handleDeleteLead(lead)}
                              className="btn btn-danger"
                              style={{ padding: '5px 10px', fontSize: '0.75rem' }}
                              title="Delete this lead"
                            >
                              <Trash2 size={13} />
                              <span>Delete</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === 'users' && (
          <div className="table-container">
            {isLoadingUsers ? (
              <div className="state-box">
                <div className="spinner-royal" />
                <h3 className="state-title">Loading System Users</h3>
                <p className="state-desc">Querying /api/admin/users...</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>User Name</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Registered</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                            <div className="user-avatar-circle" style={{ width: '28px', height: '28px' }}>
                              {u.name.charAt(0).toUpperCase()}
                            </div>
                            <span style={{ fontWeight: 600 }}>{u.name}</span>
                          </div>
                        </td>
                        <td style={{ color: 'var(--color-neutral-600)' }}>{u.email}</td>
                        <td>
                          <span
                            className={`role-pill ${
                              u.role === 'admin' ? 'role-pill-admin' : 'role-pill-member'
                            }`}
                          >
                            {u.role}
                          </span>
                        </td>
                        <td>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              color: u.is_active ? '#16a34a' : '#737373',
                            }}
                          >
                            <span
                              style={{
                                width: '6px',
                                height: '6px',
                                borderRadius: '50%',
                                backgroundColor: u.is_active ? '#16a34a' : '#737373',
                              }}
                            />
                            {u.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td style={{ color: 'var(--color-neutral-500)', fontSize: '0.8rem' }}>
                          {u.created_at
                            ? new Date(u.created_at).toLocaleDateString(undefined, {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })
                            : 'Pre-seeded'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Lead Modal */}
        <LeadModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onLeadSaved={handleLeadSaved}
        />
      </main>
    </ProtectedRoute>
  );
}
