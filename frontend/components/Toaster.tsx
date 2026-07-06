'use client';

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';

// Sistema único de toasts (sucesso/erro/info) — feedback padronizado para ações
// (compra, venda, wishlist, ofertas…) em vez de cada componente tratar à sua maneira.

type ToastAction = { label: string; onClick: () => void };
type Toast = { id: number; type: 'success' | 'error' | 'info'; message: string; action?: ToastAction };
type ToastFn = (message: string, type?: Toast['type'], action?: ToastAction) => void;

const ToastContext = createContext<ToastFn>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

export default function Toaster({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const push = useCallback<ToastFn>((message, type = 'info', action) => {
    const id = nextId.current++;
    setToasts((t) => [...t, { id, type, message, action }]);
    // toasts com ação (Desfazer) ficam mais tempo na tela
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), action ? 7000 : 4500);
  }, []);

  const COLOR: Record<Toast['type'], string> = {
    success: '#22c55e',
    error: '#ff2e88',
    info: '#21d4e0',
  };

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[92vw] max-w-[360px] flex-col gap-2"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className="rounded-2xl wf-reveal pointer-events-auto flex items-start gap-2.5 border border-white/10 bg-[#101012] px-3.5 py-3 shadow-[0_12px_30px_rgba(0,0,0,.6)]"
          >
            <span className="mt-1 h-2 w-2 shrink-0 rounded-full" style={{ background: COLOR[t.type] }} aria-hidden />
            <p className="flex-1 text-[13px] leading-snug text-ink">{t.message}</p>
            {t.action && (
              <button
                onClick={() => {
                  t.action!.onClick();
                  setToasts((x) => x.filter((y) => y.id !== t.id));
                }}
                className="shrink-0 text-[12px] font-bold uppercase tracking-wide text-accent3 hover:text-white"
              >
                {t.action.label}
              </button>
            )}
            <button
              aria-label="Fechar aviso"
              onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))}
              className="text-neutral-500 hover:text-white"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
