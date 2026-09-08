import React from 'react';
import { BusinessDataConfiguration } from '../../components/admin/BusinessDataConfiguration';
import { ModulesConfiguration } from '../../components/admin/ModulesConfiguration';
import { AlertsConfiguration } from '../../components/admin/AlertsConfiguration';
import { LoginActivityLog } from '../../components/admin/LoginActivityLog';

/** Cada opción del sidebar de Administración es ahora su propia página. */
export const AdminBusinessPage: React.FC = () => <div className="space-y-6"><BusinessDataConfiguration /></div>;
export const AdminModulesPage: React.FC = () => <div className="space-y-6"><ModulesConfiguration /></div>;
export const AdminAlertsPage: React.FC = () => <div className="space-y-6"><AlertsConfiguration /></div>;
export const AdminAccessLogPage: React.FC = () => <div className="space-y-6"><LoginActivityLog /></div>;
