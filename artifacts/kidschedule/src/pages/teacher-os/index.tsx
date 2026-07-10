import { Redirect } from "wouter";

/** Teacher OS shell removed from product — legacy URL forwards to Worksheet Studio. */
export default function TeacherOsPage() {
  return <Redirect to="/worksheet" />;
}
