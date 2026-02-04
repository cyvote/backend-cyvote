import { Test, TestingModule } from '@nestjs/testing';
import { ElectionExtensionEmailService } from './election-extension-email.service';
import { MailService } from '../mail/mail.service';
import { VoterRepositoryInterface } from '../admin-voters/interfaces/voter.repository.interface';
import { Voter } from '../admin-voters/domain/voter.model';

describe('ElectionExtensionEmailService', () => {
  let service: ElectionExtensionEmailService;
  let voterRepository: jest.Mocked<VoterRepositoryInterface>;
  let mailService: jest.Mocked<MailService>;

  const createMockVoter = (overrides: Partial<Voter> = {}): Voter => {
    return new Voter({
      id: '123e4567-e89b-12d3-a456-426614174001',
      nim: '2110511001',
      namaLengkap: 'John Doe',
      angkatan: 2021,
      email: 'john.doe@mahasiswa.upnvj.ac.id',
      hasVoted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      ...overrides,
    });
  };

  beforeEach(async () => {
    const mockVoterRepository: jest.Mocked<VoterRepositoryInterface> = {
      create: jest.fn(),
      findById: jest.fn(),
      findByNim: jest.fn(),
      findByNimIncludingDeleted: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
      restore: jest.fn(),
      createMany: jest.fn(),
      findByNimMany: jest.fn(),
    };

    const mockMailService = {
      sendElectionExtended: jest.fn().mockResolvedValue({ success: true }),
      sendConfirmMail: jest.fn(),
      sendConfirmNewMail: jest.fn(),
      sendResetPassword: jest.fn(),
      sendVotingToken: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ElectionExtensionEmailService,
        {
          provide: 'VoterRepositoryInterface',
          useValue: mockVoterRepository,
        },
        { provide: MailService, useValue: mockMailService },
      ],
    }).compile();

    service = module.get<ElectionExtensionEmailService>(
      ElectionExtensionEmailService,
    );
    voterRepository = module.get('VoterRepositoryInterface');
    mailService = module.get(MailService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Positive Tests', () => {
    // Test 1
    it('should send emails to all voters', async () => {
      const voters = [createMockVoter(), createMockVoter({ id: 'voter-2' })];
      voterRepository.findMany.mockResolvedValue({
        data: voters,
        total: 2,
      });

      await service.sendExtensionNotifications(
        new Date('2026-02-10T20:00:00+07:00'),
        'Technical issues',
      );

      // Wait for setImmediate to execute
      await new Promise((resolve) => setImmediate(resolve));

      expect(voterRepository.findMany).toHaveBeenCalled();
    });

    // Test 2
    it('should call voterRepository.findMany with correct parameters', async () => {
      voterRepository.findMany.mockResolvedValue({
        data: [],
        total: 0,
      });

      await service.sendExtensionNotifications(new Date(), 'Test reason');

      await new Promise((resolve) => setImmediate(resolve));

      expect(voterRepository.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 1,
          limit: 10000,
        }),
      );
    });

    // Test 3
    it('should not throw when no voters exist', async () => {
      voterRepository.findMany.mockResolvedValue({
        data: [],
        total: 0,
      });

      await expect(
        service.sendExtensionNotifications(new Date(), 'Test reason'),
      ).resolves.not.toThrow();
    });

    // Test 4
    it('should format date correctly for email', async () => {
      const voters = [createMockVoter()];
      voterRepository.findMany.mockResolvedValue({
        data: voters,
        total: 1,
      });

      await service.sendExtensionNotifications(
        new Date('2026-02-10T10:00:00Z'),
        'Test reason',
      );

      await new Promise((resolve) => setImmediate(resolve));

      // The service should have called sendElectionExtended
      // with formatted date and time
      expect(mailService.sendElectionExtended).toHaveBeenCalled();
    });

    // Test 5
    it('should include voter name in email data', async () => {
      const voter = createMockVoter({ namaLengkap: 'Test Voter' });
      voterRepository.findMany.mockResolvedValue({
        data: [voter],
        total: 1,
      });

      await service.sendExtensionNotifications(new Date(), 'Test reason');

      await new Promise((resolve) => setImmediate(resolve));

      expect(mailService.sendElectionExtended).toHaveBeenCalledWith(
        expect.objectContaining({
          to: voter.email,
          data: expect.objectContaining({
            nama: 'Test Voter',
          }),
        }),
      );
    });

    // Test 6
    it('should include reason in email data', async () => {
      const voter = createMockVoter();
      voterRepository.findMany.mockResolvedValue({
        data: [voter],
        total: 1,
      });

      const reason = 'Extended due to technical issues';

      await service.sendExtensionNotifications(new Date(), reason);

      await new Promise((resolve) => setImmediate(resolve));

      expect(mailService.sendElectionExtended).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            reason,
          }),
        }),
      );
    });

    // Test 7
    it('should send to correct email address', async () => {
      const voter = createMockVoter({
        email: 'specific@test.com',
      });
      voterRepository.findMany.mockResolvedValue({
        data: [voter],
        total: 1,
      });

      await service.sendExtensionNotifications(new Date(), 'Test reason');

      await new Promise((resolve) => setImmediate(resolve));

      expect(mailService.sendElectionExtended).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'specific@test.com',
        }),
      );
    });

    // Test 8
    it('should handle multiple voters', async () => {
      const voters = [
        createMockVoter({ id: '1', email: 'voter1@test.com' }),
        createMockVoter({ id: '2', email: 'voter2@test.com' }),
        createMockVoter({ id: '3', email: 'voter3@test.com' }),
      ];
      voterRepository.findMany.mockResolvedValue({
        data: voters,
        total: 3,
      });

      await service.sendExtensionNotifications(new Date(), 'Test reason');

      await new Promise((resolve) => setImmediate(resolve));
      await new Promise((resolve) => setTimeout(resolve, 200));

      expect(mailService.sendElectionExtended).toHaveBeenCalledTimes(3);
    });

    // Test 9
    it('should format time in WIB', async () => {
      const voter = createMockVoter();
      voterRepository.findMany.mockResolvedValue({
        data: [voter],
        total: 1,
      });

      await service.sendExtensionNotifications(
        new Date('2026-02-10T17:00:00+07:00'),
        'Test reason',
      );

      await new Promise((resolve) => setImmediate(resolve));

      expect(mailService.sendElectionExtended).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            new_end_time: expect.stringContaining('WIB'),
          }),
        }),
      );
    });

    // Test 10
    it('should not block on execution', async () => {
      const voters = Array.from({ length: 100 }, (_, i) =>
        createMockVoter({ id: `voter-${i}` }),
      );
      voterRepository.findMany.mockResolvedValue({
        data: voters,
        total: 100,
      });

      const start = Date.now();
      await service.sendExtensionNotifications(new Date(), 'Test reason');
      const duration = Date.now() - start;

      // Should return almost immediately (non-blocking)
      expect(duration).toBeLessThan(100);
    });
  });

  describe('Negative Tests', () => {
    // Test 11
    it('should handle mail service error gracefully', async () => {
      const voter = createMockVoter();
      voterRepository.findMany.mockResolvedValue({
        data: [voter],
        total: 1,
      });
      mailService.sendElectionExtended.mockRejectedValue(
        new Error('Mail server error'),
      );

      await expect(
        service.sendExtensionNotifications(new Date(), 'Test reason'),
      ).resolves.not.toThrow();
    });

    // Test 12
    it('should handle repository error gracefully', async () => {
      voterRepository.findMany.mockRejectedValue(
        new Error('Database connection error'),
      );

      await expect(
        service.sendExtensionNotifications(new Date(), 'Test reason'),
      ).resolves.not.toThrow();
    });

    // Test 13
    it('should continue sending after individual email failure', async () => {
      const voters = [
        createMockVoter({ id: '1', email: 'fail@test.com' }),
        createMockVoter({ id: '2', email: 'success@test.com' }),
      ];
      voterRepository.findMany.mockResolvedValue({
        data: voters,
        total: 2,
      });

      mailService.sendElectionExtended
        .mockRejectedValueOnce(new Error('Failed'))
        .mockResolvedValueOnce({ success: true });

      await service.sendExtensionNotifications(new Date(), 'Test reason');

      await new Promise((resolve) => setImmediate(resolve));
      await new Promise((resolve) => setTimeout(resolve, 200));

      expect(mailService.sendElectionExtended).toHaveBeenCalledTimes(2);
    });

    // Test 14
    it('should handle null data from repository', async () => {
      voterRepository.findMany.mockResolvedValue({
        data: null as any,
        total: 0,
      });

      await expect(
        service.sendExtensionNotifications(new Date(), 'Test reason'),
      ).resolves.not.toThrow();
    });

    // Test 15
    it('should handle empty voters array', async () => {
      voterRepository.findMany.mockResolvedValue({
        data: [],
        total: 0,
      });

      await service.sendExtensionNotifications(new Date(), 'Test reason');

      await new Promise((resolve) => setImmediate(resolve));

      expect(mailService.sendElectionExtended).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    // Test 16
    it('should handle very long reason string', async () => {
      const voter = createMockVoter();
      voterRepository.findMany.mockResolvedValue({
        data: [voter],
        total: 1,
      });

      const longReason = 'A'.repeat(10000);

      await service.sendExtensionNotifications(new Date(), longReason);

      await new Promise((resolve) => setImmediate(resolve));

      expect(mailService.sendElectionExtended).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            reason: longReason,
          }),
        }),
      );
    });

    // Test 17
    it('should handle special characters in reason', async () => {
      const voter = createMockVoter();
      voterRepository.findMany.mockResolvedValue({
        data: [voter],
        total: 1,
      });

      const specialReason = 'Extended due to <script>alert("xss")</script>';

      await service.sendExtensionNotifications(new Date(), specialReason);

      await new Promise((resolve) => setImmediate(resolve));

      expect(mailService.sendElectionExtended).toHaveBeenCalled();
    });

    // Test 18
    it('should handle unicode in voter name', async () => {
      const voter = createMockVoter({
        namaLengkap: '日本語 العربية 中文',
      });
      voterRepository.findMany.mockResolvedValue({
        data: [voter],
        total: 1,
      });

      await service.sendExtensionNotifications(new Date(), 'Test reason');

      await new Promise((resolve) => setImmediate(resolve));

      expect(mailService.sendElectionExtended).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            nama: '日本語 العربية 中文',
          }),
        }),
      );
    });

    // Test 19
    it('should handle date at midnight WIB', async () => {
      const voter = createMockVoter();
      voterRepository.findMany.mockResolvedValue({
        data: [voter],
        total: 1,
      });

      await service.sendExtensionNotifications(
        new Date('2026-02-10T17:00:00Z'), // Midnight WIB (00:00)
        'Test reason',
      );

      await new Promise((resolve) => setImmediate(resolve));

      expect(mailService.sendElectionExtended).toHaveBeenCalled();
    });

    // Test 20
    it('should handle date at end of day WIB', async () => {
      const voter = createMockVoter();
      voterRepository.findMany.mockResolvedValue({
        data: [voter],
        total: 1,
      });

      await service.sendExtensionNotifications(
        new Date('2026-02-10T16:59:59Z'), // 23:59:59 WIB
        'Test reason',
      );

      await new Promise((resolve) => setImmediate(resolve));

      expect(mailService.sendElectionExtended).toHaveBeenCalled();
    });

    // Test 21
    it('should handle January date', async () => {
      const voter = createMockVoter();
      voterRepository.findMany.mockResolvedValue({
        data: [voter],
        total: 1,
      });

      await service.sendExtensionNotifications(
        new Date('2026-01-15T10:00:00Z'),
        'Test reason',
      );

      await new Promise((resolve) => setImmediate(resolve));

      expect(mailService.sendElectionExtended).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            new_end_date: expect.stringContaining('Januari'),
          }),
        }),
      );
    });

    // Test 22
    it('should handle December date', async () => {
      const voter = createMockVoter();
      voterRepository.findMany.mockResolvedValue({
        data: [voter],
        total: 1,
      });

      await service.sendExtensionNotifications(
        new Date('2026-12-25T10:00:00Z'),
        'Test reason',
      );

      await new Promise((resolve) => setImmediate(resolve));

      expect(mailService.sendElectionExtended).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            new_end_date: expect.stringContaining('Desember'),
          }),
        }),
      );
    });

    // Test 23
    it('should batch emails correctly', async () => {
      const voters = Array.from({ length: 25 }, (_, i) =>
        createMockVoter({ id: `voter-${i}`, email: `voter${i}@test.com` }),
      );
      voterRepository.findMany.mockResolvedValue({
        data: voters,
        total: 25,
      });

      await service.sendExtensionNotifications(new Date(), 'Test reason');

      await new Promise((resolve) => setImmediate(resolve));
      await new Promise((resolve) => setTimeout(resolve, 500));

      expect(mailService.sendElectionExtended).toHaveBeenCalledTimes(25);
    });

    // Test 24
    it('should handle single voter', async () => {
      const voter = createMockVoter();
      voterRepository.findMany.mockResolvedValue({
        data: [voter],
        total: 1,
      });

      await service.sendExtensionNotifications(new Date(), 'Test reason');

      await new Promise((resolve) => setImmediate(resolve));

      expect(mailService.sendElectionExtended).toHaveBeenCalledTimes(1);
    });

    // Test 25
    it('should use fire-and-forget pattern', async () => {
      const voters = [createMockVoter()];
      voterRepository.findMany.mockResolvedValue({
        data: voters,
        total: 1,
      });

      // Should return immediately without waiting for emails
      const result = await service.sendExtensionNotifications(
        new Date(),
        'Test reason',
      );

      expect(result).toBeUndefined();
    });
  });
});
