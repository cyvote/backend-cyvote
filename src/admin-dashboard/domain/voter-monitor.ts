export class VoterMonitor {
  id: string;
  nim: string;
  namaLengkap: string;
  angkatan: number;
  email: string;
  hasVoted: boolean;
  votedAt: Date | null;

  constructor(data?: Partial<VoterMonitor>) {
    if (data) {
      Object.assign(this, data);
    }
  }
}
