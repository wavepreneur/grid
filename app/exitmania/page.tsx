import { redirect } from "next/navigation";
import { APP_HOME } from "@/lib/platform/app-paths";

export default function LegacyExitmania() {
  redirect(APP_HOME);
}
