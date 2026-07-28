import type {
  PublishRequest,
  PublishingProviderHealth,
  PublishingProviderId,
  ScheduleRequest,
  UpdateRequest,
  UploadRequest,
  UploadResult,
  VerifyRequest,
  PublishVerificationReport,
} from "../../types/published-video.js";

/**
 * Provider-agnostic publishing contract.
 * Orchestration never hardcodes vendor SDKs — only this interface.
 */
export interface PublishingProvider {
  readonly id: PublishingProviderId;
  health(): Promise<PublishingProviderHealth>;
  upload(request: UploadRequest): Promise<UploadResult>;
  update(request: UpdateRequest): Promise<UploadResult>;
  delete(videoId: string): Promise<boolean>;
  schedule(request: ScheduleRequest): Promise<UploadResult>;
  publish(request: PublishRequest): Promise<UploadResult>;
  verify(request: VerifyRequest): Promise<PublishVerificationReport>;
}
