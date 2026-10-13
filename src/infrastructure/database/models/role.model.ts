import { Model, RelationMappings } from "objection";
import { TenantBaseModel } from "./base.model.js";
import { OrganizationModel } from "./organization.model.js";
import { UserModel } from "./user.model.js";
import { PermissionModel } from "./permission.model.js";

export class RoleModel extends TenantBaseModel {
  static override tableName = "roles";

  name!: string;
  slug!: string;
  description?: string | null;
  is_system!: boolean;

  organization?: OrganizationModel;
  users?: UserModel[];
  permissions?: PermissionModel[];

  static override get jsonSchema() {
    return {
      type: "object",
      required: ["tenant_id", "name", "slug"],
      properties: {
        id: { type: ["string", "number"] },
        tenant_id: { type: ["string", "number"] },
        name: { type: "string", minLength: 1, maxLength: 100 },
        slug: { type: "string", minLength: 1, maxLength: 100 },
        description: { type: ["string", "null"], maxLength: 500 },
        is_system: { type: "boolean", default: false },
      },
    };
  }

  static override get relationMappings(): RelationMappings {
    return {
      organization: {
        relation: Model.BelongsToOneRelation,
        modelClass: OrganizationModel,
        join: {
          from: "roles.tenant_id",
          to: "organizations.id",
        },
      },
      users: {
        relation: Model.ManyToManyRelation,
        modelClass: UserModel,
        join: {
          from: "roles.id",
          through: {
            from: "user_roles.role_id",
            to: "user_roles.user_id",
          },
          to: "users.id",
        },
      },
      permissions: {
        relation: Model.ManyToManyRelation,
        modelClass: PermissionModel,
        join: {
          from: "roles.id",
          through: {
            from: "role_permissions.role_id",
            to: "role_permissions.permission_id",
          },
          to: "permissions.id",
        },
      },
    };
  }
}
