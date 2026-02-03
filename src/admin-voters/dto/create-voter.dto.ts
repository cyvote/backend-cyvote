import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsString,
  Length,
  Matches,
  Max,
  Min,
} from 'class-validator';

export class CreateVoterDto {
  @ApiProperty({
    description: 'NIM (Nomor Induk Mahasiswa)',
    example: '2110511001',
    minLength: 1,
    maxLength: 15,
  })
  @IsString()
  @IsNotEmpty()
  @Length(1, 15)
  @Matches(/^[0-9]+$/, {
    message: 'NIM must contain only numbers',
  })
  nim: string;

  @ApiProperty({
    description: 'Full name of the voter',
    example: 'John Doe',
    minLength: 1,
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  namaLengkap: string;

  @ApiProperty({
    description: 'Academic year (angkatan)',
    example: 2021,
    minimum: 1900,
    maximum: 2100,
  })
  @IsInt()
  @Min(1900)
  @Max(2100)
  angkatan: number;

  @ApiProperty({
    description: 'Email address (must be {nim}@mahasiswa.upnvj.ac.id)',
    example: '2110511001@mahasiswa.upnvj.ac.id',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}
