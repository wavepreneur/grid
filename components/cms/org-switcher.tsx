"use client";

import { useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { setStudioOrganization } from "@/app/actions/cms/organizations";
import { useStudioConfirm } from "@/components/cms/shared/studio-confirm";
import { StudioListbox } from "@/components/cms/shared/studio-listbox";
import { useStudioUnsaved } from "@/components/cms/studio-unsaved";
import { IconBuilding } from "@/components/cms/studio-icons";
import { queryKeys } from "@/lib/platform/query-keys";
import type { StudioOrganization } from "@/lib/cms/types";

type Props = {
  organizations: StudioOrganization[];
  currentSlug: string;
  placement?: "top" | "bottom";
};

/** Detail/Neu-Routen gehören zum alten Projekt — nach Switch auf die Liste. */
function listPathAfterOrgSwitch(pathname: string): string | null {
  if (pathname.startsWith("/admin/tasks/")) return "/admin/tasks";
  if (pathname.startsWith("/admin/games/")) return "/admin/games";
  return null;
}

export function OrgSwitcher({ organizations, currentSlug, placement = "top" }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { confirm } = useStudioConfirm();
  const { isDirty } = useStudioUnsaved();
  const [pending, startTransition] = useTransition();

  function switchTo(slug: string, listPath: string | null) {
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
  }

  async function requestSwitch(slug: string) {
    if (slug === currentSlug) return;

    const listPath = listPathAfterOrgSwitch(pathname);
    if (listPath && isDirty) {
      const ok = await confirm({
        title: "Projekt wechseln?",
        description: "Du verlässt den Editor. Ungespeicherte Änderungen gehen verloren.",
        confirmLabel: "Projekt wechseln",
        cancelLabel: "Abbrechen",
        tone: "danger",
      });
      if (!ok) return;
    }

    switchTo(slug, listPath);
  }

  return (
    <StudioListbox
      value={currentSlug}
      options={organizations.map((org) => ({ value: org.slug, label: org.name }))}
      onChange={(slug) => void requestSwitch(slug)}
      disabled={pending || organizations.length === 0}
      variant="sidebar"
      placement={placement}
      aria-label="Projekt"
      caption="Projekt"
      leading={
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <IconBuilding size={16} />
        </span>
      }
    />
  );
}
