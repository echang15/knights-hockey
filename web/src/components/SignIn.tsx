import { useState, type FormEvent } from 'react';
import { completeNewPassword, signIn } from '../auth';

/** Member sign-in. Invited members arrive with a temporary password and are asked to choose their own. */
export function SignIn({ title = 'Member sign-in', note }: { title?: string; note?: string }) {
  const [step, setStep] = useState<'login' | 'new-password'>('login');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setErr(''); setBusy(true);
    try {
      if (step === 'login') { if ((await signIn(String(f.get('u')).trim().toLowerCase(), String(f.get('p')))) === 'new-password') setStep('new-password'); }
      else {
        const a = String(f.get('n1')), b = String(f.get('n2'));
        if (a !== b) throw new Error('Passwords do not match');
        if (a.length < 8) throw new Error('Use at least 8 characters');
        await completeNewPassword(a);
      }
    } catch (x) { setErr((x as Error).message); }
    setBusy(false);
  };

  return (
    <form onSubmit={submit} className="card form narrow">
      <h2>{step === 'login' ? title : 'Choose a new password'}</h2>
      {note && step === 'login' && <p className="muted">{note}</p>}
      {step === 'login' ? (
        <>
          <label>Email<input name="u" type="email" autoComplete="username" required /></label>
          <label>Password<input name="p" type="password" autoComplete="current-password" required /></label>
        </>
      ) : (
        <>
          <p className="muted">Welcome! Pick a password for your account (8+ characters, with upper & lower case and a number).</p>
          <label>New password<input name="n1" type="password" autoComplete="new-password" required /></label>
          <label>Repeat it<input name="n2" type="password" autoComplete="new-password" required /></label>
        </>
      )}
      {err && <p className="error">{err}</p>}
      <button className="btn" disabled={busy}>{step === 'login' ? 'Sign in' : 'Save password'}</button>
    </form>
  );
}
