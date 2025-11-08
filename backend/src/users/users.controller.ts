import { Controller, Get, Patch, Param, Body, UseGuards, Query } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  async getUsers(@Query('status') status?: string, @Query('roleCode') roleCode?: string) {
    return this.usersService.getUsers({ status, roleCode });
  }

  @Get(':id')
  async getUser(@Param('id') id: string) {
    return this.usersService.getUser(id);
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

  // New endpoints for document management
  @Get(':id/documents')
  async getUserDocuments(@Param('id') id: string) {
    return this.usersService.getUserDocuments(id);
  }

  @Patch(':userId/documents/:documentId/approve')
  async approveDocument(
    @Param('userId') userId: string,
    @Param('documentId') documentId: string,
    @Body('reviewerNote') reviewerNote?: string,
  ) {
    return this.usersService.approveDocument(documentId, reviewerNote);
  }

  @Patch(':userId/documents/:documentId/reject')
  async rejectDocument(
    @Param('userId') userId: string,
    @Param('documentId') documentId: string,
    @Body('reviewerNote') reviewerNote: string,
  ) {
    return this.usersService.rejectDocument(documentId, reviewerNote);
  }
}
