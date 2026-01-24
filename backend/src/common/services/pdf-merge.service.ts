import { Injectable, Logger } from '@nestjs/common';
import { PDFDocument } from 'pdf-lib';
import sharp from 'sharp';

@Injectable()
export class PdfMergeService {
  private readonly logger = new Logger(PdfMergeService.name);

  /**
   * Merge multiple images into a single PDF
   * @param files Array of image files (jpg, jpeg, png)
   * @returns PDF buffer
   */
  async mergeImagesToPdf(files: Express.Multer.File[]): Promise<Buffer> {
    try {
      const pdfDoc = await PDFDocument.create();

      for (const file of files) {
        // Convert image to JPEG if needed and get buffer
        const imageBuffer = await this.convertToJpeg(file.buffer, file.mimetype);
        
        // Embed image in PDF
        let image;
        if (file.mimetype === 'image/png' || file.originalname.toLowerCase().endsWith('.png')) {
          image = await pdfDoc.embedPng(imageBuffer);
        } else {
          image = await pdfDoc.embedJpg(imageBuffer);
        }

        // Create page with image dimensions
        const page = pdfDoc.addPage([image.width, image.height]);
        
        // Draw image on page
        page.drawImage(image, {
          x: 0,
          y: 0,
          width: image.width,
          height: image.height,
        });
      }

      // Save PDF
      const pdfBytes = await pdfDoc.save();
      return Buffer.from(pdfBytes);
    } catch (error) {
      this.logger.error('Failed to merge images to PDF:', error);
      throw new Error('Failed to merge images to PDF');
    }
  }

  /**
   * Convert image to JPEG format if needed
   */
  private async convertToJpeg(buffer: Buffer, mimetype: string): Promise<Buffer> {
    // If already JPEG, return as is
    if (mimetype === 'image/jpeg' || mimetype === 'image/jpg') {
      return buffer;
    }

    // Convert to JPEG
    return await sharp(buffer)
      .jpeg({ quality: 90 })
      .toBuffer();
  }

  /**
   * Check if file is an image
   */
  isImage(mimetype: string): boolean {
    return ['image/jpeg', 'image/jpg', 'image/png'].includes(mimetype);
  }

  /**
   * Check if file is a PDF
   */
  isPdf(mimetype: string): boolean {
    return mimetype === 'application/pdf';
  }
}
