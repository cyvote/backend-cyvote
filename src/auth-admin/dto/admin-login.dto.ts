import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength, MaxLength } from 'class-validator';

export class AdminLoginDto {
  @ApiProperty({
    type: String,
    example: 'admin1',
    description: 'Admin username',
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  username: string;

  @ApiProperty({
    type: String,
    example: 'admin123',
    description: 'Admin password',
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  password: string;
}
