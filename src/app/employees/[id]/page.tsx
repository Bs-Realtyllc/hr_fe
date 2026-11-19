import EmployeeProfileClient from './EmployeeProfileClient';
import { API_URL } from '@/config/env';

export async function generateStaticParams() {
  try {
    const res = await fetch(`${API_URL}/employees`);
    if (!res.ok) return [{ id: '0' }];
    const employees: { id: number }[] = await res.json();
    return employees.length > 0 ? employees.map(e => ({ id: String(e.id) })) : [{ id: '0' }];
  } catch {
    return [{ id: '0' }];
  }
}

export default function Page() {
  return <EmployeeProfileClient />;
}
