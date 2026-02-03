export interface VotingTokenMailData {
  to: string;
  data: {
    nama: string;
    nim: string;
    token: string;
    end_date: string;
    end_time: string;
  };
}
