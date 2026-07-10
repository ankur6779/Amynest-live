import { TeacherOsApp } from "@/features/teacher-os/TeacherOsApp";
import { HubModuleGateWrap } from "@/components/hub-module-gate-wrap";

export default function TeacherOsPage() {
  return (
    <HubModuleGateWrap featureId="hub_worksheets">
      <TeacherOsApp />
    </HubModuleGateWrap>
  );
}
