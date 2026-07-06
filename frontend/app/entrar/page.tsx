'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { checkUsername, login, register } from '@/lib/api-client';
import Icon from '@/components/Icon';

type Mode = 'login' | 'register';

export default function EntrarPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [avail, setAvail] = useState<'idle' | 'checking' | 'free' | 'taken'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [hasNext, setHasNext] = useState(false);

  // veio de uma página protegida? (?next=) — mensagem de contexto
  useEffect(() => {
    setHasNext(!!new URLSearchParams(window.location.search).get('next'));
  }, []);

  // disponibilidade do usuário em tempo real (debounce 500ms)
  useEffect(() => {
    if (mode !== 'register' || username.length < 3) {
      setAvail('idle');
      return;
    }
    setAvail('checking');
    const t = setTimeout(() => {
      checkUsername(username)
        .then((free) => setAvail(free ? 'free' : 'taken'))
        .catch(() => setAvail('idle'));
    }, 500);
    return () => clearTimeout(t);
  }, [mode, username]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        if (mode === 'login') {
          await login(email, password);
          // volta para onde o usuário estava (ex.: /momento/x) — preview sem login
          const next = new URLSearchParams(window.location.search).get('next');
          router.push(next && next.startsWith('/') ? next : '/perfil');
        } else {
          await register(email, username, password);
          router.push('/bem-vindo'); // tour de boas-vindas do novo colecionador
        }
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Falha na autenticação');
      }
    });
  }

  const tab = (m: Mode, label: string) => (
    <button
      type="button"
      onClick={() => {
        setMode(m);
        setError(null);
      }}
      className={`flex-1  py-2 text-sm font-semibold transition-colors ${
        mode === m ? 'bg-panel2 text-ink' : 'text-muted hover:text-ink'
      }`}
    >
      {label}
    </button>
  );

  const field =
    'w-full  border border-line bg-panel2 px-3 py-2.5 text-ink outline-none placeholder:text-muted/60 focus:border-accent/60';

  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <h1 className="mb-2 font-display text-4xl uppercase text-ink">
        {mode === 'login' ? 'Entrar' : 'Criar conta'}
      </h1>
      <p className="mb-8 text-muted">Sua carteira de Lances começa aqui.</p>
      {hasNext && mode === 'login' && (
        <p className="rounded-lg mb-6 border border-accent3/30 bg-accent3/5 px-3 py-2 text-[13px] text-accent3">
          Entre para continuar de onde você parou — a página te espera.
        </p>
      )}

      <div className="rounded-2xl mb-6 flex gap-1  border border-line bg-panel p-1">
        {tab('login', 'Entrar')}
        {tab('register', 'Cadastrar')}
      </div>

      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="mb-1 block text-xs uppercase tracking-widest text-muted">E-mail</label>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={field}
            placeholder="voce@exemplo.com"
          />
        </div>

        {mode === 'register' && (
          <div>
            <label className="mb-1 block text-xs uppercase tracking-widest text-muted">Usuário</label>
            <input
              type="text"
              required
              minLength={3}
              maxLength={24}
              pattern="[a-zA-Z0-9_]+"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={field}
              placeholder="seu_usuario"
            />
            {avail === 'checking' && <p className="mt-1 text-xs text-neutral-500">verificando…</p>}
            {avail === 'free' && (
              <p className="mt-1 text-xs font-semibold text-emerald-400">✓ @{username} está disponível</p>
            )}
            {avail === 'taken' && (
              <p className="mt-1 text-xs font-semibold text-red-400">@{username} já está em uso</p>
            )}
          </div>
        )}

        <div>
          <label className="mb-1 block text-xs uppercase tracking-widest text-muted">Senha</label>
          <div className="relative">
            <input
              type={showPass ? 'text' : 'password'}
              required
              minLength={mode === 'register' ? 8 : 1}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${field} pr-11`}
              placeholder={mode === 'register' ? 'mínimo 8 caracteres' : '••••••••'}
            />
            <button
              type="button"
              aria-label={showPass ? 'Ocultar senha' : 'Mostrar senha'}
              title={showPass ? 'Ocultar senha' : 'Mostrar senha'}
              onClick={() => setShowPass(!showPass)}
              className={`absolute right-3 top-1/2 -translate-y-1/2 transition-colors ${showPass ? 'text-white' : 'text-neutral-500 hover:text-white'}`}
            >
              <Icon name="eye" size={18} />
            </button>
          </div>
        </div>

        {error && (
          <p className="rounded-lg border border-accent/40 bg-accent/10 px-3 py-2 text-sm text-accent">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="rounded-lg w-full  bg-accent py-3 font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {pending ? 'Processando…' : mode === 'login' ? 'Entrar' : 'Criar conta'}
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-muted">
        Contas de teste: <span className="tabular-nums">colecionador@wefans.test</span> ·{' '}
        <span className="tabular-nums">wefans123</span>
      </p>
    </main>
  );
}
