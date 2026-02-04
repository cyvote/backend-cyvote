/**
 * Interface for storage service operations
 */
export interface StorageServiceInterface {
  /**
   * Upload photo file to storage
   * @param file - Multer file object
   * @returns Public URL of uploaded file
   */
  uploadPhoto(file: Express.Multer.File): Promise<string>;

  /**
   * Upload grand design PDF to storage
   * @param file - Multer file object
   * @returns Public URL of uploaded file
   */
  uploadGrandDesign(file: Express.Multer.File): Promise<string>;

  /**
   * Delete file from storage by URL
   * @param url - Public URL of file to delete
   */
  deleteFile(url: string): Promise<void>;

  /**
   * Ensure folder exists in storage bucket
   * @param folder - Folder name to check/create
   */
  ensureFolderExists(folder: string): Promise<void>;
}
