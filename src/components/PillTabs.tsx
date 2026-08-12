interface PillOption {
  value: string;
  label: string;
}

interface PillTabsProps {
  options: PillOption[];
  value: string;
  onChange: (value: string) => void;
}

/**
 * Filter/tab pill group matching the Figma "Category" pill component
 * (Job Portal design, node 357:3131).
 */
export default function PillTabs({ options, value, onChange }: PillTabsProps) {
  return (
    <div className="pill-group">
      {options.map(opt => (
        <button
          key={opt.value}
          type="button"
          className={`pill ${value === opt.value ? 'pill-active' : ''}`}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
