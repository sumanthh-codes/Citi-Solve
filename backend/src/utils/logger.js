// Minimal leveled logger.
//
// Why this exists: raw console.* calls scattered across controllers leak debug
// output (and sometimes PII) into persistent serverless logs, with no way to
// dial verbosity down in production. This wrapper adds levels and a single
// threshold so debug/info are suppressed in prod, and gives us one place to
// swap in pino/winston or an external log service later without touching any
// call site.
//
// Level is chosen from LOG_LEVEL, else 'info' in production and 'debug' otherwise.

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };

const configuredLevel =
  process.env.LOG_LEVEL ||
  (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

const threshold = LEVELS[configuredLevel] ?? LEVELS.info;

const emit = (level, consoleFn, args) => {
  if (LEVELS[level] < threshold) return;
  consoleFn(`[${level.toUpperCase()}]`, ...args);
};

export const logger = {
  debug: (...args) => emit('debug', console.debug, args),
  info: (...args) => emit('info', console.info, args),
  warn: (...args) => emit('warn', console.warn, args),
  error: (...args) => emit('error', console.error, args),
};

export default logger;
