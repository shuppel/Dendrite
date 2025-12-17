/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Thoughtful App Company / Erikk Shupp. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/


/**
 * Cornell Notes data structures for code annotation
 */

/**
 * Anchor point for a note in code
 */
export interface NoteAnchor {
	/** Relative file path from workspace root */
	file: string;
	/** Optional line number (0-based) */
	line?: number;
	/** Optional symbol name (function, class, etc.) */
	symbol?: string;
}

/**
 * A Cornell-style note attached to code
 */
export interface CornellNote {
	/** Unique identifier */
	id: string;
	/** Where this note is attached */
	anchor: NoteAnchor;
	/** Keywords, concepts, questions (left column) */
	cue: string;
	/** Main notes content (right column, supports markdown) */
	content: string;
	/** Synthesized understanding (bottom section) */
	summary: string;
	/** Tags for organization */
	tags: string[];
	/** Creation timestamp */
	created: string;
	/** Last update timestamp */
	updated: string;
	/** Is this a personal (gitignored) note? */
	isPersonal: boolean;
}

/**
 * Notes storage file format
 */
export interface NotesFile {
	version: number;
	notes: CornellNote[];
}

/**
 * Note creation input
 */
export interface CreateNoteInput {
	anchor: NoteAnchor;
	cue?: string;
	content?: string;
	summary?: string;
	tags?: string[];
	isPersonal?: boolean;
}

/**
 * Note update input
 */
export interface UpdateNoteInput {
	cue?: string;
	content?: string;
	summary?: string;
	tags?: string[];
	anchor?: NoteAnchor;
}

/**
 * Filter options for querying notes
 */
export interface NoteFilter {
	file?: string;
	line?: number;
	symbol?: string;
	tag?: string;
	search?: string;
	isPersonal?: boolean;
}
