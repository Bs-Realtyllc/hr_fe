
'use client';

interface Tab {
    label: string;
    value: string;
}

interface TabsProps {
    tabs: Tab[];
    activeTab: string;
    onChange: (value: string) => void;
    className?: string;
}

export default function Tabs({
    tabs,
    activeTab,
    onChange,
    className = '',
}: TabsProps) {
    return (
        <div className={`flex items-center gap-3 overflow-x-auto whitespace-nowrap ${className}`}>
            {tabs.map((tab) => (
                <button
                    key={tab.value}
                    type="button"
                    onClick={() => onChange(tab.value)}
                    className={`shrink-0  p-1 text-[14px] font-semibold border-b-2 transition-colors ${activeTab === tab.value
                        ? 'text-[#3C4653] border-[#235E94]'
                        : 'text-[#5A687D] border-transparent hover:text-[#3C4653] hover:border-[#235E94]'
                        }`}
                >
                    {tab.label}
                </button>
            ))
            }
        </div >
    );
}
