'use client';
import { BSRealtyDropdown } from '@bsrealtyllc/design-system';
import Button from '@/components/ui/Button/Button';
import { ACCESS_ROLE_OPTIONS } from '../utils';
import type { TeamAccessState } from '../hooks/useTeamAccess';

/** Team Access → Edit Role confirmation dialog. */
export default function EditRoleModal({ team }: { team: TeamAccessState }) {
  const { roleChangeTarget, setRoleChangeTarget, newRoleValue, setNewRoleValue, savingRole, confirmRoleChange } = team;
  if (!roleChangeTarget) return null;
  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 p-4" onClick={() => setRoleChangeTarget(null)}>
      <div
        className="flex w-full max-w-[420px] flex-col gap-4 rounded-2xl bg-(--soft-white-light) p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-[18px] font-semibold text-(--neutral-normal)">Edit Role</h2>
        <p className="text-[14px] text-(--soft-white-dark-active)">
          Change the access role for <strong>{roleChangeTarget.name}</strong>.
        </p>
        <BSRealtyDropdown
          options={ACCESS_ROLE_OPTIONS}
          value={newRoleValue}
          onChange={setNewRoleValue}
          aria-label="New role"
        />
        {newRoleValue === 'admin' && (
          <p className="text-[13px] text-(--error-normal)">
            This grants full admin access to every feature on the platform.
          </p>
        )}
        <div className="mt-2 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => setRoleChangeTarget(null)}
            className="rounded-xl border-2 border-(--neutral-light-hover) px-4 py-2 text-[14px] text-(--gray-darker)"
          >
            Cancel
          </button>
          <Button
            type="button"
            variant="primary"
            size="medium"
            disabled={savingRole || newRoleValue === roleChangeTarget.role}
            onClick={confirmRoleChange}
          >
            {savingRole ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>
    </div>
  );
}
