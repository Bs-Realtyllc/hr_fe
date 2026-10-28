import { redirect } from "next/navigation";

export default async function OnboardPage({
  params,
}: {
  params: Promise<{ value: string }>;
}) {
  const { value } = await params;
  redirect(`/onboard/${value}/personal-info`);
}
