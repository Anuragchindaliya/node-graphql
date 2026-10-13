import { Request, Response } from "express";
import crypto from "node:crypto";

export interface AuthenticatedUser {
  id: string;
  tenantId: string;
  email: string;
  roles: string[];
}

export interface GraphQLContext {
  requestId: string;
  user: AuthenticatedUser | null;
  startTime: number;
  req: Request;
  res: Response;
}

export async function buildContext({
  req,
  res,
}: {
  req: Request;
  res: Response;
}): Promise<GraphQLContext> {
  // Extract or generate a unique correlation / trace ID for the request
  const requestId = (req.headers["x-request-id"] as string) || crypto.randomUUID();

  // For Phase 2, check for optional mock headers or default to guest context
  // (Full JWT & OIDC auth pipeline will be completed in Phase 3)
  let user: AuthenticatedUser | null = null;
  const mockTenantId = req.headers["x-tenant-id"] as string | undefined;
  const mockUserId = req.headers["x-user-id"] as string | undefined;

  if (mockTenantId && mockUserId) {
    user = {
      id: mockUserId,
      tenantId: mockTenantId,
      email: (req.headers["x-user-email"] as string) || "user@acme.com",
      roles: ["learner"],
    };
  }

  return {
    requestId,
    user,
    startTime: Date.now(),
    req,
    res,
  };
}
