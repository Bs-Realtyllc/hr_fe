import { notFound } from "next/navigation";

const ALLOWED_VALUES = ["intern", "employee"];

export function generateStaticParams() {
    return ALLOWED_VALUES.map((value) => ({ value }));
}

export default async function OnboardLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ value: string }>; // use { value: string } if you're on Next 14
}) {
    const { value } = await params;
    if (!ALLOWED_VALUES.includes(value)) notFound();
    return <div className=" max-w-full ">{children}</div>;
}
