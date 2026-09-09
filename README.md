# Quiet Notes

A small, local notes app inspired by Windows Sticky Notes. Designed for Windows and macOS, with a compact searchable notes list, white and dark appearances, pinning, automatic saving, a dark theme, recoverable trash, and JSON backup import/export.

## Try it immediately

Open `src/index.html` in a modern browser. No installation or account is required. Notes stay in that browser's local storage. Keep the file in the same location and browser for consistent access.

## Install on macOS or Windows 11

Download an installer from [GitHub Releases](https://github.com/CheeseHeadChris96/Quiet_Notes/releases) once the first release is published:

- **Apple silicon Mac:** `Quiet-Notes-<version>-mac-arm64.dmg`
- **Intel Mac:** `Quiet-Notes-<version>-mac-x64.dmg`
- **Windows 11 (Intel/AMD):** `Quiet-Notes-<version>-windows-x64-Setup.exe`

Mac requires macOS 12 or newer. Open the DMG and drag Quiet Notes into Applications. On Windows, run Setup and follow the wizard. Installers bundle the runtime; Node.js and a local web server are not needed.

Initial installers are unsigned by a verified publisher (Mac uses an ad-hoc signature) and are not Apple-notarized. macOS or Windows may show security prompts; managed-device policies may prevent installation. Publisher signing is a separate release setup step.

Export a backup from **More** in the browser prototype, then import it into the installed app to transfer your notes and photos. Browser and desktop storage are separate. Updates are installed manually; export a backup before upgrading.

## Run from source

Install Node.js 24 and pnpm 11.19.0:

```sh
npm install --global pnpm@11.19.0
pnpm install --frozen-lockfile
pnpm start
```

## Build and publish installers

```sh
pnpm test
pnpm build:mac
# On Windows:
pnpm build:win
```

Installers appear in `dist/`. The Mac command builds Apple silicon and Intel images. See [GitHub release instructions](docs/GITHUB-RELEASES.md) for source upload, automated builds, release downloads, and signing setup. The GitHub workflow tests all platforms and prepares a draft release when a matching version tag is pushed.

## Everyday use

- Create a note with the + button in the tab bar or Command/Ctrl+N.
- Click a card to edit. Changes save as you type; use customer or technology navigation, or Command/Ctrl+K, to return to the list.
- Command/Ctrl+K focuses search.
- Pin frequently used notes. Use Light mode / Dark mode to change the app and all note backgrounds together.
- Move notes to Trash and restore them from the Trash view.
- Export backups regularly. Import adds notes with new IDs and leaves existing notes unchanged, including edits to matching IDs. Import is not synchronization.

## Storage and limitations

The desktop app stores notes in Chromium local storage inside Electron's per-user app data directory. Browser and desktop storage are separate. There is no cloud sync or account, and notes are not encrypted. Clearing browser/app data removes local notes; exported backups are independent. Storage failures are reported in the editor and a status message. Deleted notes remain in Trash and are included in backups.

This first version has one notes window with an editor. Separate floating sticky-note windows, automatic cross-device sync are not included.

## Checks

```sh
npm test
```

Tests cover backup validation, search, pinned ordering, and trash filtering. Windows installer execution must be verified on a Windows machine.

## Text editing (0.2)

New notes start with ordinary 16px text. Select text to apply bold, italics, a font size, or a text color. Use the bulleted-list button for lists, and Clear style to remove character formatting. Formatting autosaves with each note and is included in JSON backups. Older plain-text notes continue to work.

The editor includes Undo/Redo, Select all, and case-sensitive Find/Replace (Command/Ctrl+F). Command/Ctrl+B and I apply bold and italics. Undo history is retained for the current editing session.

Open text file (Command/Ctrl+O) imports a UTF-8 .txt or .md file as a new note, up to 2 MB. The original stays untouched. Save text file (Command/Ctrl+S while editing) writes the body as plain UTF-8 text using a native Save dialog on desktop or a download in the browser. Formatting is not included in plain-text files; use JSON backup to preserve it. Markdown is edited as text, not rendered as Markdown.

## Simpler appearance (0.3)

The app now uses a compact notes list and a plain editor with white or dark backgrounds. Pastel note colors, decorative cards, the large sidebar, and slogans have been removed. Existing notes and formatting remain compatible. File opening and backups are under More. Text formatting tools remain in the editor, including optional text colors.

## Browser-style tabs (0.4)

Open notes appear in a horizontal tab bar, with a + button for new notes. The editor fills the area below the tabs. Closing a tab leaves the note saved; reopen it from Recent or the Notes list. On first use, the five most recently edited notes are offered as tabs. After that, the open tabs and selected tab are restored on restart. The Recents sidebar lists the twenty most recently edited notes. Trashing a note removes its tab, and per-note undo history survives tab switching within the same session.

## Collapsible Recents sidebar (0.5)

Recent notes now appear in a left column, with the active note highlighted. Click a recent note to open its tab. Use the sidebar button at the left end of the tab bar to hide or show the column, or the arrow in the Recents heading to hide it. The app remembers this preference between launches.

## Customers and Generic notes (0.6)

Each note belongs to one customer, or Generic. Existing notes default to Generic. Use the Customer dropdown below a note title to search for a customer, select Generic, or type a new customer name and choose Add. Names are trimmed and deduplicated without regard to capitalization.

The dropdown beside Quiet Notes filters the notes list and Recents to All customers, Generic, or a specific customer. Existing open tabs remain open so you can work across customers; each note shows its assigned customer. New notes and opened text files inherit a specific selected customer, otherwise they start as Generic.

Customer lists and assignments autosave locally and are included in JSON backups. Import supports older plain-note backups as well as the new format; it merges customer names and retains existing notes when IDs match. Plain-text file exports contain only note text, not customer metadata.

## Customer and technology organization (0.7)

Customer replaces the former Client label throughout the interface. Existing assignments are preserved. Notes have one customer (or Generic) and can have multiple technologies (or Uncategorized). Both pickers support search and quick creation, with case-insensitive deduplication. Click a technology to toggle it, then Done.

Use the sidebar selector to browse Recents, Customers, or Technologies. Category groups show counts of active notes across all customers and technologies. Selecting a group clears the other category filter and opens that category in the notes list. Use the two top filters together to narrow the results further; they combine with text search, Pinned, and Trash. Clear filters restores all categories. Open editor tabs remain available across category filters, and each note shows its assignments. New notes inherit a selected customer and technology.

Customer and technology catalogs and assignments are included in version-3 JSON backups. Older note and customer backups remain importable. The internal legacy customer field names are retained for migration compatibility.

## Document tabs only (0.7.1)

Removed the fixed Notes tab. The tab bar contains only open notes and the + button. Category navigation and Command/Ctrl+K still open the notes list; closing the last open note also returns to the list.

## Category headings (0.7.2)

The notes list heading shows the selected customer or technology. Combined filters show both names. With no category selected, it shows All notes. The subtitle has been removed. Pinned and Trash remain identified in the heading.

## Independent folder trees (0.8)

Customers and Technologies are independent trees. Generic is available for general notes. Every note has one folder location. Use the arrows to expand/collapse folders, the + beside any folder to add a subfolder, and Rename on a selected folder to change its name. Subfolders can be nested further. Names must be unique within the same parent; the same name can appear in different branches. Root names stay fixed.

Click a folder to show its immediate notes and subfolders. All notes shows notes across every tree. Folder search in the sidebar and the top dropdown finds nested paths. Recents remains available in the sidebar selector. New notes and opened text files are created in the selected folder, or Generic when browsing All notes. Use the single Folder dropdown inside an editor to move that note to another folder, or create a folder there and move it immediately. Moving notes does not change their text or close their tabs.

Storage and JSON backups use version 4 with stable folder IDs, parent references, and one folderId per note. Import merges matching folder paths, remaps conflicting IDs, and keeps existing notes with matching IDs. Invalid hierarchies and missing note destinations are rejected.

Older categories migrate automatically: customer assignments take precedence, otherwise the first technology becomes the destination, otherwise Generic. All old customer and technology categories are retained as folders, including empty categories. Legacy assignment fields remain in backups as historical metadata; they no longer filter or link notes. The untouched original data is retained locally as quiet-notes-before-folders and can be exported from More → Export pre-folder backup. Legacy name slashes become › in folder names. This section supersedes the category/filter behavior described in earlier release sections.

Validation: 20 Node tests cover note storage, editing helpers, legacy compatibility, folder migration, nested paths, hierarchy rejection, and backup merge remapping. The browser workflow verifies subfolder creation, inherited note locations, moving notes across trees, and persistence after reload.

## Folder creation (0.8.1)

+ New folder always creates a top-level folder alongside Customers, Technologies, and Generic. The + beside a folder creates a subfolder in that folder. The dialog asks only for the name; there is no Inside selector. Custom root folders can be renamed and are included in backups.

## Folder context menu (0.9)

Right-click a folder in the sidebar or main folder list for New subfolder, New note, and Delete folder. Shift+F10 also opens the menu; arrow keys navigate it and Escape dismisses it. Creation uses the clicked folder even when another folder is selected.

Delete folder removes that folder and all its descendants. Their notes, including previously trashed notes, are assigned to Generic and moved to Trash, where Restore returns them to Generic. Unrelated notes and folders are unchanged. Customers and Technologies can be deleted; Generic remains as the recovery destination. The complete state before the latest folder deletion is saved locally and can be exported from More. Folder backup import merges folders and preserves existing note IDs, so restoring individual trashed notes uses the Trash view.

Validation: 22 Node tests passed, including subtree deletion, valid recovery destinations, and imports after root deletion. Browser checks covered right-click creation, deleting an open note’s folder, reload, and restoring the note from Trash.

## Folder row shortcuts (0.9.1)

The + beside a folder now creates a note in that folder. The small outline folder icon immediately to its left creates a subfolder. Both have descriptive tooltips and accessible labels. The right-click menu remains available, and + New folder still creates a root folder.

## Right-click rename (0.9.2)

Folder menus now include Rename, including top-level folders. Notes can be renamed through right-click menus on note cards, Recents, and open tabs, or with Shift+F10. A name dialog supports Save, Cancel, and Escape. Renaming preserves note contents and folder IDs, refreshes open tabs, and saves locally.

## Notes in the folder tree (0.9.3)

Expanded folders show their subfolders followed by their directly contained notes, sorted by title. Click a note to open it, or right-click to rename. Collapsing a folder hides both notes and subfolders. Trashed notes are excluded.

## Note sheet icon (0.9.4)

Sidebar notes use a small outline sheet of paper with a folded corner and text lines, matching the light and dark themes.

## Drag and drop (0.10)

Drag notes from the folder tree, note list, Recents, or an open tab onto a folder. Drag a folder onto another folder to move its whole subtree, preserving note locations and contents. Destinations highlight during a valid drag. Drop folders on All notes in the sidebar to move them to the root. Generic stays at the root as the recovery folder.

Moves save immediately and keep open editors available. Invalid self/descendant moves and duplicate folder names at the destination are rejected. Failed saves restore the original location. External file drops are not imported by this feature.

Validation: 25 Node tests passed, including drag event handler tests, subtree moves, root moves, cycle rejection, duplicate detection, and save-failure rollback. The preview loads with draggable elements; the available browser automation does not support a native drag gesture, so full pointer drag verification remains manual.

## Selection formatting (0.11)

The note editor no longer displays a title field or permanent editing/formatting toolbars. Rename notes from their right-click menu. Highlight note text to reveal a floating toolbar with bold, italic, font size, text color, bulleted lists, and clear style. It disappears when selection is cleared or the note closes. Undo, redo, select all, find/replace, and text-file export are available in More and retain their keyboard shortcuts. New notes focus the writing area directly.

Browser checks verified the simplified editor, selection toolbar visibility/dismissal, bold and size changes, and bold persistence after reload.

## Compact save status (0.11.1)

Removed the folder picker and save-status row from the note editor. A small status icon sits at the far right of the tab bar. Hover for its message; screen readers receive the same status. A check indicates saved data and an exclamation mark indicates attention is needed. Move notes through drag-and-drop.

## Save indicator colors (0.11.2)

The check mark is green when saved and grey when unsaved. Hover or keyboard-focus it for a small Saved/Unsaved popup. A failed save remains marked unsaved when switching notes; only a successful save returns it to green.

## Combined tab header (0.12)

Quiet Notes is centered at the top of a slightly taller tab bar. The separate app header and top folder picker are removed. Dark mode and More live in a bottom app bar, with More opening upward. Folder navigation remains in the sidebar.

## Single bottom toolbar (0.12.1)

Word count, Pin, Trash, theme toggle, and More share one bottom row. The four actions use outline icons with hover labels and accessible names. Pin and theme labels update with their state. Note-specific controls hide when browsing the notes list.

## Line numbers (0.13)

More → Line numbers toggles a numbered editor gutter. The setting is remembered locally. Logical lines and list items are numbered; wrapping does not create additional numbers. The gutter follows scrolling, text changes, formatting, and resizing, and is excluded from copied text and saved notes.

## Matching gutter background (0.13.1)

The line-number gutter uses the same background as the note in light and dark themes.

## Narrower line-number gutter (0.13.2)

The gutter starts at 28px and expands only as needed for additional digits.

## Centered line numbers (0.13.3)

Line numbers are horizontally centered within the gutter.

## Code indentation (0.14)

Tab inside a note inserts a literal tab displayed at four-column stops. With text selected, Tab indents the affected logical lines. Shift+Tab removes one leading tab or up to four spaces per affected line. Formatting is preserved, changes participate in undo/redo, and tabs are kept in text-file exports. Escape followed by Tab moves keyboard focus out of the editor.

## Empty-note line number fix (0.14.1)

Browser placeholder breaks left after Backspace are no longer counted as extra lines. Empty notes show one line number, while real blank lines are retained. Regression tests cover root/inline/paragraph placeholders and consecutive breaks.

## Images in notes (0.15)

Use More → Insert image or paste a copied image into the note. PNG, JPEG, WebP, and GIF are supported. Images appear at the caret or replace the selection, fit the editor width, and remain embedded in saved notes and JSON backups. Plain-text exports omit images. Large images are resized to at most 1600px and compressed; large animated GIFs become still images when resized. Individual source files must be below 20 MB. Local storage capacity still limits total note size; a failed image save restores the original note. Remote image URLs and executable image formats are not imported from pasted HTML.

## Photo resizing (0.15.1)

Click a photo in a note to show its four corner handles. Drag a corner to resize while keeping its proportions. The width is saved with the note and included in backups; Undo/Redo treats each drag as one edit. Press Escape during a drag to cancel. Click elsewhere to hide the handles.

## Optional tab dots (0.16.0)

More → Show tab dots displays one subtle dot centered in each literal tab. Spaces are not marked. This preference is remembered on the device and starts off. The dots are visual guides only: they do not change note text, copied content, backups, or exported files.

## Photo gallery folders (0.17)

Right-click a regular folder → Create → Photo gallery. Galleries are a distinct folder type within the folder tree; they contain photos rather than notes or subfolders. Select a gallery to see its thumbnail grid, then Upload photos (multiple files supported). PNG, JPEG, WebP and GIF originals up to 20 MB each are kept in IndexedDB, separate from note storage. Double-click a thumbnail (or press Enter) for a larger preview; Left/Right switches photos, Escape closes it.

Right-click a photo to Preview, Copy to clipboard, Move to another searchable gallery, Save as, or Delete. Deletion asks for confirmation. Desktop Save as uses the system save dialog; browser preview uses a download. Clipboard copies use an image representation; saved files retain original bytes. Gallery folders can be renamed and dragged between regular folders.

Normal backups include original gallery photos. Imports accept backups up to 200 MB and keep existing items. If a gallery or its parent is deleted, More → Export last folder deletion backup includes its retained photos for recovery. This is local device storage, not cloud sync.

## Gantt chart folders (0.18)

Right-click a regular folder → Create → Gantt chart. Charts are a special folder type, aligned alongside notes and galleries with their own timeline icon. They can be renamed or dragged into another regular folder. Chart tasks save with folder data and are included in regular and folder-deletion backups.

Add tasks or one-date milestones, enter start/end dates and progress, and select dependencies in the task editor. Dependencies use finish-to-start relationships: a successor starts no earlier than the calendar day after every predecessor ends. Moving or extending a predecessor shifts affected successors later and preserves their duration; moving a predecessor earlier does not pull successors earlier. Circular dependencies are rejected.

Click a task name or double-click its bar to edit. Drag the bar to move dates or its edges to resize; milestones remain one date. Arrow keys on a focused bar move it one day; Enter opens its editor. Escape cancels a drag. Undo/Redo retains up to 50 chart edits for the current session. Deleting a task removes its dependency links and can be undone. Days, Weeks, and Months provide 30-, 90-, and 365-day timeline windows; arrows navigate periods and Today returns to the current date. Chart dates use calendar days, including weekends.

## To-do pages (0.19)

Right-click a regular folder → hover Create → To-do page. A to-do page is a distinct folder type with a checklist icon aligned alongside notes, galleries, and charts. It can be renamed or moved into another regular folder.

Type a task and press Enter or Add. Check tasks off, click their names to edit, and optionally set a due date. Filter All tasks, To do, or Completed; unfinished tasks appear first. Delete uses the small trash icon, with Undo/Redo available for up to 50 edits in the current session. Tasks, completion states, and due dates save automatically with the page and are included in normal and folder-deletion backups. Due dates are labels, not scheduled reminders.

## Bullet indentation (0.19.1)

Tab inside a bulleted or numbered list indents the current item or selected items to a nested level. Shift+Tab moves them back out; at the outermost level it returns the item to ordinary text. Formatting, saved nesting, and Undo/Redo are preserved. Outside lists, Tab continues to insert a literal tab for code indentation.

## Nested and reordered to-dos (0.20)

The + below the list creates a top-level task. A small + on each task creates a subtask. Click a task name to edit it. Drag to the top or bottom edge of another row to reorder; drop in its center to nest. The highlighted line or row indicates the destination. Drop onto the bottom + area to move a task back to the root at the end. Parents move with their descendants, and circular nesting is blocked. Escape cancels a drag.

Task order is now manual and stays unchanged when tasks are completed. Filters retain ancestor tasks for context. Completion is independent for each task and subtask. Deleting a parent deletes its subtasks, with Undo/Redo restoring the whole branch. Hierarchy and order survive reloads and backups; older tasks become top-level tasks.

## Empty starting workspace (0.21.1)

Fresh installations have no preloaded folders. Use + to create a note at the root, or New folder to organize your own folders. Drag a note onto All notes to move it back to the root. Empty, unchanged starter folders from older installations are removed on upgrade; populated, renamed, and custom folders are preserved. All folders can now be deleted; their notes move to Trash without creating a recovery folder. Version-5 backups support root notes and require 0.21.1 or newer to restore. Older backups remain importable.
