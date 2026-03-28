import { PostgresDialect } from 'kysely';
import { defineConfig } from 'kysely-ctl';
import { Pool } from 'pg';

const dialect = new PostgresDialect({
    pool: new Pool({
        host: '127.0.0.1',
        database: 'project_rewind',
        user: 'postgres',
        password: 'postgres',
        port: 5432,
        max: 10,
    }),
});

export default defineConfig({
    // replace me with a real dialect instance OR a dialect name + `dialectConfig` prop.
    dialect,
    migrations: {
        migrationFolder: '../app/db/migrations',
    },
    //   plugins: [],
    //   seeds: {
    //     seedFolder: "seeds",
    //   }
});
