import { UserRepository } from "../../infrastructure/repositories/user.repository.js";
import { UserModel } from "../../infrastructure/database/models/user.model.js";
import { organizationService } from "../organizations/organization.service.js";
import { ConflictError, NotFoundError, ValidationError } from "../../core/errors/app-error.js";
import { logger } from "../../core/logger/logger.js";

export interface CreateUserInputData {
  organizationId: string;
  name: string;
  email: string;
  password?: string | null;
}

export class UserService {
  constructor(private readonly userRepo: UserRepository = new UserRepository()) {}

  async getById(id: string, tenantId?: string): Promise<UserModel> {
    let user: UserModel | null = null;
    if (tenantId) {
      user = await this.userRepo.findByTenantId(tenantId, id);
    } else {
      user = await this.userRepo.findById(id);
    }

    if (!user || user.deleted_at) {
      throw new NotFoundError(`User with ID '${id}' not found`);
    }
    return user;
  }

  async getUsers(tenantId?: string): Promise<UserModel[]> {
    if (tenantId) {
      return await this.userRepo.findMany(tenantId);
    }
    // If no tenant filter supplied, return all active users
    return await UserModel.query().whereNull("deleted_at").orderBy("id", "asc");
  }

  async createUser(input: CreateUserInputData): Promise<UserModel> {
    const trimmedEmail = input.email.trim().toLowerCase();
    const trimmedName = input.name.trim();

    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      throw new ValidationError("Invalid email address format", { field: "email" });
    }

    if (!trimmedName) {
      throw new ValidationError("Name cannot be empty", { field: "name" });
    }

    // 1. Verify organization exists
    await organizationService.getById(input.organizationId);

    // 2. Check for duplicate email in this organization
    const existing = await this.userRepo.findByEmail(input.organizationId, trimmedEmail);
    if (existing) {
      throw new ConflictError(
        `User with email '${trimmedEmail}' already exists in this organization`,
        { email: trimmedEmail, organizationId: input.organizationId }
      );
    }

    // Split name into first and last name
    const nameParts = trimmedName.split(/\s+/);
    const firstName = nameParts[0] || "User";
    const lastName = nameParts.slice(1).join(" ") || firstName;

    // Default password hash if not provided (placeholder for auth phase)
    const dummyHash = "$2b$10$epRswT.wEaP.w1.J2B/4e.7iY8Gk0OsqLg6xUjJzFh7zEsqWjFz5O";

    const user = await this.userRepo.create({
      tenant_id: input.organizationId,
      email: trimmedEmail,
      first_name: firstName,
      last_name: lastName,
      password_hash: dummyHash,
      status: "ACTIVE",
    });

    logger.info({ userId: user.id, email: user.email, tenantId: user.tenant_id }, "User created via UserService");
    return user;
  }
}

export const userService = new UserService();
