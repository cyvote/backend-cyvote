/**
 * Candidate domain entity
 */
export class Candidate {
  id: string;
  nama: string;
  photoUrl: string | null;
  visiMisi: string | null;
  programKerja: string | null;
  grandDesignUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}
