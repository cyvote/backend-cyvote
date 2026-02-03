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
}
