//#region \0rolldown/runtime.js
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esmMin = (fn, res) => () => (fn && (res = fn(fn = 0)), res);
var __commonJSMin = (cb, mod) => () => (mod || (cb((mod = { exports: {} }).exports, mod), cb = null), mod.exports);
var __copyProps = (to, from, except, desc) => {
	if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
		key = keys[i];
		if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
			get: ((k) => from[k]).bind(null, key),
			enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
		});
	}
	return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", {
	value: mod,
	enumerable: true
}) : target, mod));
//#endregion
let node_path = require("node:path");
node_path = __toESM(node_path);
let electron = require("electron");
let path = require("path");
path = __toESM(path);
let os = require("os");
os = __toESM(os);
let fs = require("fs");
fs = __toESM(fs);
let http = require("http");
http = __toESM(http);
let node_fs = require("node:fs");
node_fs = __toESM(node_fs);
let fluent_ffmpeg = require("fluent-ffmpeg");
fluent_ffmpeg = __toESM(fluent_ffmpeg);
let node_os = require("node:os");
node_os = __toESM(node_os);
let node_crypto = require("node:crypto");
let node_child_process = require("node:child_process");
let node_util = require("node:util");
let node_stream = require("node:stream");
//#region node_modules/electron-log/src/node/packageJson.js
var require_packageJson = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var fs$6 = require("fs");
	var path$7 = require("path");
	module.exports = {
		findAndReadPackageJson,
		tryReadJsonAt
	};
	/**
	* @return {{ name?: string, version?: string}}
	*/
	function findAndReadPackageJson() {
		return tryReadJsonAt(getMainModulePath()) || tryReadJsonAt(extractPathFromArgs()) || tryReadJsonAt(process.resourcesPath, "app.asar") || tryReadJsonAt(process.resourcesPath, "app") || tryReadJsonAt(process.cwd()) || {
			name: void 0,
			version: void 0
		};
	}
	/**
	* @param {...string} searchPaths
	* @return {{ name?: string, version?: string } | undefined}
	*/
	function tryReadJsonAt(...searchPaths) {
		if (!searchPaths[0]) return;
		try {
			const fileName = findUp("package.json", path$7.join(...searchPaths));
			if (!fileName) return;
			const json = JSON.parse(fs$6.readFileSync(fileName, "utf8"));
			const name = json?.productName || json?.name;
			if (!name || name.toLowerCase() === "electron") return;
			if (name) return {
				name,
				version: json?.version
			};
			return;
		} catch (e) {
			return;
		}
	}
	/**
	* @param {string} fileName
	* @param {string} [cwd]
	* @return {string | null}
	*/
	function findUp(fileName, cwd) {
		let currentPath = cwd;
		while (true) {
			const parsedPath = path$7.parse(currentPath);
			const root = parsedPath.root;
			const dir = parsedPath.dir;
			if (fs$6.existsSync(path$7.join(currentPath, fileName))) return path$7.resolve(path$7.join(currentPath, fileName));
			if (currentPath === root) return null;
			currentPath = dir;
		}
	}
	/**
	* Get app path from --user-data-dir cmd arg, passed to a renderer process
	* @return {string|null}
	*/
	function extractPathFromArgs() {
		const matchedArgs = process.argv.filter((arg) => {
			return arg.indexOf("--user-data-dir=") === 0;
		});
		if (matchedArgs.length === 0 || typeof matchedArgs[0] !== "string") return null;
		return matchedArgs[0].replace("--user-data-dir=", "");
	}
	function getMainModulePath() {
		try {
			return require.main?.filename;
		} catch {
			return;
		}
	}
}));
//#endregion
//#region node_modules/electron-log/src/node/NodeExternalApi.js
var require_NodeExternalApi = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var childProcess = require("child_process");
	var os$5 = require("os");
	var path$6 = require("path");
	var packageJson = require_packageJson();
	var NodeExternalApi = class {
		appName = void 0;
		appPackageJson = void 0;
		platform = process.platform;
		getAppLogPath(appName = this.getAppName()) {
			if (this.platform === "darwin") return path$6.join(this.getSystemPathHome(), "Library/Logs", appName);
			return path$6.join(this.getAppUserDataPath(appName), "logs");
		}
		getAppName() {
			const appName = this.appName || this.getAppPackageJson()?.name;
			if (!appName) throw new Error("electron-log can't determine the app name. It tried these methods:\n1. Use `electron.app.name`\n2. Use productName or name from the nearest package.json`\nYou can also set it through log.transports.file.setAppName()");
			return appName;
		}
		/**
		* @private
		* @returns {undefined}
		*/
		getAppPackageJson() {
			if (typeof this.appPackageJson !== "object") this.appPackageJson = packageJson.findAndReadPackageJson();
			return this.appPackageJson;
		}
		getAppUserDataPath(appName = this.getAppName()) {
			return appName ? path$6.join(this.getSystemPathAppData(), appName) : void 0;
		}
		getAppVersion() {
			return this.getAppPackageJson()?.version;
		}
		getElectronLogPath() {
			return this.getAppLogPath();
		}
		getMacOsVersion() {
			const release = Number(os$5.release().split(".")[0]);
			if (release <= 19) return `10.${release - 4}`;
			return release - 9;
		}
		/**
		* @protected
		* @returns {string}
		*/
		getOsVersion() {
			let osName = os$5.type().replace("_", " ");
			let osVersion = os$5.release();
			if (osName === "Darwin") {
				osName = "macOS";
				osVersion = this.getMacOsVersion();
			}
			return `${osName} ${osVersion}`;
		}
		/**
		* @return {PathVariables}
		*/
		getPathVariables() {
			const appName = this.getAppName();
			const appVersion = this.getAppVersion();
			const self = this;
			return {
				appData: this.getSystemPathAppData(),
				appName,
				appVersion,
				get electronDefaultDir() {
					return self.getElectronLogPath();
				},
				home: this.getSystemPathHome(),
				libraryDefaultDir: this.getAppLogPath(appName),
				libraryTemplate: this.getAppLogPath("{appName}"),
				temp: this.getSystemPathTemp(),
				userData: this.getAppUserDataPath(appName)
			};
		}
		getSystemPathAppData() {
			const home = this.getSystemPathHome();
			switch (this.platform) {
				case "darwin": return path$6.join(home, "Library/Application Support");
				case "win32": return process.env.APPDATA || path$6.join(home, "AppData/Roaming");
				default: return process.env.XDG_CONFIG_HOME || path$6.join(home, ".config");
			}
		}
		getSystemPathHome() {
			return os$5.homedir?.() || process.env.HOME;
		}
		getSystemPathTemp() {
			return os$5.tmpdir();
		}
		getVersions() {
			return {
				app: `${this.getAppName()} ${this.getAppVersion()}`,
				electron: void 0,
				os: this.getOsVersion()
			};
		}
		isDev() {
			return process.env.NODE_ENV === "development" || process.env.ELECTRON_IS_DEV === "1";
		}
		isElectron() {
			return Boolean(process.versions.electron);
		}
		onAppEvent(_eventName, _handler) {}
		onAppReady(handler) {
			handler();
		}
		onEveryWebContentsEvent(eventName, handler) {}
		/**
		* Listen to async messages sent from opposite process
		* @param {string} channel
		* @param {function} listener
		*/
		onIpc(channel, listener) {}
		onIpcInvoke(channel, listener) {}
		/**
		* @param {string} url
		* @param {Function} [logFunction]
		*/
		openUrl(url, logFunction = console.error) {
			const start = {
				darwin: "open",
				win32: "start",
				linux: "xdg-open"
			}[process.platform] || "xdg-open";
			childProcess.exec(`${start} ${url}`, {}, (err) => {
				if (err) logFunction(err);
			});
		}
		setAppName(appName) {
			this.appName = appName;
		}
		setPlatform(platform) {
			this.platform = platform;
		}
		setPreloadFileForSessions({ filePath, includeFutureSession = true, getSessions = () => [] }) {}
		/**
		* Sent a message to opposite process
		* @param {string} channel
		* @param {any} message
		*/
		sendIpc(channel, message) {}
		showErrorBox(title, message) {}
	};
	module.exports = NodeExternalApi;
}));
//#endregion
//#region node_modules/electron-log/src/main/ElectronExternalApi.js
var require_ElectronExternalApi = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var path$5 = require("path");
	var NodeExternalApi = require_NodeExternalApi();
	var ElectronExternalApi = class extends NodeExternalApi {
		/**
		* @type {typeof Electron}
		*/
		electron = void 0;
		/**
		* @param {object} options
		* @param {typeof Electron} [options.electron]
		*/
		constructor({ electron } = {}) {
			super();
			this.electron = electron;
		}
		getAppName() {
			let appName;
			try {
				appName = this.appName || this.electron.app?.name || this.electron.app?.getName();
			} catch {}
			return appName || super.getAppName();
		}
		getAppUserDataPath(appName) {
			return this.getPath("userData") || super.getAppUserDataPath(appName);
		}
		getAppVersion() {
			let appVersion;
			try {
				appVersion = this.electron.app?.getVersion();
			} catch {}
			return appVersion || super.getAppVersion();
		}
		getElectronLogPath() {
			return this.getPath("logs") || super.getElectronLogPath();
		}
		/**
		* @private
		* @param {any} name
		* @returns {string|undefined}
		*/
		getPath(name) {
			try {
				return this.electron.app?.getPath(name);
			} catch {
				return;
			}
		}
		getVersions() {
			return {
				app: `${this.getAppName()} ${this.getAppVersion()}`,
				electron: `Electron ${process.versions.electron}`,
				os: this.getOsVersion()
			};
		}
		getSystemPathAppData() {
			return this.getPath("appData") || super.getSystemPathAppData();
		}
		isDev() {
			if (this.electron.app?.isPackaged !== void 0) return !this.electron.app.isPackaged;
			if (typeof process.execPath === "string") return path$5.basename(process.execPath).toLowerCase().startsWith("electron");
			return super.isDev();
		}
		onAppEvent(eventName, handler) {
			this.electron.app?.on(eventName, handler);
			return () => {
				this.electron.app?.off(eventName, handler);
			};
		}
		onAppReady(handler) {
			if (this.electron.app?.isReady()) handler();
			else if (this.electron.app?.once) this.electron.app?.once("ready", handler);
			else handler();
		}
		onEveryWebContentsEvent(eventName, handler) {
			this.electron.webContents?.getAllWebContents()?.forEach((webContents) => {
				webContents.on(eventName, handler);
			});
			this.electron.app?.on("web-contents-created", onWebContentsCreated);
			return () => {
				this.electron.webContents?.getAllWebContents().forEach((webContents) => {
					webContents.off(eventName, handler);
				});
				this.electron.app?.off("web-contents-created", onWebContentsCreated);
			};
			function onWebContentsCreated(_, webContents) {
				webContents.on(eventName, handler);
			}
		}
		/**
		* Listen to async messages sent from opposite process
		* @param {string} channel
		* @param {function} listener
		*/
		onIpc(channel, listener) {
			this.electron.ipcMain?.on(channel, listener);
		}
		onIpcInvoke(channel, listener) {
			this.electron.ipcMain?.handle?.(channel, listener);
		}
		/**
		* @param {string} url
		* @param {Function} [logFunction]
		*/
		openUrl(url, logFunction = console.error) {
			this.electron.shell?.openExternal(url).catch(logFunction);
		}
		setPreloadFileForSessions({ filePath, includeFutureSession = true, getSessions = () => [this.electron.session?.defaultSession] }) {
			for (const session of getSessions().filter(Boolean)) setPreload(session);
			if (includeFutureSession) this.onAppEvent("session-created", (session) => {
				setPreload(session);
			});
			/**
			* @param {Session} session
			*/
			function setPreload(session) {
				if (typeof session.registerPreloadScript === "function") session.registerPreloadScript({
					filePath,
					id: "electron-log-preload",
					type: "frame"
				});
				else session.setPreloads([...session.getPreloads(), filePath]);
			}
		}
		/**
		* Sent a message to opposite process
		* @param {string} channel
		* @param {any} message
		*/
		sendIpc(channel, message) {
			this.electron.BrowserWindow?.getAllWindows()?.forEach((wnd) => {
				if (wnd.webContents?.isDestroyed() === false && wnd.webContents?.isCrashed() === false) wnd.webContents.send(channel, message);
			});
		}
		showErrorBox(title, message) {
			this.electron.dialog?.showErrorBox(title, message);
		}
	};
	module.exports = ElectronExternalApi;
}));
//#endregion
//#region node_modules/electron-log/src/renderer/electron-log-preload.js
var require_electron_log_preload = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var electron = {};
	try {
		electron = require("electron");
	} catch (e) {}
	if (electron.ipcRenderer) initialize(electron);
	if (typeof module === "object") module.exports = initialize;
	/**
	* @param {Electron.ContextBridge} contextBridge
	* @param {Electron.IpcRenderer} ipcRenderer
	*/
	function initialize({ contextBridge, ipcRenderer }) {
		if (!ipcRenderer) return;
		ipcRenderer.on("__ELECTRON_LOG_IPC__", (_, message) => {
			window.postMessage({
				cmd: "message",
				...message
			});
		});
		ipcRenderer.invoke("__ELECTRON_LOG__", { cmd: "getOptions" }).catch((e) => console.error(/* @__PURE__ */ new Error(`electron-log isn't initialized in the main process. Please call log.initialize() before. ${e.message}`)));
		const electronLog = {
			sendToMain(message) {
				try {
					ipcRenderer.send("__ELECTRON_LOG__", message);
				} catch (e) {
					console.error("electronLog.sendToMain ", e, "data:", message);
					ipcRenderer.send("__ELECTRON_LOG__", {
						cmd: "errorHandler",
						error: {
							message: e?.message,
							stack: e?.stack
						},
						errorName: "sendToMain"
					});
				}
			},
			log(...data) {
				electronLog.sendToMain({
					data,
					level: "info"
				});
			}
		};
		for (const level of [
			"error",
			"warn",
			"info",
			"verbose",
			"debug",
			"silly"
		]) electronLog[level] = (...data) => electronLog.sendToMain({
			data,
			level
		});
		if (contextBridge && process.contextIsolated) try {
			contextBridge.exposeInMainWorld("__electronLog", electronLog);
		} catch {}
		if (typeof window === "object") window.__electronLog = electronLog;
		else __electronLog = electronLog;
	}
}));
//#endregion
//#region node_modules/electron-log/src/main/initialize.js
var require_initialize = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var fs$5 = require("fs");
	var os$4 = require("os");
	var path$4 = require("path");
	var preloadInitializeFn = require_electron_log_preload();
	var preloadInitialized = false;
	var spyConsoleInitialized = false;
	module.exports = { initialize({ externalApi, getSessions, includeFutureSession, logger, preload = true, spyRendererConsole = false }) {
		externalApi.onAppReady(() => {
			try {
				if (preload) initializePreload({
					externalApi,
					getSessions,
					includeFutureSession,
					logger,
					preloadOption: preload
				});
				if (spyRendererConsole) initializeSpyRendererConsole({
					externalApi,
					logger
				});
			} catch (err) {
				logger.warn(err);
			}
		});
	} };
	function initializePreload({ externalApi, getSessions, includeFutureSession, logger, preloadOption }) {
		let preloadPath = typeof preloadOption === "string" ? preloadOption : void 0;
		if (preloadInitialized) {
			logger.warn((/* @__PURE__ */ new Error("log.initialize({ preload }) already called")).stack);
			return;
		}
		preloadInitialized = true;
		try {
			preloadPath = path$4.resolve(__dirname, "../renderer/electron-log-preload.js");
		} catch {}
		if (!preloadPath || !fs$5.existsSync(preloadPath)) {
			preloadPath = path$4.join(externalApi.getAppUserDataPath() || os$4.tmpdir(), "electron-log-preload.js");
			const preloadCode = `
      try {
        (${preloadInitializeFn.toString()})(require('electron'));
      } catch(e) {
        console.error(e);
      }
    `;
			fs$5.writeFileSync(preloadPath, preloadCode, "utf8");
		}
		externalApi.setPreloadFileForSessions({
			filePath: preloadPath,
			includeFutureSession,
			getSessions
		});
	}
	function initializeSpyRendererConsole({ externalApi, logger }) {
		if (spyConsoleInitialized) {
			logger.warn((/* @__PURE__ */ new Error("log.initialize({ spyRendererConsole }) already called")).stack);
			return;
		}
		spyConsoleInitialized = true;
		const levels = [
			"debug",
			"info",
			"warn",
			"error"
		];
		externalApi.onEveryWebContentsEvent("console-message", (event, level, message) => {
			logger.processMessage({
				data: [message],
				level: levels[level],
				variables: { processType: "renderer" }
			});
		});
	}
}));
//#endregion
//#region node_modules/electron-log/src/core/scope.js
var require_scope = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	module.exports = scopeFactory;
	function scopeFactory(logger) {
		return Object.defineProperties(scope, {
			defaultLabel: {
				value: "",
				writable: true
			},
			labelPadding: {
				value: true,
				writable: true
			},
			maxLabelLength: {
				value: 0,
				writable: true
			},
			labelLength: { get() {
				switch (typeof scope.labelPadding) {
					case "boolean": return scope.labelPadding ? scope.maxLabelLength : 0;
					case "number": return scope.labelPadding;
					default: return 0;
				}
			} }
		});
		function scope(label) {
			scope.maxLabelLength = Math.max(scope.maxLabelLength, label.length);
			const newScope = {};
			for (const level of logger.levels) newScope[level] = (...d) => logger.logData(d, {
				level,
				scope: label
			});
			newScope.log = newScope.info;
			return newScope;
		}
	}
}));
//#endregion
//#region node_modules/electron-log/src/core/Buffering.js
var require_Buffering = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var Buffering = class {
		constructor({ processMessage }) {
			this.processMessage = processMessage;
			this.buffer = [];
			this.enabled = false;
			this.begin = this.begin.bind(this);
			this.commit = this.commit.bind(this);
			this.reject = this.reject.bind(this);
		}
		addMessage(message) {
			this.buffer.push(message);
		}
		begin() {
			this.enabled = [];
		}
		commit() {
			this.enabled = false;
			this.buffer.forEach((item) => this.processMessage(item));
			this.buffer = [];
		}
		reject() {
			this.enabled = false;
			this.buffer = [];
		}
	};
	module.exports = Buffering;
}));
//#endregion
//#region node_modules/electron-log/src/core/Logger.js
var require_Logger = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var scopeFactory = require_scope();
	var Buffering = require_Buffering();
	module.exports = class Logger {
		static instances = {};
		dependencies = {};
		errorHandler = null;
		eventLogger = null;
		functions = {};
		hooks = [];
		isDev = false;
		levels = null;
		logId = null;
		scope = null;
		transports = {};
		variables = {};
		constructor({ allowUnknownLevel = false, dependencies = {}, errorHandler, eventLogger, initializeFn, isDev = false, levels = [
			"error",
			"warn",
			"info",
			"verbose",
			"debug",
			"silly"
		], logId, transportFactories = {}, variables } = {}) {
			this.addLevel = this.addLevel.bind(this);
			this.create = this.create.bind(this);
			this.initialize = this.initialize.bind(this);
			this.logData = this.logData.bind(this);
			this.processMessage = this.processMessage.bind(this);
			this.allowUnknownLevel = allowUnknownLevel;
			this.buffering = new Buffering(this);
			this.dependencies = dependencies;
			this.initializeFn = initializeFn;
			this.isDev = isDev;
			this.levels = levels;
			this.logId = logId;
			this.scope = scopeFactory(this);
			this.transportFactories = transportFactories;
			this.variables = variables || {};
			for (const name of this.levels) this.addLevel(name, false);
			this.log = this.info;
			this.functions.log = this.log;
			this.errorHandler = errorHandler;
			errorHandler?.setOptions({
				...dependencies,
				logFn: this.error
			});
			this.eventLogger = eventLogger;
			eventLogger?.setOptions({
				...dependencies,
				logger: this
			});
			for (const [name, factory] of Object.entries(transportFactories)) this.transports[name] = factory(this, dependencies);
			Logger.instances[logId] = this;
		}
		static getInstance({ logId }) {
			return this.instances[logId] || this.instances.default;
		}
		addLevel(level, index = this.levels.length) {
			if (index !== false) this.levels.splice(index, 0, level);
			this[level] = (...args) => this.logData(args, { level });
			this.functions[level] = this[level];
		}
		catchErrors(options) {
			this.processMessage({
				data: ["log.catchErrors is deprecated. Use log.errorHandler instead"],
				level: "warn"
			}, { transports: ["console"] });
			return this.errorHandler.startCatching(options);
		}
		create(options) {
			if (typeof options === "string") options = { logId: options };
			return new Logger({
				dependencies: this.dependencies,
				errorHandler: this.errorHandler,
				initializeFn: this.initializeFn,
				isDev: this.isDev,
				transportFactories: this.transportFactories,
				variables: { ...this.variables },
				...options
			});
		}
		compareLevels(passLevel, checkLevel, levels = this.levels) {
			const pass = levels.indexOf(passLevel);
			const check = levels.indexOf(checkLevel);
			if (check === -1 || pass === -1) return true;
			return check <= pass;
		}
		initialize(options = {}) {
			this.initializeFn({
				logger: this,
				...this.dependencies,
				...options
			});
		}
		logData(data, options = {}) {
			if (this.buffering.enabled) this.buffering.addMessage({
				data,
				date: /* @__PURE__ */ new Date(),
				...options
			});
			else this.processMessage({
				data,
				...options
			});
		}
		processMessage(message, { transports = this.transports } = {}) {
			if (message.cmd === "errorHandler") {
				this.errorHandler.handle(message.error, {
					errorName: message.errorName,
					processType: "renderer",
					showDialog: Boolean(message.showDialog)
				});
				return;
			}
			let level = message.level;
			if (!this.allowUnknownLevel) level = this.levels.includes(message.level) ? message.level : "info";
			const normalizedMessage = {
				date: /* @__PURE__ */ new Date(),
				logId: this.logId,
				...message,
				level,
				variables: {
					...this.variables,
					...message.variables
				}
			};
			for (const [transName, transFn] of this.transportEntries(transports)) {
				if (typeof transFn !== "function" || transFn.level === false) continue;
				if (!this.compareLevels(transFn.level, message.level)) continue;
				try {
					const transformedMsg = this.hooks.reduce((msg, hook) => {
						return msg ? hook(msg, transFn, transName) : msg;
					}, normalizedMessage);
					if (transformedMsg) transFn({
						...transformedMsg,
						data: [...transformedMsg.data]
					});
				} catch (e) {
					this.processInternalErrorFn(e);
				}
			}
		}
		processInternalErrorFn(_e) {}
		transportEntries(transports = this.transports) {
			return (Array.isArray(transports) ? transports : Object.entries(transports)).map((item) => {
				switch (typeof item) {
					case "string": return this.transports[item] ? [item, this.transports[item]] : null;
					case "function": return [item.name, item];
					default: return Array.isArray(item) ? item : null;
				}
			}).filter(Boolean);
		}
	};
}));
//#endregion
//#region node_modules/electron-log/src/node/ErrorHandler.js
var require_ErrorHandler = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var ErrorHandler = class {
		externalApi = void 0;
		isActive = false;
		logFn = void 0;
		onError = void 0;
		showDialog = true;
		constructor({ externalApi, logFn = void 0, onError = void 0, showDialog = void 0 } = {}) {
			this.createIssue = this.createIssue.bind(this);
			this.handleError = this.handleError.bind(this);
			this.handleRejection = this.handleRejection.bind(this);
			this.setOptions({
				externalApi,
				logFn,
				onError,
				showDialog
			});
			this.startCatching = this.startCatching.bind(this);
			this.stopCatching = this.stopCatching.bind(this);
		}
		handle(error, { logFn = this.logFn, onError = this.onError, processType = "browser", showDialog = this.showDialog, errorName = "" } = {}) {
			error = normalizeError(error);
			try {
				if (typeof onError === "function") {
					const versions = this.externalApi?.getVersions() || {};
					const createIssue = this.createIssue;
					if (onError({
						createIssue,
						error,
						errorName,
						processType,
						versions
					}) === false) return;
				}
				errorName ? logFn(errorName, error) : logFn(error);
				if (showDialog && !errorName.includes("rejection") && this.externalApi) this.externalApi.showErrorBox(`A JavaScript error occurred in the ${processType} process`, error.stack);
			} catch {
				console.error(error);
			}
		}
		setOptions({ externalApi, logFn, onError, showDialog }) {
			if (typeof externalApi === "object") this.externalApi = externalApi;
			if (typeof logFn === "function") this.logFn = logFn;
			if (typeof onError === "function") this.onError = onError;
			if (typeof showDialog === "boolean") this.showDialog = showDialog;
		}
		startCatching({ onError, showDialog } = {}) {
			if (this.isActive) return;
			this.isActive = true;
			this.setOptions({
				onError,
				showDialog
			});
			process.on("uncaughtException", this.handleError);
			process.on("unhandledRejection", this.handleRejection);
		}
		stopCatching() {
			this.isActive = false;
			process.removeListener("uncaughtException", this.handleError);
			process.removeListener("unhandledRejection", this.handleRejection);
		}
		createIssue(pageUrl, queryParams) {
			this.externalApi?.openUrl(`${pageUrl}?${new URLSearchParams(queryParams).toString()}`);
		}
		handleError(error) {
			this.handle(error, { errorName: "Unhandled" });
		}
		handleRejection(reason) {
			const error = reason instanceof Error ? reason : new Error(JSON.stringify(reason));
			this.handle(error, { errorName: "Unhandled rejection" });
		}
	};
	function normalizeError(e) {
		if (e instanceof Error) return e;
		if (e && typeof e === "object") {
			if (e.message) return Object.assign(new Error(e.message), e);
			try {
				return new Error(JSON.stringify(e));
			} catch (serErr) {
				return /* @__PURE__ */ new Error(`Couldn't normalize error ${String(e)}: ${serErr}`);
			}
		}
		return /* @__PURE__ */ new Error(`Can't normalize error ${String(e)}`);
	}
	module.exports = ErrorHandler;
}));
//#endregion
//#region node_modules/electron-log/src/node/EventLogger.js
var require_EventLogger = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var EventLogger = class {
		disposers = [];
		format = "{eventSource}#{eventName}:";
		formatters = {
			app: {
				"certificate-error": ({ args }) => {
					return this.arrayToObject(args.slice(1, 4), [
						"url",
						"error",
						"certificate"
					]);
				},
				"child-process-gone": ({ args }) => {
					return args.length === 1 ? args[0] : args;
				},
				"render-process-gone": ({ args: [webContents, details] }) => {
					return details && typeof details === "object" ? {
						...details,
						...this.getWebContentsDetails(webContents)
					} : [];
				}
			},
			webContents: {
				"console-message": ({ args: [level, message, line, sourceId] }) => {
					if (level < 3) return;
					return {
						message,
						source: `${sourceId}:${line}`
					};
				},
				"did-fail-load": ({ args }) => {
					return this.arrayToObject(args, [
						"errorCode",
						"errorDescription",
						"validatedURL",
						"isMainFrame",
						"frameProcessId",
						"frameRoutingId"
					]);
				},
				"did-fail-provisional-load": ({ args }) => {
					return this.arrayToObject(args, [
						"errorCode",
						"errorDescription",
						"validatedURL",
						"isMainFrame",
						"frameProcessId",
						"frameRoutingId"
					]);
				},
				"plugin-crashed": ({ args }) => {
					return this.arrayToObject(args, ["name", "version"]);
				},
				"preload-error": ({ args }) => {
					return this.arrayToObject(args, ["preloadPath", "error"]);
				}
			}
		};
		events = {
			app: {
				"certificate-error": true,
				"child-process-gone": true,
				"render-process-gone": true
			},
			webContents: {
				"did-fail-load": true,
				"did-fail-provisional-load": true,
				"plugin-crashed": true,
				"preload-error": true,
				"unresponsive": true
			}
		};
		externalApi = void 0;
		level = "error";
		scope = "";
		constructor(options = {}) {
			this.setOptions(options);
		}
		setOptions({ events, externalApi, level, logger, format, formatters, scope }) {
			if (typeof events === "object") this.events = events;
			if (typeof externalApi === "object") this.externalApi = externalApi;
			if (typeof level === "string") this.level = level;
			if (typeof logger === "object") this.logger = logger;
			if (typeof format === "string" || typeof format === "function") this.format = format;
			if (typeof formatters === "object") this.formatters = formatters;
			if (typeof scope === "string") this.scope = scope;
		}
		startLogging(options = {}) {
			this.setOptions(options);
			this.disposeListeners();
			for (const eventName of this.getEventNames(this.events.app)) this.disposers.push(this.externalApi.onAppEvent(eventName, (...handlerArgs) => {
				this.handleEvent({
					eventSource: "app",
					eventName,
					handlerArgs
				});
			}));
			for (const eventName of this.getEventNames(this.events.webContents)) this.disposers.push(this.externalApi.onEveryWebContentsEvent(eventName, (...handlerArgs) => {
				this.handleEvent({
					eventSource: "webContents",
					eventName,
					handlerArgs
				});
			}));
		}
		stopLogging() {
			this.disposeListeners();
		}
		arrayToObject(array, fieldNames) {
			const obj = {};
			fieldNames.forEach((fieldName, index) => {
				obj[fieldName] = array[index];
			});
			if (array.length > fieldNames.length) obj.unknownArgs = array.slice(fieldNames.length);
			return obj;
		}
		disposeListeners() {
			this.disposers.forEach((disposer) => disposer());
			this.disposers = [];
		}
		formatEventLog({ eventName, eventSource, handlerArgs }) {
			const [event, ...args] = handlerArgs;
			if (typeof this.format === "function") return this.format({
				args,
				event,
				eventName,
				eventSource
			});
			const formatter = this.formatters[eventSource]?.[eventName];
			let formattedArgs = args;
			if (typeof formatter === "function") formattedArgs = formatter({
				args,
				event,
				eventName,
				eventSource
			});
			if (!formattedArgs) return;
			const eventData = {};
			if (Array.isArray(formattedArgs)) eventData.args = formattedArgs;
			else if (typeof formattedArgs === "object") Object.assign(eventData, formattedArgs);
			if (eventSource === "webContents") Object.assign(eventData, this.getWebContentsDetails(event?.sender));
			return [this.format.replace("{eventSource}", eventSource === "app" ? "App" : "WebContents").replace("{eventName}", eventName), eventData];
		}
		getEventNames(eventMap) {
			if (!eventMap || typeof eventMap !== "object") return [];
			return Object.entries(eventMap).filter(([_, listen]) => listen).map(([eventName]) => eventName);
		}
		getWebContentsDetails(webContents) {
			if (!webContents?.loadURL) return {};
			try {
				return { webContents: {
					id: webContents.id,
					url: webContents.getURL()
				} };
			} catch {
				return {};
			}
		}
		handleEvent({ eventName, eventSource, handlerArgs }) {
			const log = this.formatEventLog({
				eventName,
				eventSource,
				handlerArgs
			});
			if (log) (this.scope ? this.logger.scope(this.scope) : this.logger)?.[this.level]?.(...log);
		}
	};
	module.exports = EventLogger;
}));
//#endregion
//#region node_modules/electron-log/src/core/transforms/transform.js
var require_transform = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	module.exports = { transform };
	function transform({ logger, message, transport, initialData = message?.data || [], transforms = transport?.transforms }) {
		return transforms.reduce((data, trans) => {
			if (typeof trans === "function") return trans({
				data,
				logger,
				message,
				transport
			});
			return data;
		}, initialData);
	}
}));
//#endregion
//#region node_modules/electron-log/src/core/transforms/format.js
var require_format = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var { transform } = require_transform();
	module.exports = {
		concatFirstStringElements,
		formatScope,
		formatText,
		formatVariables,
		timeZoneFromOffset,
		format({ message, logger, transport, data = message?.data }) {
			switch (typeof transport.format) {
				case "string": return transform({
					message,
					logger,
					transforms: [
						formatVariables,
						formatScope,
						formatText
					],
					transport,
					initialData: [transport.format, ...data]
				});
				case "function": return transport.format({
					data,
					level: message?.level || "info",
					logger,
					message,
					transport
				});
				default: return data;
			}
		}
	};
	/**
	* The first argument of console.log may contain a template. In the library
	* the first element is a string related to transports.console.format. So
	* this function concatenates first two elements to make templates like %d
	* work
	* @param {*[]} data
	* @return {*[]}
	*/
	function concatFirstStringElements({ data }) {
		if (typeof data[0] !== "string" || typeof data[1] !== "string") return data;
		if (data[0].match(/%[1cdfiOos]/)) return data;
		return [`${data[0]} ${data[1]}`, ...data.slice(2)];
	}
	function timeZoneFromOffset(minutesOffset) {
		const minutesPositive = Math.abs(minutesOffset);
		return `${minutesOffset > 0 ? "-" : "+"}${Math.floor(minutesPositive / 60).toString().padStart(2, "0")}:${(minutesPositive % 60).toString().padStart(2, "0")}`;
	}
	function formatScope({ data, logger, message }) {
		const { defaultLabel, labelLength } = logger?.scope || {};
		const template = data[0];
		let label = message.scope;
		if (!label) label = defaultLabel;
		let scopeText;
		if (label === "") scopeText = labelLength > 0 ? "".padEnd(labelLength + 3) : "";
		else if (typeof label === "string") scopeText = ` (${label})`.padEnd(labelLength + 3);
		else scopeText = "";
		data[0] = template.replace("{scope}", scopeText);
		return data;
	}
	function formatVariables({ data, message }) {
		let template = data[0];
		if (typeof template !== "string") return data;
		template = template.replace("{level}]", `${message.level}]`.padEnd(6, " "));
		const date = message.date || /* @__PURE__ */ new Date();
		data[0] = template.replace(/\{(\w+)}/g, (substring, name) => {
			switch (name) {
				case "level": return message.level || "info";
				case "logId": return message.logId;
				case "y": return date.getFullYear().toString(10);
				case "m": return (date.getMonth() + 1).toString(10).padStart(2, "0");
				case "d": return date.getDate().toString(10).padStart(2, "0");
				case "h": return date.getHours().toString(10).padStart(2, "0");
				case "i": return date.getMinutes().toString(10).padStart(2, "0");
				case "s": return date.getSeconds().toString(10).padStart(2, "0");
				case "ms": return date.getMilliseconds().toString(10).padStart(3, "0");
				case "z": return timeZoneFromOffset(date.getTimezoneOffset());
				case "iso": return date.toISOString();
				default: return message.variables?.[name] || substring;
			}
		}).trim();
		return data;
	}
	function formatText({ data }) {
		const template = data[0];
		if (typeof template !== "string") return data;
		if (template.lastIndexOf("{text}") === template.length - 6) {
			data[0] = template.replace(/\s?{text}/, "");
			if (data[0] === "") data.shift();
			return data;
		}
		const templatePieces = template.split("{text}");
		let result = [];
		if (templatePieces[0] !== "") result.push(templatePieces[0]);
		result = result.concat(data.slice(1));
		if (templatePieces[1] !== "") result.push(templatePieces[1]);
		return result;
	}
}));
//#endregion
//#region node_modules/electron-log/src/node/transforms/object.js
var require_object = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var util = require("util");
	module.exports = {
		serialize,
		maxDepth({ data, transport, depth = transport?.depth ?? 6 }) {
			if (!data) return data;
			if (depth < 1) {
				if (Array.isArray(data)) return "[array]";
				if (typeof data === "object" && data) return "[object]";
				return data;
			}
			if (Array.isArray(data)) return data.map((child) => module.exports.maxDepth({
				data: child,
				depth: depth - 1
			}));
			if (typeof data !== "object") return data;
			if (data && typeof data.toISOString === "function") return data;
			if (data === null) return null;
			if (data instanceof Error) return data;
			const newJson = {};
			for (const i in data) {
				if (!Object.prototype.hasOwnProperty.call(data, i)) continue;
				newJson[i] = module.exports.maxDepth({
					data: data[i],
					depth: depth - 1
				});
			}
			return newJson;
		},
		toJSON({ data }) {
			return JSON.parse(JSON.stringify(data, createSerializer()));
		},
		toString({ data, transport }) {
			const inspectOptions = transport?.inspectOptions || {};
			const simplifiedData = data.map((item) => {
				if (item === void 0) return;
				try {
					const str = JSON.stringify(item, createSerializer(), "  ");
					return str === void 0 ? void 0 : JSON.parse(str);
				} catch (e) {
					return item;
				}
			});
			return util.formatWithOptions(inspectOptions, ...simplifiedData);
		}
	};
	/**
	* @param {object} options?
	* @param {boolean} options.serializeMapAndSet?
	* @return {function}
	*/
	function createSerializer(options = {}) {
		const seen = /* @__PURE__ */ new WeakSet();
		return function(key, value) {
			if (typeof value === "object" && value !== null) {
				if (seen.has(value)) return;
				seen.add(value);
			}
			return serialize(key, value, options);
		};
	}
	/**
	* @param {string} key
	* @param {any} value
	* @param {object} options?
	* @return {any}
	*/
	function serialize(key, value, options = {}) {
		const serializeMapAndSet = options?.serializeMapAndSet !== false;
		if (value instanceof Error) return value.stack;
		if (!value) return value;
		if (typeof value === "function") return `[function] ${value.toString()}`;
		if (value instanceof Date) return value.toISOString();
		if (serializeMapAndSet && value instanceof Map && Object.fromEntries) return Object.fromEntries(value);
		if (serializeMapAndSet && value instanceof Set && Array.from) return Array.from(value);
		return value;
	}
}));
//#endregion
//#region node_modules/electron-log/src/core/transforms/style.js
var require_style = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	module.exports = {
		transformStyles,
		applyAnsiStyles({ data }) {
			return transformStyles(data, styleToAnsi, resetAnsiStyle);
		},
		removeStyles({ data }) {
			return transformStyles(data, () => "");
		}
	};
	var ANSI_COLORS = {
		unset: "\x1B[0m",
		black: "\x1B[30m",
		red: "\x1B[31m",
		green: "\x1B[32m",
		yellow: "\x1B[33m",
		blue: "\x1B[34m",
		magenta: "\x1B[35m",
		cyan: "\x1B[36m",
		white: "\x1B[37m",
		gray: "\x1B[90m"
	};
	function styleToAnsi(style) {
		return ANSI_COLORS[style.replace(/color:\s*(\w+).*/, "$1").toLowerCase()] || "";
	}
	function resetAnsiStyle(string) {
		return string + ANSI_COLORS.unset;
	}
	function transformStyles(data, onStyleFound, onStyleApplied) {
		const foundStyles = {};
		return data.reduce((result, item, index, array) => {
			if (foundStyles[index]) return result;
			if (typeof item === "string") {
				let valueIndex = index;
				let styleApplied = false;
				item = item.replace(/%[1cdfiOos]/g, (match) => {
					valueIndex += 1;
					if (match !== "%c") return match;
					const style = array[valueIndex];
					if (typeof style === "string") {
						foundStyles[valueIndex] = true;
						styleApplied = true;
						return onStyleFound(style, item);
					}
					return match;
				});
				if (styleApplied && onStyleApplied) item = onStyleApplied(item);
			}
			result.push(item);
			return result;
		}, []);
	}
}));
//#endregion
//#region node_modules/electron-log/src/node/transports/console.js
var require_console = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var { concatFirstStringElements, format } = require_format();
	var { maxDepth, toJSON } = require_object();
	var { applyAnsiStyles, removeStyles } = require_style();
	var { transform } = require_transform();
	var consoleMethods = {
		error: console.error,
		warn: console.warn,
		info: console.info,
		verbose: console.info,
		debug: console.debug,
		silly: console.debug,
		log: console.log
	};
	module.exports = consoleTransportFactory;
	var DEFAULT_FORMAT = `%c{h}:{i}:{s}.{ms}{scope}%c ${process.platform === "win32" ? ">" : "›"} {text}`;
	Object.assign(consoleTransportFactory, { DEFAULT_FORMAT });
	function consoleTransportFactory(logger) {
		return Object.assign(transport, {
			colorMap: {
				error: "red",
				warn: "yellow",
				info: "cyan",
				verbose: "unset",
				debug: "gray",
				silly: "gray",
				default: "unset"
			},
			format: DEFAULT_FORMAT,
			level: "silly",
			transforms: [
				addTemplateColors,
				format,
				formatStyles,
				concatFirstStringElements,
				maxDepth,
				toJSON
			],
			useStyles: process.env.FORCE_STYLES,
			writeFn({ message }) {
				(consoleMethods[message.level] || consoleMethods.info)(...message.data);
			}
		});
		function transport(message) {
			const data = transform({
				logger,
				message,
				transport
			});
			transport.writeFn({ message: {
				...message,
				data
			} });
		}
	}
	function addTemplateColors({ data, message, transport }) {
		if (typeof transport.format !== "string" || !transport.format.includes("%c")) return data;
		return [
			`color:${levelToStyle(message.level, transport)}`,
			"color:unset",
			...data
		];
	}
	function canUseStyles(useStyleValue, level) {
		if (typeof useStyleValue === "boolean") return useStyleValue;
		const stream = level === "error" || level === "warn" ? process.stderr : process.stdout;
		return stream && stream.isTTY;
	}
	function formatStyles(args) {
		const { message, transport } = args;
		return (canUseStyles(transport.useStyles, message.level) ? applyAnsiStyles : removeStyles)(args);
	}
	function levelToStyle(level, transport) {
		return transport.colorMap[level] || transport.colorMap.default;
	}
}));
//#endregion
//#region node_modules/electron-log/src/node/transports/file/File.js
var require_File = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var EventEmitter$1 = require("events");
	var fs$4 = require("fs");
	var os$3 = require("os");
	var File = class extends EventEmitter$1 {
		asyncWriteQueue = [];
		bytesWritten = 0;
		hasActiveAsyncWriting = false;
		path = null;
		initialSize = void 0;
		writeOptions = null;
		writeAsync = false;
		constructor({ path, writeOptions = {
			encoding: "utf8",
			flag: "a",
			mode: 438
		}, writeAsync = false }) {
			super();
			this.path = path;
			this.writeOptions = writeOptions;
			this.writeAsync = writeAsync;
		}
		get size() {
			return this.getSize();
		}
		clear() {
			try {
				fs$4.writeFileSync(this.path, "", {
					mode: this.writeOptions.mode,
					flag: "w"
				});
				this.reset();
				return true;
			} catch (e) {
				if (e.code === "ENOENT") return true;
				this.emit("error", e, this);
				return false;
			}
		}
		crop(bytesAfter) {
			try {
				const content = readFileSyncFromEnd(this.path, bytesAfter || 4096);
				this.clear();
				this.writeLine(`[log cropped]${os$3.EOL}${content}`);
			} catch (e) {
				this.emit("error", /* @__PURE__ */ new Error(`Couldn't crop file ${this.path}. ${e.message}`), this);
			}
		}
		getSize() {
			if (this.initialSize === void 0) try {
				const stats = fs$4.statSync(this.path);
				this.initialSize = stats.size;
			} catch (e) {
				this.initialSize = 0;
			}
			return this.initialSize + this.bytesWritten;
		}
		increaseBytesWrittenCounter(text) {
			this.bytesWritten += Buffer.byteLength(text, this.writeOptions.encoding);
		}
		isNull() {
			return false;
		}
		nextAsyncWrite() {
			const file = this;
			if (this.hasActiveAsyncWriting || this.asyncWriteQueue.length === 0) return;
			const text = this.asyncWriteQueue.join("");
			this.asyncWriteQueue = [];
			this.hasActiveAsyncWriting = true;
			fs$4.writeFile(this.path, text, this.writeOptions, (e) => {
				file.hasActiveAsyncWriting = false;
				if (e) file.emit("error", /* @__PURE__ */ new Error(`Couldn't write to ${file.path}. ${e.message}`), this);
				else file.increaseBytesWrittenCounter(text);
				file.nextAsyncWrite();
			});
		}
		reset() {
			this.initialSize = void 0;
			this.bytesWritten = 0;
		}
		toString() {
			return this.path;
		}
		writeLine(text) {
			text += os$3.EOL;
			if (this.writeAsync) {
				this.asyncWriteQueue.push(text);
				this.nextAsyncWrite();
				return;
			}
			try {
				fs$4.writeFileSync(this.path, text, this.writeOptions);
				this.increaseBytesWrittenCounter(text);
			} catch (e) {
				this.emit("error", /* @__PURE__ */ new Error(`Couldn't write to ${this.path}. ${e.message}`), this);
			}
		}
	};
	module.exports = File;
	function readFileSyncFromEnd(filePath, bytesCount) {
		const buffer = Buffer.alloc(bytesCount);
		const stats = fs$4.statSync(filePath);
		const readLength = Math.min(stats.size, bytesCount);
		const offset = Math.max(0, stats.size - bytesCount);
		const fd = fs$4.openSync(filePath, "r");
		const totalBytes = fs$4.readSync(fd, buffer, 0, readLength, offset);
		fs$4.closeSync(fd);
		return buffer.toString("utf8", 0, totalBytes);
	}
}));
//#endregion
//#region node_modules/electron-log/src/node/transports/file/NullFile.js
var require_NullFile = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var File = require_File();
	var NullFile = class extends File {
		clear() {}
		crop() {}
		getSize() {
			return 0;
		}
		isNull() {
			return true;
		}
		writeLine() {}
	};
	module.exports = NullFile;
}));
//#endregion
//#region node_modules/electron-log/src/node/transports/file/FileRegistry.js
var require_FileRegistry = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var EventEmitter = require("events");
	var fs$3 = require("fs");
	var path$3 = require("path");
	var File = require_File();
	var NullFile = require_NullFile();
	var FileRegistry = class extends EventEmitter {
		store = {};
		constructor() {
			super();
			this.emitError = this.emitError.bind(this);
		}
		/**
		* Provide a File object corresponding to the filePath
		* @param {string} filePath
		* @param {WriteOptions} [writeOptions]
		* @param {boolean} [writeAsync]
		* @return {File}
		*/
		provide({ filePath, writeOptions = {}, writeAsync = false }) {
			let file;
			try {
				filePath = path$3.resolve(filePath);
				if (this.store[filePath]) return this.store[filePath];
				file = this.createFile({
					filePath,
					writeOptions,
					writeAsync
				});
			} catch (e) {
				file = new NullFile({ path: filePath });
				this.emitError(e, file);
			}
			file.on("error", this.emitError);
			this.store[filePath] = file;
			return file;
		}
		/**
		* @param {string} filePath
		* @param {WriteOptions} writeOptions
		* @param {boolean} async
		* @return {File}
		* @private
		*/
		createFile({ filePath, writeOptions, writeAsync }) {
			this.testFileWriting({
				filePath,
				writeOptions
			});
			return new File({
				path: filePath,
				writeOptions,
				writeAsync
			});
		}
		/**
		* @param {Error} error
		* @param {File} file
		* @private
		*/
		emitError(error, file) {
			this.emit("error", error, file);
		}
		/**
		* @param {string} filePath
		* @param {WriteOptions} writeOptions
		* @private
		*/
		testFileWriting({ filePath, writeOptions }) {
			fs$3.mkdirSync(path$3.dirname(filePath), { recursive: true });
			fs$3.writeFileSync(filePath, "", {
				flag: "a",
				mode: writeOptions.mode
			});
		}
	};
	module.exports = FileRegistry;
}));
//#endregion
//#region node_modules/electron-log/src/node/transports/file/index.js
var require_file = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var fs$2 = require("fs");
	var os$2 = require("os");
	var path$2 = require("path");
	var FileRegistry = require_FileRegistry();
	var { transform } = require_transform();
	var { removeStyles } = require_style();
	var { format, concatFirstStringElements } = require_format();
	var { toString } = require_object();
	module.exports = fileTransportFactory;
	var globalRegistry = new FileRegistry();
	function fileTransportFactory(logger, { registry = globalRegistry, externalApi } = {}) {
		/** @type {PathVariables} */
		let pathVariables;
		if (registry.listenerCount("error") < 1) registry.on("error", (e, file) => {
			logConsole(`Can't write to ${file}`, e);
		});
		return Object.assign(transport, {
			fileName: getDefaultFileName(logger.variables.processType),
			format: "[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}]{scope} {text}",
			getFile,
			inspectOptions: { depth: 5 },
			level: "silly",
			maxSize: 1024 ** 2,
			readAllLogs,
			sync: true,
			transforms: [
				removeStyles,
				format,
				concatFirstStringElements,
				toString
			],
			writeOptions: {
				flag: "a",
				mode: 438,
				encoding: "utf8"
			},
			archiveLogFn(file) {
				const oldPath = file.toString();
				const inf = path$2.parse(oldPath);
				try {
					fs$2.renameSync(oldPath, path$2.join(inf.dir, `${inf.name}.old${inf.ext}`));
				} catch (e) {
					logConsole("Could not rotate log", e);
					const quarterOfMaxSize = Math.round(transport.maxSize / 4);
					file.crop(Math.min(quarterOfMaxSize, 256 * 1024));
				}
			},
			resolvePathFn(vars) {
				return path$2.join(vars.libraryDefaultDir, vars.fileName);
			},
			setAppName(name) {
				logger.dependencies.externalApi.setAppName(name);
			}
		});
		function transport(message) {
			const file = getFile(message);
			if (transport.maxSize > 0 && file.size > transport.maxSize) {
				transport.archiveLogFn(file);
				file.reset();
			}
			const content = transform({
				logger,
				message,
				transport
			});
			file.writeLine(content);
		}
		function initializeOnFirstAccess() {
			if (pathVariables) return;
			pathVariables = Object.create(Object.prototype, {
				...Object.getOwnPropertyDescriptors(externalApi.getPathVariables()),
				fileName: {
					get() {
						return transport.fileName;
					},
					enumerable: true
				}
			});
			if (typeof transport.archiveLog === "function") {
				transport.archiveLogFn = transport.archiveLog;
				logConsole("archiveLog is deprecated. Use archiveLogFn instead");
			}
			if (typeof transport.resolvePath === "function") {
				transport.resolvePathFn = transport.resolvePath;
				logConsole("resolvePath is deprecated. Use resolvePathFn instead");
			}
		}
		function logConsole(message, error = null, level = "error") {
			const data = [`electron-log.transports.file: ${message}`];
			if (error) data.push(error);
			logger.transports.console({
				data,
				date: /* @__PURE__ */ new Date(),
				level
			});
		}
		function getFile(msg) {
			initializeOnFirstAccess();
			const filePath = transport.resolvePathFn(pathVariables, msg);
			return registry.provide({
				filePath,
				writeAsync: !transport.sync,
				writeOptions: transport.writeOptions
			});
		}
		function readAllLogs({ fileFilter = (f) => f.endsWith(".log") } = {}) {
			initializeOnFirstAccess();
			const logsPath = path$2.dirname(transport.resolvePathFn(pathVariables));
			if (!fs$2.existsSync(logsPath)) return [];
			return fs$2.readdirSync(logsPath).map((fileName) => path$2.join(logsPath, fileName)).filter(fileFilter).map((logPath) => {
				try {
					return {
						path: logPath,
						lines: fs$2.readFileSync(logPath, "utf8").split(os$2.EOL)
					};
				} catch {
					return null;
				}
			}).filter(Boolean);
		}
	}
	function getDefaultFileName(processType = process.type) {
		switch (processType) {
			case "renderer": return "renderer.log";
			case "worker": return "worker.log";
			default: return "main.log";
		}
	}
}));
//#endregion
//#region node_modules/electron-log/src/node/transports/ipc.js
var require_ipc = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var { maxDepth, toJSON } = require_object();
	var { transform } = require_transform();
	module.exports = ipcTransportFactory;
	/**
	* @param logger
	* @param {ElectronExternalApi} externalApi
	* @returns {transport|null}
	*/
	function ipcTransportFactory(logger, { externalApi }) {
		Object.assign(transport, {
			depth: 3,
			eventId: "__ELECTRON_LOG_IPC__",
			level: logger.isDev ? "silly" : false,
			transforms: [toJSON, maxDepth]
		});
		return externalApi?.isElectron() ? transport : void 0;
		function transport(message) {
			if (message?.variables?.processType === "renderer") return;
			externalApi?.sendIpc(transport.eventId, {
				...message,
				data: transform({
					logger,
					message,
					transport
				})
			});
		}
	}
}));
//#endregion
//#region node_modules/electron-log/src/node/transports/remote.js
var require_remote = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var http$1 = require("http");
	var https = require("https");
	var { transform } = require_transform();
	var { removeStyles } = require_style();
	var { toJSON, maxDepth } = require_object();
	module.exports = remoteTransportFactory;
	function remoteTransportFactory(logger) {
		return Object.assign(transport, {
			client: { name: "electron-application" },
			depth: 6,
			level: false,
			requestOptions: {},
			transforms: [
				removeStyles,
				toJSON,
				maxDepth
			],
			makeBodyFn({ message }) {
				return JSON.stringify({
					client: transport.client,
					data: message.data,
					date: message.date.getTime(),
					level: message.level,
					scope: message.scope,
					variables: message.variables
				});
			},
			processErrorFn({ error }) {
				logger.processMessage({
					data: [`electron-log: can't POST ${transport.url}`, error],
					level: "warn"
				}, { transports: ["console", "file"] });
			},
			sendRequestFn({ serverUrl, requestOptions, body }) {
				const request = (serverUrl.startsWith("https:") ? https : http$1).request(serverUrl, {
					method: "POST",
					...requestOptions,
					headers: {
						"Content-Type": "application/json",
						"Content-Length": body.length,
						...requestOptions.headers
					}
				});
				request.write(body);
				request.end();
				return request;
			}
		});
		function transport(message) {
			if (!transport.url) return;
			const body = transport.makeBodyFn({
				logger,
				message: {
					...message,
					data: transform({
						logger,
						message,
						transport
					})
				},
				transport
			});
			const request = transport.sendRequestFn({
				serverUrl: transport.url,
				requestOptions: transport.requestOptions,
				body: Buffer.from(body, "utf8")
			});
			request.on("error", (error) => transport.processErrorFn({
				error,
				logger,
				message,
				request,
				transport
			}));
		}
	}
}));
//#endregion
//#region node_modules/electron-log/src/node/createDefaultLogger.js
var require_createDefaultLogger = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var Logger = require_Logger();
	var ErrorHandler = require_ErrorHandler();
	var EventLogger = require_EventLogger();
	var transportConsole = require_console();
	var transportFile = require_file();
	var transportIpc = require_ipc();
	var transportRemote = require_remote();
	module.exports = createDefaultLogger;
	function createDefaultLogger({ dependencies, initializeFn }) {
		const defaultLogger = new Logger({
			dependencies,
			errorHandler: new ErrorHandler(),
			eventLogger: new EventLogger(),
			initializeFn,
			isDev: dependencies.externalApi?.isDev(),
			logId: "default",
			transportFactories: {
				console: transportConsole,
				file: transportFile,
				ipc: transportIpc,
				remote: transportRemote
			},
			variables: { processType: "main" }
		});
		defaultLogger.default = defaultLogger;
		defaultLogger.Logger = Logger;
		defaultLogger.processInternalErrorFn = (e) => {
			defaultLogger.transports.console.writeFn({ message: {
				data: ["Unhandled electron-log error", e],
				level: "error"
			} });
		};
		return defaultLogger;
	}
}));
//#endregion
//#region node_modules/electron-log/src/main/index.js
var require_main$1 = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var electron$1 = require("electron");
	var ElectronExternalApi = require_ElectronExternalApi();
	var { initialize } = require_initialize();
	var createDefaultLogger = require_createDefaultLogger();
	var externalApi = new ElectronExternalApi({ electron: electron$1 });
	var defaultLogger = createDefaultLogger({
		dependencies: { externalApi },
		initializeFn: initialize
	});
	module.exports = defaultLogger;
	externalApi.onIpc("__ELECTRON_LOG__", (_, message) => {
		if (message.scope) defaultLogger.Logger.getInstance(message).scope(message.scope);
		const date = new Date(message.date);
		processMessage({
			...message,
			date: date.getTime() ? date : /* @__PURE__ */ new Date()
		});
	});
	externalApi.onIpcInvoke("__ELECTRON_LOG__", (_, { cmd = "", logId }) => {
		switch (cmd) {
			case "getOptions": return {
				levels: defaultLogger.Logger.getInstance({ logId }).levels,
				logId
			};
			default:
				processMessage({
					data: [`Unknown cmd '${cmd}'`],
					level: "error"
				});
				return {};
		}
	});
	function processMessage(message) {
		defaultLogger.Logger.getInstance(message)?.processMessage(message);
	}
}));
//#endregion
//#region node_modules/electron-log/main.js
var require_main = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	module.exports = require_main$1();
}));
//#endregion
//#region electron/main/logger.ts
function initLogPath() {
	if (initialized) return;
	initialized = true;
	const { app } = require("electron");
	const { join, dirname } = require("node:path");
	const logDir = app.isPackaged ? join(dirname(app.getPath("exe")), "logs") : join(app.getAppPath(), "src", "log");
	const getDate = () => {
		const d = /* @__PURE__ */ new Date();
		return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
	};
	import_main.default.transports.file.resolvePathFn = (variables) => {
		return join(logDir, getDate() + ".log");
	};
}
function ensureLogPath() {
	initLogPath();
}
var import_main, initialized, logger_default;
var init_logger = __esmMin((() => {
	import_main = /* @__PURE__ */ __toESM(require_main());
	import_main.default.initialize();
	import_main.default.transports.file.maxSize = 5 * 1024 * 1024;
	import_main.default.transports.console.level = "error";
	initialized = false;
	logger_default = import_main.default;
}));
//#endregion
//#region electron/main/conversion-registry.ts
init_logger();
var tasks = /* @__PURE__ */ new Map();
var logger$4 = {
	info: () => {},
	warn: () => {}
};
/** 注入日志实现（生产环境在 main 进程入口调用，传入 electron-log 实例）。 */
function setRegistryLogger(log) {
	logger$4 = log;
}
/** 注册一个在途转换任务，返回 id。任务结束后应调用 unregister(id)。 */
function registerConversion(kill) {
	const id = (0, node_crypto.randomUUID)();
	tasks.set(id, {
		id,
		kill
	});
	return id;
}
/** 注销一个任务（任务正常结束或失败后调用）。id 不存在时静默忽略。 */
function unregisterConversion(id) {
	tasks.delete(id);
}
/** kill 所有在途转换任务。退出 / 关闭应用时调用。
*  返回被 kill 的任务数。对每个任务吞掉 kill 抛出的异常（进程可能已退出）。 */
function killAllConversions() {
	const count = tasks.size;
	if (count === 0) return 0;
	logger$4.info(`Killing ${count} in-flight conversion(s) on quit`);
	for (const task of tasks.values()) try {
		task.kill();
	} catch (err) {
		logger$4.warn(`Conversion kill failed for ${task.id}:`, err?.message ?? err);
	}
	tasks.clear();
	return count;
}
//#endregion
//#region electron/main/hw-encoder.ts
var execFileAsync = (0, node_util.promisify)(node_child_process.execFile);
var PRIORITY = [
	"h264_nvenc",
	"h264_qsv",
	"h264_amf"
];
var cached = null;
var probing = null;
var logger$3 = {
	info: () => {},
	warn: () => {}
};
/** 注入日志实现（生产环境在 main 进程入口调用，传入 electron-log 实例）。 */
function setHwEncoderLogger(log) {
	logger$3 = log;
}
/** 从 ffmpeg -encoders 输出里解析出可用的 h264 硬编器，按优先级返回第一个。
*  纯函数，便于单测（注入 encoders 文本）。无可用硬编器时返回 'libx264'。 */
function pickHwEncoder(encodersText) {
	for (const enc of PRIORITY) if (new RegExp(`\\b${enc}\\b`).test(encodersText)) return enc;
	return "libx264";
}
/** 探测可用硬件编码器，结果进程内缓存。多次调用返回同一 Promise。
*  失败（ffmpeg 不可用 / 超时）时回退 'libx264'。 */
function getH264Encoder(ffmpegBin) {
	if (cached) return Promise.resolve(cached);
	if (probing) return probing;
	probing = (async () => {
		try {
			const { stdout } = await execFileAsync(ffmpegBin, ["-hide_banner", "-encoders"], {
				timeout: 5e3,
				maxBuffer: 2 * 1024 * 1024
			});
			const enc = pickHwEncoder(stdout);
			logger$3.info(`H.264 encoder selected: ${enc}`);
			cached = enc;
			return enc;
		} catch (err) {
			logger$3.warn("HW encoder probe failed, falling back to libx264:", err?.message ?? err);
			cached = "libx264";
			return "libx264";
		} finally {
			probing = null;
		}
	})();
	return probing;
}
/** 为给定编码器和 crf 构造 ffmpeg outputOptions（re-encode 路径用）。
*  libx264 用 -crf；硬编器用各自的质量参数（nvenc -cq、qsv -global_quality、amf -qp_i/-qp_p）。
*  纯函数，便于单测。 */
function buildEncodeOptions(encoder, crf, numThreads) {
	switch (encoder) {
		case "h264_nvenc": return [
			"-c:v",
			"h264_nvenc",
			"-preset",
			"p4",
			"-rc",
			"vbr",
			"-cq",
			crf,
			"-b:v",
			"0"
		];
		case "h264_qsv": return [
			"-c:v",
			"h264_qsv",
			"-preset",
			"veryfast",
			"-global_quality",
			crf
		];
		case "h264_amf": return [
			"-c:v",
			"h264_amf",
			"-quality",
			"balanced",
			"-rc",
			"cqp",
			"-qp_i",
			crf,
			"-qp_p",
			crf
		];
		default: return [
			"-c:v",
			"libx264",
			"-preset",
			"ultrafast",
			"-crf",
			crf,
			"-threads",
			String(numThreads)
		];
	}
}
//#endregion
//#region electron/main/ffmpeg.ts
var ffmpegBinPath = electron.app.isPackaged ? node_path.default.join(process.resourcesPath, "ffmpeg.exe") : node_path.default.join(__dirname, "..", "..", "vendor", "ffmpeg", "ffmpeg.exe");
fluent_ffmpeg.default.setFfmpegPath(ffmpegBinPath);
var NUM_THREADS = Math.min(node_os.default.cpus().length, 8);
function convertWebmToMp4(inputPath, outputPath, onProgress, crop) {
	if (!crop) return new Promise((resolve) => {
		const cmd = (0, fluent_ffmpeg.default)(inputPath);
		const taskId = registerConversion(() => cmd.kill("SIGKILL"));
		cmd.outputOptions([
			"-c:v",
			"copy",
			"-c:a",
			"aac",
			"-b:a",
			"128k",
			"-movflags",
			"+faststart"
		]).output(outputPath).on("progress", () => {
			onProgress?.({
				percent: 80,
				targetSize: 0
			});
		}).on("end", () => {
			unregisterConversion(taskId);
			onProgress?.({
				percent: 100,
				targetSize: 0
			});
			resolve({
				success: true,
				outputPath
			});
		}).on("error", (err) => {
			unregisterConversion(taskId);
			logger_default.error("MP4 remux failed:", err.message);
			resolve({
				success: false,
				outputPath: "",
				error: err.message
			});
		}).run();
	});
	const tmpPath = outputPath.replace(/\.mp4$/i, "_tmp.mp4");
	const cropFilter = `crop=${Math.round(crop.width / 2) * 2}:${Math.round(crop.height / 2) * 2}:${Math.round(crop.x / 2) * 2}:${Math.round(crop.y / 2) * 2},`;
	return new Promise(async (resolve) => {
		const hwEncoder = await getH264Encoder(ffmpegBinPath);
		function runPass1(encoder) {
			return new Promise((res) => {
				const pass1 = (0, fluent_ffmpeg.default)(inputPath);
				const taskId = registerConversion(() => pass1.kill("SIGKILL"));
				pass1.outputOptions([
					...buildEncodeOptions(encoder, "23", NUM_THREADS),
					"-vf",
					`${cropFilter}pad=ceil(iw/2)*2:ceil(ih/2)*2,format=yuv420p`,
					"-an",
					"-movflags +faststart"
				]).output(tmpPath).on("progress", (progress) => {
					onProgress?.({
						percent: Math.round((progress.percent ?? 0) * 100) / 200,
						targetSize: progress.targetSize ?? 0
					});
				}).on("end", () => {
					unregisterConversion(taskId);
					res({ success: true });
				}).on("error", (err) => {
					unregisterConversion(taskId);
					logger_default.error(`MP4 pass1 failed (${encoder}):`, err.message);
					res({
						success: false,
						error: err.message
					});
				}).run();
			});
		}
		let p1 = await runPass1(hwEncoder);
		if (!p1.success && hwEncoder !== "libx264") {
			logger_default.warn(`MP4 pass1: ${hwEncoder} failed, retrying with libx264`);
			await node_fs.default.promises.unlink(tmpPath).catch(() => {});
			p1 = await runPass1("libx264");
		}
		if (!p1.success) {
			resolve({
				success: false,
				outputPath: "",
				error: p1.error
			});
			return;
		}
		const pass2 = (0, fluent_ffmpeg.default)(tmpPath);
		const pass2Task = registerConversion(() => pass2.kill("SIGKILL"));
		pass2.addInput(inputPath).outputOptions([
			"-c:v",
			"copy",
			"-c:a",
			"aac",
			"-b:a",
			"128k",
			"-map",
			"0:v",
			"-map",
			"1:a?",
			"-shortest",
			"-movflags",
			"+faststart"
		]).output(outputPath).on("progress", (progress) => {
			onProgress?.({
				percent: Math.round((progress.percent ?? 0) * 100) / 200 + 50,
				targetSize: progress.targetSize ?? 0
			});
		}).on("end", () => {
			unregisterConversion(pass2Task);
			node_fs.default.promises.unlink(tmpPath).catch(() => {});
			resolve({
				success: true,
				outputPath
			});
		}).on("error", (err) => {
			unregisterConversion(pass2Task);
			logger_default.error("MP4 audio mux failed:", err.message);
			node_fs.default.promises.rename(tmpPath, outputPath).then(() => resolve({
				success: true,
				outputPath
			})).catch(() => {
				node_fs.default.promises.unlink(tmpPath).catch(() => {});
				resolve({
					success: false,
					outputPath: "",
					error: err.message
				});
			});
		}).run();
	});
}
function cropVideo(inputPath, outputPath, crop, onProgress) {
	const w = Math.round(crop.width / 2) * 2;
	const h = Math.round(crop.height / 2) * 2;
	const cx = Math.round(crop.x / 2) * 2;
	const cy = Math.round(crop.y / 2) * 2;
	return new Promise(async (resolve) => {
		const vf = `crop=${w}:${h}:${cx}:${cy},format=yuv420p`;
		const hwEncoder = await getH264Encoder(ffmpegBinPath);
		function runOnce(encoder, crf) {
			return new Promise((res) => {
				const cmd = (0, fluent_ffmpeg.default)(inputPath);
				const taskId = registerConversion(() => cmd.kill("SIGKILL"));
				cmd.outputOptions([
					...buildEncodeOptions(encoder, crf, NUM_THREADS),
					"-vf",
					vf,
					"-c:a",
					"copy",
					"-movflags",
					"+faststart"
				]).output(outputPath).on("progress", (progress) => {
					onProgress?.({
						percent: Math.round((progress.percent ?? 0) * 100),
						targetSize: progress.targetSize ?? 0
					});
				}).on("end", () => {
					unregisterConversion(taskId);
					res({
						success: true,
						outputPath
					});
				}).on("error", (err) => {
					unregisterConversion(taskId);
					logger_default.error(`Crop failed (${encoder}):`, err.message);
					res({
						success: false,
						outputPath: "",
						error: err.message
					});
				}).run();
			});
		}
		let result = await runOnce(hwEncoder, "18");
		if (!result.success && hwEncoder !== "libx264") {
			logger_default.warn(`Crop: ${hwEncoder} failed, retrying with libx264`);
			result = await runOnce("libx264", "18");
		}
		resolve(result);
	});
}
function mergeMultiScreen(inputs, outputPath, onProgress) {
	return new Promise((resolve) => {
		const totalW = Math.max(...inputs.map((i) => i.bounds.x + i.bounds.width)) - Math.min(...inputs.map((i) => i.bounds.x));
		const totalH = Math.max(...inputs.map((i) => i.bounds.y + i.bounds.height)) - Math.min(...inputs.map((i) => i.bounds.y));
		const originX = Math.min(...inputs.map((i) => i.bounds.x));
		const originY = Math.min(...inputs.map((i) => i.bounds.y));
		const cw = Math.round(totalW / 2) * 2;
		const ch = Math.round(totalH / 2) * 2;
		logger_default.info("Merge canvas size:", cw, "x", ch);
		logger_default.info("Merge inputs:", inputs.map((inp, i) => `[${i}] ${inp.filePath} bounds=${JSON.stringify(inp.bounds)}`).join(", "));
		const remuxedPaths = [];
		const totalInputs = inputs.length;
		function remuxOne(filePath, index) {
			const remuxedPath = filePath.replace(/\.webm$/i, "_remux.mp4");
			return new Promise((resolve) => {
				const remux = (0, fluent_ffmpeg.default)(filePath);
				const taskId = registerConversion(() => remux.kill("SIGKILL"));
				remux.outputOptions(["-c", "copy"]).output(remuxedPath).on("end", () => {
					unregisterConversion(taskId);
					logger_default.info(`Merge remux ${index + 1}/${totalInputs} done`);
					resolve({
						success: true,
						remuxedPath
					});
				}).on("error", (err) => {
					unregisterConversion(taskId);
					logger_default.error(`Merge remux ${index + 1} failed:`, err.message);
					resolve({
						success: false,
						remuxedPath,
						error: err.message
					});
				}).run();
			});
		}
		async function cleanupTempFiles() {
			for (const p of remuxedPaths) await node_fs.default.promises.unlink(p).catch(() => {});
			for (const inp of inputs) await node_fs.default.promises.unlink(inp.filePath).catch(() => {});
		}
		async function doMerge() {
			const hwEncoder = await getH264Encoder(ffmpegBinPath);
			const filters = [`color=c=black:s=${cw}x${ch}[bg]`];
			let prevLabel = "[bg]";
			for (let i = 0; i < inputs.length; i++) {
				const inp = inputs[i];
				const dx = Math.round((inp.bounds.x - originX) / 2) * 2;
				const dy = Math.round((inp.bounds.y - originY) / 2) * 2;
				const sw = Math.round(inp.bounds.width / 2) * 2;
				const sh = Math.round(inp.bounds.height / 2) * 2;
				const scaledLabel = `[s${i}]`;
				const outLabel = i === inputs.length - 1 ? "[out]" : `[tmp${i}]`;
				filters.push(`[${i}:v]scale=${sw}:${sh},setsar=1${scaledLabel}`);
				const shortestOpt = i === inputs.length - 1 ? ":shortest=1" : "";
				filters.push(`${prevLabel}${scaledLabel}overlay=${dx}:${dy}${shortestOpt}${outLabel}`);
				prevLabel = outLabel;
			}
			filters.push("[out]format=yuv420p");
			logger_default.info("Merge filter_complex:", filters.join(";"));
			function runMergeOnce(encoder) {
				return new Promise((resolve) => {
					const cmd = (0, fluent_ffmpeg.default)();
					const taskId = registerConversion(() => cmd.kill("SIGKILL"));
					for (const p of remuxedPaths) cmd.addInput(p);
					cmd.complexFilter(filters).outputOptions([
						...buildEncodeOptions(encoder, "23", NUM_THREADS),
						"-movflags",
						"+faststart"
					]).output(outputPath).on("start", () => {
						logger_default.info(`Merge ffmpeg command started (${encoder})`);
					}).on("progress", (progress) => {
						const pct = Math.round(progress.percent ?? 0);
						onProgress?.({
							percent: Math.min(30 + pct * .7, 100),
							targetSize: progress.targetSize ?? 0
						});
					}).on("end", () => {
						unregisterConversion(taskId);
						logger_default.info("Merge completed successfully");
						for (const inp of inputs) node_fs.default.promises.unlink(inp.filePath).catch(() => {});
						for (const p of remuxedPaths) node_fs.default.promises.unlink(p).catch(() => {});
						resolve({
							success: true,
							outputPath
						});
					}).on("error", (err) => {
						unregisterConversion(taskId);
						logger_default.error(`Multi-screen merge failed (${encoder}):`, err.message);
						for (const inp of inputs) node_fs.default.promises.unlink(inp.filePath).catch(() => {});
						for (const p of remuxedPaths) node_fs.default.promises.unlink(p).catch(() => {});
						resolve({
							success: false,
							outputPath: "",
							error: err.message
						});
					}).run();
				});
			}
			let result = await runMergeOnce(hwEncoder);
			if (!result.success && hwEncoder !== "libx264") {
				logger_default.warn(`Merge: ${hwEncoder} failed, retrying with libx264`);
				await node_fs.default.promises.unlink(outputPath).catch(() => {});
				result = await runMergeOnce("libx264");
			}
			return result;
		}
		(async () => {
			for (let i = 0; i < totalInputs; i++) {
				const r = await remuxOne(inputs[i].filePath, i);
				if (!r.success) {
					logger_default.error(`Merge aborted: remux ${i + 1}/${totalInputs} failed, short-circuiting`);
					await node_fs.default.promises.unlink(r.remuxedPath).catch(() => {});
					await cleanupTempFiles();
					resolve({
						success: false,
						outputPath: "",
						error: r.error
					});
					return;
				}
				remuxedPaths.push(r.remuxedPath);
				onProgress?.({
					percent: Math.round((i + 1) / totalInputs * 30),
					targetSize: 0
				});
			}
			resolve(await doMerge());
		})();
	});
}
function convertToGif(inputPath, outputPath, options, onProgress) {
	const { execFile } = require("node:child_process");
	const ffmpegBin = ffmpegBinPath;
	const width = options?.width ?? 480;
	const fps = options?.fps ?? 10;
	const palettePath = node_path.default.join(node_os.default.tmpdir(), `gif_palette_${Date.now()}.png`);
	logger_default.info("GIF conversion - input:", inputPath, "palette:", palettePath, "output:", outputPath);
	const args1 = [
		"-y",
		"-i",
		inputPath,
		"-vf",
		`fps=${fps},scale=${width}:-1:flags=lanczos,palettegen`,
		palettePath
	];
	return new Promise((resolve) => {
		let task1Id = "";
		let task2Id = "";
		const proc1 = execFile(ffmpegBin, args1, (err1) => {
			unregisterConversion(task1Id);
			if (err1) {
				logger_default.error("GIF palette gen failed:", err1.message);
				resolve({
					success: false,
					outputPath: "",
					error: err1.message
				});
				return;
			}
			logger_default.info("GIF palette generated successfully");
			const proc = execFile(ffmpegBin, [
				"-y",
				"-i",
				inputPath,
				"-i",
				palettePath,
				"-filter_complex",
				`[0:v]fps=${fps},scale=${width}:-1:flags=lanczos[x];[x][1:v]paletteuse`,
				outputPath
			], (err2) => {
				unregisterConversion(task2Id);
				node_fs.default.promises.unlink(palettePath).catch(() => {});
				if (err2) {
					logger_default.error("GIF creation failed:", err2.message);
					resolve({
						success: false,
						outputPath: "",
						error: err2.message
					});
				} else resolve({
					success: true,
					outputPath
				});
			});
			task2Id = registerConversion(() => proc.kill("SIGKILL"));
			if (proc.stdout) proc.stdout.on("data", (data) => {
				const match = data.toString().match(/time=(\d+:\d+:\d+\.\d+)/);
				if (match && options?.duration) {
					const parts = match[1].split(":").map(Number);
					const current = parts[0] * 3600 + parts[1] * 60 + parts[2];
					const percent = Math.min(Math.round(current / options.duration * 100), 99);
					onProgress?.({
						percent: percent + 50,
						targetSize: 0
					});
				} else onProgress?.({
					percent: 75,
					targetSize: 0
				});
			});
		});
		task1Id = registerConversion(() => proc1.kill("SIGKILL"));
	});
}
//#endregion
//#region electron/main/i18n.ts
function isLocale(v) {
	return v === "zh" || v === "en";
}
/** 主进程内联 HTML 构建 / 启动时调用。渲染进程不直接调（走 getAppI18nBundle）。 */
function setI18nLocale(l) {
	currentLocale = l;
}
/** 把 key 翻译为指定语言；缺失 key 时回退 en → zh → key 本身（防 UI 空白）。 */
function translate(locale, key, params) {
	let s = (locale === "en" ? en : zh)[key] ?? en[key] ?? zh[key] ?? key;
	if (params) for (const [k, v] of Object.entries(params)) s = s.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
	return s;
}
/** 当前语言的 t()（主进程内联 HTML、渲染层 bundle 的下游都走它）。 */
function t(key, params) {
	return translate(currentLocale, key, params);
}
/** 给渲染进程的完整 bundle（locale + 当前语言词条表），一次拉齐免循环 IPC。 */
function getAppI18nBundle() {
	return {
		locale: currentLocale,
		messages: currentLocale === "en" ? en : zh
	};
}
var zh, en, currentLocale;
var init_i18n = __esmMin((() => {
	zh = {
		"common.confirm": "确认",
		"common.cancel": "取消",
		"common.ok": "确定",
		"common.close": "关闭",
		"common.loading": "加载中...",
		"common.reset": "重置",
		"common.on": "开",
		"common.off": "关",
		"common.allow": "允许",
		"common.deny": "拒绝",
		"common.alwaysAllow": "始终允许",
		"common.save": "保存",
		"win.minimize": "最小化",
		"win.maximize": "最大化",
		"ball.menu.record": "录屏",
		"ball.menu.ai": "AI助手",
		"ball.menu.todo": "待办便签",
		"ball.menu.settings": "设置",
		"ball.cooling.title": "散热模式",
		"ball.cooling.fanOn": "风扇已全速",
		"ball.cooling.powerOnly": "功耗散热中",
		"ball.cooling.monitoring": "温度监测中",
		"ball.cooling.tempUnknown": "温度未知",
		"ball.cooling.disk": "磁盘",
		"ball.cooling.mem": "内存",
		"ball.cooling.done": "散热完成 {before}°C → {after}°C",
		"ball.cooling.doneNoTemp": "散热完成",
		"settings.group.ball": "悬浮球",
		"settings.ball.show": "显示悬浮球",
		"settings.ball.showDesc": "关闭后悬浮球隐藏，可从托盘「显示设置窗口」重新打开",
		"settings.ball.alwaysOnTop": "始终置顶",
		"settings.ball.alwaysOnTopDesc": "关闭后悬浮球可被其他窗口遮挡",
		"settings.ball.resetPos": "重置位置",
		"settings.ball.resetPosDesc": "把悬浮球移回屏幕中心",
		"settings.group.menu": "悬浮球菜单",
		"settings.group.system": "系统",
		"settings.group.language": "语言",
		"settings.system.openAtLogin": "开机自启",
		"settings.system.openAtLoginDesc": "登录系统时自动启动本应用",
		"settings.language.label": "界面语言",
		"settings.language.desc": "切换后悬浮球、AI 岛等窗口在下次打开时生效",
		"settings.lang.zh": "简体中文",
		"settings.lang.en": "English",
		"settings.group.about": "关于",
		"settings.about.appName": "MUERZHI 万能 AI 悬浮球",
		"settings.about.desc": "屏幕录制 · AI 助手 · 待办便签 · 一键散热",
		"settings.about.author": "作者：MUERZHI",
		"settings.about.github": "GitHub 开源仓库 · 点击访问",
		"aiIsland.idle": "AI 待机",
		"aiIsland.thinking": "AI 思考中",
		"aiIsland.working": "AI 工作中",
		"aiIsland.error": "AI 出错了",
		"aiIsland.notification": "等待审批",
		"aiIsland.done": "任务完成",
		"aiIsland.permTitle": "权限请求",
		"aiIsland.permTool": "工具",
		"aiIsland.permInput": "参数",
		"aiIsland.questionTitle": "AI 正在提问",
		"aiIsland.prevQuestion": "上一题",
		"aiIsland.nextQuestion": "下一题",
		"aiIsland.submitAnswer": "提交答案",
		"aiIsland.know": "知道了",
		"aiIsland.otherPlaceholder": "输入其他内容…",
		"aiIsland.otherHint": "可与其他选项同时选择。",
		"aiIsland.answerInClaude": "请到 Claude Code 界面作答，这里仅作提醒。",
		"aiIsland.viewDetail": "点击查看详情",
		"aiIsland.unknown": "未知操作",
		"aiIsland.other": "其他",
		"aiIsland.progress": "第 {n}/{t} 题",
		"record.title": "高清录屏",
		"record.start": "开始录制",
		"record.pause": "暂停",
		"record.resume": "继续",
		"record.stop": "停止",
		"record.allScreens": "多屏录制",
		"record.selectRegion": "区域录制",
		"record.toggleSys": "系统音频",
		"record.closeAndStop": "关闭并停止录制",
		"record.claudeRequest": "Claude Code 请求权限",
		"record.targetInfo": "目标信息",
		"record.homeTab": "录屏",
		"record.settingsTab": "设置",
		"record.fullscreen": "全屏录制",
		"record.customRegion": "自定义区域",
		"record.primary": "主",
		"record.mic": "麦克风",
		"record.recBtn": "录制",
		"record.toggleCamera": "开启摄像头",
		"record.toggleMic": "开启麦克风",
		"record.startShort": "开始录制 ({k})",
		"record.pauseShort": "暂停 ({k})",
		"record.resumeShort": "继续 ({k})",
		"record.stopShort": "停止录制 ({k})",
		"record.toggleCameraShort": "开启摄像头 ({k})",
		"record.toggleMicShort": "开启麦克风 ({k})",
		"record.converting": "转换中",
		"record.convertDone": "转换完成",
		"record.listEmpty": "暂无录制记录",
		"record.play": "播放",
		"record.exportGif": "导出 GIF",
		"record.delete": "删除",
		"record.duration": "时长",
		"record.size": "大小",
		"record.history": "录制历史",
		"record.openFolder": "打开文件夹",
		"settings.title": "设置",
		"settings.video": "视频设置",
		"settings.format": "录制格式",
		"settings.quality": "画质",
		"settings.fps": "帧率",
		"settings.outputDir": "输出目录",
		"settings.changeDir": "更改",
		"settings.videoSource": "视频来源",
		"settings.audio": "音频",
		"settings.mic": "麦克风",
		"settings.systemAudio": "系统音频",
		"settings.camera": "摄像头",
		"settings.cameraSource": "摄像头来源",
		"settings.drawing": "画笔",
		"settings.drawingColor": "画笔颜色",
		"settings.drawingWidth": "画笔粗细",
		"settings.shortcuts": "快捷键",
		"settings.shortcutStart": "开始/停止",
		"settings.shortcutPause": "暂停/继续",
		"settings.shortcutCamera": "切换摄像头",
		"settings.shortcutDrawing": "切换画笔",
		"settings.recordingTitle": "录屏设置",
		"settings.output": "输出",
		"settings.saveDir": "保存目录",
		"settings.chooseDir": "选择保存目录",
		"settings.browse": "浏览",
		"settings.defaultFormat": "默认格式",
		"settings.maxFps": "最大帧率",
		"settings.qualityHigh": "高 (5 Mbps)",
		"settings.qualityMedium": "中 (2.5 Mbps)",
		"settings.qualityLow": "低 (1 Mbps)",
		"settings.default": "默认",
		"settings.device": "设备",
		"settings.about": "关于",
		"ai.title": "AI 助手",
		"ai.installHooks": "安装 Claude Code 钩子",
		"ai.uninstallHooks": "卸载 Claude Code 钩子",
		"ai.hooksStatus": "钩子状态",
		"ai.hooksInstalled": "已安装",
		"ai.hooksNotInstalled": "未安装",
		"ai.autoAllow": "自动允许权限",
		"ai.autoAllowDesc": "开启后新权限请求自动放行，不再弹出审批卡片",
		"ai.expireToggle": "审批与提问自动过期",
		"ai.expireToggleDesc": "到期后权限卡自动取消、提问卡自动收起",
		"ai.expireTime": "过期时长",
		"ai.expireTimeDesc": "队首卡片的处理时限",
		"ai.minutes": "分钟",
		"ai.serverPort": "本地服务端口",
		"ai.serverRunning": "服务运行中",
		"ai.serverStopped": "服务未运行",
		"ai.claudeRunning": "Claude Code 正在运行",
		"ai.claudeStopped": "Claude Code 未检测到",
		"ai.sessionCount": "会话数",
		"ai.sessionsCount": "{n} 个会话",
		"ai.waiting": "Claude 运行中，等待交互",
		"ai.noActive": "无活跃会话",
		"ai.online": "在线",
		"ai.offline": "离线",
		"ai.state.idle": "空闲",
		"ai.state.thinking": "思考中",
		"ai.state.working": "工作中",
		"ai.state.error": "错误",
		"ai.state.notification": "待审批",
		"ai.state.done": "完成",
		"ai.groupIntegration": "集成",
		"ai.hooksDesc": "钩子脚本状态",
		"ai.groupPermission": "权限",
		"ai.autoAllowTitle": "自动允许所有权限",
		"ai.autoAllowSessionTitle": "选择性自动审批（按会话）",
		"ai.autoAllowSessionDesc": "仅对勾选的会话自动放行权限，其余仍弹审批卡",
		"ai.noActiveSession": "暂无活动会话",
		"ai.groupIsland": "悬浮岛外观",
		"ai.flat": "横条态",
		"ai.flatDesc": "把悬浮岛默认状态条压成更扁的细横条，省屏幕空间",
		"todo.title": "待办便签",
		"todo.add": "添加",
		"todo.placeholder": "输入待办事项...",
		"todo.empty": "暂无待办",
		"todo.memo": "便签",
		"todo.task": "待办",
		"todo.addTodo": "新建待办",
		"todo.addMemo": "新建便签",
		"todo.done": "完成",
		"todo.undone": "恢复",
		"todo.delete": "删除",
		"todo.pin": "置顶",
		"todo.unpin": "取消置顶",
		"todo.edit": "编辑",
		"todo.save": "保存",
		"todo.cancel": "取消",
		"todo.reminder": "提醒",
		"todo.reminderNone": "无提醒",
		"todo.priority": "优先级",
		"todo.priorityLow": "低",
		"todo.priorityMedium": "中",
		"todo.priorityHigh": "高",
		"todo.priorityUrgent": "紧急",
		"todo.titlePlaceholder": "输入标题...",
		"todo.contentPlaceholder": "输入内容...",
		"todo.reminderOverdue": "已到期：{title}",
		"todo.count": "{n} 个待办",
		"todo.searchPlaceholder": "搜索待办/便签...",
		"todo.incomplete": "{n} 项未完成",
		"todo.back": "返回",
		"todo.more": "更多设置",
		"todo.badge": "悬浮球气泡",
		"todo.typeTodo": "待办",
		"todo.typeMemo": "备忘",
		"todo.tabAll": "全部",
		"todo.noItems": "还没有{n}",
		"todo.noTitle": "无标题",
		"todo.noContent": "无内容",
		"todo.added": "已新增",
		"todo.saved": "已保存",
		"todo.saveFailed": "保存失败",
		"todo.deleted": "已删除",
		"todo.completed": "已完成",
		"todo.markDone": "标记完成",
		"todo.moreOptions": "更多选项",
		"todo.collapseOptions": "收起选项",
		"todo.moreTitle": "类型、优先级、提醒",
		"todo.typeField": "类型",
		"todo.clearReminder": "清除提醒",
		"todo.noBody": "（无正文内容）",
		"todo.openTodo": "打开待办",
		"todo.stickyTitle": "待办便签",
		"todo.reminTitle": "待办提醒",
		"todo.open": "点击打开",
		"todo.reminderRing": "到点了",
		"todo.reminderBody": "到时间了，记得处理一下。",
		"todo.today": "今天",
		"todo.yesterday": "昨天",
		"todo.weekdays": "一,二,三,四,五,六,日",
		"todo.monthNames": "1月,2月,3月,4月,5月,6月,7月,8月,9月,10月,11月,12月",
		"todo.monthTitle": "{y}年{m}月",
		"sched.title": "定时录制",
		"sched.aboutToStart": "录制即将开始",
		"sched.mode": "模式切换",
		"sched.countdown": "倒计时",
		"sched.scheduled": "指定时间",
		"sched.countdownMode": "倒计时模式",
		"sched.scheduledMode": "指定时间模式",
		"sched.delay": "延迟",
		"sched.minutes": "分钟",
		"sched.startCountdown": "开始倒计时",
		"sched.date": "日期",
		"sched.time": "时间",
		"sched.set": "设置定时",
		"sched.future": "请选择一个未来的时间",
		"convert.preparing": "准备中",
		"convert.start": "开始转换",
		"convert.done": "转换完成",
		"convert.failed": "转换失败",
		"convert.export": "导出",
		"convert.progress": "转换中... {n}%",
		"convert.preparingDots": "准备中...",
		"convert.startDots": "开始转换...",
		"convert.doneEx": "转换完成!",
		"convert.failedColon": "转换失败: {e}",
		"video.seconds": "秒",
		"record.paused": "已暂停",
		"draw.pen": "画笔",
		"draw.eraser": "橡皮",
		"draw.arrow": "箭头",
		"draw.rect": "矩形",
		"draw.tools": "工具选择",
		"draw.color": "颜色选择",
		"draw.width": "粗细",
		"draw.lineWidth": "线条粗细",
		"draw.actions": "操作",
		"draw.undo": "撤销",
		"draw.clear": "清除全部",
		"screen.error": "获取屏幕源失败",
		"screen.choose": "选择录制源",
		"screen.none": "未找到可用的屏幕源",
		"camera.title": "摄像头",
		"region.by": "全屏选区由",
		"region.mainWin": "主进程窗口处理",
		"region.none": "此处无",
		"tools.claudeCode": "Claude Code",
		"tools.approvalNone": "仅展示状态，不支持审批",
		"tools.notRunning": "未运行",
		"tools.toolSessions": "{n} 个会话",
		"tools.idle": "空闲",
		"tools.working": "工作中",
		"tools.title": "工具"
	};
	en = {
		"common.confirm": "Confirm",
		"common.cancel": "Cancel",
		"common.ok": "OK",
		"common.close": "Close",
		"common.loading": "Loading...",
		"common.reset": "Reset",
		"common.on": "On",
		"common.off": "Off",
		"common.allow": "Allow",
		"common.deny": "Deny",
		"common.alwaysAllow": "Always Allow",
		"common.save": "Save",
		"win.minimize": "Minimize",
		"win.maximize": "Maximize",
		"ball.menu.record": "Record",
		"ball.menu.ai": "AI",
		"ball.menu.todo": "Notes",
		"ball.menu.settings": "Settings",
		"ball.cooling.title": "Cooling",
		"ball.cooling.fanOn": "Fans at full speed",
		"ball.cooling.powerOnly": "Power-limited cooling",
		"ball.cooling.monitoring": "Monitoring temps",
		"ball.cooling.tempUnknown": "Temp unknown",
		"ball.cooling.disk": "Disk",
		"ball.cooling.mem": "RAM",
		"ball.cooling.done": "Cooling done {before}°C → {after}°C",
		"ball.cooling.doneNoTemp": "Cooling finished",
		"settings.group.ball": "Floating Ball",
		"settings.ball.show": "Show Floating Ball",
		"settings.ball.showDesc": "Hidden ball can be reopened from the tray menu “Show Settings Window”",
		"settings.ball.alwaysOnTop": "Always on Top",
		"settings.ball.alwaysOnTopDesc": "When off, other windows may cover the ball",
		"settings.ball.resetPos": "Reset Position",
		"settings.ball.resetPosDesc": "Move the ball back to the center of the screen",
		"settings.group.menu": "Ball Menu",
		"settings.group.system": "System",
		"settings.group.language": "Language",
		"settings.system.openAtLogin": "Open at Login",
		"settings.system.openAtLoginDesc": "Auto start this app when you sign in",
		"settings.language.label": "Interface Language",
		"settings.language.desc": "Ball, AI assistant and other windows apply on next open",
		"settings.lang.zh": "简体中文",
		"settings.lang.en": "English",
		"settings.group.about": "About",
		"settings.about.appName": "MUERZHI Multi-functional AI Floating Ball",
		"settings.about.desc": "Screen recording · AI assistant · Todo notes · One-click cooling",
		"settings.about.author": "Author: MUERZHI",
		"settings.about.github": "GitHub repository · Click to visit",
		"ai.title": "AI Assistant",
		"ai.installHooks": "Install Claude Code hooks",
		"ai.uninstallHooks": "Uninstall Claude Code hooks",
		"ai.hooksStatus": "Hook status",
		"ai.hooksInstalled": "Installed",
		"ai.hooksNotInstalled": "Not installed",
		"ai.autoAllow": "Auto-allow permissions",
		"ai.autoAllowDesc": "When on, new permission requests are allowed automatically without approval cards",
		"ai.expireToggle": "Auto-expire approvals & questions",
		"ai.expireToggleDesc": "Permission cards are cancelled and question cards dismissed on expiry",
		"ai.expireTime": "Expiry duration",
		"ai.expireTimeDesc": "Time allowed to handle the front card",
		"ai.minutes": "min",
		"ai.serverPort": "Local server port",
		"ai.serverRunning": "Server running",
		"ai.serverStopped": "Server not running",
		"ai.claudeRunning": "Claude Code is running",
		"ai.claudeStopped": "Claude Code not detected",
		"ai.sessionCount": "Sessions",
		"ai.sessionsCount": "{n} sessions",
		"ai.waiting": "Claude is running, waiting for interaction",
		"ai.noActive": "No active sessions",
		"ai.online": "Online",
		"ai.offline": "Offline",
		"ai.state.idle": "Idle",
		"ai.state.thinking": "Thinking",
		"ai.state.working": "Working",
		"ai.state.error": "Error",
		"ai.state.notification": "Pending",
		"ai.state.done": "Done",
		"ai.groupIntegration": "Integration",
		"ai.hooksDesc": "Hook script status",
		"ai.groupPermission": "Permissions",
		"ai.autoAllowTitle": "Auto-allow all permissions",
		"ai.autoAllowSessionTitle": "Selective auto-approve (by session)",
		"ai.autoAllowSessionDesc": "Auto-allow only for checked sessions; others still show approval cards",
		"ai.noActiveSession": "No active sessions",
		"ai.groupIsland": "AI Island Look",
		"ai.flat": "Flat bar",
		"ai.flatDesc": "Compress the island status bar into a slimmer flat bar to save screen space",
		"aiIsland.idle": "AI idle",
		"aiIsland.thinking": "AI thinking",
		"aiIsland.working": "AI working",
		"aiIsland.error": "AI error",
		"aiIsland.notification": "Approval needed",
		"aiIsland.done": "Task done",
		"aiIsland.permTitle": "Permission Request",
		"aiIsland.permTool": "Tool",
		"aiIsland.permInput": "Arguments",
		"aiIsland.questionTitle": "AI is asking",
		"aiIsland.prevQuestion": "Previous",
		"aiIsland.nextQuestion": "Next",
		"aiIsland.submitAnswer": "Submit",
		"aiIsland.know": "Got it",
		"aiIsland.otherPlaceholder": "Type other...",
		"aiIsland.otherHint": "Can be selected together with other options.",
		"aiIsland.answerInClaude": "Answer in the Claude Code interface; this is just a reminder.",
		"aiIsland.viewDetail": "Click to view details",
		"aiIsland.unknown": "Unknown action",
		"aiIsland.other": "Other",
		"aiIsland.progress": "Q {n}/{t}",
		"record.title": "HD Screen Recorder",
		"record.start": "Start Recording",
		"record.pause": "Pause",
		"record.resume": "Resume",
		"record.stop": "Stop",
		"record.allScreens": "All screens",
		"record.selectRegion": "Select region",
		"record.toggleSys": "System audio",
		"record.closeAndStop": "Close & stop",
		"record.claudeRequest": "Claude Code requests permission",
		"record.targetInfo": "Target info",
		"record.homeTab": "Record",
		"record.settingsTab": "Settings",
		"record.fullscreen": "Full Screen",
		"record.customRegion": "Custom Region",
		"record.primary": "Pri",
		"record.mic": "Mic",
		"record.recBtn": "Record",
		"record.toggleCamera": "Enable Camera",
		"record.toggleMic": "Enable Microphone",
		"record.startShort": "Start Recording ({k})",
		"record.pauseShort": "Pause ({k})",
		"record.resumeShort": "Resume ({k})",
		"record.stopShort": "Stop Recording ({k})",
		"record.toggleCameraShort": "Enable Camera ({k})",
		"record.toggleMicShort": "Enable Microphone ({k})",
		"record.converting": "Converting",
		"record.convertDone": "Done",
		"record.listEmpty": "No recordings yet",
		"record.play": "Play",
		"record.exportGif": "Export GIF",
		"record.delete": "Delete",
		"record.duration": "Duration",
		"record.size": "Size",
		"record.history": "History",
		"record.openFolder": "Open folder",
		"settings.title": "Settings",
		"settings.video": "Video",
		"settings.format": "Format",
		"settings.quality": "Quality",
		"settings.fps": "FPS",
		"settings.outputDir": "Output directory",
		"settings.changeDir": "Change",
		"settings.videoSource": "Video source",
		"settings.audio": "Audio",
		"settings.mic": "Microphone",
		"settings.systemAudio": "System audio",
		"settings.camera": "Camera",
		"settings.cameraSource": "Camera source",
		"settings.drawing": "Drawing",
		"settings.drawingColor": "Color",
		"settings.drawingWidth": "Width",
		"settings.shortcuts": "Shortcuts",
		"settings.shortcutStart": "Start / Stop",
		"settings.shortcutPause": "Pause / Resume",
		"settings.shortcutCamera": "Toggle Camera",
		"settings.shortcutDrawing": "Toggle Drawing",
		"settings.recordingTitle": "Recording Settings",
		"settings.output": "Output",
		"settings.saveDir": "Save directory",
		"settings.chooseDir": "Choose save directory",
		"settings.browse": "Browse",
		"settings.defaultFormat": "Format",
		"settings.maxFps": "Max FPS",
		"settings.qualityHigh": "High (5 Mbps)",
		"settings.qualityMedium": "Medium (2.5 Mbps)",
		"settings.qualityLow": "Low (1 Mbps)",
		"settings.default": "Default",
		"settings.device": "Device",
		"settings.about": "About",
		"todo.title": "Todo Notes",
		"todo.add": "Add",
		"todo.placeholder": "Type a todo...",
		"todo.empty": "No todos yet",
		"todo.memo": "Memo",
		"todo.task": "Task",
		"todo.addTodo": "New Todo",
		"todo.addMemo": "New Memo",
		"todo.done": "Done",
		"todo.undone": "Restore",
		"todo.delete": "Delete",
		"todo.pin": "Pin",
		"todo.unpin": "Unpin",
		"todo.edit": "Edit",
		"todo.save": "Save",
		"todo.cancel": "Cancel",
		"todo.reminder": "Reminder",
		"todo.reminderNone": "No reminder",
		"todo.priority": "Priority",
		"todo.priorityLow": "Low",
		"todo.priorityMedium": "Medium",
		"todo.priorityHigh": "High",
		"todo.priorityUrgent": "Urgent",
		"todo.titlePlaceholder": "Type a title...",
		"todo.contentPlaceholder": "Type content...",
		"todo.reminderOverdue": "Due: {title}",
		"todo.count": "{n} items",
		"todo.searchPlaceholder": "Search todos/memos...",
		"todo.incomplete": "{n} incomplete",
		"todo.back": "Back",
		"todo.more": "More settings",
		"todo.badge": "Ball badge",
		"todo.typeTodo": "Todo",
		"todo.typeMemo": "Memo",
		"todo.tabAll": "All",
		"todo.noItems": "No {n} yet",
		"todo.noTitle": "No title",
		"todo.noContent": "No content",
		"todo.added": "Added",
		"todo.saved": "Saved",
		"todo.saveFailed": "Save failed",
		"todo.deleted": "Deleted",
		"todo.completed": "Completed",
		"todo.markDone": "Mark done",
		"todo.moreOptions": "More options",
		"todo.collapseOptions": "Collapse",
		"todo.moreTitle": "Type, priority, reminder",
		"todo.typeField": "Type",
		"todo.clearReminder": "Clear reminder",
		"todo.noBody": "(No content)",
		"todo.openTodo": "Open todos",
		"todo.stickyTitle": "Todo Notes",
		"todo.reminTitle": "Todo reminder",
		"todo.open": "Click to open",
		"todo.reminderRing": "Time's up",
		"todo.reminderBody": "It's time — take care of it.",
		"todo.today": "Today",
		"todo.yesterday": "Yesterday",
		"todo.weekdays": "Mon,Tue,Wed,Thu,Fri,Sat,Sun",
		"todo.monthNames": "January,February,March,April,May,June,July,August,September,October,November,December",
		"todo.monthTitle": "{month} {y}",
		"sched.title": "Scheduled Recording",
		"sched.aboutToStart": "Recording starts soon",
		"sched.mode": "Mode",
		"sched.countdown": "Countdown",
		"sched.scheduled": "Scheduled",
		"sched.countdownMode": "Countdown mode",
		"sched.scheduledMode": "Scheduled mode",
		"sched.delay": "Delay",
		"sched.minutes": "min",
		"sched.startCountdown": "Start countdown",
		"sched.date": "Date",
		"sched.time": "Time",
		"sched.set": "Schedule",
		"sched.future": "Pick a time in the future",
		"convert.preparing": "Preparing",
		"convert.start": "Start converting",
		"convert.done": "Conversion done",
		"convert.failed": "Conversion failed",
		"convert.export": "Export",
		"convert.progress": "Converting... {n}%",
		"convert.preparingDots": "Preparing...",
		"convert.startDots": "Starting...",
		"convert.doneEx": "Conversion complete!",
		"convert.failedColon": "Conversion failed: {e}",
		"video.seconds": "s",
		"record.paused": "Paused",
		"draw.pen": "Pen",
		"draw.eraser": "Eraser",
		"draw.arrow": "Arrow",
		"draw.rect": "Rectangle",
		"draw.tools": "Tools",
		"draw.color": "Color",
		"draw.width": "Width",
		"draw.lineWidth": "Line width",
		"draw.actions": "Actions",
		"draw.undo": "Undo",
		"draw.clear": "Clear all",
		"screen.error": "Failed to get screen sources",
		"screen.choose": "Select recording source",
		"screen.none": "No screen source found",
		"camera.title": "Camera",
		"region.by": "Full-screen selection is handled",
		"region.mainWin": "by the main process window",
		"region.none": "Nothing here",
		"tools.claudeCode": "Claude Code",
		"tools.approvalNone": "Status only, no approval",
		"tools.notRunning": "Not running",
		"tools.toolSessions": "{n} sessions",
		"tools.idle": "Idle",
		"tools.working": "Working",
		"tools.title": "Tools"
	};
	currentLocale = "zh";
}));
//#endregion
//#region electron/main/region-selector.ts
var require_region_selector = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	init_logger();
	init_i18n();
	var mainWindow = null;
	/** 录制悬浮岛/工具栏内联 HTML 的 i18n 词条（label/title）。JS 内联部分在脚本头部注入 I18N JSON。 */
	function recorderI18n() {
		return {
			mic: t("record.toggleMic"),
			sys: t("record.toggleSys"),
			cam: t("record.toggleCamera"),
			rec: t("record.recBtn"),
			start: t("record.start"),
			stop: t("record.stop"),
			pause: t("record.pause"),
			resume: t("record.resume"),
			cancel: t("common.cancel"),
			closeStop: t("record.closeAndStop"),
			viewDetail: t("aiIsland.viewDetail"),
			idle: t("aiIsland.idle"),
			thinking: t("aiIsland.thinking"),
			working: t("aiIsland.working"),
			error: t("aiIsland.error"),
			notification: t("aiIsland.notification"),
			done: t("aiIsland.done"),
			unknown: t("aiIsland.unknown"),
			allow: t("common.allow"),
			deny: t("common.deny"),
			alwaysAllow: t("common.alwaysAllow"),
			requestTitle: t("record.claudeRequest"),
			toolName: t("aiIsland.permTool"),
			targetInfo: t("record.targetInfo")
		};
	}
	function setMainWindow(win) {
		mainWindow = win;
	}
	function updateAudioLevels(micLevel, sysLevel) {
		if (toolbarWindow && !toolbarWindow.isDestroyed()) toolbarWindow.webContents.send("audio-levels", {
			micLevel,
			sysLevel
		});
		if (floatingIsland && !floatingIsland.isDestroyed()) floatingIsland.webContents.send("audio-levels", {
			micLevel,
			sysLevel
		});
	}
	var regionWindow = null;
	var resolveRegion = null;
	function selectRegion() {
		return new Promise((resolve) => {
			resolveRegion = resolve;
			if (mainWindow && !mainWindow.isDestroyed()) mainWindow.minimize();
			const { x, y, width, height } = electron.screen.getPrimaryDisplay().bounds;
			regionWindow = new electron.BrowserWindow({
				x,
				y,
				width,
				height,
				frame: false,
				transparent: true,
				resizable: false,
				movable: false,
				alwaysOnTop: true,
				skipTaskbar: true,
				hasShadow: false,
				webPreferences: {
					nodeIntegration: true,
					contextIsolation: false
				}
			});
			const htmlPath = (0, node_path.join)(__dirname, "region-selector.html");
			regionWindow.loadFile(htmlPath).catch((err) => {
				logger_default.error("Failed to load region selector:", err.message);
				cleanupRegionSelector(null);
			});
			regionWindow.setFullScreen(true);
			regionWindow.setVisibleOnAllWorkspaces(true);
			regionWindow.setIgnoreMouseEvents(false);
			regionWindow.on("closed", () => {
				if (resolveRegion) {
					resolveRegion(null);
					resolveRegion = null;
				}
			});
		});
	}
	function cleanupRegionSelector(result) {
		if (regionWindow && !regionWindow.isDestroyed()) regionWindow.close();
		regionWindow = null;
		if (resolveRegion) {
			resolveRegion(result);
			resolveRegion = null;
		}
	}
	var borderWindow = null;
	var toolbarWindow = null;
	var savedRegion = null;
	var savedToolbarPos = null;
	var cameraPreviewWindow = null;
	var CAMERA_PREVIEW_W = 200;
	var CAMERA_PREVIEW_H = 150;
	var CAMERA_PREVIEW_PAD = 12;
	var currentPreviewArea = null;
	var previewDragOffsetX = 0;
	var previewDragOffsetY = 0;
	var previewDragInterval = null;
	function startPreviewDrag() {
		if (!cameraPreviewWindow || cameraPreviewWindow.isDestroyed()) return;
		const cursor = electron.screen.getCursorScreenPoint();
		const [wx, wy] = cameraPreviewWindow.getPosition();
		previewDragOffsetX = cursor.x - wx;
		previewDragOffsetY = cursor.y - wy;
		const [w, h] = cameraPreviewWindow.getSize();
		previewDragInterval = setInterval(() => {
			if (!cameraPreviewWindow || cameraPreviewWindow.isDestroyed()) {
				stopPreviewDrag();
				return;
			}
			const pos = electron.screen.getCursorScreenPoint();
			let nx = pos.x - previewDragOffsetX;
			let ny = pos.y - previewDragOffsetY;
			if (currentPreviewArea) {
				nx = Math.max(currentPreviewArea.x, Math.min(nx, currentPreviewArea.x + currentPreviewArea.width - w));
				ny = Math.max(currentPreviewArea.y, Math.min(ny, currentPreviewArea.y + currentPreviewArea.height - h));
			}
			cameraPreviewWindow.setBounds({
				x: nx,
				y: ny,
				width: w,
				height: h
			});
		}, 16);
	}
	function stopPreviewDrag() {
		if (previewDragInterval) {
			clearInterval(previewDragInterval);
			previewDragInterval = null;
		}
	}
	function showCameraPreview(area, cameraDeviceId) {
		hideCameraPreview();
		currentPreviewArea = area;
		const cpX = area.x + area.width - CAMERA_PREVIEW_W - CAMERA_PREVIEW_PAD;
		const cpY = area.y + CAMERA_PREVIEW_PAD;
		cameraPreviewWindow = new electron.BrowserWindow({
			x: cpX,
			y: cpY,
			width: CAMERA_PREVIEW_W,
			height: CAMERA_PREVIEW_H,
			frame: false,
			transparent: true,
			resizable: false,
			movable: false,
			alwaysOnTop: true,
			skipTaskbar: true,
			hasShadow: false,
			webPreferences: {
				nodeIntegration: true,
				contextIsolation: false
			}
		});
		cameraPreviewWindow.setVisibleOnAllWorkspaces(true);
		cameraPreviewWindow.setAlwaysOnTop(true, "screen-saver");
		const htmlPath = (0, node_path.join)(__dirname, "camera-preview.html");
		const deviceIdParam = cameraDeviceId ? `?deviceId=${encodeURIComponent(cameraDeviceId)}` : "";
		cameraPreviewWindow.loadFile(htmlPath + deviceIdParam).catch((err) => {
			logger_default.error("Failed to load camera preview:", err.message);
		});
		logger_default.info("Camera preview shown at", cpX, cpY);
	}
	function hideCameraPreview() {
		if (cameraPreviewWindow && !cameraPreviewWindow.isDestroyed()) {
			stopCameraPreviewStream();
			cameraPreviewWindow.close();
			cameraPreviewWindow = null;
		}
	}
	function stopCameraPreviewStream() {
		if (cameraPreviewWindow && !cameraPreviewWindow.isDestroyed()) cameraPreviewWindow.webContents.send("camera-control", "stop");
	}
	var floatingIsland = null;
	var islandMouseCheckInterval = null;
	var hideIslandTimer = null;
	var islandState = "idle";
	var islandTargetBounds = null;
	function showFloatingIsland(audioState, targetDisplayId) {
		hideFloatingIsland();
		islandState = "idle";
		let display = electron.screen.getPrimaryDisplay();
		if (targetDisplayId != null) {
			const found = electron.screen.getAllDisplays().find((d) => d.id === targetDisplayId);
			if (found) display = found;
		}
		const bounds = display.bounds;
		islandTargetBounds = bounds;
		const islandW = 340;
		floatingIsland = new electron.BrowserWindow({
			x: Math.round(bounds.x + (bounds.width - islandW) / 2),
			y: bounds.y + 4,
			width: islandW,
			height: 44,
			frame: false,
			transparent: true,
			resizable: true,
			movable: false,
			alwaysOnTop: true,
			skipTaskbar: true,
			hasShadow: false,
			webPreferences: {
				nodeIntegration: true,
				contextIsolation: false
			}
		});
		floatingIsland.setVisibleOnAllWorkspaces(true);
		floatingIsland.setMinimumSize(100, 44);
		floatingIsland.setAlwaysOnTop(true, "screen-saver");
		const html = `<!DOCTYPE html>
<html><head><style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{height:100%;overflow:hidden;font-family:'Segoe UI',system-ui,sans-serif}
.island{
  width:fit-content;height:100%;
  background:rgba(20,20,40,0.96);
  border-radius:22px;
  display:flex;align-items:center;justify-content:center;gap:8px;
  border:1px solid rgba(255,255,255,0.08);
  padding:0 10px;
  transition:opacity 0.3s,transform 0.3s;
}
.island.hidden{opacity:0;transform:translateY(-8px) scaleY(0.5);pointer-events:none}
.island button{
  width:28px;height:28px;border:none;border-radius:14px;flex-shrink:0;
  background:transparent;color:#e8e8f0;cursor:pointer;
  display:flex;align-items:center;justify-content:center;
  transition:background 0.15s;
}
.island button:hover{background:rgba(255,255,255,0.12)}
.island button:disabled{opacity:0.3;cursor:not-allowed;pointer-events:none}
.island button.active{background:rgba(255,255,255,0.15);color:#4ecdc4}
.island button.active svg{stroke:#4ecdc4}
.island .action-btn{width:auto;padding:0 14px;gap:5px;font-size:12px;font-weight:600;border-radius:14px;transition:background 0.15s}
.island .start-btn{background:#e94560;color:#fff}
.island .start-btn:hover{background:#ff6b81}
.island .start-btn svg{stroke:#fff}
.island .stop-btn{background:rgba(255,255,255,0.15);color:#e8e8f0}
.island .stop-btn:hover{background:rgba(255,255,255,0.25)}
.island .close-btn{color:rgba(255,255,255,0.4);margin-left:auto}
.island .close-btn:hover{background:rgba(255,60,60,0.3);color:#fff}
.island .pause-btn{color:#ffd93d}
.island .pause-btn:hover{background:rgba(255,217,61,0.15)}
.recording-dot{width:6px;height:6px;background:#e94560;border-radius:50%;flex-shrink:0;animation:pulse 1s infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}
.timer{color:#e8e8f0;font-size:12px;font-family:Consolas,monospace;min-width:40px;flex-shrink:0}
.sep{width:1px;height:20px;background:rgba(255,255,255,0.1);flex-shrink:0}
.btn-group{display:flex;align-items:center;gap:2px;flex-shrink:0}
.meter-group{display:none;align-items:flex-end;gap:1px;height:20px}
.meter-bar{width:3px;background:rgba(255,255,255,0.15);border-radius:1px}
.meter-bar.on{background:#4ecdc4;box-shadow:0 0 4px #4ecdc4}
.meter-bar.on.warn{background:#ffd93d;box-shadow:0 0 4px #ffd93d}
.meter-bar.on.hot{background:#e94560;box-shadow:0 0 4px #e94560}
/* AI 状态指示器 */
.ai-indicator{display:flex;align-items:center;gap:6px;flex-shrink:0;padding:0 6px;cursor:pointer;border-radius:6px;transition:background 0.15s}
.ai-indicator:hover{background:rgba(255,255,255,0.1)}
.ai-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0;transition:all 0.3s}
.ai-dot.idle{background:#9e9e9e}
.ai-dot.thinking{background:#ffd93d;animation:ai-breathe 1.5s ease-in-out infinite}
.ai-dot.working{background:#4ecdc4;animation:ai-pulse 0.8s ease-in-out infinite}
.ai-dot.error{background:#e94560}
.ai-dot.notification{background:#b388ff;animation:ai-pulse 0.6s ease-in-out infinite}
.ai-dot.done{background:#66bb6a;animation:ai-flash 0.3s ease 3}
@keyframes ai-breathe{0%,100%{opacity:0.4;transform:scale(0.8)}50%{opacity:1;transform:scale(1.1)}}
@keyframes ai-pulse{0%,100%{opacity:0.5;transform:scale(0.9)}50%{opacity:1;transform:scale(1.15)}}
@keyframes ai-flash{0%,100%{opacity:1}50%{opacity:0.2;transform:scale(1.3)}}
.ai-label{font-size:11px;color:rgba(255,255,255,0.6);white-space:nowrap;font-weight:500}
.ai-label.active{color:#e8e8f0}
/* 权限卡片 */
.perm-card{width:100%;padding:8px 12px;background:rgba(255,255,255,0.06);border-top:1px solid rgba(255,255,255,0.08);display:none;flex-direction:column;gap:6px}
.perm-card.show{display:flex}
.perm-header{font-size:11px;font-weight:600;color:#e8e8f0;display:flex;align-items:center;gap:6px}
.perm-detail{font-size:10px;color:rgba(255,255,255,0.6);word-break:break-all;line-height:1.4}
.perm-tool{color:#4ecdc4;font-weight:500}
.perm-actions{display:flex;gap:6px;margin-top:2px}
.perm-btn{flex:1;padding:5px 8px;border:none;border-radius:6px;font-size:11px;font-weight:600;cursor:pointer;transition:all 0.15s}
.perm-btn.allow{background:#4ecdc4;color:#1a1a2e}
.perm-btn.allow:hover{background:#6eddd6}
.perm-btn.deny{background:rgba(255,255,255,0.1);color:#e8e8f0}
.perm-btn.deny:hover{background:rgba(233,69,96,0.3);color:#e94560}
.perm-btn.always{background:rgba(78,205,196,0.15);color:#4ecdc4;border:1px solid rgba(78,205,196,0.3)}
.perm-btn.always:hover{background:rgba(78,205,196,0.25)}
</style></head><body>
<div class="island" id="island">
  <span class="recording-dot" id="dot" style="display:none"></span>
  <span class="timer" id="timer">00:00</span>
  <div class="btn-group">
    <button id="micBtn" title="${t("record.toggleMic")}" onclick="doToggleMic()">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
    </button>
    <div class="meter-group" id="micMeter"></div>
  </div>
  <!-- <div class="btn-group">
    <button id="sysBtn" title="${t("record.toggleSys")}" onclick="doToggleSys()">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
    </button>
    <div class="meter-group" id="sysMeter"></div>
  </div> -->
  <div class="btn-group">
    <button id="camBtn" title="${t("record.toggleCamera")}" onclick="doToggleCam()">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
    </button>
  </div>
  <div class="sep"></div>
  <button class="action-btn start-btn" id="startBtn" onclick="doStart()">
    <svg width="10" height="10" viewBox="0 0 12 12"><circle cx="6" cy="6" r="5" fill="currentColor"/></svg>
    <span>${t("record.recBtn")}</span>
  </button>
  <button class="stop-btn" id="stopBtn" style="display:none" onclick="doStop()" title="${t("record.stop")}">
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="1"/></svg>
  </button>
  <button class="pause-btn" id="pauseBtn" style="display:none" onclick="doPause()" title="${t("record.pause")}">
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
  </button>
  <button id="resumeBtn" style="display:none" onclick="doResume()" title="${t("record.resume")}">
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>
  </button>
  <button class="close-btn" onclick="doClose()" title="${t("common.cancel")}">
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>
  </button>
</div>
<div class="sep" id="aiSep" style="display:none"></div>
<div class="ai-indicator" id="aiIndicator" style="display:none" onclick="showAiDetail()" title="${t("aiIsland.viewDetail")}">
  <span class="ai-dot idle" id="aiDot"></span>
  <span class="ai-label" id="aiLabel">${t("aiIsland.idle")}</span>
</div>
<div class="perm-card" id="permCard">
  <div class="perm-header">
    <span>🤖</span>
    <span>${t("record.claudeRequest")}</span>
  </div>
  <div class="perm-detail">
    <span class="perm-tool" id="permTool">${t("aiIsland.permTool")}</span>
    <span id="permTarget">${t("record.targetInfo")}</span>
  </div>
  <div class="perm-actions">
    <button class="perm-btn allow" onclick="doAllow()">${t("common.allow")}</button>
    <button class="perm-btn deny" onclick="doDeny()">${t("common.deny")}</button>
    <button class="perm-btn always" onclick="doAlwaysAllow()">${t("common.alwaysAllow")}</button>
  </div>
</div>
<script>
const I18N=${JSON.stringify(recorderI18n())};
const {ipcRenderer}=require('electron')
let timerInterval=null,seconds=0,micOn=${audioState?.micEnabled ? "true" : "false"},sysOn=${audioState?.sysEnabled ? "true" : "false"},camOn=${audioState?.cameraEnabled ? "true" : "false"},isRecording=false
function updateTimer(){
  seconds++;const m=String(Math.floor(seconds/60)).padStart(2,'0')
  const s=String(seconds%60).padStart(2,'0')
  document.getElementById('timer').textContent=m+':'+s
}
const BAR_COUNT=8
function buildBars(c){if(!c)return;for(let i=0;i<BAR_COUNT;i++){const b=document.createElement('div');b.className='meter-bar';b.style.height='20px';c.appendChild(b)}}
const micEl=document.getElementById('micMeter');const sysEl=document.getElementById('sysMeter')
buildBars(micEl);buildBars(sysEl)
function updateMeter(c,lv){if(!c)return;const bs=c.children;const a=Math.round(lv*BAR_COUNT);for(let i=0;i<bs.length;i++){bs[i].className='meter-bar'+(i<a?' on'+(i>=6?' hot':i>=5?' warn':''):'')}}
function updateAudioUI(){
  const micBtn=document.getElementById('micBtn')
  const sysBtn=document.getElementById('sysBtn')
  const camBtn=document.getElementById('camBtn')
  micBtn.classList.toggle('active',micOn)
  if(sysBtn)sysBtn.classList.toggle('active',sysOn)
  camBtn.classList.toggle('active',camOn)
  micEl.style.display=micOn?'flex':'none'
  if(sysEl)sysEl.style.display=sysOn?'flex':'none'
  micBtn.disabled=isRecording;if(sysBtn)sysBtn.disabled=isRecording;camBtn.disabled=isRecording
  setTimeout(resizeIsland,50)
}
updateAudioUI()
ipcRenderer.on('island-state',(e,state,elapsed)=>{
  const island=document.getElementById('island')
  const startBtn=document.getElementById('startBtn')
  const stopBtn=document.getElementById('stopBtn')
  const pauseBtn=document.getElementById('pauseBtn')
  const resumeBtn=document.getElementById('resumeBtn')
  const dot=document.getElementById('dot')
  if(state==='recording'){
    isRecording=true
    startBtn.style.display='none';stopBtn.style.display='flex';pauseBtn.style.display='flex';resumeBtn.style.display='none';dot.style.display='inline-block'
    if(typeof elapsed==='number'&&elapsed>0){seconds=elapsed}else{seconds=0}
    if(timerInterval){clearInterval(timerInterval);timerInterval=null}
    timerInterval=setInterval(updateTimer,1000)
    updateAudioUI()
    setTimeout(resizeIsland,50)
  }else if(state==='paused'){
    pauseBtn.style.display='none';resumeBtn.style.display='flex';if(timerInterval){clearInterval(timerInterval);timerInterval=null}
    setTimeout(resizeIsland,50)
  }else if(state==='idle'){
    isRecording=false
    startBtn.style.display='flex';stopBtn.style.display='none';pauseBtn.style.display='none';resumeBtn.style.display='none';dot.style.display='none'
    island.classList.remove('hidden')
    if(timerInterval){clearInterval(timerInterval);timerInterval=null}seconds=0;document.getElementById('timer').textContent='00:00'
    updateAudioUI()
    setTimeout(resizeIsland,50)
  }else if(state==='show'){
    island.classList.remove('hidden')
  }else if(state==='hide'){
    island.classList.add('hidden')
  }
})
ipcRenderer.on('audio-levels',(e,{micLevel,sysLevel})=>{
  if(micOn)updateMeter(micEl,micLevel)
  if(sysOn)updateMeter(sysEl,sysLevel)
})
function doToggleMic(){micOn=!micOn;updateAudioUI();resizeIsland();ipcRenderer.send('island-action','toggle-mic')}
function doToggleSys(){sysOn=!sysOn;updateAudioUI();resizeIsland();ipcRenderer.send('island-action','toggle-sys')}
function doToggleCam(){camOn=!camOn;updateAudioUI();resizeIsland();ipcRenderer.send('island-action','toggle-camera')}
function doStart(){ipcRenderer.send('island-action','start')}
function doPause(){ipcRenderer.send('island-action','pause')}
function doResume(){ipcRenderer.send('island-action','resume')}
function doStop(){ipcRenderer.send('island-action','stop')}
function doClose(){ipcRenderer.send('island-action','close')}
function resizeIsland(){
  const island=document.getElementById('island')
  const w=island.scrollWidth
  const permCard=document.getElementById('permCard')
  const extraH=permCard&&permCard.classList.contains('show')?100:0
  ipcRenderer.send('resize-island',w,44+extraH)
}
const ro=new ResizeObserver(()=>resizeIsland())
ro.observe(document.getElementById('island'))
// AI 状态管理
let currentAiState='idle'
const aiLabels={idle:I18N.idle,thinking:I18N.thinking,working:I18N.working,error:I18N.error,notification:I18N.notification,done:I18N.done}
ipcRenderer.on('agent-state-update',(e,data)=>{
  const ind=document.getElementById('aiIndicator'),dot=document.getElementById('aiDot'),lb=document.getElementById('aiLabel'),sp=document.getElementById('aiSep')
  if(!data||(data.state==='idle'&&(!data.sessions||!data.sessions.length))){ind.style.display='none';sp.style.display='none';return}
  ind.style.display='flex';sp.style.display='block';currentAiState=data.state
  dot.className='ai-dot '+data.state;lb.textContent=aiLabels[data.state]||I18N.idle;lb.classList.toggle('active',data.state!=='idle')
  setTimeout(resizeIsland,50)
})
// 录制悬浮岛也展示权限卡：只关心队首为权限卡的情况（提问卡无对应 UI，忽略）
ipcRenderer.on('agent-card-update',(e,card)=>{
  if(!card||card.kind!=='permission'){ document.getElementById('permCard').classList.remove('show'); setTimeout(resizeIsland,50); return }
  document.getElementById('permCard').classList.add('show')
  document.getElementById('permTool').textContent=card.toolName||I18N.unknown
  const istr=card.toolInput?JSON.stringify(card.toolInput).slice(0,80):''
  document.getElementById('permTarget').textContent=istr?': '+istr:''
  setTimeout(resizeIsland,50)
})
function doAllow(){resolvePerm('allow')}
function doDeny(){resolvePerm('deny')}
function doAlwaysAllow(){resolvePerm('always')}
function resolvePerm(b){ipcRenderer.invoke('agent-resolve-permission',b);document.getElementById('permCard').classList.remove('show');setTimeout(resizeIsland,50)}
function showAiDetail(){}
<\/script>
</body></html>`;
		floatingIsland.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
		logger_default.info("Floating island shown");
		currentPreviewArea = bounds;
		if (audioState?.cameraEnabled) showCameraPreview(bounds, audioState.cameraDeviceId);
	}
	function hideFloatingIsland() {
		if (islandMouseCheckInterval) {
			clearInterval(islandMouseCheckInterval);
			islandMouseCheckInterval = null;
		}
		if (hideIslandTimer) {
			clearTimeout(hideIslandTimer);
			hideIslandTimer = null;
		}
		if (floatingIsland && !floatingIsland.isDestroyed()) {
			floatingIsland.close();
			floatingIsland = null;
		}
		hideCameraPreview();
		currentPreviewArea = null;
		islandTargetBounds = null;
	}
	function setFloatingIslandState(state, elapsedSeconds) {
		islandState = state === "idle" ? "idle" : state === "recording" ? "recording" : state === "paused" ? "paused" : islandState;
		if (state === "show" || state === "hide") {
			if (floatingIsland && !floatingIsland.isDestroyed()) floatingIsland.webContents.send("island-state", state);
			return;
		}
		if (floatingIsland && !floatingIsland.isDestroyed()) floatingIsland.webContents.send("island-state", state, elapsedSeconds);
		if (islandMouseCheckInterval) {
			clearInterval(islandMouseCheckInterval);
			islandMouseCheckInterval = null;
		}
		if (hideIslandTimer) {
			clearTimeout(hideIslandTimer);
			hideIslandTimer = null;
		}
		if (state === "recording") islandMouseCheckInterval = setInterval(() => {
			if (!floatingIsland || floatingIsland.isDestroyed()) return;
			const pos = electron.screen.getCursorScreenPoint();
			const [ix, iy] = floatingIsland.getPosition();
			const [iw, ih] = floatingIsland.getSize();
			if (pos.x >= ix && pos.x <= ix + iw && pos.y >= iy - 4 && pos.y <= iy + ih) {
				if (hideIslandTimer) {
					clearTimeout(hideIslandTimer);
					hideIslandTimer = null;
				}
				floatingIsland.webContents.send("island-state", "show");
			} else if (!hideIslandTimer) hideIslandTimer = setTimeout(() => {
				if (floatingIsland && !floatingIsland.isDestroyed()) floatingIsland.webContents.send("island-state", "hide");
				hideIslandTimer = null;
			}, 500);
		}, 500);
	}
	var TOOLBAR_HEIGHT = 44;
	var BORDER_WIDTH = 3;
	function showRegionBorder(region, audioState) {
		hideRegionBorder();
		const bw = BORDER_WIDTH;
		const pad = bw + 2;
		const displayBounds = electron.screen.getPrimaryDisplay().bounds;
		const topSpace = region.y - displayBounds.y;
		const bottomSpace = displayBounds.y + displayBounds.height - (region.y + region.height);
		const minSpace = TOOLBAR_HEIGHT + 4;
		let tbX, tbY, tbW, tbPos;
		if (topSpace >= minSpace) {
			tbPos = "top";
			tbX = region.x - pad;
			tbY = region.y - TOOLBAR_HEIGHT - pad;
			tbW = region.width + pad * 2;
		} else if (bottomSpace >= minSpace) {
			tbPos = "bottom";
			tbX = region.x - pad;
			tbY = region.y + region.height + pad;
			tbW = region.width + pad * 2;
		} else {
			tbPos = "inside";
			tbX = region.x;
			tbY = region.y;
			tbW = Math.min(region.width, 500);
		}
		savedRegion = { ...region };
		savedToolbarPos = tbPos;
		toolbarWindow = new electron.BrowserWindow({
			x: tbX,
			y: tbY,
			width: tbW,
			height: TOOLBAR_HEIGHT,
			frame: false,
			transparent: true,
			resizable: false,
			movable: false,
			alwaysOnTop: true,
			skipTaskbar: true,
			hasShadow: false,
			webPreferences: {
				nodeIntegration: true,
				contextIsolation: false
			}
		});
		toolbarWindow.setVisibleOnAllWorkspaces(true);
		toolbarWindow.setAlwaysOnTop(true, "screen-saver");
		const toolbarHtml = `<!DOCTYPE html>
<html><head><style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;overflow:hidden;font-family:'Segoe UI',system-ui,sans-serif}
.toolbar{
  width:100%;height:${TOOLBAR_HEIGHT}px;
  background:rgba(20,20,40,0.97);
  border-radius:8px 8px 0 0;
  display:flex;align-items:center;justify-content:center;gap:6px;
  padding:0 10px;
}
.toolbar button{
  width:32px;height:32px;border:none;border-radius:6px;
  background:transparent;color:#e8e8f0;cursor:pointer;
  display:flex;align-items:center;justify-content:center;
  transition:background 0.15s;
}
.toolbar button:hover{background:rgba(255,255,255,0.12)}
.toolbar button:disabled{opacity:0.3;cursor:not-allowed;pointer-events:none}
.toolbar .rec{background:#e94560;color:#fff;width:auto;padding:0 14px;gap:6px;font-size:13px;font-weight:600}
.toolbar .rec:hover{background:#ff6b81}
.toolbar .rec.active{background:rgba(255,255,255,0.15);color:#e94560}
.toolbar .stop-btn:hover{background:rgba(255,255,255,0.2)}
.toolbar .close-btn{margin-left:auto;color:rgba(255,255,255,0.5)}
.toolbar .close-btn:hover{background:rgba(255,60,60,0.3);color:#fff}
.toolbar .pause-btn{color:#ffd93d}
.toolbar .pause-btn:hover{background:rgba(255,217,61,0.15)}
.toolbar .audio-toggle{position:relative}
.toolbar .audio-toggle.active{background:rgba(255,255,255,0.15);color:#4ecdc4}
.toolbar .audio-toggle.active svg{stroke:#4ecdc4}
.size-label{color:rgba(255,255,255,0.5);font-size:11px;margin-left:8px;white-space:nowrap}
.audio-meters{display:flex;gap:6px;margin-left:6px;align-items:flex-end;height:20px}
.meter-group{display:flex;align-items:flex-end;gap:1px}
.meter-bar{width:3px;background:rgba(255,255,255,0.15);border-radius:1px}
.meter-bar.on{background:#4ecdc4;box-shadow:0 0 4px #4ecdc4}
.meter-bar.on.warn{background:#ffd93d;box-shadow:0 0 4px #ffd93d}
.meter-bar.on.hot{background:#e94560;box-shadow:0 0 4px #e94560}
.meter-label{font-size:8px;color:rgba(255,255,255,0.35);margin-left:2px;align-self:flex-end;white-space:nowrap}
.sep{width:1px;height:20px;background:rgba(255,255,255,0.1);flex-shrink:0}
.recording-dot{width:8px;height:8px;background:#e94560;border-radius:50%;display:none}
.recording-dot.active{display:inline-block;animation:pulse 1s infinite}
.timer{color:#e8e8f0;font-size:13px;font-family:Consolas,monospace;margin-left:6px;min-width:48px}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}
.toolbar[data-pos="bottom"]{border-radius:0 0 8px 8px}
.toolbar[data-pos="inside"]{border-radius:8px}
.toolbar.minimal{width:fit-content;height:40px!important;border-radius:22px;background:rgba(20,20,40,0.96);border:1px solid rgba(255,255,255,0.08);padding:0 10px}
.toolbar.minimal .audio-toggle,.toolbar.minimal .meter-group,.toolbar.minimal .sep,.toolbar.minimal .size-label,.toolbar.minimal .close-btn{display:none!important}
</style></head><body>
<div class="toolbar" id="toolbar" data-pos="${tbPos}">
  <span class="recording-dot" id="dot"></span>
  <span class="timer" id="timer">00:00</span>
  <button class="audio-toggle" id="micBtn" title="${t("record.toggleMic")}" onclick="doToggleMic()">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
  </button>
  <div class="meter-group" id="micMeter"></div>
  <!-- <button class="audio-toggle" id="sysBtn" title="${t("record.toggleSys")}" onclick="doToggleSys()">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
  </button>
  <div class="meter-group" id="sysMeter"></div> -->
  <button class="audio-toggle" id="camBtn" title="${t("record.toggleCamera")}" onclick="doToggleCam()">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
  </button>
  <div class="sep"></div>
  <button class="rec" id="startBtn" onclick="doStart()" title="${t("record.start")}">
    <svg width="12" height="12" viewBox="0 0 12 12"><circle cx="6" cy="6" r="5" fill="currentColor"/></svg>
    <span>${t("record.recBtn")}</span>
  </button>
  <button class="stop-btn" id="stopBtn" style="display:none" onclick="doStop()" title="${t("record.stop")}">
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="1"/></svg>
  </button>
  <button class="pause-btn" id="pauseBtn" style="display:none" onclick="doPause()" title="${t("record.pause")}">
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
  </button>
  <button id="resumeBtn" style="display:none" onclick="doResume()" title="${t("record.resume")}">
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>
  </button>
  <span class="size-label" id="sizeLabel">${region.width}×${region.height}</span>
  <button class="close-btn" onclick="doClose()" title="${t("record.closeAndStop")}">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>
  </button>
</div>
<script>
const I18N=${JSON.stringify(recorderI18n())};
const {ipcRenderer}=require('electron')
let timerInterval=null,seconds=0,micOn=${audioState?.micEnabled ? "true" : "false"},sysOn=${audioState?.sysEnabled ? "true" : "false"},camOn=${audioState?.cameraEnabled ? "true" : "false"},isRecording=false
function updateTimer(){
  seconds++;const m=String(Math.floor(seconds/60)).padStart(2,'0')
  const s=String(seconds%60).padStart(2,'0')
  document.getElementById('timer').textContent=m+':'+s
}
function updateAudioUI(){
  const micBtn=document.getElementById('micBtn')
  const sysBtn=document.getElementById('sysBtn')
  const camBtn=document.getElementById('camBtn')
  const micEl=document.getElementById('micMeter')
  const sysEl=document.getElementById('sysMeter')
  micBtn.classList.toggle('active',micOn)
  if(sysBtn)sysBtn.classList.toggle('active',sysOn)
  camBtn.classList.toggle('active',camOn)
  micEl.style.display=micOn?'flex':'none'
  if(sysEl)sysEl.style.display=sysOn?'flex':'none'
  micBtn.disabled=isRecording;if(sysBtn)sysBtn.disabled=isRecording;camBtn.disabled=isRecording
}
ipcRenderer.on('toolbar-state',(e,state,elapsed,pos)=>{
  document.getElementById('toolbar').classList.toggle('minimal',(state==='recording'||state==='paused')&&pos==='inside')
  const startBtn=document.getElementById('startBtn')
  const pauseBtn=document.getElementById('pauseBtn')
  const resumeBtn=document.getElementById('resumeBtn')
  const stopBtn=document.getElementById('stopBtn')
  const dot=document.getElementById('dot')
  if(state==='recording'){
    isRecording=true
    startBtn.style.display='none';pauseBtn.style.display='flex';resumeBtn.style.display='none';stopBtn.style.display='flex';dot.classList.add('active')
    if(typeof elapsed==='number'&&elapsed>0){seconds=elapsed}else{seconds=0}
    if(timerInterval){clearInterval(timerInterval);timerInterval=null}
    timerInterval=setInterval(updateTimer,1000)
    updateAudioUI()
  }else if(state==='paused'){
    pauseBtn.style.display='none';resumeBtn.style.display='flex';if(timerInterval){clearInterval(timerInterval);timerInterval=null}
  }else{
    isRecording=false
    startBtn.style.display='flex';pauseBtn.style.display='none';resumeBtn.style.display='none';stopBtn.style.display='none';dot.classList.remove('active')
    if(timerInterval){clearInterval(timerInterval);timerInterval=null}seconds=0;document.getElementById('timer').textContent='00:00'
    updateAudioUI()
  }
})
function doStart(){ipcRenderer.send('toolbar-action','start')}
function doPause(){ipcRenderer.send('toolbar-action','pause')}
function doResume(){ipcRenderer.send('toolbar-action','resume')}
function doStop(){ipcRenderer.send('toolbar-action','stop')}
function doClose(){ipcRenderer.send('toolbar-action','close')}
function doToggleMic(){micOn=!micOn;updateAudioUI();ipcRenderer.send('toolbar-action','toggle-mic')}
function doToggleSys(){sysOn=!sysOn;updateAudioUI();ipcRenderer.send('toolbar-action','toggle-sys')}
function doToggleCam(){camOn=!camOn;updateAudioUI();ipcRenderer.send('toolbar-action','toggle-camera')}

// 音量指示器
const BAR_COUNT=8
function buildBars(container){
  if(!container)return
  for(let i=0;i<BAR_COUNT;i++){
    const bar=document.createElement('div')
    bar.className='meter-bar'
    bar.style.height='20px'
    container.appendChild(bar)
  }
}
const micEl=document.getElementById('micMeter')
const sysEl=document.getElementById('sysMeter')
buildBars(micEl)
buildBars(sysEl)
updateAudioUI()

function updateMeter(container,level){
  const bars=container.children
  const active=Math.round(level*BAR_COUNT)
  for(let i=0;i<bars.length;i++){
    bars[i].className='meter-bar'+(i<active?' on'+(i>=6?' hot':i>=5?' warn':''):'')
  }
}

ipcRenderer.on('audio-levels',(e,{micLevel,sysLevel})=>{
  if(micOn)updateMeter(micEl,micLevel)
  if(sysOn)updateMeter(sysEl,sysLevel)
})
<\/script>
</body></html>`;
		toolbarWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(toolbarHtml)}`);
		const bX = region.x - pad;
		const bY = region.y - pad;
		const bW = region.width + pad * 2;
		const bH = region.height + pad * 2;
		borderWindow = new electron.BrowserWindow({
			x: bX,
			y: bY,
			width: bW,
			height: bH,
			show: false,
			frame: false,
			transparent: true,
			resizable: false,
			movable: false,
			alwaysOnTop: true,
			skipTaskbar: true,
			hasShadow: false,
			webPreferences: {
				nodeIntegration: true,
				contextIsolation: false
			}
		});
		borderWindow.setVisibleOnAllWorkspaces(true);
		borderWindow.setAlwaysOnTop(true, "screen-saver");
		borderWindow.setIgnoreMouseEvents(true);
		borderWindow.setBounds({
			x: bX,
			y: bY,
			width: bW,
			height: bH
		});
		borderWindow.show();
		const borderHtml = `<!DOCTYPE html>
<html><head><style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;overflow:hidden}
.border{
  position:absolute;left:0;top:0;right:0;bottom:0;
  border:${bw}px solid #e94560;
  background:transparent;
}
</style></head><body>
<div class="border"></div>
</body></html>`;
		borderWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(borderHtml)}`);
		logger_default.info("Region border+toolbar shown (split windows):", region);
		currentPreviewArea = region;
		if (audioState?.cameraEnabled) showCameraPreview(region, audioState.cameraDeviceId);
		if (borderWindow && !borderWindow.isDestroyed()) borderWindow.setAlwaysOnTop(true, "screen-saver");
		if (toolbarWindow && !toolbarWindow.isDestroyed()) toolbarWindow.setAlwaysOnTop(true, "screen-saver");
		if (cameraPreviewWindow && !cameraPreviewWindow.isDestroyed()) cameraPreviewWindow.setAlwaysOnTop(true, "screen-saver");
	}
	function updateToolbarState(state, elapsedSeconds) {
		if (toolbarWindow && !toolbarWindow.isDestroyed()) {
			toolbarWindow.webContents.send("toolbar-state", state, elapsedSeconds, savedToolbarPos);
			if ((state === "recording" || state === "paused") && savedToolbarPos === "inside" && savedRegion) toolbarWindow.setBounds({
				x: savedRegion.x + 8,
				y: savedRegion.y + 8,
				width: 170,
				height: 40
			});
		}
	}
	function hideBorderOnly() {
		if (borderWindow && !borderWindow.isDestroyed()) {
			borderWindow.close();
			borderWindow = null;
		}
	}
	function hideRegionBorder() {
		hideBorderOnly();
		if (toolbarWindow && !toolbarWindow.isDestroyed()) {
			toolbarWindow.close();
			toolbarWindow = null;
		}
		hideCameraPreview();
		currentPreviewArea = null;
		logger_default.info("Region border hidden");
	}
	function registerRegionSelectorHandlers() {
		electron.ipcMain.on("region-selected", (_event, region) => {
			logger_default.info("Region selected:", region);
			cleanupRegionSelector(region);
		});
		electron.ipcMain.on("region-cancelled", () => {
			logger_default.info("Region selection cancelled");
			cleanupRegionSelector(null);
		});
		electron.ipcMain.handle("show-region-border", (_event, region, audioState) => {
			showRegionBorder(region, audioState);
		});
		electron.ipcMain.handle("hide-region-border", () => {
			hideRegionBorder();
		});
		electron.ipcMain.handle("hide-border-only", () => {
			hideBorderOnly();
		});
		electron.ipcMain.handle("update-toolbar-state", (_event, state, elapsedSeconds) => {
			updateToolbarState(state, elapsedSeconds);
		});
		electron.ipcMain.on("toolbar-action", (_event, action) => {
			logger_default.info("Toolbar action:", action);
			if (action === "close") {
				if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send("on-toolbar-action", "close");
				hideRegionBorder();
				return;
			}
			if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send("on-toolbar-action", action);
		});
		electron.ipcMain.removeHandler("set-mouse-ignore");
		electron.ipcMain.removeAllListeners("set-mouse-ignore");
		electron.ipcMain.handle("show-floating-island", (_event, audioState, targetDisplayId) => {
			showFloatingIsland(audioState, targetDisplayId);
		});
		electron.ipcMain.handle("hide-floating-island", () => {
			hideFloatingIsland();
		});
		electron.ipcMain.handle("hide-camera-preview", () => {
			hideCameraPreview();
		});
		electron.ipcMain.handle("toggle-camera-preview", (_event, show, cameraDeviceId) => {
			if (show && currentPreviewArea) showCameraPreview(currentPreviewArea, cameraDeviceId);
			else hideCameraPreview();
		});
		electron.ipcMain.on("camera-drag-start", () => startPreviewDrag());
		electron.ipcMain.on("camera-drag-end", () => stopPreviewDrag());
		electron.ipcMain.handle("set-island-state", (_event, state, elapsedSeconds) => {
			setFloatingIslandState(state, elapsedSeconds);
		});
		electron.ipcMain.on("island-action", (_event, action) => {
			logger_default.info("Island action:", action);
			if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send("on-toolbar-action", action);
		});
		electron.ipcMain.on("resize-island", (_event, contentWidth, contentHeight) => {
			if (floatingIsland && !floatingIsland.isDestroyed()) {
				if (!Number.isFinite(contentWidth)) return;
				const bounds = islandTargetBounds || electron.screen.getPrimaryDisplay().bounds;
				const totalW = contentWidth + 20;
				const newX = Math.round(bounds.x + (bounds.width - totalW) / 2);
				const h = Number.isFinite(contentHeight) ? contentHeight : 44;
				floatingIsland.setBounds({
					x: newX,
					y: bounds.y + 4,
					width: totalW,
					height: h
				});
			}
		});
	}
	module.exports = {
		selectRegion,
		showRegionBorder,
		hideRegionBorder,
		hideBorderOnly,
		updateToolbarState,
		updateAudioLevels,
		showFloatingIsland,
		hideFloatingIsland,
		showCameraPreview,
		hideCameraPreview,
		setFloatingIslandState,
		setMainWindow,
		registerRegionSelectorHandlers
	};
}));
//#endregion
//#region electron/main/logo.ts
var import_region_selector = require_region_selector();
var logoCache = /* @__PURE__ */ new Map();
function getLogoDataUrl(size = 32) {
	const hit = logoCache.get(size);
	if (hit) return hit;
	try {
		const paths = electron.app.isPackaged ? [(0, node_path.join)(process.resourcesPath, "logo.png")] : [(0, node_path.join)(__dirname, "..", "..", "public", "logo.png"), (0, node_path.join)(__dirname, "..", "public", "logo.png")];
		for (const p of paths) if (node_fs.default.existsSync(p)) {
			const url = electron.nativeImage.createFromPath(p).resize({
				width: size,
				height: size,
				quality: "good"
			}).toDataURL();
			logoCache.set(size, url);
			return url;
		}
	} catch {}
	return "";
}
//#endregion
//#region electron/main/ai-island.ts
init_logger();
init_i18n();
var aiIsland = null;
/** AI 岛拖动的基准（绝对增量 + setBounds，仿悬浮球）；用户拖过后锁定位置不再被 resize 拉回 */
var aiDragOrigin = null;
var aiIslandUserMoved = false;
/** 透明空白区鼠标穿透状态：true 时 setIgnoreMouseEvents，让窗口右侧多余透明区不拦截下方点击 */
var aiIslandMouseIgnored = false;
var aiIslandContentScreen = null;
var aiIslandPollTimer = null;
/** 把当前岛的内容矩形（屏幕坐标，x/y/width/height）落到模块状态，并立即按光标位置对一次穿透态 */
function updateAiIslandContentScreen(x, y, contentWidth, height) {
	aiIslandContentScreen = {
		x,
		y,
		width: contentWidth,
		height
	};
	pollAiIslandPassThrough();
}
/** 几何判定：光标在内容矩形内 → 可交互（不忽略）；否则 → 穿透（忽略 + forward，让下方应用可点）。
*  contentWidth 不含右侧 +20 透明缓冲，故光标落在该透明区时按"不在内容上"穿透。恒 coalesce。 */
function pollAiIslandPassThrough() {
	if (!aiIsland || aiIsland.isDestroyed() || !aiIslandContentScreen) return;
	const cp = electron.screen.getCursorScreenPoint();
	const c = aiIslandContentScreen;
	const ignore = !(cp.x >= c.x && cp.x <= c.x + c.width && cp.y >= c.y && cp.y <= c.y + c.height);
	if (ignore !== aiIslandMouseIgnored) {
		aiIslandMouseIgnored = ignore;
		aiIsland.setIgnoreMouseEvents(ignore, { forward: true });
	}
}
function startAiIslandMousePolling() {
	stopAiIslandMousePolling();
	aiIslandPollTimer = setInterval(pollAiIslandPassThrough, 120);
}
function stopAiIslandMousePolling() {
	if (aiIslandPollTimer) {
		clearInterval(aiIslandPollTimer);
		aiIslandPollTimer = null;
	}
}
var AI_ISLAND_SETTINGS_FILE = "ai-island-settings.json";
var DEFAULT_AI_ISLAND_SETTINGS = { flat: false };
var cachedAiIslandSettings = null;
function aiIslandSettingsFilePath() {
	return (0, node_path.join)(electron.app.isPackaged ? electron.app.getPath("userData") : (0, node_path.join)(__dirname, "..", ".."), AI_ISLAND_SETTINGS_FILE);
}
function loadAiIslandSettings() {
	try {
		const data = node_fs.default.readFileSync(aiIslandSettingsFilePath(), "utf-8");
		const parsed = JSON.parse(data);
		return { flat: typeof parsed.flat === "boolean" ? parsed.flat : DEFAULT_AI_ISLAND_SETTINGS.flat };
	} catch {}
	return { ...DEFAULT_AI_ISLAND_SETTINGS };
}
function saveAiIslandSettings(settings) {
	try {
		node_fs.default.writeFileSync(aiIslandSettingsFilePath(), JSON.stringify(settings), "utf-8");
	} catch {}
}
/** 把设置作用到活动岛（运行时切换横条态；显隐由 IPC 显式控制，不在此改） */
function applyAiIslandSettings(s) {
	if (aiIsland && !aiIsland.isDestroyed()) aiIsland.webContents.send("ai-island-set-flat", s.flat);
}
function getAiIslandSettings() {
	if (cachedAiIslandSettings) return cachedAiIslandSettings;
	cachedAiIslandSettings = loadAiIslandSettings();
	return cachedAiIslandSettings;
}
/** 主进程内部唯一变更入口：白名单+类型校验→合并→save→刷新缓存→作用到活动岛→返回新值。
*  写入端与 loadAiIslandSettings 读取端做对称校验：非布尔 flat / 多余 key 一律丢弃，
*  避免把非法类型持久化进 JSON（否则重启后读取校验失败会静默回退默认值）。 */
function updateAiIslandSettings(patch) {
	const next = { ...getAiIslandSettings() };
	if (typeof patch.flat === "boolean") next.flat = patch.flat;
	saveAiIslandSettings(next);
	cachedAiIslandSettings = next;
	applyAiIslandSettings(next);
	return next;
}
/** 定位提问卡纯逻辑文件（question-card-utils.js）：dev 下随 vite 复制进 dist-electron/main/，打包后走 extraResources。
*  岛窗口用 data: URL 加载内联 HTML，内联 <script> 须在运行时 require() 这个文件（同 clawd-hook.js 的发布链路）。 */
function questionCardUtilsPath() {
	return electron.app.isPackaged ? path.join(process.resourcesPath, "question-card-utils.js") : path.join(__dirname, "question-card-utils.js");
}
/** AI 岛内联 HTML 的全部用户文案，构建时按当前语言取词条并内联进页面（data URL 构建机，
*  语言切换后重建/重载窗口即生效）。 */
function aiIslandStrings() {
	return {
		idle: t("aiIsland.idle"),
		thinking: t("aiIsland.thinking"),
		working: t("aiIsland.working"),
		error: t("aiIsland.error"),
		notification: t("aiIsland.notification"),
		done: t("aiIsland.done"),
		viewDetail: t("aiIsland.viewDetail"),
		permTitle: t("aiIsland.permTitle"),
		permTool: t("aiIsland.permTool"),
		permInput: t("aiIsland.permInput"),
		allow: t("common.allow"),
		alwaysAllow: t("common.alwaysAllow"),
		deny: t("common.deny"),
		questionTitle: t("aiIsland.questionTitle"),
		prev: t("aiIsland.prevQuestion"),
		next: t("aiIsland.nextQuestion"),
		submit: t("aiIsland.submitAnswer"),
		know: t("aiIsland.know"),
		otherPlaceholder: t("aiIsland.otherPlaceholder"),
		otherHint: t("aiIsland.otherHint"),
		answerInClaude: t("aiIsland.answerInClaude"),
		unknown: t("aiIsland.unknown"),
		other: t("aiIsland.other"),
		progress: t("aiIsland.progress"),
		close: t("common.close")
	};
}
function buildAiIslandHtml() {
	const flat = getAiIslandSettings().flat;
	const S = JSON.stringify(aiIslandStrings());
	return `<!DOCTYPE html>
<html><head><style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{height:100%;overflow:hidden;font-family:'Segoe UI',system-ui,sans-serif}
.island{
  width:fit-content;height:fit-content;
  background:rgba(20,20,40,0.96);
  border-radius:22px;
  display:flex;flex-direction:column;
  border:1px solid rgba(255,255,255,0.1);
  /* 横条态切换过渡：圆角/背景随 body.flat 平滑变化 */
  transition:opacity 0.3s,transform 0.3s,border-radius 0.3s,background 0.3s;
  overflow:hidden;
}
.island.hidden{opacity:0;transform:translateY(-8px) scaleY(0.5);pointer-events:none}
.island-row{display:flex;align-items:center;gap:8px;height:40px;padding:0 14px;justify-content:center;cursor:grab;-webkit-user-select:none;user-select:none;touch-action:none;transition:height 0.3s ease}
/* AI 状态指示器 */
.ai-indicator{display:flex;align-items:center;gap:7px;flex-shrink:0;padding:0 4px;cursor:pointer;border-radius:6px;transition:background 0.15s}
.ai-indicator:hover{background:rgba(255,255,255,0.08)}
.ai-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0;transition:all 0.3s}
.ai-dot.idle{background:#6b7280}
.ai-dot.thinking{background:#fbbf24;animation:ai-breathe 1.5s ease-in-out infinite;box-shadow:0 0 6px rgba(251,191,36,0.6)}
.ai-dot.working{background:#34d399;animation:ai-pulse 0.8s ease-in-out infinite;box-shadow:0 0 6px rgba(52,211,153,0.6)}
.ai-dot.error{background:#f87171;box-shadow:0 0 6px rgba(248,113,113,0.6)}
.ai-dot.notification{background:#a78bfa;animation:ai-pulse 0.6s ease-in-out infinite;box-shadow:0 0 8px rgba(167,139,250,0.8)}
.ai-dot.done{background:#66bb6a;animation:ai-flash 0.3s ease 3}
@keyframes ai-breathe{0%,100%{opacity:0.4;transform:scale(0.8)}50%{opacity:1;transform:scale(1.1)}}
@keyframes ai-pulse{0%,100%{opacity:0.5;transform:scale(0.9)}50%{opacity:1;transform:scale(1.15)}}
@keyframes ai-flash{0%,100%{opacity:1}50%{opacity:0.2;transform:scale(1.3)}}
.ai-label{font-size:11px;color:rgba(255,255,255,0.75);white-space:nowrap;font-weight:500;letter-spacing:0.3px}
.ai-label.active{color:#fff}
/* 权限卡片：宽度按内容自适应，最窄 300 / 最宽 420（超出在 420 内换行）；
   高度同样有上限：长 tool 参数 JSON 在 .perm-body 内纵向滚动，banner/操作按钮恒常可见可点 */
.perm-card{width:max-content;min-width:300px;max-width:420px;padding:0;display:none;flex-direction:column;word-break:break-word}
.perm-card.show{display:flex;animation:perm-in 0.22s cubic-bezier(0.4,0,0.2,1)}
@keyframes perm-in{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}
.perm-banner{display:flex;align-items:center;gap:8px;padding:8px 14px;background:rgba(255,255,255,0.04);border-top:1px solid rgba(255,255,255,0.1);border-bottom:1px solid rgba(255,255,255,0.06)}
.perm-banner-dot{width:7px;height:7px;border-radius:50%;background:#e8e8f0;animation:ai-pulse 0.9s ease-in-out infinite;box-shadow:0 0 8px rgba(232,232,240,0.5);flex-shrink:0}
.perm-banner-text{font-size:11px;font-weight:600;color:#e8e8f0;letter-spacing:0.4px}
.perm-body{display:flex;flex-direction:column;gap:10px;padding:12px 14px 10px;max-height:300px;overflow-y:auto}
.perm-row{display:flex;flex-direction:column;gap:4px}
.perm-row-label{font-size:9px;color:rgba(255,255,255,0.38);text-transform:uppercase;letter-spacing:0.6px;font-weight:600}
.perm-tool{font-size:13px;color:#34d399;font-weight:600;font-family:Consolas,'Courier New',monospace}
.perm-input{font-size:10.5px;color:rgba(255,255,255,0.78);font-family:Consolas,'Courier New',monospace;background:rgba(0,0,0,0.35);border:1px solid rgba(255,255,255,0.06);border-radius:5px;padding:6px 8px;word-break:normal;overflow-wrap:anywhere;line-height:1.5;white-space:pre-wrap}
.perm-actions{display:flex;gap:6px;padding:0 14px 12px}
.perm-btn{flex:1;padding:7px 8px;border:none;border-radius:6px;font-size:11px;font-weight:600;cursor:pointer;transition:all 0.15s;letter-spacing:0.3px}
.perm-btn.allow{background:#34d399;color:#0a0a14}
.perm-btn.allow:hover{background:#10b981;box-shadow:0 2px 8px rgba(52,211,153,0.35)}
.perm-btn.deny{background:rgba(255,255,255,0.06);color:rgba(255,255,255,0.8);border:1px solid rgba(255,255,255,0.1)}
.perm-btn.deny:hover{background:rgba(248,113,113,0.18);color:#fca5a5;border-color:rgba(248,113,113,0.4)}
.perm-btn.always{background:rgba(52,211,153,0.1);color:#6ee7b7;border:1px solid rgba(52,211,153,0.28)}
.perm-btn.always:hover{background:rgba(52,211,153,0.18);border-color:rgba(52,211,153,0.5)}
/* 提问卡片（AskUserQuestion 只读通知——Claude 的 hook 无法注入答案，答案须回主界面作答）：宽度按内容自适应，最窄 300 / 最宽 420；word-break 继承让长选项在卡宽内换行而非溢出裁剪。
   宽度钳制外，高度也设上限：多题/长选项时 .question-body 内纵向滚动，banner 进度与底部「上一题/知道了」恒常可见 */
.question-card{width:max-content;min-width:300px;max-width:420px;padding:0;display:none;flex-direction:column;word-break:break-word}
.question-card.show{display:flex;animation:perm-in 0.22s cubic-bezier(0.4,0,0.2,1)}
.question-banner{display:flex;align-items:center;gap:8px;padding:8px 14px;background:rgba(255,255,255,0.04);border-top:1px solid rgba(255,255,255,0.1);border-bottom:1px solid rgba(255,255,255,0.06)}
.question-banner-dot{width:7px;height:7px;border-radius:50%;background:#fbbf24;animation:ai-breathe 1.2s ease-in-out infinite;box-shadow:0 0 8px rgba(251,191,36,0.6);flex-shrink:0}
.question-banner-text{font-size:11px;font-weight:600;color:#fde68a;letter-spacing:0.4px}
/* 逐题推进的进度：右对齐，单题时隐藏 */
.question-progress{margin-left:auto;font-size:10px;font-weight:600;color:rgba(253,230,138,0.9);letter-spacing:0.3px}
.question-body{display:flex;flex-direction:column;gap:8px;padding:12px 14px 10px;max-height:300px;overflow-y:auto}
.question-text{font-size:12px;color:#fff;font-weight:600;line-height:1.5;white-space:pre-wrap;word-break:break-word}
.question-opt{display:flex;flex-direction:column;gap:3px;padding:6px 8px;background:rgba(0,0,0,0.35);border:1px solid rgba(255,255,255,0.06);border-radius:6px}
/* 可作答卡：选项可点选，单选/多选用一个前置小标记；选中项高亮描边 */
.question-opt.selectable{cursor:pointer;border:1px solid rgba(255,255,255,0.08);transition:all 0.12s}
.question-opt.selectable:hover{border-color:rgba(251,191,36,0.4);background:rgba(251,191,36,0.07)}
.question-opt.selectable.selected{border-color:rgba(52,211,153,0.65);background:rgba(52,211,153,0.12)}
.qmark{display:inline-flex;align-items:center;justify-content:center;width:11px;height:11px;border-radius:50%;margin-right:6px;font-size:8px;color:rgba(255,255,255,0.55);border:1px solid rgba(255,255,255,0.35);flex-shrink:0}
.qmark.multi{border-radius:3px}
.question-opt.selectable.selected .qmark{background:#34d399;border-color:#34d399;color:#0a0a14}
.question-other{width:100%;margin-top:6px;padding:6px 8px;border:none;border-radius:6px;background:rgba(0,0,0,0.4);color:#fff;font-size:11px;outline:none;border:1px solid rgba(251,191,36,0.35)}
/* 提问卡右上角「关闭」（可作答卡的放弃/关闭 → 回 deny） */
.question-close{margin-left:auto;cursor:pointer;font-size:13px;color:rgba(255,255,255,0.55);padding:0 4px;line-height:1;display:none}
.question-close:hover{color:#fca5a5}
.question-opt-label{font-size:11.5px;color:#6ee7b7;font-weight:600}
.question-opt-desc{font-size:10.5px;color:rgba(255,255,255,0.72);line-height:1.4;white-space:pre-wrap;word-break:break-word}
.question-hint{font-size:9.5px;color:rgba(255,255,255,0.4);line-height:1.4}
.question-actions{display:flex;padding:0 14px 12px}
.question-btn{flex:1;padding:7px 8px;border:none;border-radius:6px;font-size:11px;font-weight:600;cursor:pointer;transition:all 0.15s;letter-spacing:0.3px;background:rgba(255,255,255,0.06);color:rgba(255,255,255,0.8);border:1px solid rgba(255,255,255,0.1)}
.question-btn:hover{background:rgba(251,191,36,0.14);color:#fde68a;border-color:rgba(251,191,36,0.4)}
/* 上一题在首题时禁用（无题可回） */
.question-btn:disabled{opacity:0.35;cursor:default}
.question-btn:disabled:hover{background:rgba(255,255,255,0.06);color:rgba(255,255,255,0.8);border-color:rgba(255,255,255,0.1)}
/* 卡片主体纵向滚动条：深色细条，尽量不喧宾夺主；hover 时加亮 */
.perm-body::-webkit-scrollbar,.question-body::-webkit-scrollbar{width:7px}
.perm-body::-webkit-scrollbar-thumb,.question-body::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.16);border-radius:4px}
.perm-body::-webkit-scrollbar-thumb:hover,.question-body::-webkit-scrollbar-thumb:hover{background:rgba(255,255,255,0.3)}
.perm-body::-webkit-scrollbar-track,.question-body::-webkit-scrollbar-track{background:transparent}
/* 横条态：贴边的极简细胶囊条——更细、更素（半透明实色 + 细描边 + 柔影，无渐变/内高光）；
   仅在 body.flat 时生效，权限/提问卡出现时底部卡片保持原有展示 */
body.flat .island{
  min-width:200px;
  justify-content:center;
  background:#14141e; /* 不透明，无阴影 */
  border:1px solid rgba(255,255,255,0.08);
  border-top:none; /* 顶边贴齐屏幕边缘，看起来从屏幕边沿伸出 */
  border-radius:0 0 8px 8px; /* 上方两角直角贴边，只圆下方两角——挂边标签样式 */
}
body.flat .island-row{height:12px;padding:0 16px;gap:5px}
body.flat .ai-dot{width:5px;height:5px}
body.flat .ai-label{font-size:8.5px;letter-spacing:0.5px;color:rgba(255,255,255,0.55)}
body.flat .ai-label.active{color:#fff}
</style></head><body${flat ? " class=\"flat\"" : ""}>
<div class="island" id="island">
  <div class="island-row" id="islandRow">
    <div class="ai-indicator" id="aiIndicator" onclick="showAiDetail()" title="${t("aiIsland.viewDetail")}">
      <span class="ai-dot idle" id="aiDot"></span>
      <span class="ai-label" id="aiLabel">${t("aiIsland.idle")}</span>
    </div>
  </div>
  <div class="perm-card" id="permCard">
    <div class="perm-banner">
      <span class="perm-banner-dot"></span>
      <span class="perm-banner-text">${t("aiIsland.permTitle")}</span>
    </div>
    <div class="perm-body">
      <div class="perm-row">
        <span class="perm-row-label">${t("aiIsland.permTool")}</span>
        <span class="perm-tool" id="permTool">—</span>
      </div>
      <div class="perm-row" id="permInputRow" style="display:none">
        <span class="perm-row-label">${t("aiIsland.permInput")}</span>
        <div class="perm-input" id="permInput"></div>
      </div>
    </div>
    <div class="perm-actions">
      <button class="perm-btn allow" onclick="doAllow()">${t("common.allow")}</button>
      <button class="perm-btn always" onclick="doAlwaysAllow()">${t("common.alwaysAllow")}</button>
      <button class="perm-btn deny" onclick="doDeny()">${t("common.deny")}</button>
    </div>
  </div>
  <div class="question-card" id="questionCard">
    <div class="question-banner">
      <span class="question-banner-dot"></span>
      <span class="question-banner-text">${t("aiIsland.questionTitle")}</span>
      <span class="question-progress" id="questionProgress"></span>
      <span class="question-close" id="questionClose" onclick="closeQuestion()" title="${t("common.close")}">✕</span>
    </div>
    <div class="question-body" id="questionBody"></div>
    <div class="question-actions">
      <button class="question-btn" id="questionPrevBtn" onclick="prevQuestion()">${t("aiIsland.prevQuestion")}</button>
      <button class="question-btn" id="questionBtn" onclick="stepQuestion()">${t("aiIsland.know")}</button>
    </div>
  </div>
</div>
<script>
const __QCU_UTILS_PATH__=${JSON.stringify(questionCardUtilsPath())}
const quiz=require(__QCU_UTILS_PATH__)
const {resolveQuestionList,toQuestionItem,buttonLabel,progressText,questionKey,multiSelectOf,withOther,toggleOption,buildAnswers}=quiz
const {ipcRenderer}=require('electron')
// 语言词条：主进程构建 HTML 时按当前语言注入，切语言后重载窗口即更新
const S=${S};
const OTHER=S.other; // 「其他」选项的本地化标签：与内部 sentinel 逻辑解耦，展示/答案都走它
function resizeIsland(){
  const island=document.getElementById('island')
  const w=island.scrollWidth
  // 用 offsetHeight 而非 scrollHeight：scrollHeight 不含边框，会把 .island 的 1px 上下边框
  // 算漏，导致窗口高度比胶囊实际渲染高度矮 2px、底部边框在窗口底缘被硬裁（贴边细条上尤其明显）
  const h=island.offsetHeight
  ipcRenderer.send('resize-ai-island',w,h)
}
// 卡片宽度自适应：按当前展示卡的内容理想宽度钳制到 [300,420]，并把岛宽设为该值，
// 让窗口贴合卡片（避免 .island 的 fit-content 取卡片未钳制理想宽度导致窗口过宽、透明区挡点击）。
function fitIslandWidth(){
  const island=document.getElementById('island')
  const q=document.getElementById('questionCard'), p=document.getElementById('permCard')
  const card=q.classList.contains('show')?q:(p.classList.contains('show')?p:null)
  if(!card){ island.style.width=''; return }
  let w=card.scrollWidth
  if(w<300) w=300
  if(w>420) w=420
  island.style.width=w+'px'
}
const ro=new ResizeObserver(()=>resizeIsland())
ro.observe(document.getElementById('island'))
const aiLabels={idle:S.idle,thinking:S.thinking,working:S.working,error:S.error,notification:S.notification,done:S.done}
function applyState(data){
  const ind=document.getElementById('aiIndicator'),dot=document.getElementById('aiDot'),lb=document.getElementById('aiLabel')
  if(!data||(data.state==='idle'&&(!data.sessions||!data.sessions.length))){ind.style.display='flex';dot.className='ai-dot idle';lb.textContent=S.idle;lb.classList.remove('active');setTimeout(resizeIsland,50);return}
  ind.style.display='flex';dot.className='ai-dot '+data.state;lb.textContent=aiLabels[data.state]||S.idle;lb.classList.toggle('active',data.state!=='idle')
  setTimeout(resizeIsland,50)
}
function applyPermission(data){
  // 权限卡与提问卡互斥：展示权限时收起提问卡，同一时刻只显示一张卡
  document.getElementById('questionCard').classList.remove('show')
  try{
    document.getElementById('permCard').classList.add('show')
    document.getElementById('permTool').textContent=data.toolName||S.unknown
    const inputRow=document.getElementById('permInputRow')
    const inputEl=document.getElementById('permInput')
    const ti=data.toolInput
    if(ti&&typeof ti==='object'&&Object.keys(ti).length>0){
      const formatted=formatToolInput(ti)
      inputEl.textContent=formatted
      inputRow.style.display='flex'
    }else if(typeof ti==='string'&&ti.length>0){
      inputEl.textContent=String(ti)
      inputRow.style.display='flex'
    }else{
      inputRow.style.display='none'
    }
  }catch(err){
    console.error('perm render error:',err)
  }
  fitIslandWidth()
  setTimeout(resizeIsland,50)
}
// 提问卡「逐题推进」：qList 持整卡题目数组，qIndex 持当前题下标（只存岛上；卡片重新应用/清空即重置回第 1 题）。
// 可作答卡（answerable）：qSessionId 标记由 /permission 背书，qDrafts 持每题选中态（Set + 其他自由文本）
let qList=[], qIndex=0, qAnswerable=false, qSessionId='', qDrafts=[]
function currentDraft(){ return qDrafts[qIndex] || (qDrafts[qIndex]={selected:new Set(),otherText:''}) }
function renderCurrentQuestion(){
  const answerable=qAnswerable
  const body=document.getElementById('questionBody'); body.innerHTML=''
  const total=qList.length
  const view=toQuestionItem(qList[qIndex]||qList[0], qIndex)
  // 进度：单题隐藏，多题显示「第 X/N 题」（本地化）
  const prog=document.getElementById('questionProgress')
  const pt=total>1 ? S.progress.replace('{n}',String(qIndex+1)).replace('{t}',String(total)) : null
  prog.style.display=pt?'inline':'none'; prog.textContent=pt||''
  const closeEl=document.getElementById('questionClose')
  // 当前题标题
  const t=document.createElement('div');t.className='question-text';t.textContent=view.text
  body.appendChild(t)
  if(answerable){
    // 可作答：选项可点选，末尾按需追加「其他」自由输入；单选/多选依据 multiSelect
    const item=qList[qIndex]
    const multi=multiSelectOf(item)
    const opts=withOther(view.options, OTHER)
    const draft=currentDraft()
    opts.forEach(function(opt){
      const row=document.createElement('div');row.className='question-opt selectable'+(draft.selected.has(opt.label)?' selected':'')
      const lab=document.createElement('div');lab.className='question-opt-label'
      const mark=document.createElement('span');mark.className='qmark'+(multi?' multi':'')
      mark.textContent=multi?'✓':''
      lab.appendChild(mark)
      lab.appendChild(document.createTextNode(opt.label))
      row.appendChild(lab)
      if(opt.desc){
        const d=document.createElement('div');d.className='question-opt-desc';d.textContent=opt.desc
        row.appendChild(d)
      }
      row.addEventListener('click',function(){
        const r=toggleOption(draft.selected,opt.label,multi, OTHER)
        draft.selected=r.selected
        renderCurrentQuestion()
      })
      body.appendChild(row)
      if(opt.isOther&&draft.selected.has(OTHER)){
        const inp=document.createElement('input');inp.className='question-other';inp.placeholder=S.otherPlaceholder;inp.value=draft.otherText||''
        inp.addEventListener('click',function(e){e.stopPropagation()})
        inp.addEventListener('input',function(){draft.otherText=inp.value})
        body.appendChild(inp)
        if(multi){
          const h=document.createElement('div');h.className='question-hint';h.textContent=S.otherHint
          body.appendChild(h)
        }
      }
    })
    if(closeEl) closeEl.style.display='inline-block'
    // 末题「提交答案」（回 allow+answers）；非末题「下一题」仅本地推进
    document.getElementById('questionBtn').textContent=(qIndex<total-1)?S.next:S.submit
  }else{
    // 只读（现状）：仅展示选项，提示去 Claude 界面作答
    view.options.forEach(function(opt){
      const row=document.createElement('div');row.className='question-opt'
      const lab=document.createElement('div');lab.className='question-opt-label';lab.textContent=opt.label
      row.appendChild(lab)
      if(opt.desc){
        const d=document.createElement('div');d.className='question-opt-desc';d.textContent=opt.desc
        row.appendChild(d)
      }
      body.appendChild(row)
    })
    const hint=document.createElement('div');hint.className='question-hint'
    hint.textContent=S.answerInClaude
    body.appendChild(hint)
    if(closeEl) closeEl.style.display='none'
    document.getElementById('questionBtn').textContent=(qIndex<total-1)?S.next:S.know
  }
  document.getElementById('questionPrevBtn').disabled=qIndex<=0
  fitIslandWidth()
  resizeIsland()
}
function resetQuestion(){
  qList=[];qIndex=0;qAnswerable=false;qSessionId='';qDrafts=[]
  const closeEl=document.getElementById('questionClose'); if(closeEl) closeEl.style.display='none'
}
function applyQuestion(q){
  const card=document.getElementById('questionCard')
  if(!q){ resetQuestion(); card.classList.remove('show');setTimeout(resizeIsland,50);return }
  // 提问卡与权限卡互斥：展示提问时收起权限卡，避免残留的"允许/拒绝"按钮与提问叠在一起
  document.getElementById('permCard').classList.remove('show')
  // 重新应用卡片 → 一律从第 1 题开始；记录是否可作答（由 /permission 背书）
  qList=resolveQuestionList(q); qIndex=0
  qAnswerable=!!q.answerable; qSessionId=q.sessionId||''
  qDrafts=qList.map(function(){return {selected:new Set(),otherText:''}})
  renderCurrentQuestion()
  card.classList.add('show')
  fitIslandWidth()
  setTimeout(resizeIsland,50)
}
// 非末题：「下一题」仅本地推进（不触发 IPC、不动队列）；末题：
//   只读 → 关闭（知道了）；可作答 → 提交答案（回 allow+updatedInput.answers）
function stepQuestion(){
  if(qIndex<qList.length-1){ qIndex++; renderCurrentQuestion(); return }
  if(qAnswerable){
    const payload=buildAnswers(qList,qDrafts, OTHER)
    ipcRenderer.invoke('agent-submit-question', qSessionId, payload)
    document.getElementById('questionCard').classList.remove('show')
    resetQuestion()
    setTimeout(resizeIsland,50)
  }else{
    dismissQuestion()
  }
}
// 「上一题」：纯本地回退一题，永不关卡（首题时按钮 disabled）
function prevQuestion(){
  if(qIndex>0){ qIndex--; renderCurrentQuestion() }
}
// 「关闭」（右上角 ✕）：只读卡直接收起；可作答卡回 deny 结束提问（服务端区分处理）
function closeQuestion(){dismissQuestion()}
function applyCard(card){
  // 权限卡与提问卡互斥：只渲染队首卡（applyPermission/applyQuestion 内部也会收起另一张）
  if(!card){
    document.getElementById('permCard').classList.remove('show')
    document.getElementById('questionCard').classList.remove('show')
    resetQuestion()
    fitIslandWidth()
    setTimeout(resizeIsland,50)
    return
  }
  if(card.kind==='permission'){ applyPermission(card); return }
  applyQuestion(card)
}
ipcRenderer.on('agent-state-update',(e,data)=>applyState(data))
ipcRenderer.on('agent-card-update',(e,data)=>applyCard(data))
// 懒创建的岛加载后主动拉取一次当前状态/队首卡，避免错过创建前的广播
function initStatus(){
  ipcRenderer.invoke('agent-get-status').then(s=>{
    if(!s) return
    applyState({state:s.displayState,sessions:[]})
    if(s.currentCard) applyCard(s.currentCard)
  }).catch(()=>{})
}
function formatToolInput(input){
  try{
    // 常用字段优先展示
    const priorityKeys=['file_path','path','command','url','pattern','query']
    const lines=[]
    for(const k of priorityKeys){
      if(input[k]!==undefined){
        lines.push(k+': '+String(input[k]))
      }
    }
    // 其余字段：全部展示，不做行数/长度截断（岛按内容自动长大）
    for(const k of Object.keys(input)){
      if(priorityKeys.includes(k)) continue
      const v=input[k]
      const vs=typeof v==='object'?JSON.stringify(v):String(v)
      lines.push(k+': '+vs)
    }
    return lines.join('\\n')
  }catch{ return JSON.stringify(input) }
}
function doAllow(){resolvePerm('allow')}
function doDeny(){resolvePerm('deny')}
function doAlwaysAllow(){resolvePerm('always')}
function resolvePerm(b){ipcRenderer.invoke('agent-resolve-permission',b);document.getElementById('permCard').classList.remove('show');setTimeout(resizeIsland,50)}
function dismissQuestion(){ipcRenderer.invoke('agent-dismiss-question');document.getElementById('questionCard').classList.remove('show');setTimeout(resizeIsland,50)}
function showAiDetail(){ipcRenderer.invoke('show-ai-window')}
// === 横条态：切换 body.flat 触发 CSS 过渡（行高 40↔12 + 圆角/背景），窗口尺寸由
//     ResizeObserver 在过渡的每一帧跟随（resize-ai-island），实现平滑过渡而非硬跳 ===
function setFlat(flat){
  document.body.classList.toggle('flat', !!flat)
  fitIslandWidth()
  // 这里不做即时 resize：尺寸变化会逐帧经 RO 发送，避免与过渡抢跑造成上下抖动；
  // 只在过渡结束后兜底一次，确保窗口与最终尺寸精确一致
  setTimeout(resizeIsland, 320)
}
ipcRenderer.on('ai-island-set-flat',(_e,flat)=>setFlat(flat))
// === AI 岛拖动（整条状态条含 padding，4px 阈值区分点击 vs 拖动） ===
// 复用悬浮球的 pointer 拖动模式：pointerdown 记录起点，超过 4px 才算拖动，
// 这样 .ai-indicator 的"点击查看详情"不受影响（真拖动不触发 click）
const row=document.getElementById('islandRow')
let dsX=0, dsY=0, dragging=false
row.addEventListener('pointerdown',function(e){
  dsX=e.screenX; dsY=e.screenY; dragging=false
  row.setPointerCapture(e.pointerId)
  ipcRenderer.send('ai-island-drag-start', e.screenX, e.screenY)
})
row.addEventListener('pointermove',function(e){
  if(e.buttons!==1) return
  if(!dragging){
    if(Math.abs(e.screenX-dsX)<=4 && Math.abs(e.screenY-dsY)<=4) return
    dragging=true
  }
  ipcRenderer.send('ai-island-drag-move', e.screenX, e.screenY)
})
row.addEventListener('pointerup',function(e){
  if(row.hasPointerCapture&&row.hasPointerCapture(e.pointerId)) row.releasePointerCapture(e.pointerId)
  if(dragging){ dragging=false; ipcRenderer.send('ai-island-drag-end') }
})
row.addEventListener('pointercancel',function(e){
  if(dragging){ dragging=false; ipcRenderer.send('ai-island-drag-end') }
})
// === 透明空白区鼠标穿透 ===
// 窗口比可见胶囊宽（width = 内容宽 + 20），右侧多余透明区若不处理会拦截下方应用的点击。
// 鼠标不在 .island 内容上时就通知主进程 setIgnoreMouseEvents(true, {forward:true}) 穿透；
// forward 保证忽略时仍能收到 mousemove，移回内容时恢复可交互。
function updateMouseMode(e){
  const onIsland = e.target && e.target.closest && !!e.target.closest('.island')
  ipcRenderer.send('set-ai-island-mouse-mode', onIsland)
}
document.addEventListener('mousemove', updateMouseMode)
// 穿透态（ignore=true）下 Windows 的 setIgnoreMouseEvents(ignore,{forward:true}) 只转发 mousemove，
// click/pointerdown 收不到——所以穿透态恢复可交互只能靠悬停产生的 mousemove，pointerdown 兜底
// 仅在「已可交互」时兜住被吞的 move，无法跨越穿透态直接恢复（见 set-ai-island-mouse-mode 的 forward 说明）。
document.addEventListener('pointerdown', updateMouseMode)
// 默认点击穿透（忽略鼠标）：无边框透明窗口的不可见缩放热区 / +20px 透明缓冲若不穿透会
// 拦截下方应用点击（横条态贴边细条时尤甚）。仅当指针悬停在 .island 可见内容上时，由
// 上面的 mousemove/pointerdown 检测切换回可交互（点击横条打开 AI 窗口仍然有效）。
ipcRenderer.send('set-ai-island-mouse-mode', false)
resizeIsland()
initStatus()
<\/script>
</body></html>`;
}
function showAiIsland() {
	if (aiIsland && !aiIsland.isDestroyed()) return;
	const bounds = electron.screen.getPrimaryDisplay().bounds;
	const w = 200;
	const h = 44;
	const x = Math.round(bounds.x + (bounds.width - w) / 2);
	const y = bounds.y + 4;
	aiIsland = new electron.BrowserWindow({
		x,
		y,
		width: w,
		height: h,
		frame: false,
		transparent: true,
		resizable: false,
		movable: false,
		alwaysOnTop: true,
		skipTaskbar: true,
		hasShadow: false,
		webPreferences: {
			nodeIntegration: true,
			contextIsolation: false
		}
	});
	aiIsland.setVisibleOnAllWorkspaces(true);
	aiIsland.setMinimumSize(100, 12);
	aiIsland.setAlwaysOnTop(true, "screen-saver");
	updateAiIslandContentScreen(x, y, w, h);
	aiIsland.on("closed", () => {
		stopAiIslandMousePolling();
	});
	startAiIslandMousePolling();
	aiIsland.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(buildAiIslandHtml())}`);
	logger_default.info("AI island shown");
}
function hideAiIsland() {
	if (aiIsland && !aiIsland.isDestroyed()) {
		stopAiIslandMousePolling();
		aiIsland.close();
		aiIsland = null;
		logger_default.info("AI island hidden");
	}
}
/** 语言切换后重建已打开的岛（HTML 按词条内联，须重新 loadURL；窗口不存在时静默）。
*  懒创建的岛下次 show 自然用新语言，无需处理。 */
function reloadAiIsland() {
	if (aiIsland && !aiIsland.isDestroyed()) {
		aiIsland.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(buildAiIslandHtml())}`).catch(() => {});
		logger_default.info("AI island reloaded for locale");
	}
}
function registerAiIslandHandlers() {
	electron.ipcMain.handle("get-ai-island-settings", () => getAiIslandSettings());
	electron.ipcMain.handle("set-ai-island-settings", (_event, patch) => {
		return updateAiIslandSettings(patch);
	});
	electron.ipcMain.on("resize-ai-island", (_event, contentWidth, contentHeight) => {
		if (!aiIsland || aiIsland.isDestroyed()) return;
		if (!Number.isFinite(contentWidth)) return;
		const totalW = contentWidth + 20;
		const h = typeof contentHeight === "number" && Number.isFinite(contentHeight) ? contentHeight : 44;
		if (!Number.isFinite(totalW) || !Number.isFinite(h)) return;
		if (getAiIslandSettings().flat) {
			const b = electron.screen.getDisplayMatching(aiIsland.getBounds()).bounds;
			const newX = Math.round(b.x + (b.width - contentWidth) / 2);
			if (!Number.isFinite(newX)) return;
			aiIsland.setBounds({
				x: newX,
				y: b.y,
				width: contentWidth,
				height: h
			});
			updateAiIslandContentScreen(newX, b.y, contentWidth, h);
		} else if (aiIslandUserMoved) {
			const [x, y] = aiIsland.getPosition();
			if (!Number.isFinite(x) || !Number.isFinite(y)) return;
			aiIsland.setBounds({
				x,
				y,
				width: totalW,
				height: h
			});
			updateAiIslandContentScreen(x, y, contentWidth, h);
		} else {
			const bounds = electron.screen.getPrimaryDisplay().bounds;
			const newX = Math.round(bounds.x + (bounds.width - totalW) / 2);
			const newY = bounds.y + 4;
			if (!Number.isFinite(newX) || !Number.isFinite(newY)) return;
			aiIsland.setBounds({
				x: newX,
				y: newY,
				width: totalW,
				height: h
			});
			updateAiIslandContentScreen(newX, newY, contentWidth, h);
		}
	});
	electron.ipcMain.on("ai-island-drag-start", (_event, sx, sy) => {
		if (!aiIsland || aiIsland.isDestroyed()) return;
		if (!Number.isFinite(sx) || !Number.isFinite(sy)) return;
		const [wx, wy] = aiIsland.getPosition();
		aiDragOrigin = {
			winX: wx,
			winY: wy,
			scrX: sx,
			scrY: sy
		};
	});
	electron.ipcMain.on("ai-island-drag-move", (_event, sx, _sy) => {
		if (!aiIsland || aiIsland.isDestroyed() || !aiDragOrigin) return;
		if (!Number.isFinite(sx) || !Number.isFinite(aiDragOrigin.scrX) || !Number.isFinite(aiDragOrigin.winX) || !Number.isFinite(aiDragOrigin.winY)) return;
		const dx = sx - aiDragOrigin.scrX;
		const nx = Math.round(aiDragOrigin.winX + dx);
		if (!Number.isFinite(nx)) return;
		const [w, h] = aiIsland.getSize();
		aiIsland.setBounds({
			x: nx,
			y: aiDragOrigin.winY,
			width: w,
			height: h
		});
		const contentW = getAiIslandSettings().flat ? w : w - 20;
		updateAiIslandContentScreen(nx, aiDragOrigin.winY, contentW, h);
	});
	electron.ipcMain.on("ai-island-drag-end", () => {
		aiDragOrigin = null;
		if (!getAiIslandSettings().flat) aiIslandUserMoved = true;
	});
	electron.ipcMain.on("set-ai-island-mouse-mode", (_event, interactive) => {
		if (!aiIsland || aiIsland.isDestroyed()) return;
		const ignore = !interactive;
		if (ignore !== aiIslandMouseIgnored) {
			aiIslandMouseIgnored = ignore;
			aiIsland.setIgnoreMouseEvents(ignore, { forward: true });
		}
	});
}
//#endregion
//#region electron/main/cooling.ts
var logger$2 = {
	info: () => {},
	warn: () => {},
	error: () => {}
};
function setCoolingLogger(l) {
	logger$2 = l;
}
function msg(e) {
	return e?.message ?? String(e);
}
var dataDirOverride$1 = null;
function dataDir$1() {
	if (dataDirOverride$1) return dataDirOverride$1;
	try {
		const { app } = require("electron");
		return app.getPath("userData");
	} catch {
		return null;
	}
}
var runnerOverride = null;
/** 散热时长可注入（单测缩短到几百 ms；生产恒 10s）。 */
var durationOverrideMs = null;
function durationMs() {
	return durationOverrideMs ?? COOLING_DURATION_MS;
}
function realRunPowercfg(args, timeoutMs = 4e3) {
	return new Promise((resolve, reject) => {
		(0, node_child_process.execFile)("powercfg", args, {
			timeout: timeoutMs,
			windowsHide: true,
			encoding: "utf8"
		}, (err, stdout) => {
			if (err) reject(err);
			else resolve(stdout);
		});
	});
}
/** 把脚本编码为 -EncodedCommand 参数（base64 UTF-16LE）。为什么不用 -Command：
*  Node execFile 会把参数里的 `"` 转义成 `\"` 传命令行，PS 5.1 对 `\"` 的解析有坑
*  （"字符串缺少终止符"）——含 Add-Type C# 引号的复杂载荷必须走 EncodedCommand。 */
function toEncodedCommand(script) {
	return Buffer.from(script, "utf16le").toString("base64");
}
function realRunPowerShell(script, timeoutMs = 4e3) {
	return new Promise((resolve, reject) => {
		(0, node_child_process.execFile)("powershell.exe", [
			"-NoProfile",
			"-NonInteractive",
			"-EncodedCommand",
			toEncodedCommand(script)
		], {
			timeout: timeoutMs,
			windowsHide: true,
			encoding: "utf8"
		}, (err, stdout) => {
			if (err) reject(err);
			else resolve(stdout);
		});
	});
}
var runners = {
	runPowercfg: (a, t) => runnerOverride?.runPowercfg ? runnerOverride.runPowercfg(a, t) : realRunPowercfg(a, t),
	runPowerShell: (s, t) => runnerOverride?.runPowerShell ? runnerOverride.runPowerShell(s, t) : realRunPowerShell(s, t)
};
/** 解析 powercfg /q <guid> SUB_PROCESSOR PROCTHROTTLEMAX 输出中的当前 AC/DC 值。
*  关键：标签行随系统语言本地化（中文 Windows 是"当前交流/直流电源设置索引"，不是英文），
*  不能只按英文匹配。分两级：
*  ① 中/英关键词（覆盖绝大多数用户）；② 按位置兜底——/q 输出结构固定，末两行带 0x 尾值
*  的行恒为 AC、DC（"可能的设置单位"行为 %，不带 hex）。GUID 与十六进制均为 ASCII，
*  其余本地化文案即使乱码也不影响（utf8 解码 GBK 只坏中文段）。 */
function parseThrottleMax(stdout) {
	const acKw = stdout.match(/(?:AC|交流)[^\r\n]*?(0x[0-9a-fA-F]+)\s*$/im);
	if (acKw) {
		const dcKw = stdout.match(/(?:DC|直流)[^\r\n]*?(0x[0-9a-fA-F]+)\s*$/im);
		return {
			ac: parseInt(acKw[1], 16),
			dc: dcKw ? parseInt(dcKw[1], 16) : null
		};
	}
	const vals = [];
	for (const line of stdout.split(/\r?\n/)) {
		const m = line.trim().match(/(0x[0-9a-fA-F]+)$/);
		if (m) vals.push(parseInt(m[1], 16));
	}
	if (vals.length < 2) return null;
	return {
		ac: vals[vals.length - 2],
		dc: vals[vals.length - 1]
	};
}
/** ACPI CurrentTemperature 单位 0.1K → ℃，保留 1 位小数。超出物理合理范围（<0 / >120℃）
*  视为无效读数——热区空闲/未就绪时常吐 ~2732（≈0℃）之类的占位值。 */
function kelvinToCelsius(rawTenthsKelvin) {
	if (!Number.isFinite(rawTenthsKelvin) || rawTenthsKelvin <= 0) return null;
	const c = rawTenthsKelvin / 10 - 273.15;
	if (c < 0 || c > 120) return null;
	return Math.round(c * 10) / 10;
}
/** 温度命令输出（每行一个 0.1K 整数，可能多个热区）取最大有效值；全无效 → null。 */
function pickMaxZoneTemp(stdout) {
	let best = null;
	for (const line of stdout.split(/\r?\n/)) {
		const m = line.trim().match(/^(\d+)$/);
		if (!m) continue;
		const c = kelvinToCelsius(parseInt(m[1], 10));
		if (c !== null && (best === null || c > best)) best = c;
	}
	return best;
}
/** 一次 PowerShell 采齐四项：CPU 平均负载、物理内存占用、磁盘活动时间%（_Total）、
*  GPU 利用率（有 nvidia-smi 才有值，否则空串）。CIM formatted data 免采样等待。 */
var USAGE_POLL_PS = "$ErrorActionPreference='Stop';$cpu=[int]((Get-CimInstance Win32_Processor | Measure-Object -Property LoadPercentage -Average).Average);$os=Get-CimInstance Win32_OperatingSystem;$mem=[int]((1-$os.FreePhysicalMemory/$os.TotalVisibleMemorySize)*100);$disk=(Get-CimInstance Win32_PerfFormattedData_PerfDisk_PhysicalDisk | Where-Object {$_.Name -eq '_Total'} | Select-Object -First 1).PercentDiskTime;$smi=Join-Path $env:windir 'System32\\nvidia-smi.exe';$gpu='';if(Test-Path $smi){$gpu=(& $smi --query-gpu=utilization.gpu --format=csv,noheader,nounits | Select-Object -First 1)};Write-Output \"CPU=$cpu;MEM=$mem;DISK=$disk;GPU=$gpu\"";
/** 解析 USAGE_POLL_PS 的输出行。GPU 空串 = 无 nvidia-smi → null；磁盘 >100 钳到 100
*  （PercentDiskTime 多盘聚合可能超百）。整体不匹配 → null。 */
function parseUsageLine(stdout) {
	const m = stdout.match(/CPU=(\d+);MEM=(\d+);DISK=(\d+);GPU=(\d*)/);
	if (!m) return null;
	return {
		cpu: parseInt(m[1], 10),
		mem: parseInt(m[2], 10),
		disk: Math.min(100, parseInt(m[3], 10)),
		gpu: m[4] === "" ? null : parseInt(m[4], 10)
	};
}
/** Win32_PerfFormattedData_Counters_ThermalZoneInformation 的 Temperature 专用解析。
*  文档单位是 0.1K，但各机型实现混乱（实测有 340 这类值——340×0.1K=34K 显然荒谬，
*  只能是 340K≈67℃ 或 340×0.1℃=34℃）。按可信度阶梯逐级解释，取第一个物理合理的：
*  ① 0.1K（文档单位，值 ≥2732 才可能）② 摄氏度 ③ 开尔文。
*  单位猜错的代价可接受：前后两次读数用同一把尺，温差趋势仍然如实。 */
function pickMaxPerfCounterTemp(stdout) {
	let best = null;
	for (const line of stdout.split(/\r?\n/)) {
		const m = line.trim().match(/^(\d+)$/);
		if (!m) continue;
		const v = parseInt(m[1], 10);
		let c = kelvinToCelsius(v);
		if (c === null && v >= 0 && v <= 120) c = v;
		if (c === null && v >= 273 && v <= 393) c = Math.round((v - 273.15) * 10) / 10;
		if (c !== null && (best === null || c > best)) best = c;
	}
	return best;
}
/** 从 powercfg /getactivescheme 输出提取活动 scheme GUID（统一小写便于比较）。 */
function parseActiveScheme(stdout) {
	const m = stdout.match(/([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})/);
	return m ? m[1].toLowerCase() : null;
}
/** 散热期 CPU 最大频率百分比。50% 温和够用（发热大致减半），风扇自然随之回落；
*  若想更激进降温可调低，但代价是散热期间系统明显卡顿。 */
var COOLING_THROTTLE_PCT = 50;
/** 散热总时长。悬浮球的花瓣旋转动画时长与此对齐（CSS 变量由 setCoolingVisual 传入）。 */
var COOLING_DURATION_MS = 2e4;
var powerState = null;
/** 启用功耗杠杆。成功 = 已把活动 scheme 的 PROCTHROTTLEMAX 降到 COOLING_THROTTLE_PCT。
*  任一步失败都返回 false（跳过该杠杆），主流程不中断。 */
async function applyPowerLever(token) {
	try {
		const guid = parseActiveScheme(await runners.runPowercfg(["/getactivescheme"]));
		if (!guid) {
			logger$2.warn("[Cooling] active scheme GUID not parsed, skip power lever");
			return false;
		}
		const orig = parseThrottleMax(await runners.runPowercfg([
			"/q",
			guid,
			"SUB_PROCESSOR",
			"PROCTHROTTLEMAX"
		]));
		if (!orig) {
			logger$2.warn("[Cooling] PROCTHROTTLEMAX query unparsed, skip power lever");
			return false;
		}
		const pct = String(COOLING_THROTTLE_PCT);
		await runners.runPowercfg([
			"/setacvalueindex",
			guid,
			"SUB_PROCESSOR",
			"PROCTHROTTLEMAX",
			pct
		]);
		try {
			await runners.runPowercfg([
				"/setdcvalueindex",
				guid,
				"SUB_PROCESSOR",
				"PROCTHROTTLEMAX",
				pct
			]);
		} catch (e) {
			logger$2.warn("[Cooling] setdcvalueindex failed (desktop without battery?):", msg(e));
		}
		await runners.runPowercfg(["/setactive", guid]);
		if (token !== restoreToken || phase !== "active") {
			await restorePowerLeverInternal({
				schemeGuid: guid,
				acOrig: orig.ac,
				dcOrig: orig.dc
			});
			return false;
		}
		powerState = {
			schemeGuid: guid,
			acOrig: orig.ac,
			dcOrig: orig.dc
		};
		writeStateFile();
		logger$2.info(`[Cooling] power lever ON: ${guid} PROCTHROTTLEMAX -> ${COOLING_THROTTLE_PCT}% (was AC=${orig.ac}, DC=${orig.dc})`);
		return true;
	} catch (e) {
		logger$2.warn("[Cooling] power lever unavailable:", msg(e));
		return false;
	}
}
/** 恢复功耗：写回原值；仅当记录的 scheme 仍是活动 scheme 时才 /setactive 刷新生效。
*  为什么不无条件 /setactive：散热期间用户可能切了电源计划，强切回去是二次打扰；
*  非活动 scheme 写值本身即持久化，等它再次激活时自然生效。 */
async function restorePowerLeverInternal(st) {
	try {
		await runners.runPowercfg([
			"/setacvalueindex",
			st.schemeGuid,
			"SUB_PROCESSOR",
			"PROCTHROTTLEMAX",
			String(st.acOrig)
		]);
		if (st.dcOrig !== null) try {
			await runners.runPowercfg([
				"/setdcvalueindex",
				st.schemeGuid,
				"SUB_PROCESSOR",
				"PROCTHROTTLEMAX",
				String(st.dcOrig)
			]);
		} catch {}
		if (parseActiveScheme(await runners.runPowercfg(["/getactivescheme"])) === st.schemeGuid) await runners.runPowercfg(["/setactive", st.schemeGuid]);
		logger$2.info("[Cooling] power lever restored");
	} catch (e) {
		logger$2.error("[Cooling] power restore FAILED (check manually: powercfg /q SCHEME_CURRENT SUB_PROCESSOR PROCTHROTTLEMAX):", msg(e));
	}
}
async function restorePowerLever() {
	const st = powerState;
	powerState = null;
	if (st) await restorePowerLeverInternal(st);
}
/** before-quit 用的同步尽力恢复：退出路径不能 await，execFileSync 短超时逐条执行。
*  每条独立 try——最坏拖慢退出几秒，好过留下 50% 频率上限的残留。 */
function restorePowerLeverSync(st) {
	const opts = {
		timeout: 3e3,
		windowsHide: true,
		stdio: "ignore"
	};
	try {
		(0, node_child_process.execFileSync)("powercfg", [
			"/setacvalueindex",
			st.schemeGuid,
			"SUB_PROCESSOR",
			"PROCTHROTTLEMAX",
			String(st.acOrig)
		], opts);
	} catch (e) {
		logger$2.warn("[Cooling] sync AC restore failed:", msg(e));
	}
	if (st.dcOrig !== null) try {
		(0, node_child_process.execFileSync)("powercfg", [
			"/setdcvalueindex",
			st.schemeGuid,
			"SUB_PROCESSOR",
			"PROCTHROTTLEMAX",
			String(st.dcOrig)
		], opts);
	} catch {}
	try {
		if (parseActiveScheme((0, node_child_process.execFileSync)("powercfg", ["/getactivescheme"], {
			timeout: 3e3,
			windowsHide: true,
			encoding: "utf8"
		})) === st.schemeGuid) (0, node_child_process.execFileSync)("powercfg", ["/setactive", st.schemeGuid], opts);
		logger$2.info("[Cooling] power lever restored (sync, quit path)");
	} catch {}
}
/** 联想 Legion 智能风扇：root/wmi LENOVO_GAMEZONE_DATA 的 Get/SetSmartFanMode。
*  类名/方法名可信度高（社区 Legion 工具广泛使用）；mode 数值语义随机型有出入，
*  2（野兽/性能）为最常见映射。用读回验证保证"确实生效"才认账，否则自动回滚。 */
var LENOVO_CLASS = "LENOVO_GAMEZONE_DATA";
var LENOVO_FULL_MODE = 2;
var UNIWILL_ECRAM_FAN_CTL = 1873;
var UNIWILL_FAN_BOOST_BITS = 64;
var UNIWILL_PROBE_PS = `\$ErrorActionPreference='Stop';Add-Type -TypeDefinition 'using System;using System.Runtime.InteropServices;public class UWC{[DllImport("kernel32",SetLastError=true,CharSet=CharSet.Ansi)]public static extern IntPtr CreateFile(string n,uint a,uint s,IntPtr sa,uint d,uint f,IntPtr t);[DllImport("kernel32",SetLastError=true)]public static extern bool DeviceIoControl(IntPtr h,uint c,byte[] i,uint n,byte[] o,uint osz,out uint r,IntPtr ov);}';;\$h=[UWC]::CreateFile('\\\\.\\ACPIDriver',[uint32]3221225472,[uint32]3,[IntPtr]::Zero,[uint32]3,[uint32]0,[IntPtr]::Zero);if(\$h -eq [IntPtr](-1) -or \$h -eq [IntPtr]::Zero){throw 'no UWACPIDriver device'};function UwR(\$reg){\$o=New-Object byte[] 4;\$n=[uint32]0;[void][UWC]::DeviceIoControl(\$h,[uint32]'0x9C40A488',[BitConverter]::GetBytes([int]\$reg),4,\$o,4,[ref]\$n,[IntPtr]::Zero);return [BitConverter]::ToInt32(\$o,0)};function UwW(\$reg,\$val){\$b=New-Object byte[] 8;[BitConverter]::GetBytes([int]\$reg).CopyTo(\$b,0);[BitConverter]::GetBytes([int]\$val).CopyTo(\$b,4);\$o=New-Object byte[] 4;\$n=[uint32]0;return [UWC]::DeviceIoControl(\$h,[uint32]'0x9C40A48C',\$b,8,\$o,4,[ref]\$n,[IntPtr]::Zero)};$v=UwR ${UNIWILL_ECRAM_FAN_CTL};$d=UwR 0x75B;if($v -lt 0 -or $v -gt 255 -or $d -lt 0 -or $d -gt 255){throw 'bad ECRAM reading'};Write-Output 'OK'`;
var UNIWILL_APPLY_PS = `\$ErrorActionPreference='Stop';Add-Type -TypeDefinition 'using System;using System.Runtime.InteropServices;public class UWC{[DllImport("kernel32",SetLastError=true,CharSet=CharSet.Ansi)]public static extern IntPtr CreateFile(string n,uint a,uint s,IntPtr sa,uint d,uint f,IntPtr t);[DllImport("kernel32",SetLastError=true)]public static extern bool DeviceIoControl(IntPtr h,uint c,byte[] i,uint n,byte[] o,uint osz,out uint r,IntPtr ov);}';;\$h=[UWC]::CreateFile('\\\\.\\ACPIDriver',[uint32]3221225472,[uint32]3,[IntPtr]::Zero,[uint32]3,[uint32]0,[IntPtr]::Zero);if(\$h -eq [IntPtr](-1) -or \$h -eq [IntPtr]::Zero){throw 'no UWACPIDriver device'};function UwR(\$reg){\$o=New-Object byte[] 4;\$n=[uint32]0;[void][UWC]::DeviceIoControl(\$h,[uint32]'0x9C40A488',[BitConverter]::GetBytes([int]\$reg),4,\$o,4,[ref]\$n,[IntPtr]::Zero);return [BitConverter]::ToInt32(\$o,0)};function UwW(\$reg,\$val){\$b=New-Object byte[] 8;[BitConverter]::GetBytes([int]\$reg).CopyTo(\$b,0);[BitConverter]::GetBytes([int]\$val).CopyTo(\$b,4);\$o=New-Object byte[] 4;\$n=[uint32]0;return [UWC]::DeviceIoControl(\$h,[uint32]'0x9C40A48C',\$b,8,\$o,4,[ref]\$n,[IntPtr]::Zero)};$orig=UwR ${UNIWILL_ECRAM_FAN_CTL};$boosted=$orig -bor ${UNIWILL_FAN_BOOST_BITS};[void](UwW ${UNIWILL_ECRAM_FAN_CTL} $boosted);$chk=UwR ${UNIWILL_ECRAM_FAN_CTL};Write-Output "ORIG=$orig;BOOSTED=$boosted;NOW=$chk"`;
function uniwillRestorePs(orig) {
	return `\$ErrorActionPreference='Stop';Add-Type -TypeDefinition 'using System;using System.Runtime.InteropServices;public class UWC{[DllImport("kernel32",SetLastError=true,CharSet=CharSet.Ansi)]public static extern IntPtr CreateFile(string n,uint a,uint s,IntPtr sa,uint d,uint f,IntPtr t);[DllImport("kernel32",SetLastError=true)]public static extern bool DeviceIoControl(IntPtr h,uint c,byte[] i,uint n,byte[] o,uint osz,out uint r,IntPtr ov);}';;\$h=[UWC]::CreateFile('\\\\.\\ACPIDriver',[uint32]3221225472,[uint32]3,[IntPtr]::Zero,[uint32]3,[uint32]0,[IntPtr]::Zero);if(\$h -eq [IntPtr](-1) -or \$h -eq [IntPtr]::Zero){throw 'no UWACPIDriver device'};function UwR(\$reg){\$o=New-Object byte[] 4;\$n=[uint32]0;[void][UWC]::DeviceIoControl(\$h,[uint32]'0x9C40A488',[BitConverter]::GetBytes([int]\$reg),4,\$o,4,[ref]\$n,[IntPtr]::Zero);return [BitConverter]::ToInt32(\$o,0)};function UwW(\$reg,\$val){\$b=New-Object byte[] 8;[BitConverter]::GetBytes([int]\$reg).CopyTo(\$b,0);[BitConverter]::GetBytes([int]\$val).CopyTo(\$b,4);\$o=New-Object byte[] 4;\$n=[uint32]0;return [UWC]::DeviceIoControl(\$h,[uint32]'0x9C40A48C',\$b,8,\$o,4,[ref]\$n,[IntPtr]::Zero)};[void](UwW ${UNIWILL_ECRAM_FAN_CTL} ${orig});$chk=UwR ${UNIWILL_ECRAM_FAN_CTL};Write-Output "NOW=$chk"`;
}
var ASUS_CLASS = "AsusACPI";
var capability = null;
var CAPABILITY_FILE = "cooling-capability.json";
var CAPABILITY_TTL_MS = 168 * 3600 * 1e3;
/** 探测厂商风扇控制能力。探测冷启动可达数秒，结果落盘缓存 7 天
*  （驱动安装状态变化的周期远大于此）。 */
async function probeVendors() {
	const res = {
		uniwill: false,
		lenovo: false,
		asus: false,
		probedAt: Date.now()
	};
	try {
		const out = await runners.runPowerShell(UNIWILL_PROBE_PS, 8e3);
		res.uniwill = /OK/.test(out);
	} catch {
		res.uniwill = false;
	}
	try {
		const out = await runners.runPowerShell(`$ErrorActionPreference='Stop'; $c=Get-CimClass -Namespace root/wmi -ClassName ${LENOVO_CLASS}; ($c.CimClassMethods | ForEach-Object { $_.Name }) -join ','`, 8e3);
		res.lenovo = /GetSmartFanMode/i.test(out) && /SetSmartFanMode/i.test(out);
	} catch {
		res.lenovo = false;
	}
	try {
		const out = await runners.runPowerShell(`$ErrorActionPreference='Stop'; Get-CimClass -Namespace root/wmi -ClassName ${ASUS_CLASS} | Out-Null; 'ok'`, 8e3);
		res.asus = /ok/.test(out);
	} catch {
		res.asus = false;
	}
	logger$2.info(`[Cooling] vendor probe: uniwill=${res.uniwill} lenovo=${res.lenovo} asus=${res.asus}`);
	writeCapabilityFile(res);
	return res;
}
async function ensureCapability() {
	if (capability && Date.now() - capability.probedAt < CAPABILITY_TTL_MS) return capability;
	const cached = readCapabilityFile();
	if (cached && Date.now() - cached.probedAt < CAPABILITY_TTL_MS) {
		capability = cached;
		return cached;
	}
	capability = await probeVendors();
	return capability;
}
function writeCapabilityFile(res) {
	const dir = dataDir$1();
	if (!dir) return;
	try {
		node_fs.writeFileSync((0, node_path.join)(dir, CAPABILITY_FILE), JSON.stringify(res), "utf-8");
	} catch {}
}
function readCapabilityFile() {
	const dir = dataDir$1();
	if (!dir) return null;
	try {
		const parsed = JSON.parse(node_fs.readFileSync((0, node_path.join)(dir, CAPABILITY_FILE), "utf-8"));
		if (typeof parsed?.probedAt === "number" && typeof parsed?.uniwill === "boolean" && typeof parsed?.lenovo === "boolean" && typeof parsed?.asus === "boolean") return parsed;
	} catch {}
	return null;
}
var fanState = null;
/** 读回验证后启用风扇杠杆。一次 PowerShell 完成"读原值 → 置位 → 读回"，
*  输出 ORIG/NOW 由 Node 侧裁决——把签名不确定性压缩到"要么生效要么放弃"，不留半态。 */
async function applyVendorLever(token) {
	const cap = await ensureCapability();
	if (cap.uniwill) try {
		const out = await runners.runPowerShell(UNIWILL_APPLY_PS, 8e3);
		const m = out.match(/ORIG=(\d+);BOOSTED=(\d+);NOW=(\d+)/);
		if (!m) throw new Error("unparsed output: " + out.trim());
		const origMode = parseInt(m[1], 10);
		const boosted = parseInt(m[2], 10);
		const nowMode = parseInt(m[3], 10);
		if (nowMode !== boosted) {
			await runners.runPowerShell(uniwillRestorePs(origMode), 6e3);
			throw new Error(`readback mismatch (now=${nowMode}, want ${boosted})`);
		}
		if (token !== restoreToken || phase !== "active") {
			await runners.runPowerShell(uniwillRestorePs(origMode), 6e3);
			return false;
		}
		fanState = {
			vendor: "uniwill",
			origMode
		};
		writeStateFile();
		logger$2.info(`[Cooling] uniwill ECRAM 0x751: ${origMode} -> ${boosted} (fan boost)`);
		return true;
	} catch (e) {
		logger$2.warn("[Cooling] uniwill fan lever failed:", msg(e));
	}
	if (cap.lenovo) try {
		const script = [
			`$ErrorActionPreference='Stop'`,
			`$obj = Get-CimInstance -Namespace root/wmi -ClassName ${LENOVO_CLASS} | Select-Object -First 1`,
			`$o = Invoke-CimMethod -InputObject $obj -MethodName GetSmartFanMode`,
			`$origVal = [int]$(if ($null -ne $o.Data) { $o.Data } else { $o.mode })`,
			`Invoke-CimMethod -InputObject $obj -MethodName SetSmartFanMode -Arguments @{ mode = ${LENOVO_FULL_MODE} } | Out-Null`,
			`$n = Invoke-CimMethod -InputObject $obj -MethodName GetSmartFanMode`,
			`$nowVal = [int]$(if ($null -ne $n.Data) { $n.Data } else { $n.mode })`,
			`Write-Output "ORIG=$origVal;NOW=$nowVal"`
		].join("; ");
		const out = await runners.runPowerShell(script, 6e3);
		const m = out.match(/ORIG=(-?\d+);NOW=(-?\d+)/);
		if (!m) throw new Error("unparsed output: " + out.trim());
		const origMode = parseInt(m[1], 10);
		const nowMode = parseInt(m[2], 10);
		if (nowMode !== LENOVO_FULL_MODE) {
			await restoreFanMode(LENOVO_CLASS, origMode);
			throw new Error(`readback mismatch (now=${nowMode}, want ${LENOVO_FULL_MODE})`);
		}
		if (token !== restoreToken || phase !== "active") {
			await restoreFanMode(LENOVO_CLASS, origMode);
			return false;
		}
		fanState = {
			vendor: "lenovo",
			origMode
		};
		writeStateFile();
		logger$2.info(`[Cooling] lenovo fan mode ${origMode} -> ${LENOVO_FULL_MODE}`);
		return true;
	} catch (e) {
		logger$2.warn("[Cooling] lenovo fan lever failed:", msg(e));
	}
	if (cap.asus && true) logger$2.info("[Cooling] asus AsusACPI class present; lever disabled until on-device verification");
	return false;
}
async function restoreFanMode(className, origMode) {
	try {
		await runners.runPowerShell(`$ErrorActionPreference='Stop'; $obj = Get-CimInstance -Namespace root/wmi -ClassName ${className} | Select-Object -First 1; Invoke-CimMethod -InputObject $obj -MethodName SetSmartFanMode -Arguments @{ mode = ${origMode} } | Out-Null`, 6e3);
		logger$2.info(`[Cooling] ${className} fan mode restored to ${origMode}`);
	} catch (e) {
		logger$2.error("[Cooling] fan restore FAILED — fan mode may stay changed until manual reset:", msg(e));
	}
}
async function restoreVendorLever() {
	const st = fanState;
	fanState = null;
	if (!st) return;
	if (st.vendor === "uniwill") {
		try {
			const m = (await runners.runPowerShell(uniwillRestorePs(st.origMode), 6e3)).match(/NOW=(\d+)/);
			if (!m || parseInt(m[1], 10) !== st.origMode) {
				logger$2.error(`[Cooling] uniwill fan restore verify mismatch (got ${m ? m[1] : "unparsable"}, want ${st.origMode})`);
				return;
			}
			logger$2.info(`[Cooling] uniwill ECRAM 0x751 restored to ${st.origMode}`);
		} catch (e) {
			logger$2.error("[Cooling] uniwill fan restore FAILED — fan may stay boosted until manual reset:", msg(e));
		}
		return;
	}
	if (st.vendor === "lenovo") await restoreFanMode(LENOVO_CLASS, st.origMode);
}
function restoreVendorLeverSync() {
	const st = fanState;
	fanState = null;
	if (!st) return;
	try {
		(0, node_child_process.execFileSync)("powershell.exe", [
			"-NoProfile",
			"-NonInteractive",
			"-EncodedCommand",
			toEncodedCommand(st.vendor === "uniwill" ? uniwillRestorePs(st.origMode) : `$ErrorActionPreference='Stop'; $obj = Get-CimInstance -Namespace root/wmi -ClassName ${LENOVO_CLASS} | Select-Object -First 1; Invoke-CimMethod -InputObject $obj -MethodName SetSmartFanMode -Arguments @{ mode = ${st.origMode} } | Out-Null`)
		], {
			timeout: 4e3,
			windowsHide: true,
			stdio: "ignore"
		});
		logger$2.info(`[Cooling] ${st.vendor} fan mode restored (sync, quit path)`);
	} catch (e) {
		logger$2.error("[Cooling] sync fan restore failed:", msg(e));
	}
}
var TEMP_ZONE_PS = "Get-CimInstance -Namespace root/wmi -ClassName MSAcpi_ThermalZoneTemperature -ErrorAction Stop | Select-Object -ExpandProperty CurrentTemperature";
var TEMP_PERF_PS = "Get-CimInstance Win32_PerfFormattedData_Counters_ThermalZoneInformation -ErrorAction Stop | Select-Object -ExpandProperty Temperature";
async function readTempC() {
	try {
		const c = pickMaxZoneTemp(await runners.runPowerShell(TEMP_ZONE_PS));
		if (c !== null) return c;
	} catch {}
	try {
		const c = pickMaxPerfCounterTemp(await runners.runPowerShell(TEMP_PERF_PS));
		if (c !== null) return c;
	} catch {}
	return null;
}
var STATE_FILE = "cooling-state.json";
/** 把当前两档杠杆的"改动前原值"序列化落盘（每档杠杆提交后都重写一次，内容幂等）。 */
function writeStateFile() {
	const dir = dataDir$1();
	if (!dir) return;
	const payload = {
		schemeGuid: powerState?.schemeGuid ?? "",
		acOrig: powerState?.acOrig ?? 100,
		dcOrig: powerState?.dcOrig ?? null,
		fanVendor: fanState?.vendor ?? null,
		fanOrigMode: fanState?.origMode ?? null,
		startedAt
	};
	try {
		node_fs.writeFileSync((0, node_path.join)(dir, STATE_FILE), JSON.stringify(payload), "utf-8");
	} catch (e) {
		logger$2.warn("[Cooling] write state file failed:", msg(e));
	}
}
function deleteStateFile() {
	const dir = dataDir$1();
	if (!dir) return;
	try {
		node_fs.unlinkSync((0, node_path.join)(dir, STATE_FILE));
	} catch {}
}
/** 启动时崩溃残留修复：cooling-state.json 在场 → 把电源设置/风扇模式写回原值后删文件。
*  电源 scheme 只写值；仅当它仍是活动 scheme 才 /setactive——用户崩溃后可能已手动换了
*  电源计划，强切回去是二次打扰；非活动 scheme 写值即持久化，再次激活自然生效。 */
function recoverCoolingResidue() {
	const dir = dataDir$1();
	if (!dir) return;
	const f = (0, node_path.join)(dir, STATE_FILE);
	let st = null;
	try {
		st = JSON.parse(node_fs.readFileSync(f, "utf-8"));
	} catch {
		return;
	}
	if (!st || typeof st.schemeGuid !== "string" || !st.schemeGuid) {
		try {
			node_fs.unlinkSync(f);
		} catch {}
		return;
	}
	logger$2.warn("[Cooling] residue found from previous crash, restoring power/fan settings");
	const opts = {
		timeout: 3e3,
		windowsHide: true,
		stdio: "ignore"
	};
	try {
		(0, node_child_process.execFileSync)("powercfg", [
			"/setacvalueindex",
			st.schemeGuid,
			"SUB_PROCESSOR",
			"PROCTHROTTLEMAX",
			String(st.acOrig)
		], opts);
		if (typeof st.dcOrig === "number") try {
			(0, node_child_process.execFileSync)("powercfg", [
				"/setdcvalueindex",
				st.schemeGuid,
				"SUB_PROCESSOR",
				"PROCTHROTTLEMAX",
				String(st.dcOrig)
			], opts);
		} catch {}
		if (parseActiveScheme((0, node_child_process.execFileSync)("powercfg", ["/getactivescheme"], {
			timeout: 3e3,
			windowsHide: true,
			encoding: "utf8"
		})) === st.schemeGuid) (0, node_child_process.execFileSync)("powercfg", ["/setactive", st.schemeGuid], opts);
		logger$2.info("[Cooling] residue power restore done");
	} catch (e) {
		logger$2.error("[Cooling] residue power restore failed:", msg(e));
	}
	if (typeof st.fanOrigMode === "number" && (st.fanVendor === "lenovo" || st.fanVendor === "uniwill")) {
		const script = st.fanVendor === "uniwill" ? uniwillRestorePs(st.fanOrigMode) : `$ErrorActionPreference='Stop'; $obj = Get-CimInstance -Namespace root/wmi -ClassName ${LENOVO_CLASS} | Select-Object -First 1; Invoke-CimMethod -InputObject $obj -MethodName SetSmartFanMode -Arguments @{ mode = ${st.fanOrigMode} } | Out-Null`;
		try {
			(0, node_child_process.execFileSync)("powershell.exe", [
				"-NoProfile",
				"-NonInteractive",
				"-EncodedCommand",
				toEncodedCommand(script)
			], {
				timeout: 4e3,
				windowsHide: true,
				stdio: "ignore"
			});
			logger$2.info(`[Cooling] residue ${st.fanVendor} fan restore done`);
		} catch (e) {
			logger$2.warn("[Cooling] residue fan restore failed:", msg(e));
		}
	}
	try {
		node_fs.unlinkSync(f);
	} catch {}
}
var phase = "idle";
/** 收尾/取消时自增，让在途的杠杆 apply 知道要立即回滚（防异步竞态写回中间态） */
var restoreToken = 0;
var startedAt = 0;
var coolingTimer = null;
var tickTimer = null;
var usageTimer = null;
var onUpdateCb = null;
var tempBefore = null;
var tempAfter = null;
var currentTempC = null;
var levers = {
	fan: false,
	power: false
};
var usage = {
	cpu: null,
	gpu: null,
	disk: null,
	mem: null
};
function clearTimers() {
	if (coolingTimer) {
		clearTimeout(coolingTimer);
		coolingTimer = null;
	}
	if (tickTimer) {
		clearInterval(tickTimer);
		tickTimer = null;
	}
	if (usageTimer) {
		clearInterval(usageTimer);
		usageTimer = null;
	}
}
function remainSec() {
	return Math.max(0, Math.ceil((durationMs() - (Date.now() - startedAt)) / 1e3));
}
function emit(extra) {
	if (!onUpdateCb) return;
	onUpdateCb({
		phase: "active",
		remainSec: remainSec(),
		tempC: currentTempC,
		usage: { ...usage },
		levers: { ...levers },
		tempBefore,
		tempAfter: null,
		...extra
	});
}
/** 散热是否进行中（active/restoring）。悬浮球据此在散热动画期间挂起收起逻辑，
*  避免旋转中的花瓣被 blur/外部点击打断——转完由散热完成回调按原状态复位。 */
function isCoolingActive() {
	return phase !== "idle";
}
/** 散热总时长（秒）。花瓣旋转动画时长与之对齐（setCoolingVisual 传给渲染层）。 */
function getCoolingDurationSec() {
	return Math.round(durationMs() / 1e3);
}
/** 采一轮占用率并推送（每 2.5 秒一次；失败保持上次值）。 */
async function pollUsage() {
	try {
		const parsed = parseUsageLine(await runners.runPowerShell(USAGE_POLL_PS, 6e3));
		if (parsed) usage = parsed;
	} catch {}
	if (phase === "active") emit();
}
/** 启动 20 秒散热。返回 false = 已在散热中（UI 据此提示，不重复启动/不重置计时）。 */
function startCooling(onUpdate) {
	if (phase !== "idle") {
		logger$2.info("[Cooling] re-entry ignored (phase =", phase + ")");
		return false;
	}
	phase = "active";
	restoreToken++;
	startedAt = Date.now();
	tempBefore = null;
	tempAfter = null;
	currentTempC = null;
	levers = {
		fan: false,
		power: false
	};
	usage = {
		cpu: null,
		gpu: null,
		disk: null,
		mem: null
	};
	onUpdateCb = onUpdate;
	emit();
	coolingTimer = setTimeout(() => {
		finishCooling();
	}, durationMs());
	tickTimer = setInterval(() => {
		emit();
		const r = remainSec();
		if (r > 0 && r % 3 === 0) refreshTempC();
	}, 1e3);
	usageTimer = setInterval(() => {
		pollUsage();
	}, 2500);
	pollUsage();
	beginLevers();
	return true;
}
/** 后台并行启用两档杠杆；每档落定即时 emit，UI 文案随之从"监测中"变为实际生效杠杆。 */
async function beginLevers() {
	const token = restoreToken;
	currentTempC = await readTempC();
	tempBefore = currentTempC;
	emit();
	if (token !== restoreToken) return;
	levers.power = await applyPowerLever(token);
	emit();
	if (token !== restoreToken) return;
	levers.fan = await applyVendorLever(token);
	emit();
}
async function refreshTempC() {
	const t = await readTempC();
	if (phase !== "active") return;
	currentTempC = t;
	emit();
}
/** 20s 到点：停表 → 读结束温度 → 逐档恢复原值 → 上报 done（UI 展示前后对比后自关）。 */
async function finishCooling() {
	if (phase !== "active") return;
	phase = "restoring";
	restoreToken++;
	clearTimers();
	tempAfter = await readTempC();
	await restorePowerLever();
	await restoreVendorLever();
	deleteStateFile();
	phase = "idle";
	const cb = onUpdateCb;
	onUpdateCb = null;
	cb?.({
		phase: "done",
		remainSec: 0,
		tempC: tempAfter,
		usage: { ...usage },
		levers: { ...levers },
		tempBefore,
		tempAfter
	});
}
/** before-quit 同步收尾：清定时器 + 同步尽力恢复电源/风扇（退出路径不能 await）。 */
function cancelCooling() {
	restoreToken++;
	clearTimers();
	if (phase === "idle") return;
	logger$2.info("[Cooling] cancel on quit");
	phase = "restoring";
	const st = powerState;
	powerState = null;
	if (st) restorePowerLeverSync(st);
	restoreVendorLeverSync();
	deleteStateFile();
	phase = "idle";
	onUpdateCb = null;
}
//#endregion
//#region electron/main/cooling-overlay.ts
init_i18n();
var PANEL_W = 224;
var PANEL_H = 100;
var GAP = 8;
var BALL_HALF = 33;
var RESULT_SHOW_MS = 3e3;
var panelWindow = null;
var lastPayload = null;
var closeTimer = null;
/** 由球心推面板左上角（上方优先，放不下翻下方，水平夹回屏幕内）。 */
function panelOrigin(center) {
	const display = electron.screen.getDisplayMatching({
		x: center.x - 20,
		y: center.y - 20,
		width: 40,
		height: 40
	}).workArea;
	let x = Math.round(center.x - PANEL_W / 2);
	let y = Math.round(center.y - BALL_HALF - GAP - PANEL_H);
	if (y < display.y) y = Math.round(center.y + BALL_HALF + GAP);
	x = Math.min(Math.max(x, display.x), display.x + display.width - PANEL_W);
	return {
		x,
		y
	};
}
/** 创建并显示散热面板。center 传 null（球不存在）时放弃——面板只是辅助 UI。 */
function showCoolingOverlay(center) {
	if (panelWindow && !panelWindow.isDestroyed()) {
		if (closeTimer) {
			clearTimeout(closeTimer);
			closeTimer = null;
		}
		if (lastPayload) sendToPanel(lastPayload);
		return;
	}
	if (!center) return;
	const origin = panelOrigin(center);
	panelWindow = new electron.BrowserWindow({
		x: origin.x,
		y: origin.y,
		width: PANEL_W,
		height: PANEL_H,
		frame: false,
		transparent: true,
		resizable: false,
		movable: false,
		alwaysOnTop: true,
		skipTaskbar: true,
		hasShadow: false,
		focusable: false,
		show: false,
		webPreferences: {
			nodeIntegration: true,
			contextIsolation: false
		}
	});
	panelWindow.setAlwaysOnTop(true, "screen-saver");
	panelWindow.setVisibleOnAllWorkspaces(true);
	panelWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(buildPanelHtml())}`);
	panelWindow.once("ready-to-show", () => {
		panelWindow?.show();
		if (lastPayload) sendToPanel(lastPayload);
	});
	panelWindow.on("closed", () => {
		panelWindow = null;
	});
}
/** 散热中拖动悬浮球时跟随：按新球心重算面板位置（窗口存在才有意义）。 */
function repositionCoolingOverlay(center) {
	if (!panelWindow || panelWindow.isDestroyed() || !center) return;
	const origin = panelOrigin(center);
	try {
		panelWindow.setBounds({
			x: origin.x,
			y: origin.y,
			width: PANEL_W,
			height: PANEL_H
		});
	} catch {}
}
/** 推送状态到面板。文案与数值格式化在主进程/面板 JS 各自完成，面板只做 dumb 渲染。 */
function updateCoolingOverlay(s) {
	const leversText = s.levers.fan ? t("ball.cooling.fanOn") : s.levers.power ? t("ball.cooling.powerOnly") : t("ball.cooling.monitoring");
	const doneText = s.tempBefore !== null && s.tempAfter !== null ? t("ball.cooling.done", {
		before: s.tempBefore,
		after: s.tempAfter
	}) : t("ball.cooling.doneNoTemp");
	const u = s.usage;
	lastPayload = {
		phase: s.phase,
		remainSec: s.remainSec,
		tempC: s.tempC,
		usage: {
			cpu: u.cpu,
			gpu: u.gpu,
			disk: u.disk,
			mem: u.mem
		},
		leversText,
		doneText,
		tempUnknownText: t("ball.cooling.tempUnknown")
	};
	if (!panelWindow || panelWindow.isDestroyed()) return;
	if (s.phase === "done") {
		sendToPanel(lastPayload);
		if (closeTimer) clearTimeout(closeTimer);
		closeTimer = setTimeout(() => {
			closeTimer = null;
			hideCoolingOverlay();
		}, RESULT_SHOW_MS);
	} else {
		if (closeTimer) {
			clearTimeout(closeTimer);
			closeTimer = null;
		}
		sendToPanel(lastPayload);
	}
}
/** 散热中再次右键的轻提示：面板抖一下（面板不存在时静默——如球刚被隐藏的场景）。 */
function shakeCoolingOverlay() {
	if (!panelWindow || panelWindow.isDestroyed()) return;
	try {
		panelWindow.webContents.executeJavaScript(`if(window.shake) shake()`).catch(() => {});
	} catch {}
}
/** 销毁面板（before-quit / 结果展示到期时调用）。 */
function hideCoolingOverlay() {
	if (closeTimer) {
		clearTimeout(closeTimer);
		closeTimer = null;
	}
	lastPayload = null;
	if (panelWindow && !panelWindow.isDestroyed()) {
		const win = panelWindow;
		panelWindow = null;
		win.destroy();
	}
}
function sendToPanel(payload) {
	if (!panelWindow || panelWindow.isDestroyed()) return;
	try {
		panelWindow.webContents.send("cooling-update", payload);
	} catch {}
}
function buildPanelHtml() {
	return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
*{margin:0;padding:0;box-sizing:border-box;user-select:none}
html,body{width:100%;height:100%;background:transparent;overflow:clip;
  font-family:'Segoe UI',system-ui,sans-serif}
/* 浅色卡片与悬浮球花瓣同系（白底蓝调），冷色光呼应"散热"；紧凑三行布局 */
#card{width:100%;height:100%;border-radius:12px;
  background:linear-gradient(160deg,#ffffff,#eaf3ff);
  border:1px solid rgba(150,190,255,0.45);
  box-shadow:0 3px 14px rgba(40,80,160,0.16);
  display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;
  padding:7px 12px}
#top{display:flex;align-items:baseline;gap:10px}
#big{font-size:21px;font-weight:700;color:#3d6fd6;line-height:1;
  font-variant-numeric:tabular-nums}
#temp{font-size:12px;font-weight:600;color:#4a5568}
/* 占用率四列横排：标签上、数值下，一行放下 CPU/GPU/磁盘/内存 */
#stats{display:flex;justify-content:space-between;width:100%}
.st{display:flex;flex-direction:column;align-items:center;flex:1;gap:0}
.st .lb{font-size:9px;font-weight:600;color:#8b97ad;line-height:1.25}
.st .vl{font-size:12px;font-weight:700;color:#3a4156;line-height:1.25;
  font-variant-numeric:tabular-nums}
#lever{font-size:9.5px;font-weight:600;color:#6b7a99;line-height:1.2}
body.done #big{color:#2fa36b}
body.done #stats{visibility:hidden}
body.shake #card{animation:shake .45s ease}
@keyframes shake{
  0%,100%{transform:translateX(0)}
  20%{transform:translateX(-5px)}
  40%{transform:translateX(5px)}
  60%{transform:translateX(-3px)}
  80%{transform:translateX(3px)}
}
</style>
</head>
<body>
<div id="card">
  <div id="top"><span id="big">--</span><span id="temp"></span></div>
  <div id="stats">
    <div class="st"><span class="lb">CPU</span><span class="vl" id="cpu">--</span></div>
    <div class="st"><span class="lb">GPU</span><span class="vl" id="gpu">--</span></div>
    <div class="st"><span class="lb">${t("ball.cooling.disk")}</span><span class="vl" id="disk">--</span></div>
    <div class="st"><span class="lb">${t("ball.cooling.mem")}</span><span class="vl" id="mem">--</span></div>
  </div>
  <div id="lever"></div>
</div>
<script>
const {ipcRenderer} = require('electron')

function fmtTemp(c){ return (c === null || c === undefined) ? null : (Math.round(c*10)/10) + '\\u00b0C' }
function fmtPct(v){ return (v === null || v === undefined) ? '--' : v + '%' }

ipcRenderer.on('cooling-update', function(_e, p){
  var big = document.getElementById('big')
  var temp = document.getElementById('temp')
  var lever = document.getElementById('lever')
  if(p.phase === 'done'){
    document.body.classList.add('done')
    big.textContent = '\\u2713'
    temp.textContent = p.doneText
    lever.textContent = ''
  } else {
    document.body.classList.remove('done')
    big.textContent = p.remainSec + 's'
    var c = fmtTemp(p.tempC)
    temp.textContent = (c === null) ? p.tempUnknownText : c
    lever.textContent = p.leversText
  }
  var u = p.usage || {}
  document.getElementById('cpu').textContent = fmtPct(u.cpu)
  document.getElementById('gpu').textContent = fmtPct(u.gpu)
  document.getElementById('disk').textContent = fmtPct(u.disk)
  document.getElementById('mem').textContent = fmtPct(u.mem)
})

// 散热中再次右键：轻提示抖动（主进程经 executeJavaScript 调用）
function shake(){
  document.body.classList.add('shake')
  setTimeout(function(){ document.body.classList.remove('shake') }, 500)
}
<\/script>
</body>
</html>`;
}
//#endregion
//#region electron/main/floating-ball.ts
init_logger();
init_i18n();
var floatingBallWindow = null;
var ballPos = null;
/** 拖拽起点的绝对基准 */
var dragOrigin = null;
var BALL_SIZE = 66;
var RING_SIZE = 240;
var BALL_POS_FILE = "floating-ball-pos.json";
function ballPosFilePath() {
	return (0, node_path.join)(electron.app.isPackaged ? electron.app.getPath("userData") : (0, node_path.join)(__dirname, "..", ".."), BALL_POS_FILE);
}
function loadBallPosition() {
	try {
		const data = node_fs.default.readFileSync(ballPosFilePath(), "utf-8");
		const pos = JSON.parse(data);
		if (typeof pos.x === "number" && typeof pos.y === "number") return pos;
	} catch {}
	return null;
}
function saveBallPosition(pos) {
	try {
		node_fs.default.writeFileSync(ballPosFilePath(), JSON.stringify(pos), "utf-8");
	} catch {}
}
/** 带防御的 setBounds：任一坐标/尺寸非有限数（NaN/Infinity）时丢弃本次调整，
*  避免竞态下偶发的坏数值让 BrowserWindow.setBounds 抛 conversion failure 崩主进程。
*  最外层 try/catch 是最后防线：ESRCH/越界等非有限之外的转换错误也被吞掉，
*  不让任何一次高频 setBounds 把主进程打死。 */
function setBallBounds(b) {
	if (!floatingBallWindow || floatingBallWindow.isDestroyed()) return;
	if (!Number.isFinite(b.x) || !Number.isFinite(b.y) || !Number.isFinite(b.width) || !Number.isFinite(b.height)) {
		logger_default.warn("Floating ball setBounds skipped (non-finite):", b);
		return;
	}
	try {
		floatingBallWindow.setBounds(b);
	} catch (e) {
		logger_default.warn("Floating ball setBounds failed (swallowed):", e?.message ?? e, b);
	}
}
var BALL_SETTINGS_FILE = "floating-ball-settings.json";
/** 环形菜单目录（key 与 FloatingBallSettings.menuItems 对应），构建 HTML 时按可见性过滤。
*  labelKey 指向 i18n 词条（ball.menu.<key>），构建时按当前语言解析——不能在此评估 label，
*  模块加载发生在 setI18nLocale(启动) 之前，这里求值会拿到旧语言 */
var MENU_CATALOG = [
	{
		key: "record",
		labelKey: "ball.menu.record",
		icon: "●",
		action: "record"
	},
	{
		key: "ai",
		labelKey: "ball.menu.ai",
		icon: "✦",
		action: "ai"
	},
	{
		key: "todo",
		labelKey: "ball.menu.todo",
		icon: "☑",
		action: "todo"
	},
	{
		key: "settings",
		labelKey: "ball.menu.settings",
		icon: "⚙",
		action: "settings"
	}
];
var BALL_MENU_KEYS = MENU_CATALOG.map((m) => m.key);
var DEFAULT_MENU_ITEMS = {
	record: true,
	ai: true,
	todo: true,
	settings: true
};
var DEFAULT_SETTINGS = {
	visible: true,
	alwaysOnTop: true,
	openAtLogin: false,
	locale: "zh",
	snapGutter: 0,
	menuItems: { ...DEFAULT_MENU_ITEMS }
};
var cachedSettings = null;
function ballSettingsFilePath() {
	return (0, node_path.join)(electron.app.isPackaged ? electron.app.getPath("userData") : (0, node_path.join)(__dirname, "..", ".."), BALL_SETTINGS_FILE);
}
function loadBallSettings() {
	try {
		const data = node_fs.default.readFileSync(ballSettingsFilePath(), "utf-8");
		const parsed = JSON.parse(data);
		const menuItems = { ...DEFAULT_MENU_ITEMS };
		for (const k of BALL_MENU_KEYS) if (typeof parsed?.menuItems?.[k] === "boolean") menuItems[k] = parsed.menuItems[k];
		return {
			visible: typeof parsed.visible === "boolean" ? parsed.visible : DEFAULT_SETTINGS.visible,
			alwaysOnTop: typeof parsed.alwaysOnTop === "boolean" ? parsed.alwaysOnTop : DEFAULT_SETTINGS.alwaysOnTop,
			openAtLogin: typeof parsed.openAtLogin === "boolean" ? parsed.openAtLogin : DEFAULT_SETTINGS.openAtLogin,
			locale: isLocale(parsed.locale) ? parsed.locale : DEFAULT_SETTINGS.locale,
			snapGutter: typeof parsed.snapGutter === "number" && parsed.snapGutter >= 0 && parsed.snapGutter <= 80 ? parsed.snapGutter : DEFAULT_SETTINGS.snapGutter,
			menuItems
		};
	} catch {}
	return { ...DEFAULT_SETTINGS };
}
function saveBallSettings(settings) {
	try {
		node_fs.default.writeFileSync(ballSettingsFilePath(), JSON.stringify(settings), "utf-8");
	} catch {}
}
/** 读取设置（带模块级缓存，避免每次 show 都重读磁盘） */
function getBallSettings() {
	if (cachedSettings) return cachedSettings;
	cachedSettings = loadBallSettings();
	return cachedSettings;
}
/** 主进程内部唯一变更入口：合并→save→刷新缓存→返回新值。locale 变更时同步 i18n 进程内缓存 */
function updateBallSettings(patch) {
	const next = {
		...getBallSettings(),
		...patch
	};
	if (patch.locale !== void 0) setI18nLocale(next.locale);
	saveBallSettings(next);
	cachedSettings = next;
	return next;
}
/** 当前应显示的菜单项（按 menuItems 设置过滤目录）；label 在此按当前语言动态解析。
*  构建悬浮球 HTML 时内联为页内 ITEMS */
function getVisibleMenuItems() {
	const s = getBallSettings();
	return MENU_CATALOG.filter((m) => s.menuItems[m.key]).map((m) => ({
		...m,
		label: t(m.labelKey)
	}));
}
/** 悬浮球菜单项变更后重建窗口内容：花瓣形制嵌入 HTML，须重新走 buildFloatingBallHtml 生成新 HTML
*  （webContents.reload() 只会重载旧的 data URL，带不上新菜单），再 loadURL 替换当前内容 */
function reloadFloatingBall() {
	clearSnap();
	if (floatingBallWindow && !floatingBallWindow.isDestroyed()) floatingBallWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(buildFloatingBallHtml())}`).catch(() => {});
}
/** 清空位置缓存 + 删 pos 文件，下次 show 回屏幕中心 */
function clearBallPosition() {
	ballPos = null;
	try {
		node_fs.default.unlinkSync(ballPosFilePath());
	} catch {}
}
/** 仅在设置允许时才显示悬浮球（启动时按持久化的 visible 决定） */
function showFloatingBallIfVisible() {
	if (getBallSettings().visible) showFloatingBall();
}
/** 活动窗口即时切换置顶层级；隐藏态下次 show 自然从缓存读 */
function setFloatingBallAlwaysOnTop(value) {
	if (floatingBallWindow && !floatingBallWindow.isDestroyed()) floatingBallWindow.setAlwaysOnTop(value, "screen-saver");
}
/** 向悬浮球右上角推送待办气泡（count 数量 / flash 到期闪烁 / visible 显隐开关）。
*  窗口不存在或已销毁时静默。由 todo-badge.ts 在数据变更后调用。 */
function applyFloatingBallBadge(count, flash, visible) {
	if (!floatingBallWindow || floatingBallWindow.isDestroyed()) return;
	floatingBallWindow.webContents.executeJavaScript(`if(window.updateBadge) updateBadge(${Number(count) || 0}, ${!!flash}, ${!!visible})`).catch(() => {});
}
/** 球心屏幕坐标（散热面板定位用）：由窗口几何反推，与 move 事件的中心逻辑同源。
*  球不存在/已销毁返回 null（面板据此放弃创建）。 */
function getBallCenterForOverlay() {
	if (!floatingBallWindow || floatingBallWindow.isDestroyed()) return null;
	const [wx, wy] = floatingBallWindow.getPosition();
	const [ww, wh] = floatingBallWindow.getSize();
	return {
		x: Math.round(wx + ww / 2),
		y: Math.round(wy + wh / 2)
	};
}
/** 悬浮球散热动画开关：body.cooling class → 弧形菜单逆时针旋转（时长=散热时长）+
*  圆圈冷光静止（内联 JS 提供 setCoolingVisual）。经 executeJavaScript 调用，
*  与 applyFloatingBallBadge 同模式。 */
function setFloatingBallCoolingVisual(on) {
	if (!floatingBallWindow || floatingBallWindow.isDestroyed()) return;
	floatingBallWindow.webContents.executeJavaScript(`if(window.setCoolingVisual) setCoolingVisual(${!!on}, ${getCoolingDurationSec()})`).catch(() => {});
}
/** 把设置作用到活动悬浮球（visible 切换显隐，alwaysOnTop 切层级） */
function applyFloatingBallSettings(s) {
	if (s.visible) showFloatingBall();
	else hideFloatingBall();
	setFloatingBallAlwaysOnTop(s.alwaysOnTop);
}
function showFloatingBall() {
	if (floatingBallWindow && !floatingBallWindow.isDestroyed()) {
		floatingBallWindow.show();
		floatingBallWindow.focus();
		return;
	}
	if (!ballPos) {
		const cached = loadBallPosition();
		if (cached) ballPos = cached;
		else {
			const display = electron.screen.getPrimaryDisplay().bounds;
			ballPos = {
				x: Math.round(display.x + (display.width - BALL_SIZE) / 2),
				y: Math.round(display.y + (display.height - BALL_SIZE) / 2)
			};
		}
	}
	floatingBallWindow = new electron.BrowserWindow({
		x: ballPos.x,
		y: ballPos.y,
		width: BALL_SIZE,
		height: BALL_SIZE,
		frame: false,
		transparent: true,
		backgroundColor: "#00000000",
		resizable: false,
		alwaysOnTop: getBallSettings().alwaysOnTop,
		skipTaskbar: true,
		hasShadow: false,
		show: false,
		webPreferences: {
			nodeIntegration: true,
			contextIsolation: false
		}
	});
	floatingBallWindow.setVisibleOnAllWorkspaces(true);
	floatingBallWindow.setAlwaysOnTop(getBallSettings().alwaysOnTop, "screen-saver");
	const html = buildFloatingBallHtml();
	floatingBallWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
	floatingBallWindow.once("ready-to-show", () => {
		floatingBallWindow?.show();
		restoreSnapIfNeeded();
		if (floatingBallWindow && !floatingBallWindow.isDestroyed()) floatingBallWindow.webContents.executeJavaScript("ensureMenu()").catch(() => {});
	});
	const self = floatingBallWindow;
	floatingBallWindow.on("closed", () => {
		if (floatingBallWindow === self) floatingBallWindow = null;
	});
	floatingBallWindow.on("move", () => {
		if (!floatingBallWindow || floatingBallWindow.isDestroyed()) return;
		const [wx, wy] = floatingBallWindow.getPosition();
		const [ww, wh] = floatingBallWindow.getSize();
		ballPos = {
			x: Math.round(wx + ww / 2 - BALL_SIZE / 2),
			y: Math.round(wy + wh / 2 - BALL_SIZE / 2)
		};
		if (isCoolingActive()) repositionCoolingOverlay(getBallCenterForOverlay());
	});
	floatingBallWindow.on("close", () => {
		if (ballPos) saveBallPosition(ballPos);
	});
	floatingBallWindow.on("blur", () => {
		if (isCoolingActive()) return;
		if (isBallExpanded) collapseBall();
	});
	logger_default.info("Floating ball shown");
}
function hideFloatingBall() {
	if (floatingBallWindow && !floatingBallWindow.isDestroyed()) {
		const [wx, wy] = floatingBallWindow.getPosition();
		const [ww, wh] = floatingBallWindow.getSize();
		ballPos = {
			x: Math.round(wx + ww / 2 - BALL_SIZE / 2),
			y: Math.round(wy + wh / 2 - BALL_SIZE / 2)
		};
		saveBallPosition(ballPos);
		const win = floatingBallWindow;
		floatingBallWindow = null;
		win.destroy();
		logger_default.info("Floating ball hidden");
	}
}
/** 主进程侧跟踪展开态，供失焦等场景判断是否需要收起 */
var isBallExpanded = false;
/** 待定的收起收尾定时器：快速连点时，新的 expand 应取消它，避免中途缩窗/清 DOM 造成抖动 */
var collapseTimer = null;
/** 展开前冻结的 66 球左上角锚点：收起/立即收起用它定位。
*  展开期间 move 事件会用 240 窗口 + 系统缩放抖动反推出一个 ±1px 的 ballPos，
*  若收起直接读 ballPos 收缩，会沿贴边方向漂移（restoreSnapIfNeeded 只修正贴边轴）。
*  展开只清了视觉未动位置，收起应回到展开前的真实锚点，故冻结之。 */
var collapseAnchor = null;
async function expandBall() {
	if (!floatingBallWindow || floatingBallWindow.isDestroyed()) return;
	clearSnapVisualOnly();
	if (collapseTimer) {
		clearTimeout(collapseTimer);
		collapseTimer = null;
	}
	const [x, y] = floatingBallWindow.getPosition();
	const bx = ballPos ? ballPos.x : x;
	const by = ballPos ? ballPos.y : y;
	collapseAnchor = {
		x: bx,
		y: by
	};
	const cx = Math.round(bx + BALL_SIZE / 2);
	const cy = Math.round(by + BALL_SIZE / 2);
	logger_default.info("[Ball] expand at", [x, y], "center", [cx, cy]);
	const [w] = floatingBallWindow.getSize();
	const needResize = w !== RING_SIZE;
	if (needResize) {
		floatingBallWindow.setOpacity(0);
		setBallBounds({
			x: cx - RING_SIZE / 2,
			y: cy - RING_SIZE / 2,
			width: RING_SIZE,
			height: RING_SIZE
		});
	}
	try {
		await floatingBallWindow.webContents.executeJavaScript(`restartBloom(); void 0;`);
	} catch {}
	if (!floatingBallWindow || floatingBallWindow.isDestroyed()) return;
	if (needResize) {
		try {
			await floatingBallWindow.capturePage();
		} catch {}
		if (!floatingBallWindow || floatingBallWindow.isDestroyed()) return;
		floatingBallWindow.setOpacity(1);
	}
	isBallExpanded = true;
	floatingBallWindow.webContents.send("ball-state", "expanded");
}
async function collapseBall() {
	isBallExpanded = false;
	if (!floatingBallWindow || floatingBallWindow.isDestroyed()) return;
	if (!collapseAnchor) {
		if (!ballPos) {
			const [x, y] = floatingBallWindow.getPosition();
			ballPos = {
				x: Math.round(x + RING_SIZE / 2 - BALL_SIZE / 2),
				y: Math.round(y + RING_SIZE / 2 - BALL_SIZE / 2)
			};
		}
		collapseAnchor = {
			x: ballPos.x,
			y: ballPos.y
		};
	}
	const bx = collapseAnchor.x;
	const by = collapseAnchor.y;
	logger_default.info("[Ball] collapse at", [bx, by]);
	try {
		await floatingBallWindow.webContents.executeJavaScript(`document.body.classList.remove('expanded'); isExpanded=false; void 0;`);
	} catch {}
	if (!floatingBallWindow || floatingBallWindow.isDestroyed()) return;
	if (collapseTimer) clearTimeout(collapseTimer);
	collapseTimer = setTimeout(() => {
		collapseTimer = null;
		if (!floatingBallWindow || floatingBallWindow.isDestroyed()) return;
		if (isBallExpanded) return;
		try {
			floatingBallWindow.webContents.executeJavaScript(`var s=document.getElementById('ringSvg');while(s.firstChild){s.removeChild(s.firstChild)} menuCreated=false; void 0;`);
		} catch {}
		if (!floatingBallWindow || floatingBallWindow.isDestroyed()) return;
		floatingBallWindow.setOpacity(0);
		setBallBounds({
			x: bx,
			y: by,
			width: BALL_SIZE,
			height: BALL_SIZE
		});
		floatingBallWindow.setOpacity(1);
		restoreSnapIfNeeded();
	}, 920);
}
/** 立即收起成 66 报纸球（非动画版收起）：从 240 展开态同帧缩成 66，用于"展开态起拖/贴屏"。
*  与 collapseBall 的 920ms 动画收起不同，这里不播花开/合拢、立即缩窗并清 DOM，
*  以免拖动锚点/贴屏判定用 240 几何造成错乱。若正在动画收起则取消其收尾定时器。 */
function collapseToBallImmediate() {
	if (!floatingBallWindow || floatingBallWindow.isDestroyed()) return;
	isBallExpanded = false;
	let bx, by;
	if (collapseAnchor) {
		bx = collapseAnchor.x;
		by = collapseAnchor.y;
	} else if (ballPos) {
		bx = ballPos.x;
		by = ballPos.y;
	} else {
		const [x, y] = floatingBallWindow.getPosition();
		bx = Math.round(x + RING_SIZE / 2 - BALL_SIZE / 2);
		by = Math.round(y + RING_SIZE / 2 - BALL_SIZE / 2);
	}
	try {
		floatingBallWindow.webContents.executeJavaScript(`document.body.classList.remove('expanded'); document.body.classList.remove('no-anim'); isExpanded=false; var s=document.getElementById('ringSvg'); if(s){while(s.firstChild){s.removeChild(s.firstChild)}} menuCreated=false; void 0;`).catch(() => {});
	} catch {}
	if (collapseTimer) {
		clearTimeout(collapseTimer);
		collapseTimer = null;
	}
	floatingBallWindow.setOpacity(0);
	setBallBounds({
		x: bx,
		y: by,
		width: BALL_SIZE,
		height: BALL_SIZE
	});
	floatingBallWindow.setOpacity(1);
}
function forwardAction(action) {
	if (action === "record") process.emit("clawd-show-record-window");
	else if (action === "ai") process.emit("clawd-show-ai-window");
	else if (action === "todo") process.emit("clawd-show-todo-window");
	else if (action === "settings") process.emit("clawd-show-settings-window");
	else {
		const mainWindow = electron.BrowserWindow.getAllWindows().find((w) => !w.isDestroyed() && w !== floatingBallWindow);
		if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send("on-floating-ball-action", action);
	}
	collapseBall();
}
function buildFloatingBallHtml() {
	return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
*{margin:0;padding:0;box-sizing:border-box;user-select:none}
html,body{
  width:100%;height:100%;overflow:clip;
  font-family:'Segoe UI',system-ui,sans-serif;
  background:transparent;
}
html::-webkit-scrollbar, body::-webkit-scrollbar{display:none}
body{
  display:flex;align-items:center;justify-content:center;
}

/* 容器 */
#ball{
  position:relative;
  width:66px;height:66px;
  display:flex;align-items:center;justify-content:center;
}
body.expanded #ball{
  width:240px;height:240px;
}

/* SVG ring - positioning only, visibility on individual arcs */
.ring-svg{
  position:absolute;
  width:240px;height:240px;
  pointer-events:none;
}
body.expanded .ring-svg{
  pointer-events:none;
}

/* arc segments - bloom from center like flower petals */
/* 不透明实色卡片，偏蓝点缀（无红），花瓣无缝铺满（无缝隙），无描边无阴影（阴影由 .arc-shadow 叠出） */
/* 展开像开花：每片从花心放大 + 一个由 --swing 决定的小角度摆动，配合错落时序逐片绽放，
   弹性 eased 轻微过冲；收起时反向缩回 */
.arc-item{
  fill:url(#cardGrad);
  stroke:none;
  cursor:pointer;
  pointer-events:none;
  opacity:0;
  transform:scale(0) rotate(var(--swing,0deg));
  transform-origin:120px 120px;
  transition:
    transform 0.5s cubic-bezier(0.34,1.56,0.64,1),
    opacity 0.3s ease,
    fill 0.2s ease;
}
body.expanded .arc-item{
  opacity:1;
  transform:scale(1) rotate(0deg);
  pointer-events:auto;
}
.arc-item:hover{
  fill:url(#cardGradHover);
}

/* 连点时的干净重置：仅在 no-anim 时禁用过渡，让花瓣瞬间回到闭合态以便下次完整重开。
   用类而非改 inline transition，保住每片各自的 inline transition-delay（逐片开花的错落感） */
body.no-anim .arc-item,
body.no-anim .arc-shadow,
body.no-anim .arc-label{
  transition:none !important;
}

/* 每片花瓣的阴影：画在最上层（花瓣→阴影→文字），阴影沿圆周顺时针旋转并配合遮罩
   只露出"压在顺时针相邻花瓣上" 的一侧 ⇒ 每片仅一侧有影，一片压一片均匀堆叠 */
.arc-shadow{
  fill:rgba(40,50,80,0.32);
  stroke:none;
  filter:blur(2px);
  pointer-events:none;
  opacity:0;
  transform:scale(0) rotate(var(--swing,0deg));
  transform-origin:120px 120px;
  transition:
    transform 0.5s cubic-bezier(0.34,1.56,0.64,1),
    opacity 0.3s ease;
}
body.expanded .arc-shadow{
  opacity:1;
  transform:scale(1) rotate(0deg);
}

/* arc labels - also pop from center */
.arc-label{
  pointer-events:none;
  text-anchor:middle;
  dominant-baseline:central;
  font-family:'Segoe UI',system-ui,sans-serif;
  opacity:0;
  transform:scale(0);
  transform-origin:120px 120px;
  transition:
    transform 0.35s cubic-bezier(0.34,1.56,0.64,1),
    opacity 0.25s ease;
}
body.expanded .arc-label{
  opacity:1;
  transform:scale(1);
}
.arc-label .icon{font-size:15px;fill:#4a6cf7;font-weight:700;filter:drop-shadow(0 1px 0 rgba(255,255,255,0.55))}
.arc-label .label{font-size:9px;font-weight:600;fill:#3a4156;stroke:rgba(255,255,255,0.75);stroke-width:2px;paint-order:stroke}

/* 中心按钮 */
#trigger{
  position:absolute;z-index:10;
  left:5px;top:5px;                /* 显式居中(66窗内 56 居中) ⇒ 吸附时 left/top 可参与插值 */
  width:56px;height:56px;border-radius:50%;border:none;
  background:linear-gradient(90deg, #f2f4f8, #dfe3ea);  /* 浅渐变基底：与吸附侧渐变可插值，色相丝滑过渡 */
  cursor:pointer;
  display:flex;align-items:center;justify-content:center;
  /* 吸附过渡：几何(位置/尺寸/圆角)+色彩+光影 同一过渡 ⇒ 拖向边缘时球体被'磁吸'牵引拉伸、
     间隙渐消、最终弧面贴墙的丝滑变形(对比此前 DOM 一换即跳变)。 */
  transition:
    left .5s cubic-bezier(.34,1.3,.64,1),
    top .5s cubic-bezier(.34,1.3,.64,1),
    width .5s cubic-bezier(.34,1.3,.64,1),
    height .5s cubic-bezier(.34,1.3,.64,1),
    border-radius .5s ease,
    background .6s ease,
    box-shadow .6s ease,
    transform .2s ease;
}
#trigger:hover{transform:scale(1.08)}
.logo-img{
  width:40px;height:40px;
  border-radius:50%;
  object-fit:cover;
  pointer-events:none;
  /* 吸附时 logo 随之缩小，同步过渡避免骤变 */
  transition:width .5s ease, height .5s ease, border-radius .5s ease;
}
#trigger:active{transform:scale(0.95)}
/* 散热模式（右键触发）：中央圆圈保持不动（仅泛青蓝冷光示态），弧形菜单花瓣
   像风扇一样旋转——时间轴 5%/90%/5% 三段：前 5% 时间加速、中段 90% 匀速快转
   （2 圈/秒）、末 5% 减速；关键帧按时间百分比铺，线性分段（animation: linear），
   拖尾峰值 ≈720°/s。总转角 38 圈整=360°倍数，class 移除时无视觉跳变。
   旋转时长由主进程经 setCoolingVisual(on, sec) 传入（--spin-dur），与散热时长对齐。
   菜单收起时由主进程临时展开再转。 */
body.cooling #trigger{
  background:linear-gradient(135deg,#eaf7ff,#d2ecff);
  box-shadow:0 0 0 3px rgba(96,182,255,0.35),0 0 16px rgba(96,182,255,0.45);
}
body.cooling #trigger,body.cooling #trigger:hover{transform:none} /* 散热中圆圈纹丝不动（含悬停放大） */
body.cooling .ring-svg{animation:coolingMenuSpin var(--spin-dur,20s) linear 1 both}
@keyframes coolingMenuSpin{
  0%{transform:rotate(0deg)}
  2.5%{transform:rotate(-108deg)}    /* 缓起前半：速度爬升 30% */
  5%{transform:rotate(-360deg)}      /* 达到风扇速度 720°/s（2 圈/秒） */
  95%{transform:rotate(-13320deg)}   /* 90% 时间匀速快转（10800°/18s） */
  97.5%{transform:rotate(-13572deg)} /* 缓停前半 */
  100%{transform:rotate(-13680deg)}  /* 38 圈整收尾 */
}
body.cooling .arc-item{pointer-events:none !important} /* 旋转中的花瓣不可点击，防误触菜单动作 */
/* 水滴吸附（G5）：吸附后从 66px 圆球收缩成更小的半透明水滴。
   关键 = 贴边那侧 29px 大圆角圆润地"鼓出"到屏幕边缘（水滴粘结感，绝非直角），
   外侧两端全圆，整体变小、半透明、不太显眼。窗口仍保持 66px 透明窗（不 shrink），
   只把 trigger 绝对定位到对应边缘，避免牵动 setBounds/拖动/环形菜单几何。
   每边独立：贴哪边就把 trigger 推到那边，贴边侧大圆角鼓出，外侧两角全圆。 */
/* ─ 吸附于垂直边（左/右）：竖向水滴胶囊，贴边那侧 29px 圆头直接抵住屏幕边沿(0)，
   外侧两端 999 全圆。窗口仍保持 66px，仅把 trigger 推到对应边缘，胶囊圆头抵到屏幕边缘。 ─ */
body.snap-left #trigger{
  position:absolute;
  width:44px; height:58px;          /* 竖向胶囊，贴屏幕左缘 */
  left:0; top:4px;
  border-radius:29px 999px 999px 29px; /* 贴边(左)两端 29px 圆头抵缘，右缘两端全圆 */
  background:linear-gradient(90deg, rgba(244,248,255,0.96) 0%, rgba(230,233,242,0.92) 100%);
  opacity:1;
  /* 方向光影：左=贴边侧阴影变浅(贴近屏幕)，右=屏内保留悬浮高光 */
  box-shadow:-3px 0 8px rgba(0,0,0,0.10), 3px 0 6px rgba(0,0,0,0.05), inset 1px 0 5px rgba(255,255,255,0.5);
}
body.snap-right #trigger{
  position:absolute;
  width:44px; height:58px;
  left:22px; top:4px;               /* ← 22=66-44，显式左定位，盖掉 base 的 left:5px，右缘贴窗右缘无空隙 */
  border-radius:999px 29px 29px 999px; /* 镜像:贴边(右)两端 29px 圆头抵缘,左缘两端全圆 */
  background:linear-gradient(270deg, rgba(244,248,255,0.96) 0%, rgba(230,233,242,0.92) 100%);
  opacity:1;
  /* 右=贴边阴影变浅，左=屏内侧保留高光 */
  box-shadow:3px 0 8px rgba(0,0,0,0.10), -3px 0 6px rgba(0,0,0,0.05), inset -1px 0 5px rgba(255,255,255,0.5);
}
/* ─ 吸附水平边:横向水滴胶囊,贴边侧圆头抵缘,外侧两端全圆 ─ */
body.snap-top #trigger{
  position:absolute;
  width:58px; height:44px;
  left:4px; top:0;
  border-radius:29px 29px 999px 999px; /* 贴边(上)两圆头抵缘,下缘两端全圆 */
  background:linear-gradient(180deg, rgba(244,248,255,0.96) 0%, rgba(230,233,242,0.92) 100%);
  opacity:1;
  /* 上=贴边阴影变浅，下=屏内侧保留高光 */
  box-shadow:0 -3px 8px rgba(0,0,0,0.10), 0 3px 6px rgba(0,0,0,0.05), inset 0 1px 5px rgba(255,255,255,0.5);
}
body.snap-bottom #trigger{
  position:absolute;
  width:58px; height:44px;
  left:4px; top:22px;               /* ← 22=66-44，显式顶定位，盖掉 base 的 top:5px，下缘贴窗缘无空隙 */
  border-radius:999px 999px 29px 29px; /* 贴边(下)两圆头抵缘,上缘两端全圆 */
  background:linear-gradient(0deg, rgba(244,248,255,0.96) 0%, rgba(230,233,242,0.92) 100%);
  opacity:1;
  /* 下=贴边阴影变浅，上=屏内侧保留高光 */
  box-shadow:0 3px 8px rgba(0,0,0,0.10), 0 -3px 6px rgba(0,0,0,0.05), inset 0 -1px 5px rgba(255,255,255,0.5);
}
/* 吸附时 logo 随之缩小、降低存在感 */
body.snap-left .logo-img, body.snap-right .logo-img,
body.snap-top .logo-img, body.snap-bottom .logo-img{
  width:26px; height:26px; border-radius:13px; object-fit:cover;
}
body.snap-bottom #trigger:hover, body.snap-top #trigger:hover,
body.snap-left #trigger:hover, body.snap-right #trigger:hover{ transform:none; }

/* 恒 66px 的球心容器：trigger 与气泡都锚在这，展开（#ball 变 240）时仍贴球心不动 */
.core{
  position:relative;width:66px;height:66px;flex:0 0 auto;
  display:flex;align-items:center;justify-content:center;
  pointer-events:none; /* 只让真正的 trigger 接收点击 */
}
.core #trigger{pointer-events:auto}

/* 待办数量气泡：悬浮球右上角红色数字胶囊；flash 时呼吸闪烁提醒到期 */
#ballBadge{
  position:absolute;top:0;right:0;z-index:20;
  min-width:15px;height:15px;padding:0 3px;
  border-radius:999px;
  background:#4e5cd4;color:#fff;
  font-size:9px;font-weight:700;line-height:15px;text-align:center;
  display:none;align-items:center;justify-content:center;
  box-shadow:0 1px 3px rgba(0,0,0,0.35);
}
#ballBadge.flash{animation:badgeFlash 1s ease-in-out infinite}
@keyframes badgeFlash{
  0%,100%{opacity:1;transform:scale(1)}
  50%{opacity:0.35;transform:scale(0.8)}
}
body.expanded #ballBadge{display:none} /* 展开态让出花瓣，避免遮挡菜单 */

/* ─ 吸附时待办气泡贴住水滴外侧上角(远离贴边那一侧)── base 的 top:0/right:0 在贴左/贴下时
   会脱离移位后的水滴，需随吸附方向把气泡挪到水滴的外侧上角。 ─ */
body.snap-left #ballBadge{ top:2px; right:20px; }   /* 水滴贴左缘(左0..44)，气泡贴其外侧(右)上角 */
body.snap-right #ballBadge{ top:2px; right:0; }     /* 水滴贴右缘，气泡贴其外侧(右)上角=窗外右上 */
body.snap-top #ballBadge{ top:0; right:6px; }       /* 水滴贴顶缘，气泡贴其外侧(下/右)角 */
body.snap-bottom #ballBadge{ top:24px; right:4px; } /* 水滴贴下缘(下/右缩)，气泡贴其外侧(上)角逐上 */

</style>
</head>
<body>
<div id="ball">
  <svg class="ring-svg" id="ringSvg" viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg">
    <!-- 圆弧段用 JS 动态创建 -->
  </svg>
  <div class="core">
    <button id="trigger">
      <img id="logoImg" class="logo-img" src="${getLogoDataUrl(48)}" alt="logo" />
    </button>
    <!-- 待办数量气泡：悬浮球右上角红色数字胶囊。放在恒 66px 的 .core 内（始终贴球心居中），
         锚点是球而非随展开放大的容器 ⇒ 展开菜单时不偏移；top/right=0 落在窗口内，不会被裁切 -->
    <span id="ballBadge"></span>
  </div>
</div>

<script>
const {ipcRenderer} = require('electron')

const ITEMS = ${JSON.stringify(getVisibleMenuItems())};

let isExpanded = false
let menuCreated = false

// === 待办数量气泡 ===
// 主进程通过 applyFloatingBallBadge 用 executeJavaScript 调用；页面加载完成时主动
// 上报 'floating-ball-badge-ready'，让主进程立刻补推一次（保证每次重建 DOM 后计数正确）。
function updateBadge(count, flash, visible){
  var el = document.getElementById('ballBadge')
  if(!el) return
  el.textContent = count > 99 ? '99+' : String(count)
  el.style.display = (visible && count > 0) ? 'flex' : 'none'
  el.classList.toggle('flash', !!flash)
}
ipcRenderer.send('floating-ball-badge-ready')

// === 散热模式视觉开关：主进程经 executeJavaScript 调用（同 updateBadge 模式） ===
// sec = 旋转总时长（秒），与散热时长对齐；花瓣缓→快→缓转 10 圈整。
function setCoolingVisual(on, sec){
  document.body.classList.toggle('cooling', !!on)
  if(on) document.body.style.setProperty('--spin-dur', (sec || 20) + 's')
}

// 生成圆弧路径（四分之一圆环）
function arcPath(cx, cy, r1, r2, sa, ea){
  const sr = sa*Math.PI/180, er = ea*Math.PI/180
  const x1i=cx+r1*Math.cos(sr), y1i=cy+r1*Math.sin(sr)
  const x1o=cx+r2*Math.cos(sr), y1o=cy+r2*Math.sin(sr)
  const x2o=cx+r2*Math.cos(er), y2o=cy+r2*Math.sin(er)
  const x2i=cx+r1*Math.cos(er), y2i=cy+r1*Math.sin(er)
  const laf=(ea-sa)>180?1:0
  return 'M'+x1i+','+y1i+' L'+x1o+','+y1o+' A'+r2+','+r2+' 0 '+laf+',1 '+x2o+','+y2o+' L'+x2i+','+y2i+' A'+r1+','+r1+' 0 '+laf+',0 '+x1i+','+y1i+' Z'
}

// 单菜单专用：整圈 360° 时 arcPath 的圆弧起点==终点，SVG 单段弧会退化而整片不渲染。
// 改为两段 180° 弧拼外圈 + 两段 180° 弧拼内圈，配合调用处 fill-rule=evenodd 镂空出内孔成圆环。
function fullRingPath(cx, cy, r1, r2){
  return 'M'+(cx+r2)+','+cy+
    ' A'+r2+','+r2+' 0 1,1 '+(cx-r2)+','+cy+
    ' A'+r2+','+r2+' 0 1,1 '+(cx+r2)+','+cy+' Z'+
    ' M'+(cx+r1)+','+cy+
    ' A'+r1+','+r1+' 0 1,1 '+(cx-r1)+','+cy+
    ' A'+r1+','+r1+' 0 1,1 '+(cx+r1)+','+cy+' Z'
}

// 构造线性渐变（卡片高光/悬停色）
function makeGradient(id, c1, c2){
  const g = document.createElementNS('http://www.w3.org/2000/svg','linearGradient')
  g.setAttribute('id',id)
  g.setAttribute('x1','20%'); g.setAttribute('y1','0%')
  g.setAttribute('x2','80%'); g.setAttribute('y2','100%')
  ;[['0%',c1],['100%',c2]].forEach(function(p){
    const s = document.createElementNS('http://www.w3.org/2000/svg','stop')
    s.setAttribute('offset',p[0]); s.setAttribute('stop-color',p[1])
    g.appendChild(s)
  })
  return g
}

function ensureMenu(){
  if(menuCreated) return
  menuCreated = true
  const svg = document.getElementById('ringSvg')
  const cx=120, cy=120, r1=34, r2=75
  const total = ITEMS.length
  const segArc = 360 / total
  const startOff = -90 - segArc / 2
  // 无缝铺满：每个花瓣占满自己的 120° 槽位，相邻共用径向边，无缝隙
  // 阴影沿顺时针旋转的角度：用圆周方向而非屏幕 X 方向，保证每片影都一致落在自己顺时针的相邻片上
  const SHADOW_ROT = 4

  // 实色卡片渐变（每次重建，避免 collapse 清空 SVG 后残留空引用）
  const defs = document.createElementNS('http://www.w3.org/2000/svg','defs')
  defs.appendChild(makeGradient('cardGrad', '#ffffff', '#f2f4f9'))
  defs.appendChild(makeGradient('cardGradHover', '#eef1ff', '#dbe2ff'))
  svg.appendChild(defs)

  // 第一遍：无缝花瓣本体
  ITEMS.forEach(function(item, i){
    const sa = startOff + i * segArc
    const ea = sa + segArc
    // 单菜单(整圈360°)用完整圆环路径，否则 arcPath 圆弧退化不渲染
    const d = total === 1 ? fullRingPath(cx, cy, r1, r2) : arcPath(cx, cy, r1, r2, sa, ea)
    const path = document.createElementNS('http://www.w3.org/2000/svg','path')
    path.setAttribute('class','arc-item')
    path.setAttribute('d',d)
    if(total === 1) path.setAttribute('fill-rule','evenodd') // 镂空圆环内孔
    path.setAttribute('data-action',item.action)
    path.style.transitionDelay = (i*0.10)+'s'
    path.style.setProperty('--swing', ((i%2?-1:1) * (6 + i)) + 'deg') // 错落的角度摆动，模拟花瓣散开
    path.addEventListener('click',function(){
      ipcRenderer.send('floating-ball-action', this.getAttribute('data-action'))
    })
    svg.appendChild(path)
  })

  // 第二遍：每片阴影，画在全部花瓣之上（单菜单无相邻花瓣，无需投影）。
  // 每片用自己的遮罩裁掉"本瓣自身"区域；阴影沿顺时针旋转 SHADOW_ROT，只露出落在
  // 相邻顺时针花瓣左沿的一侧影 ⇒ 每片仅一侧有影，且一片压一片均匀堆叠（方位一致）。
  if(total > 1) ITEMS.forEach(function(item, i){
    const NS = 'http://www.w3.org/2000/svg'
    const sa = startOff + i * segArc
    const ea = sa + segArc
    const dOwn = arcPath(cx, cy, r1, r2, sa, ea)

    const maskId = 'shadowMask' + i
    const mask = document.createElementNS(NS,'mask')
    mask.setAttribute('id', maskId)
    const mRect = document.createElementNS(NS,'rect')
    mRect.setAttribute('x','0'); mRect.setAttribute('y','0')
    mRect.setAttribute('width','240'); mRect.setAttribute('height','240')
    mRect.setAttribute('fill','#fff')
    const mCut = document.createElementNS(NS,'path')
    mCut.setAttribute('d', dOwn)
    mCut.setAttribute('fill','#000')
    mask.appendChild(mRect)
    mask.appendChild(mCut)
    defs.appendChild(mask)

    const sh = document.createElementNS(NS,'path')
    sh.setAttribute('class','arc-shadow')
    sh.setAttribute('d', arcPath(cx, cy, r1, r2, sa + SHADOW_ROT, ea + SHADOW_ROT)) // 整片顺时针转 4°
    sh.setAttribute('mask','url(#'+maskId+')')
    sh.style.transitionDelay = (i*0.10)+'s'
    sh.style.setProperty('--swing', ((i%2?-1:1) * (6 + i)) + 'deg') // 与所属花瓣保持一致的开花摆动
    svg.appendChild(sh)
  })

  // 第三遍：文字，置于最上层保证清晰
  ITEMS.forEach(function(item, i){
    const sa = startOff + i * segArc
    const ea = sa + segArc
    const ma = (sa+ea)/2
    const mr = (r1+r2)/2
    const lx = cx + mr*Math.cos(ma*Math.PI/180)
    const ly = cy + mr*Math.sin(ma*Math.PI/180)
    const txt = document.createElementNS('http://www.w3.org/2000/svg','text')
    txt.setAttribute('class','arc-label')
    txt.setAttribute('x',lx)
    txt.setAttribute('y',ly)
    txt.style.transitionDelay = (i*0.10+0.08)+'s'
    const iconSpan = document.createElementNS('http://www.w3.org/2000/svg','tspan')
    iconSpan.setAttribute('class','icon')
    iconSpan.setAttribute('x',lx)
    iconSpan.setAttribute('dy','-7')
    iconSpan.textContent = item.icon
    const labelSpan = document.createElementNS('http://www.w3.org/2000/svg','tspan')
    labelSpan.setAttribute('class','label')
    labelSpan.setAttribute('x',lx)
    labelSpan.setAttribute('dy','14')
    labelSpan.textContent = item.label
    txt.appendChild(iconSpan)
    txt.appendChild(labelSpan)
    svg.appendChild(txt)
  })
}

// 干净地重新开花：先（no-anim 下瞬时）回到闭合态 scale(0)，再启用过渡并切到 expanded。
// 快速连点时旧过渡会在中间态被打断，若不重置花瓣会"卡在中间"；每次都从闭合态完整重开。
// 用 no-anim 类而非改 inline transition，因此每片各自的 transition-delay（逐片开花的错落感）不受影响。
function restartBloom(){
  var svg = document.getElementById('ringSvg')
  document.body.classList.remove('expanded')
  document.body.classList.add('no-anim')
  ensureMenu() // 在闭合态下创建/补齐花瓣（若此前 DOM 已被清空），使其一律从 scale(0) 开始绽放；
               // 若在 expanded 之后才创建，新花瓣会直接从 scale(1) 出现、看不到开花效果
  void svg.getBoundingClientRect() // ① 重排：no-anim 下闭合态 scale(0) 立即生效
  document.body.classList.remove('no-anim')
  void svg.getBoundingClientRect() // ② 再重排：让浏览器"看到"已启用过渡、但仍处于闭合态——保证下一步一定触发过渡
  document.body.classList.add('expanded')
  isExpanded = true
}

// === 手动拖拽 ===
let dsX = 0, dsY = 0, dragging = false

trigger.addEventListener('pointerdown', function(e){
  if(e.button !== 0) return  // 仅左键参与拖拽/展开；右键归散热(contextmenu)，中键不响应
  dsX = e.screenX; dsY = e.screenY
  dragging = false
  trigger.setPointerCapture(e.pointerId)
  ipcRenderer.send('floating-ball-drag-start', e.screenX, e.screenY)
})

// 右键中央圆圈 = 散热模式入口（10 秒尽力降温，见 cooling.ts）
trigger.addEventListener('contextmenu', function(e){
  e.preventDefault()
  ipcRenderer.send('floating-ball-cooling')
})

trigger.addEventListener('pointermove', function(e){
  if(e.buttons !== 1) return
  if(!dragging){
    if(Math.abs(e.screenX - dsX) <= 4 && Math.abs(e.screenY - dsY) <= 4) return
    dragging = true
    // 真正开始拖动（位移超过阈值）才脱离吸附——区别于 pointerdown 时仅点击/展开菜单。
    // 若在 drag-start 里清吸附，点击 trigger 展开菜单也会被误清成普通圆球。
    ipcRenderer.send('floating-ball-drag-clear', e.screenX, e.screenY)
  }
  ipcRenderer.send('floating-ball-move', e.screenX, e.screenY)
})

trigger.addEventListener('pointerup', function(e){
  if(e.button !== 0) return  // 只有左键释放才切换展开/收起（右键/中键的释放曾误触发 toggle）
  if(document.body.classList.contains('cooling')){
    // 散热中：拖拽照常收尾（面板跟随依赖 move 事件），但不切换展开/收起——转完按原状态复位
    if(dragging){ dragging = false; ipcRenderer.send('floating-ball-drag-end') }
    return
  }
  trigger.releasePointerCapture(e.pointerId)
  if(dragging){
    ipcRenderer.send('floating-ball-drag-end')
    dragging = false
    return
  }
  if(isExpanded){
    isExpanded = false
    ipcRenderer.send('floating-ball-collapse')
  } else {
    isExpanded = true
    ipcRenderer.send('floating-ball-expand')
  }
})

ipcRenderer.on('ball-state',function(_event,state){
  if(state==='expanded'){
    // expandBall 已通过 executeJavaScript 触发 restartBloom；这里仅兜底同步，避免重复重开导致二次闪烁
    if(!document.body.classList.contains('expanded')) restartBloom()
  } else {
    document.body.classList.remove('expanded')
    var svg = document.getElementById('ringSvg')
    while(svg.firstChild){ svg.removeChild(svg.firstChild) }
    menuCreated = false
    isExpanded=false
  }
})
// 屏幕边缘水滴吸附：主进程松手贴边后广播吸附边，切圆角贴合视觉；null = 未吸附
ipcRenderer.on('ball-snap',function(_event,side){
  document.body.classList.remove('snap-left','snap-right','snap-top','snap-bottom')
  if(side) document.body.classList.add('snap-'+side)
})

// === 点击外部收起 ===
// 展开态下，只有点到中心按钮(#trigger)或菜单花瓣(.arc-item)才算"点在悬浮球/菜单上"；
// 点到窗口内任何透明区域（圆内空隙、四角、环外）都被视为"点到外部"，即收起菜单。
document.addEventListener('click',function(e){
  if(!isExpanded) return
  if(document.body.classList.contains('cooling')) return // 散热中：外部点击不收起（转完按原状态复位）
  if(e.target.closest('#trigger') || e.target.closest('.arc-item')) return
  ipcRenderer.send('floating-ball-collapse')
})
<\/script>
</body>
</html>`;
}
var snappedSide = null;
var snapTimer = null;
/** 通知渲染层悬浮球吸附边（null = 未吸附），由内联 script 切换 body.snap-* class 触发水滴形状。 */
function sendSnapVisual(side) {
	if (!floatingBallWindow || floatingBallWindow.isDestroyed()) return;
	try {
		floatingBallWindow.webContents.send("ball-snap", side);
	} catch {}
}
/** 检测窗口当前左上角 (x,y) 尺寸 (w,h) 是否贴在所属显示器某边缘（吸附阈值内）。
* 与吸附判定复用同一套几何 ⇒ 吸附落点与恢复判定一致。角上只判最近边，返回该边或 null。 */
function detectEdgeSnap(x, y, w, h) {
	const b = electron.screen.getDisplayMatching({
		x,
		y,
		width: w,
		height: h
	}).bounds;
	const gutter = getBallSettings().snapGutter;
	const SNAP = 40;
	const dl = Math.abs(x - (b.x + gutter));
	const dr = Math.abs(b.x + b.width - gutter - (x + w));
	const dt = Math.abs(y - (b.y + gutter));
	const db = Math.abs(b.y + b.height - gutter - (y + h));
	let best = null;
	let bestD = Number.MAX_VALUE;
	if (dl < SNAP && dl < bestD) {
		bestD = dl;
		best = "left";
	}
	if (dr < SNAP && dr < bestD) {
		bestD = dr;
		best = "right";
	}
	if (dt < SNAP && dt < bestD) {
		bestD = dt;
		best = "top";
	}
	if (db < SNAP && db < bestD) {
		bestD = db;
		best = "bottom";
	}
	return best;
}
/** 恢复吸附态：show 启动、收起、重置后调用。优先用内存里保存的 snappedSide（展开只清了视觉、
*  未动位置）把球直接钉回对应屏幕边缘并重发水滴视觉；无保存边时才回退到位置重判。
*  窗口已在终点、无需动画。目标坐标复用 drag-end 的贴边几何。 */
function snapTargetFor(side, x, y, w, h) {
	const b = electron.screen.getDisplayMatching({
		x,
		y,
		width: w,
		height: h
	}).bounds;
	const gutter = getBallSettings().snapGutter;
	if (side === "left") return {
		x: b.x + gutter,
		y
	};
	if (side === "right") return {
		x: b.x + b.width - gutter - w,
		y
	};
	if (side === "top") return {
		x,
		y: b.y + gutter
	};
	return {
		x,
		y: b.y + b.height - gutter - h
	};
}
function restoreSnapIfNeeded() {
	if (!floatingBallWindow || floatingBallWindow.isDestroyed()) return;
	const [x, y] = floatingBallWindow.getPosition();
	const [w, h] = floatingBallWindow.getSize();
	let side = snappedSide;
	if (!side) side = detectEdgeSnap(x, y, w, h);
	if (side) {
		const t = snapTargetFor(side, x, y, w, h);
		setBallBounds({
			x: t.x,
			y: t.y,
			width: BALL_SIZE,
			height: BALL_SIZE
		});
		if (ballPos) {
			ballPos = {
				x: t.x,
				y: t.y
			};
			saveBallPosition(ballPos);
		}
		snappedSide = side;
		sendSnapVisual(side);
		logger_default.info("Floating ball snap restored (edge):", [t.x, t.y], side);
	}
}
/** 弹性 out 缓动：末尾轻微过冲回弹，模拟水滴/弹簧贴边手感（参考 easeOutBack 微调）。 */
function elasticOut(t) {
	if (t <= 0) return 0;
	if (t >= 1) return 1;
	const c4 = 2 * Math.PI / 3;
	return Math.pow(2, -10 * t) * Math.sin((t * 10 - .75) * c4) + 1;
}
/** 从当前 (x,y) 弹性动画贴到目标边；落稳后读回修正 DWM 1px 偏移、记录吸附边并持久化位置。
*  防御：起点/目标任一处出现非有限数，直接放弃吸附（不启动高频 setBounds 动画），
*  避免竞态坏值把主进程打死（参考 a8d8389 的 NaN 防御 + setBallBounds 兜底）。 */
function animateSnapToEdge(x, y, to, side) {
	if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(to.x) || !Number.isFinite(to.y)) {
		logger_default.warn("Floating ball snap skipped (non-finite input):", {
			x,
			y,
			to
		});
		return;
	}
	if (snapTimer) {
		clearInterval(snapTimer);
		snapTimer = null;
	}
	const DUR = 420;
	const start = Date.now();
	const step = () => {
		if (!floatingBallWindow || floatingBallWindow.isDestroyed()) {
			if (snapTimer) {
				clearInterval(snapTimer);
				snapTimer = null;
			}
			return;
		}
		const t = Math.min(1, (Date.now() - start) / DUR);
		const e = elasticOut(t);
		setBallBounds({
			x: Math.round(x + (to.x - x) * e),
			y: Math.round(y + (to.y - y) * e),
			width: BALL_SIZE,
			height: BALL_SIZE
		});
		if (t >= 1) {
			if (snapTimer) {
				clearInterval(snapTimer);
				snapTimer = null;
			}
			const [ax, ay] = floatingBallWindow.getPosition();
			if (ax !== to.x || ay !== to.y) setBallBounds({
				x: to.x,
				y: to.y,
				width: BALL_SIZE,
				height: BALL_SIZE
			});
			snappedSide = side;
			sendSnapVisual(side);
			if (ballPos) {
				ballPos = {
					x: to.x,
					y: to.y
				};
				saveBallPosition(ballPos);
			}
			logger_default.info("Floating ball snapped (elastic) to edge:", [to.x, to.y], side);
		}
	};
	snapTimer = setInterval(step, 16);
}
/** 清除吸附态（拖动开始/隐藏时）：停动画、清边标记、收圆角。 */
function clearSnap() {
	if (snapTimer) {
		clearInterval(snapTimer);
		snapTimer = null;
	}
	if (snappedSide) {
		snappedSide = null;
		sendSnapVisual(null);
	}
}
/** 仅清除吸附*视觉*（渲染层移除 body.snap-* 让菜单正常开花），但保留内存里的 snappedSide。
*  展开菜单需要球变回普通圆球以显示 240 圆环，但展开并未改变贴边位置——保留吸附边，
*  收起时即可按已保存的边恢复水滴，避免依赖易被 DWM/缩放微调打偏的"位置重判"（否则偶发失效变圆球）。 */
function clearSnapVisualOnly() {
	if (snapTimer) {
		clearInterval(snapTimer);
		snapTimer = null;
	}
	if (snappedSide) sendSnapVisual(null);
}
function registerFloatingBallHandlers() {
	electron.ipcMain.handle("show-floating-ball", () => {
		showFloatingBall();
	});
	electron.ipcMain.handle("hide-floating-ball", () => {
		hideFloatingBall();
	});
	electron.ipcMain.handle("toggle-floating-ball", () => {
		hideFloatingBall();
	});
	electron.ipcMain.on("floating-ball-expand", () => {
		expandBall();
	});
	electron.ipcMain.on("floating-ball-collapse", () => {
		collapseBall();
	});
	electron.ipcMain.on("floating-ball-action", (_event, action) => {
		logger_default.info("Floating ball action:", action);
		forwardAction(action);
	});
	let coolingOriginExpanded = false;
	electron.ipcMain.on("floating-ball-cooling", () => {
		logger_default.info("Floating ball cooling requested");
		if (startCooling((s) => {
			updateCoolingOverlay(s);
			if (s.phase === "done") {
				setFloatingBallCoolingVisual(false);
				if (!coolingOriginExpanded && isBallExpanded) collapseBall();
			}
		})) {
			coolingOriginExpanded = isBallExpanded;
			if (!isBallExpanded) expandBall();
			setFloatingBallCoolingVisual(true);
			showCoolingOverlay(getBallCenterForOverlay());
		} else shakeCoolingOverlay();
	});
	let dragSize = null;
	electron.ipcMain.on("floating-ball-drag-start", (_event, sx, sy) => {
		if (!floatingBallWindow || floatingBallWindow.isDestroyed()) return;
		const [wx, wy] = floatingBallWindow.getPosition();
		const [ww, wh] = floatingBallWindow.getSize();
		dragOrigin = {
			winX: wx,
			winY: wy,
			scrX: sx,
			scrY: sy
		};
		dragSize = {
			w: ww,
			h: wh
		};
	});
	electron.ipcMain.on("floating-ball-drag-clear", (_event, sx, sy) => {
		if (!floatingBallWindow || floatingBallWindow.isDestroyed()) return;
		if (isBallExpanded && !isCoolingActive()) collapseToBallImmediate();
		clearSnap();
		if (!floatingBallWindow || floatingBallWindow.isDestroyed()) return;
		const [wx, wy] = floatingBallWindow.getPosition();
		const [ww, wh] = floatingBallWindow.getSize();
		dragOrigin = {
			winX: wx,
			winY: wy,
			scrX: sx,
			scrY: sy
		};
		dragSize = {
			w: ww,
			h: wh
		};
	});
	electron.ipcMain.on("floating-ball-move", (_event, sx, sy) => {
		if (!floatingBallWindow || floatingBallWindow.isDestroyed() || !dragOrigin || !dragSize) return;
		if (!Number.isFinite(sx) || !Number.isFinite(sy)) return;
		const dx = sx - dragOrigin.scrX;
		const dy = sy - dragOrigin.scrY;
		const nx = Math.round(dragOrigin.winX + dx);
		const ny = Math.round(dragOrigin.winY + dy);
		setBallBounds({
			x: nx,
			y: ny,
			width: dragSize.w,
			height: dragSize.h
		});
		const [ax, ay] = floatingBallWindow.getPosition();
		if (ax !== nx || ay !== ny) setBallBounds({
			x: nx + (nx - ax),
			y: ny + (ny - ay),
			width: dragSize.w,
			height: dragSize.h
		});
	});
	electron.ipcMain.on("floating-ball-drag-end", () => {
		dragOrigin = null;
		dragSize = null;
		if (floatingBallWindow && !floatingBallWindow.isDestroyed()) {
			const [x, y] = floatingBallWindow.getPosition();
			const [w, h] = floatingBallWindow.getSize();
			const b = electron.screen.getDisplayMatching(floatingBallWindow.getBounds()).bounds;
			const gutter = getBallSettings().snapGutter;
			const SNAP = 40;
			const dl = Math.abs(x - (b.x + gutter));
			const dr = Math.abs(b.x + b.width - gutter - (x + w));
			const dt = Math.abs(y - (b.y + gutter));
			const db = Math.abs(b.y + b.height - gutter - (y + h));
			let best = null;
			let bestD = Number.MAX_VALUE;
			if (dl < SNAP && dl < bestD) {
				bestD = dl;
				best = "left";
			}
			if (dr < SNAP && dr < bestD) {
				bestD = dr;
				best = "right";
			}
			if (dt < SNAP && dt < bestD) {
				bestD = dt;
				best = "top";
			}
			if (db < SNAP && db < bestD) {
				bestD = db;
				best = "bottom";
			}
			if (best === "left") animateSnapToEdge(x, y, {
				x: b.x + gutter,
				y
			}, "left");
			else if (best === "right") animateSnapToEdge(x, y, {
				x: b.x + b.width - gutter - w,
				y
			}, "right");
			else if (best === "top") animateSnapToEdge(x, y, {
				x,
				y: b.y + gutter
			}, "top");
			else if (best === "bottom") animateSnapToEdge(x, y, {
				x,
				y: b.y + b.height - gutter - h
			}, "bottom");
		}
		if (ballPos) saveBallPosition(ballPos);
	});
	electron.ipcMain.handle("get-floating-ball-settings", () => getBallSettings());
	electron.ipcMain.handle("set-floating-ball-settings", (_event, patch) => {
		const prev = { ...getBallSettings() };
		const next = updateBallSettings(patch);
		applyFloatingBallSettings(next);
		if (patch.openAtLogin !== void 0) try {
			electron.app.setLoginItemSettings({ openAtLogin: patch.openAtLogin });
		} catch (e) {
			logger_default.error("setLoginItemSettings failed:", e);
		}
		if (patch.menuItems && JSON.stringify(prev.menuItems) !== JSON.stringify(next.menuItems)) reloadFloatingBall();
		if (patch.locale !== void 0 && prev.locale !== next.locale) {
			reloadFloatingBall();
			reloadAiIsland();
			const wins = electron.BrowserWindow.getAllWindows();
			for (const win of wins) if (!win.isDestroyed()) try {
				win.webContents.send("app-locale-changed", { locale: next.locale });
			} catch {}
			logger_default.info(`Floating ball locale changed: ${prev.locale} -> ${next.locale}`);
		}
		return next;
	});
	electron.ipcMain.handle("reset-floating-ball-position", () => {
		clearBallPosition();
		clearSnap();
		if (floatingBallWindow && !floatingBallWindow.isDestroyed()) {
			const display = electron.screen.getPrimaryDisplay().bounds;
			const nx = Math.round(display.x + (display.width - BALL_SIZE) / 2);
			const ny = Math.round(display.y + (display.height - BALL_SIZE) / 2);
			isBallExpanded = false;
			try {
				floatingBallWindow.webContents.executeJavaScript(`document.body.classList.remove('expanded'); var s=document.getElementById('ringSvg');if(s){while(s.firstChild){s.removeChild(s.firstChild)}} menuCreated=false; isExpanded=false; void 0;`).catch(() => {});
			} catch {}
			setBallBounds({
				x: nx,
				y: ny,
				width: BALL_SIZE,
				height: BALL_SIZE
			});
			ballPos = {
				x: nx,
				y: ny
			};
			const [ax, ay] = floatingBallWindow.getPosition();
			if (ax !== nx || ay !== ny) setBallBounds({
				x: nx + (nx - ax),
				y: ny + (ny - ay),
				width: BALL_SIZE,
				height: BALL_SIZE
			});
		}
	});
}
//#endregion
//#region electron/main/todo-store.ts
var import_tray = (/* @__PURE__ */ __commonJSMin(((exports, module) => {
	init_logger();
	var tray = null;
	function getTrayIcon() {
		const iconPath = electron.app.isPackaged ? (0, node_path.join)(process.resourcesPath, "logo.ico") : (0, node_path.join)(__dirname, "../../public/logo.ico");
		return electron.nativeImage.createFromPath(iconPath).resize({
			width: 16,
			height: 16
		});
	}
	function getBalloonIcon() {
		const iconPath = electron.app.isPackaged ? (0, node_path.join)(process.resourcesPath, "logo.png") : (0, node_path.join)(__dirname, "../../public/logo.png");
		if (iconPath) return electron.nativeImage.createFromPath(iconPath).resize({
			width: 64,
			height: 64,
			quality: "better"
		});
		return electron.nativeImage.createEmpty();
	}
	function createTray$1() {
		if (tray && !tray.isDestroyed()) return;
		tray = new electron.Tray(getTrayIcon());
		tray.setToolTip("MUERZHI");
		const contextMenu = electron.Menu.buildFromTemplate([
			{
				label: "显示设置窗口",
				click: () => {
					process.emit("clawd-show-settings-window");
				}
			},
			{ type: "separator" },
			{
				label: "退出",
				click: () => {
					const { app } = require("electron");
					app.quit();
				}
			}
		]);
		tray.setContextMenu(contextMenu);
		tray.on("click", () => {
			process.emit("clawd-show-settings-window");
		});
		logger_default.info("System tray created");
	}
	function showBalloon(title, content) {
		if (tray && !tray.isDestroyed()) {
			tray.displayBalloon({
				title,
				content,
				icon: getBalloonIcon()
			});
			logger_default.info("Tray balloon:", title, content);
		}
	}
	function destroyTray() {
		if (tray && !tray.isDestroyed()) {
			tray.destroy();
			tray = null;
		}
	}
	module.exports = {
		createTray: createTray$1,
		showBalloon,
		destroyTray
	};
})))();
var logger$1 = {
	info: () => {},
	warn: () => {},
	error: () => {}
};
var dataDirOverride = null;
var TODO_STORE_FILE = "todo-notes.json";
var TODO_SETTINGS_FILE = "todo-settings.json";
/** 数据根目录：单测注入覆盖；否则 electron userData。 */
function dataDir() {
	if (dataDirOverride) return dataDirOverride;
	const { app } = require("electron");
	return app.getPath("userData");
}
function todoFilePath() {
	return (0, node_path.join)(dataDir(), TODO_STORE_FILE);
}
function todoSettingsFilePath() {
	return (0, node_path.join)(dataDir(), TODO_SETTINGS_FILE);
}
/** 读取整份 store；文件缺失/损坏时回退空态（沿用 loadBallSettings 的容错模式）。
*  注意：每次返回**全新数组**，绝不复用同一个共享空数组引用——否则上层（如 createTodo）
*  unshift 直接改写共享状态，污染后续"空文件"读出的结果。 */
function readStore() {
	try {
		const data = node_fs.readFileSync(todoFilePath(), "utf-8");
		const parsed = JSON.parse(data);
		if (Array.isArray(parsed.items)) return {
			items: parsed.items.filter((it) => it && typeof it.id === "string"),
			meta: { schemaVersion: parsed.meta?.schemaVersion ?? 1 }
		};
	} catch {}
	return {
		items: [],
		meta: { schemaVersion: 1 }
	};
}
/** 读取全部条目的便捷封装（渲染层 / 统计常用）。 */
function loadItems() {
	return readStore().items;
}
/** 把整份 state 写盘（原子写：先写临时文件再 rename，降低写一半损坏概率）。 */
function saveState(state) {
	const path = todoFilePath();
	const tmp = path + ".tmp";
	try {
		node_fs.writeFileSync(tmp, JSON.stringify(state, null, 2), "utf-8");
		node_fs.renameSync(tmp, path);
	} catch (err) {
		try {
			node_fs.writeFileSync(path, JSON.stringify(state, null, 2), "utf-8");
		} catch (err2) {
			logger$1.error("todo store save failed:", err2?.message ?? err2);
		}
	}
}
/** 保存条目数组（便捷封装）。 */
function saveItems(items) {
	saveState({
		items,
		meta: { schemaVersion: 1 }
	});
}
/** 生成一条新待办并持久化，返回更新后的全量 items。 */
function createTodo(input) {
	const items = loadItems();
	const now = Date.now();
	const item = {
		id: (0, node_crypto.randomUUID)(),
		type: input.type,
		title: input.title ?? "",
		content: input.content ?? "",
		priority: input.priority ?? "medium",
		reminder: input.reminder ?? null,
		reminderFired: false,
		done: input.done ?? false,
		pinned: false,
		pinX: null,
		pinY: null,
		createdAt: now,
		updatedAt: now
	};
	items.unshift(item);
	saveItems(items);
	return items;
}
function patchItem(id, patch) {
	const items = loadItems();
	const it = items.find((x) => x.id === id);
	if (!it) return items;
	Object.assign(it, patch, { updatedAt: Date.now() });
	saveItems(items);
	return items;
}
/** 完成态默认不再贴屏：任意让 done 变 true 的改动都顺带取消贴屏（勾选完成/编辑改完成）。
*  备忘（type==='memo'）不支持完成态，不处理。 */
function ensureDoneUnpins(it) {
	if (it.type === "todo" && it.done) it.pinned = false;
}
/** 更新一条，返回更新后的全量 items。若提醒时间被改动，重置已触发标志，让新提醒能再次到期触发。 */
function updateTodo(id, patch) {
	const items = loadItems();
	const it = items.find((x) => x.id === id);
	if (!it) return items;
	if (patch.reminder !== void 0 && patch.reminder !== it.reminder) it.reminderFired = false;
	Object.assign(it, patch, { updatedAt: Date.now() });
	ensureDoneUnpins(it);
	saveItems(items);
	return items;
}
/** 删除一条，返回剩余全量 items。 */
function deleteTodo(id) {
	const items = loadItems().filter((x) => x.id !== id);
	saveItems(items);
	return items;
}
/** 切换完成态（仅 todo 语义：to-do 才可以勾选；memo 忽略置回 false）。 */
function toggleTodoDone(id) {
	const items = loadItems();
	const it = items.find((x) => x.id === id);
	if (!it) return items;
	if (it.type === "todo") {
		it.done = !it.done;
		it.updatedAt = Date.now();
		ensureDoneUnpins(it);
		saveItems(items);
	}
	return items;
}
/** 完成一条待办并取消贴屏（便签板 ✕ = 完成 + 摘下）。备忘不支持完成态；todo 才处理。 */
function completeTodo(id) {
	const items = loadItems();
	const it = items.find((x) => x.id === id);
	if (!it || it.type !== "todo") return items;
	it.done = true;
	it.pinned = false;
	it.updatedAt = Date.now();
	saveItems(items);
	return items;
}
/** 标记某条的提醒已触发（调度器调用），落库。 */
function markReminderFired(id) {
	return patchItem(id, { reminderFired: true });
}
/** 切换“贴屏”。新贴时可给初始位置（主进程按屏幕算好传入）；取消贴屏保留位置（再贴可复用）。 */
function togglePin(id, initial) {
	const items = loadItems();
	const it = items.find((x) => x.id === id);
	if (!it) return items;
	const nowPinned = !it.pinned;
	it.pinned = nowPinned;
	if (nowPinned && initial) {
		it.pinX = Math.round(initial.x);
		it.pinY = Math.round(initial.y);
	}
	if (nowPinned && it.type === "todo" && it.done) it.done = false;
	it.updatedAt = Date.now();
	saveItems(items);
	return items;
}
/** 待办数量气泡的计数口径：未完成的 type==='todo' 条数（done===false），memo 不计。 */
function incompleteTodoCount(items) {
	return items.filter((it) => it.type === "todo" && !it.done).length;
}
var DEFAULT_TODO_SETTINGS = {
	badgeVisible: true,
	windowAlwaysOnTop: true,
	stickyBoardPos: null
};
function loadTodoSettings() {
	try {
		const parsed = JSON.parse(node_fs.readFileSync(todoSettingsFilePath(), "utf-8"));
		return {
			badgeVisible: typeof parsed.badgeVisible === "boolean" ? parsed.badgeVisible : DEFAULT_TODO_SETTINGS.badgeVisible,
			windowAlwaysOnTop: typeof parsed.windowAlwaysOnTop === "boolean" ? parsed.windowAlwaysOnTop : DEFAULT_TODO_SETTINGS.windowAlwaysOnTop,
			stickyBoardPos: parsed.stickyBoardPos && typeof parsed.stickyBoardPos.x === "number" && typeof parsed.stickyBoardPos.y === "number" ? {
				x: parsed.stickyBoardPos.x,
				y: parsed.stickyBoardPos.y
			} : null
		};
	} catch {
		return { ...DEFAULT_TODO_SETTINGS };
	}
}
/** 合并更新设置并落盘，返回新值。 */
function updateTodoSettings(patch) {
	const next = {
		...loadTodoSettings(),
		...patch
	};
	try {
		node_fs.writeFileSync(todoSettingsFilePath(), JSON.stringify(next, null, 2), "utf-8");
	} catch (err) {
		logger$1.error("todo settings save failed:", err?.message ?? err);
	}
	return next;
}
//#endregion
//#region electron/main/todo-badge.ts
/** 是否有「已到期但用户尚未打开待办窗口查看」的提醒 → 气泡进入闪烁。 */
var flashPending = false;
/** 重算计数并推送到悬浮球（数据/设置/闪烁态变化后调用）。窗口不在则静默。 */
function refreshTodoBadge() {
	const count = incompleteTodoCount(loadItems());
	const visible = loadTodoSettings().badgeVisible;
	applyFloatingBallBadge(count, flashPending, visible);
}
/** 置到期闪烁态（true=有到期未确认；false=已确认/熄灭），并立刻重推。 */
function setTodoBadgeFlash(on) {
	flashPending = on;
	refreshTodoBadge();
}
/** 待办窗口被打开 / 到期项被查看后调用：熄灭闪烁。 */
function acknowledgeTodoBadgeFlash() {
	setTodoBadgeFlash(false);
}
/** 注册「悬浮球渲染层 DOM 就绪后请求补推计数」的 IPC 监听（挂在主进程 ipcMain 上）。 */
function registerTodoBadgeHandlers() {
	electron.ipcMain.on("floating-ball-badge-ready", () => {
		refreshTodoBadge();
	});
}
//#endregion
//#region electron/main/todo-window.ts
init_logger();
init_i18n();
var todoWindow = null;
function getIcon$1() {
	const iconPath = electron.app.isPackaged ? (0, node_path.join)(process.resourcesPath, "logo.ico") : (0, node_path.join)(__dirname, "..", "..", "public", "logo.ico");
	return electron.nativeImage.createFromPath(iconPath);
}
function showTodoWindow() {
	if (todoWindow && !todoWindow.isDestroyed()) {
		todoWindow.show();
		todoWindow.focus();
		acknowledgeTodoBadgeFlash();
		return;
	}
	const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
	const preloadPath = (0, node_path.join)(__dirname, "..", "preload", "index.cjs");
	todoWindow = new electron.BrowserWindow({
		icon: getIcon$1(),
		width: 525,
		height: 450,
		minWidth: 320,
		minHeight: 360,
		show: false,
		skipTaskbar: false,
		frame: false,
		titleBarStyle: "hidden",
		title: t("todo.stickyTitle"),
		backgroundColor: "#eaeaec",
		webPreferences: {
			preload: preloadPath,
			contextIsolation: true,
			nodeIntegration: false,
			sandbox: false
		}
	});
	todoWindow.on("page-title-updated", (e) => e.preventDefault());
	todoWindow.setAlwaysOnTop(loadTodoSettings().windowAlwaysOnTop, "normal");
	if (VITE_DEV_SERVER_URL) todoWindow.loadURL(`${VITE_DEV_SERVER_URL}#/todo?t=${Date.now()}`);
	else todoWindow.loadFile((0, node_path.join)(process.env.DIST, "index.html"), { hash: "/todo" });
	todoWindow.once("ready-to-show", () => {
		todoWindow?.show();
	});
	todoWindow.on("closed", () => {
		todoWindow = null;
	});
	acknowledgeTodoBadgeFlash();
	logger_default.info("Todo window shown");
}
function closeTodoWindow() {
	if (todoWindow && !todoWindow.isDestroyed()) todoWindow.close();
	todoWindow = null;
}
function isTodoWindowVisible() {
	return !!(todoWindow && !todoWindow.isDestroyed());
}
/** 切换待办窗口置顶并持久化，返回新值。 */
function toggleTodoWindowAlwaysOnTop() {
	const next = !loadTodoSettings().windowAlwaysOnTop;
	updateTodoSettings({ windowAlwaysOnTop: next });
	if (todoWindow && !todoWindow.isDestroyed()) todoWindow.setAlwaysOnTop(next, "normal");
	return next;
}
/** 打开待办窗口并定位到指定条（贴屏便签点击“打开待办”用）。 */
function focusTodoItem(id) {
	showTodoWindow();
	if (!todoWindow || todoWindow.isDestroyed()) return;
	const send = () => {
		if (todoWindow && !todoWindow.isDestroyed()) todoWindow.webContents.send("todo-focus-item", id);
	};
	if (todoWindow.webContents.isLoading()) todoWindow.webContents.once("did-finish-load", send);
	else send();
}
/** 把待办数据变更推给已打开的待办窗口（渲染层 store 订阅 todo-data-changed 刷新镜像）。
用于"主进程侧发起的更改"——比如便签板 ✕ 取消贴屏；渲染层自己发起时本就收到返回值，无需推送。 */
function broadcastTodoUpdate(items) {
	if (!todoWindow || todoWindow.isDestroyed()) return;
	const send = () => {
		if (todoWindow && !todoWindow.isDestroyed()) todoWindow.webContents.send("todo-data-changed", items);
	};
	if (todoWindow.webContents.isLoading()) todoWindow.webContents.once("did-finish-load", send);
	else send();
}
//#endregion
//#region electron/main/todo-reminder-window.ts
init_logger();
init_i18n();
var reminderWindow = null;
function buildReminderHtml(title, body) {
	const logo = getLogoDataUrl(32);
	return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
*{margin:0;padding:0;box-sizing:border-box;user-select:none}
html,body{width:100%;height:100%;overflow:hidden;background:transparent;font-family:'Segoe UI',system-ui,sans-serif}
.card{
  height:100%; border-radius:14px; background:#ffffff;
  border:1px solid #e3e4ea;
  display:flex; flex-direction:column; overflow:hidden;
}
/* 头部：仿待办窗口标题栏（logo + MUERZHI + 关闭按钮） */
.bar{
  height:30px; background:#f1f2f5; border-bottom:1px solid #e0e1e7;
  display:flex; align-items:center; padding:0 6px 0 10px; flex-shrink:0;
}
.brand{display:flex; align-items:center; gap:7px}
.logo{width:16px;height:16px;border-radius:4px;object-fit:cover;display:block}
.brand-txt{font-size:12px;color:#2a2a3a;letter-spacing:2px;font-weight:700}
.bar-right{margin-left:auto;display:flex;align-items:center;gap:6px}
.ring{font-size:10px;color:#f59e0b;animation:breathe 1.2s ease-in-out infinite}
@keyframes breathe{0%,100%{opacity:.5}50%{opacity:1}}
.close{width:26px;height:26px;border:none;border-radius:6px;background:transparent;color:#8a8a96;font-size:13px;cursor:pointer;display:flex;align-items:center;justify-content:center}
.close:hover{background:#4e5cd4;color:#fff}
/* 内容 */
.body{padding:10px 12px 12px;display:flex;flex-direction:column;flex:1;min-height:0}
.t{font-size:14px;font-weight:700;color:#1d1d1f;line-height:1.35;display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical;overflow:hidden}
.b{font-size:12px;color:#6e6e76;line-height:1.5;margin-top:4px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.foot{margin-top:auto;display:flex;justify-content:flex-end;padding-top:8px}
.open{border:none;border-radius:8px;background:#4e5cd4;color:#fff;font-size:11px;font-weight:600;padding:5px 12px;cursor:pointer}
.open:hover{background:#404db9}
</style></head><body><div class="card">
  <div class="bar">
    <div class="brand">${logo ? `<img class="logo" src="${logo}">` : "<div class=\"logo\">MU</div>"}<div class="brand-txt">MUERZHI</div></div>
    <div class="bar-right">
      <div class="ring">${t("todo.reminderRing")}</div>
      <button class="close" title="${t("common.close")}" onclick="ipc.send('todo-reminder-close')">✕</button>
    </div>
  </div>
  <div class="body">
    <div class="t">${escapeHtml(title) || t("todo.reminTitle")}</div>
    <div class="b">${escapeHtml(body) || t("todo.reminderBody")}</div>
    <div class="foot"><button class="open" onclick="ipc.send('todo-reminder-open')">${t("todo.openTodo")}</button></div>
  </div>
</div>
<script>
const {ipcRenderer} = require('electron')
window.ipc = ipcRenderer
<\/script></body></html>`;
}
function escapeHtml(s) {
	return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
var reminderQueue = [];
/** 入队一条提醒；同一时刻只弹一个，关闭后再弹下一条（多个同时到期不互相覆盖丢弃）。 */
function showTodoReminder(title, body) {
	reminderQueue.push({
		title,
		body
	});
	pump();
}
function pump() {
	if (reminderWindow && !reminderWindow.isDestroyed()) return;
	const next = reminderQueue.shift();
	if (!next) return;
	openPopup(next.title, next.body);
}
function openPopup(title, body) {
	const W = 300;
	const H = 150;
	const area = electron.screen.getPrimaryDisplay().workArea;
	reminderWindow = new electron.BrowserWindow({
		x: area.x + area.width - W - 16,
		y: area.y + area.height - H - 16,
		width: W,
		height: H,
		frame: false,
		transparent: true,
		backgroundColor: "#00000000",
		resizable: false,
		movable: false,
		alwaysOnTop: true,
		skipTaskbar: true,
		hasShadow: false,
		show: false,
		webPreferences: {
			nodeIntegration: true,
			contextIsolation: false
		}
	});
	reminderWindow.setAlwaysOnTop(true, "screen-saver");
	reminderWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(buildReminderHtml(title, body))}`);
	reminderWindow.once("ready-to-show", () => reminderWindow?.show());
	reminderWindow.on("closed", () => {
		reminderWindow = null;
		pump();
	});
	logger_default.info("Todo reminder popup shown");
}
function hideTodoReminder() {
	if (reminderWindow && !reminderWindow.isDestroyed()) reminderWindow.destroy();
}
/** 用户点了「打开待办」：清空未弹队列 + 关闭当前弹窗（打开窗口即视为已查看到期项）。 */
function clearTodoReminderQueue() {
	reminderQueue.length = 0;
	if (reminderWindow && !reminderWindow.isDestroyed()) reminderWindow.destroy();
	reminderWindow = null;
}
//#endregion
//#region electron/main/todo-text.ts
/** 去掉 HTML 标签与实体，返回纯文本。空/纯标签输入返回 ''。 */
function stripHtml(html) {
	if (!html) return "";
	return String(html).replace(/<img[^>]*alt=["']([^"']*)["'][^>]*>/gi, (_, alt) => alt || "[图]").replace(/<img[^>]*>/gi, "[图]").replace(/<br\s*\/?>/gi, " ").replace(/<\/(p|div|h[1-6]|li|blockquote)>/gi, " ").replace(/<[^>]+>/gi, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, "\"").replace(/&#39;/g, "'").replace(/\s+/g, " ").trim();
}
//#endregion
//#region electron/main/todo-sticky.ts
init_i18n();
var BOARD_W = 208;
var BOARD_H = 120;
var boardWindow = null;
var currentIndex = 0;
function pinnedNotes() {
	return loadItems().filter((i) => i.pinned).map((it) => {
		const txt = stripHtml(it.content).trim();
		const memoTitle = it.type === "memo" ? stripHtml(it.title).trim() : "";
		return {
			id: it.id,
			type: it.type,
			title: memoTitle || txt,
			body: memoTitle ? txt : "",
			done: it.done,
			priority: it.priority
		};
	});
}
function defaultBoardPos() {
	const area = electron.screen.getPrimaryDisplay().workArea;
	return {
		x: area.x + area.width - BOARD_W - 16,
		y: area.y + area.height - BOARD_H - 16
	};
}
function buildBoardHtml() {
	const logo = getLogoDataUrl(28);
	const I18N = JSON.stringify({
		noContent: t("todo.noContent"),
		open: t("todo.open"),
		unpin: t("todo.unpin")
	});
	return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
*{margin:0;padding:0;box-sizing:border-box;user-select:none}
html,body{width:100%;height:100%;overflow:hidden;background:transparent;font-family:'Segoe UI',system-ui,sans-serif}
.board{height:100%;background:#ffffff;border:1px solid #e3e4ea;border-radius:16px;display:flex;flex-direction:column;overflow:hidden}
.bar{height:26px;background:#f3f4f8;border-bottom:1px solid #e6e7ec;padding:0 3px 0 10px;display:flex;align-items:center;gap:7px;-webkit-app-region:drag;flex-shrink:0}
.logo{width:13px;height:13px;border-radius:3px;object-fit:cover}
.brand{font-size:10px;font-weight:800;color:#2a2a3a;letter-spacing:1.2px}
.counter{margin-left:auto;font-size:9px;color:#b6b7c1;font-variant-numeric:tabular-nums}
.close{width:22px;height:22px;border:none;border-radius:6px;background:transparent;color:#9a9aa6;font-size:12px;cursor:pointer;display:flex;align-items:center;justify-content:center;-webkit-app-region:no-drag}
.close:hover{background:#eef0f5;color:#1d1d1f}
/* 便签内容 */
.note{flex:1;min-height:0;display:flex;position:relative;cursor:pointer;-webkit-app-region:no-drag}
.accent{position:absolute;left:0;top:0;bottom:0;width:3px;background:#60a5fa}
.in{padding:7px 10px 4px 13px;display:flex;flex-direction:column;min-width:0;width:100%}
.t{font-size:12px;font-weight:700;color:#1d1d1f;line-height:1.3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.b{font-size:11px;color:#6e6e76;line-height:1.4;margin-top:2px;display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical;overflow:hidden}
/* 贴的是待办时：正文放 .t 里，允许多行换行（最多3行），省略时悬浮 title 看全文 */
.board.todo .t{white-space:normal;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;word-break:break-word}
/* 悬浮提示：悬浮被截断的行时，在便签卡内就地展示全文（原生 title 样式不可控，改用自绘气泡） */
.tip{position:absolute;top:4px;left:12px;right:6px;z-index:8;max-height:calc(100% - 8px);overflow:auto;padding:6px 8px;border-radius:8px;background:rgba(29,29,31,0.94);color:#fff;font-size:11px;line-height:1.5;white-space:normal;word-break:break-word;box-shadow:0 4px 12px rgba(0,0,0,0.25);opacity:0;pointer-events:none;transform:translateY(-3px);transition:opacity .15s ease,transform .15s ease}
/* 简洁细滚动条（tip 是 pointer-events:none 装饰层，滚动用 .note 的 wheel 事件转发） */
.tip::-webkit-scrollbar{width:3px}
.tip::-webkit-scrollbar-track{background:transparent}
.tip::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.28);border-radius:2px}
.tip::-webkit-scrollbar-thumb:hover{background:rgba(255,255,255,0.45)}
.note:hover .tip{opacity:1;transform:none}
.tip.none{display:none}
.open-hint{margin-top:auto;align-self:flex-end;font-size:8.5px;color:#c6c7d1}
.board.done .t{text-decoration:line-through;color:#9a9aa6}
.board.done .b{color:#a8a8b0}
/* 切换区 */
.foot{height:26px;display:flex;align-items:center;justify-content:center;gap:8px;padding:0 6px;flex-shrink:0;border-top:1px solid #f0f1f5}
.arw{width:20px;height:20px;border:none;border-radius:6px;background:transparent;color:#9a9aa6;font-size:12px;cursor:pointer;display:flex;align-items:center;justify-content:center}
.arw:hover{background:#f0f1f5;color:#1d1d1f}
.dots{display:flex;gap:4px;align-items:center}
.dot{width:4px;height:4px;border-radius:999px;background:#d5d7e0;cursor:pointer;transition:width .2s ease,background .2s ease}
.dot.on{width:14px;background:#4e5cd4}
</style></head><body><div class="board" id="board">
  <div class="bar">
    <img class="logo" src="${logo}">
    <div class="brand">MUERZHI</div>
    <div class="counter" id="counter"></div>
    <button class="close" title="${t("todo.unpin")}" onclick="act('unpin')">✕</button>
  </div>
  <div class="note" id="note" onclick="act('open')">
    <div class="accent" id="accent"></div>
    <div class="in">
      <div class="t" id="t"></div>
      <div class="b" id="b"></div>
      <div class="open-hint">${t("todo.open")}</div>
    </div>
    <div class="tip none" id="tip"></div>
  </div>
  <div class="foot">
    <button class="arw" id="prev" onclick="go(-1)">‹</button>
    <div class="dots" id="dots"></div>
    <button class="arw" id="next" onclick="go(1)">›</button>
  </div>
</div>
<script>
const I18N=${I18N};
const {ipcRenderer} = require('electron')
window.ipc = ipcRenderer
var NOTES=[], IDX=0, LAST=null
function act(a){ var n=NOTES[IDX]; if(n) ipc.send('todo-sticky-'+a, n.id) }
function go(d){ if(NOTES.length<2) return; IDX=(IDX+d+NOTES.length)%NOTES.length; draw() }
function isTrunc(el){ if(!el || el.style.display==='none') return false; return el.scrollWidth>el.clientWidth+1 || el.scrollHeight>el.clientHeight+1 }
/* 便签卡内全文提示：滚轮滚动（tip 是 pointer-events:none 的装饰层，滚轮落在 .note 上，转发给 tip） */
document.getElementById('note').addEventListener('wheel', function(e){
  var tip=document.getElementById('tip')
  if(!tip || tip.className.indexOf('none')>=0) return
  if(tip.scrollHeight > tip.clientHeight){
    tip.scrollTop += e.deltaY
    e.preventDefault()
  }
}, {passive:false})
function draw(){
  var n=NOTES[IDX]
  var board=document.getElementById('board'), t=document.getElementById('t'), b=document.getElementById('b'),
      accent=document.getElementById('accent'), dots=document.getElementById('dots'), counter=document.getElementById('counter')
  if(!n){ return }
  t.textContent = n.title || I18N.noContent
  if (n.body) { b.textContent = n.body; b.style.display = '' } else { b.style.display = 'none' }
  board.className = 'board' + (n.done?' done':'') + (n.type==='todo' ? ' todo':'')
  accent.style.background = {urgent:'#f97316',high:'#f59e0b',medium:'#60a5fa',low:'#b0b0b8'}[n.priority] || '#60a5fa'
  counter.textContent = NOTES.length>1 ? (IDX+1)+'/'+NOTES.length : ''
  // 圆点
  dots.innerHTML=''
  NOTES.forEach(function(x,i){
    var d=document.createElement('span'); d.className='dot'+(i===IDX?' on':''); d.onclick=function(){IDX=i;draw()}; dots.appendChild(d)
  })
  document.getElementById('prev').style.visibility = NOTES.length>1?'visible':'hidden'
  document.getElementById('next').style.visibility = NOTES.length>1?'visible':'hidden'
  // 悬浮提示：被截断的行（t 或 b）悬浮时就地展示全文
  var tip=document.getElementById('tip'), tipText=''
  if (isTrunc(t)) tipText = t.textContent
  else if (isTrunc(b)) tipText = b.textContent
  tip.textContent = tipText || ''
  tip.className = 'tip' + (tipText ? '' : ' none')
  LAST = (NOTES[IDX]||{}).id
}
function renderNotes(list, idx){
  NOTES=list||[]; IDX = 0
  // 尽量保持当前看的这条（按 id 定位），避免任意数据同步把轮播跳回第一张
  if (LAST !== null) { for (var i=0;i<NOTES.length;i++){ if(NOTES[i].id===LAST){ IDX=i; break } } }
  if (NOTES.length && (LAST===null || !NOTES.some(function(x){return x.id===LAST}))) IDX = Math.max(0, Math.min(idx||0, NOTES.length-1))
  draw()
}
<\/script></body></html>`;
}
function createBoard() {
	const pos = loadTodoSettings().stickyBoardPos ?? defaultBoardPos();
	boardWindow = new electron.BrowserWindow({
		x: pos.x,
		y: pos.y,
		width: BOARD_W,
		height: BOARD_H,
		frame: false,
		transparent: true,
		backgroundColor: "#00000000",
		resizable: false,
		alwaysOnTop: true,
		skipTaskbar: true,
		hasShadow: false,
		show: false,
		webPreferences: {
			nodeIntegration: true,
			contextIsolation: false
		}
	});
	boardWindow.setAlwaysOnTop(true, "screen-saver");
	boardWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(buildBoardHtml())}`);
	boardWindow.once("ready-to-show", () => {
		if (boardWindow && !boardWindow.isDestroyed()) {
			boardWindow.show();
			pushNotes();
		}
	});
	boardWindow.on("move", () => {
		if (!boardWindow || boardWindow.isDestroyed()) return;
		const [x, y] = boardWindow.getPosition();
		if (moveTimer) clearTimeout(moveTimer);
		moveTimer = setTimeout(() => {
			moveTimer = null;
			updateTodoSettings({ stickyBoardPos: {
				x,
				y
			} });
		}, 300);
	});
	boardWindow.on("closed", () => {
		boardWindow = null;
	});
}
var moveTimer = null;
/** 数据变更后调用：重建贴屏便签板（合并一个窗口，圆点/箭头切换）。 */
function syncStickyNotes() {
	const notes = pinnedNotes();
	if (notes.length === 0) {
		if (boardWindow && !boardWindow.isDestroyed()) boardWindow.destroy();
		boardWindow = null;
		return;
	}
	currentIndex = Math.max(0, Math.min(currentIndex, notes.length - 1));
	if (!boardWindow || boardWindow.isDestroyed()) createBoard();
	else pushNotes();
}
/** 把当前便签列表推进板窗口（窗口尚在加载时会吞掉，由 ready-to-show 补推）。 */
function pushNotes() {
	const notes = pinnedNotes();
	if (!boardWindow || boardWindow.isDestroyed()) return;
	boardWindow.webContents.executeJavaScript(`if(window.renderNotes) renderNotes(${JSON.stringify(notes)}, ${currentIndex})`).catch(() => {});
}
/** 退出前关闭便签板（before-quit 接线）：先清去抖定时器，避免 teardown 期间再写位置。 */
function closeAllStickyNotes() {
	if (moveTimer) {
		clearTimeout(moveTimer);
		moveTimer = null;
	}
	if (boardWindow && !boardWindow.isDestroyed()) boardWindow.destroy();
	boardWindow = null;
}
//#endregion
//#region electron/main/ipc-handlers.ts
init_logger();
var { updateAudioLevels } = require_region_selector();
function getRecordingsPath() {
	return (0, node_path.join)(electron.app.getPath("userData"), "recordings.json");
}
function registerIpcHandlers(agentBridge) {
	(0, import_region_selector.registerRegionSelectorHandlers)();
	registerFloatingBallHandlers();
	registerAiIslandHandlers();
	electron.ipcMain.handle("show-ai-island", () => {
		showAiIsland();
	});
	electron.ipcMain.handle("hide-ai-island", () => {
		hideAiIsland();
	});
	electron.ipcMain.handle("select-region", async () => {
		return (0, import_region_selector.selectRegion)();
	});
	electron.ipcMain.handle("get-sources", async (_event, types) => {
		return (await electron.desktopCapturer.getSources({
			types: types ?? ["screen", "window"],
			thumbnailSize: {
				width: 340,
				height: 200
			},
			fetchWindowIcons: true
		})).map((s) => ({
			id: s.id,
			name: s.name,
			display_id: s.display_id,
			appIcon: s.appIcon?.toDataURL() || null,
			thumbnail: s.thumbnail.toDataURL()
		}));
	});
	electron.ipcMain.handle("get-system-audio-sources", async () => {
		try {
			return (await electron.desktopCapturer.getSources({ types: ["audio"] })).map((s) => ({
				id: s.id,
				name: s.name
			}));
		} catch {
			return [];
		}
	});
	electron.ipcMain.handle("show-save-dialog", async (_event, options) => {
		const win = electron.BrowserWindow.getFocusedWindow();
		if (!win) return {
			canceled: true,
			filePath: null
		};
		return electron.dialog.showSaveDialog(win, {
			title: options?.title ?? "Save Recording",
			defaultPath: options?.defaultPath ?? `recording-${Date.now()}.webm`,
			filters: options?.filters ?? [
				{
					name: "WebM Video",
					extensions: ["webm"]
				},
				{
					name: "MP4 Video",
					extensions: ["mp4"]
				},
				{
					name: "GIF",
					extensions: ["gif"]
				}
			]
		});
	});
	electron.ipcMain.handle("show-open-dialog", async (_event, options) => {
		const win = electron.BrowserWindow.getFocusedWindow();
		if (!win) return {
			canceled: true,
			filePaths: []
		};
		return electron.dialog.showOpenDialog(win, {
			title: options?.title ?? "Select File",
			defaultPath: options?.defaultPath,
			filters: options?.filters ?? [{
				name: "Video Files",
				extensions: [
					"webm",
					"mp4",
					"gif"
				]
			}],
			properties: options?.properties
		});
	});
	electron.ipcMain.handle("get-default-save-dir", async () => {
		return electron.app.getPath("videos") || electron.app.getPath("desktop");
	});
	electron.ipcMain.handle("write-file", async (_event, data, filePath) => {
		try {
			await node_fs.default.promises.mkdir((0, node_path.dirname)(filePath), { recursive: true });
			await node_fs.default.promises.writeFile(filePath, data);
			logger_default.info("保存文件", filePath);
			return {
				success: true,
				filePath
			};
		} catch (err) {
			logger_default.error("保存文件失败", filePath, err.message);
			return {
				success: false,
				filePath,
				error: err.message
			};
		}
	});
	electron.ipcMain.handle("read-file", async (_event, filePath) => {
		try {
			return (await node_fs.default.promises.readFile(filePath)).buffer;
		} catch (err) {
			throw new Error(`Failed to read file: ${err.message}`);
		}
	});
	electron.ipcMain.handle("file-exists", async (_event, filePath) => {
		try {
			await node_fs.default.promises.access(filePath);
			return true;
		} catch {
			return false;
		}
	});
	electron.ipcMain.handle("delete-file", async (_event, filePath) => {
		try {
			await node_fs.default.promises.unlink(filePath);
			return true;
		} catch {
			return false;
		}
	});
	electron.ipcMain.handle("get-file-size", async (_event, filePath) => {
		try {
			return (await node_fs.default.promises.stat(filePath)).size;
		} catch {
			return 0;
		}
	});
	function safeSend(win, channel, ...args) {
		if (!win || win.isDestroyed()) return;
		try {
			win.webContents.send(channel, ...args);
		} catch {}
	}
	electron.ipcMain.handle("convert-to-mp4", async (event, inputPath, outputPath, crop) => {
		logger_default.info("转换为 MP4", inputPath, "->", outputPath, crop ? `crop: ${crop.width}x${crop.height}` : "");
		const win = electron.BrowserWindow.fromWebContents(event.sender);
		return convertWebmToMp4(inputPath, outputPath, (progress) => {
			safeSend(win, "on-conversion-progress", progress);
		}, crop);
	});
	electron.ipcMain.handle("crop-video", async (event, inputPath, outputPath, crop) => {
		logger_default.info("裁剪视频", inputPath, "->", outputPath, `crop: ${crop.width}x${crop.height}+${crop.x}+${crop.y}`);
		const win = electron.BrowserWindow.fromWebContents(event.sender);
		return cropVideo(inputPath, outputPath, crop, (progress) => {
			safeSend(win, "on-conversion-progress", progress);
		});
	});
	electron.ipcMain.handle("convert-to-gif", async (event, inputPath, outputPath, options) => {
		logger_default.info("转换为 GIF", inputPath, "->", outputPath);
		const win = electron.BrowserWindow.fromWebContents(event.sender);
		return convertToGif(inputPath, outputPath, options, (progress) => {
			safeSend(win, "on-conversion-progress", progress);
		});
	});
	electron.ipcMain.handle("merge-multi-screen", async (event, inputs, outputPath) => {
		logger_default.info("合并多屏录制", inputs.length, "个屏幕 ->", outputPath);
		const win = electron.BrowserWindow.fromWebContents(event.sender);
		return mergeMultiScreen(inputs, outputPath, (progress) => {
			safeSend(win, "on-conversion-progress", progress);
		});
	});
	electron.ipcMain.handle("open-file-location", async (_event, filePath) => {
		electron.shell.showItemInFolder(filePath);
	});
	electron.ipcMain.handle("open-external", async (_event, url) => {
		electron.shell.openExternal(url);
	});
	electron.ipcMain.handle("open-path", async (_event, filePath) => {
		await electron.shell.openPath(filePath);
	});
	electron.ipcMain.handle("get-app-version", async () => {
		return electron.app.getVersion();
	});
	electron.ipcMain.handle("get-screen-scale-factor", async () => {
		return electron.screen.getPrimaryDisplay().scaleFactor;
	});
	electron.ipcMain.handle("get-screen-bounds", async () => {
		const display = electron.screen.getPrimaryDisplay();
		const scaleFactor = display.scaleFactor;
		return {
			x: Math.round(display.bounds.x / scaleFactor),
			y: Math.round(display.bounds.y / scaleFactor),
			width: Math.round(display.bounds.width / scaleFactor),
			height: Math.round(display.bounds.height / scaleFactor)
		};
	});
	electron.ipcMain.handle("take-screenshot", async (_event) => {
		try {
			const sources = await electron.desktopCapturer.getSources({
				types: ["screen"],
				thumbnailSize: {
					width: 0,
					height: 0
				}
			});
			if (!sources.length) throw new Error("未找到屏幕源");
			const pngData = sources[0].thumbnail.toPNG();
			const now = /* @__PURE__ */ new Date();
			const filename = `截图_${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}.png`;
			const savePath = (0, node_path.join)(electron.app.getPath("desktop"), filename);
			await node_fs.default.promises.writeFile(savePath, pngData);
			(0, import_tray.showBalloon)("二支录制", `截图已保存到桌面：${filename}`);
			return {
				success: true,
				filePath: savePath
			};
		} catch (err) {
			logger_default.error("截图失败", err.message);
			return {
				success: false,
				error: err.message
			};
		}
	});
	electron.ipcMain.handle("get-all-displays", async () => {
		const displays = electron.screen.getAllDisplays();
		const primary = electron.screen.getPrimaryDisplay();
		const sources = await electron.desktopCapturer.getSources({
			types: ["screen"],
			thumbnailSize: {
				width: 340,
				height: 200
			}
		});
		return displays.map((d, i) => {
			const src = sources[i];
			return {
				id: d.id,
				label: d.id === primary.id ? `主屏幕` : `屏幕 ${i + 1}`,
				bounds: d.bounds,
				scaleFactor: d.scaleFactor,
				size: {
					width: d.size.width,
					height: d.size.height
				},
				isPrimary: d.id === primary.id,
				sourceId: src?.id || null,
				sourceName: src?.name || "",
				thumbnail: src?.thumbnail?.toDataURL() || ""
			};
		});
	});
	electron.ipcMain.handle("minimize-window", async (event) => {
		electron.BrowserWindow.fromWebContents(event.sender)?.minimize();
	});
	electron.ipcMain.handle("show-window", async (event) => {
		const win = electron.BrowserWindow.fromWebContents(event.sender);
		if (win) {
			win.show();
			win.focus();
		}
	});
	electron.ipcMain.handle("maximize-window", async (event) => {
		const win = electron.BrowserWindow.fromWebContents(event.sender);
		if (win?.isMaximized()) win.unmaximize();
		else win?.maximize();
	});
	electron.ipcMain.handle("close-window", async (event) => {
		const win = electron.BrowserWindow.fromWebContents(event.sender);
		if (win) {
			win.webContents.send("app-main-window-close");
			win.hide();
		}
	});
	electron.ipcMain.on("notify-conversion-start", () => {
		(0, import_tray.showBalloon)("二支录制", "录制完成，正在转换视频格式...");
	});
	electron.ipcMain.on("show-about-window", () => {
		const parent = electron.BrowserWindow.getFocusedWindow();
		if (parent) {
			const win = new electron.BrowserWindow({
				width: 360,
				height: 400,
				resizable: false,
				skipTaskbar: true,
				frame: false,
				modal: true,
				parent,
				backgroundColor: "#eaeaec",
				webPreferences: {
					preload: (0, node_path.join)(__dirname, "..", "preload", "index.cjs"),
					contextIsolation: true,
					nodeIntegration: false,
					sandbox: false
				}
			});
			electron.ipcMain.on("close-about-window", () => {
				win.close();
				electron.ipcMain.removeAllListeners("close-about-window");
			});
			win.on("closed", () => {
				electron.ipcMain.removeAllListeners("close-about-window");
			});
			const aboutPath = process.env["VITE_DEV_SERVER_URL"] ? `${process.env["VITE_DEV_SERVER_URL"]}about.html` : (0, node_path.join)(electron.app.getAppPath(), "dist", "about.html");
			if (aboutPath.startsWith("http")) win.loadURL(aboutPath);
			else win.loadFile(aboutPath);
		}
	});
	electron.ipcMain.on("notify-conversion-done", () => {
		(0, import_tray.showBalloon)("二支录制", "视频转换完成！");
	});
	electron.ipcMain.on("update-audio-levels", (_event, micLevel, sysLevel) => {
		updateAudioLevels(micLevel, sysLevel);
	});
	electron.ipcMain.handle("load-recordings", async () => {
		const filePath = getRecordingsPath();
		try {
			const data = await node_fs.default.promises.readFile(filePath, "utf-8");
			const parsed = JSON.parse(data);
			logger_default.info("加载录制历史", filePath, parsed.length, "条");
			return parsed;
		} catch (err) {
			logger_default.info("加载录制历史失败（可能首次运行）", filePath, err.message);
			return [];
		}
	});
	electron.ipcMain.handle("save-recordings", async (_event, recordings) => {
		const filePath = getRecordingsPath();
		try {
			await node_fs.default.promises.writeFile(filePath, JSON.stringify(recordings), "utf-8");
			logger_default.info("保存录制历史", filePath, recordings.length, "条");
			return true;
		} catch (err) {
			logger_default.error("保存录制历史失败", filePath, err.message);
			return false;
		}
	});
	if (agentBridge) {
		agentBridge.setStateListener((state, sessions) => {
			if (state !== "idle" || sessions && sessions.length > 0) showAiIsland();
			const wins = electron.BrowserWindow.getAllWindows();
			for (const win of wins) if (!win.isDestroyed()) try {
				win.webContents.send("agent-state-update", {
					state,
					sessions
				});
			} catch {}
		});
		agentBridge.setCardListener((card) => {
			if (card) showAiIsland();
			let safe;
			if (!card) safe = null;
			else if (card.kind === "permission") safe = {
				kind: "permission",
				sessionId: card.sessionId,
				toolName: card.toolName,
				toolInput: card.toolInput,
				suggestions: card.suggestions,
				createdAt: card.createdAt
			};
			else safe = {
				kind: "question",
				sessionId: card.sessionId,
				toolName: card.toolName,
				toolInput: card.toolInput,
				questions: card.questions,
				answerable: card.answerable,
				createdAt: card.createdAt
			};
			logger_default.info(`[IPC] broadcast card: kind=${card ? card.kind : "null"}, wins=${electron.BrowserWindow.getAllWindows().length}`);
			const wins = electron.BrowserWindow.getAllWindows();
			for (const win of wins) if (!win.isDestroyed()) try {
				win.webContents.send("agent-card-update", safe);
			} catch (e) {
				logger_default.error(`[IPC] send card to window failed: ${e.message}`);
			}
		});
		electron.ipcMain.handle("agent-get-status", () => {
			const status = agentBridge?.getStatus() ?? null;
			logger_default.info(`[IPC] agentGetStatus: sessionCount=${status?.sessionCount}, displayState=${status?.displayState}, serverRunning=${status?.serverRunning}`);
			return status;
		});
		electron.ipcMain.handle("agent-install-hooks", () => {
			agentBridge?.installHooks();
			return agentBridge?.getStatus();
		});
		electron.ipcMain.handle("agent-uninstall-hooks", () => {
			agentBridge?.uninstallHooks();
			return agentBridge?.getStatus();
		});
		electron.ipcMain.handle("agent-resolve-permission", (_event, behavior) => agentBridge?.resolvePermission(behavior));
		electron.ipcMain.handle("agent-dismiss-question", () => agentBridge?.dismissQuestion());
		electron.ipcMain.handle("agent-submit-question", (_event, sessionId, answers) => agentBridge?.submitQuestion(sessionId, answers));
		electron.ipcMain.handle("agent-set-auto-allow", (_event, enabled) => agentBridge?.setAutoAllow(enabled));
		electron.ipcMain.handle("agent-get-auto-allow", () => agentBridge?.getAutoAllow() ?? false);
		electron.ipcMain.handle("agent-get-auto-allow-sessions", () => agentBridge?.getAutoAllowSessions() ?? []);
		electron.ipcMain.handle("agent-set-auto-allow-session", (_event, sessionId, enabled) => agentBridge?.setAutoAllowSession(sessionId, enabled) ?? []);
		electron.ipcMain.handle("agent-get-card-expiry", () => agentBridge?.getCardExpire() ?? {
			enabled: true,
			seconds: 300
		});
		electron.ipcMain.handle("agent-set-card-expiry", (_event, enabled, seconds) => agentBridge?.setCardExpire(enabled, seconds));
	}
	registerTodoIpcHandlers();
}
function registerTodoIpcHandlers() {
	electron.ipcMain.handle("todo-get", () => loadItems());
	electron.ipcMain.handle("todo-create", (_event, input) => {
		const items = createTodo(input);
		refreshTodoBadge();
		syncStickyNotes();
		return items;
	});
	electron.ipcMain.handle("todo-update", (_event, id, patch) => {
		const items = updateTodo(id, patch);
		refreshTodoBadge();
		syncStickyNotes();
		return items;
	});
	electron.ipcMain.handle("todo-delete", (_event, id) => {
		const items = deleteTodo(id);
		refreshTodoBadge();
		syncStickyNotes();
		return items;
	});
	electron.ipcMain.handle("todo-toggle-done", (_event, id) => {
		const items = toggleTodoDone(id);
		refreshTodoBadge();
		syncStickyNotes();
		return items;
	});
	electron.ipcMain.handle("todo-toggle-pin", (_event, id) => {
		const items = togglePin(id);
		syncStickyNotes();
		refreshTodoBadge();
		return items;
	});
	electron.ipcMain.handle("todo-show-window", () => {
		showTodoWindow();
	});
	electron.ipcMain.handle("todo-close-window", () => {
		closeTodoWindow();
	});
	electron.ipcMain.handle("todo-window-visible", () => isTodoWindowVisible());
	electron.ipcMain.handle("todo-toggle-always-on-top", () => toggleTodoWindowAlwaysOnTop());
	electron.ipcMain.handle("todo-get-settings", () => loadTodoSettings());
	electron.ipcMain.handle("todo-set-settings", (_event, patch) => {
		const s = updateTodoSettings(patch);
		refreshTodoBadge();
		return s;
	});
	electron.ipcMain.on("todo-reminder-close", () => {
		hideTodoReminder();
	});
	electron.ipcMain.on("todo-reminder-open", () => {
		clearTodoReminderQueue();
		showTodoWindow();
	});
	electron.ipcMain.on("todo-sticky-open", (_event, id) => {
		focusTodoItem(id);
	});
	electron.ipcMain.on("todo-sticky-unpin", (_event, id) => {
		const current = loadItems().find((x) => x.id === id);
		if (current && current.type === "todo") completeTodo(id);
		else togglePin(id);
		syncStickyNotes();
		refreshTodoBadge();
		broadcastTodoUpdate(loadItems());
	});
}
//#endregion
//#region electron/main/global-shortcuts.ts
init_logger();
var mainWindow$1 = null;
function registerGlobalShortcuts(win) {
	mainWindow$1 = win;
	electron.globalShortcut.register("CommandOrControl+Shift+R", () => {
		logger_default.info("Global shortcut: start/stop recording");
		mainWindow$1?.webContents.send("on-global-shortcut", "startStop");
	});
	electron.globalShortcut.register("CommandOrControl+Shift+P", () => {
		logger_default.info("Global shortcut: pause/resume recording");
		mainWindow$1?.webContents.send("on-global-shortcut", "pauseResume");
	});
	logger_default.info("Global shortcuts registered");
}
function unregisterGlobalShortcuts() {
	electron.globalShortcut.unregisterAll();
}
//#endregion
//#region electron/main/ip-reporter.ts
init_logger();
var REPORT_URL = "http://8.163.43.7:3000/report-ip";
function getPendingPath() {
	return (0, node_path.join)(electron.app.getPath("userData"), "pending-reports.json");
}
function savePending(payload) {
	let pending = [];
	try {
		if (node_fs.default.existsSync(getPendingPath())) pending = JSON.parse(node_fs.default.readFileSync(getPendingPath(), "utf-8"));
	} catch {}
	pending.push(payload);
	node_fs.default.writeFileSync(getPendingPath(), JSON.stringify(pending, null, 2), "utf-8");
	logger_default.info("Saved offline report to local, total pending:", pending.length);
}
function loadPending() {
	try {
		if (node_fs.default.existsSync(getPendingPath())) return JSON.parse(node_fs.default.readFileSync(getPendingPath(), "utf-8"));
	} catch {}
	return [];
}
function clearPending() {
	try {
		node_fs.default.unlinkSync(getPendingPath());
	} catch {}
}
async function uploadOne(payload) {
	try {
		await fetch(REPORT_URL, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(payload)
		});
		return true;
	} catch {
		return false;
	}
}
async function flushPending() {
	const pending = loadPending();
	if (pending.length === 0) return true;
	const failed = [];
	for (const record of pending) if (await uploadOne(record)) logger_default.info("Flushed pending report:", record["公网IP"], record["上报时间"]);
	else failed.push(record);
	if (failed.length === 0) {
		clearPending();
		logger_default.info("All pending reports flushed");
		return true;
	}
	node_fs.default.writeFileSync(getPendingPath(), JSON.stringify(failed, null, 2), "utf-8");
	return false;
}
async function getIPInfo() {
	const apis = [
		async () => {
			const d = (await fetch("https://qifu.baidu.com/opus/api/ip/local", { headers: { "Referer": "https://www.baidu.com" } }).then((r) => r.json()))?.data;
			if (!d?.ip) throw new Error("empty");
			return {
				"公网IP": d.ip,
				"国家": d.country || "",
				"省份": d.province || "",
				"城市": d.city || "",
				"区县": d.district || d.area || "",
				"详细地址": [
					d.country,
					d.province,
					d.city,
					d.district || d.area
				].filter(Boolean).join(""),
				"运营商": d.isp || ""
			};
		},
		async () => {
			const r = await fetch("http://whois.pconline.com.cn/ipJson.jsp").then((r) => r.arrayBuffer());
			const text = new TextDecoder("gbk").decode(r);
			const data = JSON.parse(text);
			if (!data.ip) throw new Error("empty");
			return {
				"公网IP": data.ip,
				"国家": "中国",
				"省份": data.pro || "",
				"城市": data.city || "",
				"区县": data.region || "",
				"详细地址": data.addr || "",
				"运营商": data.addr?.split(" ")?.[1] || ""
			};
		},
		async () => {
			const r = await fetch("http://ip-api.com/json/?lang=zh-CN").then((r) => r.json());
			if (!r.query) throw new Error("empty");
			return {
				"公网IP": r.query,
				"国家": r.country,
				"省份": r.regionName,
				"城市": r.city,
				"区县": "",
				"详细地址": `${r.country}${r.regionName}${r.city}`,
				"运营商": r.isp,
				"纬度": String(r.lat ?? ""),
				"经度": String(r.lon ?? "")
			};
		}
	];
	for (const api of apis) try {
		return await api();
	} catch {
		continue;
	}
	return {
		"公网IP": "",
		"国家": "",
		"省份": "",
		"城市": "",
		"区县": "",
		"详细地址": "",
		"运营商": ""
	};
}
function getLocalIP() {
	const nets = (0, node_os.networkInterfaces)();
	for (const name of Object.keys(nets)) for (const net of nets[name]) if (net.family === "IPv4" && !net.internal) return net.address;
	return "127.0.0.1";
}
async function reportIP() {
	const localIP = getLocalIP();
	const payload = {
		"电脑名": (0, node_os.hostname)(),
		"局域网IP": localIP,
		"上报时间": (/* @__PURE__ */ new Date()).toISOString()
	};
	let ipInfo;
	try {
		ipInfo = await getIPInfo();
	} catch {
		ipInfo = {
			"公网IP": "",
			"国家": "",
			"省份": "",
			"城市": "",
			"区县": "",
			"详细地址": "",
			"运营商": ""
		};
	}
	const fullPayload = {
		...payload,
		...ipInfo
	};
	if (await uploadOne(fullPayload)) {
		logger_default.info("IP reported:", ipInfo["公网IP"], ipInfo["省份"], ipInfo["城市"]);
		flushPending();
	} else {
		logger_default.info("Network unavailable, saving report locally");
		savePending(fullPayload);
	}
}
function retryPending() {
	if (loadPending().length > 0) flushPending();
}
//#endregion
//#region electron/main/agent-state-machine.ts
var logger = {
	info: () => {},
	warn: () => {}
};
function setStateMachineLogger(log) {
	logger = log;
}
var STATE_PRIORITY = {
	error: 4,
	notification: 3,
	working: 2,
	thinking: 1,
	idle: 0
};
var SESSION_STALE_MS = 600 * 1e3;
var WORKING_STALE_MS = 300 * 1e3;
var CLEANUP_INTERVAL_MS = 10 * 1e3;
var DONE_DURATION_MS = 2e3;
var TITLE_MAX_LEN = 60;
function normalizeTitle(prompt) {
	if (typeof prompt !== "string") return void 0;
	const flat = prompt.replace(/\s+/g, " ").trim();
	if (!flat) return void 0;
	return flat.length > TITLE_MAX_LEN ? flat.slice(0, TITLE_MAX_LEN - 1) + "…" : flat;
}
function createAgentStateMachine(options = {}) {
	const isClaudeRunning = options.isClaudeRunning;
	const sessions = /* @__PURE__ */ new Map();
	let cleanupTimer = null;
	let listeners = [];
	let doneTimer = null;
	let currentGlobalState = "idle";
	function subscribe(listener) {
		listeners.push(listener);
		return () => {
			listeners = listeners.filter((l) => l !== listener);
		};
	}
	function notify() {
		const state = resolveDisplayState();
		const snapshot = Array.from(sessions.values());
		if (state !== currentGlobalState) currentGlobalState = state;
		for (const l of listeners) l(currentGlobalState, snapshot);
	}
	function updateSession(sessionId, state, event, opts = {}) {
		if (doneTimer) {
			clearTimeout(doneTimer);
			doneTimer = null;
		}
		const existing = sessions.get(sessionId);
		const session = {
			sessionId,
			agentId: opts.agentId || "claude-code",
			state,
			event,
			updatedAt: Date.now(),
			title: existing?.title || normalizeTitle(opts.prompt),
			toolName: opts.toolName || existing?.toolName,
			toolInput: opts.toolInput || existing?.toolInput,
			contextUsage: opts.contextUsage || existing?.contextUsage,
			model: opts.model || existing?.model
		};
		sessions.set(sessionId, session);
		logger.info(`[StateMachine] updateSession: id=${sessionId}, state=${state}, event=${event}, total=${sessions.size}`);
		if (state === "idle" && event === "Stop") doneTimer = setTimeout(() => {
			doneTimer = null;
			if (sessions.has(sessionId)) {
				const s = sessions.get(sessionId);
				s.state = "idle";
				s.updatedAt = Date.now();
			}
			logger.info(`[StateMachine] doneTimer fired for ${sessionId}, total=${sessions.size}`);
			notify();
		}, DONE_DURATION_MS);
		notify();
	}
	function dismissSession(sessionId) {
		sessions.delete(sessionId);
		notify();
	}
	function resolveDisplayState() {
		let best = "idle";
		for (const [, s] of sessions) if ((STATE_PRIORITY[s.state] ?? 0) > (STATE_PRIORITY[best] ?? 0)) best = s.state;
		if (doneTimer && best === "idle") return "done";
		return best;
	}
	function getCurrentState() {
		return currentGlobalState;
	}
	function getSessions() {
		const result = [];
		for (const [, v] of sessions) result.push(v);
		return result;
	}
	function cleanStaleSessions() {
		const now = Date.now();
		const claudeRunning = isClaudeRunning ? isClaudeRunning() : null;
		let changed = false;
		for (const [id, s] of sessions) {
			const age = now - s.updatedAt;
			if (s.state === "idle") {
				if (age > SESSION_STALE_MS) {
					sessions.delete(id);
					logger.info(`[StateMachine] cleanStale: removed idle ${id} (age=${Math.round(age / 1e3)}s)`);
					changed = true;
				}
			} else if (claudeRunning === false) {
				if (age > WORKING_STALE_MS) {
					s.state = "idle";
					s.updatedAt = now;
					logger.info(`[StateMachine] cleanStale: reset zombie ${id} to idle (age=${Math.round(age / 1e3)}s, no claude running)`);
					changed = true;
				}
			} else if (claudeRunning === null) {
				if (age > WORKING_STALE_MS) {
					s.state = "idle";
					s.updatedAt = now;
					logger.info(`[StateMachine] cleanStale: reset ${id} to idle (age=${Math.round(age / 1e3)}s, no liveness check)`);
					changed = true;
				}
			}
		}
		if (changed) notify();
	}
	function start() {
		if (cleanupTimer) return;
		cleanupTimer = setInterval(cleanStaleSessions, CLEANUP_INTERVAL_MS);
	}
	function stop() {
		if (cleanupTimer) {
			clearInterval(cleanupTimer);
			cleanupTimer = null;
		}
		if (doneTimer) {
			clearTimeout(doneTimer);
			doneTimer = null;
		}
	}
	return {
		updateSession,
		dismissSession,
		resolveDisplayState,
		getCurrentState,
		getSessions,
		subscribe,
		cleanStaleSessions,
		start,
		stop
	};
}
//#endregion
//#region electron/main/permission-match.ts
/** 递归稳定序列化入参：对象键按字典序排序，使同一入参的不同键序也能匹配；数组保序。 */
function permissionContentSignature(v) {
	if (v === null || v === void 0) return "null";
	if (typeof v !== "object") return JSON.stringify(v);
	if (Array.isArray(v)) return "[" + v.map(permissionContentSignature).join(",") + "]";
	return "{" + Object.keys(v).sort().map((k) => JSON.stringify(k) + ":" + permissionContentSignature(v[k])).join(",") + "}";
}
/** 在待审卡里找应被「外部完成」关闭的那张，返回队列下标；无匹配返回 -1。
*  匹配优先级：
*    1) tool_use_id 精确（仅当卡片与完成事件都带 ID 时，如合成注入/未来桥接）；
*    2) 内容签名——同 session + 同工具名 + 同入参签名判定为同一工具调用
*       （toolName 与内容签名分开判等，不做字符串拼接，避免分隔符歧义/转义问题）；
*    3) 惰性对账兜底——签名对不上时，若该 session 恰好只有一张同名权限卡，按名收起
*       （完成事件本身已证明该 tool 的 gate settle，见函数体注释）。
*  cards 按队列入列顺序，取最先匹配者：工具串行执行，先到的完成事件对应先入队的卡，
*  避免同一会话重复相同调用时误关后面的卡。 */
function findPermissionToResolve(cards, sessionId, evt) {
	const toolUseId = evt?.tool_use_id || evt?.toolUseId || null;
	const name = evt?.tool_name || evt?.toolName || null;
	const inputSig = name != null && name !== "" ? permissionContentSignature(evt?.tool_input ?? evt?.toolInput ?? null) : null;
	let nameOnlyIdx = -1;
	let nameOnlyCount = 0;
	for (let i = 0; i < cards.length; i++) {
		const c = cards[i];
		if (c.kind !== "permission") continue;
		if (c.sessionId !== sessionId) continue;
		if (toolUseId && c.toolUseId && c.toolUseId === toolUseId) return i;
		if (name != null && c.toolName === name) {
			if (inputSig != null && permissionContentSignature(c.toolInput ?? null) === inputSig) return i;
			if (nameOnlyIdx === -1) nameOnlyIdx = i;
			nameOnlyCount++;
		}
	}
	if (nameOnlyCount === 1) return nameOnlyIdx;
	return -1;
}
//#endregion
//#region electron/main/agent-server.ts
init_logger();
var DEFAULT_PORT = 6e4;
var MAX_PORT = 60019;
var DEFAULT_HEAD_TIMEOUT_MS = 3e5;
var runtimeDir = null;
function getRuntimeDir() {
	if (runtimeDir) return runtimeDir;
	runtimeDir = path.join(require("os").homedir(), ".erzhi-recording");
	return runtimeDir;
}
function createAgentServer(stateMachine, options = {}) {
	const getHeadTimeoutMs = options.getHeadTimeoutMs ?? (() => DEFAULT_HEAD_TIMEOUT_MS);
	let server = null;
	let activePort = null;
	let cardQueue = [];
	let headTimer = null;
	let onCardChange = null;
	const COMPLETION_EVENTS = [
		"PostToolUse",
		"PostToolUseFailure",
		"Stop",
		"StopFailure",
		"SessionEnd",
		"ApiError"
	];
	const EXTERNAL_RESOLUTION_EVENTS = [
		"PostToolUse",
		"PostToolUseFailure",
		"PermissionDenied"
	];
	const SESSION_END_EVENTS = [
		"Stop",
		"StopFailure",
		"SessionEnd"
	];
	const MAX_BODY_BYTES = 1 * 1024 * 1024;
	class BodyTooLargeError extends Error {
		code = "PAYLOAD_TOO_LARGE";
	}
	function parseBody(req) {
		return new Promise((resolve, reject) => {
			let body = "";
			req.on("data", (c) => {
				body += c;
				if (Buffer.byteLength(body) > MAX_BODY_BYTES) {
					try {
						req.destroy();
					} catch {}
					reject(new BodyTooLargeError("Body exceeds 1MB limit"));
				}
			});
			req.on("end", () => {
				try {
					resolve(JSON.parse(body));
				} catch {
					reject(/* @__PURE__ */ new Error("Invalid JSON"));
				}
			});
			req.on("error", reject);
		});
	}
	function sendJson(res, status, data) {
		res.writeHead(status, { "Content-Type": "application/json" });
		res.end(JSON.stringify(data));
	}
	function tryRespond(res, body) {
		try {
			if (!res.headersSent && !res.destroyed && !res.writableEnded) {
				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(body);
			}
		} catch {}
	}
	function headCard() {
		return cardQueue[0] ?? null;
	}
	function expireHead(reason) {
		const head = headCard();
		if (!head) return;
		if (head.kind === "permission") head.reject(reason);
		else if (head.answerable) head.reject(reason);
		shiftHead();
	}
	function shiftHead() {
		cardQueue.shift();
		clearTimeout(headTimer);
		headTimer = null;
		startHeadTimer();
		notifyCard();
	}
	function startHeadTimer() {
		if (headTimer) clearTimeout(headTimer);
		headTimer = null;
		if (!cardQueue.length) return;
		const ms = getHeadTimeoutMs();
		if (!ms || ms <= 0) return;
		headTimer = setTimeout(() => {
			headTimer = null;
			expireHead("timeout");
		}, ms);
	}
	function notifyCard() {
		if (onCardChange) onCardChange(headCard());
	}
	function removeQuestionsForSession(sessionId) {
		const before = cardQueue.length;
		const removed = [];
		const filtered = cardQueue.filter((c) => {
			if (c.kind === "question" && c.sessionId === sessionId) {
				removed.push(c);
				return false;
			}
			return true;
		});
		if (filtered.length === before) return;
		cardQueue = filtered;
		for (const c of removed) if (c.kind === "question" && c.answerable) c.reject("completed");
		clearTimeout(headTimer);
		headTimer = null;
		startHeadTimer();
		notifyCard();
	}
	function resolvePermissionByCompletion(sessionId, data) {
		const idx = findPermissionToResolve(cardQueue, sessionId, data);
		if (idx === -1) return;
		const [card] = cardQueue.splice(idx, 1);
		card.reject("resolved-in-cli");
		clearTimeout(headTimer);
		headTimer = null;
		startHeadTimer();
		notifyCard();
		logger_default.info(`[AgentServer] permission resolved externally (CLI): session=${sessionId}, tool=${card.toolName}`);
	}
	function removePermissionsForSession(sessionId) {
		const before = cardQueue.length;
		const removed = [];
		const filtered = cardQueue.filter((c) => {
			if (c.kind === "permission" && c.sessionId === sessionId) {
				removed.push(c);
				return false;
			}
			return true;
		});
		if (filtered.length === before) return;
		cardQueue = filtered;
		for (const c of removed) c.reject("completed");
		clearTimeout(headTimer);
		headTimer = null;
		startHeadTimer();
		notifyCard();
		logger_default.info(`[AgentServer] permissions cleared for ended session=${sessionId}, count=${removed.length}`);
	}
	function handleState(data, res) {
		const sessionId = data.session_id || data.sessionId;
		const state = data.state;
		const event = data.event;
		logger_default.info(`[AgentServer] /state received: session=${sessionId}, state=${state}, event=${event}, tool=${data.tool_name || data.toolName}`);
		if (!sessionId || !state || !event) {
			logger_default.warn(`[AgentServer] /state rejected: missing fields (sessionId=${sessionId}, state=${state}, event=${event})`);
			sendJson(res, 400, { error: "Missing required fields: session_id, state, event" });
			return;
		}
		stateMachine.updateSession(sessionId, state, event, {
			agentId: data.agent_id || "claude-code",
			toolName: data.tool_name || data.toolName,
			toolInput: data.tool_input || data.toolInput,
			contextUsage: data.context_usage || data.contextUsage,
			model: data.model,
			prompt: data.prompt
		});
		if (COMPLETION_EVENTS.includes(event)) removeQuestionsForSession(sessionId);
		if (SESSION_END_EVENTS.includes(event)) removePermissionsForSession(sessionId);
		if (EXTERNAL_RESOLUTION_EVENTS.includes(event)) resolvePermissionByCompletion(sessionId, data);
		logger_default.info(`[AgentServer] /state ok, total sessions=${stateMachine.getSessions().length}`);
		sendJson(res, 200, {
			ok: true,
			app: "erzhi-recording"
		});
	}
	function handlePermission(data, res) {
		const toolName = data.tool_name || data.toolName || "unknown";
		const toolInput = data.tool_input || data.toolInput || {};
		const sessionId = data.session_id || data.sessionId || "unknown";
		if (toolName === "AskUserQuestion") {
			handleAskUserQuestionPermission(res, sessionId, toolInput);
			return;
		}
		stateMachine.updateSession(sessionId, "notification", "PermissionRequest", {
			toolName,
			toolInput
		});
		const toolUseId = data.tool_use_id || data.toolUseId || null;
		const item = {
			kind: "permission",
			sessionId,
			toolName,
			toolInput,
			suggestions: data.permission_suggestions || null,
			toolUseId,
			resolve: () => {},
			reject: () => {},
			createdAt: Date.now()
		};
		new Promise((resolve, reject) => {
			item.resolve = resolve;
			item.reject = reject;
		}).then((behavior) => {
			stateMachine.updateSession(sessionId, "idle", "PermissionResolved");
			const mappedBehavior = behavior === "always" ? "allow" : behavior;
			const responseBody = JSON.stringify({ hookSpecificOutput: {
				hookEventName: "PermissionRequest",
				decision: { behavior: mappedBehavior }
			} });
			logger_default.info(`[AgentServer] /permission resolved: behavior=${behavior} -> ${mappedBehavior}`);
			tryRespond(res, responseBody);
		}).catch((reason) => {
			stateMachine.updateSession(sessionId, "idle", "PermissionCancelled");
			const responseBody = JSON.stringify({ hookSpecificOutput: {
				hookEventName: "PermissionRequest",
				decision: { behavior: "cancel" }
			} });
			logger_default.info(`[AgentServer] /permission cancelled: ${reason}`);
			tryRespond(res, responseBody);
		});
		cardQueue.push(item);
		if (cardQueue.length === 1) startHeadTimer();
		notifyCard();
		logger_default.info(`[AgentServer] /permission queued: session=${sessionId}, queue=${cardQueue.length}`);
	}
	function handleAskUserQuestionPermission(res, sessionId, toolInput) {
		const questions = Array.isArray(toolInput && toolInput.questions) && toolInput.questions || null;
		stateMachine.updateSession(sessionId, "notification", "AskUserQuestion", {
			toolName: "AskUserQuestion",
			toolInput
		});
		const item = {
			kind: "question",
			sessionId,
			toolName: "AskUserQuestion",
			toolInput,
			questions,
			answerable: true,
			resolve: () => {},
			reject: () => {},
			createdAt: Date.now()
		};
		new Promise((resolve, reject) => {
			item.resolve = resolve;
			item.reject = reject;
		}).then((answers) => {
			stateMachine.updateSession(sessionId, "idle", "QuestionAnswered");
			const responseBody = JSON.stringify({ hookSpecificOutput: {
				hookEventName: "PermissionRequest",
				decision: {
					behavior: "allow",
					updatedInput: {
						questions,
						answers
					}
				}
			} });
			logger_default.info(`[AgentServer] AskUserQuestion answered via /permission: session=${sessionId}`);
			tryRespond(res, responseBody);
		}).catch((reason) => {
			stateMachine.updateSession(sessionId, "idle", "QuestionDenied");
			const responseBody = JSON.stringify({ hookSpecificOutput: {
				hookEventName: "PermissionRequest",
				decision: { behavior: "deny" }
			} });
			logger_default.info(`[AgentServer] AskUserQuestion denied: reason=${reason}, session=${sessionId}`);
			tryRespond(res, responseBody);
		});
		cardQueue.push(item);
		if (cardQueue.length === 1) startHeadTimer();
		notifyCard();
		logger_default.info(`[AgentServer] AskUserQuestion (answerable) queued: session=${sessionId}, queue=${cardQueue.length}`);
	}
	function handleQuestion(data, res) {
		const sessionId = data.session_id || data.sessionId || "unknown";
		const toolName = data.tool_name || data.toolName || "AskUserQuestion";
		const toolInput = data.tool_input || data.toolInput || {};
		stateMachine.updateSession(sessionId, "notification", "AskUserQuestion", {
			toolName,
			toolInput
		});
		logger_default.info(`[AgentServer] /question notified (read-only card removed): session=${sessionId}`);
		sendJson(res, 200, {
			ok: true,
			app: "erzhi-recording"
		});
	}
	function handleHealth(res) {
		const sc = stateMachine.getSessions().length;
		sendJson(res, 200, {
			ok: true,
			app: "erzhi-recording",
			port: activePort,
			sessionCount: sc
		});
	}
	function route(req, res) {
		res.setHeader("Access-Control-Allow-Origin", "*");
		logger_default.info(`[AgentServer] ${req.method} ${req.url}`);
		if (req.method === "POST" && req.url === "/state") parseBody(req).then((d) => handleState(d, res)).catch((e) => {
			logger_default.error("[AgentServer] parseBody error:", e);
			sendJson(res, e?.code === "PAYLOAD_TOO_LARGE" ? 413 : 400, { error: e?.code === "PAYLOAD_TOO_LARGE" ? "Payload too large" : "Invalid JSON" });
		});
		else if (req.method === "POST" && req.url === "/permission") parseBody(req).then((d) => handlePermission(d, res)).catch((e) => {
			logger_default.error("[AgentServer] parseBody error:", e);
			sendJson(res, e?.code === "PAYLOAD_TOO_LARGE" ? 413 : 400, { error: e?.code === "PAYLOAD_TOO_LARGE" ? "Payload too large" : "Invalid JSON" });
		});
		else if (req.method === "POST" && req.url === "/question") parseBody(req).then((d) => handleQuestion(d, res)).catch((e) => {
			logger_default.error("[AgentServer] parseBody error:", e);
			sendJson(res, e?.code === "PAYLOAD_TOO_LARGE" ? 413 : 400, { error: e?.code === "PAYLOAD_TOO_LARGE" ? "Payload too large" : "Invalid JSON" });
		});
		else if (req.method === "GET" && req.url === "/health") handleHealth(res);
		else sendJson(res, 404, { error: "Not found" });
	}
	function resolvePendingPermission(behavior) {
		const head = headCard();
		if (head && head.kind === "permission") {
			head.resolve(behavior);
			shiftHead();
		}
	}
	function dismissQuestion() {
		const head = headCard();
		if (head && head.kind === "question") {
			if (head.answerable) head.reject("dismissed");
			shiftHead();
		}
	}
	function submitQuestion(sessionId, answers) {
		const head = headCard();
		if (head && head.kind === "question" && head.answerable && head.sessionId === sessionId) {
			head.resolve(answers);
			shiftHead();
			logger_default.info(`[AgentServer] submitQuestion accepted: session=${sessionId}`);
		} else logger_default.warn(`[AgentServer] submitQuestion ignored: no matching answerable head for session=${sessionId}`);
	}
	function setOnCardChange(cb) {
		onCardChange = cb;
	}
	function getSafeCurrentCard() {
		const head = headCard();
		if (!head) return null;
		if (head.kind === "permission") return {
			kind: "permission",
			sessionId: head.sessionId,
			toolName: head.toolName,
			toolInput: head.toolInput,
			suggestions: head.suggestions,
			createdAt: head.createdAt
		};
		return {
			kind: "question",
			sessionId: head.sessionId,
			toolName: head.toolName,
			toolInput: head.toolInput,
			questions: head.questions,
			answerable: head.answerable,
			createdAt: head.createdAt
		};
	}
	function start() {
		return new Promise((resolve) => {
			let currentPort = DEFAULT_PORT;
			let currentServer = null;
			function tryListen() {
				if (currentPort > MAX_PORT) {
					logger_default.error(`Agent server: all ports ${DEFAULT_PORT}-${MAX_PORT} occupied`);
					resolve(null);
					return;
				}
				currentServer = http.createServer(route);
				currentServer.on("error", (err) => {
					if (err.code === "EADDRINUSE") {
						currentPort++;
						tryListen();
					} else {
						logger_default.error("Agent server error:", err.message);
						resolve(null);
					}
				});
				currentServer.listen(currentPort, "127.0.0.1", () => {
					activePort = currentPort;
					server = currentServer;
					try {
						const dir = getRuntimeDir();
						fs.mkdirSync(dir, { recursive: true });
						fs.writeFileSync(path.join(dir, "runtime.json"), JSON.stringify({
							port: currentPort,
							pid: process.pid
						}), "utf8");
					} catch {}
					logger_default.info(`Agent server listening on 127.0.0.1:${currentPort}`);
					resolve(currentPort);
				});
			}
			tryListen();
		});
	}
	function stop() {
		for (const c of cardQueue) if (c.kind === "permission") c.reject("stopped");
		cardQueue = [];
		clearTimeout(headTimer);
		headTimer = null;
		if (onCardChange) onCardChange(null);
		if (server) {
			server.close();
			server = null;
		}
		activePort = null;
	}
	function getPort() {
		return activePort;
	}
	return {
		start,
		stop,
		getPort,
		getSafeCurrentCard,
		resolvePendingPermission,
		dismissQuestion,
		submitQuestion,
		setOnCardChange,
		restartHeadTimer: startHeadTimer
	};
}
//#endregion
//#region electron/main/claude-hook-manager.ts
init_logger();
var CLAUDE_SETTINGS_PATH = path.join(os.homedir(), ".claude", "settings.json");
var WATCH_INTERVAL_MS = 300 * 1e3;
var MAX_REPAIR_RETRIES = 3;
var HOOK_HTTP_TIMEOUT_S = 1860;
var HOOK_EVENTS = [
	"SessionStart",
	"SessionEnd",
	"UserPromptSubmit",
	"PreToolUse",
	"PostToolUse",
	"PostToolUseFailure",
	"Stop",
	"StopFailure",
	"ApiError",
	"Notification",
	"PermissionRequest"
];
function createClaudeHookManager(agentPort) {
	let watchTimer = null;
	let repairFailures = 0;
	let manualFixRequired = false;
	function getHookScriptPath() {
		try {
			if (require("electron")?.app?.isPackaged) return path.join(process.resourcesPath, "clawd-hook.js");
		} catch {}
		return path.join(__dirname, "clawd-hook.js");
	}
	function getNodePath() {
		try {
			const { execSync } = require("child_process");
			const nodePath = execSync("where node", { encoding: "utf8" }).trim().split("\n")[0];
			if (nodePath) return nodePath;
		} catch {}
		return process.execPath.replace("electron.exe", "node.exe");
	}
	function readClaudeSettings() {
		try {
			const raw = fs.readFileSync(CLAUDE_SETTINGS_PATH, "utf8");
			return JSON.parse(raw);
		} catch {
			return null;
		}
	}
	function writeClaudeSettings(settings) {
		try {
			fs.writeFileSync(CLAUDE_SETTINGS_PATH, JSON.stringify(settings, null, 2), "utf8");
			return true;
		} catch (err) {
			logger_default.error("Failed to write Claude settings:", err.message);
			return false;
		}
	}
	function buildHookCommand(eventName, scriptPath) {
		return {
			command: `& "${getNodePath()}" "${scriptPath}" ${eventName}`,
			shell: "powershell"
		};
	}
	function isOldFormat(settings) {
		const hooks = settings.hooks;
		if (!hooks || !Array.isArray(hooks)) return false;
		return hooks.some((h) => h.name && h.events && Array.isArray(h.events));
	}
	function removeOldHooks(settings) {
		if (!isOldFormat(settings)) return false;
		settings.hooks = (settings.hooks || []).filter((h) => !h.name?.startsWith("erzhi-recording"));
		return true;
	}
	function install() {
		const settings = readClaudeSettings();
		if (!settings) return {
			added: false,
			updated: false
		};
		const scriptPath = getHookScriptPath();
		let hooks = settings.hooks || {};
		removeOldHooks(settings);
		agentPort();
		if (HOOK_EVENTS.every((event) => {
			return (hooks[event] || []).some((group) => group.hooks?.some((h) => {
				if (event === "PermissionRequest") return h.type === "http" && h.url?.includes("/permission") && (h.timeout ?? 0) >= HOOK_HTTP_TIMEOUT_S;
				return h.type === "command" && h.command?.startsWith("&") && h.command?.includes("clawd-hook.js") && h.shell === "powershell";
			}));
		})) return {
			added: false,
			updated: false
		};
		for (const event of HOOK_EVENTS) {
			let hook;
			if (event === "PermissionRequest") hook = {
				type: "http",
				url: `http://127.0.0.1:${agentPort() || 6e4}/permission`,
				timeout: HOOK_HTTP_TIMEOUT_S
			};
			else {
				const { command, shell } = buildHookCommand(event, scriptPath);
				hook = {
					type: "command",
					command,
					shell,
					async: true,
					timeout: 5
				};
			}
			hooks[event] = [{
				matcher: "",
				hooks: [hook]
			}];
		}
		settings.hooks = hooks;
		writeClaudeSettings(settings);
		return {
			added: true,
			updated: false
		};
	}
	function uninstall() {
		const settings = readClaudeSettings();
		if (!settings) return { removed: false };
		let removed = false;
		if (isOldFormat(settings)) {
			const before = settings.hooks.length;
			settings.hooks = settings.hooks.filter((h) => !h.name?.startsWith("erzhi-recording"));
			if (settings.hooks.length < before) removed = true;
		}
		const hooks = settings.hooks || {};
		for (const event of HOOK_EVENTS) if (hooks[event]) {
			const before = hooks[event].length;
			hooks[event] = hooks[event].filter((group) => !group.hooks?.some((h) => h.command?.includes("clawd-hook.js")));
			if (hooks[event].length === 0) delete hooks[event];
			else if (hooks[event].length < before) removed = true;
		}
		settings.hooks = hooks;
		writeClaudeSettings(settings);
		return { removed };
	}
	function isInstalled() {
		const settings = readClaudeSettings();
		if (!settings) return false;
		return ((settings.hooks || {})[HOOK_EVENTS[0]] || []).some((group) => group.hooks?.some((h) => h.command?.includes("clawd-hook.js")));
	}
	function checkHealth() {
		const issues = [];
		if (!readClaudeSettings()) {
			issues.push("Claude settings file not found");
			return {
				healthy: false,
				issues
			};
		}
		if (!isInstalled()) {
			issues.push("Hook entry missing");
			return {
				healthy: false,
				issues
			};
		}
		const scriptPath = getHookScriptPath();
		if (!fs.existsSync(scriptPath)) {
			issues.push("Hook script file missing");
			return {
				healthy: false,
				issues
			};
		}
		return {
			healthy: issues.length === 0,
			issues
		};
	}
	function repair() {
		if (manualFixRequired) return false;
		if (repairFailures >= MAX_REPAIR_RETRIES) {
			manualFixRequired = true;
			return false;
		}
		const result = install();
		if (result.added || result.updated) {
			if (checkHealth().healthy) {
				repairFailures = 0;
				return true;
			}
		}
		repairFailures++;
		return false;
	}
	function performHealthCheck() {
		const health = checkHealth();
		if (!health.healthy) {
			logger_default.warn("Claude hook health check failed:", health.issues.join(", "));
			repair();
		} else {
			if (repairFailures > 0) repairFailures = 0;
			if (manualFixRequired) manualFixRequired = false;
		}
	}
	function startWatcher() {
		if (watchTimer) return;
		performHealthCheck();
		watchTimer = setInterval(performHealthCheck, WATCH_INTERVAL_MS);
		logger_default.info("Claude hook watcher started");
	}
	function stopWatcher() {
		if (watchTimer) {
			clearInterval(watchTimer);
			watchTimer = null;
		}
	}
	function getStatus() {
		const health = checkHealth();
		return {
			installed: isInstalled(),
			scriptExists: fs.existsSync(getHookScriptPath()),
			claudeExists: readClaudeSettings() !== null,
			healthy: health.healthy,
			repairFailures,
			manualFixRequired
		};
	}
	return {
		install,
		uninstall,
		isInstalled,
		startWatcher,
		stopWatcher,
		getStatus,
		checkHealth,
		repair
	};
}
//#endregion
//#region electron/main/session-title.ts
var SCAN_TTL_MS = 5e3;
var scanCache = null;
var scanCacheAt = 0;
function sessionsDir() {
	return node_path.join(node_os.homedir(), ".claude", "sessions");
}
function betterEntry(a, b) {
	const aReal = a.nameSource !== null && a.nameSource !== "derived";
	if (aReal !== (b.nameSource !== null && b.nameSource !== "derived")) return aReal;
	return a.startedAt >= b.startedAt;
}
function scanSessionFiles() {
	const now = Date.now();
	if (scanCache && now - scanCacheAt < SCAN_TTL_MS) return scanCache;
	const result = /* @__PURE__ */ new Map();
	try {
		const dir = sessionsDir();
		for (const f of node_fs.readdirSync(dir)) {
			if (!f.endsWith(".json")) continue;
			try {
				const d = JSON.parse(node_fs.readFileSync(node_path.join(dir, f), "utf-8"));
				const sessionId = typeof d.sessionId === "string" ? d.sessionId : "";
				const name = typeof d.name === "string" ? d.name.trim() : "";
				if (!sessionId || !name) continue;
				const entry = {
					name,
					nameSource: typeof d.nameSource === "string" ? d.nameSource : null,
					startedAt: typeof d.startedAt === "number" ? d.startedAt : 0
				};
				const prev = result.get(sessionId);
				if (!prev || betterEntry(entry, prev)) result.set(sessionId, entry);
			} catch {}
		}
	} catch {}
	scanCache = result;
	scanCacheAt = now;
	return result;
}
/** 取 Claude Code 列表里显示的会话标题；无记录返回 null（调用方退回自己的标题来源） */
function getClaudeSessionTitle(sessionId) {
	if (!sessionId) return null;
	return scanSessionFiles().get(sessionId)?.name ?? null;
}
//#endregion
//#region electron/main/agent-bridge.ts
init_logger();
var AGENT_SETTINGS_FILE = "agent-settings.json";
var CARD_EXPIRE_MIN_S = 10;
var CARD_EXPIRE_MAX_S = 1800;
var DEFAULT_AGENT_SETTINGS = {
	autoAllow: false,
	autoAllowSessions: [],
	cardExpireEnabled: true,
	cardExpireSeconds: 300
};
function agentSettingsFilePath() {
	const { app } = require("electron");
	return (0, node_path.join)(app.isPackaged ? app.getPath("userData") : (0, node_path.join)(__dirname, "..", ".."), AGENT_SETTINGS_FILE);
}
function loadAgentSettings() {
	try {
		const data = node_fs.default.readFileSync(agentSettingsFilePath(), "utf-8");
		const parsed = JSON.parse(data);
		return {
			autoAllow: typeof parsed.autoAllow === "boolean" ? parsed.autoAllow : DEFAULT_AGENT_SETTINGS.autoAllow,
			autoAllowSessions: Array.isArray(parsed.autoAllowSessions) ? parsed.autoAllowSessions.filter((s) => typeof s === "string" && s.length > 0) : DEFAULT_AGENT_SETTINGS.autoAllowSessions,
			cardExpireEnabled: typeof parsed.cardExpireEnabled === "boolean" ? parsed.cardExpireEnabled : DEFAULT_AGENT_SETTINGS.cardExpireEnabled,
			cardExpireSeconds: typeof parsed.cardExpireSeconds === "number" && Number.isFinite(parsed.cardExpireSeconds) ? Math.min(CARD_EXPIRE_MAX_S, Math.max(CARD_EXPIRE_MIN_S, Math.round(parsed.cardExpireSeconds))) : DEFAULT_AGENT_SETTINGS.cardExpireSeconds
		};
	} catch {}
	return { ...DEFAULT_AGENT_SETTINGS };
}
function saveAgentSettings(settings) {
	try {
		node_fs.default.writeFileSync(agentSettingsFilePath(), JSON.stringify(settings), "utf-8");
	} catch (e) {
		logger_default.warn("[AgentBridge] save agent settings failed:", e?.message ?? e);
	}
}
function createAgentBridge(config = {}) {
	let claudeRunningCache = null;
	let claudeRunningCacheAt = 0;
	const CLAUDE_RUNNING_TTL = 3e4;
	function checkClaudeRunning() {
		const now = Date.now();
		if (claudeRunningCache !== null && now - claudeRunningCacheAt < CLAUDE_RUNNING_TTL) return claudeRunningCache;
		try {
			const { execSync } = require("child_process");
			claudeRunningCache = execSync("tasklist /NH /FI \"IMAGENAME eq claude.exe\"", {
				encoding: "utf8",
				timeout: 2e3
			}).includes("claude.exe");
		} catch {
			claudeRunningCache = false;
		}
		claudeRunningCacheAt = now;
		return claudeRunningCache;
	}
	const stateMachine = createAgentStateMachine({ isClaudeRunning: checkClaudeRunning });
	const server = createAgentServer(stateMachine, { getHeadTimeoutMs: () => cardExpireEnabled ? cardExpireSeconds * 1e3 : 0 });
	const hookManager = createClaudeHookManager(() => server.getPort());
	let stateListener = null;
	let cardListener = null;
	const persistedSettings = loadAgentSettings();
	let autoAllow = persistedSettings.autoAllow;
	let autoAllowSessions = persistedSettings.autoAllowSessions;
	let cardExpireEnabled = persistedSettings.cardExpireEnabled;
	let cardExpireSeconds = persistedSettings.cardExpireSeconds;
	function persistSettings() {
		saveAgentSettings({
			autoAllow,
			autoAllowSessions,
			cardExpireEnabled,
			cardExpireSeconds
		});
	}
	stateMachine.subscribe((state, sessions) => {
		if (!stateListener) return;
		const enriched = sessions.map((s) => {
			const name = getClaudeSessionTitle(s.sessionId);
			return name && name !== s.title ? {
				...s,
				title: name
			} : s;
		});
		stateListener(state, enriched);
	});
	server.setOnCardChange((card) => {
		if (card && card.kind === "permission") {
			const selective = autoAllowSessions.includes(card.sessionId);
			if (autoAllow || selective) {
				logger_default.info(`[AgentBridge] auto-allow permission: tool=${card.toolName}, session=${card.sessionId}, global=${autoAllow}, selective=${selective}`);
				server.resolvePendingPermission("allow");
				return;
			}
		}
		if (cardListener) cardListener(card);
	});
	async function start() {
		stateMachine.start();
		if (await server.start() !== null) {
			if (config.autoInstallHooks !== false) {
				const result = hookManager.install();
				if (result.added) logger_default.info("Claude Code hooks installed");
				if (result.updated) logger_default.info("Claude Code hooks updated");
			}
			if (config.autoStartWatcher !== false && hookManager.isInstalled()) hookManager.startWatcher();
		}
	}
	function stop() {
		hookManager.stopWatcher();
		stateMachine.stop();
		server.stop();
	}
	function getServer() {
		return server;
	}
	function getStateMachine() {
		return stateMachine;
	}
	function getHookManager() {
		return hookManager;
	}
	function setStateListener(listener) {
		stateListener = listener;
	}
	function setCardListener(listener) {
		cardListener = listener;
	}
	function resolvePermission(behavior) {
		server.resolvePendingPermission(behavior);
	}
	function dismissQuestion() {
		server.dismissQuestion();
	}
	function submitQuestion(sessionId, answers) {
		server.submitQuestion(sessionId, answers);
	}
	function installHooks() {
		hookManager.install();
	}
	function uninstallHooks() {
		hookManager.uninstall();
	}
	function setAutoAllow(enabled) {
		autoAllow = enabled;
		persistSettings();
		logger_default.info(`[AgentBridge] autoAllow=${enabled} (persisted)`);
	}
	function getAutoAllow() {
		return autoAllow;
	}
	function getAutoAllowSessions() {
		return [...autoAllowSessions];
	}
	function setAutoAllowSession(sessionId, enabled) {
		const set = new Set(autoAllowSessions);
		if (enabled) set.add(sessionId);
		else set.delete(sessionId);
		autoAllowSessions = Array.from(set);
		persistSettings();
		logger_default.info(`[AgentBridge] setAutoAllowSession: session=${sessionId}, enabled=${enabled}, count=${autoAllowSessions.length} (persisted)`);
		return [...autoAllowSessions];
	}
	function setCardExpire(enabled, seconds) {
		cardExpireEnabled = !!enabled;
		cardExpireSeconds = Math.min(CARD_EXPIRE_MAX_S, Math.max(CARD_EXPIRE_MIN_S, Math.round(Number(seconds) || DEFAULT_AGENT_SETTINGS.cardExpireSeconds)));
		persistSettings();
		server.restartHeadTimer();
		logger_default.info(`[AgentBridge] setCardExpire: enabled=${cardExpireEnabled}, seconds=${cardExpireSeconds} (persisted)`);
	}
	function getCardExpire() {
		return {
			enabled: cardExpireEnabled,
			seconds: cardExpireSeconds
		};
	}
	function getStatus() {
		const sessionsRaw = stateMachine.getSessions();
		const realCount = sessionsRaw.length;
		const displayState = stateMachine.getCurrentState();
		const sessionIds = sessionsRaw.map((s) => s.sessionId).join(",");
		logger_default.info(`[AgentBridge] getStatus: real_count=${realCount}, ids=[${sessionIds}], display=${displayState}`);
		const sessionCount = stateMachine.getSessions().length;
		const cRunning = checkClaudeRunning();
		return {
			serverRunning: server.getPort() !== null,
			port: server.getPort(),
			hookInstalled: hookManager.isInstalled(),
			hookManagerStatus: hookManager.getStatus(),
			displayState,
			currentCard: server.getSafeCurrentCard(),
			sessionCount,
			claudeRunning: cRunning
		};
	}
	return {
		start,
		stop,
		getServer,
		getStateMachine,
		getHookManager,
		getStatus,
		setStateListener,
		setCardListener,
		resolvePermission,
		dismissQuestion,
		submitQuestion,
		installHooks,
		uninstallHooks,
		setAutoAllow,
		getAutoAllow,
		getAutoAllowSessions,
		setAutoAllowSession,
		setCardExpire,
		getCardExpire
	};
}
//#endregion
//#region electron/main/local-video-protocol.ts
var SCHEME = "local-video";
/** 必须在 app.ready 之前调用：注册 scheme 为 privileged（支持流式/Range/cookie）。 */
function registerLocalVideoScheme() {
	electron.protocol.registerSchemesAsPrivileged([{
		scheme: SCHEME,
		privileges: {
			standard: true,
			secure: true,
			supportFetchAPI: true,
			stream: true
		}
	}]);
}
/** 在 app.ready 之后调用：实现协议 handler，按 Range 返回文件流。 */
function registerLocalVideoProtocol() {
	electron.protocol.handle(SCHEME, (request) => {
		const url = new URL(request.url);
		let filePath = decodeURIComponent(url.pathname).replace(/^\//, "");
		const range = request.headers.get("range");
		let size = 0;
		try {
			size = (0, node_fs.statSync)(filePath).size;
		} catch {
			return new Response("File not found: " + filePath, { status: 404 });
		}
		const ext = (0, node_path.extname)(filePath).toLowerCase();
		const mime = ext === ".mp4" ? "video/mp4" : ext === ".webm" ? "video/webm" : "application/octet-stream";
		if (range) {
			const m = /bytes=(\d*)-(\d*)/.exec(range);
			const start = m && m[1] ? parseInt(m[1], 10) : 0;
			const end = m && m[2] ? parseInt(m[2], 10) : size - 1;
			const cappedEnd = Math.min(end, size - 1);
			const stream = (0, node_fs.createReadStream)(filePath, {
				start,
				end: cappedEnd
			});
			return new Response(node_stream.Readable.toWeb(stream), {
				status: 206,
				headers: {
					"Content-Range": `bytes ${start}-${cappedEnd}/${size}`,
					"Accept-Ranges": "bytes",
					"Content-Length": String(cappedEnd - start + 1),
					"Content-Type": mime
				}
			});
		}
		const stream = (0, node_fs.createReadStream)(filePath);
		return new Response(node_stream.Readable.toWeb(stream), {
			status: 200,
			headers: {
				"Content-Length": String(size),
				"Content-Type": mime,
				"Accept-Ranges": "bytes"
			}
		});
	});
}
//#endregion
//#region electron/main/todo-reminders.ts
/**
* 返回「已到提醒时刻」的条目。
* 判定口径：`reminder` 非空 && `reminder <= now`(ISO 字符串可直接字典序比较，皆 UTC) && `!reminderFired`。
* 已被触发的（reminderFired=true）不再重复返回。
* 纯函数：不改动入参，返回新数组。
*/
function computeDueReminders(items, now) {
	const nowIso = new Date(now).toISOString();
	return items.filter((it) => !!it.reminder && !it.reminderFired && !(it.type === "todo" && it.done) && it.reminder <= nowIso);
}
//#endregion
//#region electron/main/todo-scheduler.ts
init_logger();
var CHECK_INTERVAL = 3e4;
var timer = null;
function checkReminders() {
	const due = computeDueReminders(loadItems(), Date.now());
	if (due.length === 0) return;
	for (const it of due) {
		const text = stripHtml(it.content).trim();
		showTodoReminder(it.type === "memo" && stripHtml(it.title).trim() ? stripHtml(it.title).trim() : text.slice(0, 24), text.slice(0, 90));
		markReminderFired(it.id);
	}
	if (!isTodoWindowVisible()) setTodoBadgeFlash(true);
}
function startTodoScheduler() {
	if (timer) return;
	checkReminders();
	timer = setInterval(checkReminders, CHECK_INTERVAL);
	logger_default.info("Todo reminder scheduler started");
}
function stopTodoScheduler() {
	if (timer) {
		clearInterval(timer);
		timer = null;
	}
	logger_default.info("Todo reminder scheduler stopped");
}
//#endregion
//#region electron/main/index.ts
init_logger();
init_i18n();
var gotSingleInstanceLock = electron.app.requestSingleInstanceLock();
ensureLogPath();
if (!gotSingleInstanceLock) {
	logger_default.warn("Another MUERZHI instance is already running, exiting.");
	process.exit(0);
} else {
	logger_default.info("Single instance lock acquired");
	electron.app.on("second-instance", () => {
		showSettingsWindow();
	});
}
registerLocalVideoScheme();
var mainWindow = null;
var aiWindow = null;
var settingsWindow = null;
var agentBridge = null;
var retryPendingTimer = null;
var VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
function getIcon() {
	const iconPath = electron.app.isPackaged ? (0, node_path.join)(process.resourcesPath, "logo.ico") : (0, node_path.join)(__dirname, "../../public/logo.ico");
	return electron.nativeImage.createFromPath(iconPath);
}
function createWindow(preloadPath) {
	mainWindow = new electron.BrowserWindow({
		icon: getIcon(),
		width: 550,
		height: 420,
		minWidth: 420,
		minHeight: 340,
		show: false,
		skipTaskbar: false,
		frame: false,
		titleBarStyle: "hidden",
		title: "二支录制",
		backgroundColor: "#eaeaec",
		webPreferences: {
			preload: preloadPath,
			contextIsolation: true,
			nodeIntegration: false,
			sandbox: false,
			backgroundThrottling: false
		}
	});
	mainWindow.on("page-title-updated", (e) => e.preventDefault());
	if (VITE_DEV_SERVER_URL) mainWindow.loadURL(VITE_DEV_SERVER_URL);
	else mainWindow.loadFile((0, node_path.join)(process.env.DIST, "index.html"));
	mainWindow.on("close", (e) => {
		if (!electron.app.isQuitting) {
			e.preventDefault();
			mainWindow?.webContents.send("app-main-window-close");
			mainWindow?.hide();
		}
	});
}
electron.app.on("gpu-process-crashed", (_event, details) => {
	logger_default.error("GPU process crashed:", JSON.stringify(details));
});
electron.app.whenReady().then(() => {
	process.env.DIST = (0, node_path.join)(__dirname, "../../dist");
	process.env.VITE_PUBLIC = electron.app.isPackaged ? process.env.DIST : (0, node_path.join)(__dirname, "../../public");
	registerLocalVideoProtocol();
	ensureLogPath();
	logger_default.info("App starting...");
	setRegistryLogger(logger_default);
	setHwEncoderLogger(logger_default);
	setStateMachineLogger(logger_default);
	setCoolingLogger(logger_default);
	recoverCoolingResidue();
	setI18nLocale(getBallSettings().locale);
	const preloadPath = (0, node_path.join)(__dirname, "..", "preload", "index.cjs");
	try {
		electron.session.defaultSession.clearCache();
	} catch (e) {
		logger_default.warn("clearCache() failed:", e);
	}
	agentBridge = createAgentBridge({
		autoInstallHooks: true,
		autoStartWatcher: true
	});
	agentBridge.start().catch((err) => {
		logger_default.error("Agent bridge start failed:", err?.message ?? err);
	});
	registerIpcHandlers(agentBridge);
	createWindow(preloadPath);
	(0, import_region_selector.setMainWindow)(mainWindow);
	(0, import_tray.createTray)();
	registerGlobalShortcuts(mainWindow);
	showFloatingBallIfVisible();
	reportIP();
	registerTodoBadgeHandlers();
	startTodoScheduler();
	refreshTodoBadge();
	syncStickyNotes();
	try {
		const ballSettings = getBallSettings();
		electron.app.setLoginItemSettings({ openAtLogin: ballSettings.openAtLogin });
	} catch (e) {
		logger_default.error("Sync openAtLogin on startup failed:", e);
	}
	electron.ipcMain.handle("show-ai-window", () => {
		showAiWindow();
	});
	electron.ipcMain.handle("show-settings-window", () => {
		showSettingsWindow();
	});
	electron.ipcMain.handle("get-app-i18n", () => getAppI18nBundle());
	electron.ipcMain.handle("show-main-window", () => {
		if (mainWindow && !mainWindow.isDestroyed()) {
			mainWindow.show();
			mainWindow.focus();
		}
	});
	process.on("clawd-show-record-window", () => {
		if (mainWindow && !mainWindow.isDestroyed()) {
			mainWindow.show();
			mainWindow.focus();
		}
	});
	process.on("clawd-show-ai-window", () => {
		showAiWindow();
	});
	process.on("clawd-show-settings-window", () => {
		showSettingsWindow();
	});
	process.on("clawd-show-todo-window", () => {
		showTodoWindow();
	});
	retryPendingTimer = setInterval(retryPending, 3e4);
	electron.app.on("activate", () => {
		if (electron.BrowserWindow.getAllWindows().length === 0) createWindow(preloadPath);
	});
});
electron.app.on("window-all-closed", () => {});
electron.app.on("before-quit", () => {
	electron.app.isQuitting = true;
	for (const win of electron.BrowserWindow.getAllWindows()) if (!win.isDestroyed()) try {
		win.webContents.send("app-before-quit");
	} catch {}
	(0, import_region_selector.hideRegionBorder)();
	(0, import_region_selector.hideFloatingIsland)();
	(0, import_region_selector.hideCameraPreview)();
	hideFloatingBall();
	agentBridge?.stop();
	hideAiIsland();
	killAllConversions();
	cancelCooling();
	hideCoolingOverlay();
	stopTodoScheduler();
	closeTodoWindow();
	hideTodoReminder();
	closeAllStickyNotes();
	unregisterGlobalShortcuts();
	(0, import_tray.destroyTray)();
	if (retryPendingTimer) {
		clearInterval(retryPendingTimer);
		retryPendingTimer = null;
	}
	mainWindow = null;
	aiWindow = null;
	settingsWindow = null;
});
function showAiWindow() {
	if (aiWindow && !aiWindow.isDestroyed()) {
		aiWindow.show();
		aiWindow.focus();
		return;
	}
	const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
	const preloadPath = (0, node_path.join)(__dirname, "..", "preload", "index.cjs");
	aiWindow = new electron.BrowserWindow({
		icon: getIcon(),
		width: 480,
		height: 540,
		minWidth: 400,
		minHeight: 400,
		show: false,
		skipTaskbar: false,
		frame: false,
		titleBarStyle: "hidden",
		title: t("ai.title"),
		backgroundColor: "#eaeaec",
		webPreferences: {
			preload: preloadPath,
			contextIsolation: true,
			nodeIntegration: false,
			sandbox: false
		}
	});
	aiWindow.on("page-title-updated", (e) => e.preventDefault());
	if (VITE_DEV_SERVER_URL) aiWindow.loadURL(`${VITE_DEV_SERVER_URL}#/ai?t=${Date.now()}`);
	else aiWindow.loadFile((0, node_path.join)(process.env.DIST, "index.html"), { hash: "/ai" });
	aiWindow.once("ready-to-show", () => {
		aiWindow?.show();
	});
	aiWindow.on("closed", () => {
		aiWindow = null;
	});
}
function showSettingsWindow() {
	if (settingsWindow && !settingsWindow.isDestroyed()) {
		settingsWindow.show();
		settingsWindow.focus();
		return;
	}
	const preloadPath = (0, node_path.join)(__dirname, "..", "preload", "index.cjs");
	settingsWindow = new electron.BrowserWindow({
		icon: getIcon(),
		width: 420,
		height: 480,
		minWidth: 380,
		minHeight: 420,
		show: false,
		skipTaskbar: false,
		frame: false,
		titleBarStyle: "hidden",
		title: t("settings.title"),
		backgroundColor: "#eaeaec",
		webPreferences: {
			preload: preloadPath,
			contextIsolation: true,
			nodeIntegration: false,
			sandbox: false
		}
	});
	settingsWindow.on("page-title-updated", (e) => e.preventDefault());
	if (VITE_DEV_SERVER_URL) settingsWindow.loadURL(`${VITE_DEV_SERVER_URL}#/settings?t=${Date.now()}`);
	else settingsWindow.loadFile((0, node_path.join)(process.env.DIST, "index.html"), { hash: "/settings" });
	settingsWindow.once("ready-to-show", () => {
		settingsWindow?.show();
	});
	settingsWindow.on("closed", () => {
		settingsWindow = null;
	});
}
//#endregion
