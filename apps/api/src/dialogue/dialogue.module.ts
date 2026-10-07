import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DIALOGUE_PROVIDER } from './dialogue.provider';
import { RuleProvider } from './rule.provider';
import { ClaudeProvider } from './claude.provider';

@Module({
  providers: [
    RuleProvider,
    ClaudeProvider,
    {
      provide: DIALOGUE_PROVIDER,
      inject: [ConfigService, RuleProvider, ClaudeProvider],
      // ANTHROPIC_API_KEY가 있으면 하이브리드, 없으면 규칙 기반만
      useFactory: (cfg: ConfigService, rule: RuleProvider, claude: ClaudeProvider) => (cfg.get('ANTHROPIC_API_KEY') ? claude : rule),
    },
  ],
  exports: [DIALOGUE_PROVIDER],
})
export class DialogueModule {}
