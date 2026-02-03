import { AdminRole } from '../../enums/admin-role.enum';

export interface AdminJwtPayload {
  id: string;
  username: string;
  role: AdminRole;
  iat?: number;
  exp?: number;
}
