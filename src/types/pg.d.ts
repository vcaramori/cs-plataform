declare module 'pg' {
  export class Pool {
    constructor(config?: { connectionString?: string })
    connect(): Promise<{
      query(sql: string, values?: unknown[]): Promise<unknown>
      release(): void
    }>
    end(): Promise<void>
  }
}
