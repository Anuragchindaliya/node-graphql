import { Model, RelationMappings } from "objection";
import { TenantBaseModel } from "./base.model.js";
import { OrganizationModel } from "./organization.model.js";
import { UserModel } from "./user.model.js";
import { PositionModel } from "./position.model.js";

export class DepartmentModel extends TenantBaseModel {
  static override tableName = "departments";

  parent_id?: string | null;
  name!: string;
  code!: string;

  organization?: OrganizationModel;
  parent?: DepartmentModel | null;
  children?: DepartmentModel[];
  positions?: PositionModel[];
  users?: UserModel[];

  static override get jsonSchema() {
    return {
      type: "object",
      required: ["tenant_id", "name", "code"],
      properties: {
        id: { type: ["string", "number"] },
        tenant_id: { type: ["string", "number"] },
        parent_id: { type: ["string", "number", "null"] },
        name: { type: "string", minLength: 1, maxLength: 255 },
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
          from: "departments.tenant_id",
          to: "organizations.id",
        },
      },
      parent: {
        relation: Model.BelongsToOneRelation,
        modelClass: DepartmentModel,
        join: {
          from: "departments.parent_id",
          to: "departments.id",
        },
      },
      children: {
        relation: Model.HasManyRelation,
        modelClass: DepartmentModel,
        join: {
          from: "departments.id",
          to: "departments.parent_id",
        },
      },
      positions: {
        relation: Model.HasManyRelation,
        modelClass: PositionModel,
        join: {
          from: "departments.id",
          to: "positions.department_id",
        },
      },
      users: {
        relation: Model.HasManyRelation,
        modelClass: UserModel,
        join: {
          from: "departments.id",
          to: "users.department_id",
        },
      },
    };
  }
}
