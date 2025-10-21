---
description: Update the readme of a repo using file-forge [gitIngest CLI utility]
---

1. Check if the CLI utility `ffg` (File Forge) is available globally:
   - If not found, install it using:
     - `pnpm add -g @johnlindquist/file-forge`, or
     - fallback: `npm install -g @johnlindquist/file-forge`

2. Run `ffg` with `--markdown` on the root directory of the current project to generate a comprehensive markdown report:
   - Use `process.cwd()` as the default root unless a `ffg.config.jsonc` defines another entry point.
   - Example command: `ffg . --markdown --exclude "node_modules/**,dist/**"`

3. Parse the `ffg` output to extract:
   - Directory structure
   - Summary
   - Any available dependency graph or file highlights

4. **Without waiting for user confirmation**, use the extracted output to make the following **direct edits to `README.md`**:
   - Replace any existing section like “## Project Structure” or “Folder Layout” with the new structure
   - Insert or update a “Project Summary” section if the `ffg` output includes a description block
   - Revise outdated references to files or folders in the README (e.g., `src/`, `lib/`, `components/`, etc.)
   - If present, replace deprecated usage examples or developer instructions that conflict with the latest structure
   - Optionally insert a “Generated with [File Forge](https://github.com/johnlindquist/file-forge)” attribution

5. Ensure all changes to `README.md` are:
   - Markdown-compliant and idempotent (avoid duplicate insertions)
   - Based strictly on the latest `ffg` analysis

6. Handle errors gracefully:
   - If `ffg` fails, log the error and exit
   - If `README.md` is missing, create a new one with a minimal scaffold and generated structure

7. Log a summary of the changes made:
   - Sections added, removed, or updated
   - Files or folders referenced
   - Whether any content was skipped due to configuration or filtering