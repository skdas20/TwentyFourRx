import { IsNotEmpty, IsString } from 'class-validator';

export class RespondToTicketDto {
  @IsString()
  @IsNotEmpty()
  adminResponse: string;
}
