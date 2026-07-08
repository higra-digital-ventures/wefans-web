import Link from 'next/link';
import Icon from './Icon';
import { getMe } from '@/lib/api-server';

// Faixa de conversão para visitantes (deslogados): o gancho do pacote grátis
// em todo o site. Some assim que o usuário loga.
export default async function VisitorBanner() {
  const me = await getMe();
  if (me) return null;
  return (
    <Link
      href="/entrar"
      className="block border-b border-white/10 bg-gradient-to-r from-accent/20 via-accent2/10 to-transparent transition-colors hover:from-accent/25"
    >
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-2 gap-y-1 px-4 py-2 text-[12px] lg:px-6">
        <Icon name="gift" size={15} className="text-accent" />
        <span className="font-bold text-white">Seu primeiro pacote é grátis.</span>
        <span className="text-neutral-300">Crie a conta e revele seus primeiros Momentos numerados.</span>
        <span className="ml-auto rounded-full bg-accent px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
          Criar conta grátis
        </span>
      </div>
    </Link>
  );
}
