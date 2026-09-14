import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Req,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ConversationsService } from './conversations.service';
import { ConversationsGateway } from './conversations.gateway';
import {
  CreateConversationDto,
  SendMessageDto,
  EditMessageDto,
  PresignChatUploadDto,
} from './dto/conversation.dto';
import type { Request } from 'express';

@Controller('conversations')
export class ConversationsController {
  constructor(
    private readonly conversationsService: ConversationsService,
    private readonly conversationsGateway: ConversationsGateway,
  ) {}

  @Post()
  async create(@Req() req: Request, @Body() dto: CreateConversationDto) {
    const userId = (req as any).user.id;
    return this.conversationsService.getOrCreate(userId, dto.propertyId);
  }

  @Get()
  async list(@Req() req: Request) {
    const userId = (req as any).user.id;
    return this.conversationsService.list(userId);
  }

  @Get(':id')
  async detail(@Req() req: Request, @Param('id') id: string) {
    const userId = (req as any).user.id;
    return this.conversationsService.detail(userId, id);
  }

  @Get(':id/messages')
  async messages(
    @Req() req: Request,
    @Param('id') id: string,
    @Query('before') before?: string,
    @Query('limit') limit?: string,
  ) {
    const userId = (req as any).user.id;
    return this.conversationsService.messages(userId, id, {
      before,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Post('upload')
  async presignUploadDirect(
    @Req() req: Request,
    @Body() dto: PresignChatUploadDto,
  ) {
    const userId = (req as any).user.id;
    return this.conversationsService.presignUpload(userId, dto);
  }
  @Post(':id/messages')
  @HttpCode(HttpStatus.CREATED)
  async send(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: SendMessageDto,
  ) {
    const userId = (req as any).user.id;
    const result = await this.conversationsService.send(userId, id, dto);

    this.conversationsGateway.emitToConversation(
      result.conversation.tenant_id,
      result.conversation.owner_id,
      'message:new',
      {
        conversationId: result.conversation.id,
        message: result.message,
        senderName: result.senderName,
      },
    );

    this.conversationsGateway.emitToUser(
      result.receiverId,
      'notification:new',
      { notification: result.notification },
    );

    return result.message;
  }

  @Patch(':id/messages/:mid')
  async edit(
    @Req() req: Request,
    @Param('id') id: string,
    @Param('mid') mid: string,
    @Body() dto: EditMessageDto,
  ) {
    const userId = (req as any).user.id;
    const result = await this.conversationsService.editMessage(
      userId,
      id,
      mid,
      dto,
    );

    this.conversationsGateway.emitToConversation(
      result.conversation.tenant_id,
      result.conversation.owner_id,
      'message:updated',
      { conversationId: id, message: result.message },
    );

    return result.message;
  }

  @Delete(':id/messages/:mid')
  @HttpCode(HttpStatus.OK)
  async remove(
    @Req() req: Request,
    @Param('id') id: string,
    @Param('mid') mid: string,
  ) {
    const userId = (req as any).user.id;
    const result = await this.conversationsService.deleteMessage(
      userId,
      id,
      mid,
    );

    this.conversationsGateway.emitToConversation(
      result.conversation.tenant_id,
      result.conversation.owner_id,
      'message:deleted',
      { conversationId: id, messageId: mid },
    );

    return { ok: true };
  }

  @Post(':id/read')
  @HttpCode(HttpStatus.OK)
  async read(@Req() req: Request, @Param('id') id: string) {
    const userId = (req as any).user.id;
    const result = await this.conversationsService.markRead(userId, id);

    const peer = await this.conversationsService.getPeer(userId, id);
    if (peer) {
      this.conversationsGateway.emitToUser(peer, 'read', {
        conversationId: id,
        readAt: result.readAt,
      });
    }

    return result;
  }
}
