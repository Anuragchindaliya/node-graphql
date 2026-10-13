import { Resolvers } from "../generated/types.js";
import { userService } from "../../modules/users/user.service.js";
import { organizationService } from "../../modules/organizations/organization.service.js";

export const userResolvers: Resolvers = {
  Query: {
    user: async (_parent, { id }, context) => {
      const user = await userService.getById(id, context.user?.tenantId);
      return {
        id: String(user.id),
        organizationId: String(user.tenant_id),
        name: user.fullName,
        email: user.email,
        createdAt: user.created_at,
        // organization will be resolved by the nested User.organization field resolver
      } as any;
    },
    users: async (_parent, { organizationId }, context) => {
      const targetTenantId = organizationId || context.user?.tenantId || undefined;
      const users = await userService.getUsers(targetTenantId);
      return users.map((u) => ({
        id: String(u.id),
        organizationId: String(u.tenant_id),
        name: u.fullName,
        email: u.email,
        createdAt: u.created_at,
      })) as any;
    },
  },
  Mutation: {
    createUser: async (_parent, { input }, _context) => {
      const created = await userService.createUser({
        organizationId: input.organizationId,
        name: input.name,
        email: input.email,
        password: input.password || null,
      });

      return {
        id: String(created.id),
        organizationId: String(created.tenant_id),
        name: created.fullName,
        email: created.email,
        createdAt: created.created_at,
      } as any;
    },
  },
  User: {
    organization: async (parent) => {
      // Nested Field Resolver: Demonstrates how child fields resolve relative to parent
      // Note: Without DataLoader, this creates the N+1 query problem when querying multiple users
      const org = await organizationService.getById(parent.organizationId);
      return {
        id: String(org.id),
        name: org.name,
        slug: org.slug,
        status: org.status,
        createdAt: org.created_at,
      };
    },
  },
};
