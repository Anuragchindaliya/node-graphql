import { Resolvers } from "../generated/types.js";
import { organizationResolvers } from "./organization.resolver.js";
import { userResolvers } from "./user.resolver.js";

export const resolvers: Resolvers = {
  Query: {
    health: () => ({
      status: "UP",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: "1.0.0",
    }),
    ...organizationResolvers.Query,
    ...userResolvers.Query,
  },
  Mutation: {
    ...userResolvers.Mutation,
  },
  User: {
    ...userResolvers.User,
  },
};
