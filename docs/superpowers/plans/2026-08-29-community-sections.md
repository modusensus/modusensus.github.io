# MODUSENSUS Community Sections Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add low-maintenance Fragments, Elsewhere, and Guestbook sections without increasing the home page density.

**Architecture:** Fragments are an Astro content collection backed by local Markdown files. Elsewhere is a typed local data module containing maintained outbound links. Guestbook is a static Astro page that renders Giscus only when repository/category identifiers are configured; otherwise it renders an explicit setup state. The existing BaseLayout owns navigation and footer links for all routes.

**Tech Stack:** Astro 4, MDX/content collections, TypeScript, CSS custom properties, Giscus client script.

---

### Task 1: Extend the shared content and navigation foundations

**Files:**
- Modify: `src/content/config.ts`
- Modify: `src/layouts/BaseLayout.astro`
- Modify: `src/styles/global.css`
- Modify: `src/config/giscus.json`

- [ ] **Step 1: Add the `fragments` content schema**

  Define a collection with required `date` and optional `mood`/`color`, and export it alongside `blog`.

- [ ] **Step 2: Add grouped navigation entries**

  Add `FRAGMENTS`, `ELSEWHERE`, and `GUESTBOOK` to the shared active-nav union and navigation groups. Keep the mobile navigation horizontal and hide its scrollbar.

- [ ] **Step 3: Add shared styles**

  Add styles for fragment entries, external-link rows, empty/setup states, and the Giscus wrapper using existing color, typography, spacing, and rule tokens.

- [ ] **Step 4: Make Giscus configuration explicit**

  Store `repo`, `repoId`, `category`, and `categoryId` in `src/config/giscus.json`. Keep both IDs empty until GitHub Discussions and the Giscus category are configured.

- [ ] **Step 5: Run the type/build check**

  Run `npm run build`.
  Expected: the existing routes compile successfully and no route is generated yet for the new pages.

### Task 2: Implement Fragments and Elsewhere

**Files:**
- Create: `src/pages/fragments.astro`
- Create: `src/pages/elsewhere.astro`
- Create: `src/data/elsewhere.ts`
- Create: `src/content/fragments/.gitkeep` (only if the directory would otherwise be empty)

- [ ] **Step 1: Render Fragments from the collection**

  Read `fragments`, sort by descending date, render each Markdown body, and show a clear empty state when no entries exist. Keep the page as a single narrow editorial list.

- [ ] **Step 2: Render Elsewhere from the typed data module**

  Group links by `kind`, render safe outbound anchors with `target="_blank"` and `rel="noopener noreferrer"`, and show an empty state for an empty group/data set.

- [ ] **Step 3: Build and inspect both pages**

  Run `npm run build`.
  Expected: `/fragments/index.html` and `/elsewhere/index.html` are generated, with no TypeScript or Astro errors.

### Task 3: Implement the Giscus Guestbook page

**Files:**
- Create: `src/pages/guestbook.astro`
- Modify: `src/config/giscus.json`

- [ ] **Step 1: Add the explanatory header and moderation rules**

  Explain that visitors sign in with GitHub, comments are public, and moderation happens through GitHub Discussions.

- [ ] **Step 2: Gate the external script on complete configuration**

  Import the JSON config. Render the official `https://giscus.app/client.js` only when both `repoId` and `categoryId` are non-empty. Use `pathname` mapping, Chinese language, reactions, top input position, and lazy loading.

- [ ] **Step 3: Render the incomplete-configuration state**

  When IDs are missing, show that Discussions must be enabled, the Giscus app installed, and the IDs copied into `src/config/giscus.json`. Include a direct GitHub repository link.

- [ ] **Step 4: Build and inspect the no-config path**

  Run `npm run build`.
  Expected: `/guestbook/index.html` is generated without loading an external Giscus script when `categoryId` is empty.

### Task 4: Update documentation and verify the complete surface

**Files:**
- Modify: `README.md`
- Modify: `docs/superpowers/specs/2026-08-29-community-sections-design.md` only if implementation details need clarification

- [ ] **Step 1: Document the maintenance workflow**

  Explain where to add a fragment, where to edit links, and how to enable/configure Giscus without storing credentials.

- [ ] **Step 2: Run the final build**

  Run `npm run build`.
  Expected: all existing and new routes build successfully.

- [ ] **Step 3: Run browser verification**

  Check desktop and mobile layouts for `/`, `/fragments`, `/elsewhere`, and `/guestbook`. Verify navigation targets, no horizontal overflow, visible empty/setup states, and no browser console errors caused by the new pages.

- [ ] **Step 4: Review the diff**

  Run `git diff --check` and inspect `git status --short`.
  Expected: no whitespace errors, no secrets, no generated `dist/` changes staged as source edits, and no references to the deleted `/write` backend in the new documentation.
