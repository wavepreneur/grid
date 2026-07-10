import { StudioTaskDetailSection } from "@/components/cms/studio-detail-sections";
import { parseAdminReturnTo } from "@/lib/cms/admin-return";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ returnTo?: string }>;
};

export default async function EditTaskPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { returnTo: returnToRaw } = await searchParams;
  const returnTo = parseAdminReturnTo(returnToRaw);

  return <StudioTaskDetailSection taskId={id} returnTo={returnTo} />;
}
