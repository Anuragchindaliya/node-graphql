import { Model, RelationMappings } from "objection";
import { BaseModel, TenantBaseModel } from "./base.model.js";
import { OrganizationModel } from "./organization.model.js";
import { CourseModel } from "./course.model.js";
import { UserModel } from "./user.model.js";

export class AssessmentModel extends TenantBaseModel {
  static override tableName = "assessments";

  course_id?: string | null;
  title!: string;
  pass_percentage!: number;
  time_limit_minutes!: number;

  organization?: OrganizationModel;
  course?: CourseModel | null;
  questions?: AssessmentQuestionModel[];
  attempts?: AssessmentAttemptModel[];

  static override get relationMappings(): RelationMappings {
    return {
      organization: {
        relation: Model.BelongsToOneRelation,
        modelClass: OrganizationModel,
        join: {
          from: "assessments.tenant_id",
          to: "organizations.id",
        },
      },
      course: {
        relation: Model.BelongsToOneRelation,
        modelClass: CourseModel,
        join: {
          from: "assessments.course_id",
          to: "courses.id",
        },
      },
      questions: {
        relation: Model.HasManyRelation,
        modelClass: AssessmentQuestionModel,
        join: {
          from: "assessments.id",
          to: "assessment_questions.assessment_id",
        },
      },
      attempts: {
        relation: Model.HasManyRelation,
        modelClass: AssessmentAttemptModel,
        join: {
          from: "assessments.id",
          to: "assessment_attempts.assessment_id",
        },
      },
    };
  }
}

export class AssessmentQuestionModel extends BaseModel {
  static override tableName = "assessment_questions";

  assessment_id!: string;
  question_text!: string;
  points!: number;
  question_type!: "SINGLE_CHOICE" | "MULTIPLE_CHOICE";

  assessment?: AssessmentModel;
  options?: AssessmentOptionModel[];

  static override get relationMappings(): RelationMappings {
    return {
      assessment: {
        relation: Model.BelongsToOneRelation,
        modelClass: AssessmentModel,
        join: {
          from: "assessment_questions.assessment_id",
          to: "assessments.id",
        },
      },
      options: {
        relation: Model.HasManyRelation,
        modelClass: AssessmentOptionModel,
        join: {
          from: "assessment_questions.id",
          to: "assessment_options.question_id",
        },
      },
    };
  }
}

export class AssessmentOptionModel extends BaseModel {
  static override tableName = "assessment_options";

  question_id!: string;
  option_text!: string;
  is_correct!: boolean;

  question?: AssessmentQuestionModel;

  static override get relationMappings(): RelationMappings {
    return {
      question: {
        relation: Model.BelongsToOneRelation,
        modelClass: AssessmentQuestionModel,
        join: {
          from: "assessment_options.question_id",
          to: "assessment_questions.id",
        },
      },
    };
  }
}

export class AssessmentAttemptModel extends TenantBaseModel {
  static override tableName = "assessment_attempts";

  assessment_id!: string;
  user_id!: string;
  score?: number | null;
  passed?: boolean | null;
  status!: "IN_PROGRESS" | "SUBMITTED" | "GRADED";
  started_at!: string;
  submitted_at?: string | null;

  assessment?: AssessmentModel;
  user?: UserModel;
  answers?: AssessmentAnswerModel[];

  static override get relationMappings(): RelationMappings {
    return {
      assessment: {
        relation: Model.BelongsToOneRelation,
        modelClass: AssessmentModel,
        join: {
          from: "assessment_attempts.assessment_id",
          to: "assessments.id",
        },
      },
      user: {
        relation: Model.BelongsToOneRelation,
        modelClass: UserModel,
        join: {
          from: "assessment_attempts.user_id",
          to: "users.id",
        },
      },
      answers: {
        relation: Model.HasManyRelation,
        modelClass: AssessmentAnswerModel,
        join: {
          from: "assessment_attempts.id",
          to: "assessment_answers.attempt_id",
        },
      },
    };
  }
}

export class AssessmentAnswerModel extends BaseModel {
  static override tableName = "assessment_answers";

  attempt_id!: string;
  question_id!: string;
  selected_option_id?: string | null;
  is_correct?: boolean | null;
  points_awarded!: number;

  attempt?: AssessmentAttemptModel;
  question?: AssessmentQuestionModel;
  selectedOption?: AssessmentOptionModel | null;

  static override get relationMappings(): RelationMappings {
    return {
      attempt: {
        relation: Model.BelongsToOneRelation,
        modelClass: AssessmentAttemptModel,
        join: {
          from: "assessment_answers.attempt_id",
          to: "assessment_attempts.id",
        },
      },
      question: {
        relation: Model.BelongsToOneRelation,
        modelClass: AssessmentQuestionModel,
        join: {
          from: "assessment_answers.question_id",
          to: "assessment_questions.id",
        },
      },
      selectedOption: {
        relation: Model.BelongsToOneRelation,
        modelClass: AssessmentOptionModel,
        join: {
          from: "assessment_answers.selected_option_id",
          to: "assessment_options.id",
        },
      },
    };
  }
}
