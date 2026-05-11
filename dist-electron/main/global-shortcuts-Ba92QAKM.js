const require_logger = require("./logger-BeZ1PQQ0.js");
let electron = require("electron");
//#region electron/main/global-shortcuts.ts
require_logger.init_logger();
function registerGlobalShortcuts(mainWindow) {
	electron.globalShortcut.register("CommandOrControl+Shift+R", () => {
		require_logger.logger_default.info("Global shortcut: start/stop recording");
		mainWindow?.webContents.send("on-global-shortcut", "startStop");
	});
	electron.globalShortcut.register("CommandOrControl+Shift+P", () => {
		require_logger.logger_default.info("Global shortcut: pause/resume recording");
		mainWindow?.webContents.send("on-global-shortcut", "pauseResume");
	});
	require_logger.logger_default.info("Global shortcuts registered");
}
function unregisterGlobalShortcuts() {
	electron.globalShortcut.unregisterAll();
}
//#endregion
exports.registerGlobalShortcuts = registerGlobalShortcuts;
exports.unregisterGlobalShortcuts = unregisterGlobalShortcuts;
