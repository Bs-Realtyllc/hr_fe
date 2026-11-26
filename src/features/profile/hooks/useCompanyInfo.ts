'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { Flash } from './useFlash';

export function useCompanyInfo(flash: Flash) {
  // Company info (Organization tab) — readable by every role, editable by admin only.
  // work_start/work_end are the company-wide default working hours used to
  // flag late clock-ins; null until an admin actually sets them.
  const emptyCompanyInfo = { name: '', email: '', website: '', work_start: '', work_end: '', late_grace_minutes: '15' };
  const [companyInfo, setCompanyInfo] = useState(emptyCompanyInfo);
  // Last loaded/saved values — compared against companyInfo to enable Save only when dirty.
  const [savedCompanyInfo, setSavedCompanyInfo] = useState(emptyCompanyInfo);
  const [savingCompanyInfo, setSavingCompanyInfo] = useState(false);

  // Each field stays disabled until its Edit button is clicked.
  const [isCompanyNameEdit, setIsCompanyNameEdit] = useState(false);
  const [isCompanyEmailEdit, setIsCompanyEmailEdit] = useState(false);
  const [isCompanyWebEdit, setIsCompanyWebEdit] = useState(false);

  const loadCompanyInfo = async () => {
    try {
      const data = await api.get<{
        name: string | null; email: string | null; website: string | null;
        work_start: string | null; work_end: string | null; late_grace_minutes: number | null;
      }>('/company');
      const loadedCompanyInfo = {
        name: data.name ?? '',
        email: data.email ?? '',
        website: data.website ?? '',
        // TIME columns come back as "HH:MM:SS" — <input type="time"> needs "HH:MM".
        work_start: data.work_start?.slice(0, 5) ?? '',
        work_end: data.work_end?.slice(0, 5) ?? '',
        late_grace_minutes: String(data.late_grace_minutes ?? 15),
      };
      setCompanyInfo(loadedCompanyInfo);
      setSavedCompanyInfo(loadedCompanyInfo);
    } catch {
      /* leave fields blank if company info can't be loaded */
    }
  };

  async function saveCompanyInfo() {
    setSavingCompanyInfo(true);
    try {
      await api.put('/company', {
        name: companyInfo.name,
        email: companyInfo.email,
        website: companyInfo.website,
        work_start: companyInfo.work_start || null,
        work_end: companyInfo.work_end || null,
        late_grace_minutes: companyInfo.late_grace_minutes ? Number(companyInfo.late_grace_minutes) : null,
      });
      setSavedCompanyInfo({ ...companyInfo });
      // Disable all Company Information fields after successful save
      setIsCompanyNameEdit(false);
      setIsCompanyEmailEdit(false);
      setIsCompanyWebEdit(false);
      flash('Company information saved.');
    } catch {
      flash('Unable to save company information.', 'err');
    } finally {
      setSavingCompanyInfo(false);
    }
  }

  useEffect(() => {
    loadCompanyInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isCompanyDirty = JSON.stringify(companyInfo) !== JSON.stringify(savedCompanyInfo);

  return {
    companyInfo,
    setCompanyInfo,
    isCompanyDirty,
    isCompanyNameEdit,
    setIsCompanyNameEdit,
    isCompanyEmailEdit,
    setIsCompanyEmailEdit,
    isCompanyWebEdit,
    setIsCompanyWebEdit,
    savingCompanyInfo,
    saveCompanyInfo,
  };
}

export type CompanyInfoState = ReturnType<typeof useCompanyInfo>;
