'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { isAdmin as isAdminUser } from '@/lib/permissions';
import type { Profile } from '@/types';
import type { TeamAccessMember } from '../types';
import { ACCESS_ROLE_LABELS } from '../utils';
import type { Flash } from './useFlash';

export function useTeamAccess(profile: Profile | null, flash: Flash) {
  const router = useRouter();
  // Team Access (Organization tab, admin only)
  const [teamAccessMembers, setTeamAccessMembers] = useState<TeamAccessMember[]>([]);
  const [teamAccessLoaded, setTeamAccessLoaded] = useState(false);
  const [openMemberMenuId, setOpenMemberMenuId] = useState<number | null>(null);
  const [roleChangeTarget, setRoleChangeTarget] = useState<TeamAccessMember | null>(null);
  const [newRoleValue, setNewRoleValue] = useState('');
  const [savingRole, setSavingRole] = useState(false);

  const loadTeamAccess = async () => {
    try {
      const rows = await api.get<TeamAccessMember[]>('/company/team-access');
      setTeamAccessMembers(rows);
    } catch {
      /* leave the list empty if it can't load */
    } finally {
      setTeamAccessLoaded(true);
    }
  };

  function viewMemberProfile(id: number) {
    setOpenMemberMenuId(null);
    router.push(`/employees/${id}`);
  }

  function openEditRole(member: TeamAccessMember) {
    setOpenMemberMenuId(null);
    setRoleChangeTarget(member);
    setNewRoleValue(member.role);
  }

  async function confirmRoleChange() {
    if (!roleChangeTarget || !newRoleValue) return;
    setSavingRole(true);
    try {
      await api.put(`/employees/${roleChangeTarget.id}`, { role: newRoleValue });
      setTeamAccessMembers((prev) =>
        prev.map((m) => (m.id === roleChangeTarget.id ? { ...m, role: newRoleValue } : m)),
      );
      flash(`${roleChangeTarget.name}'s role updated to ${ACCESS_ROLE_LABELS[newRoleValue] ?? newRoleValue}.`);
      setRoleChangeTarget(null);
    } catch {
      flash('Unable to update role.', 'err');
    } finally {
      setSavingRole(false);
    }
  }

  // Team Access is admin-only server-side — only fetch once we know the role.
  useEffect(() => {
    if (isAdminUser(profile)) loadTeamAccess();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.role]);

  return {
    teamAccessMembers,
    teamAccessLoaded,
    openMemberMenuId,
    setOpenMemberMenuId,
    roleChangeTarget,
    setRoleChangeTarget,
    newRoleValue,
    setNewRoleValue,
    savingRole,
    viewMemberProfile,
    openEditRole,
    confirmRoleChange,
  };
}

export type TeamAccessState = ReturnType<typeof useTeamAccess>;
