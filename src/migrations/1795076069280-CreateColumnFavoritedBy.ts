import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateColumnFavoritedBy1795076069280 implements MigrationInterface {
    name = 'CreateColumnFavoritedBy1795076069280'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`article_favorites\` (\`article_id\` int NOT NULL, \`user_id\` int NOT NULL, INDEX \`IDX_19fa0bc90b91678cc4d30e3737\` (\`article_id\`), INDEX \`IDX_8d1bc602f86930d0b609972221\` (\`user_id\`), PRIMARY KEY (\`article_id\`, \`user_id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`article_favorites\` ADD CONSTRAINT \`FK_19fa0bc90b91678cc4d30e37375\` FOREIGN KEY (\`article_id\`) REFERENCES \`articles\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE \`article_favorites\` ADD CONSTRAINT \`FK_8d1bc602f86930d0b609972221a\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`article_favorites\` DROP FOREIGN KEY \`FK_8d1bc602f86930d0b609972221a\``);
        await queryRunner.query(`ALTER TABLE \`article_favorites\` DROP FOREIGN KEY \`FK_19fa0bc90b91678cc4d30e37375\``);
        await queryRunner.query(`DROP INDEX \`IDX_8d1bc602f86930d0b609972221\` ON \`article_favorites\``);
        await queryRunner.query(`DROP INDEX \`IDX_19fa0bc90b91678cc4d30e3737\` ON \`article_favorites\``);
        await queryRunner.query(`DROP TABLE \`article_favorites\``);
    }

}
