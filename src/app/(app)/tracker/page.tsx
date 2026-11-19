'use client';

import LiveTracker from './_components/LiveTracker';
import AttendanceHistory from './_components/AttendanceHistory';

export default function TrackerPage() {
  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Tracker</h1>
          <p>Clock in, take breaks, and see your attendance history.</p>
        </div>
      </div>

      <LiveTracker />

      <div style={{ marginTop: 24 }}>
        <AttendanceHistory />
      </div>
    </div>
  );
}
