'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface CalEvent {
  date: string;
  label: string;
  type: 'leave' | 'event' | 'milestone';
  sub?: string;
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

const typeColor: Record<string, string> = {
  leave: 'var(--color-warning)',
  event: 'var(--color-accent)',
  milestone: 'var(--color-error)',
};

export default function CalendarPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    const calEvents: CalEvent[] = [];

    Promise.all([
      api.get<{ employee_name: string; start_date: string; end_date: string; leave_type: string }[]>('/leaves?status=approved').catch(() => []),
      api.get<{ event_date: string; title: string; event_type: string }[]>('/events').catch(() => []),
    ]).then(([leaves, evts]) => {
      // Expand multi-day leaves
      for (const l of leaves) {
        const s = new Date(l.start_date);
        const e = new Date(l.end_date);
        for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
          calEvents.push({
            date: d.toISOString().split('T')[0],
            label: l.employee_name,
            type: 'leave',
            sub: l.leave_type,
          });
        }
      }
      for (const ev of evts) {
        calEvents.push({
          date: ev.event_date.split('T')[0],
          label: ev.title,
          type: 'event',
          sub: ev.event_type,
        });
      }
      setEvents(calEvents);
    });
  }, []);

  const prevMonth = () => { if (month === 0) { setYear(y => y - 1); setMonth(11); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setYear(y => y + 1); setMonth(0); } else setMonth(m => m + 1); };

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const cells: (number | null)[] = [
    ...Array.from({ length: firstDay }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const todayStr = today.toISOString().split('T')[0];

  const eventsForDay = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.filter(e => e.date === dateStr);
  };

  const selectedDateEvents = selected ? events.filter(e => e.date === selected) : [];

  return (
    <div>
      <div className="page-header">
        <div className="flex justify-between items-center">
          <div>
            <h1>Company Calendar</h1>
            <p>Leaves, events, and milestones in one view</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="btn btn-ghost btn-sm" onClick={prevMonth}>← Prev</button>
            <span style={{ fontWeight: 700, fontSize: 16, minWidth: 160, textAlign: 'center' }}>
              {MONTHS[month]} {year}
            </span>
            <button className="btn btn-ghost btn-sm" onClick={nextMonth}>Next →</button>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 300px' : '1fr', gap: 16, alignItems: 'start' }}>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid var(--color-border)' }}>
            {DAYS.map(d => (
              <div key={d} style={{
                padding: '10px 0',
                textAlign: 'center',
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--color-text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}>{d}</div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
            {cells.map((day, i) => {
              if (!day) return <div key={`empty-${i}`} style={{ minHeight: 90, borderBottom: '1px solid var(--color-border)', borderRight: '1px solid var(--color-border)' }} />;
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const dayEvents = eventsForDay(day);
              const isToday = dateStr === todayStr;
              const isSelected = dateStr === selected;
              return (
                <div
                  key={day}
                  onClick={() => setSelected(isSelected ? null : dateStr)}
                  style={{
                    minHeight: 90,
                    padding: '8px',
                    borderBottom: '1px solid var(--color-border)',
                    borderRight: '1px solid var(--color-border)',
                    cursor: 'pointer',
                    background: isSelected ? 'var(--color-primary-light)' : isToday ? '#F0FFF4' : 'transparent',
                    transition: 'background 0.1s',
                  }}
                >
                  <div style={{
                    width: 26, height: 26, borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: isToday ? 700 : 400,
                    background: isToday ? 'var(--color-primary)' : 'transparent',
                    color: isToday ? '#fff' : 'var(--color-text-body)',
                    marginBottom: 4,
                  }}>{day}</div>
                  {dayEvents.slice(0, 2).map((ev, j) => (
                    <div key={j} style={{
                      fontSize: 10, fontWeight: 500,
                      background: typeColor[ev.type] + '22',
                      color: typeColor[ev.type],
                      borderRadius: 3, padding: '1px 5px',
                      marginBottom: 2, overflow: 'hidden',
                      textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>{ev.label}</div>
                  ))}
                  {dayEvents.length > 2 && (
                    <div style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>+{dayEvents.length - 2} more</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {selected && (
          <div className="card">
            <div className="card-title">
              {new Date(selected + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </div>
            {selectedDateEvents.length === 0
              ? <p className="text-muted text-sm">No events on this day</p>
              : selectedDateEvents.map((ev, i) => (
                <div key={i} className="mb-3" style={{ borderLeft: `3px solid ${typeColor[ev.type]}`, paddingLeft: 10 }}>
                  <div className="font-semibold text-sm">{ev.label}</div>
                  {ev.sub && <div className="text-muted" style={{ fontSize: 11, textTransform: 'capitalize' }}>{ev.sub.replace('_', ' ')}</div>}
                </div>
              ))
            }
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex gap-4 mt-4">
        {Object.entries(typeColor).map(([type, color]) => (
          <div key={type} className="flex items-center gap-2">
            <div style={{ width: 10, height: 10, borderRadius: 2, background: color }} />
            <span className="text-sm text-muted" style={{ textTransform: 'capitalize' }}>{type}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
