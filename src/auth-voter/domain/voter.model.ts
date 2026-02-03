/**
 * Voter domain model
 * Represents a voter entity in the system
 */
export class Voter {
  id: string;
  nim: string;
  namaLengkap: string;
  angkatan: number;
  email: string;
  hasVoted: boolean;
  votedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;

  constructor(partial?: Partial<Voter>) {
    if (partial) {
      Object.assign(this, partial);
    }
  }
}
