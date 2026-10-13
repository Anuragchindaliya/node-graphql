import { Transaction } from "objection";
import { OrganizationModel } from "../database/models/organization.model.js";
import { BaseRepository } from "./base.repository.js";

export class OrganizationRepository extends BaseRepository<OrganizationModel> {
  constructor() {
    super(OrganizationModel);
  }

  async findBySlug(slug: string, trx?: Transaction): Promise<OrganizationModel | null> {
    const org = await this.model
      .query(trx)
      .where("slug", slug)
      .whereNull("deleted_at")
      .first();
    return org || null;
  }
}
