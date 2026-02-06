import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AdminResendStatusService } from './admin-resend-status.service';
import { ResendStatusResponseDto } from './dto/resend-status-response.dto';
import { AdminAuthGuard } from '../auth-admin/guards/admin-auth.guard';
import { AdminRolesGuard } from '../auth-admin/guards/admin-roles.guard';
import { AdminRoles } from '../auth-admin/decorators/admin-roles.decorator';
import { AdminRole } from '../auth-admin/enums/admin-role.enum';
import { CurrentAdmin } from '../auth-admin/decorators/current-admin.decorator';
import { AdminResendStatusRateLimitGuard } from './guards/admin-resend-status-rate-limit.guard';

@ApiTags('Admin - Voting Token')
@ApiBearerAuth()
@UseGuards(AdminAuthGuard, AdminRolesGuard, AdminResendStatusRateLimitGuard)
@Controller({ path: 'admin/voters', version: '1' })
export class AdminResendStatusController {
  constructor(
    private readonly adminResendStatusService: AdminResendStatusService,
  ) {}

  @Get(':id/resend-status')
  @AdminRoles(AdminRole.ADMIN, AdminRole.SUPERADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get voter token resend status',
    description:
      'Retrieves the current resend count and remaining resend attempts for a specific voter token. ' +
      'The voter must exist and their token must not have been used. ' +
      'Maximum 3 resends are allowed per voter.',
  })
  @ApiParam({
    name: 'id',
    description: 'Voter UUID',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Resend status retrieved successfully',
    type: ResendStatusResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Token already used and cannot be resent',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: {
          type: 'string',
          example: 'Token already used and cannot be resent',
        },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Voter not found or token not found for this voter',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: {
          type: 'string',
          example: 'Token not found for this voter',
        },
        error: { type: 'string', example: 'Not Found' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized - Admin authentication required',
  })
  @ApiResponse({
    status: HttpStatus.TOO_MANY_REQUESTS,
    description: 'Rate limit exceeded. Please try again later.',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 429 },
        message: {
          type: 'string',
          example:
            'Rate limit exceeded for admin-resend-status. Please try again later.',
        },
        error: { type: 'string', example: 'Too Many Requests' },
        retryAfter: { type: 'number', example: 60 },
      },
    },
  })
  async getResendStatus(
    @Param('id', ParseUUIDPipe) voterId: string,
    @CurrentAdmin('id') adminId: string,
  ): Promise<ResendStatusResponseDto> {
    return this.adminResendStatusService.getResendStatus(voterId, adminId);
  }
}
