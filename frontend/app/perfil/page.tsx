import { redirect } from 'next/navigation';
import { getMe, getTeamsServer, getWalletServer } from '@/lib/api-server';
import PerfilClient from '@/components/PerfilClient';

export const dynamic = 'force-dynamic';

export default async function PerfilPage() {
  const me = await getMe();
  if (!me) redirect('/entrar');

  const [wallet, teams] = await Promise.all([getWalletServer(), getTeamsServer()]);

  return <PerfilClient me={me} wallet={wallet} teams={teams} />;
}
