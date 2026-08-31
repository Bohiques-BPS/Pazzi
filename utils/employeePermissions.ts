/** Permisos efectivos de un empleado: primero los de su ROL, si no, los individuales (legacy). */
export function employeeEffectivePermissions(emp: any): Record<string, boolean> {
    const u = emp?.user || {};
    return (u.permissionRole?.permissions as Record<string, boolean>)
        || (u.permissions?.permissions as Record<string, boolean>)
        || {};
}

/**
 * ¿El empleado puede trabajar en Proyectos/Tareas? (tiene al menos un permiso de projects.* o
 * tasks.*). Se usa para listar solo empleados asignables a proyectos (los de solo-POS no salen).
 */
export function canAccessProjects(emp: any): boolean {
    const p = employeeEffectivePermissions(emp);
    return Object.keys(p).some(k => p[k] && (k.startsWith('projects.') || k.startsWith('tasks.') || k.startsWith('visits.')));
}
