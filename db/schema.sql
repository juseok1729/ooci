-- Run as the app schema owner (e.g. ooci). Oracle 19c+.
CREATE TABLE sites (
  id            NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  slug          VARCHAR2(63)  NOT NULL,
  custom_domain VARCHAR2(253),
  root_page_id  VARCHAR2(36)  NOT NULL,
  title         VARCHAR2(200),
  owner_email   VARCHAR2(320) NOT NULL,
  settings      CLOB DEFAULT '{}' NOT NULL CHECK (settings IS JSON),
  created_at    TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
  CONSTRAINT sites_slug_uk   UNIQUE (slug),
  CONSTRAINT sites_domain_uk UNIQUE (custom_domain)
);

-- Pretty URLs: /about -> notion page id (oopy "URL 설정")
CREATE TABLE page_aliases (
  site_id  NUMBER       NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  path     VARCHAR2(200) NOT NULL,
  page_id  VARCHAR2(36)  NOT NULL,
  CONSTRAINT page_aliases_pk PRIMARY KEY (site_id, path)
);
CREATE INDEX page_aliases_page_ix ON page_aliases (site_id, page_id);

-- settings JSON shape (all optional):
-- { "menu": [{"title":"Blog","href":"/blog"}],   -- default: child pages of root
--   "font": "Pretendard",                          -- default: Notion system stack
--   "brandColor": "#669DFD",
--   "favicon": "https://...",
--   "footer": "© 2026 me",
--   "customCss": ".notion-page{...}" }
