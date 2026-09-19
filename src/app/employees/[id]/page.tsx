import EmployeeProfileClient from './EmployeeProfileClient';

export async function generateStaticParams() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL!;
  try {
    const res = await fetch(`${apiUrl}/employees`);
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
