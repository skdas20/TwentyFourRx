
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class ApprovedUserGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return false;
    }

    if (user.roleCode === 'ADMIN') {
      return true;
    }

    if (user.status !== 'APPROVED') {
      throw new ForbiddenException(
        'Account verification required. Please complete your profile by uploading necessary documents to unlock this feature.'
      );
    }

    return true;
  }
}
