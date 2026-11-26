'use client';
import { useState } from 'react';
import { isAdmin as isAdminUser } from '@/lib/permissions';
import Button from '@/components/ui/Button/Button';
import PageHeader from '@/components/layout/PageHeader';
import ErrorPage from '@/components/ui/ErrorPage';
import Tabs from '@/components/profile/Tabs';
import type { EmployeeTab, Tab } from '../types';
// Hooks: one per concern; all called here so state survives tab switches.
import { useFlash } from '../hooks/useFlash';
import { useMyProfile } from '../hooks/useMyProfile';
import { usePasswordChange } from '../hooks/usePasswordChange';
import { useTwoFactor } from '../hooks/useTwoFactor';
import { useCompanyInfo } from '../hooks/useCompanyInfo';
import { useNotificationPreferences } from '../hooks/useNotificationPreferences';
import { useTeamAccess } from '../hooks/useTeamAccess';
import { useLoginHistory } from '../hooks/useLoginHistory';
import { useTrustedDevices } from '../hooks/useTrustedDevices';
// Sections (presentational)
import FlashMessage from './FlashMessage';
import ProfileHeaderCard from './ProfileHeaderCard';
import PersonalInfoForm from './PersonalInfoForm';
import OrganizationSection from './OrganizationSection';
import LoginSecuritySection from './LoginSecuritySection';
import SecurityNotificationsSection from './SecurityNotificationsSection';
import EmailNotificationsSection from './EmailNotificationsSection';
import EditRoleModal from './EditRoleModal';
import TwoFactorFlow from './TwoFactorFlow';
import ProfileTipsSidebar from './ProfileTipsSidebar';
import LoginHistoryModal from './security/LoginHistoryModal';
import TrustedDevicesModal from './security/TrustedDevicesModal';
import EmployeePersonalInformation from './employee/EmployeePersonalInformation';
import EmployeeEmployment from './employee/EmployeeEmployment';
import EmployeeBank from './employee/EmployeeBank';
import EmployeeDocuments from './employee/EmployeeDocuments';


export default function ProfilePage() {
  const [tab, setTab] = useState<Tab>('personal');
  const [employeeTab, setEmployeeTab] = useState<EmployeeTab>('personal');

  // Each concern's state lives in its own hook, but all are called here so
  // their data and unsaved edits survive switching tabs (sections unmount).
  const { msg, msgType, flash, clearFlash } = useFlash();
  const me = useMyProfile(flash, clearFlash);
  const { profile, loadError, saving, isDirty } = me;
  const password = usePasswordChange(profile, flash);
  const twoFactor = useTwoFactor(flash);
  const company = useCompanyInfo(flash);
  const { savingCompanyInfo, saveCompanyInfo, isCompanyDirty } = company;
  const notifications = useNotificationPreferences(flash);
  const team = useTeamAccess(profile, flash);
  const loginHistory = useLoginHistory(flash);
  const { showLoginHistory, setShowLoginHistory, loginHistory: loginHistoryRows, loginHistoryLoading, loginHistoryView, fetchLoginHistory } = loginHistory;
  const trustedDevices = useTrustedDevices(flash);
  const { showTrustedDevices, setShowTrustedDevices, trustedDevices: trustedDeviceRows, trustedDevicesLoading, revokingDeviceId, revokeTrustedDevice, revokeAllTrustedDevices } = trustedDevices;

  if (!profile) {
    return (
      <div>
        {loadError ? (
          <div className=" fixed h-screen top-0 right-0 left-[265px] flex justify-center items-center" >
            <ErrorPage />
          </div>
        ) : 'Loading profile…'}
      </div>
    );
  }

  const isAdmin = isAdminUser(profile);

  // The password fields have their own button; Save Changes submits the personal form.
  // Other tabs have no save API yet and say so instead of silently failing.
  const handleSaveChanges = () => {
    if (tab === 'personal') {
      const personalForm = document.getElementById('personal-form') as HTMLFormElement | null;
      if (!personalForm) return;
      // requestSubmit runs browser validation (e.g. invalid email) — show why if it blocks.
      if (!personalForm.checkValidity()) {
        personalForm.reportValidity();
        return;
      }
      personalForm.requestSubmit();
      return;
    }

    if (tab === 'organization') {
      saveCompanyInfo();
      return;
    }

    // TODO: connect security / notification settings to their APIs.
    flash('Saving this section is not available yet.', 'err');
  };

  // Admin Save Changes: one element, shown beside the tabs (≥768px) or after the form (<768px).
  // Only the Personal Info and Organization tabs have something to save.
  const showSaveButton = tab === 'personal' || tab === 'organization';
  const saveButton = (
    <Button
      variant='primary'
      size='small'
      type="button"
      disabled={tab === 'personal' ? saving || !isDirty : savingCompanyInfo || !isCompanyDirty}
      onClick={handleSaveChanges}
    >
      {saving || savingCompanyInfo ? 'Saving…' : 'Save Changes'}
    </Button>
  );

  return (
    <div>
      {/* Page Header */}
      <div className=''>
        <PageHeader title={'My Profile'} discription={"Manage your personal information, documents, and account security"} />
      </div>

      <FlashMessage msg={msg} msgType={msgType} />

      {/* Profile container */}
      <div className='mt-6 mb-6'>
        <ProfileHeaderCard profile={profile} me={me} />

        {/* ── Tabs ────────────────────────────────────────────────────────────── */}
        {isAdmin ? (
          <div className="bg-(--soft-white-light) border border-(--soft-white-normal) rounded-lg px-6" style={{ overflow: 'hidden' }}>

            <div className='flex justify-between py-6'>
              <div className='min-w-0 max-w-full overflow-x-auto'>
                <Tabs
                  activeTab={tab}
                  onChange={(newTab) => setTab(newTab as Tab)}
                  tabs={[
                    { label: 'Personal Info', value: 'personal' },
                    { label: 'Organization', value: 'organization' },
                    { label: 'Security', value: 'security' },
                    { label: 'Notification', value: 'notification' },
                  ]}
                />
              </div>
              {/* ≥768px: beside the tabs. Below that it moves to the end of the form (see below). */}
              {showSaveButton && <div className="shrink-0 max-md:hidden">{saveButton}</div>}
            </div>

            {/* ── PERSONAL INFO ─────────────────────────────────────────────── */}
            {tab === 'personal' && <PersonalInfoForm profile={profile} me={me} password={password} />}

            {/* ── Organization ─────────────────────────────────────────────────── */}
            {tab === 'organization' && <OrganizationSection isAdmin={isAdmin} profile={profile} company={company} team={team} />}

            {/* ── SECURITY ──────────────────────────────────────────────────── */}
            {tab === 'security' && (
              <div className='max-w-[929px] flex flex-col gap-11'>
                <LoginSecuritySection twoFactor={twoFactor} loginHistory={loginHistory} trustedDevices={trustedDevices} />

                {/* divider */}
                <div className='border border-(--neutral-light-hover)'></div>

                {/* Security notifications */}
                <SecurityNotificationsSection notifications={notifications} />
              </div>
            )}

            {/* ── Notification ──────────────────────────────────────────────────── */}
            {tab === 'notification' && (
              <div className='max-w-[532px] flex flex-col gap-11'>
                <EmailNotificationsSection notifications={notifications} />
              </div>
            )}

            {/* <768px: Save sits at the end of the form, after the fields it saves. */}
            {showSaveButton && <div className="mt-8 md:hidden">{saveButton}</div>}
          </div>
        ) : (
          <div className='flex w-full gap-5 max-[1120px]:flex-col'>
            {/* ≤1120px the tips drop below the profile instead of taking 285px beside it. */}
            <div className="flex-1 min-w-0 bg-(--soft-white-light) border border-(--soft-white-normal) rounded-lg px-6 p-b-6" style={{ overflow: 'hidden' }}>

              <div className='flex justify-between py-6'>
                <div className='w-full overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'>
                  <Tabs
                    className="m-1"
                    activeTab={employeeTab}
                    onChange={(newTab) => setEmployeeTab(newTab as EmployeeTab)}
                    tabs={[
                      { label: 'Personal Details', value: 'personal' },
                      { label: 'Employment Details', value: 'employment' },
                      { label: 'Bank Details', value: 'bank' },
                      { label: 'Documents', value: 'documents' },
                      // { label: 'Organization', value: 'organization' },
                      { label: 'Security', value: 'security' },
                      { label: 'Notification', value: 'notification' },
                    ]}
                  />
                </div>
              </div>
              <div className='max-w-[824px]'>
              {employeeTab === 'personal' && <EmployeePersonalInformation />}
              {employeeTab === 'employment' && <EmployeeEmployment />}
              {employeeTab === 'bank' && <EmployeeBank />}
              {employeeTab === 'documents' && <EmployeeDocuments />}
              {/* Organization tab hidden for employees (dev change) — kept for re-enabling:
              {employeeTab === 'organization' && (
                <div className='pt-2'>
                  <OrganizationSection isAdmin={isAdmin} profile={profile} company={company} team={team} />
                </div>
              )} */}
              {employeeTab === 'security' && (
                <div className='max-w-[929px] flex flex-col gap-11 pt-2'>
                  <LoginSecuritySection twoFactor={twoFactor} loginHistory={loginHistory} trustedDevices={trustedDevices} />

                  {/* divider */}
                  <div className='border border-(--neutral-light-hover)'></div>

                  <SecurityNotificationsSection notifications={notifications} />
                </div>
              )}
              {employeeTab === 'notification' && (
                <div className='max-w-[532px] flex flex-col gap-11 pt-2'>
                  <EmailNotificationsSection notifications={notifications} />
                </div>
              )}
              </div>
            </div>
            <ProfileTipsSidebar />
          </div>
        )}

      </div>

      {/* ── Login history modal ─────────────────────────────────────────── */}
      {showLoginHistory && (
        <LoginHistoryModal
          history={loginHistoryRows}
          loading={loginHistoryLoading}
          isAdmin={isAdmin && loginHistoryView === 'all'}
          canViewAll={isAdmin}
          view={loginHistoryView}
          onViewChange={fetchLoginHistory}
          onClose={() => setShowLoginHistory(false)}
        />
      )}

      {/* ── Trusted devices modal ───────────────────────────────────────── */}
      {showTrustedDevices && (
        <TrustedDevicesModal
          devices={trustedDeviceRows}
          loading={trustedDevicesLoading}
          revokingId={revokingDeviceId}
          onRevoke={revokeTrustedDevice}
          onRevokeAll={revokeAllTrustedDevices}
          onClose={() => setShowTrustedDevices(false)}
        />
      )}

      <EditRoleModal team={team} />

      {/* ── 2FA modal ─────────────────────────────────────────────────────── */}
      <TwoFactorFlow twoFactor={twoFactor} />
    </div>
  );
}
