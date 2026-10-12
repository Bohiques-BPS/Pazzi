/**
 * Diccionario del CRM de leads, dividido por pantalla para no inflar GlobalSettingsContext.
 * Se fusiona en TRANSLATIONS (es/en). Usar SIEMPRE t('leads.<pantalla>.<clave>') desde los componentes.
 *  - common:     textos compartidos (estados, tipos de actividad, botones genéricos del CRM)
 *  - board:      LeadsPage (kanban, lista, filtros, masivo, importar/exportar, crear lead)
 *  - detail:     LeadDetailModal + TagChip
 *  - settings:   LeadsSettingsPage
 *  - automation: LeadsAutomationTabs (reglas, plantillas, equipos, integraciones, metas)
 *  - reports:    LeadsReportsPage + PublicLeadFormPage
 */
import * as common from './common';
import * as board from './board';
import * as detail from './detail';
import * as settings from './settings';
import * as automation from './automation';
import * as reports from './reports';

const parts = [common, board, detail, settings, automation, reports];

export const LEADS_I18N: { es: Record<string, string>; en: Record<string, string> } = {
  es: Object.assign({}, ...parts.map(p => p.es)),
  en: Object.assign({}, ...parts.map(p => p.en)),
};

/**
 * Traductor sin contexto (para el formulario público /f/:token, que no tiene sesión):
 * usa el idioma que indique el negocio y cae a español.
 */
export function leadsT(lang: string | null | undefined, key: string, params?: Record<string, string | number>): string {
  const dict = (lang === 'en' ? LEADS_I18N.en : LEADS_I18N.es);
  let text = dict[key] || LEADS_I18N.es[key] || key;
  if (params) for (const [k, v] of Object.entries(params)) text = text.split(`{${k}}`).join(String(v));
  return text;
}
