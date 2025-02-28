import { rtrimSlashes } from '@joplin/lib/path-utils';
import { Config, DatabaseConfig, DatabaseConfigClient, Env, MailerConfig, LdapConfig, RouteType, StripeConfig } from './utils/types';
import * as pathUtils from 'path';
import { loadStripeConfig, StripePublicConfig } from '@joplin/lib/utils/joplinCloud';
import { EnvVariables } from './env';
import parseStorageDriverConnectionString from './models/items/storage/parseStorageConnectionString';

interface PackageJson {
	version: string;
	joplinServer: {
		forkVersion: string;
	};
}

const packageJson: PackageJson = require(`${__dirname}/packageInfo.js`);

let runningInDocker_ = false;

export function runningInDocker(): boolean {
	return runningInDocker_;
}

function databaseHostFromEnv(runningInDocker: boolean, env: EnvVariables, slave: boolean): string {
	const postgresHost = slave ? env.SLAVE_POSTGRES_HOST : env.POSTGRES_HOST;

	if (postgresHost) {
		// When running within Docker, the app localhost is different from the
		// host's localhost. To access the latter, Docker defines a special host
		// called "host.docker.internal", so here we swap the values if necessary.
		if (runningInDocker && ['localhost', '127.0.0.1'].includes(postgresHost)) {
			return 'host.docker.internal';
		} else {
			return postgresHost;
		}
	}

	return null;
}

export const fullVersionString = (config: Config) => {
	const output: string[] = [];
	output.push(`v${config.appVersion}`);
	if (config.appVersion !== config.joplinServerVersion) output.push(`(Based on Joplin Server v${config.joplinServerVersion})`);
	return output.join(' ');
};

function databaseConfigFromEnv(runningInDocker: boolean, env: EnvVariables, slave: boolean): DatabaseConfig {
	const baseConfig: DatabaseConfig = {
		client: DatabaseConfigClient.Null,
		name: '',
		slowQueryLogEnabled: env.DB_SLOW_QUERY_LOG_ENABLED,
		slowQueryLogMinDuration: env.DB_SLOW_QUERY_LOG_MIN_DURATION,
		autoMigration: env.DB_AUTO_MIGRATION,
	};

	if (env.DB_CLIENT === 'pg') {
		const databaseConfig: DatabaseConfig = {
			...baseConfig,
			client: DatabaseConfigClient.PostgreSQL,
		};
		if (env.POSTGRES_CONNECTION_STRING) {
			return {
				...databaseConfig,
				connectionString: slave ? env.SLAVE_POSTGRES_CONNECTION_STRING : env.POSTGRES_CONNECTION_STRING,
			};
		} else {
			return {
				...databaseConfig,
				name: slave ? env.SLAVE_POSTGRES_DATABASE : env.POSTGRES_DATABASE,
				user: slave ? env.SLAVE_POSTGRES_USER : env.POSTGRES_USER,
				password: slave ? env.SLAVE_POSTGRES_PASSWORD : env.POSTGRES_PASSWORD,
				port: slave ? env.SLAVE_POSTGRES_PORT : env.POSTGRES_PORT,
				host: databaseHostFromEnv(runningInDocker, env, slave) || 'localhost',
			};
		}
	}

	return {
		...baseConfig,
		client: DatabaseConfigClient.SQLite,
		name: slave ? env.SLAVE_SQLITE_DATABASE : env.SQLITE_DATABASE,
		asyncStackTraces: true,
	};
}

function mailerConfigFromEnv(env: EnvVariables): MailerConfig {
	return {
		enabled: env.MAILER_ENABLED,
		host: env.MAILER_HOST,
		port: env.MAILER_PORT,
		security: env.MAILER_SECURITY,
		authUser: env.MAILER_AUTH_USER,
		authPassword: env.MAILER_AUTH_PASSWORD,
		noReplyName: env.MAILER_NOREPLY_NAME,
		noReplyEmail: env.MAILER_NOREPLY_EMAIL,
	};
}

function stripeConfigFromEnv(publicConfig: StripePublicConfig, env: EnvVariables): StripeConfig {
	return {
		...publicConfig,
		enabled: !!env.STRIPE_SECRET_KEY,
		secretKey: env.STRIPE_SECRET_KEY,
		webhookSecret: env.STRIPE_WEBHOOK_SECRET,
	};
}

function baseUrlFromEnv(env: EnvVariables, appPort: number): string {
	if (env.APP_BASE_URL) {
		return rtrimSlashes(env.APP_BASE_URL);
	} else {
		return `http://localhost:${appPort}`;
	}
}

function ldapConfigFromEnv(env: EnvVariables): LdapConfig[] {
	const ldapConfig = [];
	if (env.LDAP_1_ENABLED) {
		ldapConfig.push({
			enabled: env.LDAP_1_ENABLED,
			userCreation: env.LDAP_1_USER_AUTO_CREATION,
			host: env.LDAP_1_HOST,
			mailAttribute: env.LDAP_1_MAIL_ATTRIBUTE,
			fullNameAttribute: env.LDAP_1_FULLNAME_ATTRIBUTE,
			baseDN: env.LDAP_1_BASE_DN,
			bindDN: env.LDAP_1_BIND_DN,
			bindPW: env.LDAP_1_BIND_PW,
			tlsCaFile: env.LDAP_1_TLS_CA_FILE,
		});
	}

	if (env.LDAP_2_ENABLED) {
		ldapConfig.push({
			enabled: env.LDAP_2_ENABLED,
			userCreation: env.LDAP_2_USER_AUTO_CREATION,
			host: env.LDAP_2_HOST,
			mailAttribute: env.LDAP_2_MAIL_ATTRIBUTE,
			fullNameAttribute: env.LDAP_2_FULLNAME_ATTRIBUTE,
			baseDN: env.LDAP_2_BASE_DN,
			bindDN: env.LDAP_2_BIND_DN,
			bindPW: env.LDAP_2_BIND_PW,
			tlsCaFile: env.LDAP_2_TLS_CA_FILE,
		});
	}
	return ldapConfig;
}

let config_: Config = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
export async function initConfig(envType: Env, env: EnvVariables, overrides: any = null) {
	runningInDocker_ = !!env.RUNNING_IN_DOCKER;

	const rootDir = pathUtils.dirname(__dirname);
	const stripePublicConfig = loadStripeConfig(envType === Env.BuildTypes ? Env.Dev : envType, `${rootDir}/stripeConfig.json`);
	const appName = env.APP_NAME;
	const viewDir = `${rootDir}/src/views`;
	const appPort = env.APP_PORT;
	const baseUrl = baseUrlFromEnv(env, appPort);
	const apiBaseUrl = env.API_BASE_URL ? env.API_BASE_URL : baseUrl;
	const supportEmail = env.SUPPORT_EMAIL;
	const forkVersion = packageJson.joplinServer?.forkVersion;
	const dbConfig = databaseConfigFromEnv(runningInDocker_, env, false);

	config_ = {
		...env,
		appVersion: forkVersion ? forkVersion : packageJson.version,
		joplinServerVersion: packageJson.version,
		appName,
		isJoplinCloud: apiBaseUrl.includes('.joplincloud.com') || apiBaseUrl.includes('.joplincloud.local'),
		env: envType,
		rootDir: rootDir,
		viewDir: viewDir,
		layoutDir: `${viewDir}/layouts`,
		tempDir: `${rootDir}/temp`,
		logDir: `${rootDir}/logs`,
		database: dbConfig,
		databaseSlave: env.DB_USE_SLAVE ? databaseConfigFromEnv(runningInDocker_, env, true) : dbConfig,
		mailer: mailerConfigFromEnv(env),
		stripe: stripeConfigFromEnv(stripePublicConfig, env),
		port: appPort,
		baseUrl,
		adminBaseUrl: `${baseUrl}/admin`,
		showErrorStackTraces: env.ERROR_STACK_TRACES,
		apiBaseUrl,
		userContentBaseUrl: env.USER_CONTENT_BASE_URL ? env.USER_CONTENT_BASE_URL : baseUrl,
		joplinAppBaseUrl: env.JOPLINAPP_BASE_URL,
		signupEnabled: env.SIGNUP_ENABLED,
		termsEnabled: env.TERMS_ENABLED,
		accountTypesEnabled: env.ACCOUNT_TYPES_ENABLED,
		supportEmail,
		supportName: env.SUPPORT_NAME || appName,
		businessEmail: env.BUSINESS_EMAIL || supportEmail,
		cookieSecure: env.COOKIES_SECURE,
		storageDriver: parseStorageDriverConnectionString(env.STORAGE_DRIVER),
		storageDriverFallback: parseStorageDriverConnectionString(env.STORAGE_DRIVER_FALLBACK),
		itemSizeHardLimit: 250000000, // Beyond this the Postgres driver will crash the app
		maxTimeDrift: env.MAX_TIME_DRIFT,
		ldap: ldapConfigFromEnv(env),
		...overrides,
	};
}

export function baseUrl(type: RouteType): string {
	if (type === RouteType.Web) return config().baseUrl;
	if (type === RouteType.Api) return config().apiBaseUrl;
	if (type === RouteType.UserContent) return config().userContentBaseUrl;
	throw new Error(`Unknown type: ${type}`);
}

// User content URL is not supported for now so only show the URL if the
// user content is hosted on the same domain. Needs to get cookie working
// across domains to get user content url working.
export function showItemUrls(config: Config): boolean {
	return config.userContentBaseUrl === config.baseUrl;
}

function config(): Config {
	if (!config_) throw new Error('Config has not been initialized!');
	return config_;
}

export default config;
