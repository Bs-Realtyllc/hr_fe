// Shared device/IP/date formatting for the login-history and trusted-device
// modals — both render rows parsed from the same ip_address/user_agent shape.

// Turn the raw User-Agent into "Mobile Chrome on Android", "Edge on Windows", etc.
// Order matters: Edge and Opera also contain "Chrome", and Chrome contains "Safari".
export function parseDevice(ua: string): { label: string; mobile: boolean } {
    if (!ua) return { label: 'Unknown device', mobile: false };

    const browser =
        /Edg(A|iOS)?\//.test(ua) ? 'Edge' :
            /OPR\//.test(ua) ? 'Opera' :
                /(Firefox|FxiOS)\//.test(ua) ? 'Firefox' :
                    /(Chrome|CriOS)\//.test(ua) ? 'Chrome' :
                        /Safari\//.test(ua) ? 'Safari' :
                            /PostmanRuntime/.test(ua) ? 'Postman' : 'Unknown browser';

    const os =
        /Windows/.test(ua) ? 'Windows' :
            /Android/.test(ua) ? 'Android' :
                /iPhone|iPad|iPod/.test(ua) ? 'iOS' :
                    /Mac OS X/.test(ua) ? 'macOS' :
                        /Linux/.test(ua) ? 'Linux' : 'Unknown OS';

    const mobile = /Mobile|Android|iPhone|iPod/.test(ua);
    const prefix = mobile && browser !== 'Unknown browser' ? 'Mobile ' : '';

    return { label: `${prefix}${browser} on ${os}`, mobile };
}

// Make local/IPv6-mapped addresses readable.
export function displayIp(ip: string | null | undefined) {
    if (!ip) return '—';
    if (ip === '::1' || ip === '127.0.0.1' || ip === '::ffff:127.0.0.1') return 'Localhost';
    if (ip.startsWith('::ffff:')) return ip.slice(7);
    return ip;
}

// "15 Oct 2026, 16:36"
export function formatDate(value: string) {
    return new Date(value).toLocaleString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    });
}

export function PhoneIcon() {
    return (
        <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
            <rect x="7" y="2.5" width="10" height="19" rx="2" fill="currentColor" />
            <circle cx="12" cy="18" r="1" fill="#fff" />
        </svg>
    );
}

export function MonitorIcon() {
    return (
        <svg
            width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"
            stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
        >
            <rect x="3" y="4" width="18" height="12" rx="2" />
            <path d="M12 16v4M8 20h8" />
        </svg>
    );
}
