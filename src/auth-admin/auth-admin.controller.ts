import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthAdminService } from './auth-admin.service';
import { AdminLoginDto } from './dto/admin-login.dto';
import { AdminLoginResponseDto } from './dto/admin-login-response.dto';

@ApiTags('Admin Auth')
@Controller({ path: 'auth/admin', version: '1' })
export class AuthAdminController {
  constructor(private readonly authAdminService: AuthAdminService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin login' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Login successful',
    type: AdminLoginResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid credentials',
  })
  async login(@Body() dto: AdminLoginDto): Promise<AdminLoginResponseDto> {
    return this.authAdminService.validateLogin(dto);
  }
}
