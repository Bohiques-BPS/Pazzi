import { AppModule } from '../types';

// Slugs de URL ↔ módulo (para la vista principal /inicio/:slug).
export const MODULE_SLUG: Record<string, AppModule> = {
  tienda: AppModule.TIENDA,
  proyectos: AppModule.PROJECT_MANAGEMENT,
  pos: AppModule.POS,
  ecommerce: AppModule.ECOMMERCE,
  leads: AppModule.LEADS,
  admin: AppModule.ADMINISTRACION,
};

export const slugForModule = (m: AppModule): string =>
  Object.keys(MODULE_SLUG).find(k => MODULE_SLUG[k] === m) || 'tienda';

// La caja no tiene hub: su módulo abre directo la pantalla de cobro.
export const hubPath = (m: AppModule): string => m === AppModule.CAJA ? '/pos/cashier' : `/inicio/${slugForModule(m)}`;
