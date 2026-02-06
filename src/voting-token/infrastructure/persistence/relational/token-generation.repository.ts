import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { TokenEntity } from '../../../../auth-voter/infrastructure/persistence/relational/entities/token.entity';
import { VoterEntity } from '../../../../auth-voter/infrastructure/persistence/relational/entities/voter.entity';
import { Token } from '../../../../auth-voter/domain/token.model';
import {
  TokenGenerationRepositoryInterface,
  VoterInfo,
  TokenWithVoter,
} from '../../../interfaces';

/**
 * Repository implementation for token generation operations
 */
@Injectable()
export class TokenGenerationRepository
  implements TokenGenerationRepositoryInterface
{
  constructor(
    @InjectRepository(TokenEntity)
    private readonly tokenRepository: Repository<TokenEntity>,
    @InjectRepository(VoterEntity)
    private readonly voterRepository: Repository<VoterEntity>,
  ) {}

  /**
   * Find all active voters without a token
   */
  async findVotersWithoutToken(): Promise<VoterInfo[]> {
    // Using left join to find voters without tokens
    const voters = await this.voterRepository
      .createQueryBuilder('voter')
      .leftJoin('tokens', 'token', 'token.voter_id = voter.id')
      .where('voter.deleted_at IS NULL')
      .andWhere('token.id IS NULL')
      .select([
        'voter.id as id',
        'voter.email as email',
        'voter.nama_lengkap as "namaLengkap"',
        'voter.nim as nim',
      ])
      .getRawMany();

    return voters;
  }

  /**
   * Find all active voters without a valid token for the current election.
   * A valid token is one that is unused and was generated on or after the election's created_at.
   * Uses LEFT JOIN per project convention.
   */
  async findVotersWithoutValidToken(
    electionCreatedAt: Date,
  ): Promise<VoterInfo[]> {
    const voters = await this.voterRepository
      .createQueryBuilder('voter')
      .leftJoin(
        'tokens',
        'token',
        'token.voter_id = voter.id AND token.is_used = false AND token.generated_at >= :electionCreatedAt',
        { electionCreatedAt },
      )
      .where('voter.deleted_at IS NULL')
      .andWhere('token.id IS NULL')
      .select([
        'voter.id as id',
        'voter.email as email',
        'voter.nama_lengkap as "namaLengkap"',
        'voter.nim as nim',
      ])
      .getRawMany();

    return voters;
  }

  /**
   * Invalidate all stale tokens generated before the current election.
   * Marks them as used so they cannot be reused.
   * @returns Number of tokens invalidated
   */
  async invalidateStaleTokens(electionCreatedAt: Date): Promise<number> {
    const result = await this.tokenRepository
      .createQueryBuilder()
      .update(TokenEntity)
      .set({ isUsed: true, usedAt: new Date() })
      .where('is_used = false')
      .andWhere('generated_at < :electionCreatedAt', { electionCreatedAt })
      .execute();

    return result.affected || 0;
  }

  /**
   * Create a new token for a voter
   */
  async createToken(voterId: string, tokenHash: string): Promise<Token> {
    const entity = this.tokenRepository.create({
      voterId,
      tokenHash,
      generatedAt: new Date(),
      isUsed: false,
      resendCount: 0,
      emailSentAt: null,
    });

    const saved = await this.tokenRepository.save(entity);
    return saved.toDomain();
  }

  /**
   * Check if a token hash already exists
   */
  async existsByTokenHash(tokenHash: string): Promise<boolean> {
    const count = await this.tokenRepository.count({
      where: { tokenHash },
    });
    return count > 0;
  }

  /**
   * Find all tokens that have not been sent via email yet
   */
  async findTokensNotSent(): Promise<TokenWithVoter[]> {
    const results = await this.tokenRepository
      .createQueryBuilder('token')
      .leftJoinAndSelect('token.voter', 'voter')
      .where('token.email_sent_at IS NULL')
      .andWhere('token.is_used = false')
      .andWhere('voter.deleted_at IS NULL')
      .getMany();

    return results.map((entity) => ({
      token: entity.toDomain(),
      voter: {
        id: entity.voter!.id,
        email: entity.voter!.email,
        namaLengkap: entity.voter!.namaLengkap,
        nim: entity.voter!.nim,
      },
    }));
  }

  /**
   * Mark a token as having its email sent
   */
  async markEmailSent(tokenId: string): Promise<void> {
    await this.tokenRepository.update(tokenId, {
      emailSentAt: new Date(),
    });
  }

  /**
   * Find the active (not used) token for a voter
   */
  async findActiveTokenByVoterId(voterId: string): Promise<Token | null> {
    const entity = await this.tokenRepository.findOne({
      where: {
        voterId,
        isUsed: false,
      },
      order: {
        generatedAt: 'DESC',
      },
    });

    return entity ? entity.toDomain() : null;
  }

  /**
   * Find voter by ID
   */
  async findVoterById(voterId: string): Promise<VoterInfo | null> {
    const entity = await this.voterRepository.findOne({
      where: {
        id: voterId,
        deletedAt: IsNull(),
      },
    });

    if (!entity) {
      return null;
    }

    return {
      id: entity.id,
      email: entity.email,
      namaLengkap: entity.namaLengkap,
      nim: entity.nim,
    };
  }

  /**
   * Replace old token with a new one (soft delete old, create new)
   */
  async replaceToken(
    voterId: string,
    newTokenHash: string,
    previousResendCount: number,
  ): Promise<Token> {
    // Mark old tokens as used (invalidate them)
    await this.tokenRepository.update(
      { voterId, isUsed: false },
      { isUsed: true, usedAt: new Date() },
    );

    // Create new token with incremented resend count
    const entity = this.tokenRepository.create({
      voterId,
      tokenHash: newTokenHash,
      generatedAt: new Date(),
      isUsed: false,
      resendCount: previousResendCount + 1,
      emailSentAt: null,
    });

    const saved = await this.tokenRepository.save(entity);
    return saved.toDomain();
  }

  /**
   * Increment the resend count for a token
   */
  async incrementResendCount(tokenId: string): Promise<void> {
    await this.tokenRepository.increment({ id: tokenId }, 'resendCount', 1);
  }
}
