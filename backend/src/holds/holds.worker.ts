import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { HoldsService } from './holds.service';
import { Logger } from '@nestjs/common';

@Processor('holds')
export class HoldsWorker {
  private readonly logger = new Logger(HoldsWorker.name);

  constructor(private holdsService: HoldsService) {}

  @Process('auto-deliver')
  async handleAutoDelivery(job: Job<{ holdId: string }>) {
    const { holdId } = job.data;
    
    this.logger.log(`Processing auto-delivery for hold: ${holdId}`);

    try {
      const result = await this.holdsService.convertHoldToOrder(holdId);
      this.logger.log(`Auto-delivery completed for hold: ${holdId}`);
      return result;
    } catch (error) {
      this.logger.error(`Auto-delivery failed for hold: ${holdId}`, error.stack);
      throw error;
    }
  }
}
