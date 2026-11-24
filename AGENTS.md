# Portfolio preview workflow

The owner wants a Vercel preview for each finished update. Prepare a reviewable local draft, run the relevant checks, then request explicit confirmation for the concrete GitHub write. Name the repository, branch and PR or proposed PR. A general request to implement an update or open a PR does not grant confirmation.

After confirmation, push to the approved feature branch and open or update the approved PR against `main`. Wait for the Vercel preview and share its URL and the PR. Obtain explicit confirmation for every further GitHub write, including PR edits, comments, merges and releases.

# Conventions

Follow [docs/development.md](docs/development.md) for structure, adding pages, styling, dark mode and checks. Run `npm run check` before requesting confirmation. House work also follows [docs/house.md](docs/house.md); never commit unencrypted House source material or credentials.
