import { redirect } from "next/navigation";

type LobbyRedirectProps = {
  params: Promise<{ inviteCode: string; joinCode: string }>;
  searchParams: Promise<{ manage?: string }>;
};

export default async function LobbyRedirect({ params, searchParams }: LobbyRedirectProps) {
  const { inviteCode, joinCode } = await params;
  const { manage } = await searchParams;
  const query = manage ? `?manage=${manage}` : "";
  redirect(`/e/${inviteCode.toUpperCase()}/lobby/${joinCode.toUpperCase()}${query}`);
}
