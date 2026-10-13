import { Transaction } from "objection";
import { CourseModel } from "../database/models/course.model.js";
import { TenantRepository } from "./base.repository.js";

export class CourseRepository extends TenantRepository<CourseModel> {
  constructor() {
    super(CourseModel);
  }

  async findByCode(tenantId: string, code: string, trx?: Transaction): Promise<CourseModel | null> {
    const course = await this.defaultQuery(tenantId, trx)
      .where("code", code)
      .first();
    return course || null;
  }
}
