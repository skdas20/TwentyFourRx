import { Controller, Get, Param, Query } from '@nestjs/common';
import { MedicinesService } from './medicines.service';
import { Public } from '../common/decorators/public.decorator';

@Controller('medicines')
export class MedicinesController {
  constructor(private medicinesService: MedicinesService) {}

  @Public()
  @Get()
  async getMedicines(
    @Query('search') search?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.medicinesService.getMedicines(
      search,
      parseInt(skip || '0'),
      parseInt(take || '20'),
    );
  }

  @Public()
  @Get(':id')
  async getMedicineById(@Param('id') id: string) {
    return this.medicinesService.getMedicineById(id);
  }
}
