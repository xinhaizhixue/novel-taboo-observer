import { Children, isValidElement, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Check, ChevronDown } from 'lucide-react';

type Props = { name?: string; value?: string | number; children: ReactNode; onChange?: (event: { target: { value: string } }) => void; className?: string; disabled?: boolean; 'aria-label'?: string; id?: string; title?: string };
/** In-flow options keep narrow inspector controls visible instead of covering them. */
export function Select({ name, value, children, onChange, className = '', disabled, 'aria-label': label, id, title }: Props) {
  const generated = useId(); const listId = `${generated}-options`;
  const root = useRef<HTMLDivElement>(null); const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const options = Children.toArray(children).filter(isValidElement).map((child) => {
    const p = child.props as { value?: string | number; children: ReactNode; disabled?: boolean };
    return { value: String(p.value ?? p.children), label: p.children, disabled: p.disabled };
  });
  const selected = options.find((option) => option.value === String(value));
  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', close);
    root.current?.querySelector<HTMLElement>('[role="option"][aria-selected="true"]:not(:disabled), [role="option"]:not(:disabled)')?.focus();
    return () => document.removeEventListener('pointerdown', close);
  }, [open]);
  return <div ref={root} className={`choice-select ${className}`} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
    {name && <input type="hidden" name={name} value={value ?? ''} />}
    <button ref={trigger} id={id} type="button" className="choice-trigger" title={title} aria-label={label} aria-haspopup="listbox" aria-expanded={open} aria-controls={listId} disabled={disabled} onClick={() => setOpen(!open)} onKeyDown={(event) => { if (['ArrowDown', 'ArrowUp'].includes(event.key)) { event.preventDefault(); setOpen(true); } }}><span>{selected?.label ?? '请选择'}</span><ChevronDown size={15} /></button>
    {open && <div id={listId} role="listbox" aria-label={label} className="choice-options" onKeyDown={(event) => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); setOpen(false); trigger.current?.focus(); }
      const items = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')];
      const index = items.indexOf(document.activeElement as HTMLButtonElement);
      if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) { event.preventDefault(); const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : (index + (event.key === 'ArrowUp' ? -1 : 1) + items.length) % items.length; items[next]?.focus(); }
    }}>{options.map((option) => <button type="button" role="option" aria-selected={option.value === String(value)} disabled={option.disabled} key={option.value} onClick={() => { onChange?.({ target: { value: option.value } }); setOpen(false); trigger.current?.focus(); }}><span>{option.label}</span>{option.value === String(value) && <Check size={15} />}</button>)}</div>}
  </div>;
}
