import { registerAs } from '@nestjs/config';
import { IsString, MinLength, IsNumber, Min, Max } from 'class-validator';
import validateConfig from '../../utils/validate-config';

class EnvironmentVariablesValidator {
  @IsString()
  @MinLength(32)
  AUTH_ADMIN_JWT_SECRET: string;

  @IsString()
  AUTH_ADMIN_JWT_TOKEN_EXPIRES_IN: string;

  @IsNumber()
  @Min(4)
  @Max(31)
  AUTH_ADMIN_BCRYPT_COST: number;
}

export default registerAs('adminAuth', () => {
  validateConfig(process.env, EnvironmentVariablesValidator);

  return {
    secret: process.env.AUTH_ADMIN_JWT_SECRET,
    expires: process.env.AUTH_ADMIN_JWT_TOKEN_EXPIRES_IN || '2h',
    bcryptCost: Number.parseInt(process.env.AUTH_ADMIN_BCRYPT_COST || '12', 10),
  };
});
