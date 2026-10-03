import { redirect } from "next/navigation";
import { APP_HOME } from "@/lib/platform/app-paths";

export default function LegacyAdminHome() {
  redirect(APP_HOME);
}
