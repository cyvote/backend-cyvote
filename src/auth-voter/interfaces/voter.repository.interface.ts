import { NullableType } from '../../utils/types/nullable.type';
import { Voter } from '../domain/voter.model';

/**
 * Interface for voter repository operations
 */
export interface VoterRepositoryInterface {
  /**
   * Find voter by NIM
   * @param nim - The voter's NIM (Nomor Induk Mahasiswa)
   * @returns Voter if found, null otherwise
   */
  findByNim(nim: string): Promise<NullableType<Voter>>;

  /**
   * Find voter by ID
   * @param id - The voter's UUID
   * @returns Voter if found, null otherwise
   */
  findById(id: string): Promise<NullableType<Voter>>;
}
