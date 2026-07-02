import { getMe } from '@/lib/api-server';
import NavClient from './NavClient';

export default async function TopBar() {
  const me = await getMe();
  return (
    <NavClient
      me={me ? { username: me.username, balanceCents: me.balanceCents, isAdmin: me.isAdmin } : null}
    />
  );
}
