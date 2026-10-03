import { StudioGameDetailSection } from "@/components/cms/studio-detail-sections";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ lang?: string }>;
};

export default async function AdminGameDetailPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { lang } = await searchParams;
  return <StudioGameDetailSection gameId={id} locale={lang} />;
}
