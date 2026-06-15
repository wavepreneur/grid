import { redirect } from "next/navigation";

type JoinRedirectProps = {
  params: Promise<{ inviteCode: string }>;
  searchParams: Promise<{ team?: string; name?: string }>;
};

export default async function JoinRedirect({ params, searchParams }: JoinRedirectProps) {
  const { inviteCode } = await params;
  const { team, name } = await searchParams;
  const code = inviteCode.toUpperCase();

  if (team) {
    const query = name ? `?name=${encodeURIComponent(name.trim())}` : "";
    redirect(`/e/${code}/team/${team.toUpperCase()}${query}`);
  }

  redirect(`/e/${code}`);
}
