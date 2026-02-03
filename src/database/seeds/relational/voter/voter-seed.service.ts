import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VoterEntity } from '../../../../auth-voter/infrastructure/persistence/relational/entities/voter.entity';

@Injectable()
export class VoterSeedService {
  constructor(
    @InjectRepository(VoterEntity)
    private readonly repository: Repository<VoterEntity>,
  ) {}

  async run(): Promise<void> {
    // Voter test data (same as test-email-send.ts)
    const voterData = [
      {
        nim: '2210512109',
        namaLengkap: 'Nugraha Adhitama',
        angkatan: 2022,
        email: 'nugrahaadhitama22@gmail.com',
      },
      {
        nim: '2210512125',
        namaLengkap: 'Haikal Bintang',
        angkatan: 2022,
        email: 'hbintang225@gmail.com',
      },
      {
        nim: '2210512130',
        namaLengkap: 'Test Voter',
        angkatan: 2022,
        email: '2210512109@mahasiswa.upnvj.ac.id',
      },
    ];

    for (const voter of voterData) {
      // Check if voter already exists
      const existingVoter = await this.repository.findOne({
        where: { nim: voter.nim },
      });

      if (!existingVoter) {
        await this.repository.save(
          this.repository.create({
            nim: voter.nim,
            namaLengkap: voter.namaLengkap,
            angkatan: voter.angkatan,
            email: voter.email,
            hasVoted: false,
          }),
        );
      }
    }
  }
}
