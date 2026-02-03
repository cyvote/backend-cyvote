import { AdminRole } from '../enums/admin-role.enum';

export class Admin {
  id: string;
  username: string;
  passwordHash: string;
  role: AdminRole;
  createdAt: Date;
  lastLogin: Date | null;
}
