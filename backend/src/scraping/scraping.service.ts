import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../config/prisma.service';
import axios from 'axios';

@Injectable()
export class ScrapingService {
  private readonly logger = new Logger(ScrapingService.name);
  private readonly client = axios.create({
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json',
    },
    timeout: 15000,
  });

  constructor(private prisma: PrismaService) {}

  // Weekly scraping - Every Sunday at 3 AM
  @Cron('0 3 * * 0')
  async weeklyMedicineSync() {
    this.logger.log('🚀 Starting weekly medicine reference sync...');
    
    try {
      const startTime = Date.now();
      let totalScraped = 0;

      // Scrape from 1mg using common prefixes
      totalScraped = await this.scrapeFromOneMg();

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      this.logger.log(
        `✅ Weekly sync completed: ${totalScraped} medicines scraped in ${duration}s`
      );
    } catch (error) {
      this.logger.error(`❌ Weekly sync failed: ${error.message}`, error.stack);
    }
  }

  // Manual trigger for initial or on-demand sync
  async manualSync() {
    this.logger.log('🔧 Manual medicine sync triggered...');
    return this.scrapeFromOneMg();
  }

  private async scrapeFromOneMg(): Promise<number> {
    // Common medicine prefixes and popular search terms
    const searchTerms = [
      // Alphabetic prefixes
      'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j',
      'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't',
      'u', 'v', 'w', 'x', 'y', 'z',
      
      // Popular medicine names/salts
      'paracetamol', 'ibuprofen', 'aspirin', 'amoxicillin', 
      'azithromycin', 'ciprofloxacin', 'metformin', 'atorvastatin',
      'omeprazole', 'pantoprazole', 'ranitidine', 'cetirizine',
      'dolo', 'crocin', 'combiflam', 'disprin', 'augmentin',
      'calpol', 'sinarest', 'vicks', 'betadine', 'metrogyl',
    ];

    let totalScraped = 0;
    const batchSize = 5; // Process 5 at a time to avoid overwhelming

    for (let i = 0; i < searchTerms.length; i += batchSize) {
      const batch = searchTerms.slice(i, i + batchSize);
      
      await Promise.all(
        batch.map(async (term) => {
          try {
            const count = await this.scrapeTerm(term);
            totalScraped += count;
            this.logger.log(`✓ Scraped "${term}": ${count} medicines`);
          } catch (error) {
            this.logger.warn(`⚠ Failed to scrape "${term}": ${error.message}`);
          }
        })
      );

      // Respectful delay between batches
      if (i + batchSize < searchTerms.length) {
        await this.delay(2000);
      }
    }

    return totalScraped;
  }

  private async scrapeTerm(term: string): Promise<number> {
    try {
      const response = await this.client.get(
        'https://www.1mg.com/pharmacy_api_gateway/v4/drug_skus/by_prefix',
        {
          params: { prefix_term: term },
        }
      );

      const medicines = response.data?.data || [];
      let scraped = 0;

      for (const med of medicines) {
        try {
          await this.upsertMedicineReference(med);
          scraped++;
        } catch (error) {
          // Skip if duplicate or error
          if (!error.message.includes('Unique constraint')) {
            this.logger.warn(`Failed to upsert ${med.name}: ${error.message}`);
          }
        }
      }

      return scraped;
    } catch (error) {
      if (error.response?.status === 429) {
        this.logger.warn('Rate limited, waiting 5s...');
        await this.delay(5000);
      }
      throw error;
    }
  }

  private async upsertMedicineReference(medData: any) {
    // Extract and clean data
    const name = medData.name || medData.drug_name || 'Unknown';
    const form = medData.form || medData.drug_form || 'Tablet';
    const strength = medData.strength || medData.dose_form || '';
    const manufacturer = medData.manufacturer_name || medData.manufacturer || 'Unknown';
    const composition = 
      medData.salt_composition || 
      medData.composition || 
      medData.generic_name || 
      name;

    // Skip if essential data is missing
    if (!name || name === 'Unknown') return;

    const uniqueKey = {
      name,
      form,
      strength,
      manufacturer,
    };

    await this.prisma.medicineReference.upsert({
      where: {
        uq_medicine_ref: uniqueKey,
      },
      create: {
        name,
        genericName: medData.generic_name || null,
        composition,
        form,
        strength,
        manufacturer,
        marketer: medData.marketer_name || medData.marketer || null,
        packSize: medData.pack_size_label || medData.pack_size || null,
        source: '1mg',
        sourceId: medData.id?.toString() || medData.sku_id?.toString() || null,
        lastScrapedAt: new Date(),
        isActive: true,
      },
      update: {
        genericName: medData.generic_name || null,
        composition,
        marketer: medData.marketer_name || medData.marketer || null,
        packSize: medData.pack_size_label || medData.pack_size || null,
        lastScrapedAt: new Date(),
      },
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Get statistics
  async getStats() {
    const total = await this.prisma.medicineReference.count();
    const bySource = await this.prisma.medicineReference.groupBy({
      by: ['source'],
      _count: true,
    });
    const lastScraped = await this.prisma.medicineReference.findFirst({
      orderBy: { lastScrapedAt: 'desc' },
      select: { lastScrapedAt: true },
    });

    return {
      total,
      bySource,
      lastScraped: lastScraped?.lastScrapedAt,
    };
  }
}
