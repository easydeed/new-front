# 🧹 Documentation Cleanup Plan

**Date**: October 8, 2025  
**Goal**: Clean, organized documentation with zero bloat

---

## 🎯 **NEW AGENT ONBOARDING PATH**

```
1. START_HERE.md                          ← Entry point
2. docs/ONBOARDING_NEW_AGENTS.md         ← Full onboarding guide
3. docs/roadmap/PROJECT_STATUS.md        ← Current project state
```

---

## 🗑️ **FILES TO DELETE**

### **Root Directory**
- ✅ `PDFGenFix/` - Prototype folder (now fully integrated into main codebase)
- ✅ `docs-overhaul/` - Old documentation overhaul attempt
- ✅ `DOCUMENTATION_OVERHAUL_SUMMARY.md` - Superseded
- ✅ `dynamic-wizard.tsx` - Loose file (frontend code in root)
- ✅ `pixel_perfect_deed_20251007_205545.pdf` - Test PDF
- ✅ `PROJECT_STATUS_UPDATE_OCT6.md` - Outdated (use docs/roadmap/PROJECT_STATUS.md)
- ✅ `test_pixel_direct.py` - Temporary test script
- ✅ `test_pixel_run.py` - Temporary test script

**Reason**: All implemented, integrated, or superseded by current docs

---

## 📦 **FILES TO ARCHIVE**

Move to `docs/archive/`:

### **From Root**
None - root files are either kept or deleted

### **From docs/roadmap/**
Review and archive old roadmap files that are complete/outdated

### **From docs/status/**
Archive old status reports (keep only latest)

---

## ✅ **FILES TO KEEP IN ROOT**

```
✅ START_HERE.md                    - Entry point for all new agents
✅ README.md                         - Main project readme
✅ PHASE5_EXECUTION_GUIDE.md        - Current phase guide
✅ DEPLOYMENT_CHECKLIST.md          - Operational guide
✅ STAGING_SETUP.md                 - Deployment setup
✅ render.yaml                       - Infrastructure config
✅ package.json / package-lock.json - Dependencies
✅ backend/                          - Backend code
✅ frontend/                         - Frontend code
✅ templates/                        - PDF templates
✅ docs/                             - All documentation
✅ scripts/                          - Utility scripts
✅ tests/                            - Test files
```

---

## 📁 **UPDATED DOCUMENTATION STRUCTURE**

```
new-front/
├── START_HERE.md                           ← 🎯 START HERE!
├── README.md                                ← Project overview
├── PHASE5_EXECUTION_GUIDE.md               ← Current phase
├── DEPLOYMENT_CHECKLIST.md                 ← Deployment steps
├── STAGING_SETUP.md                        ← Staging config
│
├── docs/
│   ├── ONBOARDING_NEW_AGENTS.md           ← 🎯 ONBOARDING GUIDE
│   ├── README.md                           ← Docs overview
│   ├── DOCS_INDEX.md                       ← Documentation index
│   │
│   ├── roadmap/
│   │   ├── PROJECT_STATUS.md              ← 🎯 CURRENT STATUS
│   │   ├── PHASE5_PREQUAL_COMPLETE_SUMMARY.md
│   │   ├── WIZARD_REBUILD_PLAN.md
│   │   └── [other active roadmap files]
│   │
│   ├── backend/
│   │   ├── PDF_GENERATION_SYSTEM.md
│   │   └── ROUTES.md
│   │
│   ├── wizard/
│   │   ├── ARCHITECTURE.md
│   │   └── [wizard docs]
│   │
│   └── archive/
│       └── [old/completed documentation]
│
├── backend/                                ← Backend code
├── frontend/                               ← Frontend code
├── templates/                              ← PDF templates
└── scripts/                                ← Utility scripts
```

---

## 🎯 **CLEANUP EXECUTION ORDER**

### **Phase 1: Delete Obsolete Files**
1. Delete `PDFGenFix/` folder
2. Delete `docs-overhaul/` folder
3. Delete root-level test files
4. Delete outdated status files
5. Delete loose frontend files

### **Phase 2: Archive Old Docs**
1. Review `docs/roadmap/` for completed/outdated files
2. Review `docs/status/` for old status reports
3. Move to `docs/archive/` with date prefix

### **Phase 3: Update Entry Points**
1. Update `START_HERE.md` with clear path
2. Update `docs/ONBOARDING_NEW_AGENTS.md`
3. Ensure `PROJECT_STATUS.md` is current

### **Phase 4: Create Index**
1. Update `docs/DOCS_INDEX.md`
2. Add links to key documents
3. Mark archived docs

---

## ✅ **SUCCESS CRITERIA**

Documentation cleanup is **COMPLETE** when:
- ✅ Root directory has only essential files
- ✅ Clear onboarding path: START_HERE → ONBOARDING → PROJECT_STATUS
- ✅ No duplicate or outdated docs in active folders
- ✅ All old docs archived with dates
- ✅ Updated index and navigation
- ✅ Zero bloat

---

**Ready to execute!** 🚀

