import {
  CognitoIdentityProviderClient, ListUsersInGroupCommand, AdminCreateUserCommand, AdminAddUserToGroupCommand, AdminDeleteUserCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import type { Member } from '../../shared/types';

export const GROUPS = { admin: 'admins', player: 'players' } as const;

/** Team accounts. Members are Cognito users; their group decides their role. */
export interface MemberStore {
  list(): Promise<Member[]>;
  invite(email: string, role: Member['role']): Promise<void>;
  remove(email: string): Promise<void>;
}

export class MemberExistsError extends Error {}

export class CognitoMembers implements MemberStore {
  private c = new CognitoIdentityProviderClient({});
  constructor(private poolId: string) {}

  async list() {
    const out: Member[] = [];
    for (const role of ['admin', 'player'] as const) {
      let token: string | undefined;
      do {
        const r = await this.c.send(new ListUsersInGroupCommand({ UserPoolId: this.poolId, GroupName: GROUPS[role], NextToken: token }));
        for (const u of r.Users ?? []) {
          out.push({ email: u.Attributes?.find((a) => a.Name === 'email')?.Value ?? u.Username ?? '', role, status: u.UserStatus ?? '', created: u.UserCreateDate?.toISOString() });
        }
        token = r.NextToken;
      } while (token);
    }
    return out.sort((a, b) => a.email.localeCompare(b.email));
  }

  async invite(email: string, role: Member['role']) {
    try {
      await this.c.send(new AdminCreateUserCommand({
        UserPoolId: this.poolId, Username: email, DesiredDeliveryMediums: ['EMAIL'],
        UserAttributes: [{ Name: 'email', Value: email }, { Name: 'email_verified', Value: 'true' }],
      }));
    } catch (e) {
      if ((e as Error).name === 'UsernameExistsException') throw new MemberExistsError();
      throw e;
    }
    await this.c.send(new AdminAddUserToGroupCommand({ UserPoolId: this.poolId, Username: email, GroupName: GROUPS[role] }));
  }

  async remove(email: string) {
    await this.c.send(new AdminDeleteUserCommand({ UserPoolId: this.poolId, Username: email }));
  }
}

/** Local dev only. */
export class MemoryMembers implements MemberStore {
  private m: Member[] = [{ email: 'coach@example.com', role: 'admin', status: 'CONFIRMED' }, { email: 'parent@example.com', role: 'player', status: 'CONFIRMED' }];
  async list() { return [...this.m]; }
  async invite(email: string, role: Member['role']) {
    if (this.m.some((x) => x.email === email)) throw new MemberExistsError();
    this.m.push({ email, role, status: 'FORCE_CHANGE_PASSWORD', created: new Date().toISOString() });
  }
  async remove(email: string) { this.m = this.m.filter((x) => x.email !== email); }
}
