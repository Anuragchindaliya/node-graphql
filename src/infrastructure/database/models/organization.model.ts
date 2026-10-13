import { Model, RelationMappings } from "objection";
import { BaseModel } from "./base.model.js";
import { UserModel } from "./user.model.js";
import { DepartmentModel } from "./department.model.js";
import { PositionModel } from "./position.model.js";
import { RoleModel } from "./role.model.js";
import { CourseModel } from "./course.model.js";

export class OrganizationModel extends BaseModel {
  static override tableName = "organizations";

  name!: string;
  slug!: string;
  status!: "ACTIVE" | "SUSPENDED" | "ARCHIVED";
  settings?: Record<string, unknown> | null;
  deleted_at?: string | null;

  // Relations
  users?: UserModel[];
  departments?: DepartmentModel[];
  positions?: PositionModel[];
  roles?: RoleModel[];
  courses?: CourseModel[];

  static override get jsonSchema() {
    return {
      type: "object",
      required: ["name", "slug"],
      properties: {
        id: { type: ["string", "number"] },
        name: { type: "string", minLength: 1, maxLength: 255 },
        slug: { type: "string", minLength: 1, maxLength: 100 },
        status: { type: "string", enum: ["ACTIVE", "SUSPENDED", "ARCHIVED"], default: "ACTIVE" },
      },
    };
  }

  static override get relationMappings(): RelationMappings {
    return {
      users: {
        relation: Model.HasManyRelation,
        modelClass: UserModel,
        join: {
          from: "organizations.id",
          to: "users.tenant_id",
        },
      },
      departments: {
        relation: Model.HasManyRelation,
        modelClass: DepartmentModel,
        join: {
          from: "organizations.id",
          to: "departments.tenant_id",
        },
      },
      positions: {
        relation: Model.HasManyRelation,
        modelClass: PositionModel,
        join: {
          from: "organizations.id",
          to: "positions.tenant_id",
        },
      },
      roles: {
        relation: Model.HasManyRelation,
        modelClass: RoleModel,
        join: {
          from: "organizations.id",
          to: "roles.tenant_id",
        },
      },
      courses: {
        relation: Model.HasManyRelation,
        modelClass: CourseModel,
        join: {
          from: "organizations.id",
          to: "courses.tenant_id",
        },
      },
    };
  }
}
