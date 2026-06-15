import { redirect } from "next/navigation";

type PlayRedirectProps = {
  params: Promise<{ inviteCode: string; joinCode: string }>;
};

export default async function PlayRedirect({ params }: PlayRedirectProps) {
  const { inviteCode, joinCode } = await params;
  redirect(`/e/${inviteCode.toUpperCase()}/play/${joinCode.toUpperCase()}`);
}
