// Service de promotion de boutique — Boutikplus
// Gère les liens de partage traçables, codes de réduction, annonces/offres,
// le tracking d'événements (vues/clics/conversions) et les analytiques.
// Bascule automatiquement entre Supabase (si configuré) et les données de démo.

import { supabase, isSupabaseConfigured } from './supabase';
import {
  DEMO_SHARE_LINKS,
  DEMO_DISCOUNT_CODES,
  DEMO_CAMPAIGN_EVENTS,
  DEMO_PROMOTIONS,
} from '@/data/demoData';
import type {
  ShareLink,
  DiscountCode,
  CampaignEvent,
  CampaignAnalyticsSummary,
  CampaignComparison,
  CampaignEventType,
  DiscountValidationResult,
  DiscountCodeStatus,
  Promotion,
  PromotionType,
  PromotionStatus,
  ShareLinkSource,
  ShareLinkMedium,
} from '@/types/models';
import type { Database } from '@/types/database';

const useDemo = !isSupabaseConfigured;

const delay = (ms = 250) => new Promise((r) => setTimeout(r, ms));

// Caches en mémoire pour le mode démo (mutations locales)
let demoShareLinks: ShareLink[] = [...DEMO_SHARE_LINKS];
let demoDiscountCodes: DiscountCode[] = [...DEMO_DISCOUNT_CODES];
let demoCampaignEvents: CampaignEvent[] = [...DEMO_CAMPAIGN_EVENTS];
let demoPromotions: Promotion[] = [...DEMO_PROMOTIONS];

// Domaine publique pour les liens de partage (configurable via env à terme)
const PUBLIC_BASE_URL = 'https://boutikplus.app';

// ============================================================
// Helpers purs
// ============================================================

/** Construit l'URL publique d'un lien de partage avec les paramètres UTM */
export function buildShareUrl(
  slug: string,
  params?: {
    source?: ShareLinkSource;
    medium?: ShareLinkMedium;
    campaign?: string | null;
  },
): string {
  const base = `${PUBLIC_BASE_URL}/s/${slug}`;
  if (!params) return base;
  const qs = new URLSearchParams();
  if (params.source) qs.set('utm_source', params.source);
  if (params.medium) qs.set('utm_medium', params.medium);
  if (params.campaign) qs.set('utm_campaign', params.campaign);
  const query = qs.toString();
  return query ? `${base}?${query}` : base;
}

/**
 * Génère un slug court et lisible à partir du nom de la boutique.
 * Ex: "Faso Fashion 2026" -> "faso-fashion-2026"
 * Ajoute un suffixe aléatoire court pour garantir l'unicité.
 */
export function generateSlug(shopName: string): string {
  const base = shopName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // retire les accents
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 24);
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${base}-${suffix}`;
}

/**
 * Génère un code promo lisible à partir d'un préfixe et d'une valeur.
 * Ex: ("WAX", 20) -> "WAX20"
 */
export function generateCode(prefix: string, value?: number): string {
  const cleanPrefix = prefix
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 8);
  const valPart = value != null ? String(Math.round(value)) : '';
  // Suffixe court pour garantir l'unicité si le code existe déjà
  const suffix = Math.random().toString(36).slice(2, 4).toUpperCase();
  return `${cleanPrefix}${valPart}${suffix}`;
}

/** Calcule le statut effectif d'un code promo (actif/expiré/épuisé) selon la date et l'usage */
export function computeDiscountStatus(code: {
  expires_at: string;
  status: DiscountCodeStatus;
  max_uses: number;
  uses_count: number;
}): DiscountCodeStatus {
  if (code.status === 'paused') return 'paused';
  if (new Date(code.expires_at).getTime() < Date.now()) return 'expired';
  if (code.max_uses > 0 && code.uses_count >= code.max_uses) return 'exhausted';
  return 'active';
}

// ============================================================
// 1. Share links — CRUD
// ============================================================

export async function getShareLinks(shopId: string): Promise<ShareLink[]> {
  if (useDemo) {
    await delay(200);
    return demoShareLinks
      .filter((l) => l.shop_id === shopId)
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
  }
  const { data, error } = await supabase
    .from('share_links')
    .select('*')
    .eq('shop_id', shopId)
    .order('created_at', { ascending: false });
  if (error) console.error('getShareLinks:', error.message);
  return (data as ShareLink[]) ?? [];
}

/** Récupère un lien par son slug (utilisé côté public lors d'une visite /s/{slug}) */
export async function getShareLinkBySlug(
  slug: string,
): Promise<ShareLink | null> {
  if (useDemo) {
    await delay(150);
    return demoShareLinks.find((l) => l.slug === slug) ?? null;
  }
  const { data, error } = await supabase
    .from('share_links')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .single();
  if (error) console.error('getShareLinkBySlug:', error.message);
  return data as ShareLink | null;
}

export async function getShareLinkById(
  linkId: string,
): Promise<ShareLink | null> {
  if (useDemo) {
    await delay(150);
    return demoShareLinks.find((l) => l.id === linkId) ?? null;
  }
  const { data, error } = await supabase
    .from('share_links')
    .select('*')
    .eq('id', linkId)
    .single();
  if (error) console.error('getShareLinkById:', error.message);
  return data as ShareLink | null;
}

export interface CreateShareLinkParams {
  shopId: string;
  ownerId: string;
  label?: string | null;
  source?: ShareLinkSource;
  medium?: ShareLinkMedium;
  campaign?: string | null;
  shopName?: string; // pour générer un slug lisible
}

export async function createShareLink(
  params: CreateShareLinkParams,
): Promise<{ link: ShareLink | null; error: string | null }> {
  if (!params.shopId) return { link: null, error: 'Boutique requise' };
  if (!params.ownerId) return { link: null, error: 'Propriétaire requis' };

  // Génère un slug unique
  let slug = generateSlug(params.shopName ?? params.shopId);
  // Vérifie l'unicité (démo : cache mémoire ; Supabase : contrainte UNIQUE)
  if (useDemo) {
    await delay(300);
    while (demoShareLinks.some((l) => l.slug === slug)) {
      slug = generateSlug(params.shopName ?? params.shopId);
    }
    const source = params.source ?? 'direct';
    const medium = params.medium ?? 'link';
    const targetUrl = buildShareUrl(slug, {
      source,
      medium,
      campaign: params.campaign,
    });
    const newLink: ShareLink = {
      id: `sl-demo-${Date.now()}`,
      shop_id: params.shopId,
      owner_id: params.ownerId,
      slug,
      label: params.label ?? null,
      source,
      medium,
      campaign: params.campaign ?? null,
      target_url: targetUrl,
      is_active: true,
      created_at: new Date().toISOString(),
      views_count: 0,
      clicks_count: 0,
      conversions_count: 0,
      revenue_total: 0,
    };
    demoShareLinks = [newLink, ...demoShareLinks];
    return { link: newLink, error: null };
  }

  const source = params.source ?? 'direct';
  const medium = params.medium ?? 'link';
  const targetUrl = buildShareUrl(slug, {
    source,
    medium,
    campaign: params.campaign,
  });
  const { data, error } = await supabase
    .from('share_links')
    .insert({
      shop_id: params.shopId,
      owner_id: params.ownerId,
      slug,
      label: params.label ?? null,
      source,
      medium,
      campaign: params.campaign ?? null,
      target_url: targetUrl,
    })
    .select('*')
    .single();
  if (error) {
    // Conflit de slug : on retente une fois avec un nouveau slug
    if (error.code === '23505') {
      slug = generateSlug(params.shopName ?? params.shopId);
      const retryUrl = buildShareUrl(slug, {
        source,
        medium,
        campaign: params.campaign,
      });
      const { data: retryData, error: retryError } = await supabase
        .from('share_links')
        .insert({
          shop_id: params.shopId,
          owner_id: params.ownerId,
          slug,
          label: params.label ?? null,
          source,
          medium,
          campaign: params.campaign ?? null,
          target_url: retryUrl,
        })
        .select('*')
        .single();
      if (retryError)
        return { link: null, error: retryError.message };
      return { link: retryData as ShareLink, error: null };
    }
    return { link: null, error: error.message };
  }
  return { link: data as ShareLink, error: null };
}

export async function updateShareLink(
  linkId: string,
  updates: Partial<Pick<ShareLink, 'label' | 'is_active' | 'campaign'>>,
): Promise<{ error: string | null }> {
  if (useDemo) {
    await delay(200);
    demoShareLinks = demoShareLinks.map((l) =>
      l.id === linkId ? { ...l, ...updates } : l,
    );
    return { error: null };
  }
  const { error } = await supabase
    .from('share_links')
    .update(updates)
    .eq('id', linkId);
  return { error: error?.message ?? null };
}

export async function deleteShareLink(
  linkId: string,
): Promise<{ error: string | null }> {
  if (useDemo) {
    await delay(200);
    demoShareLinks = demoShareLinks.filter((l) => l.id !== linkId);
    return { error: null };
  }
  const { error } = await supabase.from('share_links').delete().eq('id', linkId);
  return { error: error?.message ?? null };
}

// ============================================================
// 2. Tracking d'événements (vues / clics / conversions)
// ============================================================

export interface TrackEventParams {
  shopId: string;
  shareLinkId?: string | null;
  promotionId?: string | null;
  discountCodeId?: string | null;
  eventType: CampaignEventType;
  buyerId?: string | null;
  amount?: number | null;
  orderId?: string | null;
  city?: string | null;
  source?: ShareLinkSource | null;
  medium?: ShareLinkMedium | null;
}

/**
 * Enregistre un événement de campagne (vue, clic ou conversion) et met à jour
 * les compteurs agrégés du lien de partage associé. Fire-and-forget : n'attend pas
 * la résolution côté UI pour ne pas ralentir l'expérience.
 */
export async function trackShareEvent(
  params: TrackEventParams,
): Promise<void> {
  if (useDemo) {
    // En démo, on pousse directement dans le cache et on met à jour les agrégats.
    const event: CampaignEvent = {
      id: `ce-demo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      shop_id: params.shopId,
      share_link_id: params.shareLinkId ?? null,
      promotion_id: params.promotionId ?? null,
      discount_code_id: params.discountCodeId ?? null,
      event_type: params.eventType,
      buyer_id: params.buyerId ?? null,
      amount: params.amount ?? null,
      order_id: params.orderId ?? null,
      city: params.city ?? null,
      source: params.source ?? null,
      medium: params.medium ?? null,
      created_at: new Date().toISOString(),
    };
    demoCampaignEvents = [event, ...demoCampaignEvents];
    // Met à jour les compteurs agrégés du lien
    if (params.shareLinkId) {
      demoShareLinks = demoShareLinks.map((l) => {
        if (l.id !== params.shareLinkId) return l;
        const updated = { ...l };
        if (params.eventType === 'view') updated.views_count += 1;
        if (params.eventType === 'click') updated.clicks_count += 1;
        if (params.eventType === 'conversion') {
          updated.conversions_count += 1;
          updated.revenue_total += params.amount ?? 0;
        }
        return updated;
      });
    }
    return;
  }

  // Supabase : INSERT dans campaign_events (policy public_insert autorise les vues/clics anonymes).
  // Les compteurs agrégés (views_count, clicks_count, conversions_count, revenue_total) sur
  // share_links sont mis à jour automatiquement par le trigger `campaign_events_update_counters`
  // défini dans triggers.sql — pas besoin de read-then-update côté client (qui créerait une
  // race condition).
  const { error } = await supabase.from('campaign_events').insert({
    shop_id: params.shopId,
    share_link_id: params.shareLinkId ?? null,
    promotion_id: params.promotionId ?? null,
    discount_code_id: params.discountCodeId ?? null,
    event_type: params.eventType,
    buyer_id: params.buyerId ?? null,
    amount: params.amount ?? null,
    order_id: params.orderId ?? null,
    city: params.city ?? null,
    source: params.source ?? null,
    medium: params.medium ?? null,
  });
  if (error) {
    console.error('trackShareEvent:', error.message);
  }
}

// ============================================================
// 3. Analytics
// ============================================================

/** Retourne les bornes temporelles pour une période donnée */
function getPeriodRange(period: 'day' | 'week' | 'month'): { since: Date } {
  const since = new Date();
  if (period === 'day') since.setDate(since.getDate() - 1);
  else if (period === 'week') since.setDate(since.getDate() - 7);
  else since.setMonth(since.getMonth() - 1);
  return { since };
}

/** Filtre les événements par période et (optionnellement) par lien */
function filterEvents(
  events: CampaignEvent[],
  since: Date,
  linkId?: string,
): CampaignEvent[] {
  const sinceMs = since.getTime();
  return events.filter(
    (e) =>
      new Date(e.created_at).getTime() >= sinceMs &&
      (!linkId || e.share_link_id === linkId),
  );
}

/** Construit la synthèse analytique à partir d'une liste d'événements */
function buildSummary(
  events: CampaignEvent[],
  days: number,
): CampaignAnalyticsSummary {
  const total_views = events.filter((e) => e.event_type === 'view').length;
  const total_clicks = events.filter((e) => e.event_type === 'click').length;
  const conversions = events.filter((e) => e.event_type === 'conversion');
  const total_conversions = conversions.length;
  const total_revenue = conversions.reduce(
    (sum, e) => sum + (e.amount ?? 0),
    0,
  );

  // Agrégat par medium
  const mediumMap = new Map<
    ShareLinkMedium,
    { views: number; clicks: number; conversions: number; revenue: number }
  >();
  for (const e of events) {
    if (!e.medium) continue;
    const cur = mediumMap.get(e.medium) ?? {
      views: 0,
      clicks: 0,
      conversions: 0,
      revenue: 0,
    };
    if (e.event_type === 'view') cur.views += 1;
    if (e.event_type === 'click') cur.clicks += 1;
    if (e.event_type === 'conversion') {
      cur.conversions += 1;
      cur.revenue += e.amount ?? 0;
    }
    mediumMap.set(e.medium, cur);
  }
  const by_medium = Array.from(mediumMap.entries()).map(([medium, v]) => ({
    medium,
    ...v,
  }));

  // Série temporelle (par jour sur la période)
  const timeseries: CampaignAnalyticsSummary['timeseries'] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const dayEvents = events.filter(
      (e) => e.created_at.split('T')[0] === dateStr,
    );
    timeseries.push({
      date: dateStr,
      views: dayEvents.filter((e) => e.event_type === 'view').length,
      clicks: dayEvents.filter((e) => e.event_type === 'click').length,
      conversions: dayEvents.filter((e) => e.event_type === 'conversion')
        .length,
    });
  }

  return {
    total_views,
    total_clicks,
    total_conversions,
    conversion_rate: total_clicks > 0 ? total_conversions / total_clicks : 0,
    click_through_rate: total_views > 0 ? total_clicks / total_views : 0,
    total_revenue,
    by_medium,
    timeseries,
  };
}

export async function getShareLinkAnalytics(
  linkId: string,
  period: 'day' | 'week' | 'month' = 'week',
): Promise<CampaignAnalyticsSummary> {
  const { since } = getPeriodRange(period);
  const days = period === 'day' ? 1 : period === 'week' ? 7 : 30;
  if (useDemo) {
    await delay(200);
    const events = filterEvents(demoCampaignEvents, since, linkId);
    return buildSummary(events, days);
  }
  const { data, error } = await supabase
    .from('campaign_events')
    .select('*')
    .eq('share_link_id', linkId)
    .gte('created_at', since.toISOString());
  if (error) console.error('getShareLinkAnalytics:', error.message);
  return buildSummary((data as CampaignEvent[]) ?? [], days);
}

export async function getShopAnalytics(
  shopId: string,
  period: 'day' | 'week' | 'month' = 'week',
): Promise<CampaignAnalyticsSummary> {
  const { since } = getPeriodRange(period);
  const days = period === 'day' ? 1 : period === 'week' ? 7 : 30;
  if (useDemo) {
    await delay(250);
    const events = filterEvents(
      demoCampaignEvents.filter((e) => e.shop_id === shopId),
      since,
    );
    return buildSummary(events, days);
  }
  const { data, error } = await supabase
    .from('campaign_events')
    .select('*')
    .eq('shop_id', shopId)
    .gte('created_at', since.toISOString());
  if (error) console.error('getShopAnalytics:', error.message);
  return buildSummary((data as CampaignEvent[]) ?? [], days);
}

export async function getCampaignComparison(
  shopId: string,
): Promise<CampaignComparison[]> {
  if (useDemo) {
    await delay(200);
    const links = demoShareLinks.filter((l) => l.shop_id === shopId);
    return links.map((l) => ({
      id: l.id,
      label: l.label ?? l.slug,
      type: 'share_link' as const,
      views: l.views_count,
      clicks: l.clicks_count,
      conversions: l.conversions_count,
      conversion_rate:
        l.clicks_count > 0 ? l.conversions_count / l.clicks_count : 0,
      revenue: l.revenue_total,
    }));
  }
  const { data, error } = await supabase
    .from('share_links')
    .select('id, label, slug, views_count, clicks_count, conversions_count, revenue_total')
    .eq('shop_id', shopId)
    .order('created_at', { ascending: false });
  if (error) console.error('getCampaignComparison:', error.message);
  return ((data as ShareLink[]) ?? []).map((l) => ({
    id: l.id,
    label: l.label ?? l.slug,
    type: 'share_link' as const,
    views: l.views_count,
    clicks: l.clicks_count,
    conversions: l.conversions_count,
    conversion_rate:
      l.clicks_count > 0 ? l.conversions_count / l.clicks_count : 0,
    revenue: l.revenue_total,
  }));
}

// ============================================================
// 4. Discount codes — CRUD
// ============================================================

export async function getDiscountCodes(
  shopId: string,
): Promise<DiscountCode[]> {
  if (useDemo) {
    await delay(200);
    return demoDiscountCodes
      .filter((c) => c.shop_id === shopId)
      .map((c) => ({ ...c, status: computeDiscountStatus(c) }))
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
  }
  const { data, error } = await supabase
    .from('discount_codes')
    .select('*')
    .eq('shop_id', shopId)
    .order('created_at', { ascending: false });
  if (error) console.error('getDiscountCodes:', error.message);
  return ((data as DiscountCode[]) ?? []).map((c) => ({
    ...c,
    status: computeDiscountStatus(c),
  }));
}

export interface CreateDiscountCodeParams {
  shopId: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minOrderAmount?: number;
  maxUses?: number;
  expiresAt: string; // ISO datetime
}

export async function createDiscountCode(
  params: CreateDiscountCodeParams,
): Promise<{ code: DiscountCode | null; error: string | null }> {
  // Validation
  const validation = validateDiscountCodeInput(params);
  if (validation) return { code: null, error: validation };

  const code = params.code.toUpperCase().trim();
  if (useDemo) {
    await delay(300);
    // Vérifie l'unicité par boutique
    if (
      demoDiscountCodes.some(
        (c) => c.shop_id === params.shopId && c.code === code,
      )
    ) {
      return { code: null, error: 'Ce code existe déjà pour cette boutique' };
    }
    const newCode: DiscountCode = {
      id: `dc-demo-${Date.now()}`,
      shop_id: params.shopId,
      code,
      discount_type: params.discountType,
      discount_value: params.discountValue,
      min_order_amount: params.minOrderAmount ?? 0,
      max_uses: params.maxUses ?? 0,
      uses_count: 0,
      expires_at: params.expiresAt,
      status: 'active',
      created_at: new Date().toISOString(),
    };
    demoDiscountCodes = [newCode, ...demoDiscountCodes];
    return { code: newCode, error: null };
  }

  const { data, error } = await supabase
    .from('discount_codes')
    .insert({
      shop_id: params.shopId,
      code,
      discount_type: params.discountType,
      discount_value: params.discountValue,
      min_order_amount: params.minOrderAmount ?? 0,
      max_uses: params.maxUses ?? 0,
      expires_at: params.expiresAt,
    })
    .select('*')
    .single();
  if (error) return { code: null, error: error.message };
  return { code: data as DiscountCode, error: null };
}

function validateDiscountCodeInput(p: CreateDiscountCodeParams): string | null {
  if (!p.shopId) return 'Boutique requise';
  if (!p.code?.trim()) return 'Code requis';
  if (p.code.length < 3 || p.code.length > 20)
    return 'Le code doit faire entre 3 et 20 caractères';
  if (p.discountType === 'percentage' && (p.discountValue < 1 || p.discountValue > 100))
    return 'Le pourcentage doit être entre 1 et 100';
  if (p.discountType === 'fixed' && p.discountValue < 100)
    return 'Le montant de réduction doit être au moins 100 FCFA';
  if (p.minOrderAmount != null && p.minOrderAmount < 0)
    return 'Le montant minimum ne peut pas être négatif';
  if (p.maxUses != null && p.maxUses < 0)
    return 'Le nombre maximum d\'utilisations ne peut pas être négatif';
  if (!p.expiresAt) return 'Date d\'expiration requise';
  if (new Date(p.expiresAt).getTime() <= Date.now())
    return 'La date d\'expiration doit être dans le futur';
  return null;
}

export async function updateDiscountCode(
  codeId: string,
  updates: Partial<
    Pick<DiscountCode, 'min_order_amount' | 'max_uses' | 'expires_at' | 'status'>
  >,
): Promise<{ error: string | null }> {
  if (useDemo) {
    await delay(200);
    demoDiscountCodes = demoDiscountCodes.map((c) =>
      c.id === codeId ? { ...c, ...updates } : c,
    );
    return { error: null };
  }
  const { error } = await supabase
    .from('discount_codes')
    .update(updates)
    .eq('id', codeId);
  return { error: error?.message ?? null };
}

export async function deleteDiscountCode(
  codeId: string,
): Promise<{ error: string | null }> {
  if (useDemo) {
    await delay(200);
    demoDiscountCodes = demoDiscountCodes.filter((c) => c.id !== codeId);
    return { error: null };
  }
  const { error } = await supabase
    .from('discount_codes')
    .delete()
    .eq('id', codeId);
  return { error: error?.message ?? null };
}

// ============================================================
// 5. Validation & utilisation des codes promo (checkout)
// ============================================================

/**
 * Valide un code promo pour un panier donné sans le consommer.
 * Vérifie : existence, statut, expiration, limite d'usage, montant minimum.
 *
 * En mode Supabase : utilise la fonction RPC `validate_discount_code` qui
 * effectue la validation côté serveur (atomique, impossible à contourner).
 * En mode démo : effectue la validation côté client sur les données en mémoire.
 */
export async function validateDiscountCode(params: {
  code: string;
  shopId: string;
  cartTotal: number;
  buyerId?: string | null;
}): Promise<DiscountValidationResult> {
  const code = params.code.toUpperCase().trim();
  if (!code) {
    return { valid: false, discount_amount: 0, new_total: params.cartTotal, error: 'Code requis' };
  }

  // Mode démo : validation côté client sur les données en mémoire
  if (useDemo) {
    await delay(200);
    const discountCode =
      demoDiscountCodes.find(
        (c) => c.shop_id === params.shopId && c.code === code,
      ) ?? null;

    if (!discountCode) {
      return {
        valid: false,
        discount_amount: 0,
        new_total: params.cartTotal,
        error: 'Code introuvable ou inactif',
      };
    }

    const effectiveStatus = computeDiscountStatus(discountCode);
    if (effectiveStatus === 'expired') {
      return { valid: false, discount_amount: 0, new_total: params.cartTotal, error: 'Ce code a expiré', discount_code: discountCode };
    }
    if (effectiveStatus === 'paused') {
      return { valid: false, discount_amount: 0, new_total: params.cartTotal, error: 'Ce code est temporairement désactivé', discount_code: discountCode };
    }
    if (effectiveStatus === 'exhausted') {
      return { valid: false, discount_amount: 0, new_total: params.cartTotal, error: 'Ce code a atteint sa limite d\'utilisation', discount_code: discountCode };
    }
    if (params.cartTotal < discountCode.min_order_amount) {
      return { valid: false, discount_amount: 0, new_total: params.cartTotal, error: `Montant minimum requis: ${discountCode.min_order_amount.toLocaleString('fr-FR')} FCFA`, discount_code: discountCode };
    }

    let discountAmount = 0;
    if (discountCode.discount_type === 'percentage') {
      discountAmount = Math.round((params.cartTotal * discountCode.discount_value) / 100);
    } else {
      discountAmount = Math.min(discountCode.discount_value, params.cartTotal);
    }

    return {
      valid: true,
      discount_amount: discountAmount,
      new_total: Math.max(0, params.cartTotal - discountAmount),
      error: null,
      discount_code: discountCode,
    };
  }

  // Mode Supabase : utilise la RPC côté serveur (validation atomique et sécurisée)
  const { data, error } = await supabase
    .rpc('validate_discount_code', {
      p_code: code,
      p_shop_id: params.shopId,
      p_cart_amount: params.cartTotal,
    })
    .single();

  if (error) {
    console.error('validateDiscountCode RPC:', error.message);
    return {
      valid: false,
      discount_amount: 0,
      new_total: params.cartTotal,
      error: 'Impossible de vérifier le code promo',
    };
  }

  const result = data as {
    valid: boolean;
    discount_amount: number;
    message: string;
  } | null;

  if (!result?.valid) {
    return {
      valid: false,
      discount_amount: 0,
      new_total: params.cartTotal,
      error: result?.message ?? 'Code invalide',
    };
  }

  return {
    valid: true,
    discount_amount: result.discount_amount,
    new_total: Math.max(0, params.cartTotal - result.discount_amount),
    error: null,
  };
}

/**
 * Consomme un code promo après une commande validée : enregistre un événement
 * de conversion qui déclenche automatiquement l'incrémentation de `uses_count`
 * via le trigger `campaign_events_increment_usage` (triggers.sql).
 *
 * En mode démo : incrémentation manuelle du cache mémoire.
 * En mode Supabase : le trigger gère `uses_count` et le statut `exhausted`.
 *
 * À appeler après createOrder.
 */
export async function redeemDiscountCode(params: {
  code: string;
  shopId: string;
  orderId: string;
  buyerId: string;
  amount: number; // montant de la réduction appliquée
}): Promise<{ error: string | null }> {
  const code = params.code.toUpperCase().trim();
  if (useDemo) {
    await delay(200);
    const dc = demoDiscountCodes.find(
      (c) => c.shop_id === params.shopId && c.code === code,
    );
    if (!dc) return { error: 'Code introuvable' };
    demoDiscountCodes = demoDiscountCodes.map((c) =>
      c.id === dc.id ? { ...c, uses_count: c.uses_count + 1 } : c,
    );
    // Événement de conversion
    await trackShareEvent({
      shopId: params.shopId,
      discountCodeId: dc.id,
      eventType: 'conversion',
      buyerId: params.buyerId,
      amount: params.amount,
      orderId: params.orderId,
    });
    return { error: null };
  }

  // Mode Supabase : on récupère l'ID du code, puis on enregistre l'événement
  // de conversion. Le trigger `campaign_events_increment_usage` se charge
  // d'incrémenter `uses_count` et de passer le statut à `exhausted` si besoin.
  const { data: dc, error: findErr } = await supabase
    .from('discount_codes')
    .select('id')
    .eq('shop_id', params.shopId)
    .eq('code', code)
    .single();
  if (findErr || !dc) return { error: 'Code introuvable' };
  const dcRow = dc as { id: string };

  await trackShareEvent({
    shopId: params.shopId,
    discountCodeId: dcRow.id,
    eventType: 'conversion',
    buyerId: params.buyerId,
    amount: params.amount,
    orderId: params.orderId,
  });
  return { error: null };
}

// ============================================================
// 6. Promotions étendues (annonce / offre / code promo)
// ============================================================

export async function getShopPromotions(
  shopId: string,
  filters?: { status?: PromotionStatus | 'all'; type?: PromotionType },
): Promise<Promotion[]> {
  const statusFilter = filters?.status ?? 'all';
  if (useDemo) {
    await delay(200);
    let result = demoPromotions.filter((p) => p.shop_id === shopId);
    if (statusFilter !== 'all') result = result.filter((p) => p.status === statusFilter);
    if (filters?.type) result = result.filter((p) => p.promotion_type === filters.type);
    return result.sort(
      (a, b) =>
        new Date(b.start_date).getTime() - new Date(a.start_date).getTime(),
    );
  }
  let query = supabase.from('promotions').select('*').eq('shop_id', shopId);
  if (statusFilter !== 'all') query = query.eq('status', statusFilter);
  if (filters?.type) query = query.eq('promotion_type', filters.type);
  const { data, error } = await query.order('start_date', { ascending: false });
  if (error) console.error('getShopPromotions:', error.message);
  return (data as Promotion[]) ?? [];
}

export interface CreatePromotionParams {
  shopId: string;
  productId?: string | null;
  promoText: string;
  endDate: string;
  visibility?: 'home' | 'category';
  promotionType?: PromotionType;
  discountCodeId?: string | null;
  shareLinkId?: string | null;
  imageUrl?: string | null;
  originalPrice?: number | null;
  discountedPrice?: number | null;
}

export async function createPromotion(
  params: CreatePromotionParams,
): Promise<{ promotion: Promotion | null; error: string | null }> {
  if (!params.shopId) return { promotion: null, error: 'Boutique requise' };
  if (!params.promoText?.trim())
    return { promotion: null, error: 'Texte de la promotion requis' };
  if (!params.endDate) return { promotion: null, error: 'Date de fin requise' };

  if (useDemo) {
    await delay(300);
    const newPromo: Promotion = {
      id: `promo-demo-${Date.now()}`,
      shop_id: params.shopId,
      product_id: params.productId ?? null,
      promo_text: params.promoText,
      start_date: new Date().toISOString(),
      end_date: params.endDate,
      visibility: params.visibility ?? 'home',
      status: 'active',
      promotion_type: params.promotionType ?? 'announcement',
      discount_code_id: params.discountCodeId ?? null,
      share_link_id: params.shareLinkId ?? null,
      image_url: params.imageUrl ?? null,
      original_price: params.originalPrice ?? null,
      discounted_price: params.discountedPrice ?? null,
    };
    demoPromotions = [newPromo, ...demoPromotions];
    return { promotion: newPromo, error: null };
  }

  const { data, error } = await supabase
    .from('promotions')
    .insert({
      shop_id: params.shopId,
      product_id: params.productId ?? null,
      promo_text: params.promoText,
      end_date: params.endDate,
      visibility: params.visibility ?? 'home',
      promotion_type: params.promotionType ?? 'announcement',
      discount_code_id: params.discountCodeId ?? null,
      share_link_id: params.shareLinkId ?? null,
      image_url: params.imageUrl ?? null,
      original_price: params.originalPrice ?? null,
      discounted_price: params.discountedPrice ?? null,
    })
    .select('*')
    .single();
  if (error) return { promotion: null, error: error.message };
  return { promotion: data as Promotion, error: null };
}

export async function updatePromotion(
  promotionId: string,
  updates: Partial<
    Pick<
      Promotion,
      | 'promo_text'
      | 'end_date'
      | 'status'
      | 'image_url'
      | 'original_price'
      | 'discounted_price'
    >
  >,
): Promise<{ error: string | null }> {
  if (useDemo) {
    await delay(200);
    demoPromotions = demoPromotions.map((p) =>
      p.id === promotionId ? { ...p, ...updates } : p,
    );
    return { error: null };
  }
  const { error } = await supabase
    .from('promotions')
    .update(updates as Database['public']['Tables']['promotions']['Update'])
    .eq('id', promotionId);
  return { error: error?.message ?? null };
}

export async function deletePromotion(
  promotionId: string,
): Promise<{ error: string | null }> {
  if (useDemo) {
    await delay(200);
    demoPromotions = demoPromotions.filter((p) => p.id !== promotionId);
    return { error: null };
  }
  const { error } = await supabase
    .from('promotions')
    .delete()
    .eq('id', promotionId);
  return { error: error?.message ?? null };
}

export async function pausePromotion(
  promotionId: string,
): Promise<{ error: string | null }> {
  return updatePromotion(promotionId, { status: 'paused' });
}

export async function reactivatePromotion(
  promotionId: string,
): Promise<{ error: string | null }> {
  return updatePromotion(promotionId, { status: 'active' });
}

// ============================================================
// 7. KPI globaux boutique (pour le hub de promotion)
// ============================================================

export interface ShopPromotionKpi {
  total_links: number;
  total_views_7d: number;
  total_clicks_7d: number;
  total_conversions_7d: number;
  total_revenue_7d: number;
  active_discount_codes: number;
  active_promotions: number;
}

export async function getShopPromotionKpi(
  shopId: string,
): Promise<ShopPromotionKpi> {
  const [links, summary, codes, promos] = await Promise.all([
    getShareLinks(shopId),
    getShopAnalytics(shopId, 'week'),
    getDiscountCodes(shopId),
    getShopPromotions(shopId, { status: 'active' }),
  ]);
  return {
    total_links: links.length,
    total_views_7d: summary.total_views,
    total_clicks_7d: summary.total_clicks,
    total_conversions_7d: summary.total_conversions,
    total_revenue_7d: summary.total_revenue,
    active_discount_codes: codes.filter((c) => c.status === 'active').length,
    active_promotions: promos.length,
  };
}

// ============================================================
// 8. Utilitaires de formatage
// ============================================================

/** Formate un montant FCFA (normalise les espaces insécables) */
export function formatPromoFCFA(amount: number): string {
  return (
    new Intl.NumberFormat('fr-FR')
      .format(Math.round(amount))
      .replace(/[\u202F\u00A0]/g, ' ') + ' FCFA'
  );
}

/** Formate un pourcentage de taux (0-1) en chaîne lisible */
export function formatRate(rate: number): string {
  if (rate <= 0) return '0%';
  if (rate < 0.01) return '< 1%';
  return `${Math.round(rate * 100)}%`;
}

export { isSupabaseConfigured, useDemo as isDemoMode };
