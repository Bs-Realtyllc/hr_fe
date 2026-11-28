import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { Employee } from './types';

// GET /employees, loaded once per page visit and shared by everything on the
// calendar that needs names/photos for attendee emails.
let cache: Promise<Employee[]> | null = null;

function loadEmployees() {
    cache ??= api
        .get<Employee[]>('/employees')
        .then(list => (Array.isArray(list) ? list : []))
        .catch(error => {
            cache = null; // allow a retry next time
            throw error;
        });
    return cache;
}

export function useEmployeeDirectory() {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        let active = true;
        loadEmployees()
            .then(list => active && setEmployees(list))
            .catch(loadError => {
                console.error('Failed to fetch employees:', loadError);
                if (active) setError('Unable to load employees.');
            })
            .finally(() => active && setLoading(false));
        return () => {
            active = false;
        };
    }, []);

    return { employees, loading, error };
}
