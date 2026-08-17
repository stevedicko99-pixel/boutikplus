-- Migration : Validation automatique des demandes livreur après upload CNI
-- Date : 2026-08-17
-- Description : Ajoute les colonnes nécessaires pour stocker les URLs des
-- photos de carte d'identité et le statut de validation automatique.
-- Quand un livreur soumet ses 2 faces de CNI, sa demande est auto-approuvée.

-- Ajout des colonnes pour le stockage des CNI et le statut de validation
alter table driver_profiles
  add column if not exists id_card_front_url text,
  add column if not exists id_card_back_url text,
  add column if not exists application_status text default 'pending'
    check (application_status in ('pending', 'approved', 'rejected')),
  add column if not exists approved_at timestamptz,
  add column if not exists rejected_at timestamptz,
  add column if not exists rejection_reason text;

-- Index pour filtrer rapidement les demandes par statut
create index if not exists idx_driver_profiles_application_status
  on driver_profiles(application_status)
  where application_status is not null;

-- Commentaire de documentation
comment on column driver_profiles.id_card_front_url is
  'URL publique de la photo recto de la carte d''identité (bucket driver-id-cards)';
comment on column driver_profiles.id_card_back_url is
  'URL publique de la photo verso de la carte d''identité (bucket driver-id-cards)';
comment on column driver_profiles.application_status is
  'Statut de validation : pending (en attente), approved (auto-approuvé après CNI), rejected (refusé)';
comment on column driver_profiles.approved_at is
  'Date d''approbation automatique (quand les 2 faces CNI ont été uploadées)';
