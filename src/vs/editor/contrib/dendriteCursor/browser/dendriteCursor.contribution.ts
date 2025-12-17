/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Thoughtful App Company / Erikk Shupp. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../base/common/lifecycle.js';
import { ICodeEditor } from '../../../browser/editorBrowser.js';
import { IEditorContribution } from '../../../common/editorCommon.js';
import { registerEditorContribution } from '../../../browser/editorExtensions.js';
import { SmoothCursorController } from './smoothCursor.js';

/**
 * Editor contribution that enables smooth cursor movement
 */
class DendriteSmoothCursorContribution extends Disposable implements IEditorContribution {
	public static readonly ID = 'editor.contrib.dendriteSmoothCursor';
	
	private smoothCursorController: SmoothCursorController | null = null;

	constructor(private readonly editor: ICodeEditor) {
		super();
		this.smoothCursorController = this._register(new SmoothCursorController(editor));
	}
}

// Register the contribution
registerEditorContribution(
	DendriteSmoothCursorContribution.ID,
	DendriteSmoothCursorContribution,
	0 /* EditorContributionInstantiation.BeforeFirstInteraction */
);
