
'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Menu } from 'lucide-react';
import Link from 'next/link';


const SidebarContext = React.createContext<{
    isCollapsed: boolean;
    toggleCollapse: () => void;
    isMobile: boolean;
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
  } | null>(null);
  
export function useSidebar() {
    const context = React.useContext(SidebarContext);
    if (!context) {
        // Retornar valores por defecto en lugar de lanzar error
        return { isCollapsed: false, toggleCollapse: () => {}, isMobile: false, isOpen: true, setIsOpen: () => {} };
    }
    return context;
}

// Provider que envuelve todo el layout
export function SidebarProvider({ children }: { children: React.ReactNode }) {
    const [isCollapsed, setIsCollapsed] = React.useState(false);
    const [isMobile, setIsMobile] = React.useState(false);
    const [isOpen, setIsOpen] = React.useState(true);
    
    React.useEffect(() => {
        const checkMobile = () => {
            const mobile = window.innerWidth < 768;
            setIsMobile(mobile);
            if (mobile) {
                setIsOpen(false);
                setIsCollapsed(false);
            } else {
                setIsOpen(true);
            }
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);
    
    const toggleCollapse = () => {
        if (isMobile) {
            setIsOpen(!isOpen);
        } else {
            setIsCollapsed(!isCollapsed);
        }
    };

    return (
        <SidebarContext.Provider value={{ isCollapsed, toggleCollapse, isMobile, isOpen, setIsOpen }}>
            {children}
        </SidebarContext.Provider>
    );
}

// Botón hamburguesa para móvil (se usa FUERA del sidebar)
export function MobileMenuButton({ className }: { className?: string }) {
    const { isMobile, toggleCollapse, isOpen } = useSidebar();
    
    // No mostrar en desktop o cuando el menú está abierto
    if (!isMobile || isOpen) return null;
    
    return (
        <button
            onClick={toggleCollapse}
            className={cn(
                "fixed top-4 left-4 z-50 p-2 bg-primary text-white rounded-lg shadow-lg hover:bg-primary/90 transition md:hidden",
                className
            )}
            aria-label="Abrir menú"
        >
            <Menu className="h-6 w-6" />
        </button>
    );
}

export const Sidebar = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
    const { isCollapsed, toggleCollapse, isMobile, isOpen, setIsOpen } = useSidebar();

    return (
        <>
            {/* Overlay en móvil cuando el sidebar está abierto */}
            {isMobile && isOpen && (
                <div 
                    className="fixed inset-0 bg-black/50 z-30 md:hidden"
                    onClick={() => setIsOpen(false)}
                />
            )}
            
            <div
                ref={ref}
                className={cn(
                    'bg-primary text-primary-foreground transition-all duration-300 ease-in-out flex flex-col h-screen',
                    isMobile 
                        ? cn(
                            'fixed left-0 top-0 w-80 z-40 transform transition-transform duration-300',
                            isOpen ? 'translate-x-0' : '-translate-x-full'
                          )
                        : cn(
                            isCollapsed ? 'w-16' : 'w-80'
                          ),
                    className
                )}
                {...props}
            >
                {children}
            </div>
            
            {/* Botón de colapso en desktop - posición fija para evitar cortes */}
            {!isMobile && (
                <Button
                    variant="secondary"
                    size="icon"
                    className="fixed bottom-4 rounded-full h-8 w-8 bg-card text-card-foreground hover:bg-card/80 z-50 shadow-md transition-all duration-300"
                    style={{ left: isCollapsed ? 'calc(4rem - 1rem)' : 'calc(20rem - 1rem)' }}
                    onClick={toggleCollapse}
                >
                    <ChevronLeft className={cn("h-4 w-4 transition-transform", isCollapsed && "rotate-180")} />
                </Button>
            )}
        </>
    )
});
Sidebar.displayName = 'Sidebar';

// Botón de colapso para desktop (ya no se usa, integrado en Sidebar)
export function SidebarCollapseButton() {
    return null;
}


export const SidebarHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
    const { isCollapsed } = useSidebar();
    return (
        <div
            ref={ref}
            className={cn(
            'p-4 transition-all duration-300 flex flex-col items-center',
            isCollapsed && 'p-2',
            className
            )}
            {...props}
        />
    )
});
SidebarHeader.displayName = 'SidebarHeader';

export const SidebarContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('flex-1 overflow-y-auto', className)} {...props} />
));
SidebarContent.displayName = 'SidebarContent';

export const SidebarMenu = React.forwardRef<
  HTMLUListElement,
  React.HTMLAttributes<HTMLUListElement>
>(({ className, ...props }, ref) => {
    const { isCollapsed } = useSidebar();
    return (
        <ul
            ref={ref}
            className={cn(
                'space-y-2 p-2',
                isCollapsed && 'flex flex-col items-center',
                className
            )}
            {...props}
        />
    )
});
SidebarMenu.displayName = 'SidebarMenu';


export const SidebarMenuItem = React.forwardRef<
  HTMLLIElement,
  React.HTMLAttributes<HTMLLIElement>
>(({ className, ...props }, ref) => (
  <li ref={ref} className={cn('w-full', className)} {...props} />
));
SidebarMenuItem.displayName = 'SidebarMenuItem';

export const SidebarMenuButton = React.forwardRef<
  HTMLAnchorElement,
  React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string;
    active?: boolean;
  }
>(({ className, children, active = false, href, ...props }, ref) => {
    const { isCollapsed } = useSidebar();
    const childrenArray = React.Children.toArray(children);
    const icon = childrenArray[0];
    const label = childrenArray[1];

  return (
    <Link
      href={href}
      ref={ref}
      className={cn(
        'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
        active
          ? 'bg-primary-foreground/10 text-green-300 hover:text-green-200 hover:bg-primary-foreground/15'
          : 'text-primary-foreground/80 hover:bg-primary-foreground/10 hover:text-primary-foreground',
        isCollapsed && 'justify-center',
        className
      )}
      {...props}
    >
      {icon}
      {!isCollapsed && label}
    </Link>
  );
});
SidebarMenuButton.displayName = 'SidebarMenuButton';
