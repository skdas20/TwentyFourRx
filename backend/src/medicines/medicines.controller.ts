import { Controller, Get, Put, Delete, Param, Query, Body, UseGuards } from '@nestjs/common';
import { MedicinesService } from './medicines.service';
import { Public } from '../common/decorators/public.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

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

  // ADMIN: Get all medicines from Medicine table (for management)
  @Get('admin/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async getAllMedicinesForAdmin() {
    return this.medicinesService.getAllMedicinesForAdmin();
  }

  // ADMIN: Update medicine
  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async updateMedicine(
    @Param('id') id: string,
    @Body() data: {
      name?: string;
      form?: string;
      strength?: string;
      imageUrl?: string;
      isActive?: boolean;
    },
  ) {
    return this.medicinesService.updateMedicine(id, data);
  }

  // ADMIN: Delete medicine
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async deleteMedicine(@Param('id') id: string) {
    return this.medicinesService.deleteMedicine(id);
  }

  @Public()
  @Get(':id')
  async getMedicineById(@Param('id') id: string) {
    return this.medicinesService.getMedicineById(id);
  }
}
