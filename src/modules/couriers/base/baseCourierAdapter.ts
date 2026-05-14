import { AppError } from "../../../utils/appError";

const safeParseJson = <T>(text: string): T | { message: string; rawBody: string } => {
  if (!text) {
    return {} as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    const snippet = text.length > 500 ? `${text.slice(0, 500)}…` : text;
    return { message: "Courier returned non-JSON response", rawBody: snippet };
  }
};

export abstract class BaseCourierAdapter {
  protected async executeJsonRequest<T>(
    input: string | URL,
    init: RequestInit,
    allowRetryOnUnauthorized = true,
    attempt = 1,
  ): Promise<T> {
    const response = await fetch(input, init);

    if (response.status === 401 && allowRetryOnUnauthorized) {
      await this.refreshAuthentication();
      return this.executeJsonRequest<T>(input, init, false, attempt);
    }

    if (!response.ok && response.status >= 500) {
      const retryConfig = this.getRetryConfig();

      if (attempt < retryConfig.maxAttempts) {
        await this.wait(retryConfig.retryDelayMs);
        return this.executeJsonRequest<T>(input, init, allowRetryOnUnauthorized, attempt + 1);
      }
    }

    const text = await response.text();
    const parsed = safeParseJson<T>(text);

    if (!response.ok) {
      throw new AppError(
        response.status >= 500 ? 502 : response.status,
        response.status >= 500 ? "COURIER_TEMPORARY_FAILURE" : "COURIER_BUSINESS_ERROR",
        "Courier request failed",
        parsed,
      );
    }

    return parsed as T;
  }

  protected async executeJsonRequestWithoutAuthRetry<T>(
    input: string | URL,
    init: RequestInit,
    attempt = 1,
  ): Promise<T> {
    const response = await fetch(input, init);

    if (!response.ok && response.status >= 500) {
      const retryConfig = this.getRetryConfig();

      if (attempt < retryConfig.maxAttempts) {
        await this.wait(retryConfig.retryDelayMs);
        return this.executeJsonRequestWithoutAuthRetry<T>(input, init, attempt + 1);
      }
    }

    const text = await response.text();
    const parsed = safeParseJson<T>(text);

    if (!response.ok) {
      throw new AppError(
        response.status >= 500 ? 502 : response.status,
        response.status >= 500 ? "COURIER_TEMPORARY_FAILURE" : "COURIER_AUTH_FAILURE",
        "Courier authentication request failed",
        parsed,
      );
    }

    return parsed as T;
  }

  protected wait(delayMs: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  protected attachAuditContext(
    err: unknown,
    rawRequest: Record<string, unknown>,
    rawResponse: Record<string, unknown> | null,
  ): void {
    if (!(err instanceof AppError)) {
      return;
    }

    err.audit = { raw_request: rawRequest, raw_response: rawResponse };
  }

  protected abstract getRetryConfig(): {
    maxAttempts: number;
    retryDelayMs: number;
  };

  protected abstract refreshAuthentication(): Promise<void>;
}
