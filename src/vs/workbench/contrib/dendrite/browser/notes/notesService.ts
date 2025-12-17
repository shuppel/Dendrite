/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Thoughtful App Company / Erikk Shupp. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/


import { Disposable } from '../../../../../base/common/lifecycle.js';
import { Emitter, Event } from '../../../../../base/common/event.js';
import { URI } from '../../../../../base/common/uri.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { IWorkspaceContextService } from '../../../../../platform/workspace/common/workspace.js';
import { CornellNote, CreateNoteInput, UpdateNoteInput, NoteFilter, NoteAnchor } from './noteTypes.js';
import { NotesStorage } from './notesStorage.js';

/**
 * Service for managing Cornell Notes
 */
export class NotesService extends Disposable {
	private _onDidChangeNotes = this._register(new Emitter<void>());
	readonly onDidChangeNotes: Event<void> = this._onDidChangeNotes.event;

	private _onDidSelectNote = this._register(new Emitter<CornellNote | undefined>());
	readonly onDidSelectNote: Event<CornellNote | undefined> = this._onDidSelectNote.event;

	private notes: CornellNote[] = [];
	private storage: NotesStorage | undefined;
	private selectedNoteId: string | undefined;
	private initialized = false;

	constructor(
		@IFileService private readonly fileService: IFileService,
		@IWorkspaceContextService private readonly workspaceService: IWorkspaceContextService
	) {
		super();
	}

	/**
	 * Initialize the service with workspace root
	 */
	async initialize(): Promise<void> {
		if (this.initialized) return;

		const folders = this.workspaceService.getWorkspace().folders;
		if (folders.length === 0) {
			console.warn('No workspace folder found');
			return;
		}

		const workspaceRoot = folders[0].uri;
		this.storage = new NotesStorage(workspaceRoot, this.fileService);

		await this.loadNotes();
		this.initialized = true;
	}

	/**
	 * Load notes from storage
	 */
	private async loadNotes(): Promise<void> {
		if (!this.storage) return;

		try {
			this.notes = await this.storage.loadAllNotes();
			this._onDidChangeNotes.fire();
		} catch (error) {
			console.error('Error loading notes:', error);
		}
	}

	/**
	 * Save notes to storage
	 */
	private async saveNotes(): Promise<void> {
		if (!this.storage) return;

		try {
			await this.storage.saveAllNotes(this.notes);
		} catch (error) {
			console.error('Error saving notes:', error);
		}
	}

	/**
	 * Get all notes
	 */
	getAllNotes(): CornellNote[] {
		return [...this.notes];
	}

	/**
	 * Get notes matching a filter
	 */
	getNotes(filter: NoteFilter): CornellNote[] {
		return this.notes.filter(note => {
			if (filter.file && note.anchor.file !== filter.file) return false;
			if (filter.line !== undefined && note.anchor.line !== filter.line) return false;
			if (filter.symbol && note.anchor.symbol !== filter.symbol) return false;
			if (filter.tag && !note.tags.includes(filter.tag)) return false;
			if (filter.isPersonal !== undefined && note.isPersonal !== filter.isPersonal) return false;
			if (filter.search) {
				const searchLower = filter.search.toLowerCase();
				const matches =
					note.cue.toLowerCase().includes(searchLower) ||
					note.content.toLowerCase().includes(searchLower) ||
					note.summary.toLowerCase().includes(searchLower) ||
					note.tags.some(t => t.toLowerCase().includes(searchLower));
				if (!matches) return false;
			}
			return true;
		});
	}

	/**
	 * Get notes for a specific file
	 */
	getNotesForFile(file: string): CornellNote[] {
		return this.getNotes({ file });
	}

	/**
	 * Get notes for a specific line
	 */
	getNotesForLine(file: string, line: number): CornellNote[] {
		return this.getNotes({ file, line });
	}

	/**
	 * Get note by ID
	 */
	getNoteById(id: string): CornellNote | undefined {
		return this.notes.find(n => n.id === id);
	}

	/**
	 * Create a new note
	 */
	async createNote(input: CreateNoteInput): Promise<CornellNote> {
		const now = new Date().toISOString();
		const note: CornellNote = {
			id: this.generateId(),
			anchor: input.anchor,
			cue: input.cue || '',
			content: input.content || '',
			summary: input.summary || '',
			tags: input.tags || [],
			created: now,
			updated: now,
			isPersonal: input.isPersonal || false
		};

		this.notes.push(note);
		await this.saveNotes();
		this._onDidChangeNotes.fire();

		return note;
	}

	/**
	 * Update an existing note
	 */
	async updateNote(id: string, input: UpdateNoteInput): Promise<CornellNote | undefined> {
		const note = this.notes.find(n => n.id === id);
		if (!note) return undefined;

		if (input.cue !== undefined) note.cue = input.cue;
		if (input.content !== undefined) note.content = input.content;
		if (input.summary !== undefined) note.summary = input.summary;
		if (input.tags !== undefined) note.tags = input.tags;
		if (input.anchor !== undefined) note.anchor = input.anchor;
		note.updated = new Date().toISOString();

		await this.saveNotes();
		this._onDidChangeNotes.fire();

		return note;
	}

	/**
	 * Delete a note
	 */
	async deleteNote(id: string): Promise<boolean> {
		const index = this.notes.findIndex(n => n.id === id);
		if (index === -1) return false;

		this.notes.splice(index, 1);
		await this.saveNotes();
		this._onDidChangeNotes.fire();

		if (this.selectedNoteId === id) {
			this.selectedNoteId = undefined;
			this._onDidSelectNote.fire(undefined);
		}

		return true;
	}

	/**
	 * Select a note
	 */
	selectNote(id: string | undefined): void {
		this.selectedNoteId = id;
		const note = id ? this.getNoteById(id) : undefined;
		this._onDidSelectNote.fire(note);
	}

	/**
	 * Get selected note
	 */
	getSelectedNote(): CornellNote | undefined {
		return this.selectedNoteId ? this.getNoteById(this.selectedNoteId) : undefined;
	}

	/**
	 * Get all unique tags
	 */
	getAllTags(): string[] {
		const tags = new Set<string>();
		for (const note of this.notes) {
			for (const tag of note.tags) {
				tags.add(tag);
			}
		}
		return Array.from(tags).sort();
	}

	/**
	 * Generate a unique ID
	 */
	private generateId(): string {
		return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
	}
}

// Singleton instance
let notesServiceInstance: NotesService | null = null;

export function getNotesService(
	fileService: IFileService,
	workspaceService: IWorkspaceContextService
): NotesService {
	if (!notesServiceInstance) {
		notesServiceInstance = new NotesService(fileService, workspaceService);
	}
	return notesServiceInstance;
}
