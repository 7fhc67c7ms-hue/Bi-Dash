const fs = require('node:fs');
const path = require('node:path');

const url = process.argv[2];
if (!url || !/^https:\/\/[^\s]+$/.test(url)) {
  console.error('Uso: node desktop/update-dashboard-url.cjs https://seu-dashboard.manus.space');
  process.exit(1);
}

const file = path.join(__dirname, 'dashboard-config.json');
fs.writeFileSync(file, `${JSON.stringify({ dashboardUrl: url.replace(/\/$/, '') }, null, 2)}\n`);
console.log(`URL do dashboard atualizada em ${file}`);
