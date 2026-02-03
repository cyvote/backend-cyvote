import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdminRepositoryInterface } from '../../../../interfaces/admin.repository.interface';
import { Admin } from '../../../../domain/admin';
import { AdminEntity } from '../entities/admin.entity';
import { AdminMapper } from '../mappers/admin.mapper';

@Injectable()
export class AdminRepository implements AdminRepositoryInterface {
  constructor(
    @InjectRepository(AdminEntity)
    private readonly adminRepository: Repository<AdminEntity>,
  ) {}

  async findByUsername(username: string): Promise<Admin | null> {
    const entity = await this.adminRepository.findOne({
      where: { username },
    });

    if (!entity) {
      return null;
    }

    return AdminMapper.toDomain(entity);
  }

  async findById(id: string): Promise<Admin | null> {
    const entity = await this.adminRepository.findOne({
      where: { id },
    });

    if (!entity) {
      return null;
    }

    return AdminMapper.toDomain(entity);
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.adminRepository.update(id, {
      lastLogin: new Date(),
    });
  }
}
