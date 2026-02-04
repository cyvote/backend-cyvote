import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiBody,
} from '@nestjs/swagger';
import { ElectionScheduleService } from './election-schedule.service';
import {
  SetScheduleDto,
  ExtendElectionDto,
  SingleElectionConfigResponseDto,
} from './dto';
import { AdminAuthGuard } from '../auth-admin/guards/admin-auth.guard';
import { AdminRolesGuard } from '../auth-admin/guards/admin-roles.guard';
import { AdminRoles } from '../auth-admin/decorators/admin-roles.decorator';
import { AdminRole } from '../auth-admin/enums/admin-role.enum';

@ApiTags('Superadmin - Election Management')
@ApiBearerAuth()
@Controller('api/v1/superadmin/election')
@UseGuards(AdminAuthGuard, AdminRolesGuard)
@AdminRoles(AdminRole.SUPERADMIN)
export class SuperadminElectionController {
  constructor(
    private readonly electionScheduleService: ElectionScheduleService,
  ) {}

  @Post('schedule')
  @ApiOperation({
    summary: 'Set election schedule',
    description:
      'Create new election schedule with start and end dates. Duration must be between 6 hours and 7 days. Start date must be in the future.',
  })
  @ApiBody({ type: SetScheduleDto })
  @ApiResponse({
    status: 201,
    description: 'Election schedule created successfully',
    type: SingleElectionConfigResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid schedule (duration, dates)',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - SUPERADMIN role required',
  })
  @ApiResponse({
    status: 409,
    description: 'Election config already exists',
  })
  async setSchedule(
    @Body() dto: SetScheduleDto,
    @Request() req: any,
  ): Promise<SingleElectionConfigResponseDto> {
    return this.electionScheduleService.setSchedule(dto, req.user.id);
  }

  @Get('config')
  @ApiOperation({
    summary: 'Get current election configuration',
    description:
      'Retrieve the current election configuration including status, dates, and metadata.',
  })
  @ApiResponse({
    status: 200,
    description: 'Election configuration retrieved',
    type: SingleElectionConfigResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - SUPERADMIN role required',
  })
  @ApiResponse({
    status: 404,
    description: 'No election configuration found',
  })
  async getConfig(): Promise<SingleElectionConfigResponseDto> {
    return this.electionScheduleService.getCurrentConfig();
  }

  @Put('extend')
  @ApiOperation({
    summary: 'Extend election end date',
    description:
      'Extend the election end date. Only allowed when election is ACTIVE. Maximum extension is 24 hours from current end date. Reason is required (min 10 chars). Notification emails will be sent to all voters asynchronously.',
  })
  @ApiBody({ type: ExtendElectionDto })
  @ApiResponse({
    status: 200,
    description: 'Election extended successfully',
    type: SingleElectionConfigResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid extension (not active, invalid date, exceeds max)',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - SUPERADMIN role required',
  })
  @ApiResponse({
    status: 404,
    description: 'No election configuration found',
  })
  async extendElection(
    @Body() dto: ExtendElectionDto,
    @Request() req: any,
  ): Promise<SingleElectionConfigResponseDto> {
    return this.electionScheduleService.extendElection(dto, req.user.id);
  }
}
