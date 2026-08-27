export enum ErrorCode {
  INVALID_INPUT = "INVALID_INPUT",
  UNAUTHORIZED = "UNAUTHORIZED",
  FORBIDDEN = "FORBIDDEN",
  USER_NOT_FOUND = "USER_NOT_FOUND",
  HAPPENING_NOT_FOUND = "HAPPENING_NOT_FOUND",
  INGESTION_NOT_FOUND = "INGESTION_NOT_FOUND",
  INGESTION_CONFLICT = "INGESTION_CONFLICT",
  ANCHOR_NOT_FOUND = "ANCHOR_NOT_FOUND",
  COURSE_RATE_LIMITED = "COURSE_RATE_LIMITED",
  COUPLE_CONFLICT = "COUPLE_CONFLICT",
  COUPLE_INVITE_NOT_FOUND = "COUPLE_INVITE_NOT_FOUND",
  INTERNAL_ERROR = "INTERNAL_ERROR",
}

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "AppError";
  }
}
