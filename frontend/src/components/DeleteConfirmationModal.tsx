'use client';

import React, { useEffect } from 'react';
import { Trash2, X, AlertTriangle } from 'lucide-react';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  leadName: string;
  leadCompany?: string | null;
  isDeleting?: boolean;
}

export function DeleteConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Delete Lead',
  leadName,
  leadCompany,
  isDeleting = false,
}: DeleteConfirmationModalProps) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && !isDeleting) {
        onClose();
      }
    }

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, isDeleting, onClose]);

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={isDeleting ? undefined : onClose}>
      <div
        className="modal-container modal-container-danger"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-modal-title"
      >
        <div className="modal-header">
          <div className="modal-title-wrap">
            <span className="modal-icon-badge modal-icon-badge-danger">
              <Trash2 size={18} />
            </span>
            <h2 id="delete-modal-title" className="modal-heading">
              {title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="modal-close-btn"
            type="button"
            aria-label="Close dialog"
            disabled={isDeleting}
          >
            <X size={18} />
          </button>
        </div>

        <div className="modal-body-danger">
          <div className="delete-warning-box">
            <AlertTriangle size={20} className="warning-icon" />
            <p className="delete-warning-text">
              This action is permanent and cannot be undone.
            </p>
          </div>

          <p className="delete-prompt-text">
            Are you sure you want to delete the lead for{' '}
            <strong className="delete-target-name">{leadName}</strong>
            {leadCompany ? (
              <>
                {' '}at <span className="delete-target-company">{leadCompany}</span>
              </>
            ) : null}
            ?
          </p>
        </div>

        <div className="modal-actions-danger">
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary"
            disabled={isDeleting}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="btn btn-danger-solid"
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <span className="spinner-sm" />
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <Trash2 size={16} />
                <span>Delete Lead</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
