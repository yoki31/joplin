import Setting from '@joplin/lib/models/Setting';
import { Platform, TextStyle, ViewStyle } from 'react-native';
import { withDerivedColors, themeById } from '@joplin/lib/theme';
import { Theme as BaseTheme } from '@joplin/lib/themes/type';

const Color = require('color');

const baseStyle = {
	appearance: 'light',
	fontSize: 16,
	fontSizeLarge: 20,
	margin: 15, // No text and no interactive component should be within this margin
	itemMarginTop: 10,
	itemMarginBottom: 10,
	fontSizeSmaller: 14,
	disabledOpacity: 0.2,
	lineHeight: '1.6em',
	// The default, may be overridden in settings:
	noteViewerFontSize: 16,
};

export type ThemeStyle = BaseTheme & typeof baseStyle & {
	backgroundColorHover4: string;

	fontSize: number;
	fontSizeSmaller: number;
	marginRight: number;
	marginLeft: number;
	marginTop: number;
	marginBottom: number;
	borderRadius: number;
	icon: TextStyle;
	lineInput: ViewStyle;
	buttonRow: ViewStyle;
	normalText: TextStyle;
	urlText: TextStyle;
	headerStyle: TextStyle;
	headerWrapperStyle: ViewStyle;
	rootStyle: ViewStyle;
	hiddenRootStyle: ViewStyle;
	keyboardAppearance: 'light'|'dark';
};

const themeCache_: Record<string, ThemeStyle> = {};

function extraStyles(theme: BaseTheme) {
	const icon: TextStyle = {
		color: theme.color,
		fontSize: 30,
	};

	const lineInput: TextStyle = {
		color: theme.color,
		backgroundColor: theme.backgroundColor,
		borderBottomWidth: 1,
		borderColor: theme.dividerColor,
		paddingBottom: 0,
	};

	if (Platform.OS === 'ios') {
		delete lineInput.borderBottomWidth;
		delete lineInput.borderColor;
	}

	const buttonRow: ViewStyle = {
		flexDirection: 'row',
		borderTopWidth: 1,
		borderTopColor: theme.dividerColor,
		paddingTop: 10,
	};

	const fontSize = baseStyle.fontSize;
	const normalText: TextStyle = {
		color: theme.color,
		fontSize: fontSize,
	};

	const urlText: TextStyle = {
		color: theme.urlColor,
		fontSize,
	};

	const headerStyle: TextStyle = {
		color: theme.color,
		fontSize: fontSize * 1.2,
		fontWeight: 'bold',
	};

	const headerWrapperStyle: TextStyle = {
		backgroundColor: theme.headerBackgroundColor,
	};

	const rootStyle: ViewStyle = {
		flex: 1,
		backgroundColor: theme.backgroundColor,
	};

	const hiddenRootStyle: ViewStyle = {
		...rootStyle,
		flex: 0.001, // This is a bit of a hack but it seems to work fine - it makes the component invisible but without unmounting it
	};

	return {
		marginRight: baseStyle.margin,
		marginLeft: baseStyle.margin,
		marginTop: baseStyle.margin,
		marginBottom: baseStyle.margin,

		icon,
		lineInput,
		buttonRow,
		normalText,
		urlText,
		headerStyle,
		headerWrapperStyle,
		rootStyle,
		hiddenRootStyle,

		keyboardAppearance: theme.appearance,
		color5: theme.color5 ?? theme.backgroundColor4,
		backgroundColor5: theme.backgroundColor5 ?? theme.color4,

		backgroundColorHover4: Color(theme.color4).alpha(0.12).rgb().string(),
		borderRadius: 24,
	};
}

function editorFont(fontId: number) {
	// IMPORTANT: The font mapping must match the one in Setting.js
	const fonts: Record<number, string|null> = {
		[Setting.FONT_DEFAULT]: null,
		[Setting.FONT_MENLO]: 'Menlo',
		[Setting.FONT_COURIER_NEW]: 'Courier New',
		[Setting.FONT_AVENIR]: 'Avenir',
		[Setting.FONT_MONOSPACE]: 'monospace',
	};
	if (!fontId) {
		// console.warn('Editor font not set! Falling back to default font."');
		fontId = Setting.FONT_DEFAULT;
	}
	return fonts[fontId];
}

function themeStyle(theme: number) {
	if (!theme) {
		console.warn('Theme not set! Defaulting to Light theme.');
		theme = Setting.THEME_LIGHT;
	}

	const cacheKey = [theme].join('-');
	if (themeCache_[cacheKey]) return themeCache_[cacheKey];

	const baseTheme = themeById(theme);
	const output: ThemeStyle = {
		...baseStyle,
		...baseTheme,
		...withDerivedColors(baseTheme),
		...extraStyles(baseTheme),
	};
	themeCache_[cacheKey] = output;
	return themeCache_[cacheKey];
}

export { themeStyle, editorFont };
