import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import { StorageServiceInterface } from '../../interfaces/storage.service.interface';
import { SupabaseStorageConfig } from '../../config/supabase-storage.config';

/**
 * Service for handling file uploads to Supabase Storage
 */
@Injectable()
export class SupabaseStorageService implements StorageServiceInterface {
  private readonly supabase: SupabaseClient;
  private readonly bucket: string;
  private readonly folders: {
    candidatePhoto: string;
    grandDesign: string;
  };

  constructor(private readonly configService: ConfigService) {
    const config =
      this.configService.get<SupabaseStorageConfig>('supabaseStorage');

    if (!config?.projectUrl || !config?.secretKey) {
      throw new Error('Supabase configuration is missing');
    }

    this.supabase = createClient(config.projectUrl, config.secretKey);
    this.bucket = config.bucket;
    this.folders = config.folders;
  }

  /**
   * Generate unique filename with timestamp and UUID
   */
  private generateFileName(originalName: string): string {
    const timestamp = Date.now();
    const uuid = randomUUID();
    const extension = originalName.split('.').pop()?.toLowerCase() || '';
    return `${timestamp}-${uuid}.${extension}`;
  }

  /**
   * Extract file path from Supabase public URL
   */
  private extractPathFromUrl(url: string): string | null {
    try {
      // URL format: https://project.supabase.co/storage/v1/object/public/bucket/path
      const match = url.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)$/);
      return match ? match[1] : null;
    } catch {
      return null;
    }
  }

  /**
   * Upload photo to candidates_profile_photo folder
   */
  async uploadPhoto(file: Express.Multer.File): Promise<string> {
    const fileName = this.generateFileName(file.originalname);
    const filePath = `${this.folders.candidatePhoto}/${fileName}`;

    const { error } = await this.supabase.storage
      .from(this.bucket)
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (error) {
      throw new InternalServerErrorException(
        `Failed to upload photo: ${error.message}`,
      );
    }

    // Get public URL
    const { data: urlData } = this.supabase.storage
      .from(this.bucket)
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  }

  /**
   * Upload grand design PDF to grand_designs folder
   */
  async uploadGrandDesign(file: Express.Multer.File): Promise<string> {
    // Ensure grand_designs folder exists
    await this.ensureFolderExists(this.folders.grandDesign);

    const fileName = this.generateFileName(file.originalname);
    const filePath = `${this.folders.grandDesign}/${fileName}`;

    const { error } = await this.supabase.storage
      .from(this.bucket)
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (error) {
      throw new InternalServerErrorException(
        `Failed to upload grand design: ${error.message}`,
      );
    }

    // Get public URL
    const { data: urlData } = this.supabase.storage
      .from(this.bucket)
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  }

  /**
   * Delete file from storage by URL
   */
  async deleteFile(url: string): Promise<void> {
    if (!url) return;

    const filePath = this.extractPathFromUrl(url);
    if (!filePath) return;

    const { error } = await this.supabase.storage
      .from(this.bucket)
      .remove([filePath]);

    if (error) {
      // Log error but don't throw - file deletion failure shouldn't block other operations
      console.error(`Failed to delete file ${filePath}: ${error.message}`);
    }
  }

  /**
   * Ensure folder exists by checking if we can list it
   * If folder doesn't exist, create a placeholder file and delete it
   */
  async ensureFolderExists(folder: string): Promise<void> {
    const { data, error } = await this.supabase.storage
      .from(this.bucket)
      .list(folder, { limit: 1 });

    // If we can list the folder or it exists, we're good
    if (!error && data !== null) {
      return;
    }

    // Create a placeholder file to ensure folder exists
    const placeholderPath = `${folder}/.gitkeep`;
    const { error: uploadError } = await this.supabase.storage
      .from(this.bucket)
      .upload(placeholderPath, new Uint8Array(0), {
        contentType: 'text/plain',
        upsert: true,
      });

    if (uploadError) {
      // Folder might already exist, ignore error
      console.warn(
        `Could not create placeholder for folder ${folder}: ${uploadError.message}`,
      );
    }
  }
}
