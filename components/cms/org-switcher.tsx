"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setStudioOrganization } from "@/app/actions/cms/organizations";
import { IconBuilding } from "@/components/cms/studio-icons";
import { StudioLabel, StudioSelect } from "@/components/cms/studio-ui";
import type { StudioOrganization } from "@/lib/cms/types";

type Props = {
  organizations: StudioOrganization[];
  currentSlug: string;
};

export function OrgSwitcher({ organizations, currentSlug }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div>
      <StudioLabel>
        <span className="inline-flex items-center gap-1.5">
          <IconBuilding size={14} className="text-slate-400" />
          Projekt
        </span>
      </StudioLabel>
      <StudioSelect
        value={currentSlug}
        disabled={pending}
        onChange={(event) => {
          const slug = event.target.value;
          startTransition(async () => {
            await setStudioOrganization(slug);
            router.refresh();
          });
        }}
      >
        {organizations.map((org) => (
          <option key={org.id} value={org.slug}>
            {org.name}
          </option>
        ))}
      </StudioSelect>
    </div>
  );
}
