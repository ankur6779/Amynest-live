import { Redirect } from "wouter";

/** Teacher OS is hidden from the parent product. */
export default function TeacherOsPage() {
  return <Redirect to="/parenting-hub" />;
}
