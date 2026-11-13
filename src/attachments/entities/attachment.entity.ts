import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('attachments')
@Index(['attachable_type', 'attachable_id'])
export class AttachmentEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  attachable_type: string;

  @Column()
  attachable_id: number;

  @Column()
  url: string;

  @Column()
  file_name: string;

  @Column()
  file_type: string;

  @Column({ type: 'int' })
  file_size: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
