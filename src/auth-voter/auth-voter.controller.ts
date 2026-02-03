import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthVoterService } from './auth-voter.service';
import { VoterLoginDto } from './dto/voter-login.dto';
import { VoterLoginResponseDto } from './dto/voter-login-response.dto';
import { VerifyTokenDto } from './dto/verify-token.dto';
import { VerifyTokenResponseDto } from './dto/verify-token-response.dto';
import { VoterLoginRateLimitGuard } from './guards/voter-login-rate-limit.guard';
import { VoterTokenRateLimitGuard } from './guards/voter-token-rate-limit.guard';
import { VoterSessionGuard } from './guards/voter-session.guard';

@Controller('api/v1/auth/voter')
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
  async verifyToken(
    @Body() dto: VerifyTokenDto,
    @Req() req: Request,
  ): Promise<VerifyTokenResponseDto> {
    const voterId = (req as any).user.voterId;
    return this.authVoterService.verifyToken(dto, voterId);
  }
}
