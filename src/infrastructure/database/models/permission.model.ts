import { Model, RelationMappings } from "objection";
import { BaseModel } from "./base.model.js";
import { RoleModel } from "./role.model.js";

export class PermissionModel extends BaseModel {
  static override tableName = "permissions";

  name!: string;
  action!: string;
  resource!: string;
  description?: string | null;

  roles?: RoleModel[];

  static override get jsonSchema() {
    return {
      type: "object",
      required: ["name", "action", "resource"],
      properties: {
        id: { type: ["string", "number"] },
        name: { type: "string", minLength: 1, maxLength: 100 },
        action: { type: "string", minLength: 1, maxLength: 50 },
        resource: { type: "string", minLength: 1, maxLength: 50 },
        description: { type: ["string", "null"], maxLength: 500 },
      },
    };
  }

  static override get relationMappings(): RelationMappings {
    return {
      roles: {
        relation: Model.ManyToManyRelation,
        modelClass: RoleModel,
        join: {
          from: "permissions.id",
          through: {
            from: "role_permissions.permission_id",
            to: "role_permissions.role_id",
          },
          to: "roles.id",
        },
      },
    };
  }
}
