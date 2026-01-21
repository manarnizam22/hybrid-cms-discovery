import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Show } from './show.entity';
import { ObjectType, Field, ID, InputType, Int } from '@nestjs/graphql';
import { IsString, IsOptional, IsBoolean, IsInt, IsUUID, MaxLength, MinLength, Min } from 'class-validator';

@ObjectType()
@Entity('episodes')
export class Episode {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Field({ nullable: true })
  @Column({ type: 'text', nullable: true })
  description: string;

  @Field()
  @Column({ type: 'int' })
  episodeNumber: number;

  @Field()
  @Column({ type: 'int' })
  duration: number;

  @Field()
  @Column({ type: 'varchar', length: 500 })
  audioUrl: string;

  @Field({ nullable: true })
  @Column({ type: 'varchar', length: 500, nullable: true })
  thumbnailUrl: string;

  @Field()
  @Column({ type: 'boolean', default: true })
  isPublished: boolean;

  @Field(() => ID)
  @Column({ type: 'uuid' })
  showId: string;

  @Field(() => Show)
  @ManyToOne(() => Show, (show) => show.episodes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'showId' })
  show: Show;

  @Field()
  @CreateDateColumn()
  createdAt: Date;

  @Field()
  @UpdateDateColumn()
  updatedAt: Date;
}

@InputType()
export class CreateEpisodeInput {
  @Field()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  @Field(() => Int)
  @IsInt()
  @Min(1)
  episodeNumber: number;

  @Field(() => Int)
  @IsInt()
  @Min(1)
  duration: number;

  @Field()
  @IsString()
  @MaxLength(500)
  audioUrl: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  thumbnailUrl?: string;

  @Field()
  @IsUUID()
  showId: string;
}

@InputType()
export class UpdateEpisodeInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  episodeNumber?: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  duration?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  audioUrl?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  thumbnailUrl?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}