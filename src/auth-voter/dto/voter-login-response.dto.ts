import { ApiProperty } from '@nestjs/swagger';

/**
 * Voter info returned in login response
 */
export class VoterInfoDto {
  @ApiProperty({
    description: 'Nomor Induk Mahasiswa',
    example: '2210512109',
  })
  nim: string;

  @ApiProperty({
    description: 'Nama lengkap voter',
    example: 'Nugraha Adhitama',
  })
  nama: string;
}

/**
 * DTO for voter login response
 * Returns a short-lived session token (not the voting token)
 */
export class VoterLoginResponseDto {
  @ApiProperty({
    description:
      'Short-lived session token (5 minutes). Use in Authorization header for verify-token.',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  sessionToken: string;

  @ApiProperty({
    description:
      'Session token expiration timestamp (Unix epoch in milliseconds)',
    example: 1707057600000,
  })
  tokenExpires: number;

  @ApiProperty({
    description: 'Voter information',
    type: VoterInfoDto,
  })
  voter: VoterInfoDto;
}
