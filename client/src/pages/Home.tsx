import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { Loader2, BarChart3, Upload, TrendingUp } from "lucide-react";
import { startLogin } from "@/const";

/** Landing page with login and feature overview. */
export default function Home() {
  const { loading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (isAuthenticated && !loading) setLocation("/dashboard");
  }, [isAuthenticated, loading, setLocation]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <nav className="border-b border-slate-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-8 w-8 text-blue-600" />
            <span className="text-xl font-bold text-slate-900">
              BI Dashboard
            </span>
          </div>
          <Button
            onClick={() => startLogin()}
            className="bg-blue-600 text-white hover:bg-blue-700"
          >
            Entrar
          </Button>
        </div>
      </nav>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mb-16 text-center">
          <h1 className="mb-6 text-5xl font-bold text-slate-900 md:text-6xl">
            Dashboard de Produção
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              {" "}
              de Placas
            </span>
          </h1>
          <p className="mx-auto mb-8 max-w-2xl text-xl text-slate-600">
            Análise profissional de dados de produção de fotoporcelanas com
            extração automática de PDFs e dashboards interativos.
          </p>
          <Button
            onClick={() => startLogin()}
            size="lg"
            className="bg-blue-600 px-8 text-lg text-white hover:bg-blue-700"
          >
            Começar Agora
          </Button>
        </div>

        <div className="mt-20 grid grid-cols-1 gap-8 md:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-white p-8 shadow-sm transition-colors hover:border-blue-500">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/10">
              <Upload className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-slate-900">
              Upload de PDFs
            </h3>
            <p className="text-slate-600">
              Faça upload de PDFs de produção e deixe a IA extrair os dados
              automaticamente.
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-8 shadow-sm transition-colors hover:border-purple-500">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-purple-500/10">
              <BarChart3 className="h-6 w-6 text-purple-600" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-slate-900">
              Dashboards Interativos
            </h3>
            <p className="text-slate-600">
              Visualize dados em tempo real com gráficos e tabelas interativas.
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-8 shadow-sm transition-colors hover:border-green-500">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-green-500/10">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-slate-900">
              Análises Avançadas
            </h3>
            <p className="text-slate-600">
              KPIs, rankings de clientes, comparações mensais e muito mais.
            </p>
          </div>
        </div>

        <div className="mt-20 grid grid-cols-1 gap-8 md:grid-cols-3">
          <div className="text-center">
            <p className="mb-2 text-4xl font-bold text-blue-600">100%</p>
            <p className="text-slate-600">Extração Automática</p>
          </div>
          <div className="text-center">
            <p className="mb-2 text-4xl font-bold text-purple-600">Real-time</p>
            <p className="text-slate-600">Análises em Tempo Real</p>
          </div>
          <div className="text-center">
            <p className="mb-2 text-4xl font-bold text-green-600">9+</p>
            <p className="text-slate-600">Painéis de Análise</p>
          </div>
        </div>
      </section>

      <section className="mt-20 border-t border-slate-200 py-16">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="mb-4 text-3xl font-bold text-slate-900">
            Pronto para começar?
          </h2>
          <p className="mb-8 text-slate-600">
            Acesse o dashboard e comece a analisar seus dados de produção agora
            mesmo.
          </p>
          <Button
            onClick={() => startLogin()}
            size="lg"
            className="bg-blue-600 text-white hover:bg-blue-700"
          >
            Acessar Dashboard
          </Button>
        </div>
      </section>

      <footer className="mt-20 border-t border-slate-200 py-8">
        <div className="mx-auto max-w-7xl px-4 text-center text-sm text-slate-500 sm:px-6 lg:px-8">
          <p>&copy; 2026 BI Dashboard. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
