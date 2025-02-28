// Helper functions to reduce the boiler plate of loading and saving profiles on
// mobile

import { Profile, ProfileConfig } from '@joplin/lib/services/profileConfig/types';
import { loadProfileConfig as libLoadProfileConfig, saveProfileConfig as libSaveProfileConfig } from '@joplin/lib/services/profileConfig/index';
import shim from '@joplin/lib/shim';

// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
let dispatch_: Function = null;
// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
export const setDispatch = (dispatch: Function) => {
	dispatch_ = dispatch;
};

export const getProfilesRootDir = () => {
	return shim.fsDriver().getAppDirectoryPath();
};

export const getProfilesConfigPath = () => {
	return `${getProfilesRootDir()}/profiles.json`;
};

export const getResourceDir = (profile: Profile, isSubProfile: boolean) => {
	if (!isSubProfile) return getProfilesRootDir();
	return `${getProfilesRootDir()}/resources-${profile.id}`;
};

export const getPluginDataDir = (profile: Profile, isSubProfile: boolean) => {
	const suffix = isSubProfile ? `-${profile.id}` : '';
	return `${getProfilesRootDir()}/plugin-data${suffix}`;
};

// The suffix is for debugging only
export const getDatabaseName = (profile: Profile, isSubProfile: boolean, suffix = '') => {
	if (!isSubProfile) return `joplin${suffix}.sqlite`;
	return `joplin-${profile.id}${suffix}.sqlite`;
};

export const loadProfileConfig = async () => {
	return libLoadProfileConfig(getProfilesConfigPath());
};

export const saveProfileConfig = async (profileConfig: ProfileConfig) => {
	await libSaveProfileConfig(getProfilesConfigPath(), profileConfig);
	dispatch_({
		type: 'PROFILE_CONFIG_SET',
		value: profileConfig,
	});
};

export const switchProfile = async (profileId: string) => {
	const config = await loadProfileConfig();
	if (config.currentProfileId === profileId) throw new Error('This profile is already active');

	config.currentProfileId = profileId;
	await saveProfileConfig(config);
	shim.restartApp();
};
