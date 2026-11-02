import * as dotenv from 'dotenv';
dotenv.config({ path: ['.env', '../.env'] });

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ProblemDetailsFilter } from './common/filters/problem-details.filter';
import { ValidationPipe } from '@nestjs/common';
import { DomainExceptionFilter } from './common/domain-exception.filter';
import { HttpExceptionFilter } from './common/http-exception.filter';
import { validationExceptionFactory } from './common/validation-exception.factory';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1', { exclude: ['.well-known/(.*)'] });
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, exceptionFactory: validationExceptionFactory }),
  );

  // Filtros globales para transformar todos los errores al estándar RFC 7807 Problem Details
  app.useGlobalFilters(new ProblemDetailsFilter(), new HttpExceptionFilter(), new DomainExceptionFilter());

  // Habilitar CORS para la SPA en React
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`🚀 Backend Banco de Alimentos corriendo en: http://localhost:${port}`);
  console.log(`🔐 Proveedor OIDC Discovery en: http://localhost:${port}/.well-known/openid-configuration`);
}
bootstrap();
