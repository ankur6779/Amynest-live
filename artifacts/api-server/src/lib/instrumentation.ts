/**
 * Side-effect bootstrap — import first in index.ts / worker before routes load.
 */
import { installAsyncRouteGuard } from "../middlewares/async-route-guard.js";
import { initApiSentry } from "./sentry.js";

installAsyncRouteGuard();
initApiSentry();
