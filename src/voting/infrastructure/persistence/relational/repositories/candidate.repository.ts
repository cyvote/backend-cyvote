import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CandidateRepositoryInterface } from '../../../../interfaces/candidate.repository.interface';
import { CandidateEntity } from '../../../../../admin-candidates/infrastructure/persistence/relational/entities/candidate.entity';

@Injectable()
export class CandidateRepository implements CandidateRepositoryInterface {
  constructor(
    @InjectRepository(CandidateEntity)
    private readonly candidateRepository: Repository<CandidateEntity>,
  ) {}

  async existsById(id: string): Promise<boolean> {
    const count = await this.candidateRepository.count({
      where: { id },
    });
    return count > 0;
  }
}
