import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import logo from '../../assets/logo.png';

/* ─────────────────────────────────────────────────────────────
 * Datos del negocio/aplicación. EDITA AQUÍ si cambian.
 * Estas páginas son públicas (sin login) y sirven para el registro
 * de la app (OAuth de Google, etc.) y para el pie de la tienda.
 * ───────────────────────────────────────────────────────────── */
const APP_NAME = 'Pazzi';
const COMPANY = 'Bohiques';
const CONTACT_EMAIL = 'soporte@ppazi.com';
const WEBSITE = 'https://ppazi.com';
const LAST_UPDATED = '4 de septiembre de 2026';

interface Section {
    heading: string;
    body: React.ReactNode;
}

const PRIVACY_SECTIONS: Section[] = [
    {
        heading: '1. Introducción',
        body: (
            <>
                En {APP_NAME} (operado por {COMPANY}) valoramos tu privacidad. Esta Política de Privacidad
                explica qué información recopilamos, cómo la usamos y protegemos, y qué opciones tienes sobre
                tus datos cuando utilizas nuestra plataforma de gestión comercial (CRM/ERP, punto de venta,
                inventario, tienda en línea y gestión de proyectos).
            </>
        ),
    },
    {
        heading: '2. Información que recopilamos',
        body: (
            <>
                <p className="mb-2">Recopilamos únicamente la información necesaria para prestar el servicio:</p>
                <ul className="list-disc pl-5 space-y-1">
                    <li><strong>Datos de cuenta:</strong> nombre, correo electrónico, contraseña (cifrada) y rol dentro del negocio.</li>
                    <li><strong>Datos del negocio:</strong> nombre comercial, sucursales, empleados, clientes, productos, inventario, ventas y facturación que tú registras.</li>
                    <li><strong>Datos de uso:</strong> registros técnicos (fecha/hora de acceso, dirección IP, tipo de navegador) para seguridad y diagnóstico.</li>
                    <li><strong>Contenido que subes:</strong> imágenes de productos, logos y documentos que decides almacenar en la plataforma.</li>
                </ul>
            </>
        ),
    },
    {
        heading: '3. Cómo usamos tu información',
        body: (
            <>
                <p className="mb-2">Usamos la información para:</p>
                <ul className="list-disc pl-5 space-y-1">
                    <li>Proveer, mantener y mejorar las funcionalidades de {APP_NAME}.</li>
                    <li>Procesar ventas, facturas, órdenes y pagos que tú generas.</li>
                    <li>Enviar correos transaccionales (activación de cuenta, recuperación de contraseña, confirmaciones y notificaciones del servicio).</li>
                    <li>Garantizar la seguridad, prevenir fraude y cumplir obligaciones legales.</li>
                </ul>
                <p className="mt-2">No vendemos ni alquilamos tus datos personales a terceros.</p>
            </>
        ),
    },
    {
        heading: '4. Proveedores y servicios de terceros',
        body: (
            <>
                <p className="mb-2">Para operar utilizamos proveedores que procesan datos por cuenta nuestra, bajo sus propias políticas de privacidad:</p>
                <ul className="list-disc pl-5 space-y-1">
                    <li><strong>Proveedor de alojamiento y base de datos</strong> para almacenar la información del servicio.</li>
                    <li><strong>Servicio de correo (SMTP)</strong> para enviar mensajes transaccionales.</li>
                    <li><strong>Almacenamiento de imágenes</strong> para las fotos de productos y logos.</li>
                    <li><strong>Google:</strong> si conectas tu calendario, accedemos únicamente a los permisos que autorizas para crear eventos/reuniones de tus proyectos. Puedes revocar el acceso en cualquier momento desde tu cuenta de Google.</li>
                </ul>
            </>
        ),
    },
    {
        heading: '5. Cookies y tecnologías similares',
        body: (
            <>
                Usamos almacenamiento local del navegador y cookies estrictamente necesarias para mantener tu
                sesión iniciada y recordar preferencias (como el idioma o el tema). No utilizamos cookies de
                publicidad de terceros.
            </>
        ),
    },
    {
        heading: '6. Conservación de los datos',
        body: (
            <>
                Conservamos tu información mientras tu cuenta esté activa o según sea necesario para prestar el
                servicio y cumplir obligaciones legales, contables o fiscales. Puedes solicitar la eliminación de
                tu cuenta escribiéndonos al correo de contacto.
            </>
        ),
    },
    {
        heading: '7. Seguridad',
        body: (
            <>
                Aplicamos medidas técnicas y organizativas razonables para proteger tu información: contraseñas
                cifradas, control de acceso por roles y permisos, y conexiones seguras (HTTPS). Ningún sistema es
                100% infalible, pero trabajamos para mantener tus datos protegidos.
            </>
        ),
    },
    {
        heading: '8. Tus derechos',
        body: (
            <>
                Puedes solicitar acceder, corregir, exportar o eliminar tus datos personales, así como oponerte a
                ciertos tratamientos. Para ejercer estos derechos, contáctanos al correo indicado más abajo.
            </>
        ),
    },
    {
        heading: '9. Cambios a esta política',
        body: (
            <>
                Podemos actualizar esta Política de Privacidad ocasionalmente. Publicaremos la versión vigente en
                esta misma página, indicando la fecha de última actualización.
            </>
        ),
    },
    {
        heading: '10. Contacto',
        body: (
            <>
                Si tienes preguntas sobre esta política o sobre el tratamiento de tus datos, escríbenos a{' '}
                <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary font-medium hover:underline">{CONTACT_EMAIL}</a>.
            </>
        ),
    },
];

const TERMS_SECTIONS: Section[] = [
    {
        heading: '1. Aceptación de los términos',
        body: (
            <>
                Al crear una cuenta o utilizar {APP_NAME} (operado por {COMPANY}) aceptas estos Términos y
                Condiciones. Si no estás de acuerdo con ellos, no debes usar la plataforma.
            </>
        ),
    },
    {
        heading: '2. Descripción del servicio',
        body: (
            <>
                {APP_NAME} es una plataforma en línea de gestión comercial que incluye, entre otros, punto de
                venta (POS), inventario, facturación, clientes, tienda en línea y gestión de proyectos. Podemos
                añadir, modificar o retirar funcionalidades para mejorar el servicio.
            </>
        ),
    },
    {
        heading: '3. Cuentas y responsabilidad',
        body: (
            <>
                <ul className="list-disc pl-5 space-y-1">
                    <li>Eres responsable de la veracidad de la información que registras y de mantener la confidencialidad de tus credenciales.</li>
                    <li>Eres responsable de la actividad realizada bajo tu cuenta y las de los usuarios que crees dentro de tu negocio.</li>
                    <li>Debes notificarnos de inmediato ante cualquier uso no autorizado de tu cuenta.</li>
                </ul>
            </>
        ),
    },
    {
        heading: '4. Uso aceptable',
        body: (
            <>
                <p className="mb-2">Te comprometes a no:</p>
                <ul className="list-disc pl-5 space-y-1">
                    <li>Usar la plataforma para fines ilegales o no autorizados.</li>
                    <li>Intentar vulnerar la seguridad, acceder a datos de otros negocios o interrumpir el servicio.</li>
                    <li>Cargar contenido que infrinja derechos de terceros o la ley aplicable.</li>
                </ul>
            </>
        ),
    },
    {
        heading: '5. Contenido y propiedad',
        body: (
            <>
                Los datos que ingresas (productos, clientes, ventas, etc.) son de tu propiedad. Nos otorgas una
                licencia limitada para procesarlos con el único fin de prestarte el servicio. El software, la
                marca y el diseño de {APP_NAME} son propiedad de {COMPANY} y están protegidos por las leyes
                aplicables.
            </>
        ),
    },
    {
        heading: '6. Pagos y facturación',
        body: (
            <>
                Si tu plan incluye cargos, aceptas pagar las tarifas correspondientes. Las funciones de
                facturación, impuestos (como el IVU) y cobros que ofrece la plataforma son herramientas de apoyo;
                eres responsable de verificar el cumplimiento fiscal de tu negocio.
            </>
        ),
    },
    {
        heading: '7. Disponibilidad del servicio',
        body: (
            <>
                Trabajamos para mantener el servicio disponible, pero no garantizamos que sea ininterrumpido o
                libre de errores. Podemos realizar mantenimientos programados o cambios necesarios para su
                operación.
            </>
        ),
    },
    {
        heading: '8. Limitación de responsabilidad',
        body: (
            <>
                En la medida permitida por la ley, {APP_NAME} y {COMPANY} no serán responsables por daños
                indirectos, pérdida de datos o lucro cesante derivados del uso o la imposibilidad de uso del
                servicio. Es tu responsabilidad mantener respaldos de la información crítica.
            </>
        ),
    },
    {
        heading: '9. Terminación',
        body: (
            <>
                Puedes dejar de usar el servicio en cualquier momento. Podemos suspender o cancelar cuentas que
                incumplan estos términos o que representen un riesgo para la plataforma u otros usuarios.
            </>
        ),
    },
    {
        heading: '10. Cambios a los términos',
        body: (
            <>
                Podemos actualizar estos Términos ocasionalmente. La versión vigente se publicará en esta página
                con su fecha de última actualización. El uso continuado del servicio implica la aceptación de los
                cambios.
            </>
        ),
    },
    {
        heading: '11. Contacto',
        body: (
            <>
                Para cualquier consulta sobre estos Términos, escríbenos a{' '}
                <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary font-medium hover:underline">{CONTACT_EMAIL}</a>.
            </>
        ),
    },
];

interface LegalPageProps {
    variant: 'privacy' | 'terms';
}

export const LegalPage: React.FC<LegalPageProps> = ({ variant }) => {
    const isPrivacy = variant === 'privacy';
    const title = isPrivacy ? 'Política de Privacidad' : 'Términos y Condiciones';
    const sections = isPrivacy ? PRIVACY_SECTIONS : TERMS_SECTIONS;

    useEffect(() => {
        document.title = `${title} · ${APP_NAME}`;
        window.scrollTo(0, 0);
    }, [title]);

    return (
        <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200">
            {/* Encabezado */}
            <header className="bg-white dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700">
                <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
                    <a href={WEBSITE} className="flex items-center gap-2">
                        <img src={logo} alt={APP_NAME} className="h-8" />
                    </a>
                    <Link to="/login" className="text-sm text-neutral-500 dark:text-neutral-400 hover:text-primary transition-colors">
                        Ir a la aplicación
                    </Link>
                </div>
            </header>

            {/* Contenido */}
            <main className="max-w-3xl mx-auto px-6 py-10 md:py-14">
                <h1 className="text-3xl md:text-4xl font-bold text-neutral-900 dark:text-neutral-50">{title}</h1>
                <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
                    Última actualización: {LAST_UPDATED}
                </p>

                <div className="mt-8 space-y-8">
                    {sections.map((s) => (
                        <section key={s.heading}>
                            <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-2">{s.heading}</h2>
                            <div className="text-[15px] leading-relaxed text-neutral-600 dark:text-neutral-300">{s.body}</div>
                        </section>
                    ))}
                </div>

                {/* Enlace cruzado */}
                <div className="mt-12 pt-6 border-t border-neutral-200 dark:border-neutral-700 text-sm text-neutral-500 dark:text-neutral-400">
                    {isPrivacy ? (
                        <>¿Buscas nuestros <Link to="/terms" className="text-primary hover:underline">Términos y Condiciones</Link>?</>
                    ) : (
                        <>¿Buscas nuestra <Link to="/privacy" className="text-primary hover:underline">Política de Privacidad</Link>?</>
                    )}
                </div>
            </main>

            {/* Pie */}
            <footer className="border-t border-neutral-200 dark:border-neutral-700 py-6">
                <div className="max-w-3xl mx-auto px-6 text-center text-xs text-neutral-400 dark:text-neutral-500">
                    © {new Date().getFullYear()} {APP_NAME} — {COMPANY}. Todos los derechos reservados.
                </div>
            </footer>
        </div>
    );
};

export default LegalPage;
