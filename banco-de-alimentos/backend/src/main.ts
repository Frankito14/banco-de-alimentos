import * as dotenv from 'dotenv';
dotenv.config();

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ProblemDetailsFilter } from './common/filters/problem-details.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Habilitar CORS para la SPA en React
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true
  });

  // Filtro global para transformar todos los errores al estándar RFC 7807 Problem Details
  app.useGlobalFilters(new ProblemDetailsFilter());

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`🚀 Backend Banco de Alimentos corriendo en: http://localhost:${port}`);
  console.log(`🔐 Proveedor OIDC Discovery en: http://localhost:${port}/.well-known/openid-configuration`);
}
bootstrap();
