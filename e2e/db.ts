import { Client } from "pg";

function getConnectionString() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  return connectionString;
}

async function withClient<T>(callback: (client: Client) => Promise<T>) {
  const client = new Client({ connectionString: getConnectionString() });
  await client.connect();

  try {
    return await callback(client);
  } finally {
    await client.end();
  }
}

export async function deleteE2EUsers() {
  await withClient((client) =>
    client.query(`DELETE FROM "user" WHERE email LIKE 'e2e-%@example.com'`),
  );
}

export async function deleteUserByEmail(email: string) {
  await withClient((client) =>
    client.query('DELETE FROM "user" WHERE email = $1', [email]),
  );
}

export async function userExists(email: string) {
  const result = await withClient((client) =>
    client.query('SELECT 1 FROM "user" WHERE email = $1', [email]),
  );

  return result.rowCount === 1;
}
