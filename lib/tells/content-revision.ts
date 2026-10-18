import { createAdminClient } from "@/lib/supabase/admin";

export async function bumpEventContentRevision(eventId: string): Promise<number> {
  const supabase = createAdminClient();

  const { data: current, error: readError } = await supabase
    .from("events")
    .select("content_revision")
    .eq("id", eventId)
    .single();

  if (readError) throw new Error(readError.message);

  const next = (current?.content_revision ?? 0) + 1;

  const { data: updated, error: writeError } = await supabase
    .from("events")
    .update({ content_revision: next })
    .eq("id", eventId)
    .select("content_revision")
    .single();

  if (writeError) throw new Error(writeError.message);
  return updated?.content_revision ?? next;
}

export async function getEventContentRevisionByInviteCode(
  inviteCode: string,
): Promise<number | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("events")
    .select("content_revision")
    .eq("invite_code", inviteCode.toUpperCase())
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data?.content_revision ?? null;
}
