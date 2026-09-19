import EmployeeProfileClient from './EmployeeProfileClient';

export async function generateStaticParams() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:6002/api';
  try {
    const res = await fetch(`${apiUrl}/employees`);
    if (!res.ok) return [];
    const employees: { id: number }[] = await res.json();
    return employees.map(e => ({ id: String(e.id) }));
  } catch {
    return [];
  }
}

export default function Page() {
  return <EmployeeProfileClient />;
}
