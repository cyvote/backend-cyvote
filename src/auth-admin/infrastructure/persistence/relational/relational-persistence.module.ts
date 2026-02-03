import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminEntity } from './entities/admin.entity';
import { AdminRepository } from './repositories/admin.repository';

@Module({
  imports: [TypeOrmModule.forFeature([AdminEntity])],
  providers: [
    {
      provide: 'AdminRepositoryInterface',
      useClass: AdminRepository,
    },
  ],
  exports: ['AdminRepositoryInterface'],
})
export class RelationalAdminPersistenceModule {}
