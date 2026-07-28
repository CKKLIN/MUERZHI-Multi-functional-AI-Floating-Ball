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
let node_fs = require("node:fs");
node_fs = __toESM(node_fs);
let fluent_ffmpeg = require("fluent-ffmpeg");
fluent_ffmpeg = __toESM(fluent_ffmpeg);
let _ffmpeg_installer_ffmpeg = require("@ffmpeg-installer/ffmpeg");
_ffmpeg_installer_ffmpeg = __toESM(_ffmpeg_installer_ffmpeg);
let node_os = require("node:os");
node_os = __toESM(node_os);
//#region node_modules/electron-log/src/node/packageJson.js
var require_packageJson = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var fs$5 = require("fs");
	var path$6 = require("path");
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
			const fileName = findUp("package.json", path$6.join(...searchPaths));
			if (!fileName) return;
			const json = JSON.parse(fs$5.readFileSync(fileName, "utf8"));
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
			const parsedPath = path$6.parse(currentPath);
			const root = parsedPath.root;
			const dir = parsedPath.dir;
			if (fs$5.existsSync(path$6.join(currentPath, fileName))) return path$6.resolve(path$6.join(currentPath, fileName));
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
	var os$4 = require("os");
	var path$5 = require("path");
	var packageJson = require_packageJson();
	var NodeExternalApi = class {
		appName = void 0;
		appPackageJson = void 0;
		platform = process.platform;
		getAppLogPath(appName = this.getAppName()) {
			if (this.platform === "darwin") return path$5.join(this.getSystemPathHome(), "Library/Logs", appName);
			return path$5.join(this.getAppUserDataPath(appName), "logs");
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
			return appName ? path$5.join(this.getSystemPathAppData(), appName) : void 0;
		}
		getAppVersion() {
			return this.getAppPackageJson()?.version;
		}
		getElectronLogPath() {
			return this.getAppLogPath();
		}
		getMacOsVersion() {
			const release = Number(os$4.release().split(".")[0]);
			if (release <= 19) return `10.${release - 4}`;
			return release - 9;
		}
		/**
		* @protected
		* @returns {string}
		*/
		getOsVersion() {
			let osName = os$4.type().replace("_", " ");
			let osVersion = os$4.release();
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
				case "darwin": return path$5.join(home, "Library/Application Support");
				case "win32": return process.env.APPDATA || path$5.join(home, "AppData/Roaming");
				default: return process.env.XDG_CONFIG_HOME || path$5.join(home, ".config");
			}
		}
		getSystemPathHome() {
			return os$4.homedir?.() || process.env.HOME;
		}
		getSystemPathTemp() {
			return os$4.tmpdir();
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
	var path$4 = require("path");
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
			if (typeof process.execPath === "string") return path$4.basename(process.execPath).toLowerCase().startsWith("electron");
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
	var fs$4 = require("fs");
	var os$3 = require("os");
	var path$3 = require("path");
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
			preloadPath = path$3.resolve(__dirname, "../renderer/electron-log-preload.js");
		} catch {}
		if (!preloadPath || !fs$4.existsSync(preloadPath)) {
			preloadPath = path$3.join(externalApi.getAppUserDataPath() || os$3.tmpdir(), "electron-log-preload.js");
			const preloadCode = `
      try {
        (${preloadInitializeFn.toString()})(require('electron'));
      } catch(e) {
        console.error(e);
      }
    `;
			fs$4.writeFileSync(preloadPath, preloadCode, "utf8");
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
	var fs$3 = require("fs");
	var os$2 = require("os");
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
				fs$3.writeFileSync(this.path, "", {
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
				this.writeLine(`[log cropped]${os$2.EOL}${content}`);
			} catch (e) {
				this.emit("error", /* @__PURE__ */ new Error(`Couldn't crop file ${this.path}. ${e.message}`), this);
			}
		}
		getSize() {
			if (this.initialSize === void 0) try {
				const stats = fs$3.statSync(this.path);
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
			fs$3.writeFile(this.path, text, this.writeOptions, (e) => {
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
			text += os$2.EOL;
			if (this.writeAsync) {
				this.asyncWriteQueue.push(text);
				this.nextAsyncWrite();
				return;
			}
			try {
				fs$3.writeFileSync(this.path, text, this.writeOptions);
				this.increaseBytesWrittenCounter(text);
			} catch (e) {
				this.emit("error", /* @__PURE__ */ new Error(`Couldn't write to ${this.path}. ${e.message}`), this);
			}
		}
	};
	module.exports = File;
	function readFileSyncFromEnd(filePath, bytesCount) {
		const buffer = Buffer.alloc(bytesCount);
		const stats = fs$3.statSync(filePath);
		const readLength = Math.min(stats.size, bytesCount);
		const offset = Math.max(0, stats.size - bytesCount);
		const fd = fs$3.openSync(filePath, "r");
		const totalBytes = fs$3.readSync(fd, buffer, 0, readLength, offset);
		fs$3.closeSync(fd);
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
	var fs$2 = require("fs");
	var path$2 = require("path");
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
				filePath = path$2.resolve(filePath);
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
			fs$2.mkdirSync(path$2.dirname(filePath), { recursive: true });
			fs$2.writeFileSync(filePath, "", {
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
	var fs$1 = require("fs");
	var os$1 = require("os");
	var path$1 = require("path");
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
				const inf = path$1.parse(oldPath);
				try {
					fs$1.renameSync(oldPath, path$1.join(inf.dir, `${inf.name}.old${inf.ext}`));
				} catch (e) {
					logConsole("Could not rotate log", e);
					const quarterOfMaxSize = Math.round(transport.maxSize / 4);
					file.crop(Math.min(quarterOfMaxSize, 256 * 1024));
				}
			},
			resolvePathFn(vars) {
				return path$1.join(vars.libraryDefaultDir, vars.fileName);
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
			const logsPath = path$1.dirname(transport.resolvePathFn(pathVariables));
			if (!fs$1.existsSync(logsPath)) return [];
			return fs$1.readdirSync(logsPath).map((fileName) => path$1.join(logsPath, fileName)).filter(fileFilter).map((logPath) => {
				try {
					return {
						path: logPath,
						lines: fs$1.readFileSync(logPath, "utf8").split(os$1.EOL)
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
	var http = require("http");
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
				const request = (serverUrl.startsWith("https:") ? https : http).request(serverUrl, {
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
//#region electron/main/ffmpeg.ts
init_logger();
var ffmpegBinPath = electron.app.isPackaged ? node_path.default.join(process.resourcesPath, "ffmpeg.exe") : _ffmpeg_installer_ffmpeg.default.path;
fluent_ffmpeg.default.setFfmpegPath(ffmpegBinPath);
var NUM_THREADS = Math.min(node_os.default.cpus().length, 8);
function convertWebmToMp4(inputPath, outputPath, onProgress, crop) {
	if (!crop) return new Promise((resolve) => {
		(0, fluent_ffmpeg.default)(inputPath).outputOptions([
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
			onProgress?.({
				percent: 100,
				targetSize: 0
			});
			resolve({
				success: true,
				outputPath
			});
		}).on("error", (err) => {
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
	return new Promise((resolve) => {
		(0, fluent_ffmpeg.default)(inputPath).outputOptions([
			"-c:v libx264",
			"-preset ultrafast",
			"-crf 23",
			"-threads",
			String(NUM_THREADS),
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
			(0, fluent_ffmpeg.default)(tmpPath).addInput(inputPath).outputOptions([
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
				node_fs.default.promises.unlink(tmpPath).catch(() => {});
				resolve({
					success: true,
					outputPath
				});
			}).on("error", (err) => {
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
		}).on("error", (err) => {
			logger_default.error("MP4 conversion failed:", err.message);
			resolve({
				success: false,
				outputPath: "",
				error: err.message
			});
		}).run();
	});
}
function cropVideo(inputPath, outputPath, crop, onProgress) {
	const w = Math.round(crop.width / 2) * 2;
	const h = Math.round(crop.height / 2) * 2;
	const cx = Math.round(crop.x / 2) * 2;
	const cy = Math.round(crop.y / 2) * 2;
	return new Promise((resolve) => {
		(0, fluent_ffmpeg.default)(inputPath).outputOptions([
			"-c:v",
			"libx264",
			"-preset",
			"ultrafast",
			"-crf",
			"18",
			"-threads",
			String(NUM_THREADS),
			"-vf",
			`crop=${w}:${h}:${cx}:${cy},format=yuv420p`,
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
			resolve({
				success: true,
				outputPath
			});
		}).on("error", (err) => {
			logger_default.error("Crop failed:", err.message);
			resolve({
				success: false,
				outputPath: "",
				error: err.message
			});
		}).run();
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
		let remuxDone = 0;
		const totalInputs = inputs.length;
		for (let i = 0; i < totalInputs; i++) {
			const remuxedPath = inputs[i].filePath.replace(/\.webm$/i, "_remux.mp4");
			remuxedPaths.push(remuxedPath);
			(0, fluent_ffmpeg.default)(inputs[i].filePath).outputOptions(["-c", "copy"]).output(remuxedPath).on("end", () => {
				logger_default.info(`Merge remux ${i + 1}/${totalInputs} done`);
				remuxDone++;
				if (remuxDone === totalInputs) doMerge();
			}).on("error", (err) => {
				logger_default.error(`Merge remux ${i + 1} failed:`, err.message);
				remuxDone++;
				if (remuxDone === totalInputs) doMerge();
			}).run();
		}
		function doMerge() {
			const cmd = (0, fluent_ffmpeg.default)();
			for (const p of remuxedPaths) cmd.addInput(p);
			const filters = [];
			filters.push(`color=c=black:s=${cw}x${ch}[bg]`);
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
				filters.push(`${prevLabel}${scaledLabel}overlay=${dx}:${dy}${outLabel}`);
				prevLabel = outLabel;
			}
			filters.push("[out]format=yuv420p");
			logger_default.info("Merge filter_complex:", filters.join(";"));
			cmd.complexFilter(filters).outputOptions([
				"-c:v",
				"libx264",
				"-preset",
				"ultrafast",
				"-crf",
				"23",
				"-threads",
				String(NUM_THREADS),
				"-movflags",
				"+faststart"
			]).output(outputPath).on("start", (cmdLine) => {
				logger_default.info("Merge ffmpeg command started");
			}).on("progress", (progress) => {
				onProgress?.({
					percent: Math.round(progress.percent ?? 0),
					targetSize: progress.targetSize ?? 0
				});
			}).on("end", () => {
				logger_default.info("Merge completed successfully");
				for (const inp of inputs) node_fs.default.promises.unlink(inp.filePath).catch(() => {});
				for (const p of remuxedPaths) node_fs.default.promises.unlink(p).catch(() => {});
				resolve({
					success: true,
					outputPath
				});
			}).on("error", (err) => {
				logger_default.error("Multi-screen merge failed:", err.message);
				for (const inp of inputs) node_fs.default.promises.unlink(inp.filePath).catch(() => {});
				for (const p of remuxedPaths) node_fs.default.promises.unlink(p).catch(() => {});
				resolve({
					success: false,
					outputPath: "",
					error: err.message
				});
			}).run();
		}
	});
}
function convertToGif(inputPath, outputPath, options, onProgress) {
	const { execFile } = require("node:child_process");
	const ffmpegBin = _ffmpeg_installer_ffmpeg.default.path;
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
		execFile(ffmpegBin, args1, (err1) => {
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
	});
}
//#endregion
//#region electron/main/region-selector.ts
var require_region_selector = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	init_logger();
	var mainWindow = null;
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
	var keepTopInterval = null;
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
			cameraPreviewWindow.close();
			cameraPreviewWindow = null;
		}
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
  background:rgba(20,20,40,0.88);
  border-radius:22px;
  display:flex;align-items:center;justify-content:center;gap:8px;
  backdrop-filter:blur(12px);
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
</style></head><body>
<div class="island" id="island">
  <span class="recording-dot" id="dot" style="display:none"></span>
  <span class="timer" id="timer">00:00</span>
  <div class="btn-group">
    <button id="micBtn" title="麦克风" onclick="doToggleMic()">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
    </button>
    <div class="meter-group" id="micMeter"></div>
  </div>
  <!-- <div class="btn-group">
    <button id="sysBtn" title="系统音频" onclick="doToggleSys()">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
    </button>
    <div class="meter-group" id="sysMeter"></div>
  </div> -->
  <div class="btn-group">
    <button id="camBtn" title="摄像头" onclick="doToggleCam()">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
    </button>
  </div>
  <div class="sep"></div>
  <button class="action-btn start-btn" id="startBtn" onclick="doStart()">
    <svg width="10" height="10" viewBox="0 0 12 12"><circle cx="6" cy="6" r="5" fill="currentColor"/></svg>
    <span>录制</span>
  </button>
  <button class="stop-btn" id="stopBtn" style="display:none" onclick="doStop()" title="停止">
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="1"/></svg>
  </button>
  <button class="pause-btn" id="pauseBtn" style="display:none" onclick="doPause()" title="暂停">
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
  </button>
  <button id="resumeBtn" style="display:none" onclick="doResume()" title="继续">
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>
  </button>
  <button class="close-btn" onclick="doClose()" title="取消">
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>
  </button>
</div>
<script>
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
  ipcRenderer.send('resize-island',w)
}
const ro=new ResizeObserver(()=>resizeIsland())
ro.observe(document.getElementById('island'))
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
		}, 250);
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
  background:rgba(20,20,40,0.92);
  border-radius:8px 8px 0 0;
  display:flex;align-items:center;justify-content:center;gap:6px;
  padding:0 10px;
  backdrop-filter:blur(8px);
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
.toolbar.minimal{width:fit-content;height:40px!important;border-radius:22px;background:rgba(20,20,40,0.88);border:1px solid rgba(255,255,255,0.08);backdrop-filter:blur(12px);padding:0 10px}
.toolbar.minimal .audio-toggle,.toolbar.minimal .meter-group,.toolbar.minimal .sep,.toolbar.minimal .size-label,.toolbar.minimal .close-btn{display:none!important}
</style></head><body>
<div class="toolbar" id="toolbar" data-pos="${tbPos}">
  <span class="recording-dot" id="dot"></span>
  <span class="timer" id="timer">00:00</span>
  <button class="audio-toggle" id="micBtn" title="麦克风" onclick="doToggleMic()">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
  </button>
  <div class="meter-group" id="micMeter"></div>
  <!-- <button class="audio-toggle" id="sysBtn" title="系统音频" onclick="doToggleSys()">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
  </button>
  <div class="meter-group" id="sysMeter"></div> -->
  <button class="audio-toggle" id="camBtn" title="摄像头" onclick="doToggleCam()">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
  </button>
  <div class="sep"></div>
  <button class="rec" id="startBtn" onclick="doStart()" title="开始录制">
    <svg width="12" height="12" viewBox="0 0 12 12"><circle cx="6" cy="6" r="5" fill="currentColor"/></svg>
    <span>录制</span>
  </button>
  <button class="stop-btn" id="stopBtn" style="display:none" onclick="doStop()" title="停止">
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="1"/></svg>
  </button>
  <button class="pause-btn" id="pauseBtn" style="display:none" onclick="doPause()" title="暂停">
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
  </button>
  <button id="resumeBtn" style="display:none" onclick="doResume()" title="继续">
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>
  </button>
  <span class="size-label" id="sizeLabel">${region.width}×${region.height}</span>
  <button class="close-btn" onclick="doClose()" title="关闭并停止录制">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>
  </button>
</div>
<script>
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
		if (keepTopInterval) clearInterval(keepTopInterval);
		keepTopInterval = setInterval(() => {
			if (borderWindow && !borderWindow.isDestroyed()) borderWindow.setAlwaysOnTop(true, "screen-saver");
			if (toolbarWindow && !toolbarWindow.isDestroyed()) toolbarWindow.setAlwaysOnTop(true, "screen-saver");
			if (cameraPreviewWindow && !cameraPreviewWindow.isDestroyed()) cameraPreviewWindow.setAlwaysOnTop(true, "screen-saver");
		}, 5e3);
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
		if (keepTopInterval) {
			clearInterval(keepTopInterval);
			keepTopInterval = null;
		}
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
		electron.ipcMain.on("resize-island", (_event, contentWidth) => {
			if (floatingIsland && !floatingIsland.isDestroyed()) {
				const bounds = islandTargetBounds || electron.screen.getPrimaryDisplay().bounds;
				const totalW = contentWidth + 20;
				const newX = Math.round(bounds.x + (bounds.width - totalW) / 2);
				floatingIsland.setBounds({
					x: newX,
					y: bounds.y + 4,
					width: totalW,
					height: 44
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
//#region electron/main/floating-ball.ts
var import_region_selector = require_region_selector();
init_logger();
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
		alwaysOnTop: true,
		skipTaskbar: true,
		hasShadow: false,
		show: false,
		webPreferences: {
			nodeIntegration: true,
			contextIsolation: false
		}
	});
	floatingBallWindow.setVisibleOnAllWorkspaces(true);
	floatingBallWindow.setAlwaysOnTop(true, "screen-saver");
	const html = buildFloatingBallHtml();
	floatingBallWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
	floatingBallWindow.once("ready-to-show", () => {
		floatingBallWindow?.show();
		if (floatingBallWindow && !floatingBallWindow.isDestroyed()) floatingBallWindow.webContents.executeJavaScript("ensureMenu()").catch(() => {});
	});
	floatingBallWindow.on("closed", () => {
		floatingBallWindow = null;
	});
	floatingBallWindow.on("move", () => {
		if (floatingBallWindow && !floatingBallWindow.isDestroyed()) {
			const [bx, by] = floatingBallWindow.getPosition();
			ballPos = {
				x: bx,
				y: by
			};
		}
	});
	floatingBallWindow.on("close", () => {
		if (ballPos) saveBallPosition(ballPos);
	});
	logger_default.info("Floating ball shown");
}
function hideFloatingBall() {
	if (floatingBallWindow && !floatingBallWindow.isDestroyed()) {
		const [bx, by] = floatingBallWindow.getPosition();
		ballPos = {
			x: bx,
			y: by
		};
		saveBallPosition(ballPos);
		floatingBallWindow.close();
		floatingBallWindow = null;
		logger_default.info("Floating ball hidden");
	}
}
async function expandBall() {
	if (!floatingBallWindow || floatingBallWindow.isDestroyed()) return;
	const [x, y] = floatingBallWindow.getPosition();
	const cx = Math.round(x + BALL_SIZE / 2);
	const cy = Math.round(y + BALL_SIZE / 2);
	logger_default.info("[Ball] expand at", [x, y], "center", [cx, cy]);
	floatingBallWindow.setOpacity(0);
	floatingBallWindow.setBounds({
		x: cx - RING_SIZE / 2,
		y: cy - RING_SIZE / 2,
		width: RING_SIZE,
		height: RING_SIZE
	});
	try {
		await floatingBallWindow.webContents.executeJavaScript(`ensureMenu(); document.body.offsetHeight; document.body.classList.add('expanded'); isExpanded=true; void 0;`);
	} catch {}
	if (!floatingBallWindow || floatingBallWindow.isDestroyed()) return;
	try {
		await floatingBallWindow.capturePage();
	} catch {}
	if (!floatingBallWindow || floatingBallWindow.isDestroyed()) return;
	floatingBallWindow.setOpacity(1);
	floatingBallWindow.webContents.send("ball-state", "expanded");
}
async function collapseBall() {
	if (!floatingBallWindow || floatingBallWindow.isDestroyed()) return;
	const [x, y] = floatingBallWindow.getPosition();
	const cx = Math.round(x + RING_SIZE / 2);
	const cy = Math.round(y + RING_SIZE / 2);
	logger_default.info("[Ball] collapse at", [x, y], "center", [cx, cy]);
	floatingBallWindow.setOpacity(0);
	try {
		await floatingBallWindow.webContents.executeJavaScript(`document.body.classList.remove('expanded');
       var s=document.getElementById('ringSvg');while(s.firstChild){s.removeChild(s.firstChild)}
       menuCreated=false; isExpanded=false; void 0;`);
	} catch {}
	if (!floatingBallWindow || floatingBallWindow.isDestroyed()) return;
	const nx = cx - BALL_SIZE / 2;
	const ny = cy - BALL_SIZE / 2;
	floatingBallWindow.setBounds({
		x: nx,
		y: ny,
		width: BALL_SIZE,
		height: BALL_SIZE
	});
	const [ax, ay] = floatingBallWindow.getPosition();
	if (ax !== nx || ay !== ny) floatingBallWindow.setBounds({
		x: nx + (nx - ax),
		y: ny + (ny - ay),
		width: BALL_SIZE,
		height: BALL_SIZE
	});
	floatingBallWindow.setOpacity(1);
}
function forwardAction(action) {
	const mainWindow = electron.BrowserWindow.getAllWindows().find((w) => !w.isDestroyed() && w !== floatingBallWindow);
	if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send("on-floating-ball-action", action);
	collapseBall();
}
var logoBase64 = null;
function getLogoDataUrl(size = 48) {
	if (logoBase64) return logoBase64;
	try {
		const paths = [
			(0, node_path.join)(__dirname, "..", "..", "public", "logo.png"),
			(0, node_path.join)(__dirname, "..", "public", "logo.png"),
			(0, node_path.join)(__dirname, "..", "..", "resources", "logo.png")
		];
		for (const p of paths) if (node_fs.default.existsSync(p)) {
			logoBase64 = electron.nativeImage.createFromPath(p).resize({
				width: size,
				height: size,
				quality: "good"
			}).toDataURL();
			return logoBase64;
		}
	} catch {}
	return "";
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
.arc-item{
  fill:rgba(255,255,255,0.88);
  stroke:rgba(255,255,255,0.5);
  stroke-width:1px;
  cursor:pointer;
  pointer-events:none;
  opacity:0;
  transform:scale(0);
  transform-origin:120px 120px;
  transition:
    transform 0.35s cubic-bezier(0.34,1.56,0.64,1),
    opacity 0.25s ease,
    fill 0.2s ease;
}
body.expanded .arc-item{
  opacity:1;
  transform:scale(1);
  pointer-events:auto;
}
.arc-item:hover{
  fill:rgba(233,69,96,0.18);
  stroke:#e94560;
}
.arc-item:active{
  fill:rgba(233,69,96,0.28);
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
.arc-label .icon{font-size:14px;fill:#e94560}
.arc-label .label{font-size:10px;font-weight:600;fill:#5a5a6e}

/* 中心按钮 */
#trigger{
  position:absolute;z-index:10;
  width:56px;height:56px;border-radius:50%;border:none;
  background:#e8e8e8;
  cursor:pointer;
  display:flex;align-items:center;justify-content:center;
}
#trigger:hover{transform:scale(1.08)}
.logo-img{
  width:40px;height:40px;
  border-radius:50%;
  object-fit:cover;
  pointer-events:none;
}
#trigger:active{transform:scale(0.95)}
</style>
</head>
<body>
<div id="ball">
  <svg class="ring-svg" id="ringSvg" viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg">
    <!-- 圆弧段用 JS 动态创建 -->
  </svg>
  <button id="trigger">
    <img id="logoImg" class="logo-img" src="${getLogoDataUrl(48)}" alt="logo" />
  </button>
</div>

<script>
const {ipcRenderer} = require('electron')

const ITEMS = [
  {label:'全屏',icon:'⛶',action:'fullscreen'},
  {label:'区域',icon:'▣',action:'region'},
  {label:'截图',icon:'📷',action:'screenshot'},
  {label:'设置',icon:'⚙',action:'settings'},
]

let isExpanded = false
let menuCreated = false

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

function ensureMenu(){
  if(menuCreated) return
  menuCreated = true
  const svg = document.getElementById('ringSvg')
  const cx=120, cy=120, r1=34, r2=75
  const total = ITEMS.length
  const segArc = 90  // 每段 90°，无间隙
  const startOff = -135

  ITEMS.forEach(function(item, i){
    const sa = startOff + i*90
    const ea = sa + segArc
    const d = arcPath(cx, cy, r1, r2, sa, ea)

    // 圆弧路径
    const path = document.createElementNS('http://www.w3.org/2000/svg','path')
    path.setAttribute('class','arc-item')
    path.setAttribute('d',d)
    path.setAttribute('data-action',item.action)
    path.style.transitionDelay = (i*0.15)+'s'
    path.addEventListener('click',function(){
      ipcRenderer.send('floating-ball-action', this.getAttribute('data-action'))
    })
    svg.appendChild(path)

    // 文字
    const ma = (sa+ea)/2
    const mr = (r1+r2)/2
    const lx = cx + mr*Math.cos(ma*Math.PI/180)
    const ly = cy + mr*Math.sin(ma*Math.PI/180)
    const txt = document.createElementNS('http://www.w3.org/2000/svg','text')
    txt.setAttribute('class','arc-label')
    txt.setAttribute('x',lx)
    txt.setAttribute('y',ly)
    txt.style.transitionDelay = (i*0.15+0.12)+'s'
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

// === 手动拖拽 ===
let dsX = 0, dsY = 0, dragging = false

trigger.addEventListener('pointerdown', function(e){
  dsX = e.screenX; dsY = e.screenY
  dragging = false
  trigger.setPointerCapture(e.pointerId)
  ipcRenderer.send('floating-ball-drag-start', e.screenX, e.screenY)
})

trigger.addEventListener('pointermove', function(e){
  if(e.buttons !== 1) return
  if(!dragging){
    if(Math.abs(e.screenX - dsX) <= 4 && Math.abs(e.screenY - dsY) <= 4) return
    dragging = true
  }
  ipcRenderer.send('floating-ball-move', e.screenX, e.screenY)
})

trigger.addEventListener('pointerup', function(e){
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
    document.body.classList.add('expanded')
    ensureMenu()
    isExpanded=true
  } else {
    document.body.classList.remove('expanded')
    var svg = document.getElementById('ringSvg')
    while(svg.firstChild){ svg.removeChild(svg.firstChild) }
    menuCreated = false
    isExpanded=false
  }
})

// === 点击外部收起 ===
document.addEventListener('click',function(e){
  if(isExpanded && !e.target.closest('#ball')){
    ipcRenderer.send('floating-ball-collapse')
  }
})
<\/script>
</body>
</html>`;
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
	electron.ipcMain.on("floating-ball-move", (_event, sx, sy) => {
		if (!floatingBallWindow || floatingBallWindow.isDestroyed() || !dragOrigin || !dragSize) return;
		const dx = sx - dragOrigin.scrX;
		const dy = sy - dragOrigin.scrY;
		const nx = Math.round(dragOrigin.winX + dx);
		const ny = Math.round(dragOrigin.winY + dy);
		floatingBallWindow.setBounds({
			x: nx,
			y: ny,
			width: dragSize.w,
			height: dragSize.h
		});
		const [ax, ay] = floatingBallWindow.getPosition();
		if (ax !== nx || ay !== ny) floatingBallWindow.setBounds({
			x: nx + (nx - ax),
			y: ny + (ny - ay),
			width: dragSize.w,
			height: dragSize.h
		});
	});
	electron.ipcMain.on("floating-ball-drag-end", () => {
		dragOrigin = null;
		dragSize = null;
		if (ballPos) saveBallPosition(ballPos);
	});
}
//#endregion
//#region electron/main/ipc-handlers.ts
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
	function createTray$1() {
		if (tray && !tray.isDestroyed()) return;
		tray = new electron.Tray(getTrayIcon());
		tray.setToolTip("二支录制");
		const contextMenu = electron.Menu.buildFromTemplate([
			{
				label: "显示主窗口",
				click: () => {
					const win = electron.BrowserWindow.getAllWindows()[0];
					if (win) {
						win.show();
						win.focus();
					}
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
			const win = electron.BrowserWindow.getAllWindows()[0];
			if (win) {
				win.show();
				win.focus();
			}
		});
		logger_default.info("System tray created");
	}
	function showBalloon(title, content) {
		if (tray && !tray.isDestroyed()) {
			tray.displayBalloon({
				title,
				content
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
init_logger();
var { updateAudioLevels } = require_region_selector();
function getRecordingsPath() {
	return (0, node_path.join)(electron.app.getPath("userData"), "recordings.json");
}
function registerIpcHandlers() {
	(0, import_region_selector.registerRegionSelectorHandlers)();
	registerFloatingBallHandlers();
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
		electron.BrowserWindow.fromWebContents(event.sender)?.close();
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
	logger_default.info("Some pending reports still failed, remaining:", failed.length);
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
	const pending = loadPending();
	if (pending.length > 0) {
		logger_default.info("Retrying pending reports:", pending.length);
		flushPending();
	}
}
//#endregion
//#region electron/main/index.ts
init_logger();
var mainWindow = null;
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
	if (VITE_DEV_SERVER_URL) mainWindow.loadURL(VITE_DEV_SERVER_URL);
	else mainWindow.loadFile((0, node_path.join)(process.env.DIST, "index.html"));
	mainWindow.on("close", (e) => {
		if (!electron.app.isQuitting) {
			e.preventDefault();
			electron.app.isQuitting = true;
			mainWindow.webContents.send("app-before-quit");
			setTimeout(() => {
				unregisterGlobalShortcuts();
				(0, import_tray.destroyTray)();
				mainWindow = null;
				electron.app.quit();
			}, 300);
		}
	});
}
electron.app.on("gpu-process-crashed", (_event, details) => {
	logger_default.error("GPU process crashed:", JSON.stringify(details));
});
electron.app.whenReady().then(() => {
	process.env.DIST = (0, node_path.join)(__dirname, "../../dist");
	process.env.VITE_PUBLIC = electron.app.isPackaged ? process.env.DIST : (0, node_path.join)(__dirname, "../../public");
	ensureLogPath();
	logger_default.info("App starting...");
	const preloadPath = (0, node_path.join)(__dirname, "..", "preload", "index.cjs");
	registerIpcHandlers();
	createWindow(preloadPath);
	(0, import_region_selector.setMainWindow)(mainWindow);
	(0, import_tray.createTray)();
	registerGlobalShortcuts(mainWindow);
	showFloatingBall();
	reportIP();
	setInterval(retryPending, 3e4);
	electron.app.on("activate", () => {
		if (electron.BrowserWindow.getAllWindows().length === 0) createWindow(preloadPath);
	});
});
electron.app.on("window-all-closed", () => {});
electron.app.on("before-quit", () => {
	electron.app.isQuitting = true;
	unregisterGlobalShortcuts();
	(0, import_tray.destroyTray)();
	mainWindow = null;
});
//#endregion
