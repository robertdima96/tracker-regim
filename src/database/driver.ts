export type SqlRow = Record<string, unknown>

export interface SqlDriver {
  execute(sql: string, params?: unknown[]): Promise<void>
  query<T extends SqlRow = SqlRow>(sql: string, params?: unknown[]): Promise<T[]>
}
