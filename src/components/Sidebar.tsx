'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const nav = [
  {
    section: 'Overview',
    items: [
      { href: '/', label: 'Dashboard', icon: '▣' },
    ],
  },
  {
    section: 'People',
    items: [
      { href: '/employees', label: 'Employees', icon: '◎' },
      { href: '/leaves', label: 'Leave Requests', icon: '◷' },
      { href: '/standups', label: 'Standups', icon: '◈' },
    ],
  },
  {
    section: 'Work',
    items: [
      { href: '/projects', label: 'Projects', icon: '◉' },
      { href: '/servers', label: 'Servers & Envs', icon: '◫' },
      { href: '/calendar', label: 'Calendar', icon: '◻' },
    ],
  },
  {
    section: 'Culture',
    items: [
      { href: '/culture', label: 'Events & Milestones', icon: '✦' },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();

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
      <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', lineHeight: 1.5 }}>
          HR Platform v1.0
        </p>
      </div>
    </aside>
  );
}
