import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TokenRepositoryInterface } from '../../../../interfaces/token.repository.interface';
import { TokenEntity } from '../entities/token.entity';
import { Token } from '../../../../domain/token.model';
import { NullableType } from '../../../../../utils/types/nullable.type';

@Injectable()
export class TokenRepository implements TokenRepositoryInterface {
  constructor(
    @InjectRepository(TokenEntity)
    private readonly tokenRepository: Repository<TokenEntity>,
  ) {}

  async findByVoterIdAndHash(
    voterId: string,
    tokenHash: string,
  ): Promise<NullableType<Token>> {
    // Case-insensitive comparison for token hash
    const entity = await this.tokenRepository
      .createQueryBuilder('token')
      .where('token.voter_id = :voterId', { voterId })
      .andWhere('LOWER(token.token_hash) = LOWER(:tokenHash)', { tokenHash })
      .getOne();

    return entity ? entity.toDomain() : null;
  }

  async markAsUsed(id: string): Promise<void> {
    await this.tokenRepository.update(id, {
      isUsed: true,
      usedAt: new Date(),
    });
  }

  async findActiveByVoterId(voterId: string): Promise<NullableType<Token>> {
    const entity = await this.tokenRepository.findOne({
      where: {
        voterId,
        isUsed: false,
      },
    });

    return entity ? entity.toDomain() : null;
  }
}
