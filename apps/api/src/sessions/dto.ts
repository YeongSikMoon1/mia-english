import { IsBoolean, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateSessionDto {
  @IsIn([0, 1, 2]) level: 0 | 1 | 2 = 1;          // 0 쉬움 · 1 보통 · 2 어려움
  @IsOptional() @IsBoolean() events?: boolean = true;  // 돌발상황 ON/OFF
}
export class TurnDto {
  @IsString() @MaxLength(400) text: string;
}
