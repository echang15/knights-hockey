import { CognitoUserPool, CognitoUser, AuthenticationDetails } from 'amazon-cognito-identity-js';
import { config } from './config';

let idToken: string | null = sessionStorage.getItem('idToken');
const pool = () => new CognitoUserPool({ UserPoolId: config.userPoolId!, ClientId: config.clientId! });

export const isLocalDev = () => !config.userPoolId;
export const isSignedIn = () => isLocalDev() || !!idToken;
export const authHeader = (): Record<string, string> => (idToken ? { Authorization: idToken } : {});

export function signIn(username: string, password: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const user = new CognitoUser({ Username: username, Pool: pool() });
    user.authenticateUser(new AuthenticationDetails({ Username: username, Password: password }), {
      onSuccess: (s) => { idToken = s.getIdToken().getJwtToken(); sessionStorage.setItem('idToken', idToken); resolve(); },
      onFailure: reject,
      newPasswordRequired: () => reject(new Error('Password change required — set a permanent password with the AWS CLI (see README).')),
    });
  });
}
export function signOut() { idToken = null; sessionStorage.removeItem('idToken'); }
