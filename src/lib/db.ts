import oracledb from 'oracledb'

oracledb.fetchAsString = [oracledb.CLOB]
oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT

const g = globalThis as { __ooci_pool?: Promise<oracledb.Pool> }

function pool() {
  g.__ooci_pool ??= oracledb.createPool({
    user: process.env.ORACLE_USER,
    password: process.env.ORACLE_PASSWORD,
    connectString: process.env.ORACLE_CONNECT_STRING,
    poolMin: 0,
    poolMax: 4,
  })
  return g.__ooci_pool
}

export async function withConn<T>(fn: (c: oracledb.Connection) => Promise<T>): Promise<T> {
  const c = await (await pool()).getConnection()
  try {
    return await fn(c)
  } finally {
    await c.close()
  }
}

export function query<T = Record<string, unknown>>(sql: string, binds: oracledb.BindParameters = {}) {
  return withConn(async (c) => ((await c.execute<T>(sql, binds, { autoCommit: true })).rows ?? []) as T[])
}
