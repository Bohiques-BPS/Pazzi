import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { publicLeadForm } from '../../services/leads';

/** Formulario público de captura de leads (sin sesión). Se puede incrustar con ?embed=1. */
export const PublicLeadFormPage: React.FC = () => {
  const { token = '' } = useParams();
  const [searchParams] = useSearchParams();
  const embed = searchParams.get('embed') === '1';
  const [info, setInfo] = useState<{ title: string; successMessage: string; businessName: string; logoUrl: string } | null>(null);
  const [loadError, setLoadError] = useState('');
  const [form, setForm] = useState({ name: '', lastName: '', companyName: '', email: '', phone: '', message: '', website: '' });
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');

  useEffect(() => {
    publicLeadForm.get(token).then(setInfo).catch(e => setLoadError(e.message || 'Formulario no disponible'));
  }, [token]);

  const set = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) { setError('Escribe tu nombre.'); return; }
    if (!form.email.trim() && !form.phone.trim()) { setError('Indica un correo o un teléfono para contactarte.'); return; }
    setSending(true);
    try {
      const r = await publicLeadForm.submit(token, form);
      setDone(r.message || info?.successMessage || '¡Gracias! Te contactaremos pronto.');
    } catch (er: any) {
      setError(er.message || 'No se pudo enviar. Intenta de nuevo.');
    } finally { setSending(false); }
  };

  const inputCls = 'w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-600';

  const shell = (children: React.ReactNode) => (
    <div className={`${embed ? '' : 'min-h-screen bg-neutral-100'} flex items-start sm:items-center justify-center p-4`} style={{ colorScheme: 'light' }}>
      <div className={`w-full max-w-md bg-white rounded-2xl ${embed ? '' : 'shadow-xl border border-neutral-200'} p-6 sm:p-8`}>{children}</div>
    </div>
  );

  if (loadError) return shell(<p className="text-center text-neutral-600">{loadError}</p>);
  if (!info) return shell(<p className="text-center text-neutral-400">Cargando…</p>);

  if (done) return shell(
    <div className="text-center py-6">
      <div className="text-5xl mb-3">✅</div>
      <p className="text-lg font-semibold text-neutral-800">{done}</p>
    </div>
  );

  return shell(
    <>
      <div className="text-center mb-5">
        {info.logoUrl && <img src={info.logoUrl} alt="" className="h-14 mx-auto mb-2 object-contain" />}
        {info.businessName && <p className="text-sm text-neutral-500">{info.businessName}</p>}
        <h1 className="text-2xl font-bold text-neutral-800">{info.title}</h1>
      </div>
      <form onSubmit={submit} className="space-y-3" noValidate>
        <div className="grid grid-cols-2 gap-3">
          <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Nombre *" className={inputCls} autoComplete="given-name" />
          <input value={form.lastName} onChange={e => set('lastName', e.target.value)} placeholder="Apellido" className={inputCls} autoComplete="family-name" />
        </div>
        <input value={form.companyName} onChange={e => set('companyName', e.target.value)} placeholder="Empresa (opcional)" className={inputCls} autoComplete="organization" />
        <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="Correo electrónico" className={inputCls} autoComplete="email" />
        <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="Teléfono / WhatsApp" className={inputCls} autoComplete="tel" />
        <textarea value={form.message} onChange={e => set('message', e.target.value)} placeholder="¿En qué te podemos ayudar?" rows={4} className={inputCls} />
        {/* Honeypot anti-bots: oculto para personas */}
        <input type="text" value={form.website} onChange={e => set('website', e.target.value)} tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={sending} className="w-full rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 disabled:opacity-60">
          {sending ? 'Enviando…' : 'Enviar'}
        </button>
        <p className="text-[11px] text-neutral-400 text-center">Al enviar aceptas que te contactemos con la información proporcionada.</p>
      </form>
    </>
  );
};
