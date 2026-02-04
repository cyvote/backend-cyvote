export class DashboardStats {
  totalVoters: number;
  totalVoted: number;
  totalNotVoted: number;
  participationRate: string; // Format: "XX.XX"

  constructor(data?: Partial<DashboardStats>) {
    if (data) {
      Object.assign(this, data);
    }
  }
}
