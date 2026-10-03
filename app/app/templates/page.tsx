import { redirect } from "next/navigation";
import { appPaths } from "@/lib/platform/app-paths";

export default function AppTemplatesPage() {
  redirect(appPaths.templates);
}
