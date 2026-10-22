const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktopApp', {
  platform: process.platform,
  appName: 'BI Produção — Fotoporcelana',
  printToPdf: () => ipcRenderer.invoke('desktop:print-to-pdf'),
});

const menuAnchors = {
  Dashboard: '',
  Produção: 'producao',
  Clientes: 'clientes',
  Tipos: 'tipos',
  Comparações: 'comparacoes',
  Evolução: 'evolucao',
  Estatísticas: 'estatisticas',
  Rankings: 'rankings',
  Histórico: 'historico',
  Relatórios: 'relatorios',
  Exportação: 'exportacao',
  'Gestão de dados': 'dados',
  Importações: 'importacoes',
};

document.addEventListener('click', event => {
  const target = event.target instanceof Element
    ? event.target.closest('button,[role="button"]')
    : null;
  if (!target) return;
  const label = target.textContent?.trim() || '';
  const anchor = menuAnchors[label];
  if (anchor === undefined) {
    if (!/gerar pdf/i.test(label)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    window.desktopApp.printToPdf().then(result => {
      if (result?.ok) window.alert(`PDF salvo em:\n${result.filePath}`);
    }).catch(error => window.alert(`Não foi possível gerar o PDF: ${error.message}`));
    return;
  }
  const nextHash = anchor ? `#${anchor}` : '';
  if (window.location.hash !== nextHash) {
    window.history.pushState({}, '', `${window.location.pathname}${nextHash}`);
  }
}, true);
