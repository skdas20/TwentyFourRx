import { Controller, Get, Patch, Param, Query, Body } from '@nestjs/common';
import { UsersService } from './users.service';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('admin/users')
@Roles('ADMIN')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  async findAll(@Query('status') status?: string, @Query('roleCode') roleCode?: string) {
    return this.usersService.findAll({ status: status as any, roleCode });
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id/approve')
  async approve(@Param('id') id: string, @Body('reviewerNote') reviewerNote?: string) {
    return this.usersService.approveUser(id, reviewerNote);
  }

  @Patch(':id/reject')
  async reject(@Param('id') id: string, @Body('reviewerNote') reviewerNote?: string) {
    return this.usersService.rejectUser(id, reviewerNote);
  }

  @Patch(':id/block')
  async block(@Param('id') id: string) {
    return this.usersService.blockUser(id);
  }

  @Patch(':id/unblock')
  async unblock(@Param('id') id: string) {
    return this.usersService.unblockUser(id);
  }
}
