import { Model, ModelOptions, QueryContext } from "objection";

export abstract class BaseModel extends Model {
  id!: string;
  created_at!: string;
  updated_at?: string;

  static override get idColumn(): string {
    return "id";
  }

  override $beforeInsert(_context: QueryContext): void {
    const now = new Date().toISOString().slice(0, 19).replace("T", " ");
    this.created_at = this.created_at || now;
    this.updated_at = this.updated_at || now;
  }

  override $beforeUpdate(_opt: ModelOptions, _context: QueryContext): void {
    this.updated_at = new Date().toISOString().slice(0, 19).replace("T", " ");
  }
}

export abstract class TenantBaseModel extends BaseModel {
  tenant_id!: string;
  deleted_at?: string | null;

  get isDeleted(): boolean {
    return this.deleted_at !== null && this.deleted_at !== undefined;
  }
}
