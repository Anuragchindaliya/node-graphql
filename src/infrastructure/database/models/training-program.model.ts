import { Model, RelationMappings } from "objection";
import { TenantBaseModel } from "./base.model.js";
import { OrganizationModel } from "./organization.model.js";
import { CourseModel } from "./course.model.js";
import { UserModel } from "./user.model.js";

export class TrainingProgramModel extends TenantBaseModel {
  static override tableName = "training_programs";

  title!: string;
  code!: string;
  description?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  max_participants!: number;
  status!: "DRAFT" | "OPEN" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

  organization?: OrganizationModel;
  courses?: CourseModel[];
  applications?: TrainingApplicationModel[];

  static override get jsonSchema() {
    return {
      type: "object",
      required: ["tenant_id", "title", "code"],
      properties: {
        id: { type: ["string", "number"] },
        tenant_id: { type: ["string", "number"] },
        title: { type: "string", minLength: 1, maxLength: 255 },
        code: { type: "string", minLength: 1, maxLength: 50 },
        max_participants: { type: "integer", minimum: 1, default: 50 },
        status: {
          type: "string",
          enum: ["DRAFT", "OPEN", "IN_PROGRESS", "COMPLETED", "CANCELLED"],
          default: "DRAFT",
        },
      },
    };
  }

  static override get relationMappings(): RelationMappings {
    return {
      organization: {
        relation: Model.BelongsToOneRelation,
        modelClass: OrganizationModel,
        join: {
          from: "training_programs.tenant_id",
          to: "organizations.id",
        },
      },
      courses: {
        relation: Model.ManyToManyRelation,
        modelClass: CourseModel,
        join: {
          from: "training_programs.id",
          through: {
            from: "training_program_courses.training_program_id",
            to: "training_program_courses.course_id",
            extra: ["sequence_order"],
          },
          to: "courses.id",
        },
      },
      applications: {
        relation: Model.HasManyRelation,
        modelClass: TrainingApplicationModel,
        join: {
          from: "training_programs.id",
          to: "training_applications.training_program_id",
        },
      },
    };
  }
}

export class TrainingApplicationModel extends TenantBaseModel {
  static override tableName = "training_applications";

  training_program_id!: string;
  user_id!: string;
  status!: "PENDING" | "APPROVED" | "REJECTED" | "WITHDRAWN" | "COMPLETED";
  reviewed_by?: string | null;
  review_notes?: string | null;

  program?: TrainingProgramModel;
  user?: UserModel;
  reviewer?: UserModel | null;

  static override get relationMappings(): RelationMappings {
    return {
      program: {
        relation: Model.BelongsToOneRelation,
        modelClass: TrainingProgramModel,
        join: {
          from: "training_applications.training_program_id",
          to: "training_programs.id",
        },
      },
      user: {
        relation: Model.BelongsToOneRelation,
        modelClass: UserModel,
        join: {
          from: "training_applications.user_id",
          to: "users.id",
        },
      },
      reviewer: {
        relation: Model.BelongsToOneRelation,
        modelClass: UserModel,
        join: {
          from: "training_applications.reviewed_by",
          to: "users.id",
        },
      },
    };
  }
}
