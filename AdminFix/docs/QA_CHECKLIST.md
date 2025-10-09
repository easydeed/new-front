# QA Checklist — Admin Honesty Pass

## Overview
- [ ] Overview cards render real totals from `/admin/dashboard` (existing)
- [ ] Time-to-first-paint shows skeletons then numbers (no flicker)
- [ ] No fake “Quick Actions” visible

## Users
- [ ] Table uses `/admin/users/search?page=1&limit=50&search=`
- [ ] Search filters server-side after debounce (~350ms)
- [ ] Pagination works up to total count
- [ ] View button opens modal from `/admin/users/{id}/real`
- [ ] Export CSV downloads `/admin/export/users.csv`

## Deeds
- [ ] Table uses `/admin/deeds/search?page=1&limit=50&status=`
- [ ] Filters by status and search grantor/grantee/address
- [ ] View button calls `/admin/deeds/{id}`
- [ ] Export CSV downloads `/admin/export/deeds.csv`

## Revenue
- [ ] Calls existing `/admin/revenue` (no mock UI left)
- [ ] Empty/error states are honest

## System Health
- [ ] Calls existing `/admin/system-metrics` OR shows “not wired” if 404
- [ ] Charts render when data is present

## Security
- [ ] All admin endpoints require admin JWT
- [ ] No PII in client console logs
