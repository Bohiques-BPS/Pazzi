
import React, { useEffect } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { LandingLayout } from '../components/layout/LandingLayout';
import { 
    BriefcaseIcon, 
    LightBulbIcon, 
    ChartPieIcon, 
    ShieldCheckIcon, 
    UserIcon, 
    KeyIcon,  
    MenuIcon, 
    XMarkIcon, 
    FacebookIcon, 
    TwitterIcon,  
    LinkedInIcon  
} from '../components/icons';

const navLinks = [
    { name: 'Beneficios', href: '#benefits' },
    { name: 'Soluciones', href: '#solutions' },
    { name: 'Planes', href: '#pricing' },
    { name: 'Contacto', href: '#contact' },
];

const benefitItems = [
    { title: "Gestión Todo en Uno", description: "Centraliza proyectos, ventas y e-commerce en una única interfaz intuitiva.", icon: <BriefcaseIcon /> },
    { title: "Optimización del Tiempo", description: "Automatiza tareas y flujos de trabajo para que te concentres en lo importante.", icon: <ChartPieIcon /> },
    { title: "Decisiones Inteligentes", description: "Accede a reportes y análisis en tiempo real para impulsar tu crecimiento.", icon: <LightBulbIcon /> },
    { title: "Seguro y Escalable", description: "Una plataforma robusta que crece contigo, manteniendo tus datos protegidos.", icon: <ShieldCheckIcon /> },
];

const solutionItems = [
    { name: "Gestión de Proyectos", description: "Nuestro CRM te permite optimizar la gestión de tus proyectos, desde la planificación hasta la entrega. Podrás centralizar tareas, asignar responsabilidades y monitorear el progreso en tiempo real, asegurando entregas exitosas y a tiempo. Esto te brindará mayor control y visibilidad, facilitará la colaboración fluida de tu equipo y permitirá la optimización de recursos. Además, podrás reducir riesgos al identificar problemas proactivamente y tomar decisiones informadas gracias a datos en tiempo real.", image: "/gestion.jpg", alt: "Equipo colaborando en la gestión de un proyecto con Pazzi." },
    { name: "Punto de Venta (POS)", description: "Punto de Venta (POS) Transforma tu proceso de ventas con nuestro Punto de Venta (POS) integrado. Agiliza cada transacción, desde el cobro hasta la gestión de inventario, para ofrecer una experiencia de compra fluida y eficiente. Con el control total de tus operaciones al instante, podrás tomar decisiones inteligentes y potenciar el crecimiento de tu negocio.", image: "/pos.jpg", alt: "Sistema POS moderno de Pazzi agilizando una venta en tienda." },
    { name: "E-commerce Integrado", description: "Potencia tu negocio con un e-commerce completamente integrado a tu CRM. Gestiona productos, pedidos y clientes desde una única plataforma, ofreciendo una experiencia de compra online excepcional. Optimiza tus operaciones, centraliza la información y escala tus ventas sin esfuerzo.", image: "ecommerce.jpg", alt: "Gestionando una tienda e-commerce integrada con Pazzi." },
];

const logoUrl = "/Logo.png"; 

export const LandingPage: React.FC = () => {
    const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

    useEffect(() => {
        const smoothScroll = (targetIdWithHash: string) => {
            // targetIdWithHash es algo como "#benefits"
            const elementId = targetIdWithHash.substring(1); // "benefits"
            const targetElement = document.getElementById(elementId);
            if (targetElement) {
                targetElement.scrollIntoView({ behavior: 'smooth' });
            }
        };

        const links = document.querySelectorAll('a[href^="#"]');
        // Almacena los listeners para poder removerlos en la limpieza
        const listeners: Array<{element: HTMLAnchorElement, handler: (e: MouseEvent) => void}> = [];

        links.forEach(linkNode => {
            const anchorElement = linkNode as HTMLAnchorElement;
            const hrefAttribute = anchorElement.getAttribute('href');

            // Aplica scroll suave solo a identificadores de fragmento reales (ej. #benefits),
            // y no a enlaces de router basados en hash (ej. #/login o /#/login)
            if (hrefAttribute && hrefAttribute.startsWith('#') && !hrefAttribute.startsWith('#/')) {
                const handler = (e: MouseEvent) => {
                    e.preventDefault(); // Prevenir solo para anclas de scroll suave
                    smoothScroll(hrefAttribute); // Usar hrefAttribute de la clausura
                    if (mobileMenuOpen) { // mobileMenuOpen de la clausura
                        setMobileMenuOpen(false); // setMobileMenuOpen de la clausura
                    }
                };
                anchorElement.addEventListener('click', handler);
                listeners.push({element: anchorElement, handler});
            }
        });
    
        return () => {
            listeners.forEach(({element, handler}) => {
                element.removeEventListener('click', handler);
            });
        };
    }, [mobileMenuOpen, setMobileMenuOpen]); // Añadir setMobileMenuOpen a las dependencias
    
    
    return (
        <LandingLayout>
            <div className="w-full">
                {/* Navbar */}
                <nav className="bg-white dark:bg-neutral-800 shadow-md fixed w-full z-30 top-0">
                    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between h-20">
                            <div className="flex items-center">
                                <RouterLink to="/" className="flex items-center">
                                    <img src={logoUrl} alt="Pazzi Logo" className="h-14" />
                                </RouterLink>
                            </div>
                            <div className="hidden md:flex items-center space-x-4">
                                {navLinks.map(link => (
                                    <a key={link.name} href={link.href} className="text-neutral-600 dark:text-neutral-300 hover:text-primary dark:hover:text-primary px-3 py-2 rounded-md text-lg  font-bold uppercase">
                                        {link.name}
                                    </a>
                                ))}
                                <RouterLink to="/login" className="bg-primary hover:bg-secondary text-white px-4 py-2 rounded-md text-lg font-medium transition-colors">
                                    Iniciar Sesión
                                </RouterLink>
                                <RouterLink to="/register" className="text-primary dark:text-primary hover:bg-primary/10 dark:hover:bg-primary/20 px-4 py-2 rounded-md text-lg font-medium border border-primary transition-colors">
                                    Registrarse
                                </RouterLink>
                            </div>
                            <div className="md:hidden flex items-center">
                                <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} type="button" className="inline-flex items-center justify-center p-2 rounded-md text-neutral-400 hover:text-primary hover:bg-neutral-100 dark:hover:bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary" aria-controls="mobile-menu" aria-expanded="false">
                                    <span className="sr-only">Abrir menú principal</span>
                                    {mobileMenuOpen ? <XMarkIcon className="block h-6 w-6" /> : <MenuIcon className="block h-6 w-6" />}
                                </button>
                            </div>
                        </div>
                    </div>
                    {/* Mobile Menu */}
                    {mobileMenuOpen && (
                        <div className="md:hidden" id="mobile-menu">
                            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                                {navLinks.map(link => (
                                    <a key={link.name} href={link.href} className="text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 hover:text-primary dark:hover:text-primary block px-3 py-2 rounded-md text-base font-medium">
                                        {link.name}
                                    </a>
                                ))}
                            </div>
                            <div className="pt-4 pb-3 border-t border-neutral-200 dark:border-neutral-700">
                                <div className="flex items-center px-5">
                                   <RouterLink to="/login" className="w-full bg-primary hover:bg-secondary text-white px-4 py-2 rounded-md text-sm font-medium transition-colors text-center">
                                        Iniciar Sesión
                                    </RouterLink>
                                </div>
                                <div className="mt-3 px-5">
                                     <RouterLink to="/register" className="w-full block text-center text-primary dark:text-primary hover:bg-primary/10 dark:hover:bg-primary/20 px-4 py-2 rounded-md text-sm font-medium border border-primary transition-colors">
                                        Registrarse
                                    </RouterLink>
                                </div>
                            </div>
                        </div>
                    )}
                </nav>

                {/* Hero Section */}
                <section id="hero" className="relative bg-gradient-to-r from-primary via-teal-600 to-secondary text-white pt-32 pb-20 md:pt-40 md:pb-28 flex items-center justify-center min-h-[calc(100vh-64px)] md:min-h-screen bg-fixed" style={{backgroundImage: "url('/banner.jpg')", backgroundSize: 'cover', backgroundPosition: 'top center'}}>
                    <div className="absolute inset-0 bg-black opacity-50"></div>
                    <div className="container mx-auto px-6 text-center relative z-10">
                        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold mb-6 leading-tight">
                            Transforma tu Negocio con <span className="text-primary">
                                PAZI</span>
                        </h1>
                        <p className="text-lg sm:text-xl md:text-2xl text-neutral-200 mb-10 max-w-3xl mx-auto">
                            La plataforma integral que unifica gestión de proyectos, punto de venta y e-commerce para potenciar tu crecimiento.
                        </p>
                        <a href="#solutions" className="bg-primary hover:bg-amber-600 text-white font-semibold py-3 px-8 rounded-lg text-lg transition duration-150 shadow-lg transform hover:scale-105">
                            Descubre Más
                        </a>
                    </div>
                </section>

                {/* Benefits Section */}
                <section id="benefits" className="py-12 md:py-16 bg-white dark:bg-neutral-800">
                    <div className="container mx-auto px-6">
                        <h2 className="text-3xl font-bold text-center text-neutral-800 dark:text-neutral-100 mb-4 uppercase text-primary">¿Por qué Elegir Pazi?</h2>
                        <p className="text-center text-neutral-600 dark:text-neutral-300 mb-12 max-w-2xl mx-auto">
                            Pazzi está diseñado para simplificar tus operaciones diarias, ofreciéndote control total y herramientas poderosas para cada aspecto de tu negocio.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                            {benefitItems.map((item, index) => (
                                <div key={index} className="bg-neutral-50 dark:bg-neutral-700 p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
                                    <div className="text-primary text-3xl mb-4 flex items-center justify-center w-12 h-12 bg-primary/10 rounded-full mx-auto">
                                        {React.cloneElement(item.icon, { className: "w-6 h-6" })}
                                    </div>
                                    <h3 className="text-xl font-semibold text-neutral-800 dark:text-neutral-100 mb-2 text-center">{item.title}</h3>
                                    <p className="text-neutral-600 dark:text-neutral-300 text-sm text-center">{item.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Solutions Section */}
                <section id="solutions" className="py-12 md:py-16 bg-neutral-100 dark:bg-neutral-900">
                    <div className="container mx-auto px-6">
                        <h2 className="text-3xl font-bold text-center text-neutral-800 dark:text-neutral-100 mb-12 text-primary uppercase">Impulsa Cada Área de tu Empresa</h2>
                        {solutionItems.map((solution, index) => (
                            <div key={index} className={`flex flex-col md:flex-row items-center gap-8 mb-16 ${index % 2 === 1 ? 'md:flex-row-reverse' : ''}`}>
                                <div className="md:w-1/2">
                                    <img src={solution.image} alt={solution.alt} className="rounded-lg shadow-xl aspect-video object-cover" />
                                </div>
                                <div className="md:w-1/2">
                                    <h3 className="text-2xl font-semibold text-primary mb-3">{solution.name}</h3>
                                    <p className="text-neutral-600 dark:text-neutral-300 leading-relaxed">{solution.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Pricing Section (Placeholder) */}
                <section id="pricing" className="py-16 md:py-24 bg-white dark:bg-neutral-800">
                    <div className="container mx-auto px-6">
                        <h2 className="text-3xl font-bold text-center text-neutral-800 dark:text-neutral-100 mb-12">Planes Flexibles para Ti</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {['Básico', 'Profesional', 'Empresa'].map(plan => (
                                <div key={plan} className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-8 shadow-lg hover:shadow-primary/20 transition-shadow text-center">
                                    <h3 className="text-2xl font-semibold text-primary mb-4">{plan}</h3>
                                    <p className="text-4xl font-bold text-neutral-800 dark:text-neutral-100 mb-2">$XX <span className="text-sm font-normal text-neutral-500 dark:text-neutral-400">/mes</span></p>
                                    <ul className="text-neutral-600 dark:text-neutral-300 space-y-2 my-6">
                                        <li>Característica 1</li>
                                        <li>Característica 2</li>
                                        <li>Característica 3</li>
                                    </ul>
                                    <RouterLink to="/register" className="w-full bg-primary hover:bg-secondary text-white font-semibold py-2 px-6 rounded-md transition-colors">
                                        Elegir Plan
                                    </RouterLink>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Contact Section (Placeholder) */}
                <section id="contact" className="py-16 md:py-24 bg-neutral-100 dark:bg-neutral-900">
                    <div className="container mx-auto px-6">
                        <h2 className="text-3xl font-bold text-center text-neutral-800 dark:text-neutral-100 mb-12">Ponte en Contacto</h2>
                        <div className="max-w-lg mx-auto bg-white dark:bg-neutral-800 p-8 rounded-lg shadow-xl">
                            <form className="space-y-6">
                                <div>
                                    <label htmlFor="name" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Nombre Completo</label>
                                    <input type="text" name="name" id="name" className="mt-1 block w-full px-3 py-2 bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary" />
                                </div>
                                <div>
                                    <label htmlFor="email_contact_form" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Email</label>
                                    <input type="email" name="email_contact_form" id="email_contact_form" className="mt-1 block w-full px-3 py-2 bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary" />
                                </div>
                                <div>
                                    <label htmlFor="message" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Mensaje</label>
                                    <textarea name="message" id="message" rows={4} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"></textarea>
                                </div>
                                <div>
                                    <button type="submit" className="w-full bg-primary hover:bg-secondary text-white font-semibold py-2.5 px-4 rounded-md shadow-sm transition-colors duration-150">
                                        Enviar Mensaje
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </section>

                {/* Footer */}
                <footer className="bg-neutral-800 dark:bg-black text-neutral-300 dark:text-neutral-400 py-12">
                    <div className="container mx-auto px-6">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                            <div>
                                <img src={logoUrl} alt="Pazzi Logo" className="h-7 mb-3" />
                                <p className="text-sm">Simplificando la gestión de tu negocio para que puedas enfocarte en crecer.</p>
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-white mb-3">Navegación</h3>
                                <ul className="space-y-2 text-sm">
                                    {navLinks.map(link => (
                                        <li key={link.name}><a href={link.href} className="hover:text-primary">{link.name}</a></li>
                                    ))}
                                </ul>
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-white mb-3">Legal</h3>
                                <ul className="space-y-2 text-sm">
                                    <li><a href="#" className="hover:text-primary">Términos de Servicio</a></li>
                                    <li><a href="#" className="hover:text-primary">Política de Privacidad</a></li>
                                </ul>
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-white mb-3">Síguenos</h3>
                                <div className="flex space-x-4">
                                    <a href="#" className="hover:text-primary"><FacebookIcon /></a>
                                    <a href="#" className="hover:text-primary"><TwitterIcon /></a>
                                    <a href="#" className="hover:text-primary"><LinkedInIcon /></a>
                                </div>
                            </div>
                        </div>
                        <div className="mt-10 pt-8 border-t border-neutral-700 text-center text-sm">
                            &copy; {new Date().getFullYear()} Pazzi. Todos los derechos reservados.
                        </div>
                    </div>
                </footer>
            </div>
        </LandingLayout>
    );
};
