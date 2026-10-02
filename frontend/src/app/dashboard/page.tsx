'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { StatusBadge } from '@/components/StatusBadge';
import { LeadModal } from '@/components/LeadModal';
import { Lead, LeadStatus } from '@/types';
import { apiFetch, ApiError } from '@/lib/api';
import {
  Plus,
  Search,
  Users,
  Target,
  TrendingUp,
  Globe,
  RefreshCw,
  FolderOpen,
  AlertCircle,
} from 'lucide-react';

export default function DashboardPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchLeads = useCallback(async () => {
    setIsLoading(true);
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
        setError('Failed to load your leads. Please verify backend connection.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

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
  };

  // Stats computation
  const totalCount = leads.length;
  const newCount = leads.filter((l) => l.status === 'new').length;
  const contactedCount = leads.filter((l) => l.status === 'contacted').length;
  const qualifiedCount = leads.filter((l) => l.status === 'qualified').length;

  return (
    <ProtectedRoute allowedRoles={['member', 'admin']}>
      <main className="main-content">
        {/* Page Header */}
        <div className="page-header-row">
          <div>
            <h1 className="page-title">Sales Pipeline</h1>
            <p className="page-description">
              Manage your personal sales leads and monitor conversion stages
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="btn btn-primary"
            type="button"
          >
            <Plus size={18} />
            <span>Add New Lead</span>
          </button>
        </div>

        {/* Pipeline Metric Cards */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon-wrap">
              <Users size={22} />
            </div>
            <div>
              <div className="stat-value">{totalCount}</div>
              <div className="stat-label">Total Leads</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon-wrap stat-icon-wrap-accent">
              <Target size={22} />
            </div>
            <div>
              <div className="stat-value">{newCount}</div>
              <div className="stat-label">New Opportunities</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon-wrap" style={{ color: '#ea580c', background: 'rgba(234, 88, 12, 0.08)' }}>
              <RefreshCw size={22} />
            </div>
            <div>
              <div className="stat-value">{contactedCount}</div>
              <div className="stat-label">In Contact</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon-wrap" style={{ color: '#16a34a', background: 'rgba(22, 163, 74, 0.08)' }}>
              <TrendingUp size={22} />
            </div>
            <div>
              <div className="stat-value">{qualifiedCount}</div>
              <div className="stat-label">Qualified Leads</div>
            </div>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="controls-card">
          <div className="search-input-wrap">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="Search by lead name, company or email..."
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
              onClick={() => fetchLeads()}
              className="btn btn-secondary"
              type="button"
              title="Refresh list"
            >
              <RefreshCw size={15} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Leads Table Container */}
        {isLoading ? (
          <div className="state-box">
            <div className="spinner-royal" />
            <h3 className="state-title">Loading Leads</h3>
            <p className="state-desc">Fetching latest lead activity from database...</p>
          </div>
        ) : error ? (
          <div className="state-box">
            <div className="state-icon-circle" style={{ color: 'var(--color-accent)' }}>
              <AlertCircle size={28} />
            </div>
            <h3 className="state-title">Failed to load leads</h3>
            <p className="state-desc">{error}</p>
            <button
              onClick={() => fetchLeads()}
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
            <h3 className="state-title">No leads in this view</h3>
            <p className="state-desc">
              {search || statusFilter !== 'all'
                ? 'Try adjusting your search criteria or clearing filters.'
                : 'Get started by creating your first sales lead in the system.'}
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="btn btn-primary"
              type="button"
            >
              <Plus size={16} />
              <span>Create First Lead</span>
            </button>
          </div>
        ) : (
          <div className="table-container">
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Lead Contact</th>
                    <th>Company</th>
                    <th>Website</th>
                    <th>Status</th>
                    <th>Added On</th>
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
                      </td>
                      <td>
                        {lead.website ? (
                          <a
                            href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="lead-link"
                          >
                            <Globe size={13} />
                            <span>{lead.website.replace(/^https?:\/\//, '')}</span>
                          </a>
                        ) : (
                          <span style={{ color: 'var(--color-neutral-400)' }}>—</span>
                        )}
                      </td>
                      <td>
                        <StatusBadge status={lead.status} />
                      </td>
                      <td style={{ color: 'var(--color-neutral-500)', fontSize: '0.8rem' }}>
                        {new Date(lead.created_at).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
