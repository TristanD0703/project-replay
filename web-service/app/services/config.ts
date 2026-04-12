export default class ConfigService {
    private static config?: any;

    private static loadConfig() {
        process.loadEnvFile();
        ConfigService.config = {};

        ConfigService.config.SESSION_SECRET = process.env.SESSION_SECRET;
        if (!ConfigService.config.SESSION_SECRET)
            throw new Error('SESSION_SECRET not provided in env');

        ConfigService.config.DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
        if (!ConfigService.config.DISCORD_CLIENT_ID)
            throw new Error('DISCORD_CLIENT_ID not in env');

        ConfigService.config.DISCORD_CLIENT_SECRET =
            process.env.DISCORD_CLIENT_SECRET;
        if (!ConfigService.config.DISCORD_CLIENT_SECRET)
            throw new Error('DISCORD_CLIENT_SECRET not in env');

        ConfigService.config.DATABASE_CONNECTION_STRING =
            process.env.DATABASE_CONNECTION_STRING;
        if (!ConfigService.config.DATABASE_CONNECTION_STRING)
            throw new Error('DATABASE_CONNECTION_STRING not in env');
    }

    public static getValue(key: string) {
        if (!ConfigService.config) ConfigService.loadConfig();

        if (!ConfigService.config[key])
            throw new Error('Config does not contain value: ' + key);
        return ConfigService.config[key];
    }
}
