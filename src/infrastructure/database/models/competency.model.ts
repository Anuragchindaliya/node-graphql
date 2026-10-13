import { Model, RelationMappings } from "objection";
import { BaseModel, TenantBaseModel } from "./base.model.js";
import { OrganizationModel } from "./organization.model.js";
import { UserModel } from "./user.model.js";

export class CompetencyModel extends TenantBaseModel {
  static override tableName = "competencies";

  name!: string;
  code!: string;
  category!: string;
  description?: string | null;

  organization?: OrganizationModel;
  levels?: CompetencyLevelModel[];
  userCompetencies?: UserCompetencyModel[];

  static override get jsonSchema() {
    return {
      type: "object",
      required: ["tenant_id", "name", "code", "category"],
      properties: {
        id: { type: ["string", "number"] },
        tenant_id: { type: ["string", "number"] },
        name: { type: "string", minLength: 1, maxLength: 255 },
        code: { type: "string", minLength: 1, maxLength: 50 },
        category: { type: "string", minLength: 1, maxLength: 100 },
        description: { type: ["string", "null"] },
      },
    };
  }

  static override get relationMappings(): RelationMappings {
    return {
      organization: {
        relation: Model.BelongsToOneRelation,
        modelClass: OrganizationModel,
        join: {
          from: "competencies.tenant_id",
          to: "organizations.id",
        },
      },
      levels: {
        relation: Model.HasManyRelation,
        modelClass: CompetencyLevelModel,
        join: {
          from: "competencies.id",
          to: "competency_levels.competency_id",
        },
      },
      userCompetencies: {
        relation: Model.HasManyRelation,
        modelClass: UserCompetencyModel,
        join: {
          from: "competencies.id",
          to: "user_competencies.competency_id",
        },
      },
    };
  }
}

export class CompetencyLevelModel extends BaseModel {
  static override tableName = "competency_levels";

  competency_id!: string;
  level_number!: number;
  name!: string;
  description!: string;

  competency?: CompetencyModel;

  static override get relationMappings(): RelationMappings {
    return {
      competency: {
        relation: Model.BelongsToOneRelation,
        modelClass: CompetencyModel,
        join: {
          from: "competency_levels.competency_id",
          to: "competencies.id",
        },
      },
    };
  }
}

export class UserCompetencyModel extends TenantBaseModel {
  static override tableName = "user_competencies";

  user_id!: string;
  competency_id!: string;
  current_level_id!: string;
  verified_at?: string | null;
  verified_by?: string | null;

  user?: UserModel;
  competency?: CompetencyModel;
  level?: CompetencyLevelModel;
  verifier?: UserModel | null;

  static override get relationMappings(): RelationMappings {
    return {
      user: {
        relation: Model.BelongsToOneRelation,
        modelClass: UserModel,
        join: {
          from: "user_competencies.user_id",
          to: "users.id",
        },
      },
      competency: {
        relation: Model.BelongsToOneRelation,
        modelClass: CompetencyModel,
        join: {
          from: "user_competencies.competency_id",
          to: "competencies.id",
        },
      },
      level: {
        relation: Model.BelongsToOneRelation,
        modelClass: CompetencyLevelModel,
        join: {
          from: "user_competencies.current_level_id",
          to: "competency_levels.id",
        },
      },
      verifier: {
        relation: Model.BelongsToOneRelation,
        modelClass: UserModel,
        join: {
          from: "user_competencies.verified_by",
          to: "users.id",
        },
      },
    };
  }
}
