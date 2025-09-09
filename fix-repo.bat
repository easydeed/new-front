@echo off
echo === FIXING REPOSITORY CORRUPTION ===
echo.

echo Step 1: Checking git status...
git status

echo.
echo Step 2: Adding cleaned files...
git add .

echo.
echo Step 3: Committing cleanup...
git commit -m "fix(vercel): resolve monorepo auto-detection - update vercel.json for proper build paths and remove corrupted files"

echo.
echo Step 4: Checking current branch...
git branch

echo.
echo Step 5: Checking recent commits...
git log --oneline -5

echo.
echo Step 6: Pushing to GitHub...
git push origin main

echo.
echo Step 7: Verifying push success...
git status

echo.
echo === REPOSITORY FIX COMPLETE ===
pause
