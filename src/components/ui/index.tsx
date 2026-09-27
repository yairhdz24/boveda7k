"use client";

import { forwardRef, useEffect, useId, useRef, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from "react";
import { Check, Copy, Eye, EyeOff, X } from "lucide-react";
import { useVault } from "@/lib/vault";
import { ENV_LABEL, type Env } from "@/lib/types";
import { darkVariant, invertsOnDark } from "@/lib/logo-variants";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

/* Button ─────────────────────────────────────────────────── */
type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "md" | "sm";
  icon?: ReactNode;
  loading?: boolean;
};
export function Button({ variant = "secondary", size = "md", icon, loading, className, children, disabled, ...rest }: BtnProps) {
  return (
    <button type="button" {...rest} disabled={disabled || loading} className={cx("bv-btn", `bv-btn-${variant}`, size === "sm" && "bv-btn-sm", className)}>
      {loading ? <span className="spinner" aria-hidden /> : icon}
      {children}
    </button>
  );
}

export function IconButton({ label, children, className, active, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; active?: boolean }) {
  return (
    <button type="button" aria-label={label} title={label} {...rest} className={cx("bv-icon-btn", active && "is-on", className)}>
      {children}
    </button>
  );
}

/* Field ──────────────────────────────────────────────────── */
type FieldBase = { label?: string; hint?: string; error?: string | null; mono?: boolean; trailing?: ReactNode };
export const Field = forwardRef<HTMLInputElement, FieldBase & InputHTMLAttributes<HTMLInputElement>>(function Field(
  { label, hint, error, mono, trailing, className, id, ...rest },
  ref,
) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <div className={cx("bv-field", className)}>
      {label && <label className="bv-label" htmlFor={fid}>{label}</label>}
      <div className="input-wrap">
        <input ref={ref} id={fid} className={cx("bv-input", mono && "bv-input-mono", trailing ? "has-trailing" : null)} aria-invalid={error ? true : undefined} {...rest} />
        {trailing && <div className="input-trailing">{trailing}</div>}
      </div>
      {error ? <div className="bv-error" role="alert">{error}</div> : hint ? <div className="bv-hint">{hint}</div> : null}
    </div>
  );
});

export function TextArea({ label, hint, mono, className, id, ...rest }: FieldBase & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <div className={cx("bv-field", className)}>
      {label && <label className="bv-label" htmlFor={fid}>{label}</label>}
      <textarea id={fid} className={cx("bv-input", mono && "bv-input-mono")} {...rest} />
      {hint && <div className="bv-hint">{hint}</div>}
    </div>
  );
}

export function Select({ label, children, className, id, ...rest }: { label?: string } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <div className={cx("bv-field", className)}>
      {label && <label className="bv-label" htmlFor={fid}>{label}</label>}
      <select id={fid} className="bv-input bv-select" {...rest}>
        {children}
      </select>
    </div>
  );
}

/* SecretField ────────────────────────────────────────────── */
export function SecretField({ label, value, secret = true }: { label: string; value: string; secret?: boolean }) {
  const { copy } = useVault();
  const [shown, setShown] = useState(false);
  const [copied, setCopied] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const reveal = () => {
    setShown((s) => !s);
    if (!shown) timers.current.push(setTimeout(() => setShown(false), 20_000));
  };
  const doCopy = async () => {
    await copy(value, label);
    setCopied(true);
    timers.current.push(setTimeout(() => setCopied(false), 1800));
  };
  const masked = secret && !shown;
  const multiline = !masked && value.includes("\n");

  return (
    <div className="bv-secret">
      <span className="bv-label">{label}</span>
      <div className={cx("bv-secret-well", multiline && "is-multiline")}>
        {multiline ? (
          <pre className="bv-secret-value is-pre">{value}</pre>
        ) : (
          <span className={cx("bv-secret-value", masked && "is-masked")} title={masked ? undefined : value}>
            {masked ? "•".repeat(Math.min(Math.max(value.length, 8), 18)) : value || "—"}
          </span>
        )}
        {copied && <span className="bv-secret-copied">Copiado</span>}
        {secret && (
          <IconButton label={shown ? "Ocultar" : "Revelar"} onClick={reveal} active={shown}>
            {shown ? <EyeOff /> : <Eye />}
          </IconButton>
        )}
        <IconButton label={`Copiar ${label}`} onClick={doCopy} disabled={!value}>
          {copied ? <Check /> : <Copy />}
        </IconButton>
      </div>
    </div>
  );
}

/* LogoTile ───────────────────────────────────────────────── */
function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w.charAt(0).toUpperCase()).join("") || "?";
}
export function LogoTile({ src, name, size = 40 }: { src?: string | null; name: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  const style = { width: size, height: size, fontSize: Math.round(size * 0.36), borderRadius: size <= 32 ? 10 : undefined };
  if (!src || failed) {
    return (
      <div className="bv-logo is-initials" style={style} role="img" aria-label={name}>
        {initials(name)}
      </div>
    );
  }
  const dark = darkVariant(src);
  /* eslint-disable @next/next/no-img-element */
  return (
    <div className="bv-logo" style={style}>
      <img src={src} alt="" referrerPolicy="no-referrer" className={dark ? "logo-on-light" : invertsOnDark(src) ? "logo-invert-dark" : undefined} onError={() => setFailed(true)} />
      {dark && <img src={dark} alt="" referrerPolicy="no-referrer" className="logo-on-dark" onError={() => setFailed(true)} />}
    </div>
  );
  /* eslint-enable @next/next/no-img-element */
}

/* Badge ──────────────────────────────────────────────────── */
export function Badge({ tone = "plain", children }: { tone?: Env | "plain"; children?: ReactNode }) {
  return <span className={cx("bv-badge", `bv-badge-${tone}`)}>{children ?? (tone !== "plain" ? ENV_LABEL[tone] : null)}</span>;
}

/* Dialog (nativo) ────────────────────────────────────────── */
export function Dialog({ open, onClose, title, children, footer, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      className={cx("dialog", wide && "is-wide")}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onMouseDown={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      {open && (
        <div className="dialog-inner">
          <div className="sheet-grabber" aria-hidden />
          <header className="dialog-head">
            <h2 className="display-md">{title}</h2>
            <IconButton label="Cerrar" onClick={onClose}><X /></IconButton>
          </header>
          <div className="dialog-body">{children}</div>
          {footer && <footer className="dialog-foot">{footer}</footer>}
        </div>
      )}
    </dialog>
  );
}

export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = "Eliminar" }: { open: boolean; onClose: () => void; onConfirm: () => Promise<void> | void; title: string; message: ReactNode; confirmLabel?: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button
            variant="danger"
            loading={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await onConfirm();
                onClose();
              } finally {
                setBusy(false);
              }
            }}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="muted" style={{ margin: 0 }}>{message}</p>
    </Dialog>
  );
}

export function EmptyState({ icon, title, text, action }: { icon: ReactNode; title: string; text: string; action?: ReactNode }) {
  return (
    <div className="empty">
      <div className="empty-icon">{icon}</div>
      <h3 className="display-md">{title}</h3>
      <p className="muted">{text}</p>
      {action}
    </div>
  );
}
