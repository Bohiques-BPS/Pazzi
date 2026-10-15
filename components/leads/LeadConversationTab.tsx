import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { leadsService, type LeadMessage, type LeadConversationPage } from '../../services/leads';
import { getSocket, joinLeadRoom } from '../../services/socket';
import { ApiError } from '../../services/api';
import { toast } from '../../hooks/useToast';
import { useTranslation } from '../../contexts/GlobalSettingsContext';
import { inputFormStyle, BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES } from '../../constants';
import {
  PaperAirplaneIcon, ChatBubbleLeftRightIcon, ExclamationTriangleIcon, InformationCircleIcon, PaperClipIcon, ArrowPathIcon, ClockIcon,
} from '../icons';

interface Props {
  leadId: string;
  /** lead.whatsapp || lead.phone (para wa.me y para recargar si cambia el número). */
  phone?: string | null;
  canEdit: boolean;
  /** Permiso para ENVIAR WhatsApp al lead (leads.sendWhatsapp). Sin él, la conversación es solo lectura. */
  canSendWhatsapp?: boolean;
  /** ¿La pestaña está visible? (para marcar como visto y ajustar el scroll). */
  active: boolean;
  /** Cambia para forzar una actualización (p. ej. tras enviar una plantilla). */
  reloadKey?: number;
  onOpenTemplates?: () => void;
  onUnreadChange?: (n: number) => void;
  onZoomImage?: (url: string) => void;
}

/** Polling de respaldo cuando el socket está caído (como el chat de proyectos). */
const POLL_MS = 20_000;
const PAGE = 50;
const DAY_MS = 24 * 60 * 60 * 1000;
const MEDIA_KINDS = ['image', 'video', 'audio', 'document', 'sticker', 'location'];

const byDate = (a: LeadMessage, b: LeadMessage) =>
  a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : a.id < b.id ? -1 : a.id > b.id ? 1 : 0;

/** Une listas por id (lo nuevo pisa a lo viejo: estados de entrega) y ordena cronológicamente. */
const mergeMessages = (prev: LeadMessage[], incoming: LeadMessage[]) => {
  const map = new Map<string, LeadMessage>();
  for (const m of prev) map.set(m.id, m);
  for (const m of incoming) map.set(m.id, { ...map.get(m.id), ...m });
  return Array.from(map.values()).sort(byDate);
};

/** Palomitas de estado (SVG, sin emojis): una = enviado, dos = entregado, dos resaltadas = leído. */
const StatusTicks: React.FC<{ status: string }> = ({ status }) => {
  if (status === 'sent') {
    return <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true"><path d="M3 8.5l3 3 7-7" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  }
  if (status === 'delivered' || status === 'read') {
    return (
      <svg viewBox="0 0 20 16" className={`w-4 h-3.5 ${status === 'read' ? 'text-sky-200' : ''}`} fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
        <path d="M1.5 8.5l3 3 7-7" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M8 11.5l7-7" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M6.5 8.5l3 3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return null;
};

export const LeadConversationTab: React.FC<Props> = ({ leadId, phone, canEdit, canSendWhatsapp = false, active, reloadKey, onOpenTemplates, onUnreadChange, onZoomImage }) => {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<LeadMessage[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [windowInfo, setWindowInfo] = useState<LeadConversationPage['window'] | null>(null);
  const [unread, setUnread] = useState(0);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [socketUp, setSocketUp] = useState(true);
  const [now, setNow] = useState(() => Date.now());

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const stickRef = useRef(true); // seguir pegado abajo cuando llegan mensajes
  const restoreRef = useRef<{ height: number; top: number } | null>(null); // conservar posición al cargar anteriores
  const messagesRef = useRef<LeadMessage[]>([]);
  const activeRef = useRef(active);
  messagesRef.current = messages;
  activeRef.current = active;

  const phoneDigits = (phone || '').replace(/\D/g, '');
  const waLink = phoneDigits ? `https://wa.me/${phoneDigits}` : '';

  const applyPage = (page: LeadConversationPage) => {
    setConfigured(page.whatsappConfigured);
    setWindowInfo(page.window);
    setUnread(page.unread);
  };

  /** Última página: 'initial' reemplaza; 'refresh' fusiona (polling / reconexión / plantilla enviada). */
  const loadLatest = useCallback(async (mode: 'initial' | 'refresh') => {
    try {
      const page = await leadsService.messages(leadId, { limit: PAGE });
      if (mode === 'initial') { stickRef.current = true; setMessages(page.messages); setHasMore(page.hasMore); }
      else setMessages(prev => mergeMessages(prev, page.messages));
      applyPage(page);
      setLoadError(false);
    } catch {
      if (mode === 'initial') setLoadError(true);
    } finally {
      if (mode === 'initial') setLoading(false);
    }
  }, [leadId]);

  // Carga inicial (y al cambiar de lead o de número).
  useEffect(() => {
    setLoading(true); setMessages([]); setHasMore(false); setLoadError(false);
    loadLatest('initial');
  }, [leadId, phoneDigits, loadLatest]);

  // Actualización explícita (p. ej. tras enviar una plantilla por WhatsApp).
  const firstReload = useRef(true);
  useEffect(() => {
    if (firstReload.current) { firstReload.current = false; return; }
    stickRef.current = true;
    loadLatest('refresh');
  }, [reloadKey, loadLatest]);

  // Tiempo real: sala del lead + polling de respaldo solo si el socket está caído.
  useEffect(() => {
    const leave = joinLeadRoom(leadId);
    const s = getSocket();
    const onMessage = (m: LeadMessage) => {
      if (!m || m.leadId !== leadId) return;
      const isNew = !messagesRef.current.some(x => x.id === m.id);
      setMessages(prev => mergeMessages(prev, [m]));
      if (m.direction === 'in' && isNew) {
        const at = new Date(m.createdAt).getTime();
        setWindowInfo(w => {
          const prevLast = w?.lastInboundAt ? new Date(w.lastInboundAt).getTime() : 0;
          if (prevLast > at) return w;
          return { open: true, lastInboundAt: m.createdAt, expiresAt: new Date(at + DAY_MS).toISOString() };
        });
        if (activeRef.current) leadsService.markMessagesSeen(leadId).catch(() => {});
        else setUnread(u => u + 1);
      }
    };
    const onConnect = () => { setSocketUp(true); loadLatest('refresh'); };
    const onDisconnect = () => setSocketUp(false);
    setSocketUp(s.connected);
    s.on('lead_message', onMessage);
    s.on('connect', onConnect);
    s.on('disconnect', onDisconnect);
    const interval = setInterval(() => {
      setNow(Date.now()); // re-evalúa la ventana de 24h
      if (!s.connected) loadLatest('refresh');
    }, POLL_MS);
    return () => {
      clearInterval(interval);
      s.off('lead_message', onMessage);
      s.off('connect', onConnect);
      s.off('disconnect', onDisconnect);
      leave?.();
    };
  }, [leadId, loadLatest]);

  // Indicador de no leídos → pestaña; al abrir la pestaña se marcan como vistos.
  useEffect(() => { onUnreadChange?.(unread); }, [unread, onUnreadChange]);
  useEffect(() => {
    if (!active || unread === 0) return;
    setUnread(0);
    leadsService.markMessagesSeen(leadId).catch(() => {});
  }, [active, unread, leadId]);

  // Scroll: abajo al cargar/llegar mensajes (si estaba abajo); conservar posición al cargar anteriores.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (restoreRef.current) {
      el.scrollTop = el.scrollHeight - restoreRef.current.height + restoreRef.current.top;
      restoreRef.current = null;
    } else if (stickRef.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, loading]);
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (active && el && stickRef.current) el.scrollTop = el.scrollHeight;
  }, [active]);

  const loadOlder = async () => {
    if (loadingOlder || !hasMore || messages.length === 0) return;
    const el = scrollRef.current;
    setLoadingOlder(true);
    try {
      const page = await leadsService.messages(leadId, { before: messages[0].id, limit: PAGE });
      if (el) restoreRef.current = { height: el.scrollHeight, top: el.scrollTop };
      stickRef.current = false;
      setMessages(prev => mergeMessages(page.messages, prev));
      setHasMore(page.hasMore);
    } catch { /* el toast global ya avisa de errores del servidor */ }
    finally { setLoadingOlder(false); }
  };

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    if (el.scrollTop < 40 && hasMore && !loadingOlder) loadOlder();
  };

  const windowOpen = !!windowInfo?.expiresAt && new Date(windowInfo.expiresAt).getTime() > now;
  // Enviar WhatsApp requiere el permiso específico; sin él la conversación es solo lectura.
  const canSend = canSendWhatsapp && configured === true && !!phoneDigits && windowOpen;

  const send = async () => {
    const body = text.trim();
    if (!body || sending || !canSend) return;
    setSending(true);
    try {
      const m = await leadsService.sendMessage(leadId, body);
      stickRef.current = true;
      setMessages(prev => mergeMessages(prev, [m]));
      setText('');
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 'OUTSIDE_24H_WINDOW') {
          setWindowInfo(w => ({ open: false, lastInboundAt: w?.lastInboundAt ?? null, expiresAt: new Date(Date.now() - 1000).toISOString() }));
        }
        if (err.code === 'WHATSAPP_NOT_CONFIGURED') setConfigured(false);
        const failed = err.details?.message as LeadMessage | undefined;
        if (failed?.id) { stickRef.current = true; setMessages(prev => mergeMessages(prev, [failed])); setText(''); }
        // 409 y 5xx ya los muestra el toast global de errores del API.
        if (err.status === 400) toast.error(err.message);
      } else {
        toast.error(t('leads.conversation.sent_failed'));
      }
    } finally {
      setSending(false);
    }
  };

  const retry = (m: LeadMessage) => { setText(m.body || ''); inputRef.current?.focus(); };

  const mediaLabel = (type?: string | null) => t(`leads.conversation.media.${type && MEDIA_KINDS.includes(type) ? type : 'other'}`);
  const timeOf = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dayLabel = (iso: string) => {
    const d = new Date(iso);
    const today = new Date();
    const yesterday = new Date(Date.now() - DAY_MS);
    if (d.toDateString() === today.toDateString()) return t('leads.conversation.today');
    if (d.toDateString() === yesterday.toDateString()) return t('leads.conversation.yesterday');
    return d.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short', year: d.getFullYear() === today.getFullYear() ? undefined : 'numeric' });
  };

  const renderMedia = (m: LeadMessage, out: boolean) => {
    if (!m.mediaType) return null;
    const linkCls = `flex items-center gap-1.5 text-sm underline break-all ${out && m.status !== 'failed' ? 'text-white' : 'text-primary dark:text-teal-300'}`;
    if (!m.mediaUrl) {
      return (
        <p className="flex items-center gap-1.5 text-xs italic opacity-80">
          <PaperClipIcon className="w-3.5 h-3.5 flex-shrink-0" />{t('leads.conversation.media.unavailable', { type: mediaLabel(m.mediaType) })}
        </p>
      );
    }
    if (m.mediaType === 'image' || m.mediaType === 'sticker') {
      return (
        <button type="button" onClick={() => onZoomImage?.(m.mediaUrl!)} className="block mb-1">
          <img src={m.mediaUrl} alt={mediaLabel(m.mediaType)} className={m.mediaType === 'sticker' ? 'w-28 h-28 object-contain' : 'rounded-md max-h-60 w-auto object-cover cursor-zoom-in'} />
        </button>
      );
    }
    if (m.mediaType === 'video') return <video src={m.mediaUrl} controls className="rounded-md max-h-60 w-full mb-1" />;
    if (m.mediaType === 'audio') return <audio src={m.mediaUrl} controls className="w-60 max-w-full mb-1" />;
    if (m.mediaType === 'location') {
      return <a href={m.mediaUrl} target="_blank" rel="noopener noreferrer" className={linkCls}><PaperClipIcon className="w-4 h-4 flex-shrink-0" />{t('leads.conversation.media.open_map')}</a>;
    }
    return (
      <a href={m.mediaUrl} target="_blank" rel="noopener noreferrer" className={`${linkCls} mb-1`}>
        <PaperClipIcon className="w-4 h-4 flex-shrink-0" /><span translate="no">{m.mediaName || t('leads.conversation.media.open_file')}</span>
      </a>
    );
  };

  const renderBubble = (m: LeadMessage) => {
    const out = m.direction === 'out';
    const failed = m.status === 'failed';
    const bubble = failed
      ? 'bg-red-50 text-red-900 border border-red-200 dark:bg-red-900/30 dark:text-red-100 dark:border-red-800'
      : out
        ? 'bg-primary text-white'
        : 'bg-white text-neutral-800 border border-neutral-200 dark:bg-neutral-700 dark:text-neutral-100 dark:border-neutral-600';
    const statusText = t(`leads.conversation.status.${['sent', 'delivered', 'read', 'failed', 'received'].includes(m.status) ? m.status : 'sent'}`);
    const title = `${new Date(m.createdAt).toLocaleString()} · ${statusText}${m.byName ? ` · ${t('leads.conversation.by', { name: m.byName })}` : ''}`;
    return (
      <div key={m.id} className={`flex flex-col ${out ? 'items-end' : 'items-start'}`}>
        <div className={`max-w-[85%] sm:max-w-md px-3 py-2 rounded-lg shadow-sm ${bubble}`} title={title}>
          {m.templateId && (
            <p className={`text-[10px] font-semibold uppercase tracking-wide mb-0.5 ${out && !failed ? 'text-white/80' : 'text-neutral-500 dark:text-neutral-400'}`}>{t('leads.conversation.template_tag')}</p>
          )}
          {renderMedia(m, out)}
          {m.body && <p className="text-sm whitespace-pre-wrap break-words"><span translate="no">{m.body}</span></p>}
          {!m.body && !m.mediaType && <p className="text-sm italic opacity-70">{mediaLabel('other')}</p>}
          <div className={`flex items-center justify-end gap-1 mt-1 text-[11px] ${out && !failed ? 'text-white/80' : 'text-neutral-500 dark:text-neutral-400'}`}>
            {out && m.byName && <span className="truncate max-w-[10rem]" translate="no">{m.byName} ·</span>}
            <span>{timeOf(m.createdAt)}</span>
            {out && !failed && <span aria-label={statusText}><StatusTicks status={m.status} /></span>}
          </div>
        </div>
        {failed && (
          <div className="flex items-start gap-1.5 mt-1 max-w-[85%] sm:max-w-md text-xs text-red-600 dark:text-red-400">
            <ExclamationTriangleIcon className="w-4 h-4 flex-shrink-0" />
            <span><span translate="no">{m.error || t('leads.conversation.failed_generic')}</span>
              {canEdit && m.body && <button type="button" onClick={() => retry(m)} className="ml-1.5 font-semibold underline hover:no-underline">{t('leads.conversation.retry_send')}</button>}
            </span>
          </div>
        )}
      </div>
    );
  };

  // ── Avisos ──
  let banner: React.ReactNode = null;
  if (!loading && !loadError) {
    if (configured === false) {
      banner = (
        <div className="p-3 rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 flex items-start gap-3">
          <ExclamationTriangleIcon className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">{t('leads.conversation.not_configured_title')}</p>
            <p className="text-sm text-amber-700 dark:text-amber-300">{t('leads.conversation.not_configured_body')}</p>
            {waLink && <a href={waLink} target="_blank" rel="noreferrer" className={`${BUTTON_SECONDARY_SM_CLASSES} mt-2 inline-flex items-center text-green-700 dark:text-green-300`}><ChatBubbleLeftRightIcon className="w-4 h-4 mr-1" />{t('leads.conversation.open_wa')}</a>}
          </div>
        </div>
      );
    } else if (!phoneDigits) {
      banner = (
        <div className="p-3 rounded-md bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 flex items-start gap-3">
          <InformationCircleIcon className="w-5 h-5 text-neutral-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">{t('leads.conversation.no_phone_title')}</p>
            <p className="text-sm text-neutral-600 dark:text-neutral-300">{t('leads.conversation.no_phone_body')}</p>
          </div>
        </div>
      );
    } else if (configured && !windowOpen) {
      banner = (
        <div className="p-3 rounded-md bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-800 flex items-start gap-3">
          <ClockIcon className="w-5 h-5 text-sky-500 flex-shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-sky-800 dark:text-sky-200">{t('leads.conversation.window_closed_title')}</p>
            <p className="text-sm text-sky-700 dark:text-sky-300">
              {windowInfo?.lastInboundAt
                ? t('leads.conversation.window_closed_since', { time: new Date(windowInfo.lastInboundAt).toLocaleString() })
                : t('leads.conversation.window_closed_never')}
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              {canEdit && onOpenTemplates && (
                <button type="button" onClick={onOpenTemplates} className={`${BUTTON_PRIMARY_SM_CLASSES} inline-flex items-center`}><PaperAirplaneIcon className="w-4 h-4 mr-1" />{t('leads.conversation.send_template')}</button>
              )}
              <a href={waLink} target="_blank" rel="noreferrer" className={`${BUTTON_SECONDARY_SM_CLASSES} inline-flex items-center text-green-700 dark:text-green-300`}><ChatBubbleLeftRightIcon className="w-4 h-4 mr-1" />{t('leads.conversation.open_wa')}</a>
            </div>
          </div>
        </div>
      );
    }
  }

  let lastDay = '';
  return (
    <div className="space-y-3">
      {banner}
      {!socketUp && !loading && (
        <p className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-1"><ArrowPathIcon className="w-3.5 h-3.5" />{t('leads.conversation.realtime_off')}</p>
      )}

      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="h-[22rem] overflow-y-auto rounded-md border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 p-3 space-y-2"
      >
        {loading ? (
          <p className="text-sm text-center text-neutral-400 py-10">{t('leads.conversation.loading')}</p>
        ) : loadError ? (
          <div className="text-center py-10">
            <p className="text-sm text-neutral-500 dark:text-neutral-400">{t('leads.conversation.load_error')}</p>
            <button type="button" onClick={() => { setLoading(true); loadLatest('initial'); }} className={`${BUTTON_SECONDARY_SM_CLASSES} mt-2`}>{t('leads.conversation.retry_load')}</button>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-2 text-neutral-400 dark:text-neutral-500">
            <ChatBubbleLeftRightIcon className="w-8 h-8" />
            <p className="text-sm">{t('leads.conversation.empty')}</p>
          </div>
        ) : (
          <>
            {hasMore ? (
              <div className="text-center">
                <button type="button" onClick={loadOlder} disabled={loadingOlder} className="text-xs font-medium text-primary dark:text-teal-300 hover:underline disabled:opacity-50">
                  {loadingOlder ? t('leads.conversation.loading_older') : t('leads.conversation.load_older')}
                </button>
              </div>
            ) : (
              <p className="text-center text-[11px] text-neutral-400 dark:text-neutral-500">{t('leads.conversation.start')}</p>
            )}
            {messages.map(m => {
              const day = new Date(m.createdAt).toDateString();
              const sep = day !== lastDay;
              lastDay = day;
              return (
                <React.Fragment key={m.id}>
                  {sep && (
                    <div className="flex justify-center py-1">
                      <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-neutral-200 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300">{dayLabel(m.createdAt)}</span>
                    </div>
                  )}
                  {renderBubble(m)}
                </React.Fragment>
              );
            })}
          </>
        )}
      </div>

      {canEdit ? (
        <div>
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              rows={2}
              value={text}
              disabled={!canSend || sending}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey && !(e.nativeEvent as any).isComposing) { e.preventDefault(); send(); }
              }}
              placeholder={t('leads.conversation.placeholder')}
              aria-label={t('leads.conversation.placeholder')}
              className={`${inputFormStyle} !h-auto !text-base flex-grow resize-none max-h-32 disabled:opacity-60 disabled:cursor-not-allowed`}
            />
            <button
              type="button"
              onClick={send}
              disabled={!canSend || sending || !text.trim()}
              className={`${BUTTON_PRIMARY_SM_CLASSES} flex items-center flex-shrink-0 disabled:opacity-50`}
              aria-label={t('leads.conversation.send')}
            >
              <PaperAirplaneIcon className="w-4 h-4 sm:mr-1" /><span className="hidden sm:inline">{sending ? t('leads.conversation.sending') : t('leads.conversation.send')}</span>
            </button>
          </div>
          {canSend && windowInfo?.expiresAt && (
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">{t('leads.conversation.window_open_until', { time: new Date(windowInfo.expiresAt).toLocaleString() })}</p>
          )}
        </div>
      ) : (
        <p className="text-xs text-neutral-500 dark:text-neutral-400">{t('leads.conversation.read_only')}</p>
      )}
    </div>
  );
};
