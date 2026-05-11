<<<<<<< HEAD
var e=Object.create,t=Object.defineProperty,n=Object.getOwnPropertyDescriptor,r=Object.getOwnPropertyNames,i=Object.getPrototypeOf,a=Object.prototype.hasOwnProperty,o=(e,t)=>()=>(e&&(t=e(e=0)),t),s=(e,t)=>()=>(t||(e((t={exports:{}}).exports,t),e=null),t.exports),c=(e,i,o,s)=>{if(i&&typeof i==`object`||typeof i==`function`)for(var c=r(i),l=0,u=c.length,d;l<u;l++)d=c[l],!a.call(e,d)&&d!==o&&t(e,d,{get:(e=>i[e]).bind(null,d),enumerable:!(s=n(i,d))||s.enumerable});return e},l=(n,r,a)=>(a=n==null?{}:e(i(n)),c(r||!n||!n.__esModule?t(a,`default`,{value:n,enumerable:!0}):a,n));let u=require(`node:path`);u=l(u);let d=require(`electron`),f=require(`node:fs`);f=l(f);let p=require(`fluent-ffmpeg`);p=l(p);let m=require(`@ffmpeg-installer/ffmpeg`);m=l(m);let h=require(`node:os`);h=l(h);var g=s(((e,t)=>{var n=require(`fs`),r=require(`path`);t.exports={findAndReadPackageJson:i,tryReadJsonAt:a};function i(){return a(c())||a(s())||a(process.resourcesPath,`app.asar`)||a(process.resourcesPath,`app`)||a(process.cwd())||{name:void 0,version:void 0}}function a(...e){if(e[0])try{let t=o(`package.json`,r.join(...e));if(!t)return;let i=JSON.parse(n.readFileSync(t,`utf8`)),a=i?.productName||i?.name;return!a||a.toLowerCase()===`electron`?void 0:a?{name:a,version:i?.version}:void 0}catch{return}}function o(e,t){let i=t;for(;;){let t=r.parse(i),a=t.root,o=t.dir;if(n.existsSync(r.join(i,e)))return r.resolve(r.join(i,e));if(i===a)return null;i=o}}function s(){let e=process.argv.filter(e=>e.indexOf(`--user-data-dir=`)===0);return e.length===0||typeof e[0]!=`string`?null:e[0].replace(`--user-data-dir=`,``)}function c(){try{return require.main?.filename}catch{return}}})),_=s(((e,t)=>{var n=require(`child_process`),r=require(`os`),i=require(`path`),a=g();t.exports=class{appName=void 0;appPackageJson=void 0;platform=process.platform;getAppLogPath(e=this.getAppName()){return this.platform===`darwin`?i.join(this.getSystemPathHome(),`Library/Logs`,e):i.join(this.getAppUserDataPath(e),`logs`)}getAppName(){let e=this.appName||this.getAppPackageJson()?.name;if(!e)throw Error(`electron-log can't determine the app name. It tried these methods:
1. Use \`electron.app.name\`
2. Use productName or name from the nearest package.json\`
You can also set it through log.transports.file.setAppName()`);return e}getAppPackageJson(){return typeof this.appPackageJson!=`object`&&(this.appPackageJson=a.findAndReadPackageJson()),this.appPackageJson}getAppUserDataPath(e=this.getAppName()){return e?i.join(this.getSystemPathAppData(),e):void 0}getAppVersion(){return this.getAppPackageJson()?.version}getElectronLogPath(){return this.getAppLogPath()}getMacOsVersion(){let e=Number(r.release().split(`.`)[0]);return e<=19?`10.${e-4}`:e-9}getOsVersion(){let e=r.type().replace(`_`,` `),t=r.release();return e===`Darwin`&&(e=`macOS`,t=this.getMacOsVersion()),`${e} ${t}`}getPathVariables(){let e=this.getAppName(),t=this.getAppVersion(),n=this;return{appData:this.getSystemPathAppData(),appName:e,appVersion:t,get electronDefaultDir(){return n.getElectronLogPath()},home:this.getSystemPathHome(),libraryDefaultDir:this.getAppLogPath(e),libraryTemplate:this.getAppLogPath(`{appName}`),temp:this.getSystemPathTemp(),userData:this.getAppUserDataPath(e)}}getSystemPathAppData(){let e=this.getSystemPathHome();switch(this.platform){case`darwin`:return i.join(e,`Library/Application Support`);case`win32`:return process.env.APPDATA||i.join(e,`AppData/Roaming`);default:return process.env.XDG_CONFIG_HOME||i.join(e,`.config`)}}getSystemPathHome(){return r.homedir?.()||process.env.HOME}getSystemPathTemp(){return r.tmpdir()}getVersions(){return{app:`${this.getAppName()} ${this.getAppVersion()}`,electron:void 0,os:this.getOsVersion()}}isDev(){return process.env.NODE_ENV===`development`||process.env.ELECTRON_IS_DEV===`1`}isElectron(){return!!process.versions.electron}onAppEvent(e,t){}onAppReady(e){e()}onEveryWebContentsEvent(e,t){}onIpc(e,t){}onIpcInvoke(e,t){}openUrl(e,t=console.error){let r={darwin:`open`,win32:`start`,linux:`xdg-open`}[process.platform]||`xdg-open`;n.exec(`${r} ${e}`,{},e=>{e&&t(e)})}setAppName(e){this.appName=e}setPlatform(e){this.platform=e}setPreloadFileForSessions({filePath:e,includeFutureSession:t=!0,getSessions:n=()=>[]}){}sendIpc(e,t){}showErrorBox(e,t){}}})),v=s(((e,t)=>{var n=require(`path`),r=_();t.exports=class extends r{electron=void 0;constructor({electron:e}={}){super(),this.electron=e}getAppName(){let e;try{e=this.appName||this.electron.app?.name||this.electron.app?.getName()}catch{}return e||super.getAppName()}getAppUserDataPath(e){return this.getPath(`userData`)||super.getAppUserDataPath(e)}getAppVersion(){let e;try{e=this.electron.app?.getVersion()}catch{}return e||super.getAppVersion()}getElectronLogPath(){return this.getPath(`logs`)||super.getElectronLogPath()}getPath(e){try{return this.electron.app?.getPath(e)}catch{return}}getVersions(){return{app:`${this.getAppName()} ${this.getAppVersion()}`,electron:`Electron ${process.versions.electron}`,os:this.getOsVersion()}}getSystemPathAppData(){return this.getPath(`appData`)||super.getSystemPathAppData()}isDev(){return this.electron.app?.isPackaged===void 0?typeof process.execPath==`string`?n.basename(process.execPath).toLowerCase().startsWith(`electron`):super.isDev():!this.electron.app.isPackaged}onAppEvent(e,t){return this.electron.app?.on(e,t),()=>{this.electron.app?.off(e,t)}}onAppReady(e){this.electron.app?.isReady()?e():this.electron.app?.once?this.electron.app?.once(`ready`,e):e()}onEveryWebContentsEvent(e,t){return this.electron.webContents?.getAllWebContents()?.forEach(n=>{n.on(e,t)}),this.electron.app?.on(`web-contents-created`,n),()=>{this.electron.webContents?.getAllWebContents().forEach(n=>{n.off(e,t)}),this.electron.app?.off(`web-contents-created`,n)};function n(n,r){r.on(e,t)}}onIpc(e,t){this.electron.ipcMain?.on(e,t)}onIpcInvoke(e,t){this.electron.ipcMain?.handle?.(e,t)}openUrl(e,t=console.error){this.electron.shell?.openExternal(e).catch(t)}setPreloadFileForSessions({filePath:e,includeFutureSession:t=!0,getSessions:n=()=>[this.electron.session?.defaultSession]}){for(let e of n().filter(Boolean))r(e);t&&this.onAppEvent(`session-created`,e=>{r(e)});function r(t){typeof t.registerPreloadScript==`function`?t.registerPreloadScript({filePath:e,id:`electron-log-preload`,type:`frame`}):t.setPreloads([...t.getPreloads(),e])}}sendIpc(e,t){this.electron.BrowserWindow?.getAllWindows()?.forEach(n=>{n.webContents?.isDestroyed()===!1&&n.webContents?.isCrashed()===!1&&n.webContents.send(e,t)})}showErrorBox(e,t){this.electron.dialog?.showErrorBox(e,t)}}})),y=s(((e,t)=>{var n={};try{n=require(`electron`)}catch{}n.ipcRenderer&&r(n),typeof t==`object`&&(t.exports=r);function r({contextBridge:e,ipcRenderer:t}){if(!t)return;t.on(`__ELECTRON_LOG_IPC__`,(e,t)=>{window.postMessage({cmd:`message`,...t})}),t.invoke(`__ELECTRON_LOG__`,{cmd:`getOptions`}).catch(e=>console.error(Error(`electron-log isn't initialized in the main process. Please call log.initialize() before. ${e.message}`)));let n={sendToMain(e){try{t.send(`__ELECTRON_LOG__`,e)}catch(n){console.error(`electronLog.sendToMain `,n,`data:`,e),t.send(`__ELECTRON_LOG__`,{cmd:`errorHandler`,error:{message:n?.message,stack:n?.stack},errorName:`sendToMain`})}},log(...e){n.sendToMain({data:e,level:`info`})}};for(let e of[`error`,`warn`,`info`,`verbose`,`debug`,`silly`])n[e]=(...t)=>n.sendToMain({data:t,level:e});if(e&&process.contextIsolated)try{e.exposeInMainWorld(`__electronLog`,n)}catch{}typeof window==`object`?window.__electronLog=n:__electronLog=n}})),b=s(((e,t)=>{var n=require(`fs`),r=require(`os`),i=require(`path`),a=y(),o=!1,s=!1;t.exports={initialize({externalApi:e,getSessions:t,includeFutureSession:n,logger:r,preload:i=!0,spyRendererConsole:a=!1}){e.onAppReady(()=>{try{i&&c({externalApi:e,getSessions:t,includeFutureSession:n,logger:r,preloadOption:i}),a&&l({externalApi:e,logger:r})}catch(e){r.warn(e)}})}};function c({externalApi:e,getSessions:t,includeFutureSession:s,logger:c,preloadOption:l}){let u=typeof l==`string`?l:void 0;if(o){c.warn(Error(`log.initialize({ preload }) already called`).stack);return}o=!0;try{u=i.resolve(__dirname,`../renderer/electron-log-preload.js`)}catch{}if(!u||!n.existsSync(u)){u=i.join(e.getAppUserDataPath()||r.tmpdir(),`electron-log-preload.js`);let t=`
      try {
        (${a.toString()})(require('electron'));
      } catch(e) {
        console.error(e);
      }
    `;n.writeFileSync(u,t,`utf8`)}e.setPreloadFileForSessions({filePath:u,includeFutureSession:s,getSessions:t})}function l({externalApi:e,logger:t}){if(s){t.warn(Error(`log.initialize({ spyRendererConsole }) already called`).stack);return}s=!0;let n=[`debug`,`info`,`warn`,`error`];e.onEveryWebContentsEvent(`console-message`,(e,r,i)=>{t.processMessage({data:[i],level:n[r],variables:{processType:`renderer`}})})}})),x=s(((e,t)=>{t.exports=n;function n(e){return Object.defineProperties(t,{defaultLabel:{value:``,writable:!0},labelPadding:{value:!0,writable:!0},maxLabelLength:{value:0,writable:!0},labelLength:{get(){switch(typeof t.labelPadding){case`boolean`:return t.labelPadding?t.maxLabelLength:0;case`number`:return t.labelPadding;default:return 0}}}});function t(n){t.maxLabelLength=Math.max(t.maxLabelLength,n.length);let r={};for(let t of e.levels)r[t]=(...r)=>e.logData(r,{level:t,scope:n});return r.log=r.info,r}}})),S=s(((e,t)=>{t.exports=class{constructor({processMessage:e}){this.processMessage=e,this.buffer=[],this.enabled=!1,this.begin=this.begin.bind(this),this.commit=this.commit.bind(this),this.reject=this.reject.bind(this)}addMessage(e){this.buffer.push(e)}begin(){this.enabled=[]}commit(){this.enabled=!1,this.buffer.forEach(e=>this.processMessage(e)),this.buffer=[]}reject(){this.enabled=!1,this.buffer=[]}}})),C=s(((e,t)=>{var n=x(),r=S();t.exports=class e{static instances={};dependencies={};errorHandler=null;eventLogger=null;functions={};hooks=[];isDev=!1;levels=null;logId=null;scope=null;transports={};variables={};constructor({allowUnknownLevel:t=!1,dependencies:i={},errorHandler:a,eventLogger:o,initializeFn:s,isDev:c=!1,levels:l=[`error`,`warn`,`info`,`verbose`,`debug`,`silly`],logId:u,transportFactories:d={},variables:f}={}){this.addLevel=this.addLevel.bind(this),this.create=this.create.bind(this),this.initialize=this.initialize.bind(this),this.logData=this.logData.bind(this),this.processMessage=this.processMessage.bind(this),this.allowUnknownLevel=t,this.buffering=new r(this),this.dependencies=i,this.initializeFn=s,this.isDev=c,this.levels=l,this.logId=u,this.scope=n(this),this.transportFactories=d,this.variables=f||{};for(let e of this.levels)this.addLevel(e,!1);this.log=this.info,this.functions.log=this.log,this.errorHandler=a,a?.setOptions({...i,logFn:this.error}),this.eventLogger=o,o?.setOptions({...i,logger:this});for(let[e,t]of Object.entries(d))this.transports[e]=t(this,i);e.instances[u]=this}static getInstance({logId:e}){return this.instances[e]||this.instances.default}addLevel(e,t=this.levels.length){t!==!1&&this.levels.splice(t,0,e),this[e]=(...t)=>this.logData(t,{level:e}),this.functions[e]=this[e]}catchErrors(e){return this.processMessage({data:[`log.catchErrors is deprecated. Use log.errorHandler instead`],level:`warn`},{transports:[`console`]}),this.errorHandler.startCatching(e)}create(t){return typeof t==`string`&&(t={logId:t}),new e({dependencies:this.dependencies,errorHandler:this.errorHandler,initializeFn:this.initializeFn,isDev:this.isDev,transportFactories:this.transportFactories,variables:{...this.variables},...t})}compareLevels(e,t,n=this.levels){let r=n.indexOf(e),i=n.indexOf(t);return i===-1||r===-1?!0:i<=r}initialize(e={}){this.initializeFn({logger:this,...this.dependencies,...e})}logData(e,t={}){this.buffering.enabled?this.buffering.addMessage({data:e,date:new Date,...t}):this.processMessage({data:e,...t})}processMessage(e,{transports:t=this.transports}={}){if(e.cmd===`errorHandler`){this.errorHandler.handle(e.error,{errorName:e.errorName,processType:`renderer`,showDialog:!!e.showDialog});return}let n=e.level;this.allowUnknownLevel||(n=this.levels.includes(e.level)?e.level:`info`);let r={date:new Date,logId:this.logId,...e,level:n,variables:{...this.variables,...e.variables}};for(let[n,i]of this.transportEntries(t))if(!(typeof i!=`function`||i.level===!1)&&this.compareLevels(i.level,e.level))try{let e=this.hooks.reduce((e,t)=>e&&t(e,i,n),r);e&&i({...e,data:[...e.data]})}catch(e){this.processInternalErrorFn(e)}}processInternalErrorFn(e){}transportEntries(e=this.transports){return(Array.isArray(e)?e:Object.entries(e)).map(e=>{switch(typeof e){case`string`:return this.transports[e]?[e,this.transports[e]]:null;case`function`:return[e.name,e];default:return Array.isArray(e)?e:null}}).filter(Boolean)}}})),w=s(((e,t)=>{var n=class{externalApi=void 0;isActive=!1;logFn=void 0;onError=void 0;showDialog=!0;constructor({externalApi:e,logFn:t=void 0,onError:n=void 0,showDialog:r=void 0}={}){this.createIssue=this.createIssue.bind(this),this.handleError=this.handleError.bind(this),this.handleRejection=this.handleRejection.bind(this),this.setOptions({externalApi:e,logFn:t,onError:n,showDialog:r}),this.startCatching=this.startCatching.bind(this),this.stopCatching=this.stopCatching.bind(this)}handle(e,{logFn:t=this.logFn,onError:n=this.onError,processType:i=`browser`,showDialog:a=this.showDialog,errorName:o=``}={}){e=r(e);try{if(typeof n==`function`){let t=this.externalApi?.getVersions()||{},r=this.createIssue;if(n({createIssue:r,error:e,errorName:o,processType:i,versions:t})===!1)return}o?t(o,e):t(e),a&&!o.includes(`rejection`)&&this.externalApi&&this.externalApi.showErrorBox(`A JavaScript error occurred in the ${i} process`,e.stack)}catch{console.error(e)}}setOptions({externalApi:e,logFn:t,onError:n,showDialog:r}){typeof e==`object`&&(this.externalApi=e),typeof t==`function`&&(this.logFn=t),typeof n==`function`&&(this.onError=n),typeof r==`boolean`&&(this.showDialog=r)}startCatching({onError:e,showDialog:t}={}){this.isActive||(this.isActive=!0,this.setOptions({onError:e,showDialog:t}),process.on(`uncaughtException`,this.handleError),process.on(`unhandledRejection`,this.handleRejection))}stopCatching(){this.isActive=!1,process.removeListener(`uncaughtException`,this.handleError),process.removeListener(`unhandledRejection`,this.handleRejection)}createIssue(e,t){this.externalApi?.openUrl(`${e}?${new URLSearchParams(t).toString()}`)}handleError(e){this.handle(e,{errorName:`Unhandled`})}handleRejection(e){let t=e instanceof Error?e:Error(JSON.stringify(e));this.handle(t,{errorName:`Unhandled rejection`})}};function r(e){if(e instanceof Error)return e;if(e&&typeof e==`object`){if(e.message)return Object.assign(Error(e.message),e);try{return Error(JSON.stringify(e))}catch(t){return Error(`Couldn't normalize error ${String(e)}: ${t}`)}}return Error(`Can't normalize error ${String(e)}`)}t.exports=n})),T=s(((e,t)=>{t.exports=class{disposers=[];format=`{eventSource}#{eventName}:`;formatters={app:{"certificate-error":({args:e})=>this.arrayToObject(e.slice(1,4),[`url`,`error`,`certificate`]),"child-process-gone":({args:e})=>e.length===1?e[0]:e,"render-process-gone":({args:[e,t]})=>t&&typeof t==`object`?{...t,...this.getWebContentsDetails(e)}:[]},webContents:{"console-message":({args:[e,t,n,r]})=>{if(!(e<3))return{message:t,source:`${r}:${n}`}},"did-fail-load":({args:e})=>this.arrayToObject(e,[`errorCode`,`errorDescription`,`validatedURL`,`isMainFrame`,`frameProcessId`,`frameRoutingId`]),"did-fail-provisional-load":({args:e})=>this.arrayToObject(e,[`errorCode`,`errorDescription`,`validatedURL`,`isMainFrame`,`frameProcessId`,`frameRoutingId`]),"plugin-crashed":({args:e})=>this.arrayToObject(e,[`name`,`version`]),"preload-error":({args:e})=>this.arrayToObject(e,[`preloadPath`,`error`])}};events={app:{"certificate-error":!0,"child-process-gone":!0,"render-process-gone":!0},webContents:{"did-fail-load":!0,"did-fail-provisional-load":!0,"plugin-crashed":!0,"preload-error":!0,unresponsive:!0}};externalApi=void 0;level=`error`;scope=``;constructor(e={}){this.setOptions(e)}setOptions({events:e,externalApi:t,level:n,logger:r,format:i,formatters:a,scope:o}){typeof e==`object`&&(this.events=e),typeof t==`object`&&(this.externalApi=t),typeof n==`string`&&(this.level=n),typeof r==`object`&&(this.logger=r),(typeof i==`string`||typeof i==`function`)&&(this.format=i),typeof a==`object`&&(this.formatters=a),typeof o==`string`&&(this.scope=o)}startLogging(e={}){this.setOptions(e),this.disposeListeners();for(let e of this.getEventNames(this.events.app))this.disposers.push(this.externalApi.onAppEvent(e,(...t)=>{this.handleEvent({eventSource:`app`,eventName:e,handlerArgs:t})}));for(let e of this.getEventNames(this.events.webContents))this.disposers.push(this.externalApi.onEveryWebContentsEvent(e,(...t)=>{this.handleEvent({eventSource:`webContents`,eventName:e,handlerArgs:t})}))}stopLogging(){this.disposeListeners()}arrayToObject(e,t){let n={};return t.forEach((t,r)=>{n[t]=e[r]}),e.length>t.length&&(n.unknownArgs=e.slice(t.length)),n}disposeListeners(){this.disposers.forEach(e=>e()),this.disposers=[]}formatEventLog({eventName:e,eventSource:t,handlerArgs:n}){let[r,...i]=n;if(typeof this.format==`function`)return this.format({args:i,event:r,eventName:e,eventSource:t});let a=this.formatters[t]?.[e],o=i;if(typeof a==`function`&&(o=a({args:i,event:r,eventName:e,eventSource:t})),!o)return;let s={};return Array.isArray(o)?s.args=o:typeof o==`object`&&Object.assign(s,o),t===`webContents`&&Object.assign(s,this.getWebContentsDetails(r?.sender)),[this.format.replace(`{eventSource}`,t===`app`?`App`:`WebContents`).replace(`{eventName}`,e),s]}getEventNames(e){return!e||typeof e!=`object`?[]:Object.entries(e).filter(([e,t])=>t).map(([e])=>e)}getWebContentsDetails(e){if(!e?.loadURL)return{};try{return{webContents:{id:e.id,url:e.getURL()}}}catch{return{}}}handleEvent({eventName:e,eventSource:t,handlerArgs:n}){let r=this.formatEventLog({eventName:e,eventSource:t,handlerArgs:n});r&&(this.scope?this.logger.scope(this.scope):this.logger)?.[this.level]?.(...r)}}})),E=s(((e,t)=>{t.exports={transform:n};function n({logger:e,message:t,transport:n,initialData:r=t?.data||[],transforms:i=n?.transforms}){return i.reduce((r,i)=>typeof i==`function`?i({data:r,logger:e,message:t,transport:n}):r,r)}})),D=s(((e,t)=>{var{transform:n}=E();t.exports={concatFirstStringElements:r,formatScope:a,formatText:s,formatVariables:o,timeZoneFromOffset:i,format({message:e,logger:t,transport:r,data:i=e?.data}){switch(typeof r.format){case`string`:return n({message:e,logger:t,transforms:[o,a,s],transport:r,initialData:[r.format,...i]});case`function`:return r.format({data:i,level:e?.level||`info`,logger:t,message:e,transport:r});default:return i}}};function r({data:e}){return typeof e[0]!=`string`||typeof e[1]!=`string`||e[0].match(/%[1cdfiOos]/)?e:[`${e[0]} ${e[1]}`,...e.slice(2)]}function i(e){let t=Math.abs(e);return`${e>0?`-`:`+`}${Math.floor(t/60).toString().padStart(2,`0`)}:${(t%60).toString().padStart(2,`0`)}`}function a({data:e,logger:t,message:n}){let{defaultLabel:r,labelLength:i}=t?.scope||{},a=e[0],o=n.scope;o||=r;let s;return s=o===``?i>0?``.padEnd(i+3):``:typeof o==`string`?` (${o})`.padEnd(i+3):``,e[0]=a.replace(`{scope}`,s),e}function o({data:e,message:t}){let n=e[0];if(typeof n!=`string`)return e;n=n.replace(`{level}]`,`${t.level}]`.padEnd(6,` `));let r=t.date||new Date;return e[0]=n.replace(/\{(\w+)}/g,(e,n)=>{switch(n){case`level`:return t.level||`info`;case`logId`:return t.logId;case`y`:return r.getFullYear().toString(10);case`m`:return(r.getMonth()+1).toString(10).padStart(2,`0`);case`d`:return r.getDate().toString(10).padStart(2,`0`);case`h`:return r.getHours().toString(10).padStart(2,`0`);case`i`:return r.getMinutes().toString(10).padStart(2,`0`);case`s`:return r.getSeconds().toString(10).padStart(2,`0`);case`ms`:return r.getMilliseconds().toString(10).padStart(3,`0`);case`z`:return i(r.getTimezoneOffset());case`iso`:return r.toISOString();default:return t.variables?.[n]||e}}).trim(),e}function s({data:e}){let t=e[0];if(typeof t!=`string`)return e;if(t.lastIndexOf(`{text}`)===t.length-6)return e[0]=t.replace(/\s?{text}/,``),e[0]===``&&e.shift(),e;let n=t.split(`{text}`),r=[];return n[0]!==``&&r.push(n[0]),r=r.concat(e.slice(1)),n[1]!==``&&r.push(n[1]),r}})),O=s(((e,t)=>{var n=require(`util`);t.exports={serialize:i,maxDepth({data:e,transport:n,depth:r=n?.depth??6}){if(!e)return e;if(r<1)return Array.isArray(e)?`[array]`:typeof e==`object`&&e?`[object]`:e;if(Array.isArray(e))return e.map(e=>t.exports.maxDepth({data:e,depth:r-1}));if(typeof e!=`object`||e&&typeof e.toISOString==`function`)return e;if(e===null)return null;if(e instanceof Error)return e;let i={};for(let n in e)Object.prototype.hasOwnProperty.call(e,n)&&(i[n]=t.exports.maxDepth({data:e[n],depth:r-1}));return i},toJSON({data:e}){return JSON.parse(JSON.stringify(e,r()))},toString({data:e,transport:t}){let i=t?.inspectOptions||{},a=e.map(e=>{if(e!==void 0)try{let t=JSON.stringify(e,r(),`  `);return t===void 0?void 0:JSON.parse(t)}catch{return e}});return n.formatWithOptions(i,...a)}};function r(e={}){let t=new WeakSet;return function(n,r){if(typeof r==`object`&&r){if(t.has(r))return;t.add(r)}return i(n,r,e)}}function i(e,t,n={}){let r=n?.serializeMapAndSet!==!1;return t instanceof Error?t.stack:t&&(typeof t==`function`?`[function] ${t.toString()}`:t instanceof Date?t.toISOString():r&&t instanceof Map&&Object.fromEntries?Object.fromEntries(t):r&&t instanceof Set&&Array.from?Array.from(t):t)}})),k=s(((e,t)=>{t.exports={transformStyles:a,applyAnsiStyles({data:e}){return a(e,r,i)},removeStyles({data:e}){return a(e,()=>``)}};var n={unset:`\x1B[0m`,black:`\x1B[30m`,red:`\x1B[31m`,green:`\x1B[32m`,yellow:`\x1B[33m`,blue:`\x1B[34m`,magenta:`\x1B[35m`,cyan:`\x1B[36m`,white:`\x1B[37m`,gray:`\x1B[90m`};function r(e){return n[e.replace(/color:\s*(\w+).*/,`$1`).toLowerCase()]||``}function i(e){return e+n.unset}function a(e,t,n){let r={};return e.reduce((e,i,a,o)=>{if(r[a])return e;if(typeof i==`string`){let e=a,s=!1;i=i.replace(/%[1cdfiOos]/g,n=>{if(e+=1,n!==`%c`)return n;let a=o[e];return typeof a==`string`?(r[e]=!0,s=!0,t(a,i)):n}),s&&n&&(i=n(i))}return e.push(i),e},[])}})),A=s(((e,t)=>{var{concatFirstStringElements:n,format:r}=D(),{maxDepth:i,toJSON:a}=O(),{applyAnsiStyles:o,removeStyles:s}=k(),{transform:c}=E(),l={error:console.error,warn:console.warn,info:console.info,verbose:console.info,debug:console.debug,silly:console.debug,log:console.log};t.exports=d;var u=`%c{h}:{i}:{s}.{ms}{scope}%c ${process.platform===`win32`?`>`:`›`} {text}`;Object.assign(d,{DEFAULT_FORMAT:u});function d(e){return Object.assign(t,{colorMap:{error:`red`,warn:`yellow`,info:`cyan`,verbose:`unset`,debug:`gray`,silly:`gray`,default:`unset`},format:u,level:`silly`,transforms:[f,r,m,n,i,a],useStyles:process.env.FORCE_STYLES,writeFn({message:e}){(l[e.level]||l.info)(...e.data)}});function t(n){let r=c({logger:e,message:n,transport:t});t.writeFn({message:{...n,data:r}})}}function f({data:e,message:t,transport:n}){return typeof n.format!=`string`||!n.format.includes(`%c`)?e:[`color:${h(t.level,n)}`,`color:unset`,...e]}function p(e,t){if(typeof e==`boolean`)return e;let n=t===`error`||t===`warn`?process.stderr:process.stdout;return n&&n.isTTY}function m(e){let{message:t,transport:n}=e;return(p(n.useStyles,t.level)?o:s)(e)}function h(e,t){return t.colorMap[e]||t.colorMap.default}})),j=s(((e,t)=>{var n=require(`events`),r=require(`fs`),i=require(`os`);t.exports=class extends n{asyncWriteQueue=[];bytesWritten=0;hasActiveAsyncWriting=!1;path=null;initialSize=void 0;writeOptions=null;writeAsync=!1;constructor({path:e,writeOptions:t={encoding:`utf8`,flag:`a`,mode:438},writeAsync:n=!1}){super(),this.path=e,this.writeOptions=t,this.writeAsync=n}get size(){return this.getSize()}clear(){try{return r.writeFileSync(this.path,``,{mode:this.writeOptions.mode,flag:`w`}),this.reset(),!0}catch(e){return e.code===`ENOENT`?!0:(this.emit(`error`,e,this),!1)}}crop(e){try{let t=a(this.path,e||4096);this.clear(),this.writeLine(`[log cropped]${i.EOL}${t}`)}catch(e){this.emit(`error`,Error(`Couldn't crop file ${this.path}. ${e.message}`),this)}}getSize(){if(this.initialSize===void 0)try{let e=r.statSync(this.path);this.initialSize=e.size}catch{this.initialSize=0}return this.initialSize+this.bytesWritten}increaseBytesWrittenCounter(e){this.bytesWritten+=Buffer.byteLength(e,this.writeOptions.encoding)}isNull(){return!1}nextAsyncWrite(){let e=this;if(this.hasActiveAsyncWriting||this.asyncWriteQueue.length===0)return;let t=this.asyncWriteQueue.join(``);this.asyncWriteQueue=[],this.hasActiveAsyncWriting=!0,r.writeFile(this.path,t,this.writeOptions,n=>{e.hasActiveAsyncWriting=!1,n?e.emit(`error`,Error(`Couldn't write to ${e.path}. ${n.message}`),this):e.increaseBytesWrittenCounter(t),e.nextAsyncWrite()})}reset(){this.initialSize=void 0,this.bytesWritten=0}toString(){return this.path}writeLine(e){if(e+=i.EOL,this.writeAsync){this.asyncWriteQueue.push(e),this.nextAsyncWrite();return}try{r.writeFileSync(this.path,e,this.writeOptions),this.increaseBytesWrittenCounter(e)}catch(e){this.emit(`error`,Error(`Couldn't write to ${this.path}. ${e.message}`),this)}}};function a(e,t){let n=Buffer.alloc(t),i=r.statSync(e),a=Math.min(i.size,t),o=Math.max(0,i.size-t),s=r.openSync(e,`r`),c=r.readSync(s,n,0,a,o);return r.closeSync(s),n.toString(`utf8`,0,c)}})),M=s(((e,t)=>{var n=j();t.exports=class extends n{clear(){}crop(){}getSize(){return 0}isNull(){return!0}writeLine(){}}})),N=s(((e,t)=>{var n=require(`events`),r=require(`fs`),i=require(`path`),a=j(),o=M();t.exports=class extends n{store={};constructor(){super(),this.emitError=this.emitError.bind(this)}provide({filePath:e,writeOptions:t={},writeAsync:n=!1}){let r;try{if(e=i.resolve(e),this.store[e])return this.store[e];r=this.createFile({filePath:e,writeOptions:t,writeAsync:n})}catch(t){r=new o({path:e}),this.emitError(t,r)}return r.on(`error`,this.emitError),this.store[e]=r,r}createFile({filePath:e,writeOptions:t,writeAsync:n}){return this.testFileWriting({filePath:e,writeOptions:t}),new a({path:e,writeOptions:t,writeAsync:n})}emitError(e,t){this.emit(`error`,e,t)}testFileWriting({filePath:e,writeOptions:t}){r.mkdirSync(i.dirname(e),{recursive:!0}),r.writeFileSync(e,``,{flag:`a`,mode:t.mode})}}})),P=s(((e,t)=>{var n=require(`fs`),r=require(`os`),i=require(`path`),a=N(),{transform:o}=E(),{removeStyles:s}=k(),{format:c,concatFirstStringElements:l}=D(),{toString:u}=O();t.exports=f;var d=new a;function f(e,{registry:t=d,externalApi:a}={}){let f;return t.listenerCount(`error`)<1&&t.on(`error`,(e,t)=>{g(`Can't write to ${t}`,e)}),Object.assign(m,{fileName:p(e.variables.processType),format:`[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}]{scope} {text}`,getFile:_,inspectOptions:{depth:5},level:`silly`,maxSize:1024**2,readAllLogs:v,sync:!0,transforms:[s,c,l,u],writeOptions:{flag:`a`,mode:438,encoding:`utf8`},archiveLogFn(e){let t=e.toString(),r=i.parse(t);try{n.renameSync(t,i.join(r.dir,`${r.name}.old${r.ext}`))}catch(t){g(`Could not rotate log`,t);let n=Math.round(m.maxSize/4);e.crop(Math.min(n,256*1024))}},resolvePathFn(e){return i.join(e.libraryDefaultDir,e.fileName)},setAppName(t){e.dependencies.externalApi.setAppName(t)}});function m(t){let n=_(t);m.maxSize>0&&n.size>m.maxSize&&(m.archiveLogFn(n),n.reset());let r=o({logger:e,message:t,transport:m});n.writeLine(r)}function h(){f||(f=Object.create(Object.prototype,{...Object.getOwnPropertyDescriptors(a.getPathVariables()),fileName:{get(){return m.fileName},enumerable:!0}}),typeof m.archiveLog==`function`&&(m.archiveLogFn=m.archiveLog,g(`archiveLog is deprecated. Use archiveLogFn instead`)),typeof m.resolvePath==`function`&&(m.resolvePathFn=m.resolvePath,g(`resolvePath is deprecated. Use resolvePathFn instead`)))}function g(t,n=null,r=`error`){let i=[`electron-log.transports.file: ${t}`];n&&i.push(n),e.transports.console({data:i,date:new Date,level:r})}function _(e){h();let n=m.resolvePathFn(f,e);return t.provide({filePath:n,writeAsync:!m.sync,writeOptions:m.writeOptions})}function v({fileFilter:e=e=>e.endsWith(`.log`)}={}){h();let t=i.dirname(m.resolvePathFn(f));return n.existsSync(t)?n.readdirSync(t).map(e=>i.join(t,e)).filter(e).map(e=>{try{return{path:e,lines:n.readFileSync(e,`utf8`).split(r.EOL)}}catch{return null}}).filter(Boolean):[]}}function p(e=process.type){switch(e){case`renderer`:return`renderer.log`;case`worker`:return`worker.log`;default:return`main.log`}}})),F=s(((e,t)=>{var{maxDepth:n,toJSON:r}=O(),{transform:i}=E();t.exports=a;function a(e,{externalApi:t}){return Object.assign(a,{depth:3,eventId:`__ELECTRON_LOG_IPC__`,level:e.isDev?`silly`:!1,transforms:[r,n]}),t?.isElectron()?a:void 0;function a(n){n?.variables?.processType!==`renderer`&&t?.sendIpc(a.eventId,{...n,data:i({logger:e,message:n,transport:a})})}}})),I=s(((e,t)=>{var n=require(`http`),r=require(`https`),{transform:i}=E(),{removeStyles:a}=k(),{toJSON:o,maxDepth:s}=O();t.exports=c;function c(e){return Object.assign(t,{client:{name:`electron-application`},depth:6,level:!1,requestOptions:{},transforms:[a,o,s],makeBodyFn({message:e}){return JSON.stringify({client:t.client,data:e.data,date:e.date.getTime(),level:e.level,scope:e.scope,variables:e.variables})},processErrorFn({error:n}){e.processMessage({data:[`electron-log: can't POST ${t.url}`,n],level:`warn`},{transports:[`console`,`file`]})},sendRequestFn({serverUrl:e,requestOptions:t,body:i}){let a=(e.startsWith(`https:`)?r:n).request(e,{method:`POST`,...t,headers:{"Content-Type":`application/json`,"Content-Length":i.length,...t.headers}});return a.write(i),a.end(),a}});function t(n){if(!t.url)return;let r=t.makeBodyFn({logger:e,message:{...n,data:i({logger:e,message:n,transport:t})},transport:t}),a=t.sendRequestFn({serverUrl:t.url,requestOptions:t.requestOptions,body:Buffer.from(r,`utf8`)});a.on(`error`,r=>t.processErrorFn({error:r,logger:e,message:n,request:a,transport:t}))}}})),ee=s(((e,t)=>{var n=C(),r=w(),i=T(),a=A(),o=P(),s=F(),c=I();t.exports=l;function l({dependencies:e,initializeFn:t}){let l=new n({dependencies:e,errorHandler:new r,eventLogger:new i,initializeFn:t,isDev:e.externalApi?.isDev(),logId:`default`,transportFactories:{console:a,file:o,ipc:s,remote:c},variables:{processType:`main`}});return l.default=l,l.Logger=n,l.processInternalErrorFn=e=>{l.transports.console.writeFn({message:{data:[`Unhandled electron-log error`,e],level:`error`}})},l}})),L=s(((e,t)=>{var n=require(`electron`),r=v(),{initialize:i}=b(),a=ee(),o=new r({electron:n}),s=a({dependencies:{externalApi:o},initializeFn:i});t.exports=s,o.onIpc(`__ELECTRON_LOG__`,(e,t)=>{t.scope&&s.Logger.getInstance(t).scope(t.scope);let n=new Date(t.date);c({...t,date:n.getTime()?n:new Date})}),o.onIpcInvoke(`__ELECTRON_LOG__`,(e,{cmd:t=``,logId:n})=>{switch(t){case`getOptions`:return{levels:s.Logger.getInstance({logId:n}).levels,logId:n};default:return c({data:[`Unknown cmd '${t}'`],level:`error`}),{}}});function c(e){s.Logger.getInstance(e)?.processMessage(e)}})),R=s(((e,t)=>{t.exports=L()}));function z(){if(H)return;H=!0;let{app:e}=require(`electron`),{join:t,dirname:n}=require(`node:path`),r=e.isPackaged?t(n(e.getPath(`exe`)),`logs`):t(e.getAppPath(),`src`,`log`),i=()=>{let e=new Date;return`${e.getFullYear()}-${String(e.getMonth()+1).padStart(2,`0`)}-${String(e.getDate()).padStart(2,`0`)}`};V.default.transports.file.resolvePathFn=e=>t(r,i()+`.log`)}function B(){z()}var V,H,U,W=o((()=>{V=l(R()),V.default.initialize(),V.default.transports.file.maxSize=5*1024*1024,V.default.transports.console.level=`error`,H=!1,U=V.default}));W();var te=d.app.isPackaged?u.default.join(process.resourcesPath,`ffmpeg.exe`):m.default.path;p.default.setFfmpegPath(te);var G=Math.min(h.default.cpus().length,8);function ne(e,t,n,r){if(!r)return new Promise(r=>{(0,p.default)(e).outputOptions([`-c:v`,`copy`,`-c:a`,`aac`,`-b:a`,`128k`,`-movflags`,`+faststart`]).output(t).on(`progress`,()=>{n?.({percent:80,targetSize:0})}).on(`end`,()=>{n?.({percent:100,targetSize:0}),r({success:!0,outputPath:t})}).on(`error`,e=>{U.error(`MP4 remux failed:`,e.message),r({success:!1,outputPath:``,error:e.message})}).run()});let i=t.replace(/\.mp4$/i,`_tmp.mp4`),a=`crop=${Math.round(r.width/2)*2}:${Math.round(r.height/2)*2}:${Math.round(r.x/2)*2}:${Math.round(r.y/2)*2},`;return new Promise(r=>{(0,p.default)(e).outputOptions([`-c:v libx264`,`-preset ultrafast`,`-crf 23`,`-threads`,String(G),`-vf`,`${a}pad=ceil(iw/2)*2:ceil(ih/2)*2,format=yuv420p`,`-an`,`-movflags +faststart`]).output(i).on(`progress`,e=>{n?.({percent:Math.round((e.percent??0)*100)/200,targetSize:e.targetSize??0})}).on(`end`,()=>{(0,p.default)(i).addInput(e).outputOptions([`-c:v`,`copy`,`-c:a`,`aac`,`-b:a`,`128k`,`-map`,`0:v`,`-map`,`1:a?`,`-shortest`,`-movflags`,`+faststart`]).output(t).on(`progress`,e=>{n?.({percent:Math.round((e.percent??0)*100)/200+50,targetSize:e.targetSize??0})}).on(`end`,()=>{f.default.promises.unlink(i).catch(()=>{}),r({success:!0,outputPath:t})}).on(`error`,e=>{U.error(`MP4 audio mux failed:`,e.message),f.default.promises.rename(i,t).then(()=>r({success:!0,outputPath:t})).catch(()=>{f.default.promises.unlink(i).catch(()=>{}),r({success:!1,outputPath:``,error:e.message})})}).run()}).on(`error`,e=>{U.error(`MP4 conversion failed:`,e.message),r({success:!1,outputPath:``,error:e.message})}).run()})}function re(e,t,n,r){let i=Math.round(n.width/2)*2,a=Math.round(n.height/2)*2,o=Math.round(n.x/2)*2,s=Math.round(n.y/2)*2;return new Promise(n=>{(0,p.default)(e).outputOptions([`-c:v`,`libx264`,`-preset`,`ultrafast`,`-crf`,`18`,`-threads`,String(G),`-vf`,`crop=${i}:${a}:${o}:${s},format=yuv420p`,`-c:a`,`copy`,`-movflags`,`+faststart`]).output(t).on(`progress`,e=>{r?.({percent:Math.round((e.percent??0)*100),targetSize:e.targetSize??0})}).on(`end`,()=>{n({success:!0,outputPath:t})}).on(`error`,e=>{U.error(`Crop failed:`,e.message),n({success:!1,outputPath:``,error:e.message})}).run()})}function ie(e,t,n){return new Promise(r=>{let i=Math.max(...e.map(e=>e.bounds.x+e.bounds.width))-Math.min(...e.map(e=>e.bounds.x)),a=Math.max(...e.map(e=>e.bounds.y+e.bounds.height))-Math.min(...e.map(e=>e.bounds.y)),o=Math.min(...e.map(e=>e.bounds.x)),s=Math.min(...e.map(e=>e.bounds.y)),c=Math.round(i/2)*2,l=Math.round(a/2)*2;U.info(`Merge canvas size:`,c,`x`,l),U.info(`Merge inputs:`,e.map((e,t)=>`[${t}] ${e.filePath} bounds=${JSON.stringify(e.bounds)}`).join(`, `));let u=[],d=0,m=e.length;for(let t=0;t<m;t++){let n=e[t].filePath.replace(/\.webm$/i,`_remux.mp4`);u.push(n),(0,p.default)(e[t].filePath).outputOptions([`-c`,`copy`]).output(n).on(`end`,()=>{U.info(`Merge remux ${t+1}/${m} done`),d++,d===m&&h()}).on(`error`,e=>{U.error(`Merge remux ${t+1} failed:`,e.message),d++,d===m&&h()}).run()}function h(){let i=(0,p.default)();for(let e of u)i.addInput(e);let a=[];a.push(`color=c=black:s=${c}x${l}[bg]`);let d=`[bg]`;for(let t=0;t<e.length;t++){let n=e[t],r=Math.round((n.bounds.x-o)/2)*2,i=Math.round((n.bounds.y-s)/2)*2,c=Math.round(n.bounds.width/2)*2,l=Math.round(n.bounds.height/2)*2,u=`[s${t}]`,f=t===e.length-1?`[out]`:`[tmp${t}]`;a.push(`[${t}:v]scale=${c}:${l},setsar=1${u}`),a.push(`${d}${u}overlay=${r}:${i}${f}`),d=f}a.push(`[out]format=yuv420p`),U.info(`Merge filter_complex:`,a.join(`;`)),i.complexFilter(a).outputOptions([`-c:v`,`libx264`,`-preset`,`ultrafast`,`-crf`,`23`,`-threads`,String(G),`-movflags`,`+faststart`]).output(t).on(`start`,e=>{U.info(`Merge ffmpeg command started`)}).on(`progress`,e=>{n?.({percent:Math.round(e.percent??0),targetSize:e.targetSize??0})}).on(`end`,()=>{U.info(`Merge completed successfully`);for(let t of e)f.default.promises.unlink(t.filePath).catch(()=>{});for(let e of u)f.default.promises.unlink(e).catch(()=>{});r({success:!0,outputPath:t})}).on(`error`,t=>{U.error(`Multi-screen merge failed:`,t.message);for(let t of e)f.default.promises.unlink(t.filePath).catch(()=>{});for(let e of u)f.default.promises.unlink(e).catch(()=>{});r({success:!1,outputPath:``,error:t.message})}).run()}})}function ae(e,t,n,r){let{execFile:i}=require(`node:child_process`),a=m.default.path,o=n?.width??480,s=n?.fps??10,c=u.default.join(h.default.tmpdir(),`gif_palette_${Date.now()}.png`);U.info(`GIF conversion - input:`,e,`palette:`,c,`output:`,t);let l=[`-y`,`-i`,e,`-vf`,`fps=${s},scale=${o}:-1:flags=lanczos,palettegen`,c];return new Promise(u=>{i(a,l,l=>{if(l){U.error(`GIF palette gen failed:`,l.message),u({success:!1,outputPath:``,error:l.message});return}U.info(`GIF palette generated successfully`);let d=i(a,[`-y`,`-i`,e,`-i`,c,`-filter_complex`,`[0:v]fps=${s},scale=${o}:-1:flags=lanczos[x];[x][1:v]paletteuse`,t],e=>{f.default.promises.unlink(c).catch(()=>{}),e?(U.error(`GIF creation failed:`,e.message),u({success:!1,outputPath:``,error:e.message})):u({success:!0,outputPath:t})});d.stdout&&d.stdout.on(`data`,e=>{let t=e.toString().match(/time=(\d+:\d+:\d+\.\d+)/);if(t&&n?.duration){let e=t[1].split(`:`).map(Number),i=e[0]*3600+e[1]*60+e[2],a=Math.min(Math.round(i/n.duration*100),99);r?.({percent:a+50,targetSize:0})}else r?.({percent:75,targetSize:0})})})})}var K=s(((e,t)=>{W();var n=null;function r(e){n=e}function i(e,t){f&&!f.isDestroyed()&&f.webContents.send(`audio-levels`,{micLevel:e,sysLevel:t}),O&&!O.isDestroyed()&&O.webContents.send(`audio-levels`,{micLevel:e,sysLevel:t})}var a=null,o=null;function s(){return new Promise(e=>{o=e,n&&!n.isDestroyed()&&n.minimize();let{x:t,y:r,width:i,height:s}=d.screen.getPrimaryDisplay().bounds;a=new d.BrowserWindow({x:t,y:r,width:i,height:s,frame:!1,transparent:!0,resizable:!1,movable:!1,alwaysOnTop:!0,skipTaskbar:!0,hasShadow:!1,webPreferences:{nodeIntegration:!0,contextIsolation:!1}});let l=(0,u.join)(__dirname,`region-selector.html`);a.loadFile(l).catch(e=>{U.error(`Failed to load region selector:`,e.message),c(null)}),a.setFullScreen(!0),a.setVisibleOnAllWorkspaces(!0),a.setIgnoreMouseEvents(!1),a.on(`closed`,()=>{o&&=(o(null),null)})})}function c(e){a&&!a.isDestroyed()&&a.close(),a=null,o&&=(o(e),null)}var l=null,f=null,p=null,m=null,h=null,g=null,_=200,v=150,y=12,b=null,x=0,S=0,C=null;function w(){if(!g||g.isDestroyed())return;let e=d.screen.getCursorScreenPoint(),[t,n]=g.getPosition();x=e.x-t,S=e.y-n;let[r,i]=g.getSize();C=setInterval(()=>{if(!g||g.isDestroyed()){T();return}let e=d.screen.getCursorScreenPoint(),t=e.x-x,n=e.y-S;b&&(t=Math.max(b.x,Math.min(t,b.x+b.width-r)),n=Math.max(b.y,Math.min(n,b.y+b.height-i))),g.setBounds({x:t,y:n,width:r,height:i})},16)}function T(){C&&=(clearInterval(C),null)}function E(e,t){D(),b=e;let n=e.x+e.width-_-y,r=e.y+y;g=new d.BrowserWindow({x:n,y:r,width:_,height:v,frame:!1,transparent:!0,resizable:!1,movable:!1,alwaysOnTop:!0,skipTaskbar:!0,hasShadow:!1,webPreferences:{nodeIntegration:!0,contextIsolation:!1}}),g.setVisibleOnAllWorkspaces(!0),g.setAlwaysOnTop(!0,`screen-saver`);let i=(0,u.join)(__dirname,`camera-preview.html`),a=t?`?deviceId=${encodeURIComponent(t)}`:``;g.loadFile(i+a).catch(e=>{U.error(`Failed to load camera preview:`,e.message)}),U.info(`Camera preview shown at`,n,r)}function D(){g&&!g.isDestroyed()&&(g.close(),g=null)}var O=null,k=null,A=null,j=`idle`,M=null;function N(e,t){P(),j=`idle`;let n=d.screen.getPrimaryDisplay();if(t!=null){let e=d.screen.getAllDisplays().find(e=>e.id===t);e&&(n=e)}let r=n.bounds;M=r,O=new d.BrowserWindow({x:Math.round(r.x+(r.width-340)/2),y:r.y+4,width:340,height:44,frame:!1,transparent:!0,resizable:!0,movable:!1,alwaysOnTop:!0,skipTaskbar:!0,hasShadow:!1,webPreferences:{nodeIntegration:!0,contextIsolation:!1}}),O.setVisibleOnAllWorkspaces(!0),O.setMinimumSize(100,44),O.setAlwaysOnTop(!0,`screen-saver`);let i=`<!DOCTYPE html>
=======
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
>>>>>>> e23b4f114715f74f0e1ad24d43e9b9ef714e8b73
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
<<<<<<< HEAD
let timerInterval=null,seconds=0,micOn=${e?.micEnabled?`true`:`false`},sysOn=${e?.sysEnabled?`true`:`false`},camOn=${e?.cameraEnabled?`true`:`false`},isRecording=false
=======
let timerInterval=null,seconds=0,micOn=${audioState?.micEnabled ? "true" : "false"},sysOn=${audioState?.sysEnabled ? "true" : "false"},camOn=${audioState?.cameraEnabled ? "true" : "false"},isRecording=false
>>>>>>> e23b4f114715f74f0e1ad24d43e9b9ef714e8b73
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
<<<<<<< HEAD
</body></html>`;O.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(i)}`),U.info(`Floating island shown`),b=r,e?.cameraEnabled&&E(r,e.cameraDeviceId)}function P(){k&&=(clearInterval(k),null),A&&=(clearTimeout(A),null),O&&!O.isDestroyed()&&(O.close(),O=null),D(),b=null,M=null}function F(e,t){if(j=e===`idle`?`idle`:e===`recording`?`recording`:e===`paused`?`paused`:j,e===`show`||e===`hide`){O&&!O.isDestroyed()&&O.webContents.send(`island-state`,e);return}O&&!O.isDestroyed()&&O.webContents.send(`island-state`,e,t),k&&=(clearInterval(k),null),A&&=(clearTimeout(A),null),e===`recording`&&(k=setInterval(()=>{if(!O||O.isDestroyed())return;let e=d.screen.getCursorScreenPoint(),[t,n]=O.getPosition(),[r,i]=O.getSize();e.x>=t&&e.x<=t+r&&e.y>=n-4&&e.y<=n+i?(A&&=(clearTimeout(A),null),O.webContents.send(`island-state`,`show`)):A||=setTimeout(()=>{O&&!O.isDestroyed()&&O.webContents.send(`island-state`,`hide`),A=null},500)},250))}var I=44,ee=3;function L(e,t){B();let n=ee,r=n+2,i=d.screen.getPrimaryDisplay().bounds,a=e.y-i.y,o=i.y+i.height-(e.y+e.height),s=I+4,c,u,_,v;a>=s?(v=`top`,c=e.x-r,u=e.y-I-r,_=e.width+r*2):o>=s?(v=`bottom`,c=e.x-r,u=e.y+e.height+r,_=e.width+r*2):(v=`inside`,c=e.x,u=e.y,_=Math.min(e.width,500)),m={...e},h=v,f=new d.BrowserWindow({x:c,y:u,width:_,height:I,frame:!1,transparent:!0,resizable:!1,movable:!1,alwaysOnTop:!0,skipTaskbar:!0,hasShadow:!1,webPreferences:{nodeIntegration:!0,contextIsolation:!1}}),f.setVisibleOnAllWorkspaces(!0),f.setAlwaysOnTop(!0,`screen-saver`);let y=`<!DOCTYPE html>
=======
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
>>>>>>> e23b4f114715f74f0e1ad24d43e9b9ef714e8b73
<html><head><style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;overflow:hidden;font-family:'Segoe UI',system-ui,sans-serif}
.toolbar{
<<<<<<< HEAD
  width:100%;height:${I}px;
=======
  width:100%;height:${TOOLBAR_HEIGHT}px;
>>>>>>> e23b4f114715f74f0e1ad24d43e9b9ef714e8b73
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
<<<<<<< HEAD
<div class="toolbar" id="toolbar" data-pos="${v}">
=======
<div class="toolbar" id="toolbar" data-pos="${tbPos}">
>>>>>>> e23b4f114715f74f0e1ad24d43e9b9ef714e8b73
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
<<<<<<< HEAD
  <span class="size-label" id="sizeLabel">${e.width}×${e.height}</span>
=======
  <span class="size-label" id="sizeLabel">${region.width}×${region.height}</span>
>>>>>>> e23b4f114715f74f0e1ad24d43e9b9ef714e8b73
  <button class="close-btn" onclick="doClose()" title="关闭并停止录制">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>
  </button>
</div>
<script>
const {ipcRenderer}=require('electron')
<<<<<<< HEAD
let timerInterval=null,seconds=0,micOn=${t?.micEnabled?`true`:`false`},sysOn=${t?.sysEnabled?`true`:`false`},camOn=${t?.cameraEnabled?`true`:`false`},isRecording=false
=======
let timerInterval=null,seconds=0,micOn=${audioState?.micEnabled ? "true" : "false"},sysOn=${audioState?.sysEnabled ? "true" : "false"},camOn=${audioState?.cameraEnabled ? "true" : "false"},isRecording=false
>>>>>>> e23b4f114715f74f0e1ad24d43e9b9ef714e8b73
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
<<<<<<< HEAD
</body></html>`;f.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(y)}`);let x=e.x-r,S=e.y-r,C=e.width+r*2,w=e.height+r*2;l=new d.BrowserWindow({x,y:S,width:C,height:w,show:!1,frame:!1,transparent:!0,resizable:!1,movable:!1,alwaysOnTop:!0,skipTaskbar:!0,hasShadow:!1,webPreferences:{nodeIntegration:!0,contextIsolation:!1}}),l.setVisibleOnAllWorkspaces(!0),l.setAlwaysOnTop(!0,`screen-saver`),l.setIgnoreMouseEvents(!0),l.setBounds({x,y:S,width:C,height:w}),l.show();let T=`<!DOCTYPE html>
=======
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
>>>>>>> e23b4f114715f74f0e1ad24d43e9b9ef714e8b73
<html><head><style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;overflow:hidden}
.border{
  position:absolute;left:0;top:0;right:0;bottom:0;
<<<<<<< HEAD
  border:${n}px solid #e94560;
=======
  border:${bw}px solid #e94560;
>>>>>>> e23b4f114715f74f0e1ad24d43e9b9ef714e8b73
  background:transparent;
}
</style></head><body>
<div class="border"></div>
<<<<<<< HEAD
</body></html>`;l.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(T)}`),U.info(`Region border+toolbar shown (split windows):`,e),b=e,t?.cameraEnabled&&E(e,t.cameraDeviceId),p&&clearInterval(p),p=setInterval(()=>{l&&!l.isDestroyed()&&l.setAlwaysOnTop(!0,`screen-saver`),f&&!f.isDestroyed()&&f.setAlwaysOnTop(!0,`screen-saver`),g&&!g.isDestroyed()&&g.setAlwaysOnTop(!0,`screen-saver`)},5e3)}function R(e,t){f&&!f.isDestroyed()&&(f.webContents.send(`toolbar-state`,e,t,h),(e===`recording`||e===`paused`)&&h===`inside`&&m&&f.setBounds({x:m.x+8,y:m.y+8,width:170,height:40}))}function z(){l&&!l.isDestroyed()&&(l.close(),l=null)}function B(){p&&=(clearInterval(p),null),z(),f&&!f.isDestroyed()&&(f.close(),f=null),D(),b=null,U.info(`Region border hidden`)}function V(){d.ipcMain.on(`region-selected`,(e,t)=>{U.info(`Region selected:`,t),c(t)}),d.ipcMain.on(`region-cancelled`,()=>{U.info(`Region selection cancelled`),c(null)}),d.ipcMain.handle(`show-region-border`,(e,t,n)=>{L(t,n)}),d.ipcMain.handle(`hide-region-border`,()=>{B()}),d.ipcMain.handle(`hide-border-only`,()=>{z()}),d.ipcMain.handle(`update-toolbar-state`,(e,t,n)=>{R(t,n)}),d.ipcMain.on(`toolbar-action`,(e,t)=>{if(U.info(`Toolbar action:`,t),t===`close`){n&&!n.isDestroyed()&&n.webContents.send(`on-toolbar-action`,`close`),B();return}n&&!n.isDestroyed()&&n.webContents.send(`on-toolbar-action`,t)}),d.ipcMain.removeHandler(`set-mouse-ignore`),d.ipcMain.removeAllListeners(`set-mouse-ignore`),d.ipcMain.handle(`show-floating-island`,(e,t,n)=>{N(t,n)}),d.ipcMain.handle(`hide-floating-island`,()=>{P()}),d.ipcMain.handle(`hide-camera-preview`,()=>{D()}),d.ipcMain.handle(`toggle-camera-preview`,(e,t,n)=>{t&&b?E(b,n):D()}),d.ipcMain.on(`camera-drag-start`,()=>w()),d.ipcMain.on(`camera-drag-end`,()=>T()),d.ipcMain.handle(`set-island-state`,(e,t,n)=>{F(t,n)}),d.ipcMain.on(`island-action`,(e,t)=>{U.info(`Island action:`,t),n&&!n.isDestroyed()&&n.webContents.send(`on-toolbar-action`,t)}),d.ipcMain.on(`resize-island`,(e,t)=>{if(O&&!O.isDestroyed()){let e=M||d.screen.getPrimaryDisplay().bounds,n=t+20,r=Math.round(e.x+(e.width-n)/2);O.setBounds({x:r,y:e.y+4,width:n,height:44})}})}t.exports={selectRegion:s,showRegionBorder:L,hideRegionBorder:B,hideBorderOnly:z,updateToolbarState:R,updateAudioLevels:i,showFloatingIsland:N,hideFloatingIsland:P,showCameraPreview:E,hideCameraPreview:D,setFloatingIslandState:F,setMainWindow:r,registerRegionSelectorHandlers:V}})),oe=s(((e,t)=>{W();var n=null;function r(){let e=d.app.isPackaged?(0,u.join)(process.resourcesPath,`logo.ico`):(0,u.join)(__dirname,`../../public/logo.ico`);return d.nativeImage.createFromPath(e).resize({width:16,height:16})}function i(){if(n&&!n.isDestroyed())return;n=new d.Tray(r()),n.setToolTip(`二支录制`);let e=d.Menu.buildFromTemplate([{label:`显示主窗口`,click:()=>{let e=d.BrowserWindow.getAllWindows()[0];e&&(e.show(),e.focus())}},{type:`separator`},{label:`退出`,click:()=>{let{app:e}=require(`electron`);e.quit()}}]);n.setContextMenu(e),n.on(`click`,()=>{let e=d.BrowserWindow.getAllWindows()[0];e&&(e.show(),e.focus())}),U.info(`System tray created`)}function a(e,t){n&&!n.isDestroyed()&&(n.displayBalloon({title:e,content:t}),U.info(`Tray balloon:`,e,t))}function o(){n&&!n.isDestroyed()&&(n.destroy(),n=null)}t.exports={createTray:i,showBalloon:a,destroyTray:o}})),q=K(),J=oe();W();var{updateAudioLevels:se}=K();function Y(){return(0,u.join)(d.app.getPath(`userData`),`recordings.json`)}function ce(){(0,q.registerRegionSelectorHandlers)(),d.ipcMain.handle(`select-region`,async()=>(0,q.selectRegion)()),d.ipcMain.handle(`get-sources`,async(e,t)=>(await d.desktopCapturer.getSources({types:t??[`screen`,`window`],thumbnailSize:{width:340,height:200},fetchWindowIcons:!0})).map(e=>({id:e.id,name:e.name,display_id:e.display_id,appIcon:e.appIcon?.toDataURL()||null,thumbnail:e.thumbnail.toDataURL()}))),d.ipcMain.handle(`get-system-audio-sources`,async()=>{try{return(await d.desktopCapturer.getSources({types:[`audio`]})).map(e=>({id:e.id,name:e.name}))}catch{return[]}}),d.ipcMain.handle(`show-save-dialog`,async(e,t)=>{let n=d.BrowserWindow.getFocusedWindow();return n?d.dialog.showSaveDialog(n,{title:t?.title??`Save Recording`,defaultPath:t?.defaultPath??`recording-${Date.now()}.webm`,filters:t?.filters??[{name:`WebM Video`,extensions:[`webm`]},{name:`MP4 Video`,extensions:[`mp4`]},{name:`GIF`,extensions:[`gif`]}]}):{canceled:!0,filePath:null}}),d.ipcMain.handle(`show-open-dialog`,async(e,t)=>{let n=d.BrowserWindow.getFocusedWindow();return n?d.dialog.showOpenDialog(n,{title:t?.title??`Select File`,defaultPath:t?.defaultPath,filters:t?.filters??[{name:`Video Files`,extensions:[`webm`,`mp4`,`gif`]}],properties:t?.properties}):{canceled:!0,filePaths:[]}}),d.ipcMain.handle(`get-default-save-dir`,async()=>d.app.getPath(`videos`)||d.app.getPath(`desktop`)),d.ipcMain.handle(`write-file`,async(e,t,n)=>{try{return await f.default.promises.mkdir((0,u.dirname)(n),{recursive:!0}),await f.default.promises.writeFile(n,t),U.info(`保存文件`,n),{success:!0,filePath:n}}catch(e){return U.error(`保存文件失败`,n,e.message),{success:!1,filePath:n,error:e.message}}}),d.ipcMain.handle(`read-file`,async(e,t)=>{try{return(await f.default.promises.readFile(t)).buffer}catch(e){throw Error(`Failed to read file: ${e.message}`)}}),d.ipcMain.handle(`file-exists`,async(e,t)=>{try{return await f.default.promises.access(t),!0}catch{return!1}}),d.ipcMain.handle(`delete-file`,async(e,t)=>{try{return await f.default.promises.unlink(t),!0}catch{return!1}}),d.ipcMain.handle(`get-file-size`,async(e,t)=>{try{return(await f.default.promises.stat(t)).size}catch{return 0}});function e(e,t,...n){if(!(!e||e.isDestroyed()))try{e.webContents.send(t,...n)}catch{}}d.ipcMain.handle(`convert-to-mp4`,async(t,n,r,i)=>{U.info(`转换为 MP4`,n,`->`,r,i?`crop: ${i.width}x${i.height}`:``);let a=d.BrowserWindow.fromWebContents(t.sender);return ne(n,r,t=>{e(a,`on-conversion-progress`,t)},i)}),d.ipcMain.handle(`crop-video`,async(t,n,r,i)=>{U.info(`裁剪视频`,n,`->`,r,`crop: ${i.width}x${i.height}+${i.x}+${i.y}`);let a=d.BrowserWindow.fromWebContents(t.sender);return re(n,r,i,t=>{e(a,`on-conversion-progress`,t)})}),d.ipcMain.handle(`convert-to-gif`,async(t,n,r,i)=>{U.info(`转换为 GIF`,n,`->`,r);let a=d.BrowserWindow.fromWebContents(t.sender);return ae(n,r,i,t=>{e(a,`on-conversion-progress`,t)})}),d.ipcMain.handle(`merge-multi-screen`,async(t,n,r)=>{U.info(`合并多屏录制`,n.length,`个屏幕 ->`,r);let i=d.BrowserWindow.fromWebContents(t.sender);return ie(n,r,t=>{e(i,`on-conversion-progress`,t)})}),d.ipcMain.handle(`open-file-location`,async(e,t)=>{d.shell.showItemInFolder(t)}),d.ipcMain.handle(`open-external`,async(e,t)=>{d.shell.openExternal(t)}),d.ipcMain.handle(`open-path`,async(e,t)=>{await d.shell.openPath(t)}),d.ipcMain.handle(`get-app-version`,async()=>d.app.getVersion()),d.ipcMain.handle(`get-screen-scale-factor`,async()=>d.screen.getPrimaryDisplay().scaleFactor),d.ipcMain.handle(`get-screen-bounds`,async()=>{let e=d.screen.getPrimaryDisplay(),t=e.scaleFactor;return{x:Math.round(e.bounds.x/t),y:Math.round(e.bounds.y/t),width:Math.round(e.bounds.width/t),height:Math.round(e.bounds.height/t)}}),d.ipcMain.handle(`get-all-displays`,async()=>{let e=d.screen.getAllDisplays(),t=d.screen.getPrimaryDisplay(),n=await d.desktopCapturer.getSources({types:[`screen`],thumbnailSize:{width:340,height:200}});return e.map((e,r)=>{let i=n[r];return{id:e.id,label:e.id===t.id?`主屏幕`:`屏幕 ${r+1}`,bounds:e.bounds,scaleFactor:e.scaleFactor,size:{width:e.size.width,height:e.size.height},isPrimary:e.id===t.id,sourceId:i?.id||null,sourceName:i?.name||``,thumbnail:i?.thumbnail?.toDataURL()||``}})}),d.ipcMain.handle(`minimize-window`,async e=>{d.BrowserWindow.fromWebContents(e.sender)?.minimize()}),d.ipcMain.handle(`show-window`,async e=>{let t=d.BrowserWindow.fromWebContents(e.sender);t&&(t.show(),t.focus())}),d.ipcMain.handle(`maximize-window`,async e=>{let t=d.BrowserWindow.fromWebContents(e.sender);t?.isMaximized()?t.unmaximize():t?.maximize()}),d.ipcMain.handle(`close-window`,async e=>{d.BrowserWindow.fromWebContents(e.sender)?.close()}),d.ipcMain.on(`notify-conversion-start`,()=>{(0,J.showBalloon)(`二支录制`,`录制完成，正在转换视频格式...`)}),d.ipcMain.on(`show-about-window`,()=>{let e=d.BrowserWindow.getFocusedWindow();if(e){let t=new d.BrowserWindow({width:360,height:400,resizable:!1,frame:!1,modal:!0,parent:e,backgroundColor:`#eaeaec`,webPreferences:{preload:(0,u.join)(__dirname,`..`,`preload`,`index.cjs`),contextIsolation:!0,nodeIntegration:!1,sandbox:!1}});d.ipcMain.on(`close-about-window`,()=>{t.close(),d.ipcMain.removeAllListeners(`close-about-window`)}),t.on(`closed`,()=>{d.ipcMain.removeAllListeners(`close-about-window`)});let n=process.env.VITE_DEV_SERVER_URL?`${process.env.VITE_DEV_SERVER_URL}about.html`:(0,u.join)(d.app.getAppPath(),`dist`,`about.html`);n.startsWith(`http`)?t.loadURL(n):t.loadFile(n)}}),d.ipcMain.on(`notify-conversion-done`,()=>{(0,J.showBalloon)(`二支录制`,`视频转换完成！`)}),d.ipcMain.on(`update-audio-levels`,(e,t,n)=>{se(t,n)}),d.ipcMain.handle(`load-recordings`,async()=>{let e=Y();try{let t=await f.default.promises.readFile(e,`utf-8`),n=JSON.parse(t);return U.info(`加载录制历史`,e,n.length,`条`),n}catch(t){return U.info(`加载录制历史失败（可能首次运行）`,e,t.message),[]}}),d.ipcMain.handle(`save-recordings`,async(e,t)=>{let n=Y();try{return await f.default.promises.writeFile(n,JSON.stringify(t),`utf-8`),U.info(`保存录制历史`,n,t.length,`条`),!0}catch(e){return U.error(`保存录制历史失败`,n,e.message),!1}})}W();var X=null;function le(e){X=e,d.globalShortcut.register(`CommandOrControl+Shift+R`,()=>{U.info(`Global shortcut: start/stop recording`),X?.webContents.send(`on-global-shortcut`,`startStop`)}),d.globalShortcut.register(`CommandOrControl+Shift+P`,()=>{U.info(`Global shortcut: pause/resume recording`),X?.webContents.send(`on-global-shortcut`,`pauseResume`)}),U.info(`Global shortcuts registered`)}function Z(){d.globalShortcut.unregisterAll()}W();var ue=`http://8.163.43.7:3000/report-ip`;function Q(){return(0,u.join)(d.app.getPath(`userData`),`pending-reports.json`)}function de(e){let t=[];try{f.default.existsSync(Q())&&(t=JSON.parse(f.default.readFileSync(Q(),`utf-8`)))}catch{}t.push(e),f.default.writeFileSync(Q(),JSON.stringify(t,null,2),`utf-8`),U.info(`Saved offline report to local, total pending:`,t.length)}function fe(){try{if(f.default.existsSync(Q()))return JSON.parse(f.default.readFileSync(Q(),`utf-8`))}catch{}return[]}function pe(){try{f.default.unlinkSync(Q())}catch{}}async function me(e){try{return await fetch(ue,{method:`POST`,headers:{"Content-Type":`application/json`},body:JSON.stringify(e)}),!0}catch{return!1}}async function he(){let e=fe();if(e.length===0)return!0;let t=[];for(let n of e)await me(n)?U.info(`Flushed pending report:`,n.公网IP,n.上报时间):t.push(n);return t.length===0?(pe(),U.info(`All pending reports flushed`),!0):(f.default.writeFileSync(Q(),JSON.stringify(t,null,2),`utf-8`),U.info(`Some pending reports still failed, remaining:`,t.length),!1)}async function ge(){let e=[async()=>{let e=(await fetch(`https://qifu.baidu.com/opus/api/ip/local`,{headers:{Referer:`https://www.baidu.com`}}).then(e=>e.json()))?.data;if(!e?.ip)throw Error(`empty`);return{公网IP:e.ip,国家:e.country||``,省份:e.province||``,城市:e.city||``,区县:e.district||e.area||``,详细地址:[e.country,e.province,e.city,e.district||e.area].filter(Boolean).join(``),运营商:e.isp||``}},async()=>{let e=await fetch(`http://whois.pconline.com.cn/ipJson.jsp`).then(e=>e.arrayBuffer()),t=new TextDecoder(`gbk`).decode(e),n=JSON.parse(t);if(!n.ip)throw Error(`empty`);return{公网IP:n.ip,国家:`中国`,省份:n.pro||``,城市:n.city||``,区县:n.region||``,详细地址:n.addr||``,运营商:n.addr?.split(` `)?.[1]||``}},async()=>{let e=await fetch(`http://ip-api.com/json/?lang=zh-CN`).then(e=>e.json());if(!e.query)throw Error(`empty`);return{公网IP:e.query,国家:e.country,省份:e.regionName,城市:e.city,区县:``,详细地址:`${e.country}${e.regionName}${e.city}`,运营商:e.isp,纬度:String(e.lat??``),经度:String(e.lon??``)}}];for(let t of e)try{return await t()}catch{continue}return{公网IP:``,国家:``,省份:``,城市:``,区县:``,详细地址:``,运营商:``}}function _e(){let e=(0,h.networkInterfaces)();for(let t of Object.keys(e))for(let n of e[t])if(n.family===`IPv4`&&!n.internal)return n.address;return`127.0.0.1`}async function ve(){let e=_e(),t={电脑名:(0,h.hostname)(),局域网IP:e,上报时间:new Date().toISOString()},n;try{n=await ge()}catch{n={公网IP:``,国家:``,省份:``,城市:``,区县:``,详细地址:``,运营商:``}}let r={...t,...n};await me(r)?(U.info(`IP reported:`,n.公网IP,n.省份,n.城市),he()):(U.info(`Network unavailable, saving report locally`),de(r))}function ye(){let e=fe();e.length>0&&(U.info(`Retrying pending reports:`,e.length),he())}W();var $=null,be=process.env.VITE_DEV_SERVER_URL;function xe(){let e=d.app.isPackaged?(0,u.join)(process.resourcesPath,`logo.ico`):(0,u.join)(__dirname,`../../public/logo.ico`);return d.nativeImage.createFromPath(e)}function Se(e){$=new d.BrowserWindow({icon:xe(),width:550,height:420,minWidth:420,minHeight:340,show:!1,frame:!1,titleBarStyle:`hidden`,title:`二支录制`,backgroundColor:`#eaeaec`,webPreferences:{preload:e,contextIsolation:!0,nodeIntegration:!1,sandbox:!1,backgroundThrottling:!1}}),$.on(`ready-to-show`,()=>{$?.show()}),be?$.loadURL(be):$.loadFile((0,u.join)(process.env.DIST,`index.html`)),$.on(`close`,e=>{d.app.isQuitting||(e.preventDefault(),d.app.isQuitting=!0,$.webContents.send(`app-before-quit`),setTimeout(()=>{Z(),(0,J.destroyTray)(),$=null,d.app.quit()},300))})}d.app.on(`gpu-process-crashed`,(e,t)=>{U.error(`GPU process crashed:`,JSON.stringify(t))}),d.app.whenReady().then(()=>{process.env.DIST=(0,u.join)(__dirname,`../../dist`),process.env.VITE_PUBLIC=d.app.isPackaged?process.env.DIST:(0,u.join)(__dirname,`../../public`),B(),U.info(`App starting...`);let e=(0,u.join)(__dirname,`..`,`preload`,`index.cjs`);ce(),Se(e),(0,q.setMainWindow)($),(0,J.createTray)(),le($),ve(),setInterval(ye,3e4),d.app.on(`activate`,()=>{d.BrowserWindow.getAllWindows().length===0&&Se(e)})}),d.app.on(`window-all-closed`,()=>{}),d.app.on(`before-quit`,()=>{d.app.isQuitting=!0,Z(),(0,J.destroyTray)(),$=null});
=======
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
//#region electron/main/tray.ts
var require_tray = /* @__PURE__ */ __commonJSMin(((exports, module) => {
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
}));
//#endregion
//#region electron/main/ipc-handlers.ts
var import_region_selector = require_region_selector();
var import_tray = require_tray();
init_logger();
var { updateAudioLevels } = require_region_selector();
function getRecordingsPath() {
	return (0, node_path.join)(electron.app.getPath("userData"), "recordings.json");
}
function registerIpcHandlers() {
	(0, import_region_selector.registerRegionSelectorHandlers)();
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
	mainWindow.on("ready-to-show", () => {
		mainWindow?.show();
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
>>>>>>> e23b4f114715f74f0e1ad24d43e9b9ef714e8b73
