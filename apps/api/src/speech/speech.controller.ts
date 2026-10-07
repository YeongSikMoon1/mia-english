import { Controller, Post, UploadedFile, UseInterceptors, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SpeechService } from './speech.service';

@Controller('speech')
export class SpeechController {
  constructor(private readonly speech: SpeechService) {}

  @Post('stt')
  @UseInterceptors(FileInterceptor('audio', { limits: { fileSize: 10 * 1024 * 1024 } }))
  async stt(@UploadedFile() audio: Express.Multer.File) {
    if (!audio) throw new BadRequestException('audio 파일이 필요해요');
    return { text: await this.speech.transcribe(audio) };
  }
}
