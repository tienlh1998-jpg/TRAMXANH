'use client';
import { useEffect, useRef } from 'react';
export function ConfirmDialog({ open, title, children, pending = false, onConfirm, onCancel }: { open: boolean; title: string; children: React.ReactNode; pending?: boolean; onConfirm: () => void; onCancel: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { if (open && !ref.current?.open) ref.current?.showModal(); else if (!open) ref.current?.close(); }, [open]);
  return <dialog ref={ref} className="confirm-dialog" aria-labelledby="confirmation-title" onCancel={(event) => { event.preventDefault(); if (!pending) onCancel(); }}><h2 id="confirmation-title">{title}</h2>{children}<div className="two-actions"><button disabled={pending} onClick={onCancel}>Quay lại</button><button className="button" disabled={pending} onClick={onConfirm}>{pending ? 'Đang xử lý…' : 'Xác nhận'}</button></div></dialog>;
}
