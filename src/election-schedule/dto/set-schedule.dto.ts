import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty } from 'class-validator';

export class SetScheduleDto {
  @ApiProperty({
    description: 'Start date in WIB timezone (ISO 8601)',
    example: '2026-02-10T08:00:00+07:00',
  })
  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @ApiProperty({
    description: 'End date in WIB timezone (ISO 8601)',
    example: '2026-02-10T17:00:00+07:00',
  })
  @IsDateString()
  @IsNotEmpty()
  endDate: string;
}
