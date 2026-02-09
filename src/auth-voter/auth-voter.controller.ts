import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { Request } from 'express';
import { AuthVoterService } from './auth-voter.service';
import { VoterLoginDto } from './dto/voter-login.dto';
import { VoterLoginResponseDto } from './dto/voter-login-response.dto';
import { VerifyTokenDto } from './dto/verify-token.dto';
import { VerifyTokenResponseDto } from './dto/verify-token-response.dto';
import { VoterLoginRateLimitGuard } from './guards/voter-login-rate-limit.guard';
import { VoterTokenRateLimitGuard } from './guards/voter-token-rate-limit.guard';
import { VoterSessionGuard } from './guards/voter-session.guard';

@ApiTags('Voter Auth')
@Controller({ path: 'auth/voter', version: '1' })
export class AuthVoterController {
  constructor(private readonly authVoterService: AuthVoterService) {}

  /**
   * Step 1: Login with NIM
   * POST /api/v1/auth/voter/login
   * @param dto - VoterLoginDto containing nim
   * @returns VoterLoginResponseDto with session token
   */
  @Post('login')
  @UseGuards(VoterLoginRateLimitGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Login voter with NIM',
    description:
      'Step 1 of two-step authentication. Validates NIM and election status, returns a short-lived session token (5 minutes).',
  })
  @ApiBody({ type: VoterLoginDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Login successful. Returns session token and voter info.',
    type: VoterLoginResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description:
      'NIM not found, voting not started, voting ended, or no election configured.',
  })
  @ApiResponse({
    status: HttpStatus.TOO_MANY_REQUESTS,
    description: 'Rate limit exceeded (5 attempts per 10 minutes).',
  })
  async login(@Body() dto: VoterLoginDto): Promise<VoterLoginResponseDto> {
    return this.authVoterService.login(dto);
  }

  /**
   * Step 2: Verify voting token
   * POST /api/v1/auth/voter/verify-token
   * Requires session token from login step
   * @param dto - VerifyTokenDto containing token
   * @param req - Request object with voter session
   * @returns VerifyTokenResponseDto with authenticated JWT
   */
  @Post('verify-token')
  @UseGuards(VoterSessionGuard, VoterTokenRateLimitGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Verify voting token',
    description:
      'Step 2 of two-step authentication. Requires session token from login. Validates voting token and returns authenticated JWT for voting.',
  })
  @ApiBody({ type: VerifyTokenDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description:
      'Token verified successfully. Returns authenticated JWT for voting.',
    type: VerifyTokenResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description:
      'Invalid session token, token not found, or token already used.',
  })
  @ApiResponse({
    status: HttpStatus.TOO_MANY_REQUESTS,
    description: 'Rate limit exceeded (3 attempts per 1 minute).',
  })
  async verifyToken(
    @Body() dto: VerifyTokenDto,
    @Req() req: Request,
  ): Promise<VerifyTokenResponseDto> {
    const voterId = (req as any).user.voterId;
    return this.authVoterService.verifyToken(dto, voterId);
  }
}
