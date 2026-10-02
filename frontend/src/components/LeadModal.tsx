'use client';

import React, { useState, useEffect } from 'react';
import { Lead, LeadCreateInput, LeadStatus } from '@/types';
import { apiFetch, ApiError } from '@/lib/api';
import { X, Sparkles, AlertCircle } from 'lucide-react';

interface LeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLeadSaved: (lead: Lead) => void;
  initialLead?: Lead | null;
}

export function LeadModal({
  isOpen,
  onClose,
  onLeadSaved,
  initialLead,
}: LeadModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [website, setWebsite] = useState('');
  const [status, setStatus] = useState<LeadStatus>('new');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialLead) {
      setName(initialLead.name);
      setEmail(initialLead.email);
      setCompany(initialLead.company);
      setWebsite(initialLead.website || '');
      setStatus(initialLead.status);
    } else {
      setName('');
      setEmail('');
      setCompany('');
      setWebsite('');
      setStatus('new');
    }
    setErrors({});
    setGlobalError(null);
  }, [initialLead, isOpen]);

  if (!isOpen) return null;

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!name.trim()) {
      errs.name = 'Full name is required';
    }
    if (!email.trim()) {
      errs.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errs.email = 'Please provide a valid email address';
    }
    if (!company.trim()) {
      errs.company = 'Company name is required';
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
      const payload: LeadCreateInput = {
        name: name.trim(),
        email: email.trim(),
        company: company.trim(),
        website: website.trim() ? website.trim() : null,
        status,
      };

      let savedLead: Lead;
      if (initialLead) {
        savedLead = await apiFetch<Lead>(`/api/leads/${initialLead.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      } else {
        savedLead = await apiFetch<Lead>('/api/leads', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      onLeadSaved(savedLead);
      onClose();
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setGlobalError(err.message);
      } else {
        setGlobalError('Failed to save lead. Please check your network connection.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-container"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="modal-header">
          <div className="modal-title-wrap">
            <span className="modal-icon-badge">
              <Sparkles size={18} />
            </span>
            <h2 className="modal-heading">
              {initialLead ? 'Edit Lead' : 'Create New Lead'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="modal-close-btn"
            type="button"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {globalError && (
          <div className="alert-banner alert-banner-error">
            <AlertCircle size={16} />
            <span>{globalError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label htmlFor="lead-name" className="form-label">
              Full Name <span className="label-required">*</span>
            </label>
            <input
              id="lead-name"
              type="text"
              className={`form-input ${errors.name ? 'form-input-error' : ''}`}
              placeholder="e.g. Elena Vance"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isSubmitting}
            />
            {errors.name && <span className="form-field-error">{errors.name}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="lead-email" className="form-label">
              Work Email <span className="label-required">*</span>
            </label>
            <input
              id="lead-email"
              type="email"
              className={`form-input ${errors.email ? 'form-input-error' : ''}`}
              placeholder="elena@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSubmitting}
            />
            {errors.email && <span className="form-field-error">{errors.email}</span>}
          </div>

          <div className="form-row-2">
            <div className="form-group">
              <label htmlFor="lead-company" className="form-label">
                Company <span className="label-required">*</span>
              </label>
              <input
                id="lead-company"
                type="text"
                className={`form-input ${errors.company ? 'form-input-error' : ''}`}
                placeholder="Acme Corp"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                disabled={isSubmitting}
              />
              {errors.company && (
                <span className="form-field-error">{errors.company}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="lead-website" className="form-label">
                Website <span className="label-optional">(Optional)</span>
              </label>
              <input
                id="lead-website"
                type="text"
                className="form-input"
                placeholder="https://acme.com"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="lead-status" className="form-label">
              Lead Stage / Status
            </label>
            <select
              id="lead-status"
              className="form-select"
              value={status}
              onChange={(e) => setStatus(e.target.value as LeadStatus)}
              disabled={isSubmitting}
            >
              <option value="new">New Lead</option>
              <option value="contacted">Contacted</option>
              <option value="qualified">Qualified</option>
              <option value="lost">Lost</option>
            </select>
          </div>

          <div className="modal-actions">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className="spinner-mini" />
                  Saving...
                </>
              ) : initialLead ? (
                'Save Changes'
              ) : (
                'Create Lead'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
