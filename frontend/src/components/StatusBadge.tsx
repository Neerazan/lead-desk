import React from 'react';
import { LeadStatus } from '@/types';

interface StatusBadgeProps {
  status: LeadStatus;
}

const statusConfig: Record<LeadStatus, { label: string; bg: string; text: string; dot: string; border: string }> = {
  new: {
    label: 'New Lead',
    bg: 'rgba(27, 60, 245, 0.08)',
    text: '#1B3CF5',
    dot: '#1B3CF5',
    border: 'rgba(27, 60, 245, 0.25)',
  },
  contacted: {
    label: 'Contacted',
    bg: 'rgba(234, 88, 12, 0.08)',
    text: '#ea580c',
    dot: '#ea580c',
    border: 'rgba(234, 88, 12, 0.25)',
  },
  qualified: {
    label: 'Qualified',
    bg: 'rgba(22, 163, 74, 0.08)',
    text: '#16a34a',
    dot: '#16a34a',
    border: 'rgba(22, 163, 74, 0.25)',
  },
  lost: {
    label: 'Lost',
    bg: 'rgba(115, 115, 115, 0.1)',
    text: '#525252',
    dot: '#a3a3a3',
    border: 'rgba(115, 115, 115, 0.25)',
  },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.new;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '3px 10px',
        borderRadius: '9999px',
        fontSize: '0.75rem',
        fontWeight: 600,
        backgroundColor: config.bg,
        color: config.text,
        border: `1px solid ${config.border}`,
        letterSpacing: '0.02em',
        textTransform: 'uppercase',
      }}
    >
      <span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: config.dot,
        }}
      />
      {config.label}
    </span>
  );
}
