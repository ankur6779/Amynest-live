import type {
  PublishRequest,
  PublishingProviderHealth,
  ScheduleRequest,
  UpdateRequest,
  UploadRequest,
  UploadResult,
  VerifyRequest,
  PublishVerificationReport,
} from "../../types/published-video.js";
import { PublishingError } from "./errors.js";
import type { PublishingProvider } from "./types.js";

/** Reserved extension slot for future publishing backends. */
export class FuturePublishingProvider implements PublishingProvider {
  readonly id = "future" as const;

  async health(): Promise<PublishingProviderHealth> {
    return {
      ok: false,
      message: "FuturePublishingProvider is a reserved extension slot",
      checkedAt: new Date().toISOString(),
    };
  }

  async upload(_request: UploadRequest): Promise<UploadResult> {
    throw new PublishingError(
      "unknown",
      "FuturePublishingProvider is not configured. Register a concrete publishing provider.",
      { retryable: false },
    );
  }

  async update(_request: UpdateRequest): Promise<UploadResult> {
    throw new PublishingError("unknown", "FuturePublishingProvider is not configured", {
      retryable: false,
    });
  }

  async delete(_videoId: string): Promise<boolean> {
    return false;
  }

  async schedule(_request: ScheduleRequest): Promise<UploadResult> {
    throw new PublishingError("unknown", "FuturePublishingProvider is not configured", {
      retryable: false,
    });
  }

  async publish(_request: PublishRequest): Promise<UploadResult> {
    throw new PublishingError("unknown", "FuturePublishingProvider is not configured", {
      retryable: false,
    });
  }

  async verify(_request: VerifyRequest): Promise<PublishVerificationReport> {
    throw new PublishingError("unknown", "FuturePublishingProvider is not configured", {
      retryable: false,
    });
  }
}
