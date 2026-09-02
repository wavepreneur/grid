import { BackofficeFrame } from "@/components/platform/backoffice-frame";
import { HealthEngineDashboard } from "@/components/cockpit/health-engine-dashboard";

export default function CockpitIndexPage() {
  return (
    <BackofficeFrame>
      <HealthEngineDashboard />
    </BackofficeFrame>
  );
}
