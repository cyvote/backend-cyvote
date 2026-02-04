import { registerAs } from '@nestjs/config';
import { IsString, MinLength } from 'class-validator';
import validateConfig from '../../utils/validate-config';
import { VotingConfig } from './voting-config.type';

class EnvironmentVariablesValidator {
  @IsString()
  @MinLength(32)
  VOTE_HASH_SALT: string;
}

export default registerAs<VotingConfig>('voting', () => {
  validateConfig(process.env, EnvironmentVariablesValidator);

  return {
    salt: process.env.VOTE_HASH_SALT || '',
  };
});
