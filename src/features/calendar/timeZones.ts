// Timezones for the meeting/event modals' picker, and converting a date +
// time typed "in zone X" to an exact instant (and back).
//
// The browser knows every IANA zone and its offset on any date (DST
// included), so nothing here hard-codes offsets.

export interface TimeZoneOption {
    /** IANA name as this browser spells it — what we send and compare */
    value: string;
    /** "(GMT+5:45) Asia/Kathmandu" */
    label: string;
    /** Minutes ahead of UTC right now, for sorting */
    offsetMinutes: number;
    /** Lower-case text to match against: name, city with spaces, offset */
    search: string;
}

// Some engines still return pre-rename IANA names; show today's spelling.
const MODERN_NAMES: Record<string, string> = {
    'Asia/Katmandu': 'Asia/Kathmandu',
    'Asia/Calcutta': 'Asia/Kolkata',
    'Asia/Saigon': 'Asia/Ho_Chi_Minh',
    'Asia/Rangoon': 'Asia/Yangon',
    'Europe/Kiev': 'Europe/Kyiv',
    'America/Buenos_Aires': 'America/Argentina/Buenos_Aires',
    'Pacific/Truk': 'Pacific/Chuuk',
    'Pacific/Ponape': 'Pacific/Pohnpei',
};

/**
 * A stored zone as this browser spells it ("Asia/Kathmandu" → "Asia/Katmandu"
 * where the engine still uses the old name), so it matches the picker's list
 * and the viewer's own zone. Null for a zone this browser doesn't know.
 */
export function browserZoneName(zone: string): string | null {
    try {
        return new Intl.DateTimeFormat('en-US', { timeZone: zone }).resolvedOptions().timeZone;
    } catch {
        return null;
    }
}

/** The zone's name as people know it today ("Asia/Katmandu" → "Asia/Kathmandu"). */
export function displayZoneName(zone: string): string {
    return (MODERN_NAMES[zone] ?? zone).replace(/_/g, ' ');
}

function parts(date: Date, timeZone: string) {
    return Object.fromEntries(
        new Intl.DateTimeFormat('en-US', {
            timeZone,
            hourCycle: 'h23',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        })
            .formatToParts(date)
            .map(part => [part.type, part.value])
    );
}

/** Minutes `timeZone` is ahead of UTC at `date` (Kathmandu +345, New York −300/−240). */
export function zoneOffsetMinutes(timeZone: string, date: Date = new Date()): number {
    const p = parts(date, timeZone);
    const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
    return Math.round((asUtc - date.getTime()) / 60000);
}

/** "GMT+5:45", "GMT-5", "GMT+0" */
export function formatOffset(minutes: number): string {
    const sign = minutes < 0 ? '-' : '+';
    const abs = Math.abs(minutes);
    const hours = Math.floor(abs / 60);
    const mins = abs % 60;
    return `GMT${sign}${hours}${mins ? `:${String(mins).padStart(2, '0')}` : ''}`;
}

/** "2026-11-28" + "10:00" read as wall-clock time in `timeZone` → ISO instant. */
export function zonedToInstant(date: string, time: string, timeZone: string): string {
    const [y, m, d] = date.split('-').map(Number);
    const [hh, mm] = time.split(':').map(Number);
    const guess = Date.UTC(y, m - 1, d, hh, mm);
    // Two passes settle the offset when the zone changes it that day (DST)
    let result = guess - zoneOffsetMinutes(timeZone, new Date(guess)) * 60000;
    result = guess - zoneOffsetMinutes(timeZone, new Date(result)) * 60000;
    return new Date(result).toISOString();
}

/** An ISO instant as the date ("YYYY-MM-DD") and time ("HH:mm") it is in `timeZone`. */
export function instantInZone(iso: string, timeZone: string): { date: string; time: string } {
    const p = parts(new Date(iso), timeZone);
    return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}` };
}

let cached: { key: string; options: TimeZoneOption[] } | null = null;

/**
 * Every zone this browser knows, plus UTC and `include` (the viewer's own zone,
 * and a stored one that may be spelled differently), sorted by current offset
 * then name.
 */
export function timeZoneOptions(include: string[] = []): TimeZoneOption[] {
    const key = `${new Date().toDateString()}|${include.join(',')}`; // offsets move with DST
    if (cached?.key === key) return cached.options;

    const zones = new Set<string>(Intl.supportedValuesOf('timeZone'));
    zones.add('UTC');
    include.forEach(zone => zones.add(zone));

    const now = new Date();
    const options = [...zones].map(value => {
        const offsetMinutes = zoneOffsetMinutes(value, now);
        const offset = formatOffset(offsetMinutes);
        const name = displayZoneName(value);
        return {
            value,
            label: `(${offset}) ${name}`,
            offsetMinutes,
            search: `${name} ${value} ${offset} ${offset.replace('GMT', 'UTC')}`.toLowerCase(),
        };
    });
    options.sort((a, b) => a.offsetMinutes - b.offsetMinutes || a.label.localeCompare(b.label));

    cached = { key, options };
    return options;
}
