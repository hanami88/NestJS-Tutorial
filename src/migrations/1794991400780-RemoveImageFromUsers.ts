import { MigrationInterface, QueryRunner } from "typeorm";

export class RemoveImageFromUsers1794991400780 implements MigrationInterface {
    name = 'RemoveImageFromUsers1794991400780'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`image\``);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`users\` ADD \`image\` varchar(255) NOT NULL DEFAULT ''`);
    }

}
