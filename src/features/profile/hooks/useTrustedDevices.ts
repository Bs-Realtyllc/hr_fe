'use client';
import { useState } from 'react';
import { api } from '@/lib/api';
import type { TrustedDevice } from '../components/security/TrustedDevicesModal';
import type { Flash } from './useFlash';

export function useTrustedDevices(flash: Flash) {
  // Trusted devices (2FA -> Trusted Devices -> Manage)
  const [showTrustedDevices, setShowTrustedDevices] = useState(false);
  const [trustedDevices, setTrustedDevices] = useState<TrustedDevice[]>([]);
  const [trustedDevicesLoading, setTrustedDevicesLoading] = useState(false);
  const [revokingDeviceId, setRevokingDeviceId] = useState<number | null>(null);

  async function fetchTrustedDevices() {
    setTrustedDevicesLoading(true);
    try {
      const data = await api.get<TrustedDevice[]>('/auth/2fa/trusted-devices');
      setTrustedDevices(data ?? []);
    } catch {
      flash('Unable to load trusted devices.', 'err');
    } finally {
      setTrustedDevicesLoading(false);
    }
  }

  function openTrustedDevices() {
    setShowTrustedDevices(true);
    setTrustedDevices([]);
    fetchTrustedDevices();
  }

  async function revokeTrustedDevice(deviceId: number) {
    setRevokingDeviceId(deviceId);
    try {
      await api.delete(`/auth/2fa/trusted-devices/${deviceId}`);
      setTrustedDevices((prev) => prev.filter((d) => d.id !== deviceId));
      flash('Device revoked.');
    } catch {
      flash('Unable to revoke device.', 'err');
    } finally {
      setRevokingDeviceId(null);
    }
  }

  async function revokeAllTrustedDevices() {
    setTrustedDevicesLoading(true);
    try {
      await api.delete('/auth/2fa/trusted-devices');
      setTrustedDevices([]);
      flash('All devices revoked.');
    } catch {
      flash('Unable to revoke devices.', 'err');
    } finally {
      setTrustedDevicesLoading(false);
    }
  }

  return {
    showTrustedDevices,
    setShowTrustedDevices,
    trustedDevices,
    trustedDevicesLoading,
    revokingDeviceId,
    openTrustedDevices,
    revokeTrustedDevice,
    revokeAllTrustedDevices,
  };
}

export type TrustedDevicesState = ReturnType<typeof useTrustedDevices>;
