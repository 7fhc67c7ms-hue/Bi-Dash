import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { getLoginUrl } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import { BarChart3, Bot, Boxes, CircleDollarSign, Database, Download, FileText, GitCompareArrows, History, LayoutDashboard, Layers3, LineChart, ListOrdered, LogOut, MapPinned, PanelLeft, Sigma, TableProperties, UsersRound } from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from './DashboardLayoutSkeleton';
import PrintSelectionController from "./PrintSelection";
import { Button } from "./ui/button";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard", targetId: "dashboard" },
  { icon: BarChart3, label: "Produção", path: "/dashboard#producao", targetId: "producao" },
  { icon: UsersRound, label: "Clientes", path: "/dashboard#clientes", targetId: "clientes" },
  { icon: Layers3, label: "Tipos", path: "/dashboard#tipos", targetId: "tipos" },
  { icon: GitCompareArrows, label: "Comparações", path: "/dashboard#comparacoes", targetId: "comparacoes" },
  { icon: LineChart, label: "Evolução", path: "/dashboard#evolucao", targetId: "evolucao" },
  { icon: Sigma, label: "Estatísticas", path: "/dashboard#estatisticas", targetId: "estatisticas" },
  { icon: ListOrdered, label: "Rankings", path: "/dashboard#rankings", targetId: "rankings" },
  { icon: History, label: "Histórico", path: "/dashboard#historico", targetId: "historico" },
  { icon: FileText, label: "Relatórios", path: "/dashboard#relatorios", targetId: "relatorios" },
  { icon: Download, label: "Exportação", path: "/dashboard#exportacao", targetId: "exportacao" },
  { icon: CircleDollarSign, label: "Preços e custos", path: "/dashboard#custos", targetId: "custos" },
  { icon: MapPinned, label: "Mapa de clientes", path: "/dashboard#cobertura", targetId: "cobertura" },
  { icon: Database, label: "Gestão de dados", path: "/dashboard#dados", targetId: "dados" },
  { icon: Boxes, label: "Cadastros mestres", path: "/dashboard#cadastros", targetId: "cadastros" },
  { icon: TableProperties, label: "Importações", path: "/dashboard#importacoes", targetId: "importacoes" },
  { icon: Bot, label: "Assistente do BI", path: "/dashboard#assistente", targetId: "assistente" },
];

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 280;
const MIN_WIDTH = 200;
const MAX_WIDTH = 480;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) {
    return <DashboardLayoutSkeleton />
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-8 p-8 max-w-md w-full">
          <div className="flex flex-col items-center gap-6">
            <h1 className="text-2xl font-semibold tracking-tight text-center">
Inicie sessão para continuar
            </h1>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              O cockpit de produção requer uma sessão autenticada. Continue para iniciar.
            </p>
          </div>
          <Button
            onClick={() => {
              window.location.href = getLoginUrl();
            }}
            size="lg"
            className="w-full shadow-lg hover:shadow-xl transition-all"
          >
            Iniciar sessão
          </Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": `${sidebarWidth}px`,
        } as CSSProperties
      }
    >
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

type DashboardLayoutContentProps = {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
};

function DashboardLayoutContent({
  children,
  setSidebarWidth,
}: DashboardLayoutContentProps) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const currentTarget = location.split("#")[1] ?? "dashboard";
  const activeMenuItem = menuItems.find(item => item.targetId === currentTarget);
  const isMobile = useIsMobile();

  useEffect(() => {
    const target = menuItems.some(item => item.targetId === currentTarget)
      ? currentTarget
      : "dashboard";
    window.dispatchEvent(new CustomEvent("bi:navigate", { detail: target }));
    window.setTimeout(() => {
      document
        .getElementById(target === "dashboard" ? "bi-workspace" : target)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  }, [currentTarget]);

  useEffect(() => {
    if (isCollapsed) {
      setIsResizing(false);
    }
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  return (
    <>
      <div className="relative" ref={sidebarRef} data-print-ui>
          <Sidebar
            collapsible="icon"
            className="border-r border-sidebar-border/80"
            disableTransition={isResizing}
          >
          <SidebarHeader className="h-20 justify-center border-b border-sidebar-border/70 px-3">
            <div className="flex items-center gap-3 px-2 transition-all w-full">
              <button
                onClick={toggleSidebar}
                className="h-8 w-8 flex items-center justify-center hover:bg-accent rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
                aria-label="Toggle navigation"
              >
                <PanelLeft className="h-4 w-4 text-muted-foreground" />
              </button>
              {!isCollapsed ? (
                <div className="flex items-center gap-2 min-w-0">
                  <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-sidebar-primary/15 text-[10px] font-bold tracking-tight text-sidebar-primary ring-1 ring-sidebar-primary/35"><span>PE</span><span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-emerald-300 ring-2 ring-sidebar" /></div>
                  <div className="min-w-0"><span className="block truncate font-semibold tracking-tight text-sidebar-foreground">BI Produção</span><span className="block truncate text-[10px] uppercase tracking-[0.14em] text-sidebar-foreground/55">Centro de operações</span></div>
                </div>
              ) : null}
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0 py-3">
            {[
              { label: "Visão geral", items: menuItems.slice(0, 2) },
              { label: "Análises", items: menuItems.slice(2, 12) },
              { label: "Gestão", items: menuItems.slice(12) },
            ].map(group => (
              <div key={group.label} className="mb-4 last:mb-0">
                <p className="mb-1.5 px-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-sidebar-foreground/40 group-data-[collapsible=icon]:hidden">{group.label}</p>
                <SidebarMenu className="px-2">
                  {group.items.map(item => {
                    const isActive = currentTarget === item.targetId;
                    return (
                      <SidebarMenuItem key={item.path}>
                        <SidebarMenuButton
                          isActive={isActive}
                          onClick={() => {
                            if (item.targetId === "dados" && !document.getElementById(item.targetId)) {
                              document.getElementById("toggle-data-manager")?.click();
                            }
                            const nextLocation = `/dashboard#${item.targetId}`;
                            setLocation(nextLocation);
                            window.dispatchEvent(new CustomEvent("bi:navigate", { detail: item.targetId }));
                          }}
                          tooltip={item.label}
                          className="h-10 font-normal"
                        >
                          <item.icon className={`h-4 w-4 ${isActive ? "text-sidebar-primary" : ""}`} />
                          <span>{item.label}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </div>
            ))}
          </SidebarContent>

          <SidebarFooter className="border-t border-sidebar-border/70 p-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-lg px-1 py-1 hover:bg-accent/50 transition-colors w-full text-left group-data-[collapsible=icon]:justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Avatar className="h-9 w-9 border shrink-0">
                    <AvatarFallback className="text-xs font-medium">
                      PE
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                    <p className="text-sm font-medium truncate leading-none">
                      {user?.name || "-"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate mt-1.5">
                      {user?.email || "-"}
                    </p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={logout}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sair</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/20 transition-colors ${isCollapsed ? "hidden" : ""}`}
          onMouseDown={() => {
            if (isCollapsed) return;
            setIsResizing(true);
          }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset className="bg-background">
        <PrintSelectionController />
        <div data-print-ui className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border/70 bg-background/90 px-4 backdrop-blur supports-[backdrop-filter]:backdrop-blur sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            {isMobile ? <SidebarTrigger className="h-9 w-9 rounded-lg bg-background" /> : null}
            <div className="min-w-0">
              <p className="truncate text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">BI Produção</p>
              <p className="truncate text-sm font-medium text-foreground">{activeMenuItem?.label ?? "Visão geral"}</p>
            </div>
          </div>
          <div className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Dados sincronizados</div>
        </div>
        <main className="min-h-screen flex-1" data-print-root>{children}</main>
      </SidebarInset>
    </>
  );
}
