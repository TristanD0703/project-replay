import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
    // up migration code goes here...
    // note: up migrations are mandatory. you must implement this function.
    // For more info, see: https://kysely.dev/docs/migrations

    await db.schema
        .createTable('recording_metadata')
        .addColumn('id', 'uuid', (col) => col.primaryKey())
        .addColumn('status', 'text', (col) => col.notNull().defaultTo('QUEUED'))
        .addColumn('replay_code', 'text', (col) => col.notNull())
        .addColumn('is_public', 'boolean', (col) =>
            col.notNull().defaultTo(false),
        )
        .addColumn('name', 'text')
        .addColumn('created_by_id', 'uuid', (col) =>
            col.notNull().references('user.id'),
        )
        .addColumn('updated_at', 'timestamp', (col) =>
            col.notNull().defaultTo(sql`now()`),
        )
        .addColumn('created_at', 'timestamp', (col) =>
            col.notNull().defaultTo(sql`now()`),
        )
        .execute();

    await db.schema
        .createTable('video')
        .addColumn('id', 'uuid', (col) =>
            col
                .primaryKey()
                .references('recording_metadata.id')
                .onDelete('cascade'),
        )
        .addColumn('thumbnail_link', 'text', (col) => col.notNull())
        .addColumn('s3_path', 'text', (col) => col.notNull())
        .addColumn('recorded_by', 'uuid', (col) =>
            col.notNull().references('user.id'),
        )
        .addColumn('created_at', 'timestamp', (col) =>
            col.notNull().defaultTo(sql`now()`),
        )
        .addColumn('updated_at', 'timestamp', (col) =>
            col.notNull().defaultTo(sql`now()`),
        )
        .execute();

    await db.schema
        .createIndex('metadata_id_index')
        .on('recording_metadata')
        .column('id')
        .execute();

    await db.schema
        .createIndex('metadata_created_by_index')
        .on('recording_metadata')
        .column('created_by_id')
        .execute();

    await db.schema
        .createIndex('video_id_index')
        .on('video')
        .column('id')
        .execute();
}

// `any` is required here since migrations should be frozen in time. alternatively, keep a "snapshot" db interface.
export async function down(db: Kysely<any>): Promise<void> {
    // down migration code goes here...
    // note: down migrations are optional. you can safely delete this function.
    // For more info, see: https://kysely.dev/docs/migrations
    await db.schema.dropTable('video').execute();
    await db.schema.dropTable('recording_metadata').execute();
}
