import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HelmetOptionsFactory } from './config/helmet-options.factory';

@Module({
  imports: [ConfigModule],
  providers: [HelmetOptionsFactory],
  exports: [HelmetOptionsFactory],
})
export class HelmetModule {}
