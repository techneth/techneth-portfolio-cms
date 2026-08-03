-- Case study narrative fields
-- Adds the structured columns the frontend /portfolio/[slug] page reads to
-- build the full narrative (hero facts, mission/vision, metrics, phases,
-- gallery, visual identity, testimonial, etc.). Every column is nullable, so
-- existing studies keep rendering and each block is skipped when empty.
--
-- Run this in the Supabase SQL editor. Safe to re-run (IF NOT EXISTS).

alter table case_studies
  -- 2.1 Project facts
  add column if not exists subtitle            text,
  add column if not exists hero_image          text,
  add column if not exists client_logo         text,
  add column if not exists client_location     text,
  add column if not exists timeline            text,
  add column if not exists project_year        text,
  add column if not exists platforms           jsonb default '[]'::jsonb,
  add column if not exists services            jsonb default '[]'::jsonb,
  add column if not exists industries          jsonb default '[]'::jsonb,
  add column if not exists live_url            text,
  -- 2.2 Statement blocks
  add column if not exists mission             text,
  add column if not exists mission_image       text,
  add column if not exists vision              text,
  add column if not exists vision_image        text,
  add column if not exists goals               jsonb default '[]'::jsonb,
  -- 2.3 Narrative
  add column if not exists challenge           text,
  add column if not exists challenge_points    jsonb default '[]'::jsonb,
  add column if not exists challenge_image     text,
  add column if not exists solution            text,
  add column if not exists solution_points     jsonb default '[]'::jsonb,
  add column if not exists solution_image      text,
  add column if not exists outcome             text,
  add column if not exists outcome_image       text,
  -- 2.4 / 2.5 / 2.7 / 2.8 structured lists
  add column if not exists metrics             jsonb default '[]'::jsonb,
  add column if not exists phases              jsonb default '[]'::jsonb,
  add column if not exists features            jsonb default '[]'::jsonb,
  add column if not exists gallery_images      jsonb default '[]'::jsonb,
  -- 2.6 Technology and visual identity
  add column if not exists technologies_note   text,
  add column if not exists technologies_image  text,
  add column if not exists typography          jsonb default '[]'::jsonb,
  add column if not exists color_palette       jsonb default '[]'::jsonb,
  add column if not exists identity_note       text,
  add column if not exists identity_image      text,
  -- 2.9 Client quote
  add column if not exists testimonial_quote   text,
  add column if not exists testimonial_author  text,
  add column if not exists testimonial_role    text,
  add column if not exists testimonial_avatar  text;
