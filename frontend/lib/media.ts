// Espelho do slug usado pelo script de coleta de mídia (arquivos em /public).
export function mediaSlug(name: string) {
  return name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/** Escudo do clube em /public/clubs (os 20 da Série A estão baixados). */
export const clubCrestUrl = (club: string) => `/clubs/${mediaSlug(club)}.png`;
