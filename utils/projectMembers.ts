/**
 * Agrega a la lista de empleados a los miembros del proyecto que no tienen ficha de empleado
 * (p. ej. el gerente/dueño asignado al proyecto), con los datos que trae el proyecto
 * (Project.employees[].user). Así se pueden asignar a tareas y se ven en las tarjetas.
 */
export function withProjectMembers<T = any>(base: T[], project: any): T[] {
    const members: any[] = Array.isArray(project?.employees) ? project.employees : [];
    if (!members.length) return base;
    const out = [...base] as any[];
    for (const m of members) {
        const uid = String(m?.userId || m?.user?.id || '');
        if (!uid) continue;
        if (out.some((e: any) => String(e.id) === uid || String(e.userId) === uid || String(e.user?.id) === uid)) continue;
        out.push({ id: uid, userId: uid, name: m.user?.name || 'Usuario', lastName: m.user?.lastName || '', profilePictureUrl: m.user?.profilePictureUrl || null });
    }
    return out as T[];
}
