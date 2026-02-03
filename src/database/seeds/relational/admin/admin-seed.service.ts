import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import bcrypt from 'bcryptjs';
import { AdminEntity } from '../../../../auth-admin/infrastructure/persistence/relational/entities/admin.entity';
import { AdminRole } from '../../../../auth-admin/enums/admin-role.enum';

@Injectable()
export class AdminSeedService {
  constructor(
    @InjectRepository(AdminEntity)
    private readonly repository: Repository<AdminEntity>,
  ) {}

  async run(): Promise<void> {
    const bcryptCost = 12;

    // Admin users
    const adminData = [
      { username: 'admin1', password: 'admin123', role: AdminRole.ADMIN },
      { username: 'admin2', password: 'admin123', role: AdminRole.ADMIN },
      { username: 'admin3', password: 'admin123', role: AdminRole.ADMIN },
      { username: 'admin4', password: 'admin123', role: AdminRole.ADMIN },
      { username: 'admin5', password: 'admin123', role: AdminRole.ADMIN },
    ];

    // Superadmin users
    const superadminData = [
      {
        username: 'superadmin1',
        password: 'superadmin123',
        role: AdminRole.SUPERADMIN,
      },
      {
        username: 'superadmin2',
        password: 'superadmin123',
        role: AdminRole.SUPERADMIN,
      },
      {
        username: 'superadmin3',
        password: 'superadmin123',
        role: AdminRole.SUPERADMIN,
      },
    ];

    const allUsers = [...adminData, ...superadminData];

    for (const userData of allUsers) {
      // Check if user already exists
      const existingUser = await this.repository.findOne({
        where: { username: userData.username },
      });

      if (!existingUser) {
        const salt = await bcrypt.genSalt(bcryptCost);
        const passwordHash = await bcrypt.hash(userData.password, salt);

        await this.repository.save(
          this.repository.create({
            username: userData.username,
            passwordHash,
            role: userData.role,
          }),
        );
      }
    }
  }
}
