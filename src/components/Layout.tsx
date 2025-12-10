import { Link, Outlet, useLocation } from 'react-router-dom';
import {
  ClipboardList,
  Package,
  Home as HomeIcon,
  FileSpreadsheet,
  Settings,
  CalendarDays,
  MessageSquareWarning,
  Droplets,
  LayoutDashboard,
  Zap,
  Bug
} from 'lucide-react';
import { useMemo } from 'react';

export default function Layout() {
  const location = useLocation();

  const isActivePath = (target: string) => {
    const current = location.pathname;
    if (target === '/') return current === '/';
    return current === target || current.startsWith(target + '/');
  };

  const sectionMeta = useMemo(() => {
    const path = location.pathname;

    if (path === '/') {
      return {
        title: 'Inicio',
        description:
          'Resumen ejecutivo de operación: agua, energía, inspecciones, requisiciones y órdenes de trabajo.',
      };
    }
    if (path.startsWith('/dashboard')) {
      return {
        title: 'Tablero de Tareas',
        description:
          'Vista Kanban de tareas por supervisor, con foco en prioridades diarias.',
      };
    }
    if (path.startsWith('/requisiciones')) {
      return {
        title: 'Requisiciones',
        description:
          'Flujo completo de materiales e insumos: solicitud, compras y surtido.',
      };
    }
    if (path.startsWith('/inspecciones')) {
      return {
        title: 'Inspecciones de Habitaciones',
        description:
          'Ciclos de inspección, hallazgos, evidencias fotográficas y seguimiento de fallas.',
      };
    }
    if (path.startsWith('/sabanas')) {
      return {
        title: 'Sábanas de Ocupación',
        description:
          'Control de ocupación, proyecciones y soporte para análisis de cargas de trabajo.',
      };
    }
    if (path.startsWith('/fumigacion')) {
      return {
        title: 'Fumigación',
        description:
          'Control de cebaderas, trampas UV y gestión de inspecciones de control de plagas.',
      };
    }
    if (path.startsWith('/beos')) {
      return {
        title: 'Banquet Events (BEOs)',
        description:
          'Calendario de eventos, montajes y requerimientos especiales para coordinación con Ingeniería.',
      };
    }
    if (path.startsWith('/working-orders')) {
      return {
        title: 'Working Orders',
        description:
          'Gestión de órdenes de trabajo, tiempos de respuesta y estatus por categoría.',
      };
    }
    if (path.startsWith('/water-chemistry')) {
      return {
        title: 'Química del Agua',
        description:
          'Control de piscinas, jacuzzis y cuerpos de agua con base en análisis y límites operativos.',
      };
    }
    if (path.startsWith('/energy')) {
      return {
        title: 'Energía',
        description:
          'Monitoreo de consumos de agua, gas y electricidad, con enfoque en costo y eficiencia.',
      };
    }
    if (path.startsWith('/admin')) {
      return {
        title: 'Administración del Sistema',
        description:
          'Configuración de módulos, usuarios, permisos y parámetros de operación.',
      };
    }

    return {
      title: 'CAS:M Control Activities',
      description:
        'Centro de operaciones para Ingeniería de Secrets Puerto Los Cabos.',
    };
  }, [location.pathname]);

  return (
    <div className="casm-layout">
      {/* HEADER + NAV INTEGRADO (FIJO) */}
      <header className="casm-layout__header">
        {/* Fila superior: logos + títulos + estado */}
        <div className="casm-layout__header-inner">
          <div className="casm-layout__brand">
            <div className="casm-layout__logo-group">
              <div className="casm-layout__logo casm-layout__logo--primary">
                <img
                  src="https://elinge.tech/seplc/logos/casm.png"
                  alt="CAS:M Logo"
                />
              </div>
              <div className="casm-layout__logo-separator" />
              <div className="casm-layout__logo casm-layout__logo--secondary">
                <img
                  src="https://elinge.tech/seplc/logos/seplclogo.png"
                  alt="Secrets Puerto Los Cabos"
                />
              </div>
            </div>

            <div className="casm-layout__title-block">
              <div className="casm-layout__title-tagline">
                Secrets Puerto Los Cabos · Ingeniería
              </div>
              <h1 className="casm-layout__title">
                CAS:M Control Activities Center
              </h1>
              <p className="casm-layout__title-sub">
                Herramienta de control para operación, mantenimiento y análisis.
              </p>
            </div>
          </div>

          <div className="casm-layout__header-right">

            
          </div>
        </div>

        {/* Fila inferior: navegación integrada */}
        <div className="casm-layout__nav-row">
          <div className="casm-layout__nav-inner">
            <div className="casm-layout__nav-scroll no-scrollbar">
              <NavLink
                to="/"
                icon={HomeIcon}
                label="Inicio"
                active={isActivePath('/')}
              />
              <NavLink
                to="/dashboard"
                icon={LayoutDashboard}
                label="Tablero"
                active={isActivePath('/dashboard')}
              />
              <NavLink
                to="/requisiciones"
                icon={Package}
                label="Requisiciones"
                active={isActivePath('/requisiciones')}
              />
              <NavLink
                to="/inspecciones"
                icon={ClipboardList}
                label="Inspecciones"
                active={isActivePath('/inspecciones')}
              />
              <NavLink
                to="/sabanas"
                icon={FileSpreadsheet}
                label="Sábanas"
                active={isActivePath('/sabanas')}
              />
              <NavLink
                to="/fumigacion"
                icon={Bug}
                label="Fumigación"
                active={isActivePath('/fumigacion')}
              />
              <NavLink
                to="/beos"
                icon={CalendarDays}
                label="BEOs"
                active={isActivePath('/beos')}
              />
              <NavLink
                to="/working-orders"
                icon={MessageSquareWarning}
                label="Working Orders"
                active={isActivePath('/working-orders')}
              />
              <NavLink
                to="/water-chemistry"
                icon={Droplets}
                label="Química"
                active={isActivePath('/water-chemistry')}
              />
              <NavLink
                to="/energy"
                icon={Zap}
                label="Energía"
                active={isActivePath('/energy')}
              />
              <NavLink
                to="/admin"
                icon={Settings}
                label="Admin"
                active={isActivePath('/admin')}
              />
            </div>
          </div>
        </div>
      </header>

      {/* CONTENIDO */}
      <main className="casm-layout__main">
        <div className="casm-layout__main-inner">
          <section className="casm-layout__section-meta">
            <div className="casm-layout__section-meta-text">
              <h2 className="casm-layout__section-title">
                {sectionMeta.title}
              </h2>
              <p className="casm-layout__section-description">
                {sectionMeta.description}
              </p>
            </div>
          </section>

          <div className="casm-layout__section-content">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}

interface NavLinkProps {
  to: string;
  icon: React.ElementType;
  label: string;
  active: boolean;
}

function NavLink({ to, icon: Icon, label, active }: NavLinkProps) {
  return (
    <Link
      to={to}
      className={`casm-nav-link ${active ? 'casm-nav-link--active' : ''}`}
    >
      <span className="casm-nav-link__icon-wrap">
        <Icon className="casm-nav-link__icon" />
      </span>
      <span className="casm-nav-link__label">{label}</span>
      <span className="casm-nav-link__underline" />
    </Link>
  );
}
