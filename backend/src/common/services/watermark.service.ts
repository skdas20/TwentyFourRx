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

      // Create repeating transparent watermark pattern across entire image
      // Calculate size based on image dimensions (watermark should be ~20% of image width)
      const watermarkSize = Math.floor(width * 0.2);
      const fontSize = Math.floor(watermarkSize * 0.18); // Adjusted for longer text

      // Calculate how many watermarks to tile (with spacing)
      const spacing = watermarkSize * 1.8;
      const cols = Math.ceil(width / spacing) + 1;
      const rows = Math.ceil(height / spacing) + 1;

      // Create transparent watermark pattern SVG with full brand name
      const watermarkSvg = `
        <svg width="${width}" height="${height}">
          <defs>
            <pattern id="watermark" x="0" y="0" width="${spacing}" height="${spacing}" patternUnits="userSpaceOnUse">
              <text
                x="${spacing / 2}"
                y="${spacing / 2}"
                font-family="DejaVu Sans, Liberation Sans, Arial, sans-serif"
                font-size="${fontSize}px"
                font-weight="700"
                fill="#3B82F6"
                fill-opacity="0.25"
                text-anchor="middle"
                dominant-baseline="middle"
                transform="rotate(-30 ${spacing / 2} ${spacing / 2})"
              >
                24Rx Exchange
              </text>
            </pattern>
          </defs>
          <rect width="${width}" height="${height}" fill="url(#watermark)" />
        </svg>
      `;

      // Convert SVG to PNG buffer
      const watermarkBuffer = Buffer.from(watermarkSvg);

      // Composite the watermark onto the original image
      const watermarkedImage = await image
        .composite([
          {
            input: watermarkBuffer,
            top: 0,
            left: 0,
          },
        ])
        .toBuffer();

      console.log("✅ Watermark added successfully", {
        originalSize: `${width}x${height}`,
        pattern: `${cols}x${rows} repeating watermarks`,
        opacity: "25%",
        text: "24Rx Exchange",
      });

      return watermarkedImage;
    } catch (error) {
      console.error("❌ Failed to add watermark:", error);
      // Return original image if watermarking fails
      return imageBuffer;
    }
  }
}
