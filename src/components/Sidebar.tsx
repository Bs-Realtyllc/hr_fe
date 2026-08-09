'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

type Role = 'admin' | 'lead' | 'employee';

interface NavItem {
  href: string;
  label: string;
  icon: string;
  roles: Role[];
  external?: boolean;
}

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

const LEARNING_URL = process.env.NEXT_PUBLIC_LEARNING_URL ?? '';

const allNav: { section: string; items: NavItem[] }[] = [
  {
    section: 'Overview',
    items: [
      { href: '/', label: 'Dashboard', icon: '▣', roles: ['admin', 'lead', 'employee'] as Role[] },
    ],
  },
  {
    section: 'People',
    items: [
      { href: '/employees', label: 'Team Directory', icon: '◎', roles: ['admin', 'lead'] as Role[] },
      { href: '/leaves', label: 'Leave Requests', icon: '◷', roles: ['admin', 'lead', 'employee'] as Role[] },
      { href: '/overtime', label: 'Overtime Requests', icon: '⏱', roles: ['admin', 'lead', 'employee'] as Role[] },
      { href: '/leave-policy', label: 'Leave Policy', icon: '◈', roles: ['admin', 'lead', 'employee'] as Role[] },
      { href: '/standups', label: 'Standups', icon: '◈', roles: ['admin', 'lead', 'employee'] as Role[] },
    ],
  },
  {
    section: 'Finance',
    items: [
      { href: '/payroll', label: 'Payroll & Taxes', icon: '◈', roles: ['admin'] as Role[] },
    ],
  },
  {
    section: 'Work',
    items: [
      { href: '/projects', label: 'Projects', icon: '◉', roles: ['admin', 'lead'] as Role[] },
      { href: '/servers', label: 'Services & Access', icon: '◫', roles: ['admin', 'lead', 'employee'] as Role[] },
      { href: '/calendar', label: 'Calendar', icon: '◻', roles: ['admin', 'lead', 'employee'] as Role[] },
    ],
  },
  {
    section: 'Growth',
    items: [
      { href: '/goals', label: 'Goals & KPIs', icon: '◎', roles: ['admin', 'lead', 'employee'] as Role[] },
      { href: '/performance', label: 'Performance', icon: '◈', roles: ['admin', 'lead', 'employee'] as Role[] },
      { href: '/feedback', label: 'Feedback', icon: '✦', roles: ['admin', 'lead', 'employee'] as Role[] },
    ],
  },
  {
    section: 'Culture',
    items: [
      { href: '/culture', label: 'Events & Milestones', icon: '✦', roles: ['admin', 'lead', 'employee'] as Role[] },
    ],
  },
  {
    section: 'Learning',
    items: [
      { href: LEARNING_URL, label: 'Learning', icon: '▤', roles: ['admin', 'lead', 'employee'] as Role[], external: true },
    ],
  },
  {
    section: 'Reports',
    items: [
      { href: '/reports', label: 'Monthly Reports', icon: '◧', roles: ['admin', 'lead', 'employee'] as Role[] },
      { href: '/weekly-reports', label: 'Weekly Reports', icon: '▨', roles: ['admin', 'lead', 'employee'] as Role[] },
      { href: '/leave-report', label: 'Leave Report', icon: '⌗', roles: ['admin'] as Role[] },
      { href: '/financial-report', label: 'Financial Report', icon: '◈', roles: ['admin'] as Role[] },
    ],
  },
  {
    section: 'Account',
    items: [
      { href: '/profile', label: 'My Profile', icon: '◑', roles: ['admin', 'lead', 'employee'] as Role[] },
    ],
  },
];

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

export default function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

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

  return (
    <aside className={`sidebar${isOpen ? ' sidebar-mobile-open' : ''}`}>
      {/* Mobile-only: close button in top-right of sidebar */}
      <div className="sidebar-mobile-close">
        <button onClick={onClose} aria-label="Close navigation menu">✕</button>
      </div>

      {/* Logo / brand */}
      <div className="sidebar-logo" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <img src="/logos/hr-platform.svg" alt="" width={30} height={30} style={{ flexShrink: 0 }} />
        <div>
          <h1>HR Platform</h1>
          <span>Internal Tools</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {nav.map(group => (
          <div key={group.section}>
            <div className="sidebar-section-label">{group.section}</div>
            {group.items.map(item =>
              item.external ? (
                <a
                  key={item.href}
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  className="sidebar-link"
                  onClick={onClose}
                >
                  <span className="icon">{item.icon}</span>
                  {item.label}
                  <span className="sidebar-link-external">↗</span>
                </a>
              ) : (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`sidebar-link ${pathname === item.href ? 'active' : ''}`}
                  onClick={onClose}
                >
                  <span className="icon">{item.icon}</span>
                  {item.label}
                </Link>
              )
            )}
          </div>
        ))}
      </nav>

      {/* Profile / logout footer */}
      <div className="sidebar-profile">
        <div className="sidebar-profile-avatar">
          {user ? initials(user.name) : '?'}
        </div>
        <div className="sidebar-profile-info">
          <div className="sidebar-profile-name">{user?.name ?? ''}</div>
          <div className="sidebar-profile-role">{user?.role ?? ''}</div>
        </div>
        <button className="sidebar-logout-btn" onClick={handleLogout} title="Sign out">
          ⏻
        </button>
      </div>
    </aside>
  );
}
