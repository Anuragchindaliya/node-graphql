import { Model, RelationMappings } from "objection";
import { TenantBaseModel } from "./base.model.js";
import { OrganizationModel } from "./organization.model.js";
import { UserModel } from "./user.model.js";

export class NotificationModel extends TenantBaseModel {
  static override tableName = "notifications";

  user_id!: string;
  title!: string;
  message!: string;
  type!: string;
  is_read!: boolean;

  organization?: OrganizationModel;
  user?: UserModel;

  static override get relationMappings(): RelationMappings {
    return {
      organization: {
        relation: Model.BelongsToOneRelation,
        modelClass: OrganizationModel,
        join: {
          from: "notifications.tenant_id",
          to: "organizations.id",
        },
      },
      user: {
        relation: Model.BelongsToOneRelation,
        modelClass: UserModel,
        join: {
          from: "notifications.user_id",
          to: "users.id",
        },
      },
    };
  }
}
