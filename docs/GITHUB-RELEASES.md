# Publishing Quiet Notes

Repository: https://github.com/CheeseHeadChris96/Quiet_Notes

Installers belong in **Releases**, not in the Git source history. The included workflow builds Apple silicon and Intel Mac DMGs and a Windows x64 NSIS setup program using native GitHub runners. No signing secrets are required for these initial unsigned builds.

## First source upload

From this project's root, using a terminal authenticated with GitHub:

```sh
git add .gitignore .github README.md docs scripts electron src tests package.json pnpm-lock.yaml pnpm-workspace.yaml
git commit -m "Prepare Quiet Notes desktop installers and releases"
git remote add origin https://github.com/CheeseHeadChris96/Quiet_Notes.git
git push -u origin main
```

Skip `git remote add` if `origin` is already configured. If the commit has already been created, only push it. The ignore rules exclude dependencies, build output, scratch files, and common signing-secret files.

## Build and release

1. Set `package.json` to a new version, commit, and push.
2. Tag that commit with the matching version. For this build:

   ```sh
   git tag v0.21.0
   git push origin v0.21.0
   ```

3. Open the repository's **Actions → Build installers** run. All three builds must pass before the release job runs. Windows checks install the app, launch a window, and run its uninstaller. Mac checks validate the DMG and ad-hoc app signature.
4. Open **Releases**, review the generated draft, download and check the installers on your target computers, then click **Publish release**. Drafts are only visible to repository collaborators; publishing makes them downloadable according to repository visibility.

**Actions → Build installers → Run workflow** builds installers without creating a release. Download them from the run's Artifacts section while signed into GitHub. Tag-triggered runs create a draft release and include SHA256 checksums. Reruns do not overwrite existing release assets; delete a failed draft's conflicting assets or use a new version after fixing a build.

## Upload the installers built on this Mac

After the source and matching tag have been pushed, a repository owner can create a release from the GitHub Releases page and attach the `.dmg`, `-Setup.exe`, and `SHA256SUMS.txt` files in `outputs/installers/`. Do not upload the unpacked app folders. Use this manual method instead of the Actions draft if you want the exact locally verified files.

## Reproducible local builds

Use Node.js 24 and pnpm 11.19.0 (declared in `packageManager`):

```sh
npm install --global pnpm@11.19.0
pnpm install --frozen-lockfile
pnpm test
pnpm build:mac
```

On Windows use `pnpm build:win`. Installers appear in `dist/`. The lockfile fixes dependency versions; the build always disables automatic publishing. The mac build produces both CPU architectures; Windows produces x64. Cross-compilation can download additional tooling; native CI builds are preferred for release verification.

## Publisher signing

For a trusted public release, configure an Apple Developer ID certificate and notarization credentials, replace the ad-hoc `mac.identity: "-"` setting with your Developer ID identity, and supply signing secrets through GitHub Actions secrets. Windows Authenticode signing likewise requires your publisher's certificate or a signing service. Never commit certificates, private keys, tokens, or passwords. Signed builds require additional configuration before use; the initial workflow deliberately uses no publisher credentials.

## Data and upgrades

The app ID remains `com.quietnotes.desktop` and the product name remains `Quiet Notes`. Installers do not include personal notes. Local data lives in Electron's user application-data directory and Windows uninstall is configured to preserve it. Export a backup from More before upgrades or moving to another machine. Browser data and installed-app data are separate. No sync or auto-updater is included.
