import { Transaction } from "objection";
import { AuditLogModel } from "../database/models/audit-log.model.js";
import { BaseRepository } from "./base.repository.js";

export class AuditLogRepository extends BaseRepository<AuditLogModel> {
  constructor() {
    super(AuditLogModel);
  }

  async findByEntity(
    tenantId: string,
    entityType: string,
    entityId: string,
    trx?: Transaction
  ): Promise<AuditLogModel[]> {
    return this.model
      .query(trx)
      .where("tenant_id", tenantId)
      .where("entity_type", entityType)
      .where("entity_id", entityId)
      .orderBy("created_at", "desc");
  }
}
