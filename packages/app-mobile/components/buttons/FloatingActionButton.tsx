const React = require('react');
import { useState, useCallback, useMemo } from 'react';
import { FAB, Portal } from 'react-native-paper';
import { _ } from '@joplin/lib/locale';
import { Dispatch } from 'redux';
import { Platform, View, ViewStyle } from 'react-native';
import shim from '@joplin/lib/shim';
import AccessibleWebMenu from '../accessibility/AccessibleModalMenu';
const Icon = require('react-native-vector-icons/Ionicons').default;

// eslint-disable-next-line no-undef -- Don't know why it says React is undefined when it's defined above
type FABGroupProps = React.ComponentProps<typeof FAB.Group>;

type OnButtonPress = ()=> void;
interface ButtonSpec {
	icon: string;
	label: string;
	color?: string;
	onPress?: OnButtonPress;
}

interface ActionButtonProps {
	buttons?: ButtonSpec[];

	// If not given, an "add" button will be used.
	mainButton?: ButtonSpec;
	dispatch: Dispatch;
}

const defaultOnPress = () => {};

// Returns a render function compatible with React Native Paper.
const getIconRenderFunction = (iconName: string) => {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	return (props: any) => <Icon name={iconName} {...props} />;
};

const useIcon = (iconName: string) => {
	return useMemo(() => {
		return getIconRenderFunction(iconName);
	}, [iconName]);
};

const FloatingActionButton = (props: ActionButtonProps) => {
	const [open, setOpen] = useState(false);
	const onMenuToggled: FABGroupProps['onStateChange'] = useCallback(state => {
		props.dispatch({
			type: 'SIDE_MENU_CLOSE',
		});
		setOpen(state.open);
	}, [setOpen, props.dispatch]);

	const actions = useMemo(() => (props.buttons ?? []).map(button => {
		return {
			...button,
			icon: getIconRenderFunction(button.icon),
			onPress: button.onPress ?? defaultOnPress,
		};
	}), [props.buttons]);

	const closedIcon = useIcon(props.mainButton?.icon ?? 'add');
	const openIcon = useIcon('close');

	// To work around an Android accessibility bug, we decrease the
	// size of the container for the FAB. According to the documentation for
	// RN Paper, a large action button has size 96x96. As such, we allocate
	// a larger than this space for the button.
	//
	// To prevent the accessibility issue from regressing (which makes it
	// very hard to access some UI features), we also enable this when Talkback
	// is disabled.
	//
	// See https://github.com/callstack/react-native-paper/issues/4064
	// May be possible to remove if https://github.com/callstack/react-native-paper/pull/4514
	// is merged.
	const adjustMargins = !open && shim.mobilePlatform() === 'android';
	const marginStyles = useMemo((): ViewStyle => {
		if (!adjustMargins) {
			return {};
		}

		// Internally, React Native Paper uses absolute positioning to make its
		// (usually invisible) view fill the screen. Setting top and left to
		// undefined causes the view to take up only part of the screen.
		return {
			top: undefined,
			left: undefined,
		};
	}, [adjustMargins]);

	const label = props.mainButton?.label ?? _('Add new');

	// On Web, FAB.Group can't be used at all with accessibility tools. Work around this
	// by hiding the FAB for accessibility, and providing a screen-reader-only custom menu.
	const isWeb = Platform.OS === 'web';
	const accessibleMenu = isWeb ? (
		<AccessibleWebMenu
			label={label}
			onPress={props.mainButton?.onPress}
			actions={props.buttons}
		/>
	) : null;

	const menuContent = <FAB.Group
		open={open}
		accessibilityLabel={label}
		style={marginStyles}
		icon={ open ? openIcon : closedIcon }
		fabStyle={{
			backgroundColor: props.mainButton?.color ?? 'rgba(231,76,60,1)',
		}}
		onStateChange={onMenuToggled}
		actions={actions}
		onPress={props.mainButton?.onPress ?? defaultOnPress}
		// The long press delay is too short by default (and we don't use the long press event). See https://github.com/laurent22/joplin/issues/11183.
		// Increase to a large value:
		delayLongPress={10_000}
		visible={true}
	/>;
	const mainMenu = isWeb ? (
		<View
			aria-hidden={true}
			pointerEvents='box-none'
			tabIndex={-1}
			style={{ flex: 1 }}
		>{menuContent}</View>
	) : menuContent;

	return (
		<Portal>
			{mainMenu}
			{accessibleMenu}
		</Portal>
	);
};

export default FloatingActionButton;
