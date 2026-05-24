'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

type Role = 'admin' | 'lead' | 'employee';

const allNav = [
  {
    section: 'Overview',
    items: [
      { href: '/', label: 'Dashboard', icon: '▣', roles: ['admin', 'lead', 'employee'] as Role[] },
    ],
  },
  {
    section: 'People',
    items: [
      { href: '/employees', label: 'Employees', icon: '◎', roles: ['admin', 'lead'] as Role[] },
      { href: '/leaves', label: 'Leave Requests', icon: '◷', roles: ['admin', 'lead', 'employee'] as Role[] },
      { href: '/standups', label: 'Standups', icon: '◈', roles: ['admin', 'lead', 'employee'] as Role[] },
    ],
  },
  {
    section: 'Finance',
    items: [
      { href: '/payroll', label: 'Payroll', icon: '◈', roles: ['admin'] as Role[] },
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
    section: 'Culture',
    items: [
      { href: '/culture', label: 'Events & Milestones', icon: '✦', roles: ['admin', 'lead', 'employee'] as Role[] },
    ],
  },
  {
    section: 'Reports',
    items: [
      { href: '/reports', label: 'Monthly Reports', icon: '◧', roles: ['admin', 'lead', 'employee'] as Role[] },
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

  const role: Role = user?.role ?? 'employee';

  const nav = allNav
    .map(group => ({
      ...group,
      items: group.items.filter(item => item.roles.includes(role)),
    }))
    .filter(group => group.items.length > 0);

  function handleLogout() {
    logout();
    router.replace('/login');
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <h1>HR Platform</h1>
        <span>Internal Tools</span>
      </div>

      <nav className="sidebar-nav">
        {nav.map(group => (
          <div key={group.section}>
            <div className="sidebar-section-label">{group.section}</div>
            {group.items.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className={`sidebar-link ${pathname === item.href ? 'active' : ''}`}
              >
                <span className="icon">{item.icon}</span>
                {item.label}
              </Link>
            ))}
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
          ⏻
        </button>
      </div>
    </aside>
  );
}
