/**
 * Production error boundary — catches render errors and shows recovery UI
 * instead of a blank screen. Prefer wrapping route shells and fragile UI
 * (navigation, lazy chunks) rather than every leaf component.
 */
export { AppErrorBoundary as ErrorBoundary } from "@/components/app-error-boundary";
