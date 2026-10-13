import { Model, RelationMappings } from "objection";
import { TenantBaseModel } from "./base.model.js";
import { OrganizationModel } from "./organization.model.js";
import { TrainingProgramModel } from "./training-program.model.js";
import { AssessmentModel } from "./assessment.model.js";

export class CourseModel extends TenantBaseModel {
  static override tableName = "courses";

  title!: string;
  code!: string;
  description?: string | null;
  estimated_duration_hours!: number;
  status!: "DRAFT" | "PUBLISHED" | "ARCHIVED";

  organization?: OrganizationModel;
  trainingPrograms?: TrainingProgramModel[];
  assessments?: AssessmentModel[];

  static override get jsonSchema() {
    return {
      type: "object",
      required: ["tenant_id", "title", "code"],
      properties: {
        id: { type: ["string", "number"] },
        tenant_id: { type: ["string", "number"] },
        title: { type: "string", minLength: 1, maxLength: 255 },
        code: { type: "string", minLength: 1, maxLength: 50 },
        description: { type: ["string", "null"] },
        estimated_duration_hours: { type: ["number", "string"], default: 0 },
        status: { type: "string", enum: ["DRAFT", "PUBLISHED", "ARCHIVED"], default: "DRAFT" },
      },
    };
  }

  static override get relationMappings(): RelationMappings {
    return {
      organization: {
        relation: Model.BelongsToOneRelation,
        modelClass: OrganizationModel,
        join: {
          from: "courses.tenant_id",
          to: "organizations.id",
        },
      },
      trainingPrograms: {
        relation: Model.ManyToManyRelation,
        modelClass: TrainingProgramModel,
        join: {
          from: "courses.id",
          through: {
            from: "training_program_courses.course_id",
            to: "training_program_courses.training_program_id",
            extra: ["sequence_order"],
          },
          to: "training_programs.id",
        },
      },
      assessments: {
        relation: Model.HasManyRelation,
        modelClass: AssessmentModel,
        join: {
          from: "courses.id",
          to: "assessments.course_id",
        },
      },
    };
  }
}
