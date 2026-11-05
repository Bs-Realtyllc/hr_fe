import { notFound } from "next/navigation";
import '../../../styles/global.css';
import { Plus_Jakarta_Sans } from "next/font/google";
import { OnboardingProvider } from "./OnboardingContext";

const plusJakartaSans = Plus_Jakarta_Sans({
    subsets: ['latin'],
    weight: ['400', '500', '600', '700', '800'],
    variable: '--font-plus-jakarta-sans',
});

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
    return (
        <OnboardingProvider>
            <div className={`${plusJakartaSans.className} max-w-full bg-white`}>{children}</div>
        </OnboardingProvider>
    );
}
