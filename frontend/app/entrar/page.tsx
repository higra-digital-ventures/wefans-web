'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { login, register } from '@/lib/api-client';

type Mode = 'login' | 'register';

export default function EntrarPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

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

      <div className="mb-6 flex gap-1  border border-line bg-panel p-1">
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
          </div>
        )}

        <div>
          <label className="mb-1 block text-xs uppercase tracking-widest text-muted">Senha</label>
          <input
            type="password"
            required
            minLength={mode === 'register' ? 8 : 1}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={field}
            placeholder={mode === 'register' ? 'mínimo 8 caracteres' : '••••••••'}
          />
        </div>

        {error && (
          <p className="border border-accent/40 bg-accent/10 px-3 py-2 text-sm text-accent">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full  bg-accent py-3 font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {pending ? 'Processando…' : mode === 'login' ? 'Entrar' : 'Criar conta'}
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-muted">
        Contas de teste: <span className="font-mono">colecionador@wefans.test</span> ·{' '}
        <span className="font-mono">wefans123</span>
      </p>
    </main>
  );
}
