/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    // "Pelada" foi renomeada para "Matchday" (ver .claude/DECISIONS.md)
    return [
      { source: '/jogar/pelada', destination: '/jogar/matchday', permanent: true },
      { source: '/jogar/pelada/dia/:id', destination: '/jogar/matchday/dia/:id', permanent: true },
    ];
  },
};

export default nextConfig;
