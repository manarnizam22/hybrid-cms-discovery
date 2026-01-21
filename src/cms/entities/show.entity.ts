import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Episode } from './episode.entity';
import { ObjectType, Field, ID, InputType } from '@nestjs/graphql';
import { IsString, IsOptional, IsBoolean, MaxLength, MinLength } from 'class-validator';

@ObjectType()
@Entity('shows')
export class Show {
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
  @Column({ type: 'varchar', length: 100 })
  category: string;

  @Field()
  @Column({ type: 'varchar', length: 50 })
  language: string;

  @Field({ nullable: true })
  @Column({ type: 'varchar', length: 500, nullable: true })
  thumbnailUrl: string;

  @Field({ nullable: true })
  @Column({ type: 'varchar', length: 500, nullable: true })
  coverImageUrl: string;

  @Field()
  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Field(() => [Episode], { nullable: true })
  @OneToMany(() => Episode, (episode) => episode.show)
  episodes: Episode[];

  @Field()
  @CreateDateColumn()
  createdAt: Date;

  @Field()
  @UpdateDateColumn()
  updatedAt: Date;
}

@InputType()
export class CreateShowInput {
  @Field()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  @Field()
  @IsString()
  @MaxLength(100)
  category: string;

  @Field()
  @IsString()
  @MaxLength(50)
  language: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  thumbnailUrl?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  coverImageUrl?: string;
}

@InputType()
export class UpdateShowInput {
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

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  language?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  thumbnailUrl?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  coverImageUrl?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}