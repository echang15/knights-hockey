import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, PutCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { Collection } from '../../shared/types';

type Item = { id: string; [k: string]: unknown };

export interface Store {
  list(c: Collection): Promise<Item[]>;
  put(c: Collection, item: Item): Promise<void>;
  remove(c: Collection, id: string): Promise<void>;
}

/** Single-table design: pk = collection name, sk = item id. */
export class DynamoStore implements Store {
  private doc = DynamoDBDocumentClient.from(new DynamoDBClient({}));
  constructor(private table: string) {}

  async list(c: Collection) {
    const out: Item[] = [];
    let key: Record<string, unknown> | undefined;
    do {
      const r = await this.doc.send(new QueryCommand({
        TableName: this.table,
        KeyConditionExpression: 'pk = :pk',
        ExpressionAttributeValues: { ':pk': c },
        ExclusiveStartKey: key,
      }));
      for (const i of r.Items ?? []) { const { pk, sk, ...rest } = i; out.push(rest as Item); }
      key = r.LastEvaluatedKey;
    } while (key);
    return out;
  }
  async put(c: Collection, item: Item) {
    await this.doc.send(new PutCommand({ TableName: this.table, Item: { ...item, pk: c, sk: item.id } }));
  }
  async remove(c: Collection, id: string) {
    await this.doc.send(new DeleteCommand({ TableName: this.table, Key: { pk: c, sk: id } }));
  }
}

/** JSON-file store for local development. */
export class FileStore implements Store {
  constructor(private file: string) {}
  private async read(): Promise<Record<Collection, Item[]>> {
    try { return JSON.parse(await fs.readFile(this.file, 'utf8')); }
    catch { return { players: [], games: [], posts: [], checkins: [], albums: [], media: [] }; }
  }
  private async write(d: Record<Collection, Item[]>) {
    await fs.mkdir(path.dirname(this.file), { recursive: true });
    await fs.writeFile(this.file, JSON.stringify(d, null, 2));
  }
  async list(c: Collection) { return (await this.read())[c] ?? []; }
  async put(c: Collection, item: Item) {
    const d = await this.read();
    d[c] = [...(d[c] ?? []).filter((i) => i.id !== item.id), item];
    await this.write(d);
  }
  async remove(c: Collection, id: string) {
    const d = await this.read();
    d[c] = (d[c] ?? []).filter((i) => i.id !== id);
    await this.write(d);
  }
}
