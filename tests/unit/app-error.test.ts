import { describe, it, expect } from "vitest";
import {
  AppError,
  NotFoundError,
  UnauthenticatedError,
  ForbiddenError,
  ValidationError,
  ConflictError,
} from "../../src/core/errors/app-error.js";
import { ErrorCode } from "../../src/core/errors/error-codes.js";

describe("AppError Hierarchy", () => {
  it("should create base AppError with correct extensions", () => {
    const error = new AppError("Something went wrong", ErrorCode.INTERNAL_SERVER_ERROR, 500, {
      requestId: "req-123",
    });

    expect(error.message).toBe("Something went wrong");
    expect(error.code).toBe(ErrorCode.INTERNAL_SERVER_ERROR);
    expect(error.httpStatus).toBe(500);
    expect(error.extensions?.["code"]).toBe(ErrorCode.INTERNAL_SERVER_ERROR);
    expect(error.extensions?.["httpStatus"]).toBe(500);
    expect(error.extensions?.["details"]).toEqual({ requestId: "req-123" });
  });

  it("should create NotFoundError with 404 status and NOT_FOUND code", () => {
    const error = new NotFoundError("User not found");
    expect(error.code).toBe(ErrorCode.NOT_FOUND);
    expect(error.httpStatus).toBe(404);
    expect(error.extensions?.["code"]).toBe(ErrorCode.NOT_FOUND);
  });

  it("should create UnauthenticatedError with 401 status", () => {
    const error = new UnauthenticatedError("Token expired");
    expect(error.code).toBe(ErrorCode.UNAUTHENTICATED);
    expect(error.httpStatus).toBe(401);
  });

  it("should create ForbiddenError with 403 status", () => {
    const error = new ForbiddenError("Insufficient permissions");
    expect(error.code).toBe(ErrorCode.FORBIDDEN);
    expect(error.httpStatus).toBe(403);
  });

  it("should create ValidationError with 400 status and details", () => {
    const error = new ValidationError("Invalid email", { field: "email" });
    expect(error.code).toBe(ErrorCode.VALIDATION_ERROR);
    expect(error.httpStatus).toBe(400);
    expect(error.extensions?.["details"]).toEqual({ field: "email" });
  });

  it("should create ConflictError with 409 status", () => {
    const error = new ConflictError("Tenant slug already in use");
    expect(error.code).toBe(ErrorCode.CONFLICT);
    expect(error.httpStatus).toBe(409);
  });
});
