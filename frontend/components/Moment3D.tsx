'use client';

// 3D Moment (seção 11.7): o Lance como um cubo/slab 3D com moldura neon por raridade.
// Faces: frente = prancheta do lance · lateral = escudo holográfico · lateral 2 = stats ·
// verso = marca wefans. Arraste para girar; auto-rotação no idle (desliga com
// prefers-reduced-motion). Sem post-processing pesado (glow fake por cor).

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

export interface Moment3DData {
  playerName: string;
  club: string;
  jersey: number;
  title: string;
  playType: string;
  matchDate: string;
  competition: string;
  serialLabel: string; // "#12/410" ou "Circulante"
  tierLabel: string;
  tierColor: string;
  trajectory: string | null;
  photoUrl?: string | null; // foto real (frente, quando não há vídeo)
  videoUrl?: string | null; // clipe (frente — VideoTexture)
  crestUrl?: string | null; // escudo real (face lateral)
  stats?: { label: string; value: string }[]; // painel da face Stats (dados da edição)
}

const W = 2.4;
const H = 3.0;
const D = 1.0;

function canvasTexture(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  draw(ctx);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// desenha imagem em modo cover (viés para o topo — rosto do jogador)
function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, w: number, h: number) {
  const ia = img.width / img.height;
  const fa = w / h;
  let sw = img.width;
  let sh = img.height;
  let sx = 0;
  let sy = 0;
  if (ia > fa) {
    sw = img.height * fa;
    sx = (img.width - sw) / 2;
  } else {
    sh = img.width / fa;
    sy = (img.height - sh) / 4;
  }
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
}

function drawFront(ctx: CanvasRenderingContext2D, d: Moment3DData, photo?: HTMLImageElement, expectPhoto = false) {
  const w = 480;
  const h = 600;
  ctx.fillStyle = '#170b22';
  ctx.fillRect(0, 0, w, h);
  if (photo) {
    // foto real como base + gradiente de leitura (a trajetória corre por cima)
    drawCover(ctx, photo, w, h);
    const shade = ctx.createLinearGradient(0, 0, 0, h);
    shade.addColorStop(0, 'rgba(5,5,5,0.22)');
    shade.addColorStop(0.5, 'rgba(5,5,5,0)');
    shade.addColorStop(1, 'rgba(5,5,5,0.8)');
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, w, h);
  } else if (expectPhoto) {
    // foto a caminho: base escura com o glow do tier — nada de prancheta piscando
    const glow = ctx.createRadialGradient(w / 2, h * 0.3, 40, w / 2, h * 0.3, w);
    glow.addColorStop(0, `${d.tierColor}22`);
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);
  } else {
    const glow = ctx.createRadialGradient(w / 2, h * 0.3, 40, w / 2, h * 0.3, w);
    glow.addColorStop(0, `${d.tierColor}33`);
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);

    // linhas de giz
    ctx.strokeStyle = 'rgba(33,212,224,0.22)';
    ctx.lineWidth = 2;
    ctx.strokeRect(w * 0.28, -40, w * 0.44, 110);
    ctx.strokeRect(w * 0.28, h - 70, w * 0.44, 110);
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, 62, 0, Math.PI * 2);
    ctx.stroke();

    // camisa em marca d'água
    ctx.fillStyle = 'rgba(255,255,255,0.07)';
    ctx.font = '900 300px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(String(d.jersey), w / 2, h * 0.66);
  }

  // trajetória neon (Path2D aceita path SVG; espaço 100×125 → escala)
  ctx.save();
  ctx.scale(w / 100, h / 125);
  ctx.lineWidth = 2.2;
  ctx.lineCap = 'round';
  ctx.strokeStyle = d.tierColor;
  ctx.shadowColor = d.tierColor;
  ctx.shadowBlur = 8;
  ctx.stroke(new Path2D(d.trajectory ?? 'M12,100 Q50,30 88,64'));
  ctx.restore();

  // "UI de transmissão": sobrenome + tier
  const lastName = d.playerName.split(' ').slice(-1)[0]?.toUpperCase() ?? '';
  ctx.fillStyle = '#f6eef3';
  ctx.font = '800 44px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(lastName, 24, h - 30);
  ctx.fillStyle = d.tierColor;
  ctx.font = '700 22px system-ui, sans-serif';
  ctx.fillText(d.tierLabel.toUpperCase(), 24, 42);
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(246,238,243,0.8)';
  ctx.font = '600 20px ui-monospace, monospace';
  ctx.fillText(d.serialLabel, w - 22, 42);
}

function drawShield(ctx: CanvasRenderingContext2D, d: Moment3DData, crest?: HTMLImageElement) {
  const w = 200;
  const h = 600;
  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, '#2a1740');
  grad.addColorStop(0.45, d.tierColor);
  grad.addColorStop(0.55, '#ffffff');
  grad.addColorStop(0.65, d.tierColor);
  grad.addColorStop(1, '#170b22');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  // escudo
  ctx.fillStyle = 'rgba(23,11,34,0.72)';
  ctx.beginPath();
  ctx.moveTo(w / 2, 160);
  ctx.lineTo(w / 2 + 58, 190);
  ctx.lineTo(w / 2 + 58, 330);
  ctx.quadraticCurveTo(w / 2 + 58, 420, w / 2, 460);
  ctx.quadraticCurveTo(w / 2 - 58, 420, w / 2 - 58, 330);
  ctx.lineTo(w / 2 - 58, 190);
  ctx.closePath();
  ctx.fill();
  if (crest) {
    const cw = 104;
    const ch = (crest.height / crest.width) * cw;
    ctx.drawImage(crest, w / 2 - cw / 2, 310 - ch / 2, cw, ch);
  } else {
    const initials = d.club.split(' ').map((p) => p[0]).join('').slice(0, 3).toUpperCase();
    ctx.fillStyle = '#f6eef3';
    ctx.font = '900 52px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(initials, w / 2, 330);
  }
}

function drawStats(ctx: CanvasRenderingContext2D, d: Moment3DData) {
  const w = 200;
  const h = 600;
  ctx.fillStyle = '#0c0a12';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = `${d.tierColor}66`;
  ctx.lineWidth = 3;
  ctx.strokeRect(8, 8, w - 16, h - 16);
  // painel deitado (a face é lida com o cubo girado): espaço 600×200
  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = 'left';
  ctx.fillStyle = d.tierColor;
  ctx.font = '800 24px system-ui, sans-serif';
  ctx.fillText('EDIÇÃO', -262, -62);
  const rows = d.stats?.length
    ? d.stats
    : [
        { label: 'Jogada', value: d.playType },
        { label: 'Serial', value: d.serialLabel },
        { label: 'Data', value: new Date(d.matchDate).toLocaleDateString('pt-BR') },
      ];
  const colW = 176;
  rows.slice(0, 6).forEach((r, i) => {
    const x = -262 + (i % 3) * colW;
    const y = i < 3 ? -8 : 62;
    ctx.fillStyle = '#8d8798';
    ctx.font = '700 15px system-ui, sans-serif';
    ctx.fillText(r.label.toUpperCase(), x, y - 26);
    ctx.fillStyle = '#f6eef3';
    ctx.font = '800 24px system-ui, sans-serif';
    ctx.fillText(r.value, x, y);
  });
  ctx.fillStyle = 'rgba(246,238,243,0.45)';
  ctx.font = '600 15px system-ui, sans-serif';
  ctx.fillText(`${d.competition} · ${new Date(d.matchDate).toLocaleDateString('pt-BR')}`, -262, 84);
  ctx.restore();
}

function drawBack(ctx: CanvasRenderingContext2D, d: Moment3DData, crest?: HTMLImageElement) {
  // arte do set (estilo "Video Game Numbers" do Top Shot): grid do tier,
  // serial gigante e a identidade da edição — a marca fica discreta no rodapé
  const w = 480;
  const h = 600;
  ctx.fillStyle = '#08080d';
  ctx.fillRect(0, 0, w, h);

  // grid neon na cor do tier
  ctx.strokeStyle = `${d.tierColor}26`;
  ctx.lineWidth = 1;
  for (let x = 0; x <= w; x += 30) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 0; y <= h; y += 30) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  // horizonte em perspectiva (synthwave sutil)
  const horizon = ctx.createLinearGradient(0, h * 0.55, 0, h);
  horizon.addColorStop(0, 'transparent');
  horizon.addColorStop(1, `${d.tierColor}30`);
  ctx.fillStyle = horizon;
  ctx.fillRect(0, h * 0.55, w, h * 0.45);

  // escudo pequeno no topo
  if (crest) {
    const cw = 64;
    const ch = (crest.height / crest.width) * cw;
    ctx.drawImage(crest, w / 2 - cw / 2, 54 - ch / 2 + 20, cw, ch);
  }

  // tipo da jogada + serial gigante (o número é a estrela da traseira)
  ctx.textAlign = 'center';
  ctx.fillStyle = `${d.tierColor}cc`;
  ctx.font = '800 30px system-ui, sans-serif';
  ctx.fillText(d.playType.toUpperCase(), w / 2, h * 0.36);
  ctx.fillStyle = '#f6eef3';
  ctx.shadowColor = d.tierColor;
  ctx.shadowBlur = 18;
  ctx.font = '900 88px system-ui, sans-serif';
  ctx.fillText(d.serialLabel, w / 2, h * 0.52);
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(246,238,243,0.55)';
  ctx.font = '700 22px system-ui, sans-serif';
  ctx.fillText(d.tierLabel.toUpperCase(), w / 2, h * 0.59);

  // rodapé: marca discreta
  ctx.fillStyle = 'rgba(246,238,243,0.4)';
  ctx.font = '800 20px system-ui, sans-serif';
  ctx.fillText('WEFANS · BRASILEIRÃO 2025', w / 2, h - 34);

  ctx.strokeStyle = `${d.tierColor}55`;
  ctx.lineWidth = 2;
  ctx.strokeRect(20, 20, w - 40, h - 40);
}

// ângulos de cada face (Y): frente levemente angulada (estética Top Shot),
// escudo à esquerda (+90°), stats à direita (−90°), marca atrás (180°)
const FRONT_Y = -0.26;
const FACES = [
  { key: 'lance', label: 'Lance', icon: '▶', y: FRONT_Y },
  { key: 'escudo', label: 'Escudo', icon: '◈', y: Math.PI / 2 - 0.2 },
  { key: 'stats', label: 'Stats', icon: '≡', y: -Math.PI / 2 + 0.2 },
  { key: 'marca', label: 'Marca', icon: 'W', y: Math.PI },
] as const;

export default function Moment3D({ data }: { data: Moment3DData }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const dataRef = useRef(data);
  dataRef.current = data;
  const targetRef = useRef(FRONT_Y);
  const [face, setFace] = useState<string>('lance');

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const d = dataRef.current;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 4 / 5, 0.1, 50);
    camera.position.set(0, 0, 8.2);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    const setSize = () => {
      const w = mount.clientWidth;
      const h = (w * 5) / 4;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    setSize();
    mount.appendChild(renderer.domElement);

    // slab com uma textura por face [right, left, top, bottom, front, back]
    const plain = new THREE.MeshStandardMaterial({ color: 0x15101c });
    const frontTex = canvasTexture(480, 600, (c) => drawFront(c, d, undefined, !!d.photoUrl));
    const shieldTex = canvasTexture(200, 600, (c) => drawShield(c, d));
    let video: HTMLVideoElement | null = null;
    let frontMat: THREE.Material;
    if (d.videoUrl) {
      // frente = clipe tocando (como o Moment do Top Shot)
      video = document.createElement('video');
      video.src = d.videoUrl;
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      video.autoplay = true;
      const vtex = new THREE.VideoTexture(video);
      vtex.colorSpace = THREE.SRGBColorSpace;
      vtex.wrapS = THREE.ClampToEdgeWrapping;
      video.addEventListener('loadedmetadata', () => {
        // center-crop do 16:9 na face 4:5 (cover)
        const va = video!.videoWidth / video!.videoHeight;
        const fa = W / H;
        if (va > fa) {
          vtex.repeat.set(fa / va, 1);
          vtex.offset.set((1 - fa / va) / 2, 0);
        }
      });
      video.play().catch(() => {});
      // poster primeiro: a foto segura a frente até o clipe ter frames prontos
      const basic = new THREE.MeshBasicMaterial({ map: frontTex });
      frontMat = basic;
      video.addEventListener('canplay', () => {
        basic.map = vtex;
        basic.needsUpdate = true;
      });
      if (d.photoUrl) {
        const img = new Image();
        img.onload = () => {
          const c = frontTex.image as HTMLCanvasElement;
          drawFront(c.getContext('2d')!, d, img);
          frontTex.needsUpdate = true;
        };
        img.src = d.photoUrl;
      }
    } else {
      frontMat = new THREE.MeshStandardMaterial({ map: frontTex });
      if (d.photoUrl) {
        const img = new Image();
        img.onload = () => {
          const c = frontTex.image as HTMLCanvasElement;
          drawFront(c.getContext('2d')!, d, img);
          frontTex.needsUpdate = true;
        };
        img.src = d.photoUrl;
      }
    }
    const backTex = canvasTexture(480, 600, (c) => drawBack(c, d));
    if (d.crestUrl) {
      const crest = new Image();
      crest.onload = () => {
        const c = shieldTex.image as HTMLCanvasElement;
        drawShield(c.getContext('2d')!, d, crest);
        shieldTex.needsUpdate = true;
        const b = backTex.image as HTMLCanvasElement;
        drawBack(b.getContext('2d')!, d, crest);
        backTex.needsUpdate = true;
      };
      crest.src = d.crestUrl;
    }
    const mats: THREE.Material[] = [
      new THREE.MeshStandardMaterial({ map: canvasTexture(200, 600, (c) => drawStats(c, d)) }),
      new THREE.MeshStandardMaterial({ map: shieldTex, metalness: 0.6, roughness: 0.3 }),
      plain,
      plain,
      frontMat,
      new THREE.MeshStandardMaterial({ map: backTex }),
    ];
    const group = new THREE.Group();
    group.add(new THREE.Mesh(new THREE.BoxGeometry(W, H, D), mats));

    // moldura neon: 12 barras emissivas nas arestas
    const barMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(d.tierColor) });
    const t = 0.055;
    const mk = (sx: number, sy: number, sz: number, x: number, y: number, z: number) => {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), barMat);
      bar.position.set(x, y, z);
      group.add(bar);
    };
    for (const y of [-H / 2, H / 2])
      for (const z of [-D / 2, D / 2]) mk(W + t, t, t, 0, y, z); // horizontais
    for (const x of [-W / 2, W / 2])
      for (const z of [-D / 2, D / 2]) mk(t, H + t, t, x, 0, z); // verticais
    for (const x of [-W / 2, W / 2])
      for (const y of [-H / 2, H / 2]) mk(t, t, D + t, x, y, 0); // profundidade
    scene.add(group);

    scene.add(new THREE.AmbientLight(0xffffff, 1.15));
    const key = new THREE.PointLight(0xffffff, 22);
    key.position.set(4, 4, 6);
    scene.add(key);
    const rim = new THREE.PointLight(new THREE.Color(d.tierColor), 14);
    rim.position.set(-5, -2, 4);
    scene.add(rim);

    // interação: arrastar gira; no idle o cubo BALANÇA ancorado na frente
    // (a mídia é o herói — nada de girar 360 e mostrar a traseira sozinho)
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    let rotX = -0.08;
    let swayPhase = 0;
    let idleTimer: ReturnType<typeof setTimeout> | null = null;
    const onDown = (e: PointerEvent) => {
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      if (idleTimer) clearTimeout(idleTimer);
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      group.rotation.y += (e.clientX - lastX) * 0.011;
      targetRef.current = group.rotation.y; // segue a mão enquanto arrasta
      rotX = Math.max(-0.9, Math.min(0.9, rotX + (e.clientY - lastY) * 0.006));
      lastX = e.clientX;
      lastY = e.clientY;
    };
    const onUp = () => {
      dragging = false;
      // depois de 2,5s parado, volta suavemente para a frente
      idleTimer = setTimeout(() => (targetRef.current = FRONT_Y), 2500);
    };
    renderer.domElement.style.touchAction = 'none';
    renderer.domElement.style.cursor = 'grab';
    renderer.domElement.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('resize', setSize);

    let raf = 0;
    // entrada cinematográfica: o cubo chega girando da traseira até a frente
    let introT = reduced ? 1 : 0;
    group.rotation.y = reduced ? FRONT_Y : Math.PI + FRONT_Y;
    const tick = () => {
      if (introT < 1) {
        introT = Math.min(1, introT + 0.014);
        const e = 1 - Math.pow(1 - introT, 3); // ease-out cúbico
        group.rotation.y = (Math.PI + FRONT_Y) * (1 - e) + FRONT_Y * e;
        group.scale.setScalar(0.9 + 0.1 * e);
      } else if (!dragging) {
        swayPhase += reduced ? 0 : 0.012;
        const sway = reduced ? 0 : Math.sin(swayPhase) * 0.16;
        const want = targetRef.current + sway;
        // caminho mais curto (evita dar a volta ao voltar de um arrasto longo)
        const delta = ((want - group.rotation.y + Math.PI) % (Math.PI * 2)) - Math.PI;
        group.rotation.y += delta * 0.06;
      }
      group.rotation.x += (rotX - group.rotation.x) * 0.08;
      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      cancelAnimationFrame(raf);
      if (idleTimer) clearTimeout(idleTimer);
      renderer.domElement.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('resize', setSize);
      if (video) {
        video.pause();
        video.removeAttribute('src');
        video.load();
      }
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div>
      <div className="relative">
        {/* palco: glow radial na cor do tier atrás do cubo (canvas é alpha) */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-[-6%]"
          style={{ background: `radial-gradient(58% 48% at 50% 46%, ${data.tierColor}1f, transparent 72%)` }}
        />
        <div
          ref={mountRef}
          className="w-full select-none"
          role="img"
          aria-label={`Cartão 3D do Lance de ${data.playerName} — arraste para girar`}
        />
        {/* chip flutuante: raridade · serial (como o "Rare /249 LE" do Top Shot) */}
        <div className="pointer-events-none absolute left-1/2 top-1 z-10 -translate-x-1/2 whitespace-nowrap rounded-full border border-white/15 bg-black/70 px-3 py-1 text-[11px] font-bold backdrop-blur-sm">
          <span style={{ color: data.tierColor }}>{data.tierLabel}</span>
          <span className="tabular-nums text-white"> · {data.serialLabel}</span>
        </div>
        {/* sombra de chão: assenta o cubo no espaço */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-[12%] -bottom-2 h-8"
          style={{ background: 'radial-gradient(50% 100% at 50% 50%, rgba(0,0,0,.65), transparent 70%)' }}
        />
      </div>

      {/* navegação por faces: clicou, o cubo gira até lá (o arrasto continua livre) */}
      <div className="mt-3 flex items-center justify-center gap-2">
        {FACES.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => {
              targetRef.current = f.y;
              setFace(f.key);
            }}
            aria-label={`Girar para a face ${f.label}`}
            className={`flex h-11 w-9 flex-col items-center justify-center rounded-lg border text-[11px] transition-colors ${
              face === f.key
                ? 'border-white bg-white/10 text-white'
                : 'border-white/15 bg-[#101014] text-neutral-400 hover:border-white/40 hover:text-white'
            }`}
          >
            <span aria-hidden>{f.icon}</span>
            <span className="text-[7px] uppercase tracking-wide">{f.label}</span>
          </button>
        ))}
      </div>
      <p className="mt-2 text-center text-[10px] uppercase tracking-wide text-muted">
        arraste para girar · toque numa face para ir direto
      </p>
    </div>
  );
}
