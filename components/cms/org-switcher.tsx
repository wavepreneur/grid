"use client";

import { useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Building2 } from "lucide-react";
import { setStudioOrganization } from "@/app/actions/cms/organizations";
import { inputCls } from "@/components/cms/ui";
import { queryKeys } from "@/lib/platform/query-keys";
import type { StudioOrganization } from "@/lib/cms/types";

type Props = {
  organizations: StudioOrganization[];
  currentSlug: string;
};

/** Detail/Neu-Routen gehören zum alten Projekt — nach Switch auf die Liste. */
function listPathAfterOrgSwitch(pathname: string): string | null {
  if (pathname.startsWith("/admin/tasks/")) return "/admin/tasks";
  if (pathname.startsWith("/admin/games/")) return "/admin/games";
  return null;
}

export function OrgSwitcher({ organizations, currentSlug }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const [pending, startTransition] = useTransition();

  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-1.5 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-muted-foreground">
        <Building2 className="h-3.5 w-3.5" strokeWidth={2} />
        Projekt
      </span>
      <select
        value={currentSlug}
        disabled={pending || organizations.length === 0}
        className={`${inputCls} mt-0 py-2 text-sm disabled:opacity-50`}
        onWheel={(event) => {
          // Native selects change value on scroll while focused — leave editor by accident.
          (event.currentTarget as HTMLSelectElement).blur();
        }}
        onChange={(event) => {
          const slug = event.target.value;
          if (slug === currentSlug) return;

          const listPath = listPathAfterOrgSwitch(pathname);
          if (listPath) {
            const ok = window.confirm(
              "Projekt wechseln und Editor verlassen? Ungespeicherte Änderungen gehen verloren.",
            );
            if (!ok) {
              event.target.value = currentSlug;
              return;
            }
          }

          startTransition(async () => {
            const result = await setStudioOrganization(slug);
            if (!result.success) {
              console.error(result.error);
              return;
            }
            await queryClient.cancelQueries({ queryKey: queryKeys.studio.all });
            queryClient.removeQueries({ queryKey: queryKeys.studio.all });

            if (listPath) {
              router.replace(listPath);
            }
            router.refresh();
          });
        }}
      >
        {organizations.map((org) => (
          <option key={org.id} value={org.slug}>
            {org.name}
          </option>
        ))}
      </select>
    </label>
  );
}
