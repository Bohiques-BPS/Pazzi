import { api, API_URL } from './api';
import type { Lead, Pipeline, PipelineStage, LeadSource, LeadActivity, LeadNote, LeadTag, LeadCustomField, LeadSettings } from '../types';

export interface LeadConfig {
  pipelines: Pipeline[];
  sources: LeadSource[];
  tags: LeadTag[];
  customFields: LeadCustomField[];
  settings: { coldDays: number; lostReasons: string[] };
}

export interface LeadFilters {
  pipelineId?: string;
  stageId?: string;
  status?: 'open' | 'won' | 'lost';
  assignedUserId?: string;
  sourceId?: string;
  tagId?: string;
  cold?: '1';
  q?: string;
  limit?: number;
}

export interface ReportRange { from?: string; to?: string; pipelineId?: string; }

export interface FunnelReport {
  funnel: { stageId: string; name: string; type: string; color?: string | null; count: number; value: number; probability: number }[];
  totals: { open: number; won: number; lost: number; conversion: number; weightedPipeline: number; openValue: number; wonValue: number };
}
export interface PerformanceReport {
  rows: { userId: string; name: string; open: number; won: number; lost: number; value: number; activities: number; conversion: number }[];
}
export interface SourcesReport { rows: { sourceId: string; name: string; total: number; won: number; lost: number; wonValue: number; conversion: number }[]; }
export interface StageTimeReport { rows: { stageId: string; name: string; type?: string; avgDays: number; samples: number }[]; }
export interface ForecastReport { rows: { month: string; count: number; value: number; weighted: number }[]; }
export interface LostReasonsReport { rows: { reason: string; count: number; value: number }[]; }
export interface ImportResultDto { created: number; updated?: number; failedCount: number; failed: { row: number; error: string }[]; }
export type BulkAction = 'assign' | 'stage' | 'tag' | 'untag' | 'delete';

const clean = (o?: Record<string, any>) => {
  if (!o) return undefined;
  const out: Record<string, any> = {};
  Object.entries(o).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') out[k] = v; });
  return out as any;
};

export const leadsService = {
  // Config
  getConfig: () => api.get<LeadConfig>('/leads/config'),
  createPipeline: (name: string) => api.post<Pipeline>('/leads/pipelines', { name }),
  updatePipeline: (id: string, data: { name?: string; isDefault?: boolean }) => api.put<Pipeline>(`/leads/pipelines/${id}`, data),
  deletePipeline: (id: string) => api.delete<{ deleted: boolean }>(`/leads/pipelines/${id}`),
  createStage: (pipelineId: string, data: { name: string; type?: string; color?: string | null; probability?: number | null }) =>
    api.post<PipelineStage>(`/leads/pipelines/${pipelineId}/stages`, data),
  reorderStages: (pipelineId: string, ids: string[]) => api.put<{ ok: boolean }>(`/leads/pipelines/${pipelineId}/stages/order`, { ids }),
  updateStage: (id: string, data: Partial<PipelineStage>) => api.put<PipelineStage>(`/leads/stages/${id}`, data),
  deleteStage: (id: string, moveToStageId?: string) => api.delete<any>(`/leads/stages/${id}${moveToStageId ? `?moveToStageId=${encodeURIComponent(moveToStageId)}` : ''}`),
  createSource: (name: string) => api.post<LeadSource>('/leads/sources', { name }),
  updateSource: (id: string, data: { name?: string; active?: boolean }) => api.put<LeadSource>(`/leads/sources/${id}`, data),
  deleteSource: (id: string) => api.delete<any>(`/leads/sources/${id}`),
  createTag: (name: string, color?: string | null) => api.post<LeadTag>('/leads/tags', { name, color }),
  updateTag: (id: string, data: { name?: string; color?: string | null }) => api.put<LeadTag>(`/leads/tags/${id}`, data),
  deleteTag: (id: string) => api.delete<any>(`/leads/tags/${id}`),
  createCustomField: (data: Partial<LeadCustomField>) => api.post<LeadCustomField>('/leads/custom-fields', data),
  updateCustomField: (id: string, data: Partial<LeadCustomField>) => api.put<LeadCustomField>(`/leads/custom-fields/${id}`, data),
  deleteCustomField: (id: string) => api.delete<any>(`/leads/custom-fields/${id}`),
  getSettings: () => api.get<LeadSettings>('/leads/settings'),
  updateSettings: (data: Partial<LeadSettings>) => api.put<LeadSettings>('/leads/settings', data),
  regenerateFormToken: () => api.post<{ formToken: string }>('/leads/settings/regenerate-token', {}),

  // Leads
  list: (filters?: LeadFilters) => api.get<Lead[]>('/leads', clean(filters as any)),
  get: (id: string) => api.get<Lead>(`/leads/${id}`),
  create: (data: Partial<Lead>) => api.post<Lead>('/leads', data),
  update: (id: string, data: Partial<Lead>) => api.put<Lead>(`/leads/${id}`, data),
  remove: (id: string) => api.delete<{ deleted: boolean }>(`/leads/${id}`),
  moveStage: (id: string, stageId: string, opts?: { lostReason?: string; order?: number }) =>
    api.post<Lead>(`/leads/${id}/stage`, { stageId, ...opts }),
  reorder: (ids: string[]) => api.put<{ ok: boolean }>('/leads/reorder', { ids }),
  assign: (id: string, userId: string | null) => api.post<Lead>(`/leads/${id}/assign`, { userId }),
  convert: (id: string) => api.post<{ clientId: string; alreadyConverted?: boolean }>(`/leads/${id}/convert`, {}),
  bulk: (ids: string[], action: BulkAction, extra?: { userId?: string | null; stageId?: string; tagId?: string; lostReason?: string }) =>
    api.post<{ affected: number }>('/leads/bulk', { ids, action, ...extra }),
  importRows: (rows: Record<string, any>[], pipelineId?: string) => api.post<ImportResultDto>('/leads/import', { rows, pipelineId }),

  // Actividades / notas
  addActivity: (id: string, data: Partial<LeadActivity>) => api.post<LeadActivity>(`/leads/${id}/activities`, data),
  updateActivity: (actId: string, data: Partial<LeadActivity>) => api.put<LeadActivity>(`/leads/activities/${actId}`, data),
  deleteActivity: (actId: string) => api.delete<any>(`/leads/activities/${actId}`),
  addNote: (id: string, text: string, imageUrl?: string | null) =>
    api.post<LeadNote>(`/leads/${id}/notes`, { text, ...(imageUrl ? { imageUrl } : {}) }),

  // Reportes
  funnel: (r?: ReportRange) => api.get<FunnelReport>('/leads/reports/funnel', clean(r as any)),
  performance: (r?: ReportRange) => api.get<PerformanceReport>('/leads/reports/performance', clean(r as any)),
  sources: (r?: ReportRange) => api.get<SourcesReport>('/leads/reports/sources', clean(r as any)),
  stageTime: (r?: ReportRange) => api.get<StageTimeReport>('/leads/reports/stage-time', clean(r as any)),
  forecast: () => api.get<ForecastReport>('/leads/reports/forecast'),
  lostReasons: (r?: ReportRange) => api.get<LostReasonsReport>('/leads/reports/lost-reasons', clean(r as any)),
};

// ── Formulario web público (sin auth) ──
export const publicLeadForm = {
  get: async (token: string) => {
    const res = await fetch(`${API_URL}/public/lead-form/${encodeURIComponent(token)}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || 'Formulario no disponible');
    return data as { title: string; successMessage: string; businessName: string; logoUrl: string };
  },
  submit: async (token: string, body: Record<string, any>) => {
    const res = await fetch(`${API_URL}/public/lead-form/${encodeURIComponent(token)}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || 'No se pudo enviar');
    return data as { ok: boolean; message?: string };
  },
};
