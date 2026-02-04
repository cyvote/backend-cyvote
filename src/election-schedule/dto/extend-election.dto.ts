import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ExtendElectionDto {
  @ApiProperty({
    description:
      'New end date in WIB (must be after current end date, max 24h extension)',
    example: '2026-02-10T20:00:00+07:00',
  })
  @IsDateString()
  @IsNotEmpty()
  newEndDate: string;

  @ApiProperty({
    description: 'Reason for extension (min 10 characters)',
    example: 'Extended due to technical issues affecting some voters',
    minLength: 10,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  reason: string;
}
