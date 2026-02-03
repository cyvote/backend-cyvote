import { Voter } from '../domain/voter';
import { QueryVotersDto } from '../dto/query-voters.dto';

export interface VoterRepositoryInterface {
  create(voter: Voter): Promise<Voter>;
  findById(id: string): Promise<Voter | null>;
  findByNim(nim: string): Promise<Voter | null>;
  findByNimIncludingDeleted(nim: string): Promise<Voter | null>;
  findMany(query: QueryVotersDto): Promise<{ data: Voter[]; total: number }>;
  update(id: string, voter: Partial<Voter>): Promise<Voter>;
  softDelete(id: string): Promise<void>;
  restore(id: string): Promise<Voter>;
  findDeletedById(id: string): Promise<Voter | null>;
}
