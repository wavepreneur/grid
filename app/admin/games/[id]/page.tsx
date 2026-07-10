import { StudioGameDetailSection } from "@/components/cms/studio-detail-sections";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function AdminGameDetailPage({ params }: Props) {
  const { id } = await params;
  return <StudioGameDetailSection gameId={id} />;
}
