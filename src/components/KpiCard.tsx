interface KpiCardProps {
  label: string;
  value: string | number;
  trend?: { value: string; direction: 'up' | 'down' };
}

/**
 * KPI card matching the Figma "KPI Card" component (Job Portal design,
 * node 275:2159): label + menu icon header, large value, optional trend badge.
 */
export default function KpiCard({ label, value, trend }: KpiCardProps) {
  return (
    <div className="kpi-card">
      <div className="kpi-card-header">
        <span className="kpi-card-label">{label}</span>
        <button type="button" className="kpi-card-menu" aria-label="More options">
          <span
            className="icon-mask"
            style={{ WebkitMaskImage: 'url(/icons/more-horizontal.svg)', maskImage: 'url(/icons/more-horizontal.svg)' }}
          />
        </button>
      </div>
      <div className="kpi-card-body">
        <span className="kpi-card-value">{value}</span>
        {trend && (
          <span className={`kpi-card-trend kpi-card-trend-${trend.direction}`}>
            {trend.value}
            <span
              className="icon-mask"
              style={{
                WebkitMaskImage: `url(/icons/arrow-${trend.direction}.svg)`,
                maskImage: `url(/icons/arrow-${trend.direction}.svg)`,
              }}
            />
          </span>
        )}
      </div>
    </div>
  );
}
