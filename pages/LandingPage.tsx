
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
    { name: "Gestión de Proyectos", description: "Planifica, ejecuta y supervisa tus proyectos con herramientas colaborativas, seguimiento de tareas y gestión de recursos.", image: "https://picsum.photos/seed/pm-solution/600/400" },
    { name: "Punto de Venta (POS)", description: "Agiliza tus ventas en tienda física con un sistema POS rápido, manejo de inventario en tiempo real y reportes de ventas detallados.", image: "https://picsum.photos/seed/pos-solution/600/400" },
    { name: "E-commerce Integrado", description: "Lanza y gestiona tu tienda online, sincroniza productos, pedidos y clientes con el resto de tu operación.", image: "https://picsum.photos/seed/ecom-solution/600/400" },
];


export const LandingPage: React.FC = () => {
    const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

    useEffect(() => {
        const smoothScroll = (targetId: string) => {
            const targetElement = document.getElementById(targetId.substring(1));
            if (targetElement) {
                targetElement.scrollIntoView({ behavior: 'smooth' });
            }
        };

        const links = document.querySelectorAll('a[href^="#"]');
        links.forEach(link => {
            link.addEventListener('click', function (e) {
                e.preventDefault();
                const targetId = (this as HTMLAnchorElement).getAttribute('href');
                if (targetId) {
                    smoothScroll(targetId);
                    if(mobileMenuOpen) setMobileMenuOpen(false);
                }
            });
        });
    }, [mobileMenuOpen]);
    
    return (
        <LandingLayout>
            <div className="w-full">
                {/* Navbar */}
                <nav className="bg-white dark:bg-neutral-800 shadow-md fixed w-full z-30 top-0">
                    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between h-16">
                            <div className="flex items-center">
                                <RouterLink to="/" className="text-2xl font-bold text-primary">
                                    Pazzi
                                </RouterLink>
                            </div>
                            <div className="hidden md:flex items-center space-x-4">
                                {navLinks.map(link => (
                                    <a key={link.name} href={link.href} className="text-neutral-600 dark:text-neutral-300 hover:text-primary dark:hover:text-primary px-3 py-2 rounded-md text-sm font-medium">
                                        {link.name}
                                    </a>
                                ))}
                                <RouterLink to="/login" className="bg-primary hover:bg-secondary text-white px-4 py-2 rounded-md text-sm font-medium transition-colors">
                                    Iniciar Sesión
                                </RouterLink>
                                <RouterLink to="/register" className="text-primary dark:text-primary hover:bg-primary/10 dark:hover:bg-primary/20 px-4 py-2 rounded-md text-sm font-medium border border-primary transition-colors">
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
                <section id="hero" className="relative bg-gradient-to-r from-primary via-teal-600 to-secondary text-white pt-32 pb-20 md:pt-40 md:pb-28 flex items-center justify-center min-h-[calc(100vh-64px)] md:min-h-screen" style={{backgroundImage: "url('https://picsum.photos/seed/pazzi-hero/1920/1080')", backgroundSize: 'cover', backgroundPosition: 'center'}}>
                    <div className="absolute inset-0 bg-black opacity-50"></div>
                    <div className="container mx-auto px-6 text-center relative z-10">
                        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold mb-6 leading-tight">
                            Transforma tu Negocio con <span className="text-accent">Pazzi</span>
                        </h1>
                        <p className="text-lg sm:text-xl md:text-2xl text-neutral-200 mb-10 max-w-3xl mx-auto">
                            La plataforma integral que unifica gestión de proyectos, punto de venta y e-commerce para potenciar tu crecimiento.
                        </p>
                        <a href="#solutions" className="bg-accent hover:bg-amber-600 text-white font-semibold py-3 px-8 rounded-lg text-lg transition duration-150 shadow-lg transform hover:scale-105">
                            Descubre Más
                        </a>
                    </div>
                </section>

                {/* Benefits Section */}
                <section id="benefits" className="py-16 md:py-24 bg-white dark:bg-neutral-800">
                    <div className="container mx-auto px-6">
                        <h2 className="text-3xl font-bold text-center text-neutral-800 dark:text-neutral-100 mb-4">¿Por qué Elegir Pazzi?</h2>
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
                <section id="solutions" className="py-16 md:py-24 bg-neutral-100 dark:bg-neutral-900">
                    <div className="container mx-auto px-6">
                        <h2 className="text-3xl font-bold text-center text-neutral-800 dark:text-neutral-100 mb-12">Impulsa Cada Área de tu Empresa</h2>
                        {solutionItems.map((solution, index) => (
                            <div key={index} className={`flex flex-col md:flex-row items-center gap-8 mb-16 ${index % 2 === 1 ? 'md:flex-row-reverse' : ''}`}>
                                <div className="md:w-1/2">
                                    <img src={solution.image} alt={solution.name} className="rounded-lg shadow-xl aspect-video object-cover" />
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
</div>
        </LandingLayout>
    );
};

                