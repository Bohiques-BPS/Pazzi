import { useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from '../../contexts/GlobalSettingsContext';

export interface LeadAssignee { uid: string; name: string }

/**
 * Responsables posibles de un lead: colaboradores CON cuenta (Lead.assignedUserId = User.id, nunca Employee.id)
 * + el usuario actual (el gerente dueño no tiene ficha de Employee).
 */
export function useLeadAssignees(): LeadAssignee[] {
  const { getAllEmployees } = useData();
  const { currentUser } = useAuth();
  const { t, lang } = useTranslation();
  return useMemo(() => {
    const list: LeadAssignee[] = (getAllEmployees() as any[])
      .filter(e => e.userId)
      .map(e => ({ uid: String(e.userId), name: `${e.name || ''} ${e.lastName || ''}`.trim() || e.email || t('leads.board.collaborator') }));
    if (currentUser && !list.some(a => a.uid === currentUser.id)) {
      list.unshift({ uid: currentUser.id, name: `${currentUser.name || ''} ${(currentUser as any).lastName || ''}`.trim() || currentUser.email || t('leads.common.me') });
    }
    return list;
    // `t` cambia de identidad en cada render del provider; basta con recalcular al cambiar el idioma.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getAllEmployees, currentUser, lang]);
}
