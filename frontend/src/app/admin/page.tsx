'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { StatusBadge } from '@/components/StatusBadge';
import { Lead, LeadStatus, User } from '@/types';
import { apiFetch, ApiError } from '@/lib/api';
import { toast } from 'sonner';
import { DeleteConfirmationModal } from '@/components/DeleteConfirmationModal';
import {
  ShieldCheck,
  Users,
  Briefcase,
  Search,
  Trash2,
  Globe,
  RefreshCw,
  FolderOpen,
  AlertCircle,
  UserCheck,
} from 'lucide-react';

import { useDebounce } from '@/hooks/useDebounce';

function AdminContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams.get('tab');
  const activeTab: 'leads' | 'users' = tabParam === 'users' ? 'users' : 'leads';

  const setActiveTab = (tab: 'leads' | 'users') => {
    router.replace(`/admin?tab=${tab}`);
  };

  const [leads, setLeads] = useState<Lead[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoadingLeads, setIsLoadingLeads] = useState(true);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 350);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Delete modal state
  const [leadToDelete, setLeadToDelete] = useState<Lead | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch all leads across all members
  const fetchAllLeads = useCallback(async () => {
    setIsLoadingLeads(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      if (debouncedSearch.trim()) {
        params.append('search', debouncedSearch.trim());
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
  }, [debouncedSearch, statusFilter]);

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

  // Admin status update action with Toast
  const handleStatusChange = async (leadId: string, newStatus: LeadStatus) => {
    try {
      const updated = await apiFetch<Lead>(`/api/leads/${leadId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });

      setLeads((prev) => prev.map((l) => (l.id === leadId ? updated : l)));
      toast.success(`Lead status updated to ${newStatus.toUpperCase()}`, {
        description: `"${updated.name}" is now marked as ${newStatus}.`,
      });
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        toast.error('Failed to update lead status', {
          description: err.message,
        });
      } else {
        toast.error('Failed to update lead status');
      }
    }
  };

  // Open confirmation modal for deleting lead
  const openDeleteModal = (lead: Lead) => {
    setLeadToDelete(lead);
  };

  // Confirm delete handler executed by modal
  const handleConfirmDelete = async () => {
    if (!leadToDelete) return;

    setIsDeleting(true);
    try {
      await apiFetch(`/api/leads/${leadToDelete.id}`, { method: 'DELETE' });
      setLeads((prev) => prev.filter((l) => l.id !== leadToDelete.id));
      toast.success('Lead permanently deleted', {
        description: `"${leadToDelete.name}" (${leadToDelete.company}) has been removed.`,
      });
      setLeadToDelete(null);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        toast.error('Delete failed', {
          description: err.message,
        });
      } else {
        toast.error('An unexpected error occurred while deleting.');
      }
    } finally {
      setIsDeleting(false);
    }
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
            <h1 className="page-title">{activeTab === 'users' ? 'System Users' : 'Organization Leads'}</h1>
            <p className="page-description">
              {activeTab === 'users'
                ? 'Supervise registered users, role privileges, and account activity'
                : 'Supervise all organization leads, monitor status conversions, and track assigned owners'}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              onClick={activeTab === 'leads' ? fetchAllLeads : fetchUsers}
              className="btn btn-secondary"
              type="button"
              title="Refresh current data"
            >
              <RefreshCw size={16} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

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
                  No records match your filter criteria.
                </p>
                {(search || statusFilter !== 'all') && (
                  <button
                    onClick={() => {
                      setSearch('');
                      setStatusFilter('all');
                    }}
                    className="btn btn-secondary"
                    type="button"
                  >
                    <RefreshCw size={15} />
                    <span>Reset Filters</span>
                  </button>
                )}
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
                              onClick={() => openDeleteModal(lead)}
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

        {/* Delete Confirmation Modal */}
        <DeleteConfirmationModal
          isOpen={leadToDelete !== null}
          onClose={() => setLeadToDelete(null)}
          onConfirm={handleConfirmDelete}
          leadName={leadToDelete?.name || ''}
          leadCompany={leadToDelete?.company}
          isDeleting={isDeleting}
        />

      </main>
    </ProtectedRoute>
  );
}

export default function AdminPage() {
  return (
    <Suspense fallback={null}>
      <AdminContent />
    </Suspense>
  );
}
