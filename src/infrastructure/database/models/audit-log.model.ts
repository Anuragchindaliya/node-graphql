import { Model, RelationMappings, QueryContext } from "objection";
import { BaseModel } from "./base.model.js";
import { OrganizationModel } from "./organization.model.js";
import { UserModel } from "./user.model.js";

export class AuditLogModel extends BaseModel {
  static override tableName = "audit_logs";

  tenant_id!: string;
  user_id?: string | null;
  action!: string;
  entity_type!: string;
  entity_id!: string;
  old_state?: Record<string, unknown> | null;
  new_state?: Record<string, unknown> | null;
  ip_address?: string | null;

  override $beforeInsert(_context: QueryContext): void {
    const now = new Date().toISOString().slice(0, 19).replace("T", " ");
    this.created_at = this.created_at || now;
  }

  organization?: OrganizationModel;
  user?: UserModel | null;

  static override get relationMappings(): RelationMappings {
    return {
      organization: {
        relation: Model.BelongsToOneRelation,
        modelClass: OrganizationModel,
        join: {
          from: "audit_logs.tenant_id",
          to: "organizations.id",
        },
      },
      user: {
        relation: Model.BelongsToOneRelation,
        modelClass: UserModel,
        join: {
          from: "audit_logs.user_id",
          to: "users.id",
        },
      },
    };
  }
}
