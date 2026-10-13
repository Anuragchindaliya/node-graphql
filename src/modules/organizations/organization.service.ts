import { OrganizationRepository } from "../../infrastructure/repositories/organization.repository.js";
import { OrganizationModel } from "../../infrastructure/database/models/organization.model.js";
import { NotFoundError } from "../../core/errors/app-error.js";

export class OrganizationService {
  constructor(private readonly orgRepo: OrganizationRepository = new OrganizationRepository()) {}

  async getById(id: string): Promise<OrganizationModel> {
    const org = await this.orgRepo.findById(id);
    if (!org || org.deleted_at) {
      throw new NotFoundError(`Organization with ID '${id}' not found`);
    }
    return org;
  }

  async getAll(): Promise<OrganizationModel[]> {
    const orgs = await OrganizationModel.query().whereNull("deleted_at");
    return orgs;
  }

  async getBySlug(slug: string): Promise<OrganizationModel> {
    const org = await this.orgRepo.findBySlug(slug);
    if (!org) {
      throw new NotFoundError(`Organization with slug '${slug}' not found`);
    }
    return org;
  }
}

export const organizationService = new OrganizationService();
