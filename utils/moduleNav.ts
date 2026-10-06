import { AppModule } from '../types';

// Slugs de URL ↔ módulo (para la vista principal /inicio/:slug).
export const MODULE_SLUG: Record<string, AppModule> = {
  tienda: AppModule.TIENDA,
  proyectos: AppModule.PROJECT_MANAGEMENT,
  pos: AppModule.POS,
  ecommerce: AppModule.ECOMMERCE,
  admin: AppModule.ADMINISTRACION,
};

export const slugForModule = (m: AppModule): string =>
  Object.keys(MODULE_SLUG).find(k => MODULE_SLUG[k] === m) || 'tienda';

export const hubPath = (m: AppModule): string => `/inicio/${slugForModule(m)}`;
