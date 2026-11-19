'use client';
import Link from 'next/link';
import { LEARNING_URL } from '@/config/env';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
//redux
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { BSRealtyAvatar } from '@bsrealtyllc/design-system';
import { setSidebarOpen } from '@/store/slices/sidebarSlice'
import { useEffect, useRef, useState } from 'react';

import { canAccessRoute } from '@/lib/permissions';

interface NavItem {
  href: string;
  label: string;
  icon: string;
  external?: boolean;
}


const allNav: { section: string; items: NavItem[] }[] = [
  {
    section: 'Overview',
    items: [
      { href: '/', label: 'Dashboard', icon: 'dashboard.svg' },
    ],
  },
  {
    section: 'People',
    items: [
      { href: '/employees', label: 'Team Directory', icon: 'user-02.svg' },
      { href: '/org-chart', label: 'Org Chart', icon: 'users.svg' },
      { href: '/active', label: 'Active Employees', icon: 'shield.svg' },
      { href: '/tracker', label: 'Time Tracker', icon: 'clock.svg' },
      { href: '/onboarding', label: 'Onboarding', icon: 'user-plus-02.svg' },
      { href: '/onboard-form-layout', label: 'Change Form Layout', icon: 'edit.svg' },
      { href: '/leaves', label: 'Leave Requests', icon: 'calendar.svg' },
      { href: '/overtime', label: 'Overtime Requests', icon: 'clock-01.svg' },
      { href: '/documents', label: 'Documents & Signature', icon: 'document.svg' },
      { href: '/resources', label: 'Resources', icon: 'book-open.svg' },
      { href: '/standups', label: 'Standups', icon: 'message-square-01.svg' },
    ],
  },
  {
    section: 'Finance',
    items: [
      { href: '/payroll', label: 'Payroll & Taxes', icon: 'dollar.svg' },
    ],
  },
  {
    section: 'Work',
    items: [
      { href: '/projects', label: 'Projects', icon: 'briefcase-02.svg' },
      { href: '/servers', label: 'Services & Access', icon: 'server-01.svg' },
      { href: '/calendar', label: 'Calendar', icon: 'calendar.svg' },
    ],
  },
  {
    section: 'Growth',
    items: [
      { href: '/goals', label: 'Goals & KPIs', icon: 'si_target-line.svg' },
      { href: '/performance', label: 'Performance', icon: 'trend-up.svg' },
      { href: '/feedback', label: 'Feedback', icon: 'message-circle-02.svg' },
    ],
  },
  {
    section: 'Culture',
    items: [
      { href: '/culture', label: 'Events & Milestones', icon: 'award-03.svg' },
    ],
  },
  {
    section: 'Communication',
    items: [
      { href: '/inbox', label: 'Inbox', icon: 'inbox.svg' },
    ],
  },
  {
    section: 'Learning',
    items: [
      { href: LEARNING_URL, label: 'Learning', icon: 'layout-down.svg', external: true },
    ],
  },
  {
    section: 'Reports',
    items: [
      { href: '/reports', label: 'Monthly Reports', icon: 'bar.svg' },
      { href: '/weekly-reports', label: 'Weekly Reports', icon: 'poll.svg' },
      { href: '/leave-report', label: 'Leave Report', icon: 'clipboard.svg' },
      { href: '/financial-report', label: 'Financial Report', icon: 'pie-chart-01.svg' },
      { href: '/performance-report', label: 'Performance Reports', icon: 'list-checks.svg' }
    ],
  },
  {
    section: 'Account',
    items: [
      { href: '/profile', label: 'My Profile', icon: 'user.svg' },
    ],
  },
];

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const isOpen = useAppSelector((state) => state.sidebar.isOpen);
  const dispatch = useAppDispatch();

  const [showProfileToogle, setShowProfileToogle] = useState(false);

  const profileMenuRef = useRef<HTMLDivElement>(null);

  // For profile menu
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target as Node)
      ) {
        setShowProfileToogle(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);


  const nav = allNav
    .map(group => ({
      ...group,
      // External links (Learning) are open to every role; internal ones follow ROUTE_ROLES.
      items: group.items.filter(item => item.href && (item.external || canAccessRoute(user, item.href))),
    }))
    .filter(group => group.items.length > 0);

  // function handleLogout() {
  //   logout();
  //   router.replace('/login');
  // }

  // No-op on desktop (the sidebar isn't off-canvas there); closes the mobile drawer.
  function closeMobileSidebar() {
    dispatch(setSidebarOpen(false));
  }

  return (
    <>
      <div
        className={`sidebar-backdrop ${isOpen ? 'sidebar-open' : ''}`}
        onClick={closeMobileSidebar}
        aria-hidden="true"
      />
      <aside className={`sidebar ${isOpen ? 'sidebar-open' : ''}`}>
        <div className='sidebar-wrapper'>
          <div className="sidebar-contant">

            <div className='py-5 '>
              <img height={'20px'} width={'111px'} src="/logos/gitgi-hr-logo.svg" alt="" />
            </div>

            <nav className=" sidebar-nav overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {nav.map(group => (
                <div className='sidebar-section' key={group.section}>
                  <div className="sidebar-section-label">{group.section}</div>
                  {group.items.map(item => {
                    const iconStyle = {
                      WebkitMaskImage: `url(/icons/${item.icon})`,
                      maskImage: `url(/icons/${item.icon})`,
                    };
                    return item.external ? (
                      <a
                        key={item.href}
                        href={item.href}
                        target="_blank"
                        rel="noreferrer"
                        className="sidebar-link"
                        onClick={closeMobileSidebar}
                      >
                        <span className="icon" style={iconStyle} />
                        {item.label}
                        <span className="sidebar-link-external">↗</span>
                      </a>
                    ) : (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`sidebar-link ${pathname === item.href ? 'active' : ''}`}
                        onClick={closeMobileSidebar}
                      >
                        <span className="icon" style={iconStyle} />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              ))}
            </nav>
          </div>
        </div>

        <div className="relative py-3 px-6 border-t border-(--gray-light-hover)" ref={profileMenuRef}>
          <div
            className={`sidebar-profile cursor-pointer overflow-visible ${showProfileToogle
              ? 'bg-(--blue-sky-light)'
              : 'hover:bg-(--blue-sky-light)'
              }`}
            onClick={() => setShowProfileToogle(prev => !prev)}
          >

            <BSRealtyAvatar size='md' name={user ? initials(user.name) : '?'} />
            <div className="flex flex-col min-w-0 w-full">
              <div className='flex  items-center justify-between'>
                <span className="text-[14px] font-medium leading-5 text-(--neutral-normal) truncate">{user?.name ?? ''}</span>
                <span
                  className="border inline-block h-4 w-4 bg-(--neutral-dark)"
                  style={{
                    WebkitMaskImage: 'url(/icons/chevron-right.svg)',
                    maskImage: 'url(/icons/chevron-right.svg)',
                    WebkitMaskRepeat: 'no-repeat',
                    maskRepeat: 'no-repeat',
                    WebkitMaskPosition: 'center',
                    maskPosition: 'center',
                    WebkitMaskSize: 'contain',
                    maskSize: 'contain',
                  }}
                />
              </div>
              <span className="text-[12px] font-normal text-(--gray-normal-active) truncate">{user?.email ?? ''}</span>
            </div>


          </div>
          {
            showProfileToogle && (
              <>
                <div className=" w-[230px] absolute flex flex-col justify-end py-3 px-2 rounded-lg gap-2 left-4 bottom-24  bg-(--soft-white-light) shadow-(--shadow-sm) z-50 overflow-hidden " >
                  <div className={`flex items-center p-2 gap-2 cursor-pointer rounded-lg  $
                  ? 'bg-(--blue-sky-light)'
                  : 'hover:bg-(--blue-sky-light)'
                  }`}
                  >
                    <BSRealtyAvatar size='sm' name={user ? initials(user.name) : '?'} />

                    <div className="flex min-w-0 flex-col">
                      <span className="text-[14px] font-medium leading-5 text-(--neutral-normal) truncate">{user?.name ?? ''}</span>
                      <span className="sidebar-profile-email truncate">{user?.email ?? ''}</span>
                    </div>
                    <span
                      className="inline-block h-4 w-4 bg-(--neutral-dark)"
                      style={{
                        WebkitMaskImage: 'url(/icons/chevron-right.svg)',
                        maskImage: 'url(/icons/chevron-right.svg)',
                        WebkitMaskRepeat: 'no-repeat',
                        maskRepeat: 'no-repeat',
                        WebkitMaskPosition: 'center',
                        maskPosition: 'center',
                        WebkitMaskSize: 'contain',
                        maskSize: 'contain',
                      }}
                    />
                  </div>
                  {/* divider */}
                  <div className='border-b w-[90%] mx-auto border-(--soft-white-normal-active)'></div>

                  <div className="flex flex-col gap-2">
                    <div className={`flex items-center py-2 px-3 gap-1 rounded-lg text-[14px] font-medium text-(--neutral-normal) cursor-pointer ${pathname === '/profile'
                      ? 'bg-(--blue-sky-light)'
                      : 'hover:bg-(--blue-sky-light)'
                      }`}
                      onClick={() => {
                        setShowProfileToogle(false);
                        router.push('/profile');
                      }} title="Profile">
                      <span
                        className="inline-block h-[18px] w-[18px] bg-(--neutral-dark)"
                        style={{
                          WebkitMaskImage: 'url(/icons/user.svg)',
                          maskImage: 'url(/icons/user.svg)',
                          WebkitMaskRepeat: 'no-repeat',
                          maskRepeat: 'no-repeat',
                          WebkitMaskPosition: 'center',
                          maskPosition: 'center',
                          WebkitMaskSize: 'contain',
                          maskSize: 'contain',
                        }}
                      />
                      <span>Profile</span>
                    </div>
                    <div className={`flex items-center py-2 px-3 gap-1 rounded-lg text-[14px] font-medium text-(--neutral-normal) cursor-pointer ${pathname === '/settings'
                      ? 'bg-(--blue-sky-light)'
                      : 'hover:bg-(--blue-sky-light)'
                      }`}
                      onClick={() => {
                        setShowProfileToogle(false);
                        router.push('/settings');
                      }} title="Settings">
                      <span
                        className="inline-block h-[18px] w-[18px] bg-(--neutral-dark)"
                        style={{
                          WebkitMaskImage: 'url(/icons/settings.svg)',
                          maskImage: 'url(/icons/settings.svg)',
                          WebkitMaskRepeat: 'no-repeat',
                          maskRepeat: 'no-repeat',
                          WebkitMaskPosition: 'center',
                          maskPosition: 'center',
                          WebkitMaskSize: 'contain',
                          maskSize: 'contain',
                        }}
                      />
                      <span>Setting</span>
                    </div>
                    <div className={`flex items-center py-2 px-3 gap-1 rounded-lg text-[14px] font-medium text-(--neutral-normal) cursor-pointer ${pathname === '/updates'
                      ? 'bg-(--blue-sky-light)'
                      : 'hover:bg-(--blue-sky-light)'
                      }`}
                      onClick={() => {
                        setShowProfileToogle(false);
                        router.push('/updates');
                      }} title="Updates">
                      <span
                        className="inline-block h-[18px] w-[18px] bg-(--neutral-dark)"
                        style={{
                          WebkitMaskImage: 'url(/icons/info-circle.svg)',
                          maskImage: 'url(/icons/info-circle.svg)',
                          WebkitMaskRepeat: 'no-repeat',
                          maskRepeat: 'no-repeat',
                          WebkitMaskPosition: 'center',
                          maskPosition: 'center',
                          WebkitMaskSize: 'contain',
                          maskSize: 'contain',
                        }}
                      />
                      <span>Updates</span>
                    </div>

                    {/* divider */}
                    <div className='border-b w-[90%] mx-auto border-(--soft-white-normal-active)'></div>

                    <div className="flex items-center py-2 px-3 gap-1 rounded-lg hover:bg-(--error-light) cursor-pointer" onClick={() => router.push('/logout')} title="Sign out">
                      <button className="flex items-center gap-1 text-[14px] font-medium text-(--error-normal) " >
                        <span
                          className="inline-block h-[18px] w-[18px] "
                          style={{
                            WebkitMaskImage: 'url(/icons/log-out.svg)',
                            maskImage: 'url(/icons/log-out.svg)',
                            WebkitMaskRepeat: 'no-repeat',
                            maskRepeat: 'no-repeat',
                            WebkitMaskPosition: 'center',
                            maskPosition: 'center',
                            WebkitMaskSize: 'contain',
                            maskSize: 'contain',
                            background: 'currentColor'
                          }}
                        />
                        <span>Logout</span>
                      </button>
                    </div>
                  </div>

                </div>


              </>
            )
          }
        </div>

      </aside>
    </>
  );
}
