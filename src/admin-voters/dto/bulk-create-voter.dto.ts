import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, ValidateNested } from 'class-validator';
import { BulkCreateVoterItemDto } from './bulk-create-voter-item.dto';

export class BulkCreateVoterDto {
  @ApiProperty({
    description: 'Array of voters to create (minimum 2, maximum 500)',
    type: [BulkCreateVoterItemDto],
    minItems: 2,
    maxItems: 500,
  })
  @ValidateNested({ each: true })
  @Type(() => BulkCreateVoterItemDto)
  @ArrayMinSize(2, { message: 'Bulk insert requires at least 2 voters' })
  @ArrayMaxSize(500, { message: 'Maximum 500 voters per request' })
  voters: BulkCreateVoterItemDto[];
}
