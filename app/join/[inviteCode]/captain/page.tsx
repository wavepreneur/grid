import { redirect } from "next/navigation";

type CaptainRedirectProps = {
  params: Promise<{ inviteCode: string }>;
  searchParams: Promise<{ team?: string }>;
};

export default async function CaptainRedirect({ params, searchParams }: CaptainRedirectProps) {
  const { inviteCode } = await params;
  const { team } = await searchParams;
  const code = inviteCode.toUpperCase();
  const query = team ? `?team=${team.toUpperCase()}` : "";
  redirect(`/e/${code}/captain${query}`);
}
