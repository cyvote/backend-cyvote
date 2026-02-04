import {
  Controller,
  Post,
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
import { AdminResendTokenService } from './admin-resend-token.service';
import { ResendTokenResponseDto } from './dto/resend-token-response.dto';
import { AdminAuthGuard } from '../auth-admin/guards/admin-auth.guard';
import { AdminRolesGuard } from '../auth-admin/guards/admin-roles.guard';
import { AdminRoles } from '../auth-admin/decorators/admin-roles.decorator';
import { AdminRole } from '../auth-admin/enums/admin-role.enum';
import { CurrentAdmin } from '../auth-admin/decorators/current-admin.decorator';

@ApiTags('Admin - Voting Token')
@ApiBearerAuth()
@UseGuards(AdminAuthGuard, AdminRolesGuard)
@Controller({ path: 'admin/voters', version: '1' })
export class AdminResendTokenController {
  constructor(
    private readonly adminResendTokenService: AdminResendTokenService,
  ) {}

  @Post(':id/resend-token')
  @AdminRoles(AdminRole.ADMIN, AdminRole.SUPERADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Resend voting token to voter',
    description:
      'Resends a new voting token to a specific voter. The old token becomes invalid. Maximum 3 resends allowed per voter.',
  })
  @ApiParam({
    name: 'id',
    description: 'Voter UUID',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Token resent successfully',
    type: ResendTokenResponseDto,
  })
  @ApiResponse({
    status: 400,
    description:
      'Resend limit reached, election not active, or token already used',
  })
  @ApiResponse({
    status: 404,
    description: 'Voter or token not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Admin authentication required',
  })
  async resendToken(
    @Param('id', ParseUUIDPipe) voterId: string,
    @CurrentAdmin('id') adminId: string,
  ): Promise<ResendTokenResponseDto> {
    return this.adminResendTokenService.resendToken(voterId, adminId);
  }
}
