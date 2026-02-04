import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { CandidateEntity } from '../entities/candidate.entity';
import { Candidate } from '../../../../domain/candidate';
import { CandidateRepositoryInterface } from '../../../../interfaces/candidate.repository.interface';
import { QueryCandidatesDto } from '../../../../dto/query-candidates.dto';

/**
 * Repository implementation for candidates using TypeORM
 */
@Injectable()
export class CandidateRepository implements CandidateRepositoryInterface {
  constructor(
    @InjectRepository(CandidateEntity)
    private readonly repository: Repository<CandidateEntity>,
  ) {}

  /**
   * Create a new candidate
   */
  async create(candidate: Candidate): Promise<Candidate> {
    const entity = new CandidateEntity();
    entity.nama = candidate.nama;
    entity.photoUrl = candidate.photoUrl;
    entity.visiMisi = candidate.visiMisi;
    entity.programKerja = candidate.programKerja;
    entity.grandDesignUrl = candidate.grandDesignUrl;

    const saved = await this.repository.save(entity);
    return saved.toDomain();
  }

  /**
   * Find candidate by ID
   */
  async findById(id: string): Promise<Candidate | null> {
    const entity = await this.repository.findOne({
      where: { id },
    });

    return entity ? entity.toDomain() : null;
  }

  /**
   * Find many candidates with pagination
   */
  async findMany(
    query: QueryCandidatesDto,
  ): Promise<{ data: Candidate[]; total: number }> {
    const { page = 1, limit = 10, search } = query;
    const skip = (page - 1) * limit;

    const whereCondition = search ? { nama: ILike(`%${search}%`) } : {};

    const [entities, total] = await this.repository.findAndCount({
      where: whereCondition,
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return {
      data: entities.map((entity) => entity.toDomain()),
      total,
    };
  }

  /**
   * Update candidate by ID
   */
  async update(id: string, data: Partial<Candidate>): Promise<Candidate> {
    const updateData: Partial<CandidateEntity> = {};

    if (data.nama !== undefined) updateData.nama = data.nama;
    if (data.photoUrl !== undefined) updateData.photoUrl = data.photoUrl;
    if (data.visiMisi !== undefined) updateData.visiMisi = data.visiMisi;
    if (data.programKerja !== undefined)
      updateData.programKerja = data.programKerja;
    if (data.grandDesignUrl !== undefined)
      updateData.grandDesignUrl = data.grandDesignUrl;

    await this.repository.update(id, updateData);

    const updated = await this.repository.findOne({ where: { id } });
    if (!updated) {
      throw new Error('Candidate not found after update');
    }

    return updated.toDomain();
  }

  /**
   * Delete candidate by ID (hard delete)
   */
  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  /**
   * Check if candidate with name exists
   */
  async existsByName(nama: string, excludeId?: string): Promise<boolean> {
    const query = this.repository
      .createQueryBuilder('candidate')
      .where('LOWER(candidate.nama) = LOWER(:nama)', { nama });

    if (excludeId) {
      query.andWhere('candidate.id != :excludeId', { excludeId });
    }

    const count = await query.getCount();
    return count > 0;
  }
}
