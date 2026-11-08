import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { DynamoStore } from './store';
import { route } from './router';

const store = new DynamoStore(process.env.TABLE_NAME!);

export const handler = async (e: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  let body: unknown;
  try { body = e.body ? JSON.parse(e.isBase64Encoded ? Buffer.from(e.body, 'base64').toString() : e.body) : undefined; }
  catch { return { statusCode: 400, body: '{"error":"invalid json"}' }; }
  const r = await route(e.requestContext.http.method, e.rawPath, body, store);
  return { statusCode: r.status, headers: { 'content-type': 'application/json' }, body: JSON.stringify(r.body) };
};
