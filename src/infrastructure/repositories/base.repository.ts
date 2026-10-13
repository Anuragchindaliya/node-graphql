import { ModelClass, Transaction, AnyQueryBuilder } from "objection";
import { BaseModel, TenantBaseModel } from "../database/models/base.model.js";

export interface PaginationOptions {
  limit?: number;
  offset?: number;
}

export interface CursorPaginationOptions {
  first?: number;
  after?: string; // Base64 encoded cursor of ID or timestamp
  orderBy?: string;
  orderDirection?: "asc" | "desc";
}

export interface PageInfo {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor?: string;
  endCursor?: string;
  totalCount: number;
}

export interface CursorConnection<T> {
  edges: Array<{
    node: T;
    cursor: string;
  }>;
  pageInfo: PageInfo;
}

export interface OffsetResult<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

export abstract class BaseRepository<T extends BaseModel> {
  constructor(protected readonly model: ModelClass<T>) {}

  async findById(id: string, trx?: Transaction): Promise<T | null> {
    const query = this.model.query(trx).findById(id);
    const result = await query;
    return (result as T) || null;
  }

  async create(data: Partial<T>, trx?: Transaction): Promise<T> {
    const result = await this.model.query(trx).insert(data as any);
    return result as T;
  }

  async update(id: string, data: Partial<T>, trx?: Transaction): Promise<T | null> {
    const result = await this.model.query(trx).patchAndFetchById(id, data as any);
    return (result as T) || null;
  }

  async delete(id: string, trx?: Transaction): Promise<boolean> {
    const rows = await this.model.query(trx).deleteById(id);
    return rows > 0;
  }
}

export abstract class TenantRepository<T extends TenantBaseModel> extends BaseRepository<T> {
  protected defaultQuery(tenantId: string, trx?: Transaction): AnyQueryBuilder {
    return this.model
      .query(trx)
      .where(`${(this.model as any).tableName}.tenant_id`, tenantId)
      .whereNull(`${(this.model as any).tableName}.deleted_at`);
  }

  async findByTenantId(tenantId: string, id: string, trx?: Transaction): Promise<T | null> {
    const result = await this.defaultQuery(tenantId, trx)
      .where(`${(this.model as any).tableName}.id`, id)
      .first();
    return (result as T) || null;
  }

  async findMany(
    tenantId: string,
    filter: Record<string, unknown> = {},
    options: PaginationOptions = {},
    trx?: Transaction
  ): Promise<T[]> {
    const limit = Math.min(options.limit || 50, 100);
    const offset = options.offset || 0;

    let query = this.defaultQuery(tenantId, trx);

    for (const [key, value] of Object.entries(filter)) {
      if (value !== undefined && value !== null) {
        query = query.where(`${(this.model as any).tableName}.${key}`, value as any);
      }
    }

    const results = await query.limit(limit).offset(offset);
    return results as T[];
  }

  async softDelete(tenantId: string, id: string, trx?: Transaction): Promise<boolean> {
    const now = new Date().toISOString().slice(0, 19).replace("T", " ");
    const rows = await this.model
      .query(trx)
      .where(`${(this.model as any).tableName}.tenant_id`, tenantId)
      .where(`${(this.model as any).tableName}.id`, id)
      .whereNull(`${(this.model as any).tableName}.deleted_at`)
      .patch({ deleted_at: now } as any);

    return rows > 0;
  }

  async paginateOffset(
    tenantId: string,
    filter: Record<string, unknown> = {},
    pagination: { page?: number; pageSize?: number } = {},
    trx?: Transaction
  ): Promise<OffsetResult<T>> {
    const page = Math.max(pagination.page || 1, 1);
    const pageSize = Math.min(pagination.pageSize || 20, 100);
    const offset = (page - 1) * pageSize;

    let baseQuery = this.defaultQuery(tenantId, trx);
    for (const [key, value] of Object.entries(filter)) {
      if (value !== undefined && value !== null) {
        baseQuery = baseQuery.where(`${(this.model as any).tableName}.${key}`, value as any);
      }
    }

    const [items, totalResult] = await Promise.all([
      baseQuery.clone().limit(pageSize).offset(offset),
      baseQuery.clone().resultSize(),
    ]);

    return {
      items: items as T[],
      total: totalResult,
      limit: pageSize,
      offset,
    };
  }

  async paginateCursor(
    tenantId: string,
    options: CursorPaginationOptions = {},
    trx?: Transaction
  ): Promise<CursorConnection<T>> {
    const limit = Math.min(options.first || 20, 100);
    const orderBy = options.orderBy || "id";
    const orderDirection = options.orderDirection || "asc";

    let query = this.defaultQuery(tenantId, trx);

    if (options.after) {
      const decodedId = Buffer.from(options.after, "base64").toString("ascii");
      const operator = orderDirection === "asc" ? ">" : "<";
      query = query.where(`${(this.model as any).tableName}.${orderBy}`, operator, decodedId);
    }

    // Query limit + 1 to detect hasNextPage without full count query
    const rows = (await query
      .orderBy(`${(this.model as any).tableName}.${orderBy}`, orderDirection)
      .limit(limit + 1)) as T[];

    const hasNextPage = rows.length > limit;
    const items = hasNextPage ? rows.slice(0, limit) : rows;

    const edges = items.map((item) => ({
      node: item,
      cursor: Buffer.from(String((item as any)[orderBy])).toString("base64"),
    }));

    return {
      edges,
      pageInfo: {
        hasNextPage,
        hasPreviousPage: Boolean(options.after),
        startCursor: edges[0]?.cursor,
        endCursor: edges[edges.length - 1]?.cursor,
        totalCount: items.length,
      },
    };
  }
}
