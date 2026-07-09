"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setStudioOrganization } from "@/app/actions/cms/organizations";
import { GridSelect, GridLabel } from "@/components/grid/grid-shell";
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
      <GridLabel>Projekt</GridLabel>
      <GridSelect
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
      </GridSelect>
    </div>
  );
}
