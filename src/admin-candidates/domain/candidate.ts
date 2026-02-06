import { CandidateStatus } from '../enums/candidate-status.enum';

/**
 * Candidate domain entity
 */
export class Candidate {
  id: string;
  nama: string;
  status: CandidateStatus;
  photoUrl: string | null;
  visiMisi: string | null;
  programKerja: string | null;
  grandDesignUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}
