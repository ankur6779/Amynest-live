import { WorksheetStudioApp } from "@/features/worksheet-studio/WorksheetStudioApp";
import { WorksheetStudioAccessGate } from "@/components/worksheet-studio-access-gate";

/** LPS Worksheet Studio — desktop browser + premium only (direct URL). */
export default function WorksheetPage() {
  return (
    <WorksheetStudioAccessGate>
      <WorksheetStudioApp />
    </WorksheetStudioAccessGate>
  );
}
