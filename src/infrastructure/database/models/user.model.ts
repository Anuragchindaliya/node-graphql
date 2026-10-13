import { Model, RelationMappings } from "objection";
import { TenantBaseModel } from "./base.model.js";
import { OrganizationModel } from "./organization.model.js";
import { DepartmentModel } from "./department.model.js";
import { PositionModel } from "./position.model.js";
import { RoleModel } from "./role.model.js";
import { NotificationModel } from "./notification.model.js";

export class UserModel extends TenantBaseModel {
  static override tableName = "users";

  department_id?: string | null;
  position_id?: string | null;
  email!: string;
  password_hash!: string;
  first_name!: string;
  last_name!: string;
  status!: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  avatar_url?: string | null;

  // Relations
  organization?: OrganizationModel;
  department?: DepartmentModel | null;
  position?: PositionModel | null;
  roles?: RoleModel[];
  notifications?: NotificationModel[];

  get fullName(): string {
    return `${this.first_name} ${this.last_name}`.trim();
  }

  static override get jsonSchema() {
    return {
      type: "object",
      required: ["tenant_id", "email", "password_hash", "first_name", "last_name"],
      properties: {
        id: { type: ["string", "number"] },
        tenant_id: { type: ["string", "number"] },
        department_id: { type: ["string", "number", "null"] },
        position_id: { type: ["string", "number", "null"] },
        email: { type: "string", format: "email", minLength: 5, maxLength: 255 },
        password_hash: { type: "string", minLength: 1 },
        first_name: { type: "string", minLength: 1, maxLength: 100 },
        last_name: { type: "string", minLength: 1, maxLength: 100 },
        status: { type: "string", enum: ["ACTIVE", "INACTIVE", "SUSPENDED"], default: "ACTIVE" },
      },
    };
  }

  static override get relationMappings(): RelationMappings {
    return {
      organization: {
        relation: Model.BelongsToOneRelation,
        modelClass: OrganizationModel,
        join: {
          from: "users.tenant_id",
          to: "organizations.id",
        },
      },
      department: {
        relation: Model.BelongsToOneRelation,
        modelClass: DepartmentModel,
        join: {
          from: "users.department_id",
          to: "departments.id",
        },
      },
      position: {
        relation: Model.BelongsToOneRelation,
        modelClass: PositionModel,
        join: {
          from: "users.position_id",
          to: "positions.id",
        },
      },
      roles: {
        relation: Model.ManyToManyRelation,
        modelClass: RoleModel,
        join: {
          from: "users.id",
          through: {
            from: "user_roles.user_id",
            to: "user_roles.role_id",
            extra: ["tenant_id"],
          },
          to: "roles.id",
        },
      },
      notifications: {
        relation: Model.HasManyRelation,
        modelClass: NotificationModel,
        join: {
          from: "users.id",
          to: "notifications.user_id",
        },
      },
    };
  }
}
