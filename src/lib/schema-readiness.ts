type QueryClient = {
  $queryRawUnsafe: <T = unknown>(query: string, ...values: unknown[]) => Promise<T>;
};

const SAFE_IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;

function assertSafeTableName(table: string): void {
  if (!SAFE_IDENTIFIER.test(table)) {
    throw new Error(`Unsafe table identifier: ${table}`);
  }
}

export async function findMissingTables(client: QueryClient, tables: string[]): Promise<string[]> {
  const uniqueTables = [...new Set(tables)];
  const missing: string[] = [];

  for (const table of uniqueTables) {
    assertSafeTableName(table);
    const schemaQualified = `public."${table}"`;
    const rows = await client.$queryRawUnsafe<Array<{ regclass: string | null }>>(
      "SELECT to_regclass($1)::text AS regclass",
      schemaQualified
    );

    if (!rows[0]?.regclass) {
      missing.push(table);
    }
  }

  return missing;
}
