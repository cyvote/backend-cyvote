import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for delete candidate response
 */
export class DeleteCandidateResponseDto {
  @ApiProperty({
    description: 'Success message',
    example: 'Candidate deleted successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Deleted candidate ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;
}
