import { api } from './api';
import type { Lead, Pipeline, LeadSource, LeadActivity, LeadNote } from '../types';

export interface LeadConfig { pipelines: Pipeline[]; sources: LeadSource[]; }

export interface LeadFilters {
  pipelineId?: string;
  stageId?: string;
  status?: 'open' | 'won' | 'lost';
  assignedUserId?: string;
  sourceId?: string;
  q?: string;
  limit?: number;
}

export interface FunnelReport {
  funnel: { stageId: string; name: string; type: string; count: number; value: number; probability: number }[];
  totals: { open: number; won: number; lost: number; conversion: number; weightedPipeline: number };
}

export interface PerformanceReport {
  rows: { userId: string; name: string; open: number; won: number; lost: number; value: number }[];
}

export const leadsService = {
  getConfig: () => api.get<LeadConfig>('/leads/config'),
  createStage: (pipelineId: string, data: { name: string; type?: string; color?: string | null; probability?: number | null }) =>
    api.post<any>(`/leads/pipelines/${pipelineId}/stages`, data),
  updateStage: (id: string, data: any) => api.put<any>(`/leads/stages/${id}`, data),
  deleteStage: (id: string) => api.delete<any>(`/leads/stages/${id}`),
  createSource: (name: string) => api.post<LeadSource>('/leads/sources', { name }),

  list: (filters?: LeadFilters) => api.get<Lead[]>('/leads', filters as any),
  get: (id: string) => api.get<Lead>(`/leads/${id}`),
  create: (data: Partial<Lead>) => api.post<Lead>('/leads', data),
  update: (id: string, data: Partial<Lead>) => api.put<Lead>(`/leads/${id}`, data),
  remove: (id: string) => api.delete<{ deleted: boolean }>(`/leads/${id}`),
  moveStage: (id: string, stageId: string, opts?: { lostReason?: string; order?: number }) =>
    api.post<Lead>(`/leads/${id}/stage`, { stageId, ...opts }),
  assign: (id: string, userId: string | null) => api.post<Lead>(`/leads/${id}/assign`, { userId }),
  convert: (id: string) => api.post<{ clientId: string; alreadyConverted?: boolean }>(`/leads/${id}/convert`, {}),

  addActivity: (id: string, data: Partial<LeadActivity>) => api.post<LeadActivity>(`/leads/${id}/activities`, data),
  updateActivity: (actId: string, data: Partial<LeadActivity>) => api.put<LeadActivity>(`/leads/activities/${actId}`, data),
  addNote: (id: string, text: string, imageUrl?: string | null) =>
    api.post<LeadNote>(`/leads/${id}/notes`, { text, ...(imageUrl ? { imageUrl } : {}) }),

  funnel: (pipelineId?: string) => api.get<FunnelReport>('/leads/reports/funnel', pipelineId ? { pipelineId } : undefined as any),
  performance: () => api.get<PerformanceReport>('/leads/reports/performance'),
};
