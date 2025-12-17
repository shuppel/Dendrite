/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Thoughtful App Company / Erikk Shupp. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/


import { IViewletViewOptions } from '../../../../browser/parts/views/viewsViewlet.js';
import { ViewPane } from '../../../../browser/parts/views/viewPane.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { IViewDescriptorService } from '../../../../common/views.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../../platform/contextview/browser/contextView.js';
import { IKeybindingService } from '../../../../../platform/keybinding/common/keybinding.js';
import { IOpenerService } from '../../../../../platform/opener/common/opener.js';
import { IThemeService } from '../../../../../platform/theme/common/themeService.js';
import { IHoverService } from '../../../../../platform/hover/browser/hover.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { IWorkspaceContextService } from '../../../../../platform/workspace/common/workspace.js';
import * as DOM from '../../../../../base/browser/dom.js';
import { CornellNote } from './noteTypes.js';
import { getNotesService, NotesService } from './notesService.js';

/**
 * Cornell Notes Panel - selectable left sidebar with Cornell note-taking format
 * 
 * Layout:
 * ┌─────────────────────────────────┐
 * │ Notes List (selectable)        │
 * │ ├── File: main.ts              │
 * │ │   └── Note: "async patterns" │
 * │ └── File: utils.ts             │
 * │     └── Note: "error handling" │
 * ├─────────────────────────────────┤
 * │ Cornell Note Editor            │
 * │ ┌───────┬───────────────────┐  │
 * │ │ Cue   │ Notes             │  │
 * │ │       │                   │  │
 * │ │       │                   │  │
 * │ ├───────┴───────────────────┤  │
 * │ │ Summary                   │  │
 * │ └───────────────────────────┘  │
 * └─────────────────────────────────┘
 */
export class CornellNotePanel extends ViewPane {
	static readonly ID = 'dendrite.cornellNotes';

	private container: HTMLElement | undefined;
	private notesList: HTMLElement | undefined;
	private editorContainer: HTMLElement | undefined;
	private cueInput: HTMLTextAreaElement | undefined;
	private contentInput: HTMLTextAreaElement | undefined;
	private summaryInput: HTMLTextAreaElement | undefined;

	private notesService: NotesService | undefined;
	private selectedNote: CornellNote | undefined;

	constructor(
		options: IViewletViewOptions,
		@IKeybindingService keybindingService: IKeybindingService,
		@IContextMenuService contextMenuService: IContextMenuService,
		@IConfigurationService configurationService: IConfigurationService,
		@IContextKeyService contextKeyService: IContextKeyService,
		@IViewDescriptorService viewDescriptorService: IViewDescriptorService,
		@IInstantiationService instantiationService: IInstantiationService,
		@IOpenerService openerService: IOpenerService,
		@IThemeService themeService: IThemeService,
		@IHoverService hoverService: IHoverService,
		@IFileService private readonly fileService: IFileService,
		@IWorkspaceContextService private readonly workspaceService: IWorkspaceContextService,
	) {
		super(options, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, hoverService);
	}

	protected override renderBody(container: HTMLElement): void {
		super.renderBody(container);
		this.container = container;
		this.container.classList.add('dendrite-cornell-panel');

		// Initialize notes service
		this.notesService = getNotesService(this.fileService, this.workspaceService);
		this.notesService.initialize();

		// Create layout
		this.renderLayout();

		// Subscribe to changes
		this._register(this.notesService.onDidChangeNotes(() => this.refreshNotesList()));
		this._register(this.notesService.onDidSelectNote(note => this.onNoteSelected(note)));
	}

	private renderLayout(): void {
		if (!this.container) return;

		// Notes list section (top)
		const listSection = DOM.append(this.container, DOM.$('.notes-list-section'));
		this.renderNotesListHeader(listSection);
		this.notesList = DOM.append(listSection, DOM.$('.notes-list'));
		this.refreshNotesList();

		// Divider
		DOM.append(this.container, DOM.$('.section-divider'));

		// Cornell editor section (bottom)
		this.editorContainer = DOM.append(this.container, DOM.$('.cornell-editor-section'));
		this.renderCornellEditor();
	}

	private renderNotesListHeader(container: HTMLElement): void {
		const header = DOM.append(container, DOM.$('.notes-list-header'));

		const title = DOM.append(header, DOM.$('span.title'));
		title.textContent = 'Notes';

		const addButton = DOM.append(header, DOM.$('button.add-note-btn'));
		addButton.textContent = '+';
		addButton.title = 'Add Note';
		addButton.addEventListener('click', () => this.createNewNote());
	}

	private refreshNotesList(): void {
		if (!this.notesList || !this.notesService) return;
		DOM.clearNode(this.notesList);

		const notes = this.notesService.getAllNotes();

		// Group by file
		const notesByFile = new Map<string, CornellNote[]>();
		for (const note of notes) {
			const file = note.anchor.file || '(unattached)';
			const existing = notesByFile.get(file) || [];
			existing.push(note);
			notesByFile.set(file, existing);
		}

		// Render grouped notes
		for (const [file, fileNotes] of notesByFile) {
			const fileGroup = DOM.append(this.notesList, DOM.$('.file-group'));

			const fileHeader = DOM.append(fileGroup, DOM.$('.file-header'));
			fileHeader.textContent = this.getFileName(file);
			fileHeader.title = file;

			for (const note of fileNotes) {
				const noteItem = this.createNoteListItem(note);
				fileGroup.appendChild(noteItem);
			}
		}

		// Empty state
		if (notes.length === 0) {
			const empty = DOM.append(this.notesList, DOM.$('.empty-state'));
			empty.innerHTML = `
				<p>No notes yet.</p>
				<p>Click <strong>+</strong> to create a note, or right-click on code to add a note.</p>
			`;
		}
	}

	private createNoteListItem(note: CornellNote): HTMLElement {
		const item = DOM.$('.note-item');
		item.dataset.noteId = note.id;

		if (this.selectedNote?.id === note.id) {
			item.classList.add('selected');
		}

		const icon = DOM.append(item, DOM.$('.note-icon'));
		icon.textContent = note.isPersonal ? '🔒' : '📝';

		const content = DOM.append(item, DOM.$('.note-preview'));
		content.textContent = note.cue || note.content.substring(0, 50) || '(empty note)';

		if (note.anchor.line !== undefined) {
			const line = DOM.append(item, DOM.$('.note-line'));
			line.textContent = `L${note.anchor.line + 1}`;
		}

		item.addEventListener('click', () => {
			this.notesService?.selectNote(note.id);
		});

		return item;
	}

	private renderCornellEditor(): void {
		if (!this.editorContainer) return;
		DOM.clearNode(this.editorContainer);

		const header = DOM.append(this.editorContainer, DOM.$('.editor-header'));
		header.textContent = this.selectedNote ? 'Edit Note' : 'No Note Selected';

		if (this.selectedNote) {
			// Cornell layout
			const cornellGrid = DOM.append(this.editorContainer, DOM.$('.cornell-grid'));

			// Cue column (left)
			const cueSection = DOM.append(cornellGrid, DOM.$('.cue-section'));
			const cueLabel = DOM.append(cueSection, DOM.$('label'));
			cueLabel.textContent = 'Cue / Keywords';
			this.cueInput = DOM.append(cueSection, DOM.$('textarea.cue-input')) as HTMLTextAreaElement;
			this.cueInput.placeholder = 'Keywords, concepts, questions...';
			this.cueInput.value = this.selectedNote.cue;
			this.cueInput.addEventListener('change', () => this.saveCurrentNote());

			// Content column (right)
			const contentSection = DOM.append(cornellGrid, DOM.$('.content-section'));
			const contentLabel = DOM.append(contentSection, DOM.$('label'));
			contentLabel.textContent = 'Notes';
			this.contentInput = DOM.append(contentSection, DOM.$('textarea.content-input')) as HTMLTextAreaElement;
			this.contentInput.placeholder = 'Your notes, code examples, explanations...';
			this.contentInput.value = this.selectedNote.content;
			this.contentInput.addEventListener('change', () => this.saveCurrentNote());

			// Summary section (bottom)
			const summarySection = DOM.append(this.editorContainer, DOM.$('.summary-section'));
			const summaryLabel = DOM.append(summarySection, DOM.$('label'));
			summaryLabel.textContent = 'Summary';
			this.summaryInput = DOM.append(summarySection, DOM.$('textarea.summary-input')) as HTMLTextAreaElement;
			this.summaryInput.placeholder = 'Synthesize your understanding...';
			this.summaryInput.value = this.selectedNote.summary;
			this.summaryInput.addEventListener('change', () => this.saveCurrentNote());

			// Actions
			const actions = DOM.append(this.editorContainer, DOM.$('.note-actions'));

			const deleteBtn = DOM.append(actions, DOM.$('button.delete-btn'));
			deleteBtn.textContent = 'Delete';
			deleteBtn.addEventListener('click', () => this.deleteCurrentNote());

			const personalToggle = DOM.append(actions, DOM.$('label.personal-toggle'));
			const checkbox = DOM.append(personalToggle, DOM.$('input')) as HTMLInputElement;
			checkbox.type = 'checkbox';
			checkbox.checked = this.selectedNote.isPersonal;
			checkbox.addEventListener('change', () => this.togglePersonal(checkbox.checked));
			DOM.append(personalToggle, document.createTextNode(' Personal (gitignored)'));
		} else {
			const placeholder = DOM.append(this.editorContainer, DOM.$('.no-selection'));
			placeholder.textContent = 'Select a note from the list above, or create a new one.';
		}
	}

	private onNoteSelected(note: CornellNote | undefined): void {
		this.selectedNote = note;
		this.renderCornellEditor();

		// Update list selection
		if (this.notesList) {
			const items = this.notesList.querySelectorAll('.note-item');
			items.forEach(item => {
				item.classList.toggle('selected', (item as HTMLElement).dataset.noteId === note?.id);
			});
		}
	}

	private async createNewNote(): Promise<void> {
		if (!this.notesService) return;

		// Create with default anchor (can be updated later)
		const note = await this.notesService.createNote({
			anchor: { file: '' },
			cue: '',
			content: '',
			summary: ''
		});

		this.notesService.selectNote(note.id);
	}

	private async saveCurrentNote(): Promise<void> {
		if (!this.notesService || !this.selectedNote) return;

		await this.notesService.updateNote(this.selectedNote.id, {
			cue: this.cueInput?.value || '',
			content: this.contentInput?.value || '',
			summary: this.summaryInput?.value || ''
		});
	}

	private async deleteCurrentNote(): Promise<void> {
		if (!this.notesService || !this.selectedNote) return;

		const confirmed = true; // TODO: Add confirmation dialog
		if (confirmed) {
			await this.notesService.deleteNote(this.selectedNote.id);
		}
	}

	private async togglePersonal(isPersonal: boolean): Promise<void> {
		if (!this.notesService || !this.selectedNote) return;

		// Need to recreate note with new personal flag
		const oldNote = this.selectedNote;
		await this.notesService.deleteNote(oldNote.id);

		const newNote = await this.notesService.createNote({
			anchor: oldNote.anchor,
			cue: oldNote.cue,
			content: oldNote.content,
			summary: oldNote.summary,
			tags: oldNote.tags,
			isPersonal
		});

		this.notesService.selectNote(newNote.id);
	}

	private getFileName(path: string): string {
		if (!path) return '(unattached)';
		const parts = path.split('/');
		return parts[parts.length - 1];
	}

	protected override layoutBody(height: number, width: number): void {
		super.layoutBody(height, width);
	}
}

/**
 * CSS for Cornell Notes panel
 */
export const cornellNotePanelStyles = `
.dendrite-cornell-panel {
	display: flex;
	flex-direction: column;
	height: 100%;
	font-size: 13px;
}

.dendrite-cornell-panel .notes-list-section {
	flex: 0 0 auto;
	max-height: 40%;
	overflow-y: auto;
	border-bottom: 1px solid var(--vscode-panel-border);
}

.dendrite-cornell-panel .notes-list-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 8px;
	font-weight: bold;
	background: var(--vscode-sideBarSectionHeader-background);
}

.dendrite-cornell-panel .add-note-btn {
	background: none;
	border: none;
	color: var(--vscode-button-foreground);
	cursor: pointer;
	font-size: 18px;
	padding: 2px 8px;
}

.dendrite-cornell-panel .add-note-btn:hover {
	background: var(--vscode-button-hoverBackground);
}

.dendrite-cornell-panel .notes-list {
	padding: 4px;
}

.dendrite-cornell-panel .file-group {
	margin-bottom: 8px;
}

.dendrite-cornell-panel .file-header {
	padding: 4px 8px;
	font-size: 11px;
	color: var(--vscode-descriptionForeground);
	text-transform: uppercase;
}

.dendrite-cornell-panel .note-item {
	display: flex;
	align-items: center;
	padding: 6px 8px;
	cursor: pointer;
	gap: 8px;
}

.dendrite-cornell-panel .note-item:hover {
	background: var(--vscode-list-hoverBackground);
}

.dendrite-cornell-panel .note-item.selected {
	background: var(--vscode-list-activeSelectionBackground);
	color: var(--vscode-list-activeSelectionForeground);
}

.dendrite-cornell-panel .note-icon {
	flex-shrink: 0;
}

.dendrite-cornell-panel .note-preview {
	flex: 1;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.dendrite-cornell-panel .note-line {
	font-size: 11px;
	color: var(--vscode-descriptionForeground);
}

.dendrite-cornell-panel .section-divider {
	height: 4px;
	background: var(--vscode-panel-border);
}

.dendrite-cornell-panel .cornell-editor-section {
	flex: 1;
	overflow-y: auto;
	padding: 8px;
	display: flex;
	flex-direction: column;
}

.dendrite-cornell-panel .editor-header {
	font-weight: bold;
	margin-bottom: 8px;
}

.dendrite-cornell-panel .cornell-grid {
	display: grid;
	grid-template-columns: 1fr 2fr;
	gap: 8px;
	flex: 1;
	min-height: 150px;
}

.dendrite-cornell-panel .cue-section,
.dendrite-cornell-panel .content-section {
	display: flex;
	flex-direction: column;
}

.dendrite-cornell-panel .cue-section label,
.dendrite-cornell-panel .content-section label,
.dendrite-cornell-panel .summary-section label {
	font-size: 11px;
	color: var(--vscode-descriptionForeground);
	margin-bottom: 4px;
	text-transform: uppercase;
}

.dendrite-cornell-panel textarea {
	flex: 1;
	min-height: 80px;
	resize: none;
	background: var(--vscode-input-background);
	color: var(--vscode-input-foreground);
	border: 1px solid var(--vscode-input-border);
	padding: 8px;
	font-family: inherit;
	font-size: 13px;
}

.dendrite-cornell-panel textarea:focus {
	outline: 1px solid var(--vscode-focusBorder);
}

.dendrite-cornell-panel .summary-section {
	margin-top: 8px;
	border-top: 2px solid var(--vscode-panel-border);
	padding-top: 8px;
}

.dendrite-cornell-panel .summary-section textarea {
	min-height: 60px;
}

.dendrite-cornell-panel .note-actions {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-top: 8px;
	padding-top: 8px;
	border-top: 1px solid var(--vscode-panel-border);
}

.dendrite-cornell-panel .delete-btn {
	background: var(--vscode-button-secondaryBackground);
	color: var(--vscode-button-secondaryForeground);
	border: none;
	padding: 4px 12px;
	cursor: pointer;
}

.dendrite-cornell-panel .delete-btn:hover {
	background: var(--vscode-button-secondaryHoverBackground);
}

.dendrite-cornell-panel .personal-toggle {
	display: flex;
	align-items: center;
	gap: 4px;
	font-size: 12px;
	cursor: pointer;
}

.dendrite-cornell-panel .no-selection {
	color: var(--vscode-descriptionForeground);
	text-align: center;
	padding: 24px;
}

.dendrite-cornell-panel .empty-state {
	color: var(--vscode-descriptionForeground);
	text-align: center;
	padding: 16px;
	font-size: 12px;
}
`;
