import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DialogueModule } from './dialogue/dialogue.module';
import { SessionsModule } from './sessions/sessions.module';
import { SpeechModule } from './speech/speech.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), DialogueModule, SessionsModule, SpeechModule],
})
export class AppModule {}
