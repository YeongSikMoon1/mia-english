import { Body, Controller, Get, Headers, Param, Post } from '@nestjs/common';
import { CreateSessionDto, TurnDto } from './dto';
import { SessionsService } from './sessions.service';

/** 인증 전 단계의 간이 사용자 식별: 앱이 만든 익명 ID를 x-user-id 헤더로 보낸다. (운영에서는 JWT 가드로 교체) */
@Controller()
export class SessionsController {
  constructor(private readonly svc: SessionsService) {}

  @Post('sessions') create(@Headers('x-user-id') uid = 'anon', @Body() b: CreateSessionDto) { return this.svc.create(uid, b.level, b.events ?? true); }
  @Post('sessions/:id/turns') turn(@Param('id') id: string, @Body() b: TurnDto) { return this.svc.turn(id, b.text); }
  @Post('sessions/:id/finish') finish(@Param('id') id: string) { return this.svc.finish(id); }
  @Get('sessions/:id') get(@Param('id') id: string) { return this.svc.get(id); }
  @Get('me/sessions') list(@Headers('x-user-id') uid = 'anon') { return this.svc.list(uid); }
}
