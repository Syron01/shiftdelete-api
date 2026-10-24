const { PORT } = require('./src/config');
const app = require('./src/app');

const server = app.listen(PORT, () => {
  console.log(`ShiftDelete unofficial API hazır: http://localhost:${PORT}`);
  console.log(`Tüm endpoint listesi: http://localhost:${PORT}/`);
});

// Süreç dayanıklılığı: beklenmeyen hatalar süreci düşürmesin, loglansın
process.on('unhandledRejection', (reason) => {
  console.error('İşlenmemiş reddetme:', reason?.message || reason);
});
process.on('uncaughtException', (err) => {
  console.error('Yakalanmayan hata:', err.message);
});

// Düzgün kapanış: SIGINT/SIGTERM'de bağlantıları kibarca kapat
for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    console.log(`${sig} alındı, kapanılıyor...`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 3000).unref();
  });
}
