# Project Workflow: ROADSoS

## Git & Deployment
- **Branching Strategy**: NEVER push directly to the `main` branch.
- **Pull Requests**: For every change, create a new feature branch (e.g., `feature/description-of-change`) and push it to the remote.
- **Merging**: The user will manually review and merge the code on GitHub.
- **Verification**: Always run `npm run build` in the `frontend` directory before pushing to ensure no regressions.
