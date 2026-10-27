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

/**
 * Insert simple raw materials straight into the tenant. Used to test list
 * pagination without clicking through 25 create forms.
 */
export async function seedItems(
  slug: string,
  count: number,
  prefix = "Seed item",
): Promise<string[]> {
  return withClient(async (client) => {
    const organization = await client.query(
      'SELECT id FROM "organization" WHERE slug = $1',
      [slug],
    );
    const organizationId = organization.rows[0]?.id as string | undefined;
    if (!organizationId) {
      throw new Error(`No organization with slug "${slug}"`);
    }

    const ids: string[] = [];
    for (let index = 0; index < count; index += 1) {
      const id = `e2e-item-${Date.now()}-${index}`;
      await client.query(
        `INSERT INTO "item"
           ("id", "organizationId", "code", "name", "type", "stockUnitId",
            "vatRate", "defaultChannel", "isPurchasable", "isProduced",
            "isSellable", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, 'RAW_MATERIAL', 'unit_kg',
                 5.50, 'NONE', true, false, false, now(), now())`,
        [id, organizationId, `SEED-${index}`, `${prefix} ${String(index).padStart(2, "0")}`],
      );
      ids.push(id);
    }

    return ids;
  });
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

export async function deleteOrganizationBySlug(slug: string) {
  await withClient((client) =>
    client.query('DELETE FROM "organization" WHERE slug = $1', [slug]),
  );
}

export async function pendingInvitationId(
  email: string,
): Promise<string | null> {
  return withClient(async (client) => {
    const result = await client.query(
      `SELECT id FROM "invitation"
       WHERE email = $1 AND status = 'pending'
       ORDER BY "createdAt" DESC LIMIT 1`,
      [email],
    );

    return result.rows[0]?.id ?? null;
  });
}

export async function organizationDefaults(organizationId: string) {
  return withClient(async (client) => {
    const settings = await client.query(
      'SELECT 1 FROM "organization_setting" WHERE "organizationId" = $1',
      [organizationId],
    );
    const lossReasons = await client.query(
      'SELECT 1 FROM "loss_reason" WHERE "organizationId" = $1',
      [organizationId],
    );

    return {
      settings: settings.rowCount,
      lossReasons: lossReasons.rowCount,
    };
  });
}

export type SalesFacts = {
  orderNumber: string | null;
  orderStatus: string | null;
  orderedQuantity: string | null;
  fulfilledQuantity: string | null;
  dispatchStatus: string | null;
  dailySalesCount: number;
  lotRemaining: string | null;
  dispatchMovement: string | null;
};

export async function salesFacts(slug: string): Promise<SalesFacts> {
  return withClient(async (client) => {
    const order = await client.query(
      `SELECT o.number, o.status,
              ol.quantity::text AS "orderedQuantity",
              ol."fulfilledQuantity"::text AS "fulfilledQuantity"
       FROM "order" o
       JOIN "organization" org ON org.id = o."organizationId"
       JOIN "order_line" ol ON ol."orderId" = o.id
       WHERE org.slug = $1
       ORDER BY o."createdAt" DESC, ol."createdAt" ASC
       LIMIT 1`,
      [slug],
    );
    const dispatch = await client.query(
      `SELECT d.status
       FROM "dispatch" d
       JOIN "organization" org ON org.id = d."organizationId"
       WHERE org.slug = $1
       ORDER BY d."createdAt" DESC
       LIMIT 1`,
      [slug],
    );
    const daily = await client.query(
      `SELECT count(*)::int AS count
       FROM "sales_daily" sd
       JOIN "organization" org ON org.id = sd."organizationId"
       WHERE org.slug = $1`,
      [slug],
    );
    const lot = await client.query(
      `SELECT l."quantityRemaining"::text AS remaining
       FROM "lot" l
       JOIN "organization" org ON org.id = l."organizationId"
       WHERE org.slug = $1
       ORDER BY l."createdAt" ASC
       LIMIT 1`,
      [slug],
    );
    const movement = await client.query(
      `SELECT sm.quantity::text AS quantity
       FROM "stock_movement" sm
       JOIN "organization" org ON org.id = sm."organizationId"
       WHERE org.slug = $1 AND sm.type = 'DISPATCH'
       ORDER BY sm."createdAt" DESC
       LIMIT 1`,
      [slug],
    );

    return {
      orderNumber: order.rows[0]?.number ?? null,
      orderStatus: order.rows[0]?.status ?? null,
      orderedQuantity: order.rows[0]?.orderedQuantity ?? null,
      fulfilledQuantity: order.rows[0]?.fulfilledQuantity ?? null,
      dispatchStatus: dispatch.rows[0]?.status ?? null,
      dailySalesCount: daily.rows[0]?.count ?? 0,
      lotRemaining: lot.rows[0]?.remaining ?? null,
      dispatchMovement: movement.rows[0]?.quantity ?? null,
    };
  });
}
