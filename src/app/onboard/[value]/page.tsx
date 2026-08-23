import { notFound } from "next/navigation";
import OnboardForm from "@/components/OnboardForm";

const ALLOWED_VALUES = ["intern", "employee"] as const;
type OnboardValue = (typeof ALLOWED_VALUES)[number];

export function generateStaticParams() {
  return ALLOWED_VALUES.map((value) => ({ value }));
}

interface OnboardPageProps {
  params: { value: string };
}

export default function OnboardPage({ params }: OnboardPageProps) {
  const { value } = params;

  if (!ALLOWED_VALUES.includes(value as OnboardValue)) {
    notFound();
  }

  if (value === "intern" || value === "employee") {
    return <OnboardForm type={value} />;
  }

  // employee / owner are valid routes, but the form isn't built yet
  return (
    <div className="mx-auto max-w-2xl px-6 py-24 text-center">
      <p className="text-sm font-medium uppercase tracking-wide text-amber-700">
        {value} Onboarding
      </p>
      <h1 className="mt-1 text-2xl font-semibold text-slate-900">
        Coming soon
      </h1>
      <p className="mt-2 text-slate-600">
        The onboarding form for this role isn&apos;t available yet.
      </p>
    </div>
  );
}
