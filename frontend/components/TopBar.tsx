import { getMe, getTemplatesServer } from '@/lib/api-server';
import NavClient from './NavClient';

export default async function TopBar() {
  const [me, templates] = await Promise.all([
    getMe(),
    getTemplatesServer().catch(() => []),
  ]);

  // "Moments populares" da busca = top 5 por preço médio (ASP)
  const popular = [...templates].sort((a, b) => b.aspCents - a.aspCents).slice(0, 5);

  // "Categorias populares" = jogadores dos populares + um clube + selo de Estreia
  const categories: { label: string; q: string }[] = [];
  for (const t of popular) {
    if (!categories.some((c) => c.label === t.player.name)) {
      categories.push({ label: t.player.name, q: t.player.name });
    }
    if (categories.length >= 3) break;
  }
  const club = popular[0]?.player.club;
  if (club) categories.push({ label: club, q: club });

  return (
    <NavClient
      me={me ? { username: me.username, balanceCents: me.balanceCents, topShotScore: me.topShotScore, isAdmin: me.isAdmin } : null}
      searchPopular={popular}
      searchCategories={categories}
    />
  );
}
