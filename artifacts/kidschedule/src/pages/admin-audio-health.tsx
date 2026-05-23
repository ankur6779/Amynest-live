import { Redirect } from "wouter";

/** Legacy route — redirects to unified admin dashboard. */
export default function AdminAudioHealthPage() {
  return <Redirect to="/admin/dashboard" />;
}
