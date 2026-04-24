export type RedisConnectionOptions = {
  host: string;
  port: number;
  username?: string;
  password?: string;
  tls?: Record<string, never>;
};

export function getRedisOptions(config: {
  url?: string;
  host?: string;
  port?: string | number;
}): RedisConnectionOptions {
  if (config.url) {
    const redisUrl = new URL(config.url);

    return {
      host: redisUrl.hostname,
      port: Number(redisUrl.port || 6379),
      username: redisUrl.username
        ? decodeURIComponent(redisUrl.username)
        : undefined,
      password: redisUrl.password
        ? decodeURIComponent(redisUrl.password)
        : undefined,
      tls: redisUrl.protocol === 'rediss:' ? {} : undefined,
    };
  }

  return {
    host: config.host || 'localhost',
    port: Number(config.port || 6379),
  };
}
