import { Resolvers } from "../generated/types.js";
import { organizationService } from "../../modules/organizations/organization.service.js";

export const organizationResolvers: Resolvers = {
  Query: {
    organization: async (_parent, { id }, _context) => {
      const org = await organizationService.getById(id);
      return {
        id: String(org.id),
        name: org.name,
        slug: org.slug,
        status: org.status,
        createdAt: org.created_at,
      };
    },
    organizations: async () => {
      const orgs = await organizationService.getAll();
      return orgs.map((org) => ({
        id: String(org.id),
        name: org.name,
        slug: org.slug,
        status: org.status,
        createdAt: org.created_at,
      }));
    },
  },
};
