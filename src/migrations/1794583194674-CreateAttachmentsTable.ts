import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAttachmentsTable1794583194674 implements MigrationInterface {
  name = 'CreateAttachmentsTable1794583194674';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`attachments\` (\`id\` varchar(36) NOT NULL, \`attachable_type\` varchar(255) NOT NULL, \`attachable_id\` int NOT NULL, \`url\` varchar(255) NOT NULL, \`file_name\` varchar(255) NOT NULL, \`file_type\` varchar(255) NOT NULL, \`file_size\` int NOT NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), INDEX \`IDX_418b716a9043b7a66cfa8d22db\` (\`attachable_type\`, \`attachable_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX \`IDX_418b716a9043b7a66cfa8d22db\` ON \`attachments\``,
    );
    await queryRunner.query(`DROP TABLE \`attachments\``);
  }
}
