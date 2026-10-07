import { Module } from '@nestjs/common';
import { DialogueModule } from '../dialogue/dialogue.module';
import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';
import { MemorySessionStore, SessionStore } from './session.store';

@Module({
  imports: [DialogueModule],
  controllers: [SessionsController],
  providers: [SessionsService, { provide: SessionStore, useClass: MemorySessionStore }],
})
export class SessionsModule {}
