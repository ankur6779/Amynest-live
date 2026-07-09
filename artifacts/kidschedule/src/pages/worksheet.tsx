import { WorksheetStudioApp } from "@/features/worksheet-studio/WorksheetStudioApp";
import { HubModuleGateWrap } from "@/components/hub-module-gate-wrap";

export default function WorksheetPage() {
  return (
    <HubModuleGateWrap featureId="hub_worksheets">
      <WorksheetStudioApp />
    </HubModuleGateWrap>
  );
}
