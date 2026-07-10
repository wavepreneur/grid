import { notFound } from "next/navigation";
import { StudioPage } from "@/components/cms/studio-page";
import { TaskEditor } from "@/components/cms/tasks/task-editor";
import { getTask } from "@/app/actions/cms/tasks";
import { parseAdminReturnTo } from "@/lib/cms/admin-return";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ returnTo?: string }>;
};

export default async function EditTaskPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { returnTo: returnToRaw } = await searchParams;
  const returnTo = parseAdminReturnTo(returnToRaw);

  const result = await getTask(id);
  if (!result.success || !result.data) notFound();

  return (
    <StudioPage
      title={result.data.title}
      description={
        returnTo
          ? "Aufgabe bearbeiten — danach kehrst du zum Spiel zurück."
          : `Aufgabe bearbeiten · ${result.data.slug}`
      }
    >
      <TaskEditor task={result.data} returnTo={returnTo} />
    </StudioPage>
  );
}
