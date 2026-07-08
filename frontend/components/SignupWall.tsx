import Link from 'next/link';
import Icon from './Icon';

// Parede de cadastro (visitante): fecha as páginas de valor com um convite —
// crie a conta, ganhe o primeiro pacote grátis e desbloqueie o conteúdo.
export default function SignupWall({
  title = 'Tem mais esperando por você',
  hint = 'Crie a conta grátis para explorar tudo — e revele seu primeiro pacote de Momentos por nossa conta.',
}: {
  title?: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl relative overflow-hidden border border-white/10 bg-gradient-to-b from-[#0e0e10] to-[#1a0b2e] p-8 text-center">
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(60% 80% at 50% 0%, rgba(255,46,136,.18), transparent 70%)' }}
      />
      <span className="relative mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-accent">
        <Icon name="lock" size={22} />
      </span>
      <h3 className="relative font-display text-2xl uppercase tracking-tight text-white">{title}</h3>
      <p className="relative mx-auto mt-2 max-w-md text-sm text-neutral-300">{hint}</p>
      <Link
        href="/entrar"
        className="rounded-lg relative mt-5 inline-flex items-center gap-2 bg-accent px-6 py-3 text-[13px] font-bold uppercase tracking-wide text-white transition-opacity hover:opacity-90"
      >
        <Icon name="gift" size={15} />
        Criar conta grátis · ganhar 1º pacote
      </Link>
    </div>
  );
}
