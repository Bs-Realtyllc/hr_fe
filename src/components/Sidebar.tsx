'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
//redux
import { useAppSelector, useAppDispatch } from '@/store/hook';
import { setSidebarOpen } from '@/store/sidebarSlice'

import { roleRoutes, Role } from '@/lib/permissions';

interface NavItem {
  href: string;
  label: string;
  icon: string;
  external?: boolean;
}

const LEARNING_URL = process.env.NEXT_PUBLIC_LEARNING_URL ?? '';

const allNav: { section: string; items: NavItem[] }[] = [
  {
    section: 'Overview',
    items: [
      { href: '/', label: 'Dashboard', icon: 'grid.svg' },
    ],
  },
  {
    section: 'People',
    items: [
      { href: '/employees', label: 'Team Directory', icon: 'users.svg' },
      { href: '/leaves', label: 'Leave Requests', icon: 'calendar.svg' },
      { href: '/overtime', label: 'Overtime Requests', icon: 'clock.svg' },
      { href: '/documents', label: 'Documents & Signature', icon: 'file-text.svg' },
      { href: '/resources', label: 'Resources', icon: 'book-open.svg' },
      { href: '/standups', label: 'Standups', icon: 'message-square.svg' },
    ],
  },
  {
    section: 'Finance',
    items: [
      { href: '/payroll', label: 'Payroll & Taxes', icon: 'dollar-sign.svg' },
    ],
  },
  {
    section: 'Work',
    items: [
      { href: '/projects', label: 'Projects', icon: 'briefcase.svg' },
      { href: '/servers', label: 'Services & Access', icon: 'server.svg' },
      { href: '/calendar', label: 'Calendar', icon: 'calendar.svg' },
    ],
  },
  {
    section: 'Growth',
    items: [
      { href: '/goals', label: 'Goals & KPIs', icon: 'target.svg' },
      { href: '/performance', label: 'Performance', icon: 'trending-up.svg' },
      { href: '/feedback', label: 'Feedback', icon: 'message-circle.svg' },
    ],
  },
  {
    section: 'Culture',
    items: [
      { href: '/culture', label: 'Events & Milestones', icon: 'award.svg' },
    ],
  },
  {
    section: 'Learning',
    items: [
      { href: LEARNING_URL, label: 'Learning', icon: 'book.svg', external: true },
    ],
  },
  {
    section: 'Reports',
    items: [
      { href: '/reports', label: 'Monthly Reports', icon: 'bar-chart.svg' },
      { href: '/weekly-reports', label: 'Weekly Reports', icon: 'bar-chart-2.svg' },
      { href: '/leave-report', label: 'Leave Report', icon: 'clipboard.svg' },
      { href: '/financial-report', label: 'Financial Report', icon: 'pie-chart.svg' },
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

  const role: Role = (user?.role as Role) ?? 'employee';
  const allowedRoutes = roleRoutes[role as keyof typeof roleRoutes] || roleRoutes['employee'];

  const nav = allNav
    .map(group => ({
      ...group,
      items: group.items.filter(item => item.href && allowedRoutes.includes(item.href)),
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
