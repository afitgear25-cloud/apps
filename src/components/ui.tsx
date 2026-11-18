import { useRef, useState, type ReactNode } from 'react'
import { achicarFoto } from '../lib/images'

type Variante = 'rojo' | 'oscuro' | 'blanco' | 'fantasma'
const VARIANTES: Record<Variante, string> = {
  rojo: 'bg-rojo hover:bg-rojo-osc text-white',
  oscuro: 'bg-panel-2 hover:bg-borde text-white border border-borde',
  blanco: 'bg-white hover:bg-zinc-200 text-negro',
  fantasma: 'bg-transparent hover:bg-panel-2 text-tenue',
}

export function Boton({ v = 'rojo', className = '', grande, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { v?: Variante; grande?: boolean }) {
  return (
    <button
      {...p}
      className={`${VARIANTES[v]} ${grande ? 'px-5 py-3 text-base' : 'px-3.5 py-2 text-sm'} rounded-xl font-semibold transition disabled:opacity-40 disabled:pointer-events-none ${className}`}
    />
  )
}

export function Tarjeta({ children, className = '', ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return <div {...p} className={`bg-panel border border-borde rounded-2xl p-4 ${className}`}>{children}</div>
}

export function Titulo({ children, extra, sub }: { children: ReactNode; extra?: ReactNode; sub?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">
          <span className="inline-block w-1.5 h-6 bg-rojo rounded mr-2 align-[-3px]" />
          {children}
        </h1>
        {sub && <p className="text-tenue text-sm mt-1">{sub}</p>}
      </div>
      {extra && <div className="flex flex-wrap gap-2">{extra}</div>}
    </div>
  )
}

export function Dato({ valor, texto, rojo }: { valor: ReactNode; texto: string; rojo?: boolean }) {
  return (
    <Tarjeta className={rojo ? 'bg-rojo! border-rojo!' : ''}>
      <div className="text-3xl font-black">{valor}</div>
      <div className={`text-sm ${rojo ? 'text-white/85' : 'text-tenue'}`}>{texto}</div>
    </Tarjeta>
  )
}

export function Pestanas<T extends string>({ opciones, valor, onChange }: { opciones: { id: T; texto: string }[]; valor: T; onChange: (v: T) => void }) {
  return (
    <div className="flex gap-1 overflow-x-auto bg-panel border border-borde rounded-xl p-1 mb-4">
      {opciones.map((o) => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          className={`px-3.5 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition ${valor === o.id ? 'bg-rojo text-white' : 'text-tenue hover:text-white'}`}
        >
          {o.texto}
        </button>
      ))}
    </div>
  )
}

export function Chip({ children, tono = 'gris' }: { children: ReactNode; tono?: 'gris' | 'rojo' | 'verde' | 'blanco' | 'amarillo' }) {
  const t = {
    gris: 'bg-panel-2 text-tenue border-borde',
    rojo: 'bg-rojo/20 text-rojo-claro border-rojo/50',
    verde: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
    blanco: 'bg-white text-negro border-white',
    amarillo: 'bg-amber-400/15 text-amber-300 border-amber-400/40',
  }[tono]
  return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-semibold ${t}`}>{children}</span>
}

export function Modal({ titulo, onClose, children }: { titulo: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/75 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="bg-panel border border-borde w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">{titulo}</h2>
          <button onClick={onClose} className="text-tenue hover:text-white text-2xl leading-none px-2" aria-label="Cerrar">×</button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Campo({ label, children, className = '' }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={`mb-3 ${className}`}>
      <label>{label}</label>
      {children}
    </div>
  )
}

export function Foto({ src, alt, className = '' }: { src?: string; alt: string; className?: string }) {
  if (src) return <img src={src} alt={alt} className={`object-cover bg-panel-2 ${className}`} />
  return (
    <div className={`bg-panel-2 flex items-center justify-center text-tenue ${className}`} aria-label={`${alt} (sin foto)`}>
      <svg viewBox="0 0 24 24" className="w-1/3 h-1/3 opacity-60" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <circle cx="9" cy="10" r="2" />
        <path d="M21 16l-5-5-8 8" />
      </svg>
    </div>
  )
}

export function FotoInput({ valor, onChange }: { valor?: string; onChange: (v?: string) => void }) {
  const ref = useRef<HTMLInputElement>(null)
  const [cargando, setCargando] = useState(false)
  return (
    <div className="flex items-center gap-3">
      <Foto src={valor} alt="Foto" className="w-24 h-24 rounded-xl border border-borde" />
      <div className="flex flex-col gap-2">
        <input
          ref={ref}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={async (e) => {
            const f = e.target.files?.[0]
            if (!f) return
            setCargando(true)
            try {
              onChange(await achicarFoto(f))
            } finally {
              setCargando(false)
              e.target.value = ''
            }
          }}
        />
        <Boton type="button" v="oscuro" onClick={() => ref.current?.click()}>
          {cargando ? 'Cargando…' : valor ? 'Cambiar foto' : 'Subir o sacar foto'}
        </Boton>
        {valor && <Boton type="button" v="fantasma" onClick={() => onChange(undefined)}>Quitar foto</Boton>}
      </div>
    </div>
  )
}

export function Vacio({ children }: { children: ReactNode }) {
  return <div className="text-center text-tenue py-10 border border-dashed border-borde rounded-2xl">{children}</div>
}

export function Escudo({ src, className = '' }: { src?: string; className?: string }) {
  return <img src={src || './escudo.svg'} alt="Escudo del club" className={`object-contain ${className}`} />
}
