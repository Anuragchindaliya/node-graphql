import { GraphQLError } from "graphql";
import { ErrorCode, ErrorCodeType } from "./error-codes.js";

export interface AppErrorDetails {
  [key: string]: unknown;
}

export class AppError extends GraphQLError {
  public readonly code: ErrorCodeType;
  public readonly httpStatus: number;

  constructor(
    message: string,
    code: ErrorCodeType = ErrorCode.INTERNAL_SERVER_ERROR,
    httpStatus: number = 500,
    details?: AppErrorDetails
  ) {
    super(message, {
      extensions: {
        code,
        httpStatus,
        ...(details ? { details } : {}),
      },
    });
    this.code = code;
    this.httpStatus = httpStatus;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Resource not found", details?: AppErrorDetails) {
    super(message, ErrorCode.NOT_FOUND, 404, details);
  }
}

export class UnauthenticatedError extends AppError {
  constructor(message = "Authentication required", details?: AppErrorDetails) {
    super(message, ErrorCode.UNAUTHENTICATED, 401, details);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Access denied", details?: AppErrorDetails) {
    super(message, ErrorCode.FORBIDDEN, 403, details);
  }
}

export class ValidationError extends AppError {
  constructor(message = "Validation failed", details?: AppErrorDetails) {
    super(message, ErrorCode.VALIDATION_ERROR, 400, details);
  }
}

export class ConflictError extends AppError {
  constructor(message = "Resource already exists", details?: AppErrorDetails) {
    super(message, ErrorCode.CONFLICT, 409, details);
  }
}
