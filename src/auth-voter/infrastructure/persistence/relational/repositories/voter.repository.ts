import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VoterRepositoryInterface } from '../../../../interfaces/voter.repository.interface';
import { VoterEntity } from '../entities/voter.entity';
import { Voter } from '../../../../domain/voter.model';
import { NullableType } from '../../../../../utils/types/nullable.type';

@Injectable()
export class VoterRepository implements VoterRepositoryInterface {
  constructor(
    @InjectRepository(VoterEntity)
    private readonly voterRepository: Repository<VoterEntity>,
  ) {}

  async findByNim(nim: string): Promise<NullableType<Voter>> {
    const entity = await this.voterRepository.findOne({
      where: { nim },
    });

    return entity ? entity.toDomain() : null;
  }

  async findById(id: string): Promise<NullableType<Voter>> {
    const entity = await this.voterRepository.findOne({
      where: { id },
    });

    return entity ? entity.toDomain() : null;
  }
}
