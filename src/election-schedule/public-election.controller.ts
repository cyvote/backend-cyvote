import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ElectionScheduleService } from './election-schedule.service';
import { PublicElectionStatusResponseDto } from './dto';

@ApiTags('Public - Election Status')
@Controller({ path: 'election', version: '1' })
export class PublicElectionController {
  constructor(
    private readonly electionScheduleService: ElectionScheduleService,
  ) {}

  @Get('status')
  @ApiOperation({
    summary: 'Get public election status',
    description:
      'Retrieve the current election status, dates, and whether voting is open. This is a public endpoint that does not require authentication.',
  })
  @ApiResponse({
    status: 200,
    description: 'Election status retrieved',
    type: PublicElectionStatusResponseDto,
  })
  async getStatus(): Promise<PublicElectionStatusResponseDto> {
    return this.electionScheduleService.getPublicStatus();
  }
}
