import { Controller, Get, Post, Body, Req, Query } from '@nestjs/common';
import { AgentService } from './agent.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import {
  ChatDto,
  ConfirmListingEditDto,
  ConfirmStatusChangeDto,
  ConfirmImagesChangeDto,
  ConfirmListingCreateDto,
} from './agent.dto';

@Roles(Role.owner)
@Controller('agent')
export class AgentController {
  constructor(private readonly agentService: AgentService) {}

  @Get('status')
  status(@Req() req: any) {
    return this.agentService.status(req.user.id);
  }

  @Get('history')
  history(@Req() req: any, @Query('before') before?: string, @Query('limit') limit?: string) {
    return this.agentService.history(req.user.id, {
      before,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Post('subscribe')
  subscribe(@Req() req: any) {
    return this.agentService.subscribe(req.user.id);
  }

  @Get('payments-history')
  paymentsHistory(@Req() req: any) {
    return this.agentService.listPayments(req.user.id);
  }

  @Post('cancel-subscription')
  cancelSubscription(@Req() req: any) {
    return this.agentService.cancelSubscription(req.user.id);
  }

  @Post('chat')
  chat(@Req() req: any, @Body() dto: ChatDto) {
    return this.agentService.chat(req.user.id, dto);
  }

  @Post('confirm-listing-edit')
  confirmListingEdit(@Req() req: any, @Body() dto: ConfirmListingEditDto) {
    return this.agentService.confirmListingEdit(req.user.id, dto);
  }

  @Post('confirm-listing-create')
  confirmListingCreate(@Req() req: any, @Body() dto: ConfirmListingCreateDto) {
    return this.agentService.confirmListingCreate(req.user.id, dto);
  }

  @Post('confirm-status-change')
  confirmStatusChange(@Req() req: any, @Body() dto: ConfirmStatusChangeDto) {
    return this.agentService.confirmStatusChange(req.user.id, dto);
  }

  @Post('confirm-images-change')
  confirmImagesChange(@Req() req: any, @Body() dto: ConfirmImagesChangeDto) {
    return this.agentService.confirmImagesChange(req.user.id, dto);
  }

  @Post('cancel-proposal')
  cancelProposal(@Req() req: any) {
    return this.agentService.cancelProposal(req.user.id);
  }

  @Post('reset-conversation')
  resetConversation(@Req() req: any) {
    return this.agentService.resetConversation(req.user.id);
  }
}
