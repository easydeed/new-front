# DeedPro Escrow Skin — Cursor Package

A drop-in **escrow-first** theme + components for your marketing site.
Built with Next.js (pages router) and Tailwind. Designed to convert **escrow officers**.

## What’s inside
- Escrow palette & density (Ink Navy, Paper background, Seal Teal CTA)
- Hero + proof line, three “why” tiles, workflow strip
- Integrations marketplace cards (SoftPro 360, Qualia)
- Developers & IT section (compact API pitch)
- Sticky action bar (Start, Resume, Connect)
- A/B headline toggle via `?ab=A|B`

## Quick start in Cursor
1. Open this folder.
2. **Tasks → Node: Install**
3. **Tasks → Dev: Next (3030)**
4. Visit http://localhost:3030

## Use in your repo
- Copy `components/*` into your codebase.
- Import `styles/globals.css` or merge the escrow theme into your global styles.
- Extend your Tailwind `theme.extend.colors` with the same color keys used here.
- Apply the `escrow` class on `<html>` or `<body>` to enable the theme.

## Toggle A/B
Append `?ab=A` or `?ab=B` to the homepage URL to switch hero copy variants.

## Notes
- Palette & structure mirror the escrow-first plan we discussed.
- Keep API counters/blocks in the *Developers & IT* section, not the hero.
