'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { Acknowledgement } from '../types';

/** Admin review of an employee's signed policy documents (approve / reject with reason). */
export function useAcknowledgements(id: string, isAdmin: boolean) {
  const [acks, setAcks] = useState<Acknowledgement[]>([]);
  const [acksLoading, setAcksLoading] = useState(false);
  const [reviewingId, setReviewingId] = useState<number | null>(null);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [ackError, setAckError] = useState('');

  useEffect(() => {
    if (!isAdmin) return;
    setAcksLoading(true);
    api.get<Acknowledgement[]>(`/employees/${id}/acknowledgements`)
      .then(setAcks)
      .catch(() => setAcks([]))
      .finally(() => setAcksLoading(false));
  }, [id, isAdmin]);

  async function approve(ack: Acknowledgement) {
    setReviewingId(ack.id);
    try {
      await api.put(`/policies/acknowledgements/${ack.id}/review`, { status: 'approved' });
      setAcks(prev => prev.map(a => a.id === ack.id ? { ...a, status: 'approved', rejection_reason: null } : a));
    } catch {
      setAckError('Could not approve this submission. Please try again.');
    } finally {
      setReviewingId(null);
    }
  }

  async function reject(ack: Acknowledgement) {
    if (!rejectReason.trim()) return;
    setReviewingId(ack.id);
    try {
      await api.put(`/policies/acknowledgements/${ack.id}/review`, {
        status: 'rejected',
        rejection_reason: rejectReason.trim(),
      });
      setAcks(prev => prev.map(a => a.id === ack.id ? { ...a, status: 'rejected', rejection_reason: rejectReason.trim() } : a));
      setRejectingId(null);
      setRejectReason('');
    } catch {
      setAckError('Could not reject this submission. Please try again.');
    } finally {
      setReviewingId(null);
    }
  }

  return {
    acks,
    acksLoading,
    reviewingId,
    rejectingId,
    setRejectingId,
    rejectReason,
    setRejectReason,
    ackError,
    approve,
    reject,
  };
}

export type AcknowledgementsState = ReturnType<typeof useAcknowledgements>;
