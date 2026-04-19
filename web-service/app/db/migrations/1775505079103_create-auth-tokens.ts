import type { Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable('tokens')
    .addColumn('user_id', 'uuid', (col) =>
      col.primaryKey().references('user.id').onDelete('cascade'),
    )
    .addColumn('access_token', 'text', (col) => col.notNull())
    .addColumn('refresh_token', 'text', (col) => col.notNull())
    .addColumn('salt', 'text', (col) => col.notNull())
    .addColumn('expires', 'timestamptz', (col) => col.notNull())
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('tokens').execute();
}
