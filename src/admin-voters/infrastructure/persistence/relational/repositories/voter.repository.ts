import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Brackets, IsNull, Not, In } from 'typeorm';
import { VoterRepositoryInterface } from '../../../../interfaces/voter.repository.interface';
import { Voter } from '../../../../domain/voter';
import { VoterEntity } from '../entities/voter.entity';
import { VoterMapper } from '../mappers/voter.mapper';
import {
  QueryVotersDto,
  VoterFilterStatus,
  VoterSortField,
  VoterStatusFilter,
  SortOrder,
} from '../../../../dto/query-voters.dto';

@Injectable()
export class VoterRepository implements VoterRepositoryInterface {
  constructor(
    @InjectRepository(VoterEntity)
    private readonly voterRepository: Repository<VoterEntity>,
  ) {}

  async create(voter: Voter): Promise<Voter> {
    const entity = VoterMapper.toEntity(voter);
    const savedEntity = await this.voterRepository.save(entity);
    return VoterMapper.toDomain(savedEntity);
  }

  async findById(id: string): Promise<Voter | null> {
    const entity = await this.voterRepository.findOne({
      where: { id },
    });

    if (!entity) {
      return null;
    }

    return VoterMapper.toDomain(entity);
  }

  async findByNim(nim: string): Promise<Voter | null> {
    const entity = await this.voterRepository.findOne({
      where: { nim },
    });

    if (!entity) {
      return null;
    }

    return VoterMapper.toDomain(entity);
  }

  async findByNimIncludingDeleted(nim: string): Promise<Voter | null> {
    const entity = await this.voterRepository.findOne({
      where: { nim },
      withDeleted: true,
    });

    if (!entity) {
      return null;
    }

    return VoterMapper.toDomain(entity);
  }

  async findMany(
    query: QueryVotersDto,
  ): Promise<{ data: Voter[]; total: number }> {
    const {
      page = 1,
      limit = 10,
      search,
      filter = VoterFilterStatus.ALL,
      angkatan,
      sort = VoterSortField.CREATED_AT,
      order = SortOrder.DESC,
      status = VoterStatusFilter.ACTIVE,
    } = query;

    const queryBuilder = this.voterRepository.createQueryBuilder('voter');

    // Handle soft-delete status filter
    if (status === VoterStatusFilter.INACTIVE) {
      // Show ONLY soft-deleted voters
      queryBuilder.withDeleted();
      queryBuilder.andWhere('voter.deleted_at IS NOT NULL');
    }
    // If status === ACTIVE (default), TypeORM automatically filters deleted_at IS NULL

    // Apply search filter (nim, nama_lengkap, email)
    if (search?.trim()) {
      const searchTerm = `%${search.trim().toLowerCase()}%`;
      queryBuilder.andWhere(
        new Brackets((qb) => {
          qb.where('LOWER(voter.nim) LIKE :search', { search: searchTerm })
            .orWhere('LOWER(voter.nama_lengkap) LIKE :search', {
              search: searchTerm,
            })
            .orWhere('LOWER(voter.email) LIKE :search', { search: searchTerm });
        }),
      );
    }

    // Apply vote status filter
    if (filter === VoterFilterStatus.VOTED) {
      queryBuilder.andWhere('voter.has_voted = :hasVoted', { hasVoted: true });
    } else if (filter === VoterFilterStatus.NOT_VOTED) {
      queryBuilder.andWhere('voter.has_voted = :hasVoted', { hasVoted: false });
    }

    // Apply angkatan filter
    if (angkatan) {
      this.applyAngkatanFilter(queryBuilder, angkatan);
    }

    // Apply sorting
    const sortColumn = this.getSortColumn(sort);
    queryBuilder.orderBy(sortColumn, order.toUpperCase() as 'ASC' | 'DESC');

    // Apply pagination
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    // Execute query
    const [entities, total] = await queryBuilder.getManyAndCount();

    return {
      data: entities.map((entity) => VoterMapper.toDomain(entity)),
      total,
    };
  }

  async update(id: string, voter: Partial<Voter>): Promise<Voter> {
    const partialEntity = VoterMapper.toPartialEntity(voter);
    await this.voterRepository.update(id, partialEntity);

    const updatedEntity = await this.voterRepository.findOne({
      where: { id },
    });

    if (!updatedEntity) {
      throw new Error('Voter not found after update');
    }

    return VoterMapper.toDomain(updatedEntity);
  }

  async softDelete(id: string): Promise<void> {
    await this.voterRepository.softDelete(id);
  }

  async restore(id: string): Promise<Voter> {
    await this.voterRepository.restore(id);

    const restoredEntity = await this.voterRepository.findOne({
      where: { id },
    });

    if (!restoredEntity) {
      throw new Error('Voter not found after restore');
    }

    return VoterMapper.toDomain(restoredEntity);
  }

  async findDeletedById(id: string): Promise<Voter | null> {
    const entity = await this.voterRepository.findOne({
      where: { id, deletedAt: Not(IsNull()) },
      withDeleted: true,
    });

    if (!entity) {
      return null;
    }

    return VoterMapper.toDomain(entity);
  }

  /**
   * Find multiple voters by NIMs in a single query (O(1) - avoids N+1)
   * Includes soft-deleted records
   */
  async findByNimsIncludingDeleted(nims: string[]): Promise<Voter[]> {
    if (nims.length === 0) {
      return [];
    }

    const entities = await this.voterRepository.find({
      where: { nim: In(nims) },
      withDeleted: true,
    });

    return entities.map((entity) => VoterMapper.toDomain(entity));
  }

  /**
   * Bulk create voters in a single transaction (O(1) - single INSERT)
   * Uses TypeORM batch save for optimal performance
   */
  async bulkCreate(voters: Voter[]): Promise<Voter[]> {
    if (voters.length === 0) {
      return [];
    }

    const entities = voters.map((voter) => VoterMapper.toEntity(voter));
    const savedEntities = await this.voterRepository.save(entities);

    return savedEntities.map((entity) => VoterMapper.toDomain(entity));
  }

  /**
   * Find all non-voters (has_voted = false, not soft-deleted)
   * Ordered by angkatan ASC, nama_lengkap ASC for consistent CSV output
   */
  async findNonVoters(): Promise<Voter[]> {
    const entities = await this.voterRepository.find({
      where: { hasVoted: false },
      order: { angkatan: 'ASC', namaLengkap: 'ASC' },
    });

    return entities.map((entity) => VoterMapper.toDomain(entity));
  }

  private applyAngkatanFilter(
    queryBuilder: ReturnType<Repository<VoterEntity>['createQueryBuilder']>,
    angkatan: string,
  ): void {
    // Check if range format (e.g., "2018-2022")
    if (angkatan.includes('-') && !angkatan.includes(',')) {
      const parts = angkatan.split('-');
      if (parts.length === 2) {
        const startYear = Number.parseInt(parts[0], 10);
        const endYear = Number.parseInt(parts[1], 10);
        if (!Number.isNaN(startYear) && !Number.isNaN(endYear)) {
          const minYear = Math.min(startYear, endYear);
          const maxYear = Math.max(startYear, endYear);
          queryBuilder.andWhere(
            'voter.angkatan BETWEEN :minYear AND :maxYear',
            { minYear, maxYear },
          );
          return;
        }
      }
    }

    // Check if multiple values format (e.g., "2020,2021,2022")
    if (angkatan.includes(',')) {
      const years = angkatan
        .split(',')
        .map((y) => Number.parseInt(y.trim(), 10))
        .filter((y) => !Number.isNaN(y));
      if (years.length > 0) {
        queryBuilder.andWhere('voter.angkatan IN (:...years)', { years });
        return;
      }
    }

    // Single value format (e.g., "2020")
    const singleYear = Number.parseInt(angkatan, 10);
    if (!Number.isNaN(singleYear)) {
      queryBuilder.andWhere('voter.angkatan = :angkatan', {
        angkatan: singleYear,
      });
    }
  }

  private getSortColumn(sort: VoterSortField): string {
    const columnMap: Record<VoterSortField, string> = {
      [VoterSortField.NIM]: 'voter.nim',
      [VoterSortField.NAMA_LENGKAP]: 'voter.nama_lengkap',
      [VoterSortField.ANGKATAN]: 'voter.angkatan',
      [VoterSortField.EMAIL]: 'voter.email',
      [VoterSortField.HAS_VOTED]: 'voter.has_voted',
      [VoterSortField.CREATED_AT]: 'voter.created_at',
      [VoterSortField.UPDATED_AT]: 'voter.updated_at',
    };

    return columnMap[sort] || 'voter.created_at';
  }
}
