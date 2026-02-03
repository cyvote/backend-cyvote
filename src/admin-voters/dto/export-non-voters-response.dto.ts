import { ApiProperty } from '@nestjs/swagger';

/**
 * Error response DTO for export non-voters endpoint
 * Used only for Swagger documentation (actual response is CSV stream)
 */
export class ExportNonVotersErrorResponseDto {
  @ApiProperty({ example: 404 })
  statusCode: number;

  @ApiProperty({ example: 'No non-voters found' })
  message: string;

  @ApiProperty({ example: 'Not Found' })
  error: string;
}
