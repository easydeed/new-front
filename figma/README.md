
  # Create a logo

  This is a code bundle for Create a logo. The original project is available at https://www.figma.com/design/vuakIHhqm7vlyqTJPtsjAJ/Create-a-logo.

  ## Running the code

  Run `npm i` to install the dependencies.

  Run `npm run dev` to start the development server.
  
  ---

  **Reference only.** This folder is the design source of record for the
  DeedPro brand (exported from Figma) — app code NEVER imports from it.
  The production implementation lives in
  `frontend/src/components/brand/Logo.tsx`, which re-implements the
  geometry; a CI pin asserts nothing under `figma/` is ever imported.
  Future design iterations land the same way: export here, then the
  production component is updated against it.
