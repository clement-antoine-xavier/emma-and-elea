import {headers} from "next/headers";
import {verifyOAuthQueryParams} from "@better-auth/oauth-provider";
import {auth} from "@/lib/auth";

/**
 * Verifies the signed authorization query the provider hands to `/consent`.
 * The signature check rejects modified or expired queries; it does not check
 * the client, the session or the scopes, which the page does separately.
 */
export async function verifyConsentQuery(query: string): Promise<boolean> {
  const {secret} = await auth.$context;

  return verifyOAuthQueryParams(query, secret);
}

export type PublicOAuthClient = {
  id: string;
  name: string;
  uri: string | null;
};

/** Public fields of a registered client, for display on the consent screen. */
export async function getPublicOAuthClient(
  clientId: string,
): Promise<PublicOAuthClient | null> {
  try {
    const client = await auth.api.getOAuthClientPublic({
      query: {client_id: clientId},
      headers: await headers(),
    });

    return {
      id: client.client_id ?? clientId,
      name: client.client_name ?? client.client_id ?? clientId,
      uri: client.client_uri ?? null,
    };
  } catch {
    return null;
  }
}
