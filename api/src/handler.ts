import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda';
import type { Role } from '../../shared/types';
import { DynamoStore } from './store';
import { route, type Ctx } from './router';
import { S3PhotoStore } from './photos';
import { S3GalleryStore } from './gallery';
import { CognitoMembers, GROUPS } from './members';

const base = {
  store: new DynamoStore(process.env.TABLE_NAME!),
  photos: new S3PhotoStore(process.env.PHOTO_BUCKET!),
  gallery: new S3GalleryStore(process.env.GALLERY_BUCKET!),
  members: new CognitoMembers(process.env.USER_POOL_ID!),
};

/** API Gateway has already verified the JWT's signature/expiry/audience; we only read the group claim. */
function callerOf(claims: Record<string, unknown> | undefined): { caller: Role; email?: string } {
  if (!claims) return { caller: 'guest' };
  const raw = claims['cognito:groups'];
  const groups = (Array.isArray(raw) ? raw.map(String) : String(raw ?? '').replace(/[\[\]"]/g, '').split(/[\s,]+/)).filter(Boolean);
  const caller: Role = groups.includes(GROUPS.admin) ? 'admin' : groups.includes(GROUPS.player) ? 'player' : 'guest';
  return { caller, email: typeof claims.email === 'string' ? claims.email : undefined };
}

export const handler = async (e: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<APIGatewayProxyResultV2> => {
  let body: unknown;
  try { body = e.body ? JSON.parse(e.isBase64Encoded ? Buffer.from(e.body, 'base64').toString() : e.body) : undefined; }
  catch { return { statusCode: 400, body: '{"error":"invalid json"}' }; }
  const ctx: Ctx = { ...base, ...callerOf(e.requestContext.authorizer?.jwt?.claims) };
  const r = await route(e.requestContext.http.method, e.rawPath, body, ctx);
  return { statusCode: r.status, headers: { 'content-type': 'application/json', 'cache-control': 'private, no-store' }, body: JSON.stringify(r.body) };
};
