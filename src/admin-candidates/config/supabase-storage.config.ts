import { registerAs } from '@nestjs/config';

export interface SupabaseStorageConfig {
  projectUrl: string;
  secretKey: string;
  bucket: string;
  folders: {
    candidatePhoto: string;
    grandDesign: string;
  };
}

export default registerAs('supabaseStorage', (): SupabaseStorageConfig => {
  return {
    projectUrl: process.env.SUPABASE_PROJECT_URL || '',
    secretKey: process.env.SUPABASE_SECRET_KEY || '',
    bucket: 'uploads',
    folders: {
      candidatePhoto: 'candidates_profile_photo',
      grandDesign: 'grand_designs',
    },
  };
});
