import joplin from 'api';
import { ItemFlow, OnChangeEvent, OnChangeHandler } from 'api/noteListType';

const thumbnailCache_:Record<string, string> = {};

// This renderer displays the notes top to bottom. It's a minimal example that
// displays the note title, updated time and a preview of the content. For a
// full renderer, it's recommended to also handle whether the notes is a regular
// note or to-do (in which case a checkbox should be displayed).
const registerSimpleTopToBottomRenderer = async () => {
	await joplin.views.noteList.registerRenderer({
		id: 'simpleTopToBottom',

		label: async () => 'Simple top-to-bottom renderer',

		flow: ItemFlow.TopToBottom,
	
		itemSize: {
			width: 0,
			height: 100,
		},
	
		dependencies: [
			'item.selected',
			'note.title',
			'note.body',
			'note.user_updated_time',
		],

		itemCss: // css
			`
			> .content {
				width: 100%;
				box-sizing: border-box;
				padding: 10px;
			}

			> .content p {
				margin-bottom: 7px;
			}

			>.content > .title {
				font-weight: bold;
			}

			>.content > .body {
				opacity: 0.7;
			}

			> .content.-selected {
				border: 1px solid var(--joplin-color);
			}
			`,
	
		itemTemplate: // html
			`
			<div class="content {{#item.selected}}-selected{{/item.selected}}">
				<p class="title">{{note.title}}</p>
				<p class="date">{{updatedTime}}</p>
				<p class="body">{{noteBody}}</p>
			</div>
		`,
	
		onRenderNote: async (props: any) => {
			return {
				...props,
				noteBody: props.note.body.substring(0, 100),
				updatedTime: new Date(props.note.user_updated_time).toLocaleString(),
			}
		},
	});
}

// This renderer displays the notes from left to right - it takes the first
// resource in the note, if any, and displays it as a thumbnail for the note. If
// no thumbnail is available, it displays the note title.
const registerSimpleLeftToRightRenderer = async() => {
	await joplin.views.noteList.registerRenderer({
		id: 'simpleLeftToRight',

		label: async () => 'Simple left-to-right renderer',

		flow: ItemFlow.LeftToRight,
	
		itemSize: {
			width: 150,
			height: 150,
		},
	
		dependencies: [
			'note.id',
			'item.selected',
			'note.title',
			'note.body',
		],

		itemCss: // css
			`
			> .content {
				display: flex;
				align-items: center;
				justify-content: center;
				width: 100%;
				box-sizing: border-box;
				padding: 10px;
				border: 1px solid var(--joplin-divider-color);

				> .thumbnail {
					display: flex;
					max-width: 80px;
					max-height: 80px;
				}
			}

			> .content.-selected {
				border: 1px solid var(--joplin-color);
			}
			`,
	
		itemTemplate: // html
			`
			<div class="content {{#item.selected}}-selected{{/item.selected}}">
				{{#thumbnailFilePath}}
					<img class="thumbnail" src="file://{{thumbnailFilePath}}"/>
				{{/thumbnailFilePath}}
				{{^thumbnailFilePath}}
					{{{note.title}}}
				{{/thumbnailFilePath}}
			</div>
		`,
	
		onRenderNote: async (props: any) => {
			const resources = await joplin.data.get(['notes', props.note.id, 'resources']);
			const resource = resources.items.length ? resources.items[0] : null;
			let thumbnailFilePath = '';

			if (resource) {
				const existingFilePath = thumbnailCache_[resource.id];
				if (existingFilePath) {
					thumbnailFilePath = existingFilePath;
				} else {
					const imageHandle = await joplin.imaging.createFromResource(resource.id);
					const resizedImageHandle =  await joplin.imaging.resize(imageHandle, { width: 80 });
					thumbnailFilePath = (await joplin.plugins.dataDir()) + '/thumb_' + resource.id + '.jpg';
					await joplin.imaging.toJpgFile(resizedImageHandle, thumbnailFilePath, 70);
					await joplin.imaging.free(imageHandle);
					await joplin.imaging.free(resizedImageHandle);
					thumbnailCache_[resource.id] = thumbnailFilePath;
				}
			}
			
			return {
				thumbnailFilePath,
				...props
			};
		},
	});
}

// This renderer displays an editable text input to change the note title
// directly from the note list.
const registerBuildInEditorRenderer = async () => {
	await joplin.views.noteList.registerRenderer({
		id: 'buildInEditor',

		label: async () => 'Viewer with editor',

		flow: ItemFlow.TopToBottom,
	
		itemSize: {
			width: 0,
			height: 34,
		},
	
		dependencies: [
			'item.selected',
			'note.title',
		],

		itemCss: // css
			`
			> .content {
				display: flex;
				align-items: center;
				width: 100%;
				box-sizing: border-box;
				padding: 10px;
			}

			> .content > input {
				width: 100%;
			}

			> .content.-selected {
				border: 1px solid var(--joplin-color);
			}
			`,
	
		itemTemplate: // html
			`
			<div class="content {{#item.selected}}-selected{{/item.selected}}">
				<input data-id="noteTitleInput" type="text" value="{{note.title}}" />
			</div>
		`,
	
		onRenderNote: async (props: any) => {
			return props;
		},

		onChange: async (event: OnChangeEvent): Promise<void> => {
			if (event.elementId === 'noteTitleInput') {
				await joplin.data.put(['notes', event.noteId], null, { title: event.value });	
			}
		},
	});
}

joplin.plugins.register({
	onStart: async function() {
		await registerSimpleTopToBottomRenderer();
		await registerSimpleLeftToRightRenderer();	
		await registerBuildInEditorRenderer();		
	},
});
