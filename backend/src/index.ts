import 'dotenv/config';
import { buildApp } from './app';
import { env } from './env';

const app = buildApp();

app
  .listen({ port: env.PORT, host: '0.0.0.0' })
  .then((addr) => app.log.info(`wefans API ouvindo em ${addr}`))
  .catch((err) => {
    app.log.error(err);
    process.exit(1);
  });

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, async () => {
    await app.close();
    process.exit(0);
  });
}
