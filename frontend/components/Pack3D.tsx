'use client';

// Pacote 3D lacrado (paridade com a caixa do Top Shot): uma bolsa foil holográfica
// que flutua e gira no idle, com gaiola de LED nos cantos. Quando `tearing` vira
// true, ela explode — escala, gira rápido, um flash branco bloom toma o centro e
// raios de luz disparam — cobrindo a troca para a revelação das cartas.
// Mistério: sem raridade definida antes de abrir → o foil e a gaiola ciclam o matiz.

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

export interface Pack3DProps {
  tearing?: boolean; // dispara a animação de rasgo/explosão
  accent?: string | null; // cor fixa da gaiola/foil; null = ciclo de matiz (mistério)
  name?: string; // nome do pacote (ex.: "Rookie Pack")
  label?: string; // etiqueta superior (ex.: "PACOTE DE MOMENTOS")
  count?: number; // nº de momentos — carimbo no verso
}

const W = 2.15;
const H = 3.15;
const D = 0.34;

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

function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, weight: number, baseSize: number, minSize: number) {
  let size = baseSize;
  ctx.font = `${weight} ${size}px system-ui, sans-serif`;
  while (size > minSize && ctx.measureText(text).width > maxWidth) {
    size -= 2;
    ctx.font = `${weight} ${size}px system-ui, sans-serif`;
  }
  return size;
}

// arte da frente do pacote: fundo escuro, bandas holográficas, marca wefans,
// emblema central (bola/estrela), faixa de raspadinha e rodapé da edição.
function drawPackFront(ctx: CanvasRenderingContext2D, name: string, label: string) {
  const w = 480;
  const h = 704;
  // base
  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, '#120a1e');
  bg.addColorStop(0.5, '#0a0710');
  bg.addColorStop(1, '#0e1224');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // bandas holográficas diagonais (o brilho real vem do sheen aditivo por cima)
  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.rotate(-0.5);
  const cols = ['#ff2e88', '#ff9e2c', '#21d4e0', '#9d4edd', '#ff2e88'];
  for (let i = -6; i < 6; i++) {
    ctx.fillStyle = `${cols[(i + 6) % cols.length]}14`;
    ctx.fillRect(i * 70, -h, 40, h * 2);
  }
  ctx.restore();

  // moldura interna
  ctx.strokeStyle = 'rgba(255,255,255,0.14)';
  ctx.lineWidth = 2;
  ctx.strokeRect(20, 20, w - 40, h - 40);

  // faixa de raspadinha no topo (sinaliza "abra aqui")
  ctx.strokeStyle = 'rgba(255,255,255,0.4)';
  ctx.setLineDash([9, 9]);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(30, 96);
  ctx.lineTo(w - 30, 96);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = '700 15px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('ABRA AQUI', w / 2, 62);

  // marca wefans
  ctx.fillStyle = '#f7f7f8';
  ctx.font = '900 58px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('wefans', w / 2, 190);
  ctx.fillStyle = 'rgba(247,247,248,0.6)';
  ctx.font = '700 17px system-ui, sans-serif';
  ctx.fillText(label.toUpperCase(), w / 2, 220);

  // emblema central: bola estilizada dentro de um anel neon
  const cx = w / 2;
  const cy = 400;
  const glow = ctx.createRadialGradient(cx, cy, 8, cx, cy, 150);
  glow.addColorStop(0, 'rgba(255,255,255,0.28)');
  glow.addColorStop(0.5, 'rgba(157,78,221,0.18)');
  glow.addColorStop(1, 'transparent');
  ctx.fillStyle = glow;
  ctx.fillRect(cx - 160, cy - 160, 320, 320);
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(cx, cy, 96, 0, Math.PI * 2);
  ctx.stroke();
  // costura da bola (pentágonos simplificados)
  ctx.fillStyle = 'rgba(247,247,248,0.92)';
  ctx.beginPath();
  ctx.arc(cx, cy, 30, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(247,247,248,0.5)';
  ctx.lineWidth = 3;
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * 30, cy + Math.sin(a) * 30);
    ctx.lineTo(cx + Math.cos(a) * 72, cy + Math.sin(a) * 72);
    ctx.stroke();
  }

  // nome do pacote
  ctx.fillStyle = '#f7f7f8';
  fitText(ctx, name, w - 90, 900, 46, 24);
  ctx.textAlign = 'center';
  ctx.fillText(name, w / 2, 560);

  // rodapé
  ctx.fillStyle = 'rgba(247,247,248,0.45)';
  ctx.font = '800 18px system-ui, sans-serif';
  ctx.fillText('BRASILEIRÃO 2025 · SELADO', w / 2, h - 44);
}

function drawPackBack(ctx: CanvasRenderingContext2D, count: number) {
  const w = 480;
  const h = 704;
  ctx.fillStyle = '#08080d';
  ctx.fillRect(0, 0, w, h);
  // grid neon
  ctx.strokeStyle = 'rgba(157,78,221,0.16)';
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
  ctx.strokeStyle = 'rgba(255,255,255,0.14)';
  ctx.lineWidth = 2;
  ctx.strokeRect(20, 20, w - 40, h - 40);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#f7f7f8';
  ctx.font = '900 42px system-ui, sans-serif';
  ctx.fillText('wefans', w / 2, h * 0.4);
  ctx.fillStyle = 'rgba(247,247,248,0.7)';
  ctx.font = '800 30px system-ui, sans-serif';
  ctx.fillText(`${count} MOMENTOS`, w / 2, h * 0.5);
  ctx.fillStyle = 'rgba(247,247,248,0.4)';
  ctx.font = '600 17px system-ui, sans-serif';
  ctx.fillText('numerados · colecionáveis', w / 2, h * 0.56);
}

export default function Pack3D({ tearing = false, accent = null, name = 'Pacote', label = 'Pacote de Momentos', count = 3 }: Pack3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const shadowRef = useRef<HTMLDivElement>(null);
  const tearingRef = useRef(tearing);
  tearingRef.current = tearing;
  const [glFailed, setGlFailed] = useState(false);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 3 / 4, 0.1, 50);
    camera.position.set(0, 0, 8);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      setGlFailed(true);
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    const setSize = () => {
      const w = mount.clientWidth;
      const h = w * 1.16;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    setSize();
    mount.appendChild(renderer.domElement);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTex = pmrem.fromScene(new RoomEnvironment()).texture;
    scene.environment = envTex;
    pmrem.dispose();

    // caixa do pacote: frente/verso com arte, laterais foil metálico
    const foilSide = new THREE.MeshStandardMaterial({ color: 0x2a2140, metalness: 0.9, roughness: 0.25 });
    const frontTex = canvasTexture(960, 1408, (c) => {
      c.scale(2, 2);
      drawPackFront(c, name, label);
    });
    const backTex = canvasTexture(960, 1408, (c) => {
      c.scale(2, 2);
      drawPackBack(c, count);
    });
    const mats: THREE.Material[] = [
      foilSide,
      foilSide,
      foilSide,
      foilSide,
      new THREE.MeshStandardMaterial({ map: frontTex, metalness: 0.55, roughness: 0.32 }),
      new THREE.MeshStandardMaterial({ map: backTex, metalness: 0.55, roughness: 0.4 }),
    ];
    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    for (const m of mats) {
      const std = m as THREE.MeshStandardMaterial;
      if (std.map) std.map.anisotropy = maxAniso;
      std.envMapIntensity = 0.5;
    }
    const group = new THREE.Group();
    group.add(new THREE.Mesh(new THREE.BoxGeometry(W, H, D), mats));

    // sheen holográfico varrendo a frente (paridade com o foil do Momento)
    const sheenTex = canvasTexture(256, 256, (c) => {
      const g = c.createLinearGradient(0, 256, 256, 0);
      g.addColorStop(0.36, 'rgba(0,0,0,0)');
      g.addColorStop(0.46, 'rgba(255,46,136,0.4)');
      g.addColorStop(0.5, 'rgba(255,255,255,0.6)');
      g.addColorStop(0.54, 'rgba(33,212,224,0.4)');
      g.addColorStop(0.64, 'rgba(0,0,0,0)');
      c.fillStyle = g;
      c.fillRect(0, 0, 256, 256);
    });
    sheenTex.wrapS = THREE.RepeatWrapping;
    sheenTex.wrapT = THREE.RepeatWrapping;
    const sheen = new THREE.Mesh(
      new THREE.PlaneGeometry(W, H),
      new THREE.MeshBasicMaterial({ map: sheenTex, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    sheen.position.z = D / 2 + 0.012;
    group.add(sheen);
    scene.add(group);

    // gaiola de LED nos 8 cantos (mistério = ciclo de matiz quando não há accent)
    const cage = new THREE.Group();
    const fixed = accent ? new THREE.Color(accent).lerp(new THREE.Color('#ffffff'), 0.3) : null;
    const cageMat = new THREE.MeshBasicMaterial({ color: (fixed ?? new THREE.Color('#ffffff')).clone() });
    const CW = 3.1;
    const CH = 4.1;
    const CD = 1.9;
    const armLen = 0.5;
    const armTk = 0.05;
    for (const sx of [-1, 1])
      for (const sy of [-1, 1])
        for (const sz of [-1, 1]) {
          const cx = (sx * CW) / 2;
          const cy = (sy * CH) / 2;
          const cz = (sz * CD) / 2;
          const armX = new THREE.Mesh(new THREE.BoxGeometry(armLen, armTk, armTk), cageMat);
          armX.position.set(cx - (sx * armLen) / 2, cy, cz);
          const armY = new THREE.Mesh(new THREE.BoxGeometry(armTk, armLen, armTk), cageMat);
          armY.position.set(cx, cy - (sy * armLen) / 2, cz);
          const armZ = new THREE.Mesh(new THREE.BoxGeometry(armTk, armTk, armLen), cageMat);
          armZ.position.set(cx, cy, cz - (sz * armLen) / 2);
          cage.add(armX, armY, armZ);
        }
    const glowTex = canvasTexture(128, 128, (c) => {
      const g = c.createRadialGradient(64, 64, 4, 64, 64, 62);
      g.addColorStop(0, 'rgba(255,255,255,0.9)');
      g.addColorStop(0.4, 'rgba(255,255,255,0.35)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = g;
      c.fillRect(0, 0, 128, 128);
    });
    const glowMat = new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.8 });
    for (const sx of [-1, 1])
      for (const sy of [-1, 1])
        for (const sz of [-1, 1]) {
          const spr = new THREE.Sprite(glowMat);
          spr.position.set((sx * CW) / 2, (sy * CH) / 2, (sz * CD) / 2);
          spr.scale.setScalar(0.55);
          cage.add(spr);
        }
    scene.add(cage);

    // flash central do rasgo (aditivo, cresce e clareia tudo)
    const flashTex = canvasTexture(256, 256, (c) => {
      const g = c.createRadialGradient(128, 128, 6, 128, 128, 126);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(0.4, 'rgba(255,255,255,0.7)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g;
      c.fillRect(0, 0, 256, 256);
    });
    const flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: flashTex, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0 }));
    flash.position.set(0, 0, D / 2 + 0.4);
    flash.scale.setScalar(0.1);
    scene.add(flash);

    // raios de luz que disparam na explosão
    const rays = new THREE.Group();
    const rayMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
    for (let i = 0; i < 12; i++) {
      const ray = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 3.4), rayMat);
      ray.rotation.z = (i / 12) * Math.PI * 2;
      rays.add(ray);
    }
    rays.position.z = D / 2 + 0.2;
    rays.scale.setScalar(0.01);
    scene.add(rays);

    scene.add(new THREE.AmbientLight(0xffffff, 1.2));
    const keyL = new THREE.PointLight(0xffffff, 26);
    keyL.position.set(4, 5, 7);
    scene.add(keyL);
    const rim = new THREE.PointLight(0xffffff, 16);
    rim.position.set(-5, -2, 4);
    scene.add(rim);

    // arrastar gira o pacote (é mistério: giro 360 livre é bem-vindo)
    let dragging = false;
    let lastX = 0;
    let spin = 0;
    let hoverX = 0;
    const onDown = (e: PointerEvent) => {
      dragging = true;
      lastX = e.clientX;
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      spin = (e.clientX - lastX) * 0.011;
      group.rotation.y += spin;
      lastX = e.clientX;
    };
    const onUp = () => (dragging = false);
    const onHover = (e: PointerEvent) => {
      if (dragging || e.pointerType !== 'mouse') return;
      const r = renderer.domElement.getBoundingClientRect();
      hoverX = (e.clientX - r.left) / r.width - 0.5;
    };
    renderer.domElement.style.touchAction = 'none';
    renderer.domElement.style.cursor = 'grab';
    renderer.domElement.addEventListener('pointerdown', onDown);
    renderer.domElement.addEventListener('pointermove', onHover);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('resize', setSize);

    let raf = 0;
    let rafActive = false;
    let inView = true;
    let phase = 0;
    let hue = 0;
    let ripT = 0;
    let introT = reduced ? 1 : 0;
    group.scale.setScalar(reduced ? 1 : 0.5);
    group.rotation.y = -0.5;

    const tick = () => {
      // entrada: o pacote surge crescendo e assentando
      if (introT < 1 && !tearingRef.current) {
        introT = Math.min(1, introT + 0.02);
        const e = 1 - Math.pow(1 - introT, 3);
        group.scale.setScalar(0.5 + 0.5 * e);
      }

      if (tearingRef.current && ripT < 1) {
        ripT = Math.min(1, ripT + 0.02);
        const e = ripT;
        // explode: escala, gira rápido, sobe um tico
        group.rotation.y += 0.35 * (1 - e) + 0.05;
        group.scale.setScalar((0.5 + 0.5 * Math.min(1, introT)) * (1 + e * 0.35) * (1 - Math.max(0, e - 0.6) * 2));
        group.position.y = e * 0.4;
        (group.children[0] as THREE.Mesh).visible = e < 0.7;
        // flash bloom
        flash.material.opacity = e < 0.7 ? e * 1.4 : Math.max(0, 1 - (e - 0.7) * 3.3);
        flash.scale.setScalar(0.1 + e * 9);
        // raios disparam
        rayMat.opacity = e < 0.5 ? e * 1.6 : Math.max(0, 0.8 - (e - 0.5) * 1.6);
        rays.scale.setScalar(0.01 + e * 2.4);
        rays.rotation.z += 0.04;
        // gaiola some junto
        cage.scale.setScalar(1 + e * 0.6);
        for (const c of cage.children) {
          const mm = (c as THREE.Mesh).material as THREE.Material;
          (mm as THREE.MeshBasicMaterial).opacity = Math.max(0, 1 - e * 1.4);
          (mm as THREE.MeshBasicMaterial).transparent = true;
        }
      } else if (!tearingRef.current) {
        // idle: flutua e gira devagar; hover dá parallax
        phase += reduced ? 0 : 0.01;
        if (!dragging && Math.abs(spin) > 0.003) {
          group.rotation.y += spin;
          spin *= 0.95;
        } else if (!dragging && !reduced) {
          group.rotation.y += 0.006 + hoverX * 0.02;
        }
        group.position.y = reduced ? 0 : Math.sin(phase) * 0.12;
        group.rotation.x = reduced ? 0 : Math.sin(phase * 0.8) * 0.06;
      }

      // sheen varre a frente sempre
      if (!reduced) sheenTex.offset.x = (sheenTex.offset.x + 0.004) % 1;

      // cor da gaiola: fixa (accent) ou ciclo de matiz (mistério)
      if (!tearingRef.current && !reduced) {
        hue = (hue + 0.004) % 1;
        if (fixed) {
          const puls = 0.82 + 0.22 * Math.sin(phase * 1.6);
          cageMat.color.copy(fixed).multiplyScalar(puls);
        } else {
          cageMat.color.setHSL(hue, 0.7, 0.62);
        }
        glowMat.opacity = 0.6 + 0.25 * Math.sin(phase * 1.6);
        (rim.color as THREE.Color).copy(cageMat.color);
      }

      // sombra no chão
      if (shadowRef.current) {
        const yaw = group.rotation.y;
        shadowRef.current.style.transform = `scaleX(${0.8 + 0.2 * Math.abs(Math.cos(yaw))}) scale(${1 - ripT * 0.5})`;
        shadowRef.current.style.opacity = String((0.7 + 0.3 * Math.abs(Math.cos(yaw))) * (1 - ripT));
      }

      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };

    const syncLoop = () => {
      const shouldRun = inView && !document.hidden;
      if (shouldRun && !rafActive) {
        rafActive = true;
        raf = requestAnimationFrame(tick);
      } else if (!shouldRun && rafActive) {
        rafActive = false;
        cancelAnimationFrame(raf);
      }
    };
    const io = new IntersectionObserver((entries) => {
      inView = entries.some((e) => e.isIntersecting);
      syncLoop();
    });
    io.observe(mount);
    const onVis = () => syncLoop();
    document.addEventListener('visibilitychange', onVis);

    rafActive = true;
    tick();

    return () => {
      io.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      cancelAnimationFrame(raf);
      renderer.domElement.removeEventListener('pointerdown', onDown);
      renderer.domElement.removeEventListener('pointermove', onHover);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('resize', setSize);
      envTex.dispose();
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (glFailed) {
    // fallback sem WebGL: um pacote CSS decente (melhor que o retângulo antigo)
    return (
      <div
        className={`mx-auto flex h-64 w-48 flex-col items-center justify-center rounded-2xl border border-white/15 bg-gradient-to-br from-[#1a0b2e] via-[#0a0710] to-[#0e1224] shadow-neon transition-transform ${tearing ? 'wf-tear' : ''}`}
      >
        <span className="font-display text-3xl uppercase text-white">wefans</span>
        <span className="mt-1 text-[10px] uppercase tracking-[0.2em] text-white/50">{label}</span>
      </div>
    );
  }

  return (
    <div className="relative mx-auto w-full max-w-[300px]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-[-10%]"
        style={{ background: `radial-gradient(52% 46% at 50% 44%, ${accent ?? '#9d4edd'}22, transparent 72%)` }}
      />
      <div
        ref={mountRef}
        className="w-full select-none [filter:brightness(1.1)_contrast(1.06)_saturate(1.08)]"
        role="img"
        aria-label={`${name} — pacote lacrado 3D`}
      />
      <div
        ref={shadowRef}
        aria-hidden
        className="pointer-events-none absolute inset-x-[18%] bottom-1 h-6"
        style={{ background: 'radial-gradient(50% 100% at 50% 50%, rgba(0,0,0,.6), transparent 70%)' }}
      />
    </div>
  );
}
