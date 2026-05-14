export interface AuditContext {
  raw_request: Record<string, unknown>;
  raw_response: Record<string, unknown> | null;
}

export class AppError {
  statusCode: number;
  code: string;
  message: string;
  details?: unknown;
  audit?: AuditContext;

  constructor(statusCode: number, code: string, message: string, details?: unknown) {
    this.statusCode = statusCode;
    this.code = code;
    this.message = message;
    this.details = details;
  }
}
