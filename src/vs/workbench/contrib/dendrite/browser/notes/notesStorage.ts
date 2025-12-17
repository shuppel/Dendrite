/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { URI } from '../../../../../base/common/uri.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { CornellNote, NotesFile } from './noteTypes.js';
import { VSBuffer } from '../../../../../base/common/buffer.js';

const NOTES_VERSION = 1;
const NOTES_FILENAME = 'notes.json';
const DENDRITE_FOLDER = '.dendrite';
const PERSONAL_FOLDER = 'personal';

/**
 * Handles reading/writing notes to .dendrite/ folder
 */
export class NotesStorage {
	private workspaceRoot: URI;

	constructor(
		workspaceRoot: URI,
		private readonly fileService: IFileService
	) {
		this.workspaceRoot = workspaceRoot;
	}

	/**
	 * Get the path to the notes file
	 */
	private getNotesPath(personal: boolean): URI {
		if (personal) {
			return URI.joinPath(this.workspaceRoot, DENDRITE_FOLDER, PERSONAL_FOLDER, NOTES_FILENAME);
		}
		return URI.joinPath(this.workspaceRoot, DENDRITE_FOLDER, NOTES_FILENAME);
	}

	/**
	 * Get the path to .gitignore for the personal folder
	 */
	private getGitignorePath(): URI {
		return URI.joinPath(this.workspaceRoot, DENDRITE_FOLDER, PERSONAL_FOLDER, '.gitignore');
	}

	/**
	 * Ensure the .dendrite folder structure exists
	 */
	async ensureFolderStructure(): Promise<void> {
		const dendriteFolder = URI.joinPath(this.workspaceRoot, DENDRITE_FOLDER);
		const personalFolder = URI.joinPath(dendriteFolder, PERSONAL_FOLDER);

		try {
			// Create .dendrite folder
			await this.fileService.createFolder(dendriteFolder);

			// Create personal folder
			await this.fileService.createFolder(personalFolder);

			// Create .gitignore in personal folder
			const gitignorePath = this.getGitignorePath();
			const exists = await this.fileService.exists(gitignorePath);
			if (!exists) {
				const content = '# Personal notes - not tracked in git\n*\n';
				await this.fileService.writeFile(gitignorePath, VSBuffer.fromString(content));
			}
		} catch (error) {
			console.error('Error creating folder structure:', error);
		}
	}

	/**
	 * Load all notes (shared + personal)
	 */
	async loadAllNotes(): Promise<CornellNote[]> {
		const shared = await this.loadNotes(false);
		const personal = await this.loadNotes(true);
		return [...shared, ...personal];
	}

	/**
	 * Load notes from file
	 */
	async loadNotes(personal: boolean): Promise<CornellNote[]> {
		const path = this.getNotesPath(personal);

		try {
			const exists = await this.fileService.exists(path);
			if (!exists) {
				return [];
			}

			const content = await this.fileService.readFile(path);
			const json = content.value.toString();
			const data = JSON.parse(json) as NotesFile;

			// Mark personal notes
			if (personal) {
				data.notes.forEach(n => n.isPersonal = true);
			}

			return data.notes;
		} catch (error) {
			console.error(`Error loading notes from ${path.toString()}:`, error);
			return [];
		}
	}

	/**
	 * Save notes to file
	 */
	async saveNotes(notes: CornellNote[], personal: boolean): Promise<void> {
		await this.ensureFolderStructure();

		const path = this.getNotesPath(personal);
		const filteredNotes = notes.filter(n => n.isPersonal === personal);

		const data: NotesFile = {
			version: NOTES_VERSION,
			notes: filteredNotes.map(n => ({
				...n,
				// Don't persist the isPersonal flag - it's determined by file location
				isPersonal: undefined as any
			}))
		};

		// Clean up undefined
		data.notes.forEach(n => delete (n as any).isPersonal);

		const json = JSON.stringify(data, null, 2);
		await this.fileService.writeFile(path, VSBuffer.fromString(json));
	}

	/**
	 * Save all notes (splits by personal flag)
	 */
	async saveAllNotes(notes: CornellNote[]): Promise<void> {
		const shared = notes.filter(n => !n.isPersonal);
		const personal = notes.filter(n => n.isPersonal);

		await this.saveNotes(shared, false);
		await this.saveNotes(personal, true);
	}

	/**
	 * Delete the notes files
	 */
	async deleteNotes(personal: boolean): Promise<void> {
		const path = this.getNotesPath(personal);
		try {
			const exists = await this.fileService.exists(path);
			if (exists) {
				await this.fileService.del(path);
			}
		} catch (error) {
			console.error(`Error deleting notes at ${path.toString()}:`, error);
		}
	}
}
