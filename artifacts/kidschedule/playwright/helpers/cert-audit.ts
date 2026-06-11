import type { Page, Request, Response } from "@playwright/test";

export type AuditReport = {
  consoleErrors: string[];
  consoleWarnings: string[];
  reactWarnings: string[];
  pageErrors: string[];
  unhandledRejections: string[];
  failedRequests: string[];
  analyticsEvents: string[];
};

export class CertAudit {
  readonly report: AuditReport = {
    consoleErrors: [],
    consoleWarnings: [],
    reactWarnings: [],
    pageErrors: [],
    unhandledRejections: [],
    failedRequests: [],
    analyticsEvents: [],
  };

  attach(page: Page): void {
    page.on("console", (msg) => {
      const text = msg.text();
      if (msg.type() === "error") this.report.consoleErrors.push(text);
      if (msg.type() === "warning") {
        this.report.consoleWarnings.push(text);
        if (/react|Warning:/i.test(text)) this.report.reactWarnings.push(text);
      }
    });

    page.on("pageerror", (err) => {
      this.report.pageErrors.push(err.message);
    });

    page.on("requestfailed", (req: Request) => {
      const url = req.url();
      if (url.includes("favicon") || url.includes("amy-avatar")) return;
      this.report.failedRequests.push(`${req.method()} ${url} — ${req.failure()?.errorText ?? "failed"}`);
    });

    page.on("response", (res: Response) => {
      const url = res.url();
      if (!url.includes("/api/logs")) return;
      if (res.request().method() !== "POST") return;
      void res.json().then((body) => {
        const msg = String((body as { message?: string }).message ?? "");
        if (msg.includes("[math-playground]")) {
          this.report.analyticsEvents.push(msg.replace("[math-playground] ", "").trim());
        }
      }).catch(() => undefined);
    });

    page.addInitScript(() => {
      window.addEventListener("unhandledrejection", (event) => {
        const reason = event.reason;
        const msg = reason instanceof Error ? reason.message : String(reason);
        (window as unknown as { __CERT_REJECTIONS__: string[] }).__CERT_REJECTIONS__ =
          (window as unknown as { __CERT_REJECTIONS__: string[] }).__CERT_REJECTIONS__ ?? [];
        (window as unknown as { __CERT_REJECTIONS__: string[] }).__CERT_REJECTIONS__.push(msg);
      });
    });
  }

  async collectRejections(page: Page): Promise<void> {
    const rejections = await page.evaluate(() => {
      const list = (window as unknown as { __CERT_REJECTIONS__?: string[] }).__CERT_REJECTIONS__ ?? [];
      (window as unknown as { __CERT_REJECTIONS__: string[] }).__CERT_REJECTIONS__ = [];
      return list;
    });
    this.report.unhandledRejections.push(...rejections);
  }

  assertClean(extraAllowedConsole?: RegExp[]): void {
    const allow = [
      /favicon/i,
      /manifest\.json/i,
      /audio-pack/i,
      /Failed to load resource.*404/i,
      /static-audio/i,
      /CORS policy/i,
      /net::ERR_FAILED/i,
      /AudioContext encountered an error/i,
      ...(extraAllowedConsole ?? []),
    ];

    const filter = (items: string[]) =>
      items.filter((line) => !allow.some((re) => re.test(line)));

    const errors = filter(this.report.consoleErrors);
    const pageErrors = filter(this.report.pageErrors);
    const rejections = filter(this.report.unhandledRejections);
    const failed = filter(this.report.failedRequests);
    const react = filter(this.report.reactWarnings);

    if (errors.length || pageErrors.length || rejections.length || failed.length || react.length) {
      throw new Error(
        JSON.stringify({ errors, pageErrors, rejections, failed, react }, null, 2),
      );
    }
  }
}
