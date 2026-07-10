import { TeacherOsApp } from "@/features/teacher-os/TeacherOsApp";
import { HubModuleGateWrap } from "@/components/hub-module-gate-wrap";

/** Backward-compatible deep link — opens Worksheet Studio tab inside Teacher OS */
export default function WorksheetPage() {
  return (
    <HubModuleGateWrap featureId="hub_worksheets">
      <TeacherOsApp defaultModule="studio" />
    </HubModuleGateWrap>
  );
}
