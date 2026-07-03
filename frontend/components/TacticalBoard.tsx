// Prancheta de tática neon sobre preto (seção 11.1): linhas de giz, número de camisa
// em marca d'água e a bola percorrendo a trajetória (SVG path do Template).

export default function TacticalBoard({
  trajectory,
  jersey,
  color,
  foil,
  live,
  hoverPlay,
}: {
  trajectory: string | null;
  jersey: number;
  color: string;
  foil?: boolean;
  live?: boolean;
  hoverPlay?: boolean; // "toca" o lance no hover do card (.group) — glitch + bola + rastro
}) {
  const path = trajectory ?? 'M12,100 Q50,30 88,64';
  const start = path.match(/M\s*([\d.]+)[ ,]+([\d.]+)/);
  const bx = start ? Number(start[1]) : 12;
  const by = start ? Number(start[2]) : 100;
  const gid = `wf-${jersey}-${color.replace('#', '')}`;

  return (
    <svg
      viewBox="0 0 100 125"
      preserveAspectRatio="xMidYMid slice"
      className="h-full w-full"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id={gid} cx="50%" cy="28%" r="85%">
          <stop offset="0%" stopColor={color} stopOpacity="0.26" />
          <stop offset="100%" stopColor="#170b22" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="100" height="125" fill="#170b22" />
      <rect width="100" height="125" fill={`url(#${gid})`} />

      {/* linhas de giz neon */}
      <g stroke="#21d4e0" strokeOpacity="0.16" strokeWidth="0.5" fill="none">
        <line x1="0" y1="62.5" x2="100" y2="62.5" />
        <circle cx="50" cy="62.5" r="13" />
        <rect x="30" y="-8" width="40" height="20" />
        <rect x="30" y="113" width="40" height="20" />
      </g>

      {/* número de camisa (marca d'água) */}
      <text
        x="50"
        y="80"
        textAnchor="middle"
        fontSize="54"
        fontWeight="800"
        fill="#ffffff"
        fillOpacity="0.06"
        fontFamily="system-ui, sans-serif"
      >
        {jersey}
      </text>

      {/* trajetória — com pathLength=1 o dasharray normaliza e o redesenho do hover
          fica em sincronia com a bola (mesma duração/curva) */}
      <path
        d={path}
        pathLength={1}
        fill="none"
        stroke={color}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeOpacity="0.92"
        className={hoverPlay ? 'wf-traj-draw' : undefined}
        style={{
          ...(foil ? { filter: `drop-shadow(0 0 2.5px ${color})` } : undefined),
          ...(hoverPlay ? { strokeDasharray: 1, ['--traj-color' as string]: color } : undefined),
        }}
      />

      {/* bola: no feed ao vivo anima sempre (SMIL); com hoverPlay percorre a
          trajetória via offset-path enquanto o card estiver em hover */}
      {hoverPlay && !live ? (
        <circle
          r="2.4"
          fill="#ffffff"
          className="wf-play-ball"
          style={{ offsetPath: `path("${path}")`, offsetRotate: '0deg' }}
        />
      ) : (
        <circle r="2.4" fill="#ffffff" cx={bx} cy={by}>
          {live && <animateMotion dur="4s" repeatCount="indefinite" path={path} />}
        </circle>
      )}
    </svg>
  );
}
