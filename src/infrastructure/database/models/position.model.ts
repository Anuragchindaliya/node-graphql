import { Model, RelationMappings } from "objection";
import { TenantBaseModel } from "./base.model.js";
import { OrganizationModel } from "./organization.model.js";
import { DepartmentModel } from "./department.model.js";
import { UserModel } from "./user.model.js";

export class PositionModel extends TenantBaseModel {
  static override tableName = "positions";

  department_id?: string | null;
  title!: string;
  code!: string;

  organization?: OrganizationModel;
  department?: DepartmentModel | null;
  users?: UserModel[];

  static override get jsonSchema() {
    return {
      type: "object",
      required: ["tenant_id", "title", "code"],
      properties: {
        id: { type: ["string", "number"] },
        tenant_id: { type: ["string", "number"] },
        department_id: { type: ["string", "number", "null"] },
        title: { type: "string", minLength: 1, maxLength: 255 },
        code: { type: "string", minLength: 1, maxLength: 50 },
      },
    };
  }

  static override get relationMappings(): RelationMappings {
    return {
      organization: {
        relation: Model.BelongsToOneRelation,
        modelClass: OrganizationModel,
        join: {
          from: "positions.tenant_id",
          to: "organizations.id",
        },
      },
      department: {
        relation: Model.BelongsToOneRelation,
        modelClass: DepartmentModel,
        join: {
          from: "positions.department_id",
          to: "departments.id",
        },
      },
      users: {
        relation: Model.HasManyRelation,
        modelClass: UserModel,
        join: {
          from: "positions.id",
          to: "users.position_id",
        },
      },
    };
  }
}
