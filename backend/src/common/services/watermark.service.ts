import { Injectable } from "@nestjs/common";
import * as sharp from "sharp";

@Injectable()
export class WatermarkService {
  /**
   * Add a 24RX watermark to an image
   * @param imageBuffer - The original image buffer
   * @returns Watermarked image buffer
   */
  async addWatermark(imageBuffer: Buffer): Promise<Buffer> {
    try {
      // Get image metadata
      const image = sharp(imageBuffer);
      const metadata = await image.metadata();
      const width = metadata.width || 800;
      const height = metadata.height || 600;

      // Calculate watermark size (10% of image width, max 200px)
      const watermarkWidth = Math.min(Math.floor(width * 0.10), 200);
      const watermarkHeight = Math.floor(watermarkWidth * 0.4); // Aspect ratio for text

      // Create watermark as SVG text
      const watermarkSvg = `
        <svg width="${watermarkWidth}" height="${watermarkHeight}">
          <defs>
            <style>
              @import url("https://fonts.googleapis.com/css2?family=Inter:wght@700&display=swap");
            </style>
          </defs>
          <text 
            x="50%" 
            y="50%" 
            font-family="Inter, Arial, sans-serif" 
            font-size="${Math.floor(watermarkHeight * 0.6)}px" 
            font-weight="700" 
            fill="#3B82F6" 
            fill-opacity="0.7" 
            text-anchor="middle" 
            dominant-baseline="middle"
          >
            24Rx
          </text>
        </svg>
      `;

      // Convert SVG to PNG buffer
      const watermarkBuffer = Buffer.from(watermarkSvg);

      // Position watermark at bottom-right corner with 20px padding
      const watermarkX = width - watermarkWidth - 20;
      const watermarkY = height - watermarkHeight - 20;

      // Composite the watermark onto the original image
      const watermarkedImage = await image
        .composite([
          {
            input: watermarkBuffer,
            top: watermarkY,
            left: watermarkX,
          },
        ])
        .toBuffer();

      console.log("✅ Watermark added successfully", {
        originalSize: `${width}x${height}`,
        watermarkSize: `${watermarkWidth}x${watermarkHeight}`,
        position: `(${watermarkX}, ${watermarkY})`,
      });

      return watermarkedImage;
    } catch (error) {
      console.error("❌ Failed to add watermark:", error);
      // Return original image if watermarking fails
      return imageBuffer;
    }
  }
}
