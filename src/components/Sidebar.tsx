'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
//redux
import { useAppSelector, useAppDispatch } from '@/store/hook';
import { setSidebarOpen } from '@/store/sidebarSlice'

type Role = 'admin' | 'lead' | 'employee';

interface NavItem {
  href: string;
  label: string;
  icon: string;
  roles: Role[];
  external?: boolean;
}

const LEARNING_URL = process.env.NEXT_PUBLIC_LEARNING_URL ?? '';

const allNav: { section: string; items: NavItem[] }[] = [
  {
    section: 'Overview',
    items: [
      { href: '/', label: 'Dashboard', icon: 'grid.svg', roles: ['admin', 'lead', 'employee'] as Role[] },
    ],
  },
  {
    section: 'People',
    items: [
      { href: '/employees', label: 'Team Directory', icon: 'users.svg', roles: ['admin', 'lead'] as Role[] },
      { href: '/onboarding', label: 'Onboarding', icon: 'add_people.svg', roles: ['admin', 'lead'] as Role[] },
      { href: '/onboard-form-layout', label: 'Change Form Layout', icon: 'edit.svg', roles: ['admin', 'lead'] as Role[] },
      { href: '/leaves', label: 'Leave Requests', icon: 'calendar.svg', roles: ['admin', 'lead', 'employee'] as Role[] },
      { href: '/overtime', label: 'Overtime Requests', icon: 'clock.svg', roles: ['admin', 'lead', 'employee'] as Role[] },
      { href: '/documents', label: 'Documents & Signature', icon: 'file-text.svg', roles: ['admin', 'lead', 'employee'] as Role[] },
      { href: '/resources', label: 'Resources', icon: 'book-open.svg', roles: ['admin', 'lead', 'employee'] as Role[] },
      { href: '/standups', label: 'Standups', icon: 'message-square.svg', roles: ['admin', 'lead', 'employee'] as Role[] },
    ],
  },
  {
    section: 'Finance',
    items: [
      { href: '/payroll', label: 'Payroll & Taxes', icon: 'dollar-sign.svg', roles: ['admin'] as Role[] },
    ],
  },
  {
    section: 'Work',
    items: [
      { href: '/projects', label: 'Projects', icon: 'briefcase.svg', roles: ['admin', 'lead'] as Role[] },
      { href: '/servers', label: 'Services & Access', icon: 'server.svg', roles: ['admin', 'lead', 'employee'] as Role[] },
      { href: '/calendar', label: 'Calendar', icon: 'calendar.svg', roles: ['admin', 'lead', 'employee'] as Role[] },
    ],
  },
  {
    section: 'Growth',
    items: [
      { href: '/goals', label: 'Goals & KPIs', icon: 'target.svg', roles: ['admin', 'lead', 'employee'] as Role[] },
      { href: '/performance', label: 'Performance', icon: 'trending-up.svg', roles: ['admin', 'lead', 'employee'] as Role[] },
      { href: '/feedback', label: 'Feedback', icon: 'message-circle.svg', roles: ['admin', 'lead', 'employee'] as Role[] },
    ],
  },
  {
    section: 'Culture',
    items: [
      { href: '/culture', label: 'Events & Milestones', icon: 'award.svg', roles: ['admin', 'lead', 'employee'] as Role[] },
    ],
  },
  {
    section: 'Learning',
    items: [
      { href: LEARNING_URL, label: 'Learning', icon: 'book.svg', roles: ['admin', 'lead', 'employee'] as Role[], external: true },
    ],
  },
  {
    section: 'Reports',
    items: [
      { href: '/reports', label: 'Monthly Reports', icon: 'bar-chart.svg', roles: ['admin', 'lead', 'employee'] as Role[] },
      { href: '/weekly-reports', label: 'Weekly Reports', icon: 'bar-chart-2.svg', roles: ['admin', 'lead', 'employee'] as Role[] },
      { href: '/leave-report', label: 'Leave Report', icon: 'clipboard.svg', roles: ['admin'] as Role[] },
      { href: '/financial-report', label: 'Financial Report', icon: 'pie-chart.svg', roles: ['admin'] as Role[] },
      { href: '/performance-report', label: 'Performance Reports', icon: 'task.svg', roles: ['admin', 'lead', 'employee'] as Role[] }
    ],
  },
  {
    section: 'Account',
    items: [
      { href: '/profile', label: 'My Profile', icon: 'user.svg', roles: ['admin', 'lead', 'employee'] as Role[] },
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


  //Sidebartoogle State:
  const role: Role = user?.role ?? 'employee';

  const nav = allNav
    .map(group => ({
      ...group,
      items: group.items.filter(item => item.roles.includes(role) && item.href),
    }))
    .filter(group => group.items.length > 0);

  function handleLogout() {
    logout();
    router.replace('/login');
  }

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
        <div className="sidebar-logo" style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <img src="/logos/hr-platform.svg" alt="" width={30} height={30} style={{ flexShrink: 0 }} />
          <div>
            <h1>HR Platform</h1>
            <span>Internal Tools</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {nav.map(group => (
            <div key={group.section}>
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

        <div className="sidebar-profile">
          <div className="sidebar-profile-avatar">
            {user ? initials(user.name) : '?'}
          </div>
          <div className="sidebar-profile-info">
            <div className="sidebar-profile-name">{user?.name ?? ''}</div>
            <div className="sidebar-profile-role">{user?.role ?? ''}</div>
          </div>
          <button className="sidebar-logout-btn" onClick={handleLogout} title="Sign out">
            <span
              className="icon"
              style={{ WebkitMaskImage: 'url(/icons/log-out.svg)', maskImage: 'url(/icons/log-out.svg)' }}
            />
          </button>
        </div>
      </aside>
    </>
  );
}
