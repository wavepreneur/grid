import { redirect } from "next/navigation";
import { canonicalizeAppPath } from "@/lib/platform/app-paths";

export default async function LegacyAdminPath({
  params,
}: {
  params: Promise<{ path: string[] }>;
}) {
  const { path } = await params;
  redirect(canonicalizeAppPath(`/admin/${path.join("/")}`));
}
