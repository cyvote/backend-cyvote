import { Admin } from '../domain/admin';

export interface AdminRepositoryInterface {
  findByUsername(username: string): Promise<Admin | null>;
  findById(id: string): Promise<Admin | null>;
  updateLastLogin(id: string): Promise<void>;
}
