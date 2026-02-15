import 'dotenv/config';
import {
  ClassSerializerInterceptor,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory, Reflector } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { useContainer } from 'class-validator';
import { AppModule } from './app.module';
import validationOptions from './utils/validation-options';
import { AllConfigType } from './config/config.type';
import { ResolvePromisesInterceptor } from './utils/serializer.interceptor';
import helmet from 'helmet';
import { HelmetOptionsFactory } from './security/helmet/config/helmet-options.factory';
import { mkdirSync, existsSync } from 'fs';

async function bootstrap() {
  // Ensure /tmp/files directory exists in production (for Vercel serverless)
  if (process.env.NODE_ENV === 'production') {
    const tmpFilesDir = '/tmp/files';
    if (!existsSync(tmpFilesDir)) {
      mkdirSync(tmpFilesDir, { recursive: true });
    }
  }

  const app = await NestFactory.create(AppModule);
  useContainer(app.select(AppModule), { fallbackOnErrors: true });
  const configService = app.get(ConfigService<AllConfigType>);

  // Enable trust proxy so Express resolves real client IPs behind Docker/nginx
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.set('trust proxy', true);

  // Configure CORS
  const allowedOrigins = process.env.FRONTEND_DOMAIN
    ? process.env.FRONTEND_DOMAIN.split(',').map((origin) =>
        origin.trim().replace(/\/$/, ''),
      )
    : ['http://localhost:3000'];

  app.enableCors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'x-custom-lang',
      'Accept',
    ],
  });

  // Apply Helmet security middleware
  const helmetOptionsFactory = app.get(HelmetOptionsFactory);
  const helmetOptions = helmetOptionsFactory.createHelmetOptions();
  if (helmetOptions) {
    app.use(helmet(helmetOptions));
  }

  app.enableShutdownHooks();
  app.setGlobalPrefix(
    configService.getOrThrow('app.apiPrefix', { infer: true }),
    {
      exclude: ['/'],
    },
  );
  app.enableVersioning({
    type: VersioningType.URI,
  });
  app.useGlobalPipes(new ValidationPipe(validationOptions));
  app.useGlobalInterceptors(
    // ResolvePromisesInterceptor is used to resolve promises in responses because class-transformer can't do it
    // https://github.com/typestack/class-transformer/issues/549
    new ResolvePromisesInterceptor(),
    new ClassSerializerInterceptor(app.get(Reflector)),
  );

  const options = new DocumentBuilder()
    .setTitle('API')
    .setDescription('API docs')
    .setVersion('1.0')
    .addBearerAuth()
    .addGlobalParameters({
      in: 'header',
      required: false,
      name: process.env.APP_HEADER_LANGUAGE || 'x-custom-lang',
      schema: {
        example: 'en',
      },
    })
    .build();

  const document = SwaggerModule.createDocument(app, options);
  SwaggerModule.setup('docs', app, document);

  await app.listen(configService.getOrThrow('app.port', { infer: true }));
}

// For local development or standalone production (Docker/VPS)
if (
  process.env.NODE_ENV !== 'production' ||
  process.env.RUN_STANDALONE === 'true'
) {
  void bootstrap();
}

// Export handler for Vercel serverless
export default async function handler(req: any, res: any) {
  // Ensure /tmp/files directory exists
  const tmpFilesDir = '/tmp/files';
  if (!existsSync(tmpFilesDir)) {
    mkdirSync(tmpFilesDir, { recursive: true });
  }

  const app = await NestFactory.create(AppModule);
  useContainer(app.select(AppModule), { fallbackOnErrors: true });
  const configService = app.get(ConfigService<AllConfigType>);

  // Enable trust proxy so Express resolves real client IPs behind Docker/nginx
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.set('trust proxy', true);

  // Configure CORS
  const allowedOrigins = process.env.FRONTEND_DOMAIN
    ? process.env.FRONTEND_DOMAIN.split(',').map((origin) =>
        origin.trim().replace(/\/$/, ''),
      )
    : ['http://localhost:3000'];

  app.enableCors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'x-custom-lang',
      'Accept',
    ],
  });

  // Apply Helmet security middleware
  const helmetOptionsFactory = app.get(HelmetOptionsFactory);
  const helmetOptions = helmetOptionsFactory.createHelmetOptions();
  if (helmetOptions) {
    app.use(helmet(helmetOptions));
  }

  app.enableShutdownHooks();
  app.setGlobalPrefix(
    configService.getOrThrow('app.apiPrefix', { infer: true }),
    {
      exclude: ['/'],
    },
  );
  app.enableVersioning({
    type: VersioningType.URI,
  });
  app.useGlobalPipes(new ValidationPipe(validationOptions));
  app.useGlobalInterceptors(
    new ResolvePromisesInterceptor(),
    new ClassSerializerInterceptor(app.get(Reflector)),
  );

  const options = new DocumentBuilder()
    .setTitle('API')
    .setDescription('API docs')
    .setVersion('1.0')
    .addBearerAuth()
    .addGlobalParameters({
      in: 'header',
      required: false,
      name: process.env.APP_HEADER_LANGUAGE || 'x-custom-lang',
      schema: {
        example: 'en',
      },
    })
    .build();

  const document = SwaggerModule.createDocument(app, options);
  SwaggerModule.setup('docs', app, document);

  await app.init();

  const server = app.getHttpAdapter().getInstance();
  return server(req, res);
}
