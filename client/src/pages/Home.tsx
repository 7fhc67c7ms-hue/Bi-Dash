import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { Loader2, BarChart3, Upload, TrendingUp } from "lucide-react";
import { getLoginUrl } from "@/const";

/** Landing page with login and feature overview. */
export default function Home() {
  const { loading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (isAuthenticated && !loading) setLocation("/dashboard");
  }, [isAuthenticated, loading, setLocation]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="border-b border-border/70 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <img src="/bi-logo.svg" alt="BI Produção" className="h-9 w-9 rounded-xl ring-1 ring-primary/20" />
            <div><span className="block text-sm font-semibold tracking-tight">BI Produção</span><span className="block text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Centro de operações</span></div>
          </div>
          <Button onClick={() => (window.location.href = getLoginUrl())} className="shadow-sm">Entrar</Button>
        </div>
      </nav>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <p className="mb-5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary"><span className="h-2 w-2 rounded-full bg-primary" /> Inteligência operacional</p>
            <h1 className="bi-shell-title mb-6 max-w-3xl text-5xl font-semibold md:text-6xl">Produção clara.<span className="block text-primary">Decisões melhores.</span></h1>
            <p className="mb-8 max-w-2xl text-lg leading-8 text-muted-foreground">O centro de operações da sua fotoporcelana: produção, estoque, custos e clientes conectados em uma única visão.</p>
            <Button onClick={() => (window.location.href = getLoginUrl())} size="lg" className="px-8 text-base shadow-lg shadow-primary/15">Começar agora</Button>
          </div>

          <div className="relative rounded-[2rem] border border-primary/15 bg-card p-5 shadow-2xl shadow-primary/10">
            <div className="mb-5 flex items-center justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Leitura de hoje</p><p className="mt-1 text-lg font-semibold">Seu negócio em movimento</p></div><span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">Online</span></div>
            <div className="grid grid-cols-2 gap-3"><div className="rounded-2xl bg-muted/60 p-4"><p className="text-xs text-muted-foreground">Produção total</p><p className="mt-2 text-2xl font-semibold">+24,8%</p><div className="mt-3 h-1.5 rounded-full bg-primary/15"><div className="h-full w-3/4 rounded-full bg-primary" /></div></div><div className="rounded-2xl bg-primary/8 p-4"><p className="text-xs text-muted-foreground">Estados atendidos</p><p className="mt-2 text-2xl font-semibold text-primary">12</p><p className="mt-3 text-xs text-primary">Mapa comercial ativo</p></div></div>
            <div className="mt-3 rounded-2xl border border-border/70 p-4"><div className="mb-3 flex items-center justify-between text-xs"><span className="font-medium">Fluxo operacional</span><span className="text-muted-foreground">últimos 6 meses</span></div><div className="flex h-28 items-end gap-2">{[38, 54, 45, 70, 62, 88, 78, 96].map((height, index) => <div key={index} className="flex-1 rounded-t-md bg-gradient-to-t from-primary/25 to-primary" style={{ height: `${height}%` }} />)}</div></div>
          </div>
        </div>

        <div className="mt-20 grid grid-cols-1 gap-5 md:grid-cols-3">
          <div className="bi-card rounded-2xl border bg-card p-7"><div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10"><Upload className="h-6 w-6 text-primary" /></div><h3 className="mb-2 text-lg font-semibold text-foreground">Upload de PDFs</h3><p className="text-muted-foreground">Faça upload dos romaneios e deixe a IA extrair os dados automaticamente.</p></div>
          <div className="bi-card rounded-2xl border bg-card p-7"><div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-sky-500/10"><BarChart3 className="h-6 w-6 text-sky-700 dark:text-sky-300" /></div><h3 className="mb-2 text-lg font-semibold text-foreground">Dashboards interativos</h3><p className="text-muted-foreground">Visualize produção, mix, clientes e evolução em uma leitura contínua.</p></div>
          <div className="bi-card rounded-2xl border bg-card p-7"><div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10"><TrendingUp className="h-6 w-6 text-amber-700 dark:text-amber-300" /></div><h3 className="mb-2 text-lg font-semibold text-foreground">Análises avançadas</h3><p className="text-muted-foreground">KPIs, rankings, custos, estoque e cobertura comercial no mesmo sistema.</p></div>
        </div>

        <div className="mt-20 grid grid-cols-1 gap-8 md:grid-cols-3"><div className="text-center"><p className="mb-2 text-4xl font-semibold text-primary">100%</p><p className="text-muted-foreground">Extração automática</p></div><div className="text-center"><p className="mb-2 text-4xl font-semibold text-sky-700 dark:text-sky-300">Online</p><p className="text-muted-foreground">Dados sincronizados</p></div><div className="text-center"><p className="mb-2 text-4xl font-semibold text-amber-700 dark:text-amber-300">9+</p><p className="text-muted-foreground">Painéis de análise</p></div></div>
      </section>

      <section className="mt-20 border-t border-border/70 py-16"><div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8"><h2 className="mb-4 text-3xl font-semibold text-foreground">Pronto para começar?</h2><p className="mb-8 text-muted-foreground">Acesse o dashboard e acompanhe sua operação de produção em uma visão única.</p><Button onClick={() => (window.location.href = getLoginUrl())} size="lg" className="shadow-lg shadow-primary/15">Acessar dashboard</Button></div></section>

      <footer className="border-t border-border/70 py-8"><div className="mx-auto max-w-7xl px-4 text-center text-sm text-muted-foreground sm:px-6 lg:px-8"><p>&copy; 2026 BI Produção. Todos os direitos reservados.</p></div></footer>
    </div>
  );
}
