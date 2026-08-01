// Logger multi-niveaux — Boutikplus
// En développement : affiche tout (DEBUG inclus).
// En production (release build React Native), console.* sont STRIPPÉES par Metro
// sauf `console.error`. On re-exporte donc une API stable pour un futur envoi
// distant (Sentry/LogRocket/Bugsnag) sans changer les call sites.
//
// Règle de publication :
//  → logger.info  : événements métier (commande, paiement validé, etc.)
//  → logger.warn  : état inattendu non bloquant (perte réseau, cache vide…)
//  → logger.error : erreurs bloquantes ou exceptions rattrapées

type LogCtx = Record<string, unknown>;

function print(
  level: 'debug' | 'info' | 'warn' | 'error',
  prefix: string,
  message: string,
  ctx?: LogCtx,
) {
  // Pour une release build, Metro élimine DEBUG. Sinon on garde tout mais
  // on normalise la forme pour faciliter le filtrage.
  const fn = console[level] ?? console.log;
  const line = `[${prefix}] ${message}`;
  if (ctx) fn(line, ctx);
  else fn(line);
}

export const logger = {
  debug(msg: string, ctx?: LogCtx) {
    if (__DEV__) print('debug', 'DBG', msg, ctx);
  },
  info(msg: string, ctx?: LogCtx) {
    print('info', 'INF', msg, ctx);
  },
  warn(msg: string, ctx?: LogCtx) {
    print('warn', 'WRN', msg, ctx);
  },
  error(msg: string, error?: unknown, ctx?: LogCtx) {
    let combined: LogCtx | undefined = ctx;
    if (error instanceof Error) {
      combined = { ...(ctx ?? {}), errorName: error.name, errorMessage: error.message };
    } else if (error) {
      combined = { ...(ctx ?? {}), rawError: String(error) };
    }
    print('error', 'ERR', msg, combined);
  },
};

/** Compatibilité : remplace `console.error('fn:', error.message)` existants */
export function logServiceError(service: string, error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? 'unknown');
  logger.error(`${service}: ${message}`, error);
}
