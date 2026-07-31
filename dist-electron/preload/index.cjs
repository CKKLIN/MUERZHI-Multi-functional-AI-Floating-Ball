let electron = require("electron");
let node_fs_promises = require("node:fs/promises");
let node_path = require("node:path");
//#region electron/preload/index.ts
electron.contextBridge.exposeInMainWorld("electronAPI", {
	getSources: (types) => electron.ipcRenderer.invoke("get-sources", types),
	getSystemAudioSources: () => electron.ipcRenderer.invoke("get-system-audio-sources"),
	showSaveDialog: (options) => electron.ipcRenderer.invoke("show-save-dialog", options),
	showOpenDialog: (options) => electron.ipcRenderer.invoke("show-open-dialog", options),
	getDefaultSaveDir: () => electron.ipcRenderer.invoke("get-default-save-dir"),
	writeFile: async (data, filePath) => {
		try {
			await (0, node_fs_promises.mkdir)((0, node_path.dirname)(filePath), { recursive: true });
			await (0, node_fs_promises.writeFile)(filePath, new Uint8Array(data));
			return {
				success: true,
				filePath
			};
		} catch (err) {
			console.error("保存文件失败", filePath, err?.message);
			return {
				success: false,
				filePath,
				error: err?.message
			};
		}
	},
	toLocalVideoUrl: (filePath) => `local-video:///${filePath.replace(/\\/g, "/")}`,
	readFile: (filePath) => electron.ipcRenderer.invoke("read-file", filePath),
	fileExists: (filePath) => electron.ipcRenderer.invoke("file-exists", filePath),
	deleteFile: (filePath) => electron.ipcRenderer.invoke("delete-file", filePath),
	getFileSize: (filePath) => electron.ipcRenderer.invoke("get-file-size", filePath),
	convertToMp4: (inputPath, outputPath, crop) => electron.ipcRenderer.invoke("convert-to-mp4", inputPath, outputPath, crop),
	cropVideo: (inputPath, outputPath, crop) => electron.ipcRenderer.invoke("crop-video", inputPath, outputPath, crop),
	convertToGif: (inputPath, outputPath, options) => electron.ipcRenderer.invoke("convert-to-gif", inputPath, outputPath, options),
	mergeMultiScreen: (inputs, outputPath) => electron.ipcRenderer.invoke("merge-multi-screen", inputs, outputPath),
	onConversionProgress: (callback) => {
		const handler = (_event, progress) => callback(progress);
		electron.ipcRenderer.on("on-conversion-progress", handler);
		return () => electron.ipcRenderer.removeListener("on-conversion-progress", handler);
	},
	onGlobalShortcut: (callback) => {
		const handler = (_event, action) => callback(action);
		electron.ipcRenderer.on("on-global-shortcut", handler);
		return () => electron.ipcRenderer.removeListener("on-global-shortcut", handler);
	},
	onMainProcessMessage: (callback) => {
		const handler = (_event, message) => callback(message);
		electron.ipcRenderer.on("main-process-message", handler);
		return () => electron.ipcRenderer.removeListener("main-process-message", handler);
	},
	onBeforeQuit: (callback) => {
		const handler = () => callback();
		electron.ipcRenderer.on("app-before-quit", handler);
		return () => electron.ipcRenderer.removeListener("app-before-quit", handler);
	},
	openFileLocation: (filePath) => electron.ipcRenderer.invoke("open-file-location", filePath),
	openExternal: (url) => electron.ipcRenderer.invoke("open-external", url),
	openPath: (filePath) => electron.ipcRenderer.invoke("open-path", filePath),
	getAppVersion: () => electron.ipcRenderer.invoke("get-app-version"),
	showAboutWindow: () => electron.ipcRenderer.send("show-about-window"),
	closeAboutWindow: () => electron.ipcRenderer.send("close-about-window"),
	minimizeWindow: () => electron.ipcRenderer.invoke("minimize-window"),
	showWindow: () => electron.ipcRenderer.invoke("show-window"),
	maximizeWindow: () => electron.ipcRenderer.invoke("maximize-window"),
	closeWindow: () => electron.ipcRenderer.invoke("close-window"),
	notifyConversionStart: () => electron.ipcRenderer.send("notify-conversion-start"),
	notifyConversionDone: (filePath) => electron.ipcRenderer.send("notify-conversion-done", filePath),
	getScreenScaleFactor: () => electron.ipcRenderer.invoke("get-screen-scale-factor"),
	getScreenBounds: () => electron.ipcRenderer.invoke("get-screen-bounds"),
	getAllDisplays: () => electron.ipcRenderer.invoke("get-all-displays"),
	takeScreenshot: () => electron.ipcRenderer.invoke("take-screenshot"),
	selectRegion: () => electron.ipcRenderer.invoke("select-region"),
	showRegionBorder: (region, audioState) => electron.ipcRenderer.invoke("show-region-border", region, audioState),
	hideRegionBorder: () => electron.ipcRenderer.invoke("hide-region-border"),
	hideBorderOnly: () => electron.ipcRenderer.invoke("hide-border-only"),
	showFloatingIsland: (audioState, targetDisplayId) => electron.ipcRenderer.invoke("show-floating-island", audioState, targetDisplayId),
	hideFloatingIsland: () => electron.ipcRenderer.invoke("hide-floating-island"),
	showAiIsland: () => electron.ipcRenderer.invoke("show-ai-island"),
	hideAiIsland: () => electron.ipcRenderer.invoke("hide-ai-island"),
	hideCameraPreview: () => electron.ipcRenderer.invoke("hide-camera-preview"),
	toggleCameraPreview: (show, cameraDeviceId) => electron.ipcRenderer.invoke("toggle-camera-preview", show, cameraDeviceId),
	setIslandState: (state, elapsedSeconds) => electron.ipcRenderer.invoke("set-island-state", state, elapsedSeconds),
	updateToolbarState: (state, elapsedSeconds) => electron.ipcRenderer.invoke("update-toolbar-state", state, elapsedSeconds),
	updateAudioLevels: (micLevel, sysLevel) => electron.ipcRenderer.send("update-audio-levels", micLevel, sysLevel),
	onToolbarAction: (callback) => {
		const handler = (_event, action) => callback(action);
		electron.ipcRenderer.on("on-toolbar-action", handler);
		return () => electron.ipcRenderer.removeListener("on-toolbar-action", handler);
	},
	getMediaDevices: () => {
		if (!navigator.mediaDevices?.enumerateDevices) return Promise.resolve([]);
		return navigator.mediaDevices.enumerateDevices().then((devices) => devices.map((d) => ({
			deviceId: d.deviceId,
			kind: d.kind,
			label: d.label
		})));
	},
	loadRecordings: () => electron.ipcRenderer.invoke("load-recordings"),
	saveRecordings: (recordings) => electron.ipcRenderer.invoke("save-recordings", recordings),
	showFloatingBall: () => electron.ipcRenderer.invoke("show-floating-ball"),
	hideFloatingBall: () => electron.ipcRenderer.invoke("hide-floating-ball"),
	toggleFloatingBall: () => electron.ipcRenderer.invoke("toggle-floating-ball"),
	onFloatingBallAction: (callback) => {
		const handler = (_event, action) => callback(action);
		electron.ipcRenderer.on("on-floating-ball-action", handler);
		return () => electron.ipcRenderer.removeListener("on-floating-ball-action", handler);
	},
	agentGetStatus: () => electron.ipcRenderer.invoke("agent-get-status"),
	agentInstallHooks: () => electron.ipcRenderer.invoke("agent-install-hooks"),
	agentUninstallHooks: () => electron.ipcRenderer.invoke("agent-uninstall-hooks"),
	agentResolvePermission: (behavior) => electron.ipcRenderer.invoke("agent-resolve-permission", behavior),
	agentSetAutoAllow: (enabled) => electron.ipcRenderer.invoke("agent-set-auto-allow", enabled),
	agentGetAutoAllow: () => electron.ipcRenderer.invoke("agent-get-auto-allow"),
	onAgentStateUpdate: (callback) => {
		const handler = (_event, data) => callback(data);
		electron.ipcRenderer.on("agent-state-update", handler);
		return () => electron.ipcRenderer.removeListener("agent-state-update", handler);
	},
	onAgentPermissionRequest: (callback) => {
		const handler = (_event, data) => callback(data);
		electron.ipcRenderer.on("agent-permission-request", handler);
		return () => electron.ipcRenderer.removeListener("agent-permission-request", handler);
	},
	showAiWindow: () => electron.ipcRenderer.invoke("show-ai-window"),
	showMainWindow: () => electron.ipcRenderer.invoke("show-main-window")
});
//#endregion
