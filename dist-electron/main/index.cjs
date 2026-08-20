var e=Object.create,t=Object.defineProperty,n=Object.getOwnPropertyDescriptor,r=Object.getOwnPropertyNames,i=Object.getPrototypeOf,a=Object.prototype.hasOwnProperty,o=(e,t)=>()=>(e&&(t=e(e=0)),t),s=(e,t)=>()=>(t||(e((t={exports:{}}).exports,t),e=null),t.exports),c=(e,i,o,s)=>{if(i&&typeof i==`object`||typeof i==`function`)for(var c=r(i),l=0,u=c.length,d;l<u;l++)d=c[l],!a.call(e,d)&&d!==o&&t(e,d,{get:(e=>i[e]).bind(null,d),enumerable:!(s=n(i,d))||s.enumerable});return e},l=(n,r,a)=>(a=n==null?{}:e(i(n)),c(r||!n||!n.__esModule?t(a,`default`,{value:n,enumerable:!0}):a,n));let u=require(`node:path`);u=l(u);let d=require(`electron`),f=require(`path`);f=l(f);let p=require(`child_process`),m=require(`os`);m=l(m);let h=require(`fs`);h=l(h);let g=require(`http`);g=l(g);let _=require(`node:fs`);_=l(_);let v=require(`fluent-ffmpeg`);v=l(v);let y=require(`@ffmpeg-installer/ffmpeg`);y=l(y);let b=require(`node:os`);b=l(b);let x=require(`node:crypto`),S=require(`node:child_process`),C=require(`node:util`),ee=require(`node:stream`);var te=s(((e,t)=>{var n=require(`fs`),r=require(`path`);t.exports={findAndReadPackageJson:i,tryReadJsonAt:a};function i(){return a(c())||a(s())||a(process.resourcesPath,`app.asar`)||a(process.resourcesPath,`app`)||a(process.cwd())||{name:void 0,version:void 0}}function a(...e){if(e[0])try{let t=o(`package.json`,r.join(...e));if(!t)return;let i=JSON.parse(n.readFileSync(t,`utf8`)),a=i?.productName||i?.name;return!a||a.toLowerCase()===`electron`?void 0:a?{name:a,version:i?.version}:void 0}catch{return}}function o(e,t){let i=t;for(;;){let t=r.parse(i),a=t.root,o=t.dir;if(n.existsSync(r.join(i,e)))return r.resolve(r.join(i,e));if(i===a)return null;i=o}}function s(){let e=process.argv.filter(e=>e.indexOf(`--user-data-dir=`)===0);return e.length===0||typeof e[0]!=`string`?null:e[0].replace(`--user-data-dir=`,``)}function c(){try{return require.main?.filename}catch{return}}})),ne=s(((e,t)=>{var n=require(`child_process`),r=require(`os`),i=require(`path`),a=te();t.exports=class{appName=void 0;appPackageJson=void 0;platform=process.platform;getAppLogPath(e=this.getAppName()){return this.platform===`darwin`?i.join(this.getSystemPathHome(),`Library/Logs`,e):i.join(this.getAppUserDataPath(e),`logs`)}getAppName(){let e=this.appName||this.getAppPackageJson()?.name;if(!e)throw Error(`electron-log can't determine the app name. It tried these methods:
1. Use \`electron.app.name\`
2. Use productName or name from the nearest package.json\`
You can also set it through log.transports.file.setAppName()`);return e}getAppPackageJson(){return typeof this.appPackageJson!=`object`&&(this.appPackageJson=a.findAndReadPackageJson()),this.appPackageJson}getAppUserDataPath(e=this.getAppName()){return e?i.join(this.getSystemPathAppData(),e):void 0}getAppVersion(){return this.getAppPackageJson()?.version}getElectronLogPath(){return this.getAppLogPath()}getMacOsVersion(){let e=Number(r.release().split(`.`)[0]);return e<=19?`10.${e-4}`:e-9}getOsVersion(){let e=r.type().replace(`_`,` `),t=r.release();return e===`Darwin`&&(e=`macOS`,t=this.getMacOsVersion()),`${e} ${t}`}getPathVariables(){let e=this.getAppName(),t=this.getAppVersion(),n=this;return{appData:this.getSystemPathAppData(),appName:e,appVersion:t,get electronDefaultDir(){return n.getElectronLogPath()},home:this.getSystemPathHome(),libraryDefaultDir:this.getAppLogPath(e),libraryTemplate:this.getAppLogPath(`{appName}`),temp:this.getSystemPathTemp(),userData:this.getAppUserDataPath(e)}}getSystemPathAppData(){let e=this.getSystemPathHome();switch(this.platform){case`darwin`:return i.join(e,`Library/Application Support`);case`win32`:return process.env.APPDATA||i.join(e,`AppData/Roaming`);default:return process.env.XDG_CONFIG_HOME||i.join(e,`.config`)}}getSystemPathHome(){return r.homedir?.()||process.env.HOME}getSystemPathTemp(){return r.tmpdir()}getVersions(){return{app:`${this.getAppName()} ${this.getAppVersion()}`,electron:void 0,os:this.getOsVersion()}}isDev(){return process.env.NODE_ENV===`development`||process.env.ELECTRON_IS_DEV===`1`}isElectron(){return!!process.versions.electron}onAppEvent(e,t){}onAppReady(e){e()}onEveryWebContentsEvent(e,t){}onIpc(e,t){}onIpcInvoke(e,t){}openUrl(e,t=console.error){let r={darwin:`open`,win32:`start`,linux:`xdg-open`}[process.platform]||`xdg-open`;n.exec(`${r} ${e}`,{},e=>{e&&t(e)})}setAppName(e){this.appName=e}setPlatform(e){this.platform=e}setPreloadFileForSessions({filePath:e,includeFutureSession:t=!0,getSessions:n=()=>[]}){}sendIpc(e,t){}showErrorBox(e,t){}}})),w=s(((e,t)=>{var n=require(`path`),r=ne();t.exports=class extends r{electron=void 0;constructor({electron:e}={}){super(),this.electron=e}getAppName(){let e;try{e=this.appName||this.electron.app?.name||this.electron.app?.getName()}catch{}return e||super.getAppName()}getAppUserDataPath(e){return this.getPath(`userData`)||super.getAppUserDataPath(e)}getAppVersion(){let e;try{e=this.electron.app?.getVersion()}catch{}return e||super.getAppVersion()}getElectronLogPath(){return this.getPath(`logs`)||super.getElectronLogPath()}getPath(e){try{return this.electron.app?.getPath(e)}catch{return}}getVersions(){return{app:`${this.getAppName()} ${this.getAppVersion()}`,electron:`Electron ${process.versions.electron}`,os:this.getOsVersion()}}getSystemPathAppData(){return this.getPath(`appData`)||super.getSystemPathAppData()}isDev(){return this.electron.app?.isPackaged===void 0?typeof process.execPath==`string`?n.basename(process.execPath).toLowerCase().startsWith(`electron`):super.isDev():!this.electron.app.isPackaged}onAppEvent(e,t){return this.electron.app?.on(e,t),()=>{this.electron.app?.off(e,t)}}onAppReady(e){this.electron.app?.isReady()?e():this.electron.app?.once?this.electron.app?.once(`ready`,e):e()}onEveryWebContentsEvent(e,t){return this.electron.webContents?.getAllWebContents()?.forEach(n=>{n.on(e,t)}),this.electron.app?.on(`web-contents-created`,n),()=>{this.electron.webContents?.getAllWebContents().forEach(n=>{n.off(e,t)}),this.electron.app?.off(`web-contents-created`,n)};function n(n,r){r.on(e,t)}}onIpc(e,t){this.electron.ipcMain?.on(e,t)}onIpcInvoke(e,t){this.electron.ipcMain?.handle?.(e,t)}openUrl(e,t=console.error){this.electron.shell?.openExternal(e).catch(t)}setPreloadFileForSessions({filePath:e,includeFutureSession:t=!0,getSessions:n=()=>[this.electron.session?.defaultSession]}){for(let e of n().filter(Boolean))r(e);t&&this.onAppEvent(`session-created`,e=>{r(e)});function r(t){typeof t.registerPreloadScript==`function`?t.registerPreloadScript({filePath:e,id:`electron-log-preload`,type:`frame`}):t.setPreloads([...t.getPreloads(),e])}}sendIpc(e,t){this.electron.BrowserWindow?.getAllWindows()?.forEach(n=>{n.webContents?.isDestroyed()===!1&&n.webContents?.isCrashed()===!1&&n.webContents.send(e,t)})}showErrorBox(e,t){this.electron.dialog?.showErrorBox(e,t)}}})),T=s(((e,t)=>{var n={};try{n=require(`electron`)}catch{}n.ipcRenderer&&r(n),typeof t==`object`&&(t.exports=r);function r({contextBridge:e,ipcRenderer:t}){if(!t)return;t.on(`__ELECTRON_LOG_IPC__`,(e,t)=>{window.postMessage({cmd:`message`,...t})}),t.invoke(`__ELECTRON_LOG__`,{cmd:`getOptions`}).catch(e=>console.error(Error(`electron-log isn't initialized in the main process. Please call log.initialize() before. ${e.message}`)));let n={sendToMain(e){try{t.send(`__ELECTRON_LOG__`,e)}catch(n){console.error(`electronLog.sendToMain `,n,`data:`,e),t.send(`__ELECTRON_LOG__`,{cmd:`errorHandler`,error:{message:n?.message,stack:n?.stack},errorName:`sendToMain`})}},log(...e){n.sendToMain({data:e,level:`info`})}};for(let e of[`error`,`warn`,`info`,`verbose`,`debug`,`silly`])n[e]=(...t)=>n.sendToMain({data:t,level:e});if(e&&process.contextIsolated)try{e.exposeInMainWorld(`__electronLog`,n)}catch{}typeof window==`object`?window.__electronLog=n:__electronLog=n}})),re=s(((e,t)=>{var n=require(`fs`),r=require(`os`),i=require(`path`),a=T(),o=!1,s=!1;t.exports={initialize({externalApi:e,getSessions:t,includeFutureSession:n,logger:r,preload:i=!0,spyRendererConsole:a=!1}){e.onAppReady(()=>{try{i&&c({externalApi:e,getSessions:t,includeFutureSession:n,logger:r,preloadOption:i}),a&&l({externalApi:e,logger:r})}catch(e){r.warn(e)}})}};function c({externalApi:e,getSessions:t,includeFutureSession:s,logger:c,preloadOption:l}){let u=typeof l==`string`?l:void 0;if(o){c.warn(Error(`log.initialize({ preload }) already called`).stack);return}o=!0;try{u=i.resolve(__dirname,`../renderer/electron-log-preload.js`)}catch{}if(!u||!n.existsSync(u)){u=i.join(e.getAppUserDataPath()||r.tmpdir(),`electron-log-preload.js`);let t=`
      try {
        (${a.toString()})(require('electron'));
      } catch(e) {
        console.error(e);
      }
    `;n.writeFileSync(u,t,`utf8`)}e.setPreloadFileForSessions({filePath:u,includeFutureSession:s,getSessions:t})}function l({externalApi:e,logger:t}){if(s){t.warn(Error(`log.initialize({ spyRendererConsole }) already called`).stack);return}s=!0;let n=[`debug`,`info`,`warn`,`error`];e.onEveryWebContentsEvent(`console-message`,(e,r,i)=>{t.processMessage({data:[i],level:n[r],variables:{processType:`renderer`}})})}})),E=s(((e,t)=>{t.exports=n;function n(e){return Object.defineProperties(t,{defaultLabel:{value:``,writable:!0},labelPadding:{value:!0,writable:!0},maxLabelLength:{value:0,writable:!0},labelLength:{get(){switch(typeof t.labelPadding){case`boolean`:return t.labelPadding?t.maxLabelLength:0;case`number`:return t.labelPadding;default:return 0}}}});function t(n){t.maxLabelLength=Math.max(t.maxLabelLength,n.length);let r={};for(let t of e.levels)r[t]=(...r)=>e.logData(r,{level:t,scope:n});return r.log=r.info,r}}})),ie=s(((e,t)=>{t.exports=class{constructor({processMessage:e}){this.processMessage=e,this.buffer=[],this.enabled=!1,this.begin=this.begin.bind(this),this.commit=this.commit.bind(this),this.reject=this.reject.bind(this)}addMessage(e){this.buffer.push(e)}begin(){this.enabled=[]}commit(){this.enabled=!1,this.buffer.forEach(e=>this.processMessage(e)),this.buffer=[]}reject(){this.enabled=!1,this.buffer=[]}}})),ae=s(((e,t)=>{var n=E(),r=ie();t.exports=class e{static instances={};dependencies={};errorHandler=null;eventLogger=null;functions={};hooks=[];isDev=!1;levels=null;logId=null;scope=null;transports={};variables={};constructor({allowUnknownLevel:t=!1,dependencies:i={},errorHandler:a,eventLogger:o,initializeFn:s,isDev:c=!1,levels:l=[`error`,`warn`,`info`,`verbose`,`debug`,`silly`],logId:u,transportFactories:d={},variables:f}={}){this.addLevel=this.addLevel.bind(this),this.create=this.create.bind(this),this.initialize=this.initialize.bind(this),this.logData=this.logData.bind(this),this.processMessage=this.processMessage.bind(this),this.allowUnknownLevel=t,this.buffering=new r(this),this.dependencies=i,this.initializeFn=s,this.isDev=c,this.levels=l,this.logId=u,this.scope=n(this),this.transportFactories=d,this.variables=f||{};for(let e of this.levels)this.addLevel(e,!1);this.log=this.info,this.functions.log=this.log,this.errorHandler=a,a?.setOptions({...i,logFn:this.error}),this.eventLogger=o,o?.setOptions({...i,logger:this});for(let[e,t]of Object.entries(d))this.transports[e]=t(this,i);e.instances[u]=this}static getInstance({logId:e}){return this.instances[e]||this.instances.default}addLevel(e,t=this.levels.length){t!==!1&&this.levels.splice(t,0,e),this[e]=(...t)=>this.logData(t,{level:e}),this.functions[e]=this[e]}catchErrors(e){return this.processMessage({data:[`log.catchErrors is deprecated. Use log.errorHandler instead`],level:`warn`},{transports:[`console`]}),this.errorHandler.startCatching(e)}create(t){return typeof t==`string`&&(t={logId:t}),new e({dependencies:this.dependencies,errorHandler:this.errorHandler,initializeFn:this.initializeFn,isDev:this.isDev,transportFactories:this.transportFactories,variables:{...this.variables},...t})}compareLevels(e,t,n=this.levels){let r=n.indexOf(e),i=n.indexOf(t);return i===-1||r===-1?!0:i<=r}initialize(e={}){this.initializeFn({logger:this,...this.dependencies,...e})}logData(e,t={}){this.buffering.enabled?this.buffering.addMessage({data:e,date:new Date,...t}):this.processMessage({data:e,...t})}processMessage(e,{transports:t=this.transports}={}){if(e.cmd===`errorHandler`){this.errorHandler.handle(e.error,{errorName:e.errorName,processType:`renderer`,showDialog:!!e.showDialog});return}let n=e.level;this.allowUnknownLevel||(n=this.levels.includes(e.level)?e.level:`info`);let r={date:new Date,logId:this.logId,...e,level:n,variables:{...this.variables,...e.variables}};for(let[n,i]of this.transportEntries(t))if(!(typeof i!=`function`||i.level===!1)&&this.compareLevels(i.level,e.level))try{let e=this.hooks.reduce((e,t)=>e&&t(e,i,n),r);e&&i({...e,data:[...e.data]})}catch(e){this.processInternalErrorFn(e)}}processInternalErrorFn(e){}transportEntries(e=this.transports){return(Array.isArray(e)?e:Object.entries(e)).map(e=>{switch(typeof e){case`string`:return this.transports[e]?[e,this.transports[e]]:null;case`function`:return[e.name,e];default:return Array.isArray(e)?e:null}}).filter(Boolean)}}})),oe=s(((e,t)=>{var n=class{externalApi=void 0;isActive=!1;logFn=void 0;onError=void 0;showDialog=!0;constructor({externalApi:e,logFn:t=void 0,onError:n=void 0,showDialog:r=void 0}={}){this.createIssue=this.createIssue.bind(this),this.handleError=this.handleError.bind(this),this.handleRejection=this.handleRejection.bind(this),this.setOptions({externalApi:e,logFn:t,onError:n,showDialog:r}),this.startCatching=this.startCatching.bind(this),this.stopCatching=this.stopCatching.bind(this)}handle(e,{logFn:t=this.logFn,onError:n=this.onError,processType:i=`browser`,showDialog:a=this.showDialog,errorName:o=``}={}){e=r(e);try{if(typeof n==`function`){let t=this.externalApi?.getVersions()||{},r=this.createIssue;if(n({createIssue:r,error:e,errorName:o,processType:i,versions:t})===!1)return}o?t(o,e):t(e),a&&!o.includes(`rejection`)&&this.externalApi&&this.externalApi.showErrorBox(`A JavaScript error occurred in the ${i} process`,e.stack)}catch{console.error(e)}}setOptions({externalApi:e,logFn:t,onError:n,showDialog:r}){typeof e==`object`&&(this.externalApi=e),typeof t==`function`&&(this.logFn=t),typeof n==`function`&&(this.onError=n),typeof r==`boolean`&&(this.showDialog=r)}startCatching({onError:e,showDialog:t}={}){this.isActive||(this.isActive=!0,this.setOptions({onError:e,showDialog:t}),process.on(`uncaughtException`,this.handleError),process.on(`unhandledRejection`,this.handleRejection))}stopCatching(){this.isActive=!1,process.removeListener(`uncaughtException`,this.handleError),process.removeListener(`unhandledRejection`,this.handleRejection)}createIssue(e,t){this.externalApi?.openUrl(`${e}?${new URLSearchParams(t).toString()}`)}handleError(e){this.handle(e,{errorName:`Unhandled`})}handleRejection(e){let t=e instanceof Error?e:Error(JSON.stringify(e));this.handle(t,{errorName:`Unhandled rejection`})}};function r(e){if(e instanceof Error)return e;if(e&&typeof e==`object`){if(e.message)return Object.assign(Error(e.message),e);try{return Error(JSON.stringify(e))}catch(t){return Error(`Couldn't normalize error ${String(e)}: ${t}`)}}return Error(`Can't normalize error ${String(e)}`)}t.exports=n})),se=s(((e,t)=>{t.exports=class{disposers=[];format=`{eventSource}#{eventName}:`;formatters={app:{"certificate-error":({args:e})=>this.arrayToObject(e.slice(1,4),[`url`,`error`,`certificate`]),"child-process-gone":({args:e})=>e.length===1?e[0]:e,"render-process-gone":({args:[e,t]})=>t&&typeof t==`object`?{...t,...this.getWebContentsDetails(e)}:[]},webContents:{"console-message":({args:[e,t,n,r]})=>{if(!(e<3))return{message:t,source:`${r}:${n}`}},"did-fail-load":({args:e})=>this.arrayToObject(e,[`errorCode`,`errorDescription`,`validatedURL`,`isMainFrame`,`frameProcessId`,`frameRoutingId`]),"did-fail-provisional-load":({args:e})=>this.arrayToObject(e,[`errorCode`,`errorDescription`,`validatedURL`,`isMainFrame`,`frameProcessId`,`frameRoutingId`]),"plugin-crashed":({args:e})=>this.arrayToObject(e,[`name`,`version`]),"preload-error":({args:e})=>this.arrayToObject(e,[`preloadPath`,`error`])}};events={app:{"certificate-error":!0,"child-process-gone":!0,"render-process-gone":!0},webContents:{"did-fail-load":!0,"did-fail-provisional-load":!0,"plugin-crashed":!0,"preload-error":!0,unresponsive:!0}};externalApi=void 0;level=`error`;scope=``;constructor(e={}){this.setOptions(e)}setOptions({events:e,externalApi:t,level:n,logger:r,format:i,formatters:a,scope:o}){typeof e==`object`&&(this.events=e),typeof t==`object`&&(this.externalApi=t),typeof n==`string`&&(this.level=n),typeof r==`object`&&(this.logger=r),(typeof i==`string`||typeof i==`function`)&&(this.format=i),typeof a==`object`&&(this.formatters=a),typeof o==`string`&&(this.scope=o)}startLogging(e={}){this.setOptions(e),this.disposeListeners();for(let e of this.getEventNames(this.events.app))this.disposers.push(this.externalApi.onAppEvent(e,(...t)=>{this.handleEvent({eventSource:`app`,eventName:e,handlerArgs:t})}));for(let e of this.getEventNames(this.events.webContents))this.disposers.push(this.externalApi.onEveryWebContentsEvent(e,(...t)=>{this.handleEvent({eventSource:`webContents`,eventName:e,handlerArgs:t})}))}stopLogging(){this.disposeListeners()}arrayToObject(e,t){let n={};return t.forEach((t,r)=>{n[t]=e[r]}),e.length>t.length&&(n.unknownArgs=e.slice(t.length)),n}disposeListeners(){this.disposers.forEach(e=>e()),this.disposers=[]}formatEventLog({eventName:e,eventSource:t,handlerArgs:n}){let[r,...i]=n;if(typeof this.format==`function`)return this.format({args:i,event:r,eventName:e,eventSource:t});let a=this.formatters[t]?.[e],o=i;if(typeof a==`function`&&(o=a({args:i,event:r,eventName:e,eventSource:t})),!o)return;let s={};return Array.isArray(o)?s.args=o:typeof o==`object`&&Object.assign(s,o),t===`webContents`&&Object.assign(s,this.getWebContentsDetails(r?.sender)),[this.format.replace(`{eventSource}`,t===`app`?`App`:`WebContents`).replace(`{eventName}`,e),s]}getEventNames(e){return!e||typeof e!=`object`?[]:Object.entries(e).filter(([e,t])=>t).map(([e])=>e)}getWebContentsDetails(e){if(!e?.loadURL)return{};try{return{webContents:{id:e.id,url:e.getURL()}}}catch{return{}}}handleEvent({eventName:e,eventSource:t,handlerArgs:n}){let r=this.formatEventLog({eventName:e,eventSource:t,handlerArgs:n});r&&(this.scope?this.logger.scope(this.scope):this.logger)?.[this.level]?.(...r)}}})),D=s(((e,t)=>{t.exports={transform:n};function n({logger:e,message:t,transport:n,initialData:r=t?.data||[],transforms:i=n?.transforms}){return i.reduce((r,i)=>typeof i==`function`?i({data:r,logger:e,message:t,transport:n}):r,r)}})),O=s(((e,t)=>{var{transform:n}=D();t.exports={concatFirstStringElements:r,formatScope:a,formatText:s,formatVariables:o,timeZoneFromOffset:i,format({message:e,logger:t,transport:r,data:i=e?.data}){switch(typeof r.format){case`string`:return n({message:e,logger:t,transforms:[o,a,s],transport:r,initialData:[r.format,...i]});case`function`:return r.format({data:i,level:e?.level||`info`,logger:t,message:e,transport:r});default:return i}}};function r({data:e}){return typeof e[0]!=`string`||typeof e[1]!=`string`||e[0].match(/%[1cdfiOos]/)?e:[`${e[0]} ${e[1]}`,...e.slice(2)]}function i(e){let t=Math.abs(e);return`${e>0?`-`:`+`}${Math.floor(t/60).toString().padStart(2,`0`)}:${(t%60).toString().padStart(2,`0`)}`}function a({data:e,logger:t,message:n}){let{defaultLabel:r,labelLength:i}=t?.scope||{},a=e[0],o=n.scope;o||=r;let s;return s=o===``?i>0?``.padEnd(i+3):``:typeof o==`string`?` (${o})`.padEnd(i+3):``,e[0]=a.replace(`{scope}`,s),e}function o({data:e,message:t}){let n=e[0];if(typeof n!=`string`)return e;n=n.replace(`{level}]`,`${t.level}]`.padEnd(6,` `));let r=t.date||new Date;return e[0]=n.replace(/\{(\w+)}/g,(e,n)=>{switch(n){case`level`:return t.level||`info`;case`logId`:return t.logId;case`y`:return r.getFullYear().toString(10);case`m`:return(r.getMonth()+1).toString(10).padStart(2,`0`);case`d`:return r.getDate().toString(10).padStart(2,`0`);case`h`:return r.getHours().toString(10).padStart(2,`0`);case`i`:return r.getMinutes().toString(10).padStart(2,`0`);case`s`:return r.getSeconds().toString(10).padStart(2,`0`);case`ms`:return r.getMilliseconds().toString(10).padStart(3,`0`);case`z`:return i(r.getTimezoneOffset());case`iso`:return r.toISOString();default:return t.variables?.[n]||e}}).trim(),e}function s({data:e}){let t=e[0];if(typeof t!=`string`)return e;if(t.lastIndexOf(`{text}`)===t.length-6)return e[0]=t.replace(/\s?{text}/,``),e[0]===``&&e.shift(),e;let n=t.split(`{text}`),r=[];return n[0]!==``&&r.push(n[0]),r=r.concat(e.slice(1)),n[1]!==``&&r.push(n[1]),r}})),ce=s(((e,t)=>{var n=require(`util`);t.exports={serialize:i,maxDepth({data:e,transport:n,depth:r=n?.depth??6}){if(!e)return e;if(r<1)return Array.isArray(e)?`[array]`:typeof e==`object`&&e?`[object]`:e;if(Array.isArray(e))return e.map(e=>t.exports.maxDepth({data:e,depth:r-1}));if(typeof e!=`object`||e&&typeof e.toISOString==`function`)return e;if(e===null)return null;if(e instanceof Error)return e;let i={};for(let n in e)Object.prototype.hasOwnProperty.call(e,n)&&(i[n]=t.exports.maxDepth({data:e[n],depth:r-1}));return i},toJSON({data:e}){return JSON.parse(JSON.stringify(e,r()))},toString({data:e,transport:t}){let i=t?.inspectOptions||{},a=e.map(e=>{if(e!==void 0)try{let t=JSON.stringify(e,r(),`  `);return t===void 0?void 0:JSON.parse(t)}catch{return e}});return n.formatWithOptions(i,...a)}};function r(e={}){let t=new WeakSet;return function(n,r){if(typeof r==`object`&&r){if(t.has(r))return;t.add(r)}return i(n,r,e)}}function i(e,t,n={}){let r=n?.serializeMapAndSet!==!1;return t instanceof Error?t.stack:t&&(typeof t==`function`?`[function] ${t.toString()}`:t instanceof Date?t.toISOString():r&&t instanceof Map&&Object.fromEntries?Object.fromEntries(t):r&&t instanceof Set&&Array.from?Array.from(t):t)}})),le=s(((e,t)=>{t.exports={transformStyles:a,applyAnsiStyles({data:e}){return a(e,r,i)},removeStyles({data:e}){return a(e,()=>``)}};var n={unset:`\x1B[0m`,black:`\x1B[30m`,red:`\x1B[31m`,green:`\x1B[32m`,yellow:`\x1B[33m`,blue:`\x1B[34m`,magenta:`\x1B[35m`,cyan:`\x1B[36m`,white:`\x1B[37m`,gray:`\x1B[90m`};function r(e){return n[e.replace(/color:\s*(\w+).*/,`$1`).toLowerCase()]||``}function i(e){return e+n.unset}function a(e,t,n){let r={};return e.reduce((e,i,a,o)=>{if(r[a])return e;if(typeof i==`string`){let e=a,s=!1;i=i.replace(/%[1cdfiOos]/g,n=>{if(e+=1,n!==`%c`)return n;let a=o[e];return typeof a==`string`?(r[e]=!0,s=!0,t(a,i)):n}),s&&n&&(i=n(i))}return e.push(i),e},[])}})),ue=s(((e,t)=>{var{concatFirstStringElements:n,format:r}=O(),{maxDepth:i,toJSON:a}=ce(),{applyAnsiStyles:o,removeStyles:s}=le(),{transform:c}=D(),l={error:console.error,warn:console.warn,info:console.info,verbose:console.info,debug:console.debug,silly:console.debug,log:console.log};t.exports=d;var u=`%c{h}:{i}:{s}.{ms}{scope}%c ${process.platform===`win32`?`>`:`›`} {text}`;Object.assign(d,{DEFAULT_FORMAT:u});function d(e){return Object.assign(t,{colorMap:{error:`red`,warn:`yellow`,info:`cyan`,verbose:`unset`,debug:`gray`,silly:`gray`,default:`unset`},format:u,level:`silly`,transforms:[f,r,m,n,i,a],useStyles:process.env.FORCE_STYLES,writeFn({message:e}){(l[e.level]||l.info)(...e.data)}});function t(n){let r=c({logger:e,message:n,transport:t});t.writeFn({message:{...n,data:r}})}}function f({data:e,message:t,transport:n}){return typeof n.format!=`string`||!n.format.includes(`%c`)?e:[`color:${h(t.level,n)}`,`color:unset`,...e]}function p(e,t){if(typeof e==`boolean`)return e;let n=t===`error`||t===`warn`?process.stderr:process.stdout;return n&&n.isTTY}function m(e){let{message:t,transport:n}=e;return(p(n.useStyles,t.level)?o:s)(e)}function h(e,t){return t.colorMap[e]||t.colorMap.default}})),de=s(((e,t)=>{var n=require(`events`),r=require(`fs`),i=require(`os`);t.exports=class extends n{asyncWriteQueue=[];bytesWritten=0;hasActiveAsyncWriting=!1;path=null;initialSize=void 0;writeOptions=null;writeAsync=!1;constructor({path:e,writeOptions:t={encoding:`utf8`,flag:`a`,mode:438},writeAsync:n=!1}){super(),this.path=e,this.writeOptions=t,this.writeAsync=n}get size(){return this.getSize()}clear(){try{return r.writeFileSync(this.path,``,{mode:this.writeOptions.mode,flag:`w`}),this.reset(),!0}catch(e){return e.code===`ENOENT`?!0:(this.emit(`error`,e,this),!1)}}crop(e){try{let t=a(this.path,e||4096);this.clear(),this.writeLine(`[log cropped]${i.EOL}${t}`)}catch(e){this.emit(`error`,Error(`Couldn't crop file ${this.path}. ${e.message}`),this)}}getSize(){if(this.initialSize===void 0)try{let e=r.statSync(this.path);this.initialSize=e.size}catch{this.initialSize=0}return this.initialSize+this.bytesWritten}increaseBytesWrittenCounter(e){this.bytesWritten+=Buffer.byteLength(e,this.writeOptions.encoding)}isNull(){return!1}nextAsyncWrite(){let e=this;if(this.hasActiveAsyncWriting||this.asyncWriteQueue.length===0)return;let t=this.asyncWriteQueue.join(``);this.asyncWriteQueue=[],this.hasActiveAsyncWriting=!0,r.writeFile(this.path,t,this.writeOptions,n=>{e.hasActiveAsyncWriting=!1,n?e.emit(`error`,Error(`Couldn't write to ${e.path}. ${n.message}`),this):e.increaseBytesWrittenCounter(t),e.nextAsyncWrite()})}reset(){this.initialSize=void 0,this.bytesWritten=0}toString(){return this.path}writeLine(e){if(e+=i.EOL,this.writeAsync){this.asyncWriteQueue.push(e),this.nextAsyncWrite();return}try{r.writeFileSync(this.path,e,this.writeOptions),this.increaseBytesWrittenCounter(e)}catch(e){this.emit(`error`,Error(`Couldn't write to ${this.path}. ${e.message}`),this)}}};function a(e,t){let n=Buffer.alloc(t),i=r.statSync(e),a=Math.min(i.size,t),o=Math.max(0,i.size-t),s=r.openSync(e,`r`),c=r.readSync(s,n,0,a,o);return r.closeSync(s),n.toString(`utf8`,0,c)}})),fe=s(((e,t)=>{var n=de();t.exports=class extends n{clear(){}crop(){}getSize(){return 0}isNull(){return!0}writeLine(){}}})),pe=s(((e,t)=>{var n=require(`events`),r=require(`fs`),i=require(`path`),a=de(),o=fe();t.exports=class extends n{store={};constructor(){super(),this.emitError=this.emitError.bind(this)}provide({filePath:e,writeOptions:t={},writeAsync:n=!1}){let r;try{if(e=i.resolve(e),this.store[e])return this.store[e];r=this.createFile({filePath:e,writeOptions:t,writeAsync:n})}catch(t){r=new o({path:e}),this.emitError(t,r)}return r.on(`error`,this.emitError),this.store[e]=r,r}createFile({filePath:e,writeOptions:t,writeAsync:n}){return this.testFileWriting({filePath:e,writeOptions:t}),new a({path:e,writeOptions:t,writeAsync:n})}emitError(e,t){this.emit(`error`,e,t)}testFileWriting({filePath:e,writeOptions:t}){r.mkdirSync(i.dirname(e),{recursive:!0}),r.writeFileSync(e,``,{flag:`a`,mode:t.mode})}}})),me=s(((e,t)=>{var n=require(`fs`),r=require(`os`),i=require(`path`),a=pe(),{transform:o}=D(),{removeStyles:s}=le(),{format:c,concatFirstStringElements:l}=O(),{toString:u}=ce();t.exports=f;var d=new a;function f(e,{registry:t=d,externalApi:a}={}){let f;return t.listenerCount(`error`)<1&&t.on(`error`,(e,t)=>{g(`Can't write to ${t}`,e)}),Object.assign(m,{fileName:p(e.variables.processType),format:`[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}]{scope} {text}`,getFile:_,inspectOptions:{depth:5},level:`silly`,maxSize:1024**2,readAllLogs:v,sync:!0,transforms:[s,c,l,u],writeOptions:{flag:`a`,mode:438,encoding:`utf8`},archiveLogFn(e){let t=e.toString(),r=i.parse(t);try{n.renameSync(t,i.join(r.dir,`${r.name}.old${r.ext}`))}catch(t){g(`Could not rotate log`,t);let n=Math.round(m.maxSize/4);e.crop(Math.min(n,256*1024))}},resolvePathFn(e){return i.join(e.libraryDefaultDir,e.fileName)},setAppName(t){e.dependencies.externalApi.setAppName(t)}});function m(t){let n=_(t);m.maxSize>0&&n.size>m.maxSize&&(m.archiveLogFn(n),n.reset());let r=o({logger:e,message:t,transport:m});n.writeLine(r)}function h(){f||(f=Object.create(Object.prototype,{...Object.getOwnPropertyDescriptors(a.getPathVariables()),fileName:{get(){return m.fileName},enumerable:!0}}),typeof m.archiveLog==`function`&&(m.archiveLogFn=m.archiveLog,g(`archiveLog is deprecated. Use archiveLogFn instead`)),typeof m.resolvePath==`function`&&(m.resolvePathFn=m.resolvePath,g(`resolvePath is deprecated. Use resolvePathFn instead`)))}function g(t,n=null,r=`error`){let i=[`electron-log.transports.file: ${t}`];n&&i.push(n),e.transports.console({data:i,date:new Date,level:r})}function _(e){h();let n=m.resolvePathFn(f,e);return t.provide({filePath:n,writeAsync:!m.sync,writeOptions:m.writeOptions})}function v({fileFilter:e=e=>e.endsWith(`.log`)}={}){h();let t=i.dirname(m.resolvePathFn(f));return n.existsSync(t)?n.readdirSync(t).map(e=>i.join(t,e)).filter(e).map(e=>{try{return{path:e,lines:n.readFileSync(e,`utf8`).split(r.EOL)}}catch{return null}}).filter(Boolean):[]}}function p(e=process.type){switch(e){case`renderer`:return`renderer.log`;case`worker`:return`worker.log`;default:return`main.log`}}})),he=s(((e,t)=>{var{maxDepth:n,toJSON:r}=ce(),{transform:i}=D();t.exports=a;function a(e,{externalApi:t}){return Object.assign(a,{depth:3,eventId:`__ELECTRON_LOG_IPC__`,level:e.isDev?`silly`:!1,transforms:[r,n]}),t?.isElectron()?a:void 0;function a(n){n?.variables?.processType!==`renderer`&&t?.sendIpc(a.eventId,{...n,data:i({logger:e,message:n,transport:a})})}}})),ge=s(((e,t)=>{var n=require(`http`),r=require(`https`),{transform:i}=D(),{removeStyles:a}=le(),{toJSON:o,maxDepth:s}=ce();t.exports=c;function c(e){return Object.assign(t,{client:{name:`electron-application`},depth:6,level:!1,requestOptions:{},transforms:[a,o,s],makeBodyFn({message:e}){return JSON.stringify({client:t.client,data:e.data,date:e.date.getTime(),level:e.level,scope:e.scope,variables:e.variables})},processErrorFn({error:n}){e.processMessage({data:[`electron-log: can't POST ${t.url}`,n],level:`warn`},{transports:[`console`,`file`]})},sendRequestFn({serverUrl:e,requestOptions:t,body:i}){let a=(e.startsWith(`https:`)?r:n).request(e,{method:`POST`,...t,headers:{"Content-Type":`application/json`,"Content-Length":i.length,...t.headers}});return a.write(i),a.end(),a}});function t(n){if(!t.url)return;let r=t.makeBodyFn({logger:e,message:{...n,data:i({logger:e,message:n,transport:t})},transport:t}),a=t.sendRequestFn({serverUrl:t.url,requestOptions:t.requestOptions,body:Buffer.from(r,`utf8`)});a.on(`error`,r=>t.processErrorFn({error:r,logger:e,message:n,request:a,transport:t}))}}})),_e=s(((e,t)=>{var n=ae(),r=oe(),i=se(),a=ue(),o=me(),s=he(),c=ge();t.exports=l;function l({dependencies:e,initializeFn:t}){let l=new n({dependencies:e,errorHandler:new r,eventLogger:new i,initializeFn:t,isDev:e.externalApi?.isDev(),logId:`default`,transportFactories:{console:a,file:o,ipc:s,remote:c},variables:{processType:`main`}});return l.default=l,l.Logger=n,l.processInternalErrorFn=e=>{l.transports.console.writeFn({message:{data:[`Unhandled electron-log error`,e],level:`error`}})},l}})),ve=s(((e,t)=>{var n=require(`electron`),r=w(),{initialize:i}=re(),a=_e(),o=new r({electron:n}),s=a({dependencies:{externalApi:o},initializeFn:i});t.exports=s,o.onIpc(`__ELECTRON_LOG__`,(e,t)=>{t.scope&&s.Logger.getInstance(t).scope(t.scope);let n=new Date(t.date);c({...t,date:n.getTime()?n:new Date})}),o.onIpcInvoke(`__ELECTRON_LOG__`,(e,{cmd:t=``,logId:n})=>{switch(t){case`getOptions`:return{levels:s.Logger.getInstance({logId:n}).levels,logId:n};default:return c({data:[`Unknown cmd '${t}'`],level:`error`}),{}}});function c(e){s.Logger.getInstance(e)?.processMessage(e)}})),ye=s(((e,t)=>{t.exports=ve()}));function be(){if(Ce)return;Ce=!0;let{app:e}=require(`electron`),{join:t,dirname:n}=require(`node:path`),r=e.isPackaged?t(n(e.getPath(`exe`)),`logs`):t(e.getAppPath(),`src`,`log`),i=()=>{let e=new Date;return`${e.getFullYear()}-${String(e.getMonth()+1).padStart(2,`0`)}-${String(e.getDate()).padStart(2,`0`)}`};Se.default.transports.file.resolvePathFn=e=>t(r,i()+`.log`)}function xe(){be()}var Se,Ce,k,A=o((()=>{Se=l(ye()),Se.default.initialize(),Se.default.transports.file.maxSize=5*1024*1024,Se.default.transports.console.level=`error`,Ce=!1,k=Se.default}));A();var we=new Map,Te={info:()=>{},warn:()=>{}};function Ee(e){Te=e}function j(e){let t=(0,x.randomUUID)();return we.set(t,{id:t,kill:e}),t}function M(e){we.delete(e)}function De(){let e=we.size;if(e===0)return 0;Te.info(`Killing ${e} in-flight conversion(s) on quit`);for(let e of we.values())try{e.kill()}catch(t){Te.warn(`Conversion kill failed for ${e.id}:`,t?.message??t)}return we.clear(),e}var Oe=(0,C.promisify)(S.execFile),ke=[`h264_nvenc`,`h264_qsv`,`h264_amf`],Ae=null,je=null,Me={info:()=>{},warn:()=>{}};function Ne(e){Me=e}function Pe(e){for(let t of ke)if(RegExp(`\\b${t}\\b`).test(e))return t;return`libx264`}function Fe(e){return Ae?Promise.resolve(Ae):je||(je=(async()=>{try{let{stdout:t}=await Oe(e,[`-hide_banner`,`-encoders`],{timeout:5e3,maxBuffer:2*1024*1024}),n=Pe(t);return Me.info(`H.264 encoder selected: ${n}`),Ae=n,n}catch(e){return Me.warn(`HW encoder probe failed, falling back to libx264:`,e?.message??e),Ae=`libx264`,`libx264`}finally{je=null}})(),je)}function Ie(e,t,n){switch(e){case`h264_nvenc`:return[`-c:v`,`h264_nvenc`,`-preset`,`p4`,`-rc`,`vbr`,`-cq`,t,`-b:v`,`0`];case`h264_qsv`:return[`-c:v`,`h264_qsv`,`-preset`,`veryfast`,`-global_quality`,t];case`h264_amf`:return[`-c:v`,`h264_amf`,`-quality`,`balanced`,`-rc`,`cqp`,`-qp_i`,t,`-qp_p`,t];default:return[`-c:v`,`libx264`,`-preset`,`ultrafast`,`-crf`,t,`-threads`,String(n)]}}var Le=d.app.isPackaged?u.default.join(process.resourcesPath,`ffmpeg.exe`):y.default.path;v.default.setFfmpegPath(Le);var Re=Math.min(b.default.cpus().length,8);function ze(e,t,n,r){if(!r)return new Promise(r=>{let i=(0,v.default)(e),a=j(()=>i.kill(`SIGKILL`));i.outputOptions([`-c:v`,`copy`,`-c:a`,`aac`,`-b:a`,`128k`,`-movflags`,`+faststart`]).output(t).on(`progress`,()=>{n?.({percent:80,targetSize:0})}).on(`end`,()=>{M(a),n?.({percent:100,targetSize:0}),r({success:!0,outputPath:t})}).on(`error`,e=>{M(a),k.error(`MP4 remux failed:`,e.message),r({success:!1,outputPath:``,error:e.message})}).run()});let i=t.replace(/\.mp4$/i,`_tmp.mp4`),a=`crop=${Math.round(r.width/2)*2}:${Math.round(r.height/2)*2}:${Math.round(r.x/2)*2}:${Math.round(r.y/2)*2},`;return new Promise(async r=>{let o=await Fe(Le);function s(t){return new Promise(r=>{let o=(0,v.default)(e),s=j(()=>o.kill(`SIGKILL`));o.outputOptions([...Ie(t,`23`,Re),`-vf`,`${a}pad=ceil(iw/2)*2:ceil(ih/2)*2,format=yuv420p`,`-an`,`-movflags +faststart`]).output(i).on(`progress`,e=>{n?.({percent:Math.round((e.percent??0)*100)/200,targetSize:e.targetSize??0})}).on(`end`,()=>{M(s),r({success:!0})}).on(`error`,e=>{M(s),k.error(`MP4 pass1 failed (${t}):`,e.message),r({success:!1,error:e.message})}).run()})}let c=await s(o);if(!c.success&&o!==`libx264`&&(k.warn(`MP4 pass1: ${o} failed, retrying with libx264`),await _.default.promises.unlink(i).catch(()=>{}),c=await s(`libx264`)),!c.success){r({success:!1,outputPath:``,error:c.error});return}let l=(0,v.default)(i),u=j(()=>l.kill(`SIGKILL`));l.addInput(e).outputOptions([`-c:v`,`copy`,`-c:a`,`aac`,`-b:a`,`128k`,`-map`,`0:v`,`-map`,`1:a?`,`-shortest`,`-movflags`,`+faststart`]).output(t).on(`progress`,e=>{n?.({percent:Math.round((e.percent??0)*100)/200+50,targetSize:e.targetSize??0})}).on(`end`,()=>{M(u),_.default.promises.unlink(i).catch(()=>{}),r({success:!0,outputPath:t})}).on(`error`,e=>{M(u),k.error(`MP4 audio mux failed:`,e.message),_.default.promises.rename(i,t).then(()=>r({success:!0,outputPath:t})).catch(()=>{_.default.promises.unlink(i).catch(()=>{}),r({success:!1,outputPath:``,error:e.message})})}).run()})}function Be(e,t,n,r){let i=Math.round(n.width/2)*2,a=Math.round(n.height/2)*2,o=Math.round(n.x/2)*2,s=Math.round(n.y/2)*2;return new Promise(async n=>{let c=`crop=${i}:${a}:${o}:${s},format=yuv420p`,l=await Fe(Le);function u(n,i){return new Promise(a=>{let o=(0,v.default)(e),s=j(()=>o.kill(`SIGKILL`));o.outputOptions([...Ie(n,i,Re),`-vf`,c,`-c:a`,`copy`,`-movflags`,`+faststart`]).output(t).on(`progress`,e=>{r?.({percent:Math.round((e.percent??0)*100),targetSize:e.targetSize??0})}).on(`end`,()=>{M(s),a({success:!0,outputPath:t})}).on(`error`,e=>{M(s),k.error(`Crop failed (${n}):`,e.message),a({success:!1,outputPath:``,error:e.message})}).run()})}let d=await u(l,`18`);!d.success&&l!==`libx264`&&(k.warn(`Crop: ${l} failed, retrying with libx264`),d=await u(`libx264`,`18`)),n(d)})}function Ve(e,t,n){return new Promise(r=>{let i=Math.max(...e.map(e=>e.bounds.x+e.bounds.width))-Math.min(...e.map(e=>e.bounds.x)),a=Math.max(...e.map(e=>e.bounds.y+e.bounds.height))-Math.min(...e.map(e=>e.bounds.y)),o=Math.min(...e.map(e=>e.bounds.x)),s=Math.min(...e.map(e=>e.bounds.y)),c=Math.round(i/2)*2,l=Math.round(a/2)*2;k.info(`Merge canvas size:`,c,`x`,l),k.info(`Merge inputs:`,e.map((e,t)=>`[${t}] ${e.filePath} bounds=${JSON.stringify(e.bounds)}`).join(`, `));let u=[],d=e.length;function f(e,t){let n=e.replace(/\.webm$/i,`_remux.mp4`);return new Promise(r=>{let i=(0,v.default)(e),a=j(()=>i.kill(`SIGKILL`));i.outputOptions([`-c`,`copy`]).output(n).on(`end`,()=>{M(a),k.info(`Merge remux ${t+1}/${d} done`),r({success:!0,remuxedPath:n})}).on(`error`,e=>{M(a),k.error(`Merge remux ${t+1} failed:`,e.message),r({success:!1,remuxedPath:n,error:e.message})}).run()})}async function p(){for(let e of u)await _.default.promises.unlink(e).catch(()=>{});for(let t of e)await _.default.promises.unlink(t.filePath).catch(()=>{})}async function m(){let r=await Fe(Le),i=[`color=c=black:s=${c}x${l}[bg]`],a=`[bg]`;for(let t=0;t<e.length;t++){let n=e[t],r=Math.round((n.bounds.x-o)/2)*2,c=Math.round((n.bounds.y-s)/2)*2,l=Math.round(n.bounds.width/2)*2,u=Math.round(n.bounds.height/2)*2,d=`[s${t}]`,f=t===e.length-1?`[out]`:`[tmp${t}]`;i.push(`[${t}:v]scale=${l}:${u},setsar=1${d}`),i.push(`${a}${d}overlay=${r}:${c}${f}`),a=f}i.push(`[out]format=yuv420p`),k.info(`Merge filter_complex:`,i.join(`;`));function d(r){return new Promise(a=>{let o=(0,v.default)(),s=j(()=>o.kill(`SIGKILL`));for(let e of u)o.addInput(e);o.complexFilter(i).outputOptions([...Ie(r,`23`,Re),`-movflags`,`+faststart`]).output(t).on(`start`,()=>{k.info(`Merge ffmpeg command started (${r})`)}).on(`progress`,e=>{let t=Math.round(e.percent??0);n?.({percent:Math.min(30+t*.7,100),targetSize:e.targetSize??0})}).on(`end`,()=>{M(s),k.info(`Merge completed successfully`);for(let t of e)_.default.promises.unlink(t.filePath).catch(()=>{});for(let e of u)_.default.promises.unlink(e).catch(()=>{});a({success:!0,outputPath:t})}).on(`error`,t=>{M(s),k.error(`Multi-screen merge failed (${r}):`,t.message);for(let t of e)_.default.promises.unlink(t.filePath).catch(()=>{});for(let e of u)_.default.promises.unlink(e).catch(()=>{});a({success:!1,outputPath:``,error:t.message})}).run()})}let f=await d(r);return!f.success&&r!==`libx264`&&(k.warn(`Merge: ${r} failed, retrying with libx264`),await _.default.promises.unlink(t).catch(()=>{}),f=await d(`libx264`)),f}(async()=>{for(let t=0;t<d;t++){let i=await f(e[t].filePath,t);if(!i.success){k.error(`Merge aborted: remux ${t+1}/${d} failed, short-circuiting`),await _.default.promises.unlink(i.remuxedPath).catch(()=>{}),await p(),r({success:!1,outputPath:``,error:i.error});return}u.push(i.remuxedPath),n?.({percent:Math.round((t+1)/d*30),targetSize:0})}r(await m())})()})}function He(e,t,n,r){let{execFile:i}=require(`node:child_process`),a=y.default.path,o=n?.width??480,s=n?.fps??10,c=u.default.join(b.default.tmpdir(),`gif_palette_${Date.now()}.png`);k.info(`GIF conversion - input:`,e,`palette:`,c,`output:`,t);let l=[`-y`,`-i`,e,`-vf`,`fps=${s},scale=${o}:-1:flags=lanczos,palettegen`,c];return new Promise(u=>{let d=``,f=``,p=i(a,l,l=>{if(M(d),l){k.error(`GIF palette gen failed:`,l.message),u({success:!1,outputPath:``,error:l.message});return}k.info(`GIF palette generated successfully`);let p=i(a,[`-y`,`-i`,e,`-i`,c,`-filter_complex`,`[0:v]fps=${s},scale=${o}:-1:flags=lanczos[x];[x][1:v]paletteuse`,t],e=>{M(f),_.default.promises.unlink(c).catch(()=>{}),e?(k.error(`GIF creation failed:`,e.message),u({success:!1,outputPath:``,error:e.message})):u({success:!0,outputPath:t})});f=j(()=>p.kill(`SIGKILL`)),p.stdout&&p.stdout.on(`data`,e=>{let t=e.toString().match(/time=(\d+:\d+:\d+\.\d+)/);if(t&&n?.duration){let e=t[1].split(`:`).map(Number),i=e[0]*3600+e[1]*60+e[2],a=Math.min(Math.round(i/n.duration*100),99);r?.({percent:a+50,targetSize:0})}else r?.({percent:75,targetSize:0})})});d=j(()=>p.kill(`SIGKILL`))})}function Ue(e){return e===`zh`||e===`en`}function We(e){Ye=e}function Ge(e,t,n){let r=(e===`en`?Je:qe)[t]??Je[t]??qe[t]??t;if(n)for(let[e,t]of Object.entries(n))r=r.replace(RegExp(`\\{${e}\\}`,`g`),String(t));return r}function N(e,t){return Ge(Ye,e,t)}function Ke(){return{locale:Ye,messages:Ye===`en`?Je:qe}}var qe,Je,Ye,P=o((()=>{qe={"common.confirm":`确认`,"common.cancel":`取消`,"common.ok":`确定`,"common.close":`关闭`,"common.loading":`加载中...`,"common.reset":`重置`,"common.on":`开`,"common.off":`关`,"common.allow":`允许`,"common.deny":`拒绝`,"common.alwaysAllow":`始终允许`,"common.save":`保存`,"win.minimize":`最小化`,"win.maximize":`最大化`,"ball.menu.record":`录屏`,"ball.menu.music":`音乐`,"ball.menu.ai":`AI助手`,"ball.menu.todo":`待办便签`,"ball.menu.settings":`设置`,"settings.group.ball":`悬浮球`,"settings.ball.show":`显示悬浮球`,"settings.ball.showDesc":`关闭后悬浮球隐藏，可从托盘「显示设置窗口」重新打开`,"settings.ball.alwaysOnTop":`始终置顶`,"settings.ball.alwaysOnTopDesc":`关闭后悬浮球可被其他窗口遮挡`,"settings.ball.resetPos":`重置位置`,"settings.ball.resetPosDesc":`把悬浮球移回屏幕中心`,"settings.ball.snapGutter":`贴边留白`,"settings.ball.snapGutterDesc":`贴边吸附时距屏幕边缘的像素留白（0 = 全贴合）`,"settings.group.menu":`悬浮球菜单`,"settings.group.system":`系统`,"settings.group.language":`语言`,"settings.system.openAtLogin":`开机自启`,"settings.system.openAtLoginDesc":`登录系统时自动启动本应用`,"settings.language.label":`界面语言`,"settings.language.desc":`切换后悬浮球、AI 岛等窗口在下次打开时生效`,"settings.lang.zh":`简体中文`,"settings.lang.en":`English`,"aiIsland.idle":`AI 待机`,"aiIsland.thinking":`AI 思考中`,"aiIsland.working":`AI 工作中`,"aiIsland.error":`AI 出错了`,"aiIsland.notification":`等待审批`,"aiIsland.done":`任务完成`,"aiIsland.permTitle":`权限请求`,"aiIsland.permTool":`工具`,"aiIsland.permInput":`参数`,"aiIsland.questionTitle":`AI 正在提问`,"aiIsland.prevQuestion":`上一题`,"aiIsland.nextQuestion":`下一题`,"aiIsland.submitAnswer":`提交答案`,"aiIsland.know":`知道了`,"aiIsland.otherPlaceholder":`输入其他内容…`,"aiIsland.otherHint":`可与其他选项同时选择。`,"aiIsland.answerInClaude":`请到 Claude Code 界面作答，这里仅作提醒。`,"aiIsland.viewDetail":`点击查看详情`,"aiIsland.unknown":`未知操作`,"aiIsland.other":`其他`,"aiIsland.progress":`第 {n}/{t} 题`,"record.title":`高清录屏`,"record.start":`开始录制`,"record.pause":`暂停`,"record.resume":`继续`,"record.stop":`停止`,"record.allScreens":`多屏录制`,"record.selectRegion":`区域录制`,"record.toggleSys":`系统音频`,"record.closeAndStop":`关闭并停止录制`,"record.claudeRequest":`Claude Code 请求权限`,"record.targetInfo":`目标信息`,"record.homeTab":`录屏`,"record.settingsTab":`设置`,"record.fullscreen":`全屏录制`,"record.customRegion":`自定义区域`,"record.primary":`主`,"record.mic":`麦克风`,"record.recBtn":`录制`,"record.toggleCamera":`开启摄像头`,"record.toggleMic":`开启麦克风`,"record.startShort":`开始录制 ({k})`,"record.pauseShort":`暂停 ({k})`,"record.resumeShort":`继续 ({k})`,"record.stopShort":`停止录制 ({k})`,"record.toggleCameraShort":`开启摄像头 ({k})`,"record.toggleMicShort":`开启麦克风 ({k})`,"record.converting":`转换中`,"record.convertDone":`转换完成`,"record.listEmpty":`暂无录制记录`,"record.play":`播放`,"record.exportGif":`导出 GIF`,"record.delete":`删除`,"record.duration":`时长`,"record.size":`大小`,"record.history":`录制历史`,"record.openFolder":`打开文件夹`,"settings.title":`设置`,"settings.video":`视频设置`,"settings.format":`录制格式`,"settings.quality":`画质`,"settings.fps":`帧率`,"settings.outputDir":`输出目录`,"settings.changeDir":`更改`,"settings.videoSource":`视频来源`,"settings.audio":`音频`,"settings.mic":`麦克风`,"settings.systemAudio":`系统音频`,"settings.camera":`摄像头`,"settings.cameraSource":`摄像头来源`,"settings.drawing":`画笔`,"settings.drawingColor":`画笔颜色`,"settings.drawingWidth":`画笔粗细`,"settings.shortcuts":`快捷键`,"settings.shortcutStart":`开始/停止`,"settings.shortcutPause":`暂停/继续`,"settings.shortcutCamera":`切换摄像头`,"settings.shortcutDrawing":`切换画笔`,"settings.recordingTitle":`录屏设置`,"settings.output":`输出`,"settings.saveDir":`保存目录`,"settings.chooseDir":`选择保存目录`,"settings.browse":`浏览`,"settings.defaultFormat":`默认格式`,"settings.maxFps":`最大帧率`,"settings.qualityHigh":`高 (5 Mbps)`,"settings.qualityMedium":`中 (2.5 Mbps)`,"settings.qualityLow":`低 (1 Mbps)`,"settings.default":`默认`,"settings.device":`设备`,"settings.about":`关于`,"ai.title":`AI 助手`,"ai.installHooks":`安装 Claude Code 钩子`,"ai.uninstallHooks":`卸载 Claude Code 钩子`,"ai.hooksStatus":`钩子状态`,"ai.hooksInstalled":`已安装`,"ai.hooksNotInstalled":`未安装`,"ai.autoAllow":`自动允许权限`,"ai.autoAllowDesc":`开启后新权限请求自动放行，不再弹出审批卡片`,"ai.serverPort":`本地服务端口`,"ai.serverRunning":`服务运行中`,"ai.serverStopped":`服务未运行`,"ai.claudeRunning":`Claude Code 正在运行`,"ai.claudeStopped":`Claude Code 未检测到`,"ai.sessionCount":`会话数`,"ai.sessionsCount":`{n} 个会话`,"ai.waiting":`Claude 运行中，等待交互`,"ai.noActive":`无活跃会话`,"ai.online":`在线`,"ai.offline":`离线`,"ai.state.idle":`空闲`,"ai.state.thinking":`思考中`,"ai.state.working":`工作中`,"ai.state.error":`错误`,"ai.state.notification":`待审批`,"ai.state.done":`完成`,"ai.groupIntegration":`集成`,"ai.hooksDesc":`钩子脚本状态`,"ai.groupPermission":`权限`,"ai.autoAllowTitle":`自动允许所有权限`,"ai.groupIsland":`悬浮岛外观`,"ai.flat":`横条态（更扁的细横条）`,"ai.flatDesc":`把悬浮岛默认状态条压成更扁的细横条，省屏幕空间`,"todo.title":`待办便签`,"todo.add":`添加`,"todo.placeholder":`输入待办事项...`,"todo.empty":`暂无待办`,"todo.memo":`便签`,"todo.task":`待办`,"todo.addTodo":`新建待办`,"todo.addMemo":`新建便签`,"todo.done":`完成`,"todo.undone":`恢复`,"todo.delete":`删除`,"todo.pin":`置顶`,"todo.unpin":`取消置顶`,"todo.edit":`编辑`,"todo.save":`保存`,"todo.cancel":`取消`,"todo.reminder":`提醒`,"todo.reminderNone":`无提醒`,"todo.priority":`优先级`,"todo.priorityLow":`低`,"todo.priorityMedium":`中`,"todo.priorityHigh":`高`,"todo.priorityUrgent":`紧急`,"todo.titlePlaceholder":`输入标题...`,"todo.contentPlaceholder":`输入内容...`,"todo.reminderOverdue":`已到期：{title}`,"todo.count":`{n} 个待办`,"todo.searchPlaceholder":`搜索待办/便签...`,"todo.incomplete":`{n} 项未完成`,"todo.back":`返回`,"todo.more":`更多设置`,"todo.badge":`悬浮球气泡`,"todo.typeTodo":`待办`,"todo.typeMemo":`备忘`,"todo.tabAll":`全部`,"todo.noItems":`还没有{n}`,"todo.noTitle":`无标题`,"todo.noContent":`无内容`,"todo.added":`已新增`,"todo.saved":`已保存`,"todo.saveFailed":`保存失败`,"todo.deleted":`已删除`,"todo.completed":`已完成`,"todo.markDone":`标记完成`,"todo.moreOptions":`更多选项`,"todo.collapseOptions":`收起选项`,"todo.moreTitle":`类型、优先级、提醒`,"todo.typeField":`类型`,"todo.clearReminder":`清除提醒`,"todo.noBody":`（无正文内容）`,"todo.openTodo":`打开待办`,"todo.stickyTitle":`待办便签`,"todo.reminTitle":`待办提醒`,"todo.open":`点击打开`,"todo.reminderRing":`到点了`,"todo.reminderBody":`到时间了，记得处理一下。`,"sched.title":`定时录制`,"sched.aboutToStart":`录制即将开始`,"sched.mode":`模式切换`,"sched.countdown":`倒计时`,"sched.scheduled":`指定时间`,"sched.countdownMode":`倒计时模式`,"sched.scheduledMode":`指定时间模式`,"sched.delay":`延迟`,"sched.minutes":`分钟`,"sched.startCountdown":`开始倒计时`,"sched.date":`日期`,"sched.time":`时间`,"sched.set":`设置定时`,"sched.future":`请选择一个未来的时间`,"convert.preparing":`准备中`,"convert.start":`开始转换`,"convert.done":`转换完成`,"convert.failed":`转换失败`,"convert.export":`导出`,"convert.progress":`转换中... {n}%`,"convert.preparingDots":`准备中...`,"convert.startDots":`开始转换...`,"convert.doneEx":`转换完成!`,"convert.failedColon":`转换失败: {e}`,"video.seconds":`秒`,"record.paused":`已暂停`,"draw.pen":`画笔`,"draw.eraser":`橡皮`,"draw.arrow":`箭头`,"draw.rect":`矩形`,"draw.tools":`工具选择`,"draw.color":`颜色选择`,"draw.width":`粗细`,"draw.lineWidth":`线条粗细`,"draw.actions":`操作`,"draw.undo":`撤销`,"draw.clear":`清除全部`,"screen.error":`获取屏幕源失败`,"screen.choose":`选择录制源`,"screen.none":`未找到可用的屏幕源`,"camera.title":`摄像头`,"region.by":`全屏选区由`,"region.mainWin":`主进程窗口处理`,"region.none":`此处无`,"tools.claudeCode":`Claude Code`,"tools.codex":`Codex`,"tools.approvalNone":`仅展示状态，不支持审批`,"tools.notRunning":`未运行`,"tools.toolSessions":`{n} 个会话`,"tools.idle":`空闲`,"tools.working":`工作中`,"tools.title":`工具`,"music.title":`音乐`,"music.noSession":`未检测到系统媒体`,"music.unsupported":`系统媒体（SMTC）不可用`,"music.playing":`播放中`,"music.paused":`已暂停`,"music.unknownArtist":`未知歌手`,"music.play":`播放`,"music.pause":`暂停`,"music.next":`下一首`,"music.prev":`上一首`,"music.indicator":`频谱指示器`,"music.indicatorDesc":`开启系统音频回环采集，随音乐实时动态（需播放音源）`,"music.enableLoop":`开启`,"music.disableLoop":`关闭`,"music.loopFail":`系统音频回环不可用`,"music.lyrics":`歌词`,"music.noLyrics":`暂无歌词（歌词源待配置）`},Je={"common.confirm":`Confirm`,"common.cancel":`Cancel`,"common.ok":`OK`,"common.close":`Close`,"common.loading":`Loading...`,"common.reset":`Reset`,"common.on":`On`,"common.off":`Off`,"common.allow":`Allow`,"common.deny":`Deny`,"common.alwaysAllow":`Always Allow`,"common.save":`Save`,"win.minimize":`Minimize`,"win.maximize":`Maximize`,"ball.menu.record":`Record`,"ball.menu.music":`Music`,"ball.menu.ai":`AI`,"ball.menu.todo":`Notes`,"ball.menu.settings":`Settings`,"settings.group.ball":`Floating Ball`,"settings.ball.show":`Show Floating Ball`,"settings.ball.showDesc":`Hidden ball can be reopened from the tray menu “Show Settings Window”`,"settings.ball.alwaysOnTop":`Always on Top`,"settings.ball.alwaysOnTopDesc":`When off, other windows may cover the ball`,"settings.ball.resetPos":`Reset Position`,"settings.ball.resetPosDesc":`Move the ball back to the center of the screen`,"settings.ball.snapGutter":`Edge gutter`,"settings.ball.snapGutterDesc":`Pixel gutter from the screen edge when snapped (0 = flush)`,"settings.group.menu":`Ball Menu`,"settings.group.system":`System`,"settings.group.language":`Language`,"settings.system.openAtLogin":`Open at Login`,"settings.system.openAtLoginDesc":`Auto start this app when you sign in`,"settings.language.label":`Interface Language`,"settings.language.desc":`Ball, AI assistant and other windows apply on next open`,"settings.lang.zh":`简体中文`,"settings.lang.en":`English`,"ai.title":`AI Assistant`,"ai.installHooks":`Install Claude Code hooks`,"ai.uninstallHooks":`Uninstall Claude Code hooks`,"ai.hooksStatus":`Hook status`,"ai.hooksInstalled":`Installed`,"ai.hooksNotInstalled":`Not installed`,"ai.autoAllow":`Auto-allow permissions`,"ai.autoAllowDesc":`When on, new permission requests are allowed automatically without approval cards`,"ai.serverPort":`Local server port`,"ai.serverRunning":`Server running`,"ai.serverStopped":`Server not running`,"ai.claudeRunning":`Claude Code is running`,"ai.claudeStopped":`Claude Code not detected`,"ai.sessionCount":`Sessions`,"ai.sessionsCount":`{n} sessions`,"ai.waiting":`Claude is running, waiting for interaction`,"ai.noActive":`No active sessions`,"ai.online":`Online`,"ai.offline":`Offline`,"ai.state.idle":`Idle`,"ai.state.thinking":`Thinking`,"ai.state.working":`Working`,"ai.state.error":`Error`,"ai.state.notification":`Pending`,"ai.state.done":`Done`,"ai.groupIntegration":`Integration`,"ai.hooksDesc":`Hook script status`,"ai.groupPermission":`Permissions`,"ai.autoAllowTitle":`Auto-allow all permissions`,"ai.groupIsland":`AI Island Look`,"ai.flat":`Flat bar (slimmer)`,"ai.flatDesc":`Compress the island status bar into a slimmer flat bar to save screen space`,"aiIsland.idle":`AI idle`,"aiIsland.thinking":`AI thinking`,"aiIsland.working":`AI working`,"aiIsland.error":`AI error`,"aiIsland.notification":`Approval needed`,"aiIsland.done":`Task done`,"aiIsland.permTitle":`Permission Request`,"aiIsland.permTool":`Tool`,"aiIsland.permInput":`Arguments`,"aiIsland.questionTitle":`AI is asking`,"aiIsland.prevQuestion":`Previous`,"aiIsland.nextQuestion":`Next`,"aiIsland.submitAnswer":`Submit`,"aiIsland.know":`Got it`,"aiIsland.otherPlaceholder":`Type other...`,"aiIsland.otherHint":`Can be selected together with other options.`,"aiIsland.answerInClaude":`Answer in the Claude Code interface; this is just a reminder.`,"aiIsland.viewDetail":`Click to view details`,"aiIsland.unknown":`Unknown action`,"aiIsland.other":`Other`,"aiIsland.progress":`Q {n}/{t}`,"record.title":`HD Screen Recorder`,"record.start":`Start Recording`,"record.pause":`Pause`,"record.resume":`Resume`,"record.stop":`Stop`,"record.allScreens":`All screens`,"record.selectRegion":`Select region`,"record.toggleSys":`System audio`,"record.closeAndStop":`Close & stop`,"record.claudeRequest":`Claude Code requests permission`,"record.targetInfo":`Target info`,"record.homeTab":`Record`,"record.settingsTab":`Settings`,"record.fullscreen":`Full Screen`,"record.customRegion":`Custom Region`,"record.primary":`Pri`,"record.mic":`Mic`,"record.recBtn":`Record`,"record.toggleCamera":`Enable Camera`,"record.toggleMic":`Enable Microphone`,"record.startShort":`Start Recording ({k})`,"record.pauseShort":`Pause ({k})`,"record.resumeShort":`Resume ({k})`,"record.stopShort":`Stop Recording ({k})`,"record.toggleCameraShort":`Enable Camera ({k})`,"record.toggleMicShort":`Enable Microphone ({k})`,"record.converting":`Converting`,"record.convertDone":`Done`,"record.listEmpty":`No recordings yet`,"record.play":`Play`,"record.exportGif":`Export GIF`,"record.delete":`Delete`,"record.duration":`Duration`,"record.size":`Size`,"record.history":`History`,"record.openFolder":`Open folder`,"settings.title":`Settings`,"settings.video":`Video`,"settings.format":`Format`,"settings.quality":`Quality`,"settings.fps":`FPS`,"settings.outputDir":`Output directory`,"settings.changeDir":`Change`,"settings.videoSource":`Video source`,"settings.audio":`Audio`,"settings.mic":`Microphone`,"settings.systemAudio":`System audio`,"settings.camera":`Camera`,"settings.cameraSource":`Camera source`,"settings.drawing":`Drawing`,"settings.drawingColor":`Color`,"settings.drawingWidth":`Width`,"settings.shortcuts":`Shortcuts`,"settings.shortcutStart":`Start / Stop`,"settings.shortcutPause":`Pause / Resume`,"settings.shortcutCamera":`Toggle Camera`,"settings.shortcutDrawing":`Toggle Drawing`,"settings.recordingTitle":`Recording Settings`,"settings.output":`Output`,"settings.saveDir":`Save directory`,"settings.chooseDir":`Choose save directory`,"settings.browse":`Browse`,"settings.defaultFormat":`Format`,"settings.maxFps":`Max FPS`,"settings.qualityHigh":`High (5 Mbps)`,"settings.qualityMedium":`Medium (2.5 Mbps)`,"settings.qualityLow":`Low (1 Mbps)`,"settings.default":`Default`,"settings.device":`Device`,"settings.about":`About`,"todo.title":`Todo Notes`,"todo.add":`Add`,"todo.placeholder":`Type a todo...`,"todo.empty":`No todos yet`,"todo.memo":`Memo`,"todo.task":`Task`,"todo.addTodo":`New Todo`,"todo.addMemo":`New Memo`,"todo.done":`Done`,"todo.undone":`Restore`,"todo.delete":`Delete`,"todo.pin":`Pin`,"todo.unpin":`Unpin`,"todo.edit":`Edit`,"todo.save":`Save`,"todo.cancel":`Cancel`,"todo.reminder":`Reminder`,"todo.reminderNone":`No reminder`,"todo.priority":`Priority`,"todo.priorityLow":`Low`,"todo.priorityMedium":`Medium`,"todo.priorityHigh":`High`,"todo.priorityUrgent":`Urgent`,"todo.titlePlaceholder":`Type a title...`,"todo.contentPlaceholder":`Type content...`,"todo.reminderOverdue":`Due: {title}`,"todo.count":`{n} items`,"todo.searchPlaceholder":`Search todos/memos...`,"todo.incomplete":`{n} incomplete`,"todo.back":`Back`,"todo.more":`More settings`,"todo.badge":`Ball badge`,"todo.typeTodo":`Todo`,"todo.typeMemo":`Memo`,"todo.tabAll":`All`,"todo.noItems":`No {n} yet`,"todo.noTitle":`No title`,"todo.noContent":`No content`,"todo.added":`Added`,"todo.saved":`Saved`,"todo.saveFailed":`Save failed`,"todo.deleted":`Deleted`,"todo.completed":`Completed`,"todo.markDone":`Mark done`,"todo.moreOptions":`More options`,"todo.collapseOptions":`Collapse`,"todo.moreTitle":`Type, priority, reminder`,"todo.typeField":`Type`,"todo.clearReminder":`Clear reminder`,"todo.noBody":`(No content)`,"todo.openTodo":`Open todos`,"todo.stickyTitle":`Todo Notes`,"todo.reminTitle":`Todo reminder`,"todo.open":`Click to open`,"todo.reminderRing":`Time's up`,"todo.reminderBody":`It's time — take care of it.`,"sched.title":`Scheduled Recording`,"sched.aboutToStart":`Recording starts soon`,"sched.mode":`Mode`,"sched.countdown":`Countdown`,"sched.scheduled":`Scheduled`,"sched.countdownMode":`Countdown mode`,"sched.scheduledMode":`Scheduled mode`,"sched.delay":`Delay`,"sched.minutes":`min`,"sched.startCountdown":`Start countdown`,"sched.date":`Date`,"sched.time":`Time`,"sched.set":`Schedule`,"sched.future":`Pick a time in the future`,"convert.preparing":`Preparing`,"convert.start":`Start converting`,"convert.done":`Conversion done`,"convert.failed":`Conversion failed`,"convert.export":`Export`,"convert.progress":`Converting... {n}%`,"convert.preparingDots":`Preparing...`,"convert.startDots":`Starting...`,"convert.doneEx":`Conversion complete!`,"convert.failedColon":`Conversion failed: {e}`,"video.seconds":`s`,"record.paused":`Paused`,"draw.pen":`Pen`,"draw.eraser":`Eraser`,"draw.arrow":`Arrow`,"draw.rect":`Rectangle`,"draw.tools":`Tools`,"draw.color":`Color`,"draw.width":`Width`,"draw.lineWidth":`Line width`,"draw.actions":`Actions`,"draw.undo":`Undo`,"draw.clear":`Clear all`,"screen.error":`Failed to get screen sources`,"screen.choose":`Select recording source`,"screen.none":`No screen source found`,"camera.title":`Camera`,"region.by":`Full-screen selection is handled`,"region.mainWin":`by the main process window`,"region.none":`Nothing here`,"tools.claudeCode":`Claude Code`,"tools.codex":`Codex`,"tools.approvalNone":`Status only, no approval`,"tools.notRunning":`Not running`,"tools.toolSessions":`{n} sessions`,"tools.idle":`Idle`,"tools.working":`Working`,"tools.title":`Tools`,"music.title":`Music`,"music.noSession":`No system media detected`,"music.unsupported":`SMTC unavailable`,"music.playing":`Playing`,"music.paused":`Paused`,"music.unknownArtist":`Unknown artist`,"music.play":`Play`,"music.pause":`Pause`,"music.next":`Next`,"music.prev":`Previous`,"music.indicator":`Spectrum`,"music.indicatorDesc":`Capture system audio loopback for a live spectrum (needs a playing source)`,"music.enableLoop":`On`,"music.disableLoop":`Off`,"music.loopFail":`System audio loopback unavailable`,"music.lyrics":`Lyrics`,"music.noLyrics":`No lyrics (source pending)`},Ye=`zh`})),Xe=s(((e,t)=>{A(),P();var n=null;function r(){return{mic:N(`record.toggleMic`),sys:N(`record.toggleSys`),cam:N(`record.toggleCamera`),rec:N(`record.recBtn`),start:N(`record.start`),stop:N(`record.stop`),pause:N(`record.pause`),resume:N(`record.resume`),cancel:N(`common.cancel`),closeStop:N(`record.closeAndStop`),viewDetail:N(`aiIsland.viewDetail`),idle:N(`aiIsland.idle`),thinking:N(`aiIsland.thinking`),working:N(`aiIsland.working`),error:N(`aiIsland.error`),notification:N(`aiIsland.notification`),done:N(`aiIsland.done`),unknown:N(`aiIsland.unknown`),allow:N(`common.allow`),deny:N(`common.deny`),alwaysAllow:N(`common.alwaysAllow`),requestTitle:N(`record.claudeRequest`),toolName:N(`aiIsland.permTool`),targetInfo:N(`record.targetInfo`)}}function i(e){n=e}function a(e,t){p&&!p.isDestroyed()&&p.webContents.send(`audio-levels`,{micLevel:e,sysLevel:t}),T&&!T.isDestroyed()&&T.webContents.send(`audio-levels`,{micLevel:e,sysLevel:t})}var o=null,s=null;function c(){return new Promise(e=>{s=e,n&&!n.isDestroyed()&&n.minimize();let{x:t,y:r,width:i,height:a}=d.screen.getPrimaryDisplay().bounds;o=new d.BrowserWindow({x:t,y:r,width:i,height:a,frame:!1,transparent:!0,resizable:!1,movable:!1,alwaysOnTop:!0,skipTaskbar:!0,hasShadow:!1,webPreferences:{nodeIntegration:!0,contextIsolation:!1}});let c=(0,u.join)(__dirname,`region-selector.html`);o.loadFile(c).catch(e=>{k.error(`Failed to load region selector:`,e.message),l(null)}),o.setFullScreen(!0),o.setVisibleOnAllWorkspaces(!0),o.setIgnoreMouseEvents(!1),o.on(`closed`,()=>{s&&=(s(null),null)})})}function l(e){o&&!o.isDestroyed()&&o.close(),o=null,s&&=(s(e),null)}var f=null,p=null,m=null,h=null,g=null,_=200,v=150,y=12,b=null,x=0,S=0,C=null;function ee(){if(!g||g.isDestroyed())return;let e=d.screen.getCursorScreenPoint(),[t,n]=g.getPosition();x=e.x-t,S=e.y-n;let[r,i]=g.getSize();C=setInterval(()=>{if(!g||g.isDestroyed()){te();return}let e=d.screen.getCursorScreenPoint(),t=e.x-x,n=e.y-S;b&&(t=Math.max(b.x,Math.min(t,b.x+b.width-r)),n=Math.max(b.y,Math.min(n,b.y+b.height-i))),g.setBounds({x:t,y:n,width:r,height:i})},16)}function te(){C&&=(clearInterval(C),null)}function ne(e,t){w(),b=e;let n=e.x+e.width-_-y,r=e.y+y;g=new d.BrowserWindow({x:n,y:r,width:_,height:v,frame:!1,transparent:!0,resizable:!1,movable:!1,alwaysOnTop:!0,skipTaskbar:!0,hasShadow:!1,webPreferences:{nodeIntegration:!0,contextIsolation:!1}}),g.setVisibleOnAllWorkspaces(!0),g.setAlwaysOnTop(!0,`screen-saver`);let i=(0,u.join)(__dirname,`camera-preview.html`),a=t?`?deviceId=${encodeURIComponent(t)}`:``;g.loadFile(i+a).catch(e=>{k.error(`Failed to load camera preview:`,e.message)}),k.info(`Camera preview shown at`,n,r)}function w(){g&&!g.isDestroyed()&&(g.close(),g=null)}var T=null,re=null,E=null,ie=`idle`,ae=null;function oe(e,t){se(),ie=`idle`;let n=d.screen.getPrimaryDisplay();if(t!=null){let e=d.screen.getAllDisplays().find(e=>e.id===t);e&&(n=e)}let i=n.bounds;ae=i,T=new d.BrowserWindow({x:Math.round(i.x+(i.width-340)/2),y:i.y+4,width:340,height:44,frame:!1,transparent:!0,resizable:!0,movable:!1,alwaysOnTop:!0,skipTaskbar:!0,hasShadow:!1,webPreferences:{nodeIntegration:!0,contextIsolation:!1}}),T.setVisibleOnAllWorkspaces(!0),T.setMinimumSize(100,44),T.setAlwaysOnTop(!0,`screen-saver`);let a=`<!DOCTYPE html>
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
    <button id="micBtn" title="${N(`record.toggleMic`)}" onclick="doToggleMic()">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
    </button>
    <div class="meter-group" id="micMeter"></div>
  </div>
  <!-- <div class="btn-group">
    <button id="sysBtn" title="${N(`record.toggleSys`)}" onclick="doToggleSys()">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
    </button>
    <div class="meter-group" id="sysMeter"></div>
  </div> -->
  <div class="btn-group">
    <button id="camBtn" title="${N(`record.toggleCamera`)}" onclick="doToggleCam()">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
    </button>
  </div>
  <div class="sep"></div>
  <button class="action-btn start-btn" id="startBtn" onclick="doStart()">
    <svg width="10" height="10" viewBox="0 0 12 12"><circle cx="6" cy="6" r="5" fill="currentColor"/></svg>
    <span>${N(`record.recBtn`)}</span>
  </button>
  <button class="stop-btn" id="stopBtn" style="display:none" onclick="doStop()" title="${N(`record.stop`)}">
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="1"/></svg>
  </button>
  <button class="pause-btn" id="pauseBtn" style="display:none" onclick="doPause()" title="${N(`record.pause`)}">
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
  </button>
  <button id="resumeBtn" style="display:none" onclick="doResume()" title="${N(`record.resume`)}">
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>
  </button>
  <button class="close-btn" onclick="doClose()" title="${N(`common.cancel`)}">
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>
  </button>
</div>
<div class="sep" id="aiSep" style="display:none"></div>
<div class="ai-indicator" id="aiIndicator" style="display:none" onclick="showAiDetail()" title="${N(`aiIsland.viewDetail`)}">
  <span class="ai-dot idle" id="aiDot"></span>
  <span class="ai-label" id="aiLabel">${N(`aiIsland.idle`)}</span>
</div>
<div class="perm-card" id="permCard">
  <div class="perm-header">
    <span>🤖</span>
    <span>${N(`record.claudeRequest`)}</span>
  </div>
  <div class="perm-detail">
    <span class="perm-tool" id="permTool">${N(`aiIsland.permTool`)}</span>
    <span id="permTarget">${N(`record.targetInfo`)}</span>
  </div>
  <div class="perm-actions">
    <button class="perm-btn allow" onclick="doAllow()">${N(`common.allow`)}</button>
    <button class="perm-btn deny" onclick="doDeny()">${N(`common.deny`)}</button>
    <button class="perm-btn always" onclick="doAlwaysAllow()">${N(`common.alwaysAllow`)}</button>
  </div>
</div>
<script>
const I18N=${JSON.stringify(r())};
const {ipcRenderer}=require('electron')
let timerInterval=null,seconds=0,micOn=${e?.micEnabled?`true`:`false`},sysOn=${e?.sysEnabled?`true`:`false`},camOn=${e?.cameraEnabled?`true`:`false`},isRecording=false
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
</body></html>`;T.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(a)}`),k.info(`Floating island shown`),b=i,e?.cameraEnabled&&ne(i,e.cameraDeviceId)}function se(){re&&=(clearInterval(re),null),E&&=(clearTimeout(E),null),T&&!T.isDestroyed()&&(T.close(),T=null),w(),b=null,ae=null}function D(e,t){if(ie=e===`idle`?`idle`:e===`recording`?`recording`:e===`paused`?`paused`:ie,e===`show`||e===`hide`){T&&!T.isDestroyed()&&T.webContents.send(`island-state`,e);return}T&&!T.isDestroyed()&&T.webContents.send(`island-state`,e,t),re&&=(clearInterval(re),null),E&&=(clearTimeout(E),null),e===`recording`&&(re=setInterval(()=>{if(!T||T.isDestroyed())return;let e=d.screen.getCursorScreenPoint(),[t,n]=T.getPosition(),[r,i]=T.getSize();e.x>=t&&e.x<=t+r&&e.y>=n-4&&e.y<=n+i?(E&&=(clearTimeout(E),null),T.webContents.send(`island-state`,`show`)):E||=setTimeout(()=>{T&&!T.isDestroyed()&&T.webContents.send(`island-state`,`hide`),E=null},500)},500))}var O=44,ce=3;function le(e,t){fe();let n=ce,i=n+2,a=d.screen.getPrimaryDisplay().bounds,o=e.y-a.y,s=a.y+a.height-(e.y+e.height),c=O+4,l,u,_,v;o>=c?(v=`top`,l=e.x-i,u=e.y-O-i,_=e.width+i*2):s>=c?(v=`bottom`,l=e.x-i,u=e.y+e.height+i,_=e.width+i*2):(v=`inside`,l=e.x,u=e.y,_=Math.min(e.width,500)),m={...e},h=v,p=new d.BrowserWindow({x:l,y:u,width:_,height:O,frame:!1,transparent:!0,resizable:!1,movable:!1,alwaysOnTop:!0,skipTaskbar:!0,hasShadow:!1,webPreferences:{nodeIntegration:!0,contextIsolation:!1}}),p.setVisibleOnAllWorkspaces(!0),p.setAlwaysOnTop(!0,`screen-saver`);let y=`<!DOCTYPE html>
<html><head><style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;overflow:hidden;font-family:'Segoe UI',system-ui,sans-serif}
.toolbar{
  width:100%;height:${O}px;
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
<div class="toolbar" id="toolbar" data-pos="${v}">
  <span class="recording-dot" id="dot"></span>
  <span class="timer" id="timer">00:00</span>
  <button class="audio-toggle" id="micBtn" title="${N(`record.toggleMic`)}" onclick="doToggleMic()">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
  </button>
  <div class="meter-group" id="micMeter"></div>
  <!-- <button class="audio-toggle" id="sysBtn" title="${N(`record.toggleSys`)}" onclick="doToggleSys()">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
  </button>
  <div class="meter-group" id="sysMeter"></div> -->
  <button class="audio-toggle" id="camBtn" title="${N(`record.toggleCamera`)}" onclick="doToggleCam()">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
  </button>
  <div class="sep"></div>
  <button class="rec" id="startBtn" onclick="doStart()" title="${N(`record.start`)}">
    <svg width="12" height="12" viewBox="0 0 12 12"><circle cx="6" cy="6" r="5" fill="currentColor"/></svg>
    <span>${N(`record.recBtn`)}</span>
  </button>
  <button class="stop-btn" id="stopBtn" style="display:none" onclick="doStop()" title="${N(`record.stop`)}">
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="1"/></svg>
  </button>
  <button class="pause-btn" id="pauseBtn" style="display:none" onclick="doPause()" title="${N(`record.pause`)}">
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
  </button>
  <button id="resumeBtn" style="display:none" onclick="doResume()" title="${N(`record.resume`)}">
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>
  </button>
  <span class="size-label" id="sizeLabel">${e.width}×${e.height}</span>
  <button class="close-btn" onclick="doClose()" title="${N(`record.closeAndStop`)}">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>
  </button>
</div>
<script>
const I18N=${JSON.stringify(r())};
const {ipcRenderer}=require('electron')
let timerInterval=null,seconds=0,micOn=${t?.micEnabled?`true`:`false`},sysOn=${t?.sysEnabled?`true`:`false`},camOn=${t?.cameraEnabled?`true`:`false`},isRecording=false
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
</body></html>`;p.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(y)}`);let x=e.x-i,S=e.y-i,C=e.width+i*2,ee=e.height+i*2;f=new d.BrowserWindow({x,y:S,width:C,height:ee,show:!1,frame:!1,transparent:!0,resizable:!1,movable:!1,alwaysOnTop:!0,skipTaskbar:!0,hasShadow:!1,webPreferences:{nodeIntegration:!0,contextIsolation:!1}}),f.setVisibleOnAllWorkspaces(!0),f.setAlwaysOnTop(!0,`screen-saver`),f.setIgnoreMouseEvents(!0),f.setBounds({x,y:S,width:C,height:ee}),f.show();let te=`<!DOCTYPE html>
<html><head><style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;overflow:hidden}
.border{
  position:absolute;left:0;top:0;right:0;bottom:0;
  border:${n}px solid #e94560;
  background:transparent;
}
</style></head><body>
<div class="border"></div>
</body></html>`;f.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(te)}`),k.info(`Region border+toolbar shown (split windows):`,e),b=e,t?.cameraEnabled&&ne(e,t.cameraDeviceId),f&&!f.isDestroyed()&&f.setAlwaysOnTop(!0,`screen-saver`),p&&!p.isDestroyed()&&p.setAlwaysOnTop(!0,`screen-saver`),g&&!g.isDestroyed()&&g.setAlwaysOnTop(!0,`screen-saver`)}function ue(e,t){p&&!p.isDestroyed()&&(p.webContents.send(`toolbar-state`,e,t,h),(e===`recording`||e===`paused`)&&h===`inside`&&m&&p.setBounds({x:m.x+8,y:m.y+8,width:170,height:40}))}function de(){f&&!f.isDestroyed()&&(f.close(),f=null)}function fe(){de(),p&&!p.isDestroyed()&&(p.close(),p=null),w(),b=null,k.info(`Region border hidden`)}function pe(){d.ipcMain.on(`region-selected`,(e,t)=>{k.info(`Region selected:`,t),l(t)}),d.ipcMain.on(`region-cancelled`,()=>{k.info(`Region selection cancelled`),l(null)}),d.ipcMain.handle(`show-region-border`,(e,t,n)=>{le(t,n)}),d.ipcMain.handle(`hide-region-border`,()=>{fe()}),d.ipcMain.handle(`hide-border-only`,()=>{de()}),d.ipcMain.handle(`update-toolbar-state`,(e,t,n)=>{ue(t,n)}),d.ipcMain.on(`toolbar-action`,(e,t)=>{if(k.info(`Toolbar action:`,t),t===`close`){n&&!n.isDestroyed()&&n.webContents.send(`on-toolbar-action`,`close`),fe();return}n&&!n.isDestroyed()&&n.webContents.send(`on-toolbar-action`,t)}),d.ipcMain.removeHandler(`set-mouse-ignore`),d.ipcMain.removeAllListeners(`set-mouse-ignore`),d.ipcMain.handle(`show-floating-island`,(e,t,n)=>{oe(t,n)}),d.ipcMain.handle(`hide-floating-island`,()=>{se()}),d.ipcMain.handle(`hide-camera-preview`,()=>{w()}),d.ipcMain.handle(`toggle-camera-preview`,(e,t,n)=>{t&&b?ne(b,n):w()}),d.ipcMain.on(`camera-drag-start`,()=>ee()),d.ipcMain.on(`camera-drag-end`,()=>te()),d.ipcMain.handle(`set-island-state`,(e,t,n)=>{D(t,n)}),d.ipcMain.on(`island-action`,(e,t)=>{k.info(`Island action:`,t),n&&!n.isDestroyed()&&n.webContents.send(`on-toolbar-action`,t)}),d.ipcMain.on(`resize-island`,(e,t,n)=>{if(T&&!T.isDestroyed()){if(!Number.isFinite(t))return;let e=ae||d.screen.getPrimaryDisplay().bounds,r=t+20,i=Math.round(e.x+(e.width-r)/2),a=Number.isFinite(n)?n:44;T.setBounds({x:i,y:e.y+4,width:r,height:a})}})}t.exports={selectRegion:c,showRegionBorder:le,hideRegionBorder:fe,hideBorderOnly:de,updateToolbarState:ue,updateAudioLevels:a,showFloatingIsland:oe,hideFloatingIsland:se,showCameraPreview:ne,hideCameraPreview:w,setFloatingIslandState:D,setMainWindow:i,registerRegionSelectorHandlers:pe}})),Ze=Xe(),Qe=new Map;function $e(e=32){let t=Qe.get(e);if(t)return t;try{let t=[(0,u.join)(__dirname,`..`,`..`,`public`,`logo.png`),(0,u.join)(__dirname,`..`,`public`,`logo.png`),(0,u.join)(__dirname,`..`,`..`,`resources`,`logo.png`)];for(let n of t)if(_.default.existsSync(n)){let t=d.nativeImage.createFromPath(n).resize({width:e,height:e,quality:`good`}).toDataURL();return Qe.set(e,t),t}}catch{}return``}A(),P();var F=null,I=null,et=!1,tt=!1,nt=`ai-island-settings.json`,rt={flat:!1},it=null;function at(){return(0,u.join)(d.app.isPackaged?d.app.getPath(`userData`):(0,u.join)(__dirname,`..`,`..`),nt)}function ot(){try{let e=_.default.readFileSync(at(),`utf-8`),t=JSON.parse(e);return{flat:typeof t.flat==`boolean`?t.flat:rt.flat}}catch{}return{...rt}}function st(e){try{_.default.writeFileSync(at(),JSON.stringify(e),`utf-8`)}catch{}}function ct(e){F&&!F.isDestroyed()&&F.webContents.send(`ai-island-set-flat`,e.flat)}function lt(){return it||(it=ot(),it)}function ut(e){let t={...lt()};return typeof e.flat==`boolean`&&(t.flat=e.flat),st(t),it=t,ct(t),t}function dt(){return d.app.isPackaged?f.join(process.resourcesPath,`question-card-utils.js`):f.join(__dirname,`question-card-utils.js`)}function ft(){return{idle:N(`aiIsland.idle`),thinking:N(`aiIsland.thinking`),working:N(`aiIsland.working`),error:N(`aiIsland.error`),notification:N(`aiIsland.notification`),done:N(`aiIsland.done`),viewDetail:N(`aiIsland.viewDetail`),permTitle:N(`aiIsland.permTitle`),permTool:N(`aiIsland.permTool`),permInput:N(`aiIsland.permInput`),allow:N(`common.allow`),alwaysAllow:N(`common.alwaysAllow`),deny:N(`common.deny`),questionTitle:N(`aiIsland.questionTitle`),prev:N(`aiIsland.prevQuestion`),next:N(`aiIsland.nextQuestion`),submit:N(`aiIsland.submitAnswer`),know:N(`aiIsland.know`),otherPlaceholder:N(`aiIsland.otherPlaceholder`),otherHint:N(`aiIsland.otherHint`),answerInClaude:N(`aiIsland.answerInClaude`),unknown:N(`aiIsland.unknown`),other:N(`aiIsland.other`),progress:N(`aiIsland.progress`),close:N(`common.close`)}}function pt(){let e=lt().flat,t=JSON.stringify(ft());return`<!DOCTYPE html>
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
</style></head><body${e?` class="flat"`:``}>
<div class="island" id="island">
  <div class="island-row" id="islandRow">
    <div class="ai-indicator" id="aiIndicator" onclick="showAiDetail()" title="${N(`aiIsland.viewDetail`)}">
      <span class="ai-dot idle" id="aiDot"></span>
      <span class="ai-label" id="aiLabel">${N(`aiIsland.idle`)}</span>
    </div>
  </div>
  <div class="perm-card" id="permCard">
    <div class="perm-banner">
      <span class="perm-banner-dot"></span>
      <span class="perm-banner-text">${N(`aiIsland.permTitle`)}</span>
    </div>
    <div class="perm-body">
      <div class="perm-row">
        <span class="perm-row-label">${N(`aiIsland.permTool`)}</span>
        <span class="perm-tool" id="permTool">—</span>
      </div>
      <div class="perm-row" id="permInputRow" style="display:none">
        <span class="perm-row-label">${N(`aiIsland.permInput`)}</span>
        <div class="perm-input" id="permInput"></div>
      </div>
    </div>
    <div class="perm-actions">
      <button class="perm-btn allow" onclick="doAllow()">${N(`common.allow`)}</button>
      <button class="perm-btn always" onclick="doAlwaysAllow()">${N(`common.alwaysAllow`)}</button>
      <button class="perm-btn deny" onclick="doDeny()">${N(`common.deny`)}</button>
    </div>
  </div>
  <div class="question-card" id="questionCard">
    <div class="question-banner">
      <span class="question-banner-dot"></span>
      <span class="question-banner-text">${N(`aiIsland.questionTitle`)}</span>
      <span class="question-progress" id="questionProgress"></span>
      <span class="question-close" id="questionClose" onclick="closeQuestion()" title="${N(`common.close`)}">✕</span>
    </div>
    <div class="question-body" id="questionBody"></div>
    <div class="question-actions">
      <button class="question-btn" id="questionPrevBtn" onclick="prevQuestion()">${N(`aiIsland.prevQuestion`)}</button>
      <button class="question-btn" id="questionBtn" onclick="stepQuestion()">${N(`aiIsland.know`)}</button>
    </div>
  </div>
</div>
<script>
const __QCU_UTILS_PATH__=${JSON.stringify(dt())}
const quiz=require(__QCU_UTILS_PATH__)
const {resolveQuestionList,toQuestionItem,buttonLabel,progressText,questionKey,multiSelectOf,withOther,toggleOption,buildAnswers}=quiz
const {ipcRenderer}=require('electron')
// 语言词条：主进程构建 HTML 时按当前语言注入，切语言后重载窗口即更新
const S=${t};
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
</body></html>`}function mt(){if(F&&!F.isDestroyed())return;let e=d.screen.getPrimaryDisplay().bounds;F=new d.BrowserWindow({x:Math.round(e.x+(e.width-200)/2),y:e.y+4,width:200,height:44,frame:!1,transparent:!0,resizable:!1,movable:!1,alwaysOnTop:!0,skipTaskbar:!0,hasShadow:!1,webPreferences:{nodeIntegration:!0,contextIsolation:!1}}),F.setVisibleOnAllWorkspaces(!0),F.setMinimumSize(100,12),F.setAlwaysOnTop(!0,`screen-saver`),F.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(pt())}`),k.info(`AI island shown`)}function ht(){F&&!F.isDestroyed()&&(F.close(),F=null,k.info(`AI island hidden`))}function gt(){F&&!F.isDestroyed()&&(F.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(pt())}`).catch(()=>{}),k.info(`AI island reloaded for locale`))}function _t(){d.ipcMain.handle(`get-ai-island-settings`,()=>lt()),d.ipcMain.handle(`set-ai-island-settings`,(e,t)=>ut(t)),d.ipcMain.on(`resize-ai-island`,(e,t,n)=>{if(!F||F.isDestroyed()||!Number.isFinite(t))return;let r=t+20,i=Number.isFinite(n)?n:44;if(!(!Number.isFinite(r)||!Number.isFinite(i)))if(lt().flat){let e=d.screen.getDisplayMatching(F.getBounds()).bounds,n=Math.round(e.x+(e.width-t)/2);if(!Number.isFinite(n))return;F.setBounds({x:n,y:e.y,width:t,height:i})}else if(et){let[e,t]=F.getPosition();if(!Number.isFinite(e)||!Number.isFinite(t))return;F.setBounds({x:e,y:t,width:r,height:i})}else{let e=d.screen.getPrimaryDisplay().bounds,t=Math.round(e.x+(e.width-r)/2),n=e.y+4;if(!Number.isFinite(t)||!Number.isFinite(n))return;F.setBounds({x:t,y:n,width:r,height:i})}}),d.ipcMain.on(`ai-island-drag-start`,(e,t,n)=>{if(!F||F.isDestroyed()||!Number.isFinite(t)||!Number.isFinite(n))return;let[r,i]=F.getPosition();I={winX:r,winY:i,scrX:t,scrY:n}}),d.ipcMain.on(`ai-island-drag-move`,(e,t,n)=>{if(!F||F.isDestroyed()||!I||!Number.isFinite(t)||!Number.isFinite(I.scrX)||!Number.isFinite(I.winX)||!Number.isFinite(I.winY))return;let r=t-I.scrX,i=Math.round(I.winX+r);if(!Number.isFinite(i))return;let[a,o]=F.getSize();F.setBounds({x:i,y:I.winY,width:a,height:o})}),d.ipcMain.on(`ai-island-drag-end`,()=>{I=null,lt().flat||(et=!0)}),d.ipcMain.on(`set-ai-island-mouse-mode`,(e,t)=>{if(!F||F.isDestroyed())return;let n=!t;n!==tt&&(tt=n,F.setIgnoreMouseEvents(n,{forward:!0}))})}A(),P();var L=null,R=null,z=null,B=66,V=240,vt=`floating-ball-pos.json`;function yt(){return(0,u.join)(d.app.isPackaged?d.app.getPath(`userData`):(0,u.join)(__dirname,`..`,`..`),vt)}function bt(){try{let e=_.default.readFileSync(yt(),`utf-8`),t=JSON.parse(e);if(typeof t.x==`number`&&typeof t.y==`number`)return t}catch{}return null}function xt(e){try{_.default.writeFileSync(yt(),JSON.stringify(e),`utf-8`)}catch{}}function H(e){if(!(!L||L.isDestroyed())){if(!Number.isFinite(e.x)||!Number.isFinite(e.y)||!Number.isFinite(e.width)||!Number.isFinite(e.height)){k.warn(`Floating ball setBounds skipped (non-finite):`,e);return}try{L.setBounds(e)}catch(t){k.warn(`Floating ball setBounds failed (swallowed):`,t?.message??t,e)}}}var St=`floating-ball-settings.json`,Ct=[{key:`record`,labelKey:`ball.menu.record`,icon:`●`,action:`record`},{key:`music`,labelKey:`ball.menu.music`,icon:`♪`,action:`music`},{key:`ai`,labelKey:`ball.menu.ai`,icon:`✦`,action:`ai`},{key:`todo`,labelKey:`ball.menu.todo`,icon:`☑`,action:`todo`},{key:`settings`,labelKey:`ball.menu.settings`,icon:`⚙`,action:`settings`}],wt=Ct.map(e=>e.key),Tt={record:!0,music:!0,ai:!0,todo:!0,settings:!0},Et={visible:!0,alwaysOnTop:!0,openAtLogin:!1,locale:`zh`,snapGutter:0,menuItems:{...Tt}},Dt=null;function Ot(){return(0,u.join)(d.app.isPackaged?d.app.getPath(`userData`):(0,u.join)(__dirname,`..`,`..`),St)}function kt(){try{let e=_.default.readFileSync(Ot(),`utf-8`),t=JSON.parse(e),n={...Tt};for(let e of wt)typeof t?.menuItems?.[e]==`boolean`&&(n[e]=t.menuItems[e]);return{visible:typeof t.visible==`boolean`?t.visible:Et.visible,alwaysOnTop:typeof t.alwaysOnTop==`boolean`?t.alwaysOnTop:Et.alwaysOnTop,openAtLogin:typeof t.openAtLogin==`boolean`?t.openAtLogin:Et.openAtLogin,locale:Ue(t.locale)?t.locale:Et.locale,snapGutter:typeof t.snapGutter==`number`&&t.snapGutter>=0&&t.snapGutter<=80?t.snapGutter:Et.snapGutter,menuItems:n}}catch{}return{...Et}}function At(e){try{_.default.writeFileSync(Ot(),JSON.stringify(e),`utf-8`)}catch{}}function U(){return Dt||(Dt=kt(),Dt)}function jt(e){let t={...U(),...e};return e.locale!==void 0&&We(t.locale),At(t),Dt=t,t}function Mt(){let e=U();return Ct.filter(t=>e.menuItems[t.key]).map(e=>({...e,label:N(e.labelKey)}))}function Nt(){Zt(),L&&!L.isDestroyed()&&L.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(Kt())}`).catch(()=>{})}function Pt(){R=null;try{_.default.unlinkSync(yt())}catch{}}function Ft(){U().visible&&zt()}function It(e){L&&!L.isDestroyed()&&L.setAlwaysOnTop(e,`screen-saver`)}function Lt(e,t,n){!L||L.isDestroyed()||L.webContents.executeJavaScript(`if(window.updateBadge) updateBadge(${Number(e)||0}, ${!!t}, ${!!n})`).catch(()=>{})}function Rt(e){e.visible?zt():Bt(),It(e.alwaysOnTop)}function zt(){if(L&&!L.isDestroyed()){L.show(),L.focus();return}if(!R){let e=bt();if(e)R=e;else{let e=d.screen.getPrimaryDisplay().bounds;R={x:Math.round(e.x+(e.width-B)/2),y:Math.round(e.y+(e.height-B)/2)}}}L=new d.BrowserWindow({x:R.x,y:R.y,width:B,height:B,frame:!1,transparent:!0,backgroundColor:`#00000000`,resizable:!1,alwaysOnTop:U().alwaysOnTop,skipTaskbar:!0,hasShadow:!1,show:!1,webPreferences:{nodeIntegration:!0,contextIsolation:!1}}),L.setVisibleOnAllWorkspaces(!0),L.setAlwaysOnTop(U().alwaysOnTop,`screen-saver`);let e=Kt();L.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(e)}`),L.once(`ready-to-show`,()=>{L?.show(),L&&!L.isDestroyed()&&L.webContents.executeJavaScript(`ensureMenu()`).catch(()=>{})});let t=L;L.on(`closed`,()=>{L===t&&(L=null)}),L.on(`move`,()=>{if(!L||L.isDestroyed())return;let[e,t]=L.getPosition(),[n,r]=L.getSize();R={x:Math.round(e+n/2-B/2),y:Math.round(t+r/2-B/2)}}),L.on(`close`,()=>{R&&xt(R)}),L.on(`blur`,()=>{Vt&&Wt()}),k.info(`Floating ball shown`)}function Bt(){if(L&&!L.isDestroyed()){let[e,t]=L.getPosition(),[n,r]=L.getSize();R={x:Math.round(e+n/2-B/2),y:Math.round(t+r/2-B/2)},xt(R);let i=L;L=null,i.destroy(),k.info(`Floating ball hidden`)}}var Vt=!1,Ht=null;async function Ut(){if(!L||L.isDestroyed())return;Ht&&=(clearTimeout(Ht),null);let[e,t]=L.getPosition(),n=R?R.x:e,r=R?R.y:t,i=Math.round(n+B/2),a=Math.round(r+B/2);k.info(`[Ball] expand at`,[e,t],`center`,[i,a]);let[o]=L.getSize(),s=o!==V;s&&(L.setOpacity(0),H({x:i-V/2,y:a-V/2,width:V,height:V}));try{await L.webContents.executeJavaScript(`restartBloom(); void 0;`)}catch{}if(!(!L||L.isDestroyed())){if(s){try{await L.capturePage()}catch{}if(!L||L.isDestroyed())return;L.setOpacity(1)}Vt=!0,L.webContents.send(`ball-state`,`expanded`)}}async function Wt(){if(Vt=!1,!L||L.isDestroyed())return;if(!R){let[e,t]=L.getPosition();R={x:Math.round(e+V/2-B/2),y:Math.round(t+V/2-B/2)}}let e=R.x,t=R.y;k.info(`[Ball] collapse at`,[e,t]);try{await L.webContents.executeJavaScript(`document.body.classList.remove('expanded'); isExpanded=false; void 0;`)}catch{}!L||L.isDestroyed()||(Ht&&clearTimeout(Ht),Ht=setTimeout(()=>{if(Ht=null,!(!L||L.isDestroyed())&&!Vt){try{L.webContents.executeJavaScript(`var s=document.getElementById('ringSvg');while(s.firstChild){s.removeChild(s.firstChild)} menuCreated=false; void 0;`)}catch{}!L||L.isDestroyed()||(L.setOpacity(0),H({x:e,y:t,width:B,height:B}),L.setOpacity(1))}},920))}function Gt(e){if(e===`record`)process.emit(`clawd-show-record-window`);else if(e===`ai`)process.emit(`clawd-show-ai-window`);else if(e===`todo`)process.emit(`clawd-show-todo-window`);else if(e===`music`)process.emit(`clawd-show-music-window`);else if(e===`settings`)process.emit(`clawd-show-settings-window`);else{let t=d.BrowserWindow.getAllWindows().find(e=>!e.isDestroyed()&&e!==L);t&&!t.isDestroyed()&&t.webContents.send(`on-floating-ball-action`,e)}Wt()}function Kt(){return`<!DOCTYPE html>
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
  width:56px;height:56px;border-radius:50%;border:none;
  background:#eceef3;
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
/* 水滴吸附（G5）：吸附后从 66px 圆球收缩成更小的半透明水滴。
   关键 = 左右/外侧保留外圆角（圆润水滴感），贴边那面贴近屏幕边缘（略留 2px 防 Windows
   DWM 裁切），整体变小、半透明、不太显眼。窗口仍保持 66px 透明窗（不 shrink），
   只把 trigger 绝对定位到对应边缘并收小，避免牵动 setBounds/拖动/环形菜单几何。
   每边独立：贴哪边就把 trigger 推到那边，贴边侧无外延半径（flat），外侧两角 15px 圆角。 */
/* ─ 吸附于垂直边（左/右）：竖向水滴胶囊。
   外侧两端全圆（外圆角），贴边那侧用 8px 小圆角平滑过渡到屏幕边缘——不是硬直角。─ */
body.snap-left #trigger{
  position:absolute;
  width:40px; height:52px;          /* 竖向胶囊，贴屏幕左缘 */
  left:0; top:7px;
  /* TL=8(贴边左上小圆角过渡) TR=999(外上一侧圆角) BR=999(外下一侧圆角) BL=8(贴边左下小圆角过渡) */
  border-radius:8px 999px 999px 8px;
  background:rgba(236,238,243,0.72);
  opacity:0.88;
  box-shadow:0 3px 9px rgba(0,0,0,0.15);
}
body.snap-right #trigger{
  position:absolute;
  width:40px; height:52px;
  right:0px; top:7px;
  border-radius:999px 8px 8px 999px; /* 镜像：外(左)端全圆，贴边(右)端小圆角过渡 */
  background:rgba(236,238,243,0.72);
  opacity:0.88;
  box-shadow:0 3px 9px rgba(0,0,0,0.15);
}
/* ─ 吸附水平边：横向水滴胶囊，贴边侧小圆角过渡，外侧两端全圆 ─ */
body.snap-top #trigger{
  position:absolute;
  width:52px; height:40px;
  left:7px; top:0;
  border-radius:8px 8px 999px 999px; /* 上(贴边)两角小圆角过渡，下(外)两端全圆 */
  background:rgba(236,238,243,0.72);
  opacity:0.88;
  box-shadow:0 3px 9px rgba(0,0,0,0.15);
}
body.snap-bottom #trigger{
  position:absolute;
  width:52px; height:40px;
  left:7px; bottom:0;
  border-radius:999px 999px 8px 8px; /* 下(贴边)两角小圆角过渡，上(外)两端全圆 */
  background:rgba(236,238,243,0.72);
  opacity:0.88;
  box-shadow:0 3px 9px rgba(0,0,0,0.15);
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

</style>
</head>
<body>
<div id="ball">
  <svg class="ring-svg" id="ringSvg" viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg">
    <!-- 圆弧段用 JS 动态创建 -->
  </svg>
  <div class="core">
    <button id="trigger">
      <img id="logoImg" class="logo-img" src="${$e(48)}" alt="logo" />
    </button>
    <!-- 待办数量气泡：悬浮球右上角红色数字胶囊。放在恒 66px 的 .core 内（始终贴球心居中），
         锚点是球而非随展开放大的容器 ⇒ 展开菜单时不偏移；top/right=0 落在窗口内，不会被裁切 -->
    <span id="ballBadge"></span>
  </div>
</div>

<script>
const {ipcRenderer} = require('electron')

const ITEMS = ${JSON.stringify(Mt())};

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
  if(e.target.closest('#trigger') || e.target.closest('.arc-item')) return
  ipcRenderer.send('floating-ball-collapse')
})
<\/script>
</body>
</html>`}var qt=null,W=null;function Jt(e){if(!(!L||L.isDestroyed()))try{L.webContents.send(`ball-snap`,e)}catch{}}function Yt(e){if(e<=0)return 0;if(e>=1)return 1;let t=2*Math.PI/3;return 2**(-10*e)*Math.sin((e*10-.75)*t)+1}function Xt(e,t,n,r){if(!Number.isFinite(e)||!Number.isFinite(t)||!Number.isFinite(n.x)||!Number.isFinite(n.y)){k.warn(`Floating ball snap skipped (non-finite input):`,{x:e,y:t,to:n});return}W&&=(clearInterval(W),null);let i=Date.now();W=setInterval(()=>{if(!L||L.isDestroyed()){W&&=(clearInterval(W),null);return}let a=Math.min(1,(Date.now()-i)/420),o=Yt(a);if(H({x:Math.round(e+(n.x-e)*o),y:Math.round(t+(n.y-t)*o),width:B,height:B}),a>=1){W&&=(clearInterval(W),null);let[e,t]=L.getPosition();(e!==n.x||t!==n.y)&&H({x:n.x,y:n.y,width:B,height:B}),qt=r,Jt(r),R&&(R={x:n.x,y:n.y},xt(R)),k.info(`Floating ball snapped (elastic) to edge:`,[n.x,n.y],r)}},16)}function Zt(){W&&=(clearInterval(W),null),qt&&(qt=null,Jt(null))}function Qt(){d.ipcMain.handle(`show-floating-ball`,()=>{zt()}),d.ipcMain.handle(`hide-floating-ball`,()=>{Bt()}),d.ipcMain.handle(`toggle-floating-ball`,()=>{Bt()}),d.ipcMain.on(`floating-ball-expand`,()=>{Ut()}),d.ipcMain.on(`floating-ball-collapse`,()=>{Wt()}),d.ipcMain.on(`floating-ball-action`,(e,t)=>{k.info(`Floating ball action:`,t),Gt(t)});let e=null;d.ipcMain.on(`floating-ball-drag-start`,(t,n,r)=>{if(!L||L.isDestroyed())return;Zt();let[i,a]=L.getPosition(),[o,s]=L.getSize();z={winX:i,winY:a,scrX:n,scrY:r},e={w:o,h:s}}),d.ipcMain.on(`floating-ball-move`,(t,n,r)=>{if(!L||L.isDestroyed()||!z||!e||!Number.isFinite(n)||!Number.isFinite(r))return;let i=n-z.scrX,a=r-z.scrY,o=Math.round(z.winX+i),s=Math.round(z.winY+a);H({x:o,y:s,width:e.w,height:e.h});let[c,l]=L.getPosition();(c!==o||l!==s)&&H({x:o+(o-c),y:s+(s-l),width:e.w,height:e.h})}),d.ipcMain.on(`floating-ball-drag-end`,()=>{if(z=null,e=null,L&&!L.isDestroyed()){let[e,t]=L.getPosition(),[n,r]=L.getSize(),i=d.screen.getDisplayMatching(L.getBounds()).bounds,a=U().snapGutter,o=Math.abs(e-(i.x+a)),s=Math.abs(i.x+i.width-a-(e+n)),c=Math.abs(t-(i.y+a)),l=Math.abs(i.y+i.height-a-(t+r)),u=null,f=Number.MAX_VALUE;o<40&&o<f&&(f=o,u=`left`),s<40&&s<f&&(f=s,u=`right`),c<40&&c<f&&(f=c,u=`top`),l<40&&l<f&&(f=l,u=`bottom`),u===`left`?Xt(e,t,{x:i.x+a,y:t},`left`):u===`right`?Xt(e,t,{x:i.x+i.width-a-n,y:t},`right`):u===`top`?Xt(e,t,{x:e,y:i.y+a},`top`):u===`bottom`&&Xt(e,t,{x:e,y:i.y+i.height-a-r},`bottom`)}R&&xt(R)}),d.ipcMain.handle(`get-floating-ball-settings`,()=>U()),d.ipcMain.handle(`set-floating-ball-settings`,(e,t)=>{let n={...U()},r=jt(t);if(Rt(r),t.openAtLogin!==void 0)try{d.app.setLoginItemSettings({openAtLogin:t.openAtLogin})}catch(e){k.error(`setLoginItemSettings failed:`,e)}if(t.menuItems&&JSON.stringify(n.menuItems)!==JSON.stringify(r.menuItems)&&Nt(),t.locale!==void 0&&n.locale!==r.locale){Nt(),gt();let e=d.BrowserWindow.getAllWindows();for(let t of e)if(!t.isDestroyed())try{t.webContents.send(`app-locale-changed`,{locale:r.locale})}catch{}k.info(`Floating ball locale changed: ${n.locale} -> ${r.locale}`)}return r}),d.ipcMain.handle(`reset-floating-ball-position`,()=>{if(Pt(),Zt(),L&&!L.isDestroyed()){let e=d.screen.getPrimaryDisplay().bounds,t=Math.round(e.x+(e.width-B)/2),n=Math.round(e.y+(e.height-B)/2);Vt=!1;try{L.webContents.executeJavaScript(`document.body.classList.remove('expanded'); var s=document.getElementById('ringSvg');if(s){while(s.firstChild){s.removeChild(s.firstChild)}} menuCreated=false; isExpanded=false; void 0;`).catch(()=>{})}catch{}H({x:t,y:n,width:B,height:B}),R={x:t,y:n};let[r,i]=L.getPosition();(r!==t||i!==n)&&H({x:t+(t-r),y:n+(n-i),width:B,height:B})}})}var $t=s(((e,t)=>{A();var n=null;function r(){let e=d.app.isPackaged?(0,u.join)(process.resourcesPath,`logo.ico`):(0,u.join)(__dirname,`../../public/logo.ico`);return d.nativeImage.createFromPath(e).resize({width:16,height:16})}function i(){let e=d.app.isPackaged?(0,u.join)(process.resourcesPath,`logo.png`):(0,u.join)(__dirname,`../../public/logo.png`);return e?d.nativeImage.createFromPath(e).resize({width:64,height:64,quality:`better`}):d.nativeImage.createEmpty()}function a(){if(n&&!n.isDestroyed())return;n=new d.Tray(r()),n.setToolTip(`二支录制`);let e=d.Menu.buildFromTemplate([{label:`显示设置窗口`,click:()=>{process.emit(`clawd-show-settings-window`)}},{type:`separator`},{label:`退出`,click:()=>{let{app:e}=require(`electron`);e.quit()}}]);n.setContextMenu(e),n.on(`click`,()=>{process.emit(`clawd-show-settings-window`)}),k.info(`System tray created`)}function o(e,t){n&&!n.isDestroyed()&&(n.displayBalloon({title:e,content:t,icon:i()}),k.info(`Tray balloon:`,e,t))}function s(){n&&!n.isDestroyed()&&(n.destroy(),n=null)}t.exports={createTray:a,showBalloon:o,destroyTray:s}}))();A();var en={available:!1,playing:!1,title:``,artist:``,album:``,hasSession:null},tn=`
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$asTaskGeneric=([System.WindowsRuntimeSystemExtensions].GetMethods()|Where-Object{$_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation\`1'})[0]
function Await($t,$rt){$asTask=$asTaskGeneric.MakeGenericMethod($rt);$n=$asTask.Invoke($null,@($t));$n.Wait(-1)|Out-Null;$n.Result}
try{
  [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager,Windows.Media.Control,ContentType=WindowsRuntime]|Out-Null
  $m=Await ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager])
  if(-not $m){'{"available":true,"hasSession":false}';exit}
  $s=$m.GetCurrentSession()
  if(-not $s){'{"available":true,"hasSession":false}';exit}
  $p=Await ($s.TryGetMediaPropertiesAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties])
  $st=[int]$s.PlaybackInfo.PlaybackStatus
  $title=[string]$p.Title;$artist=[string]$p.Artist;$album=[string]$p.AlbumTitle
  $play=($st -eq 4)
  # 拼 JSON：PowerShell 双引号串不接受 \\" 转义，改单引号字面量 + 变量拼接（歌名含引号属极端，忽略）
  '{' + '"available":true,"hasSession":true,"playing":' + $play.ToString().ToLower() + ',"title":"' + $title + '","artist":"' + $artist + '","album":"' + $album + '"' + '}'
}catch{
  # 任何失败都降级为不可用，不抛异常污染主进程
  '{"available":false,"hasSession":null}'
}
`,nn={play:`TryPlayAsync`,pause:`TryPauseAsync`,next:`TrySkipNextAsync`,prev:`TrySkipPreviousAsync`},rn=e=>`
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$asTaskGeneric=([System.WindowsRuntimeSystemExtensions].GetMethods()|Where-Object{$_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation\`1'})[0]
function Await($t,$rt){$asTask=$asTaskGeneric.MakeGenericMethod($rt);$n=$asTask.Invoke($null,@($t));$n.Wait(-1)|Out-Null;$n.Result}
try{
  [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager,Windows.Media.Control,ContentType=WindowsRuntime]|Out-Null
  $m=Await ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager])
  $s=$m.GetCurrentSession()
  if($s){ $null=Await ($s.${e}()) ([boolean]) }
  '{"ok":true}'
}catch{'{"ok":false}'}
`;function an(e){return new Promise(t=>{(0,p.execFile)(`powershell.exe`,[`-NoProfile`,`-NonInteractive`,`-NoLogo`,`-Command`,e],{windowsHide:!0,timeout:8e3,maxBuffer:4*1024*1024},(e,n)=>{if(e){t(``);return}t(n.trim())})})}async function on(){try{let e=(await an(tn)).match(/\{.*\}/s);if(!e)return en;let t=JSON.parse(e[0]);return t.available?{available:!0,playing:!!t.playing,title:t.title||``,artist:t.artist||``,album:t.album||``,hasSession:t.hasSession}:en}catch(e){return k.warn(`[music-smtc] read failed:`,e?.message??e),en}}async function sn(e){let t=nn[e];if(!t)return!1;try{let e=await an(rn(t));return/"ok":true/.test(e)}catch{return!1}}A();var G=null;function cn(){let e=d.app.isPackaged?(0,u.join)(process.resourcesPath,`logo.ico`):(0,u.join)(__dirname,`..`,`..`,`public`,`logo.ico`);return d.nativeImage.createFromPath(e)}function ln(){if(G&&!G.isDestroyed()){G.show(),G.focus();return}let e=process.env.VITE_DEV_SERVER_URL,t=(0,u.join)(__dirname,`..`,`preload`,`index.cjs`);G=new d.BrowserWindow({icon:cn(),width:400,height:480,minWidth:340,minHeight:380,show:!1,skipTaskbar:!1,frame:!1,titleBarStyle:`hidden`,title:`音乐`,backgroundColor:`#eaeaec`,webPreferences:{preload:t,contextIsolation:!0,nodeIntegration:!1,sandbox:!1}}),e?G.loadURL(`${e}#/music?t=${Date.now()}`):G.loadFile((0,u.join)(process.env.DIST,`index.html`),{hash:`/music`}),G.once(`ready-to-show`,()=>{G?.show()}),G.on(`closed`,()=>{G=null}),k.info(`Music window shown`)}function un(){G&&!G.isDestroyed()&&G.destroy(),G=null}function dn(){d.ipcMain.handle(`show-music-window`,()=>ln()),d.ipcMain.handle(`close-music-window`,()=>un()),d.ipcMain.handle(`music-get-status`,()=>on()),d.ipcMain.handle(`music-control`,(e,t)=>sn(t))}var fn={info:()=>{},warn:()=>{},error:()=>{}},pn=null,mn=`todo-notes.json`,hn=`todo-settings.json`;function gn(){if(pn)return pn;let{app:e}=require(`electron`);return e.getPath(`userData`)}function _n(){return(0,u.join)(gn(),mn)}function vn(){return(0,u.join)(gn(),hn)}function yn(){try{let e=_.readFileSync(_n(),`utf-8`),t=JSON.parse(e);if(Array.isArray(t.items))return{items:t.items.filter(e=>e&&typeof e.id==`string`),meta:{schemaVersion:t.meta?.schemaVersion??1}}}catch{}return{items:[],meta:{schemaVersion:1}}}function K(){return yn().items}function bn(e){let t=_n(),n=t+`.tmp`;try{_.writeFileSync(n,JSON.stringify(e,null,2),`utf-8`),_.renameSync(n,t)}catch{try{_.writeFileSync(t,JSON.stringify(e,null,2),`utf-8`)}catch(e){fn.error(`todo store save failed:`,e?.message??e)}}}function xn(e){bn({items:e,meta:{schemaVersion:1}})}function Sn(e){let t=K(),n=Date.now(),r={id:(0,x.randomUUID)(),type:e.type,title:e.title??``,content:e.content??``,priority:e.priority??`medium`,reminder:e.reminder??null,reminderFired:!1,done:e.done??!1,pinned:!1,pinX:null,pinY:null,createdAt:n,updatedAt:n};return t.unshift(r),xn(t),t}function Cn(e,t){let n=K(),r=n.find(t=>t.id===e);return r?(Object.assign(r,t,{updatedAt:Date.now()}),xn(n),n):n}function wn(e,t){let n=K(),r=n.find(t=>t.id===e);return r?(t.reminder!==void 0&&t.reminder!==r.reminder&&(r.reminderFired=!1),Object.assign(r,t,{updatedAt:Date.now()}),xn(n),n):n}function Tn(e){let t=K().filter(t=>t.id!==e);return xn(t),t}function En(e){let t=K(),n=t.find(t=>t.id===e);return n&&n.type===`todo`&&(n.done=!n.done,n.updatedAt=Date.now(),xn(t)),t}function Dn(e){return Cn(e,{reminderFired:!0})}function On(e,t){let n=K(),r=n.find(t=>t.id===e);return r?(r.pinned=!r.pinned,r.pinned&&t&&(r.pinX=Math.round(t.x),r.pinY=Math.round(t.y)),r.updatedAt=Date.now(),xn(n),n):n}function kn(e){return e.filter(e=>e.type===`todo`&&!e.done).length}var An={badgeVisible:!0,windowAlwaysOnTop:!0,stickyBoardPos:null};function jn(){try{let e=JSON.parse(_.readFileSync(vn(),`utf-8`));return{badgeVisible:typeof e.badgeVisible==`boolean`?e.badgeVisible:An.badgeVisible,windowAlwaysOnTop:typeof e.windowAlwaysOnTop==`boolean`?e.windowAlwaysOnTop:An.windowAlwaysOnTop,stickyBoardPos:e.stickyBoardPos&&typeof e.stickyBoardPos.x==`number`&&typeof e.stickyBoardPos.y==`number`?{x:e.stickyBoardPos.x,y:e.stickyBoardPos.y}:null}}catch{return{...An}}}function Mn(e){let t={...jn(),...e};try{_.writeFileSync(vn(),JSON.stringify(t,null,2),`utf-8`)}catch(e){fn.error(`todo settings save failed:`,e?.message??e)}return t}var Nn=!1;function q(){let e=kn(K()),t=jn().badgeVisible;Lt(e,Nn,t)}function Pn(e){Nn=e,q()}function Fn(){Pn(!1)}function In(){d.ipcMain.on(`floating-ball-badge-ready`,()=>{q()})}A(),P();var J=null;function Ln(){let e=d.app.isPackaged?(0,u.join)(process.resourcesPath,`logo.ico`):(0,u.join)(__dirname,`..`,`..`,`public`,`logo.ico`);return d.nativeImage.createFromPath(e)}function Rn(){if(J&&!J.isDestroyed()){J.show(),J.focus(),Fn();return}let e=process.env.VITE_DEV_SERVER_URL,t=(0,u.join)(__dirname,`..`,`preload`,`index.cjs`);J=new d.BrowserWindow({icon:Ln(),width:525,height:450,minWidth:320,minHeight:360,show:!1,skipTaskbar:!1,frame:!1,titleBarStyle:`hidden`,title:N(`todo.stickyTitle`),backgroundColor:`#eaeaec`,webPreferences:{preload:t,contextIsolation:!0,nodeIntegration:!1,sandbox:!1}}),J.setAlwaysOnTop(jn().windowAlwaysOnTop,`normal`),e?J.loadURL(`${e}#/todo?t=${Date.now()}`):J.loadFile((0,u.join)(process.env.DIST,`index.html`),{hash:`/todo`}),J.once(`ready-to-show`,()=>{J?.show()}),J.on(`closed`,()=>{J=null}),Fn(),k.info(`Todo window shown`)}function zn(){J&&!J.isDestroyed()&&J.close(),J=null}function Bn(){return!!(J&&!J.isDestroyed())}function Vn(){let e=!jn().windowAlwaysOnTop;return Mn({windowAlwaysOnTop:e}),J&&!J.isDestroyed()&&J.setAlwaysOnTop(e,`normal`),e}function Hn(e){if(Rn(),!J||J.isDestroyed())return;let t=()=>{J&&!J.isDestroyed()&&J.webContents.send(`todo-focus-item`,e)};J.webContents.isLoading()?J.webContents.once(`did-finish-load`,t):t()}function Un(e){if(!J||J.isDestroyed())return;let t=()=>{J&&!J.isDestroyed()&&J.webContents.send(`todo-data-changed`,e)};J.webContents.isLoading()?J.webContents.once(`did-finish-load`,t):t()}A(),P();var Y=null;function Wn(e,t){let n=$e(32);return`<!DOCTYPE html><html><head><meta charset="utf-8"><style>
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
    <div class="brand">${n?`<img class="logo" src="${n}">`:`<div class="logo">MU</div>`}<div class="brand-txt">MUERZHI</div></div>
    <div class="bar-right">
      <div class="ring">${N(`todo.reminderRing`)}</div>
      <button class="close" title="${N(`common.close`)}" onclick="ipc.send('todo-reminder-close')">✕</button>
    </div>
  </div>
  <div class="body">
    <div class="t">${Gn(e)||N(`todo.reminTitle`)}</div>
    <div class="b">${Gn(t)||N(`todo.reminderBody`)}</div>
    <div class="foot"><button class="open" onclick="ipc.send('todo-reminder-open')">${N(`todo.openTodo`)}</button></div>
  </div>
</div>
<script>
const {ipcRenderer} = require('electron')
window.ipc = ipcRenderer
<\/script></body></html>`}function Gn(e){return String(e).replace(/&/g,`&amp;`).replace(/</g,`&lt;`).replace(/>/g,`&gt;`).replace(/"/g,`&quot;`)}var Kn=[];function qn(e,t){Kn.push({title:e,body:t}),Jn()}function Jn(){if(Y&&!Y.isDestroyed())return;let e=Kn.shift();e&&Yn(e.title,e.body)}function Yn(e,t){let n=d.screen.getPrimaryDisplay().workArea;Y=new d.BrowserWindow({x:n.x+n.width-300-16,y:n.y+n.height-150-16,width:300,height:150,frame:!1,transparent:!0,backgroundColor:`#00000000`,resizable:!1,movable:!1,alwaysOnTop:!0,skipTaskbar:!0,hasShadow:!1,show:!1,webPreferences:{nodeIntegration:!0,contextIsolation:!1}}),Y.setAlwaysOnTop(!0,`screen-saver`),Y.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(Wn(e,t))}`),Y.once(`ready-to-show`,()=>Y?.show()),Y.on(`closed`,()=>{Y=null,Jn()}),k.info(`Todo reminder popup shown`)}function Xn(){Y&&!Y.isDestroyed()&&Y.destroy()}function Zn(){Kn.length=0,Y&&!Y.isDestroyed()&&Y.destroy(),Y=null}function Qn(e){return e?String(e).replace(/<img[^>]*alt=["']([^"']*)["'][^>]*>/gi,(e,t)=>t||`[图]`).replace(/<img[^>]*>/gi,`[图]`).replace(/<br\s*\/?>/gi,` `).replace(/<\/(p|div|h[1-6]|li|blockquote)>/gi,` `).replace(/<[^>]+>/gi,``).replace(/&nbsp;/g,` `).replace(/&amp;/g,`&`).replace(/&lt;/g,`<`).replace(/&gt;/g,`>`).replace(/&quot;/g,`"`).replace(/&#39;/g,`'`).replace(/\s+/g,` `).trim():``}P();var $n=208,er=120,X=null,tr=0;function nr(){return K().filter(e=>e.pinned).map(e=>{let t=Qn(e.content).trim(),n=e.type===`memo`?Qn(e.title).trim():``;return{id:e.id,type:e.type,title:n||t,body:n?t:``,done:e.done,priority:e.priority}})}function rr(){let e=d.screen.getPrimaryDisplay().workArea;return{x:e.x+e.width-$n-16,y:e.y+e.height-er-16}}function ir(){let e=$e(28),t=JSON.stringify({noContent:N(`todo.noContent`),open:N(`todo.open`),unpin:N(`todo.unpin`)});return`<!DOCTYPE html><html><head><meta charset="utf-8"><style>
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
    <img class="logo" src="${e}">
    <div class="brand">MUERZHI</div>
    <div class="counter" id="counter"></div>
    <button class="close" title="${N(`todo.unpin`)}" onclick="act('unpin')">✕</button>
  </div>
  <div class="note" id="note" onclick="act('open')">
    <div class="accent" id="accent"></div>
    <div class="in">
      <div class="t" id="t"></div>
      <div class="b" id="b"></div>
      <div class="open-hint">${N(`todo.open`)}</div>
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
const I18N=${t};
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
<\/script></body></html>`}function ar(){let e=jn().stickyBoardPos??rr();X=new d.BrowserWindow({x:e.x,y:e.y,width:$n,height:er,frame:!1,transparent:!0,backgroundColor:`#00000000`,resizable:!1,alwaysOnTop:!0,skipTaskbar:!0,hasShadow:!1,show:!1,webPreferences:{nodeIntegration:!0,contextIsolation:!1}}),X.setAlwaysOnTop(!0,`screen-saver`),X.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(ir())}`),X.once(`ready-to-show`,()=>{X&&!X.isDestroyed()&&(X.show(),cr())}),X.on(`move`,()=>{if(!X||X.isDestroyed())return;let[e,t]=X.getPosition();or&&clearTimeout(or),or=setTimeout(()=>{or=null,Mn({stickyBoardPos:{x:e,y:t}})},300)}),X.on(`closed`,()=>{X=null})}var or=null;function sr(){let e=nr();if(e.length===0){X&&!X.isDestroyed()&&X.destroy(),X=null;return}tr=Math.max(0,Math.min(tr,e.length-1)),!X||X.isDestroyed()?ar():cr()}function cr(){let e=nr();!X||X.isDestroyed()||X.webContents.executeJavaScript(`if(window.renderNotes) renderNotes(${JSON.stringify(e)}, ${tr})`).catch(()=>{})}function lr(){or&&=(clearTimeout(or),null),X&&!X.isDestroyed()&&X.destroy(),X=null}A();var{updateAudioLevels:ur}=Xe();function dr(){return(0,u.join)(d.app.getPath(`userData`),`recordings.json`)}function fr(e){(0,Ze.registerRegionSelectorHandlers)(),Qt(),_t(),dn(),d.ipcMain.handle(`show-ai-island`,()=>{mt()}),d.ipcMain.handle(`hide-ai-island`,()=>{ht()}),d.ipcMain.handle(`select-region`,async()=>(0,Ze.selectRegion)()),d.ipcMain.handle(`get-sources`,async(e,t)=>(await d.desktopCapturer.getSources({types:t??[`screen`,`window`],thumbnailSize:{width:340,height:200},fetchWindowIcons:!0})).map(e=>({id:e.id,name:e.name,display_id:e.display_id,appIcon:e.appIcon?.toDataURL()||null,thumbnail:e.thumbnail.toDataURL()}))),d.ipcMain.handle(`get-system-audio-sources`,async()=>{try{return(await d.desktopCapturer.getSources({types:[`audio`]})).map(e=>({id:e.id,name:e.name}))}catch{return[]}}),d.ipcMain.handle(`show-save-dialog`,async(e,t)=>{let n=d.BrowserWindow.getFocusedWindow();return n?d.dialog.showSaveDialog(n,{title:t?.title??`Save Recording`,defaultPath:t?.defaultPath??`recording-${Date.now()}.webm`,filters:t?.filters??[{name:`WebM Video`,extensions:[`webm`]},{name:`MP4 Video`,extensions:[`mp4`]},{name:`GIF`,extensions:[`gif`]}]}):{canceled:!0,filePath:null}}),d.ipcMain.handle(`show-open-dialog`,async(e,t)=>{let n=d.BrowserWindow.getFocusedWindow();return n?d.dialog.showOpenDialog(n,{title:t?.title??`Select File`,defaultPath:t?.defaultPath,filters:t?.filters??[{name:`Video Files`,extensions:[`webm`,`mp4`,`gif`]}],properties:t?.properties}):{canceled:!0,filePaths:[]}}),d.ipcMain.handle(`get-default-save-dir`,async()=>d.app.getPath(`videos`)||d.app.getPath(`desktop`)),d.ipcMain.handle(`write-file`,async(e,t,n)=>{try{return await _.default.promises.mkdir((0,u.dirname)(n),{recursive:!0}),await _.default.promises.writeFile(n,t),k.info(`保存文件`,n),{success:!0,filePath:n}}catch(e){return k.error(`保存文件失败`,n,e.message),{success:!1,filePath:n,error:e.message}}}),d.ipcMain.handle(`read-file`,async(e,t)=>{try{return(await _.default.promises.readFile(t)).buffer}catch(e){throw Error(`Failed to read file: ${e.message}`)}}),d.ipcMain.handle(`file-exists`,async(e,t)=>{try{return await _.default.promises.access(t),!0}catch{return!1}}),d.ipcMain.handle(`delete-file`,async(e,t)=>{try{return await _.default.promises.unlink(t),!0}catch{return!1}}),d.ipcMain.handle(`get-file-size`,async(e,t)=>{try{return(await _.default.promises.stat(t)).size}catch{return 0}});function t(e,t,...n){if(!(!e||e.isDestroyed()))try{e.webContents.send(t,...n)}catch{}}d.ipcMain.handle(`convert-to-mp4`,async(e,n,r,i)=>{k.info(`转换为 MP4`,n,`->`,r,i?`crop: ${i.width}x${i.height}`:``);let a=d.BrowserWindow.fromWebContents(e.sender);return ze(n,r,e=>{t(a,`on-conversion-progress`,e)},i)}),d.ipcMain.handle(`crop-video`,async(e,n,r,i)=>{k.info(`裁剪视频`,n,`->`,r,`crop: ${i.width}x${i.height}+${i.x}+${i.y}`);let a=d.BrowserWindow.fromWebContents(e.sender);return Be(n,r,i,e=>{t(a,`on-conversion-progress`,e)})}),d.ipcMain.handle(`convert-to-gif`,async(e,n,r,i)=>{k.info(`转换为 GIF`,n,`->`,r);let a=d.BrowserWindow.fromWebContents(e.sender);return He(n,r,i,e=>{t(a,`on-conversion-progress`,e)})}),d.ipcMain.handle(`merge-multi-screen`,async(e,n,r)=>{k.info(`合并多屏录制`,n.length,`个屏幕 ->`,r);let i=d.BrowserWindow.fromWebContents(e.sender);return Ve(n,r,e=>{t(i,`on-conversion-progress`,e)})}),d.ipcMain.handle(`open-file-location`,async(e,t)=>{d.shell.showItemInFolder(t)}),d.ipcMain.handle(`open-external`,async(e,t)=>{d.shell.openExternal(t)}),d.ipcMain.handle(`open-path`,async(e,t)=>{await d.shell.openPath(t)}),d.ipcMain.handle(`get-app-version`,async()=>d.app.getVersion()),d.ipcMain.handle(`get-screen-scale-factor`,async()=>d.screen.getPrimaryDisplay().scaleFactor),d.ipcMain.handle(`get-screen-bounds`,async()=>{let e=d.screen.getPrimaryDisplay(),t=e.scaleFactor;return{x:Math.round(e.bounds.x/t),y:Math.round(e.bounds.y/t),width:Math.round(e.bounds.width/t),height:Math.round(e.bounds.height/t)}}),d.ipcMain.handle(`take-screenshot`,async e=>{try{let e=await d.desktopCapturer.getSources({types:[`screen`],thumbnailSize:{width:0,height:0}});if(!e.length)throw Error(`未找到屏幕源`);let t=e[0].thumbnail.toPNG(),n=new Date,r=`截图_${n.getFullYear()}${String(n.getMonth()+1).padStart(2,`0`)}${String(n.getDate()).padStart(2,`0`)}_${String(n.getHours()).padStart(2,`0`)}${String(n.getMinutes()).padStart(2,`0`)}${String(n.getSeconds()).padStart(2,`0`)}.png`,i=(0,u.join)(d.app.getPath(`desktop`),r);return await _.default.promises.writeFile(i,t),(0,$t.showBalloon)(`二支录制`,`截图已保存到桌面：${r}`),{success:!0,filePath:i}}catch(e){return k.error(`截图失败`,e.message),{success:!1,error:e.message}}}),d.ipcMain.handle(`get-all-displays`,async()=>{let e=d.screen.getAllDisplays(),t=d.screen.getPrimaryDisplay(),n=await d.desktopCapturer.getSources({types:[`screen`],thumbnailSize:{width:340,height:200}});return e.map((e,r)=>{let i=n[r];return{id:e.id,label:e.id===t.id?`主屏幕`:`屏幕 ${r+1}`,bounds:e.bounds,scaleFactor:e.scaleFactor,size:{width:e.size.width,height:e.size.height},isPrimary:e.id===t.id,sourceId:i?.id||null,sourceName:i?.name||``,thumbnail:i?.thumbnail?.toDataURL()||``}})}),d.ipcMain.handle(`minimize-window`,async e=>{d.BrowserWindow.fromWebContents(e.sender)?.minimize()}),d.ipcMain.handle(`show-window`,async e=>{let t=d.BrowserWindow.fromWebContents(e.sender);t&&(t.show(),t.focus())}),d.ipcMain.handle(`maximize-window`,async e=>{let t=d.BrowserWindow.fromWebContents(e.sender);t?.isMaximized()?t.unmaximize():t?.maximize()}),d.ipcMain.handle(`close-window`,async e=>{let t=d.BrowserWindow.fromWebContents(e.sender);t&&t.hide()}),d.ipcMain.on(`notify-conversion-start`,()=>{(0,$t.showBalloon)(`二支录制`,`录制完成，正在转换视频格式...`)}),d.ipcMain.on(`show-about-window`,()=>{let e=d.BrowserWindow.getFocusedWindow();if(e){let t=new d.BrowserWindow({width:360,height:400,resizable:!1,skipTaskbar:!0,frame:!1,modal:!0,parent:e,backgroundColor:`#eaeaec`,webPreferences:{preload:(0,u.join)(__dirname,`..`,`preload`,`index.cjs`),contextIsolation:!0,nodeIntegration:!1,sandbox:!1}});d.ipcMain.on(`close-about-window`,()=>{t.close(),d.ipcMain.removeAllListeners(`close-about-window`)}),t.on(`closed`,()=>{d.ipcMain.removeAllListeners(`close-about-window`)});let n=process.env.VITE_DEV_SERVER_URL?`${process.env.VITE_DEV_SERVER_URL}about.html`:(0,u.join)(d.app.getAppPath(),`dist`,`about.html`);n.startsWith(`http`)?t.loadURL(n):t.loadFile(n)}}),d.ipcMain.on(`notify-conversion-done`,()=>{(0,$t.showBalloon)(`二支录制`,`视频转换完成！`)}),d.ipcMain.on(`update-audio-levels`,(e,t,n)=>{ur(t,n)}),d.ipcMain.handle(`load-recordings`,async()=>{let e=dr();try{let t=await _.default.promises.readFile(e,`utf-8`),n=JSON.parse(t);return k.info(`加载录制历史`,e,n.length,`条`),n}catch(t){return k.info(`加载录制历史失败（可能首次运行）`,e,t.message),[]}}),d.ipcMain.handle(`save-recordings`,async(e,t)=>{let n=dr();try{return await _.default.promises.writeFile(n,JSON.stringify(t),`utf-8`),k.info(`保存录制历史`,n,t.length,`条`),!0}catch(e){return k.error(`保存录制历史失败`,n,e.message),!1}}),e&&(e.setStateListener((e,t)=>{(e!==`idle`||t&&t.length>0)&&mt();let n=d.BrowserWindow.getAllWindows();for(let r of n)if(!r.isDestroyed())try{r.webContents.send(`agent-state-update`,{state:e,sessions:t})}catch{}}),e.setCardListener(e=>{e&&mt();let t;t=e?e.kind===`permission`?{kind:`permission`,sessionId:e.sessionId,toolName:e.toolName,toolInput:e.toolInput,suggestions:e.suggestions,createdAt:e.createdAt}:{kind:`question`,sessionId:e.sessionId,toolName:e.toolName,toolInput:e.toolInput,questions:e.questions,answerable:e.answerable,createdAt:e.createdAt}:null,k.info(`[IPC] broadcast card: kind=${e?e.kind:`null`}, wins=${d.BrowserWindow.getAllWindows().length}`);let n=d.BrowserWindow.getAllWindows();for(let e of n)if(!e.isDestroyed())try{e.webContents.send(`agent-card-update`,t)}catch(e){k.error(`[IPC] send card to window failed: ${e.message}`)}}),d.ipcMain.handle(`agent-get-status`,()=>{let t=e?.getStatus()??null;return k.info(`[IPC] agentGetStatus: sessionCount=${t?.sessionCount}, displayState=${t?.displayState}, serverRunning=${t?.serverRunning}`),t}),d.ipcMain.handle(`agent-install-hooks`,()=>(e?.installHooks(),e?.getStatus())),d.ipcMain.handle(`agent-uninstall-hooks`,()=>(e?.uninstallHooks(),e?.getStatus())),d.ipcMain.handle(`agent-resolve-permission`,(t,n)=>e?.resolvePermission(n)),d.ipcMain.handle(`agent-dismiss-question`,()=>e?.dismissQuestion()),d.ipcMain.handle(`agent-submit-question`,(t,n,r)=>e?.submitQuestion(n,r)),d.ipcMain.handle(`agent-set-auto-allow`,(t,n)=>e?.setAutoAllow(n)),d.ipcMain.handle(`agent-get-auto-allow`,()=>e?.getAutoAllow()??!1)),pr()}function pr(){d.ipcMain.handle(`todo-get`,()=>K()),d.ipcMain.handle(`todo-create`,(e,t)=>{let n=Sn(t);return q(),sr(),n}),d.ipcMain.handle(`todo-update`,(e,t,n)=>{let r=wn(t,n);return q(),sr(),r}),d.ipcMain.handle(`todo-delete`,(e,t)=>{let n=Tn(t);return q(),sr(),n}),d.ipcMain.handle(`todo-toggle-done`,(e,t)=>{let n=En(t);return q(),sr(),n}),d.ipcMain.handle(`todo-toggle-pin`,(e,t)=>{let n=On(t);return sr(),q(),n}),d.ipcMain.handle(`todo-show-window`,()=>{Rn()}),d.ipcMain.handle(`todo-close-window`,()=>{zn()}),d.ipcMain.handle(`todo-window-visible`,()=>Bn()),d.ipcMain.handle(`todo-toggle-always-on-top`,()=>Vn()),d.ipcMain.handle(`todo-get-settings`,()=>jn()),d.ipcMain.handle(`todo-set-settings`,(e,t)=>{let n=Mn(t);return q(),n}),d.ipcMain.on(`todo-reminder-close`,()=>{Xn()}),d.ipcMain.on(`todo-reminder-open`,()=>{Zn(),Rn()}),d.ipcMain.on(`todo-sticky-open`,(e,t)=>{Hn(t)}),d.ipcMain.on(`todo-sticky-unpin`,(e,t)=>{On(t),sr(),q(),Un(K())})}A();var mr=null;function hr(e){mr=e,d.globalShortcut.register(`CommandOrControl+Shift+R`,()=>{k.info(`Global shortcut: start/stop recording`),mr?.webContents.send(`on-global-shortcut`,`startStop`)}),d.globalShortcut.register(`CommandOrControl+Shift+P`,()=>{k.info(`Global shortcut: pause/resume recording`),mr?.webContents.send(`on-global-shortcut`,`pauseResume`)}),k.info(`Global shortcuts registered`)}function gr(){d.globalShortcut.unregisterAll()}A();var _r=`http://8.163.43.7:3000/report-ip`;function vr(){return(0,u.join)(d.app.getPath(`userData`),`pending-reports.json`)}function yr(e){let t=[];try{_.default.existsSync(vr())&&(t=JSON.parse(_.default.readFileSync(vr(),`utf-8`)))}catch{}t.push(e),_.default.writeFileSync(vr(),JSON.stringify(t,null,2),`utf-8`),k.info(`Saved offline report to local, total pending:`,t.length)}function br(){try{if(_.default.existsSync(vr()))return JSON.parse(_.default.readFileSync(vr(),`utf-8`))}catch{}return[]}function xr(){try{_.default.unlinkSync(vr())}catch{}}async function Sr(e){try{return await fetch(_r,{method:`POST`,headers:{"Content-Type":`application/json`},body:JSON.stringify(e)}),!0}catch{return!1}}async function Cr(){let e=br();if(e.length===0)return!0;let t=[];for(let n of e)await Sr(n)?k.info(`Flushed pending report:`,n.公网IP,n.上报时间):t.push(n);return t.length===0?(xr(),k.info(`All pending reports flushed`),!0):(_.default.writeFileSync(vr(),JSON.stringify(t,null,2),`utf-8`),!1)}async function wr(){let e=[async()=>{let e=(await fetch(`https://qifu.baidu.com/opus/api/ip/local`,{headers:{Referer:`https://www.baidu.com`}}).then(e=>e.json()))?.data;if(!e?.ip)throw Error(`empty`);return{公网IP:e.ip,国家:e.country||``,省份:e.province||``,城市:e.city||``,区县:e.district||e.area||``,详细地址:[e.country,e.province,e.city,e.district||e.area].filter(Boolean).join(``),运营商:e.isp||``}},async()=>{let e=await fetch(`http://whois.pconline.com.cn/ipJson.jsp`).then(e=>e.arrayBuffer()),t=new TextDecoder(`gbk`).decode(e),n=JSON.parse(t);if(!n.ip)throw Error(`empty`);return{公网IP:n.ip,国家:`中国`,省份:n.pro||``,城市:n.city||``,区县:n.region||``,详细地址:n.addr||``,运营商:n.addr?.split(` `)?.[1]||``}},async()=>{let e=await fetch(`http://ip-api.com/json/?lang=zh-CN`).then(e=>e.json());if(!e.query)throw Error(`empty`);return{公网IP:e.query,国家:e.country,省份:e.regionName,城市:e.city,区县:``,详细地址:`${e.country}${e.regionName}${e.city}`,运营商:e.isp,纬度:String(e.lat??``),经度:String(e.lon??``)}}];for(let t of e)try{return await t()}catch{continue}return{公网IP:``,国家:``,省份:``,城市:``,区县:``,详细地址:``,运营商:``}}function Tr(){let e=(0,b.networkInterfaces)();for(let t of Object.keys(e))for(let n of e[t])if(n.family===`IPv4`&&!n.internal)return n.address;return`127.0.0.1`}async function Er(){let e=Tr(),t={电脑名:(0,b.hostname)(),局域网IP:e,上报时间:new Date().toISOString()},n;try{n=await wr()}catch{n={公网IP:``,国家:``,省份:``,城市:``,区县:``,详细地址:``,运营商:``}}let r={...t,...n};await Sr(r)?(k.info(`IP reported:`,n.公网IP,n.省份,n.城市),Cr()):(k.info(`Network unavailable, saving report locally`),yr(r))}function Dr(){br().length>0&&Cr()}var Or={info:()=>{},warn:()=>{}};function kr(e){Or=e}var Ar={error:4,notification:3,working:2,thinking:1,idle:0},jr=600*1e3,Mr=300*1e3,Nr=10*1e3,Pr=2e3;function Fr(e={}){let t=e.isClaudeRunning,n=new Map,r=null,i=[],a=null,o=`idle`;function s(e){return i.push(e),()=>{i=i.filter(t=>t!==e)}}function c(){let e=d(),t=Array.from(n.values());e!==o&&(o=e);for(let e of i)e(o,t)}function l(e,t,r,i={}){a&&=(clearTimeout(a),null);let o=n.get(e),s={sessionId:e,agentId:i.agentId||`claude-code`,state:t,event:r,updatedAt:Date.now(),toolName:i.toolName||o?.toolName,toolInput:i.toolInput||o?.toolInput,contextUsage:i.contextUsage||o?.contextUsage,model:i.model||o?.model};n.set(e,s),Or.info(`[StateMachine] updateSession: id=${e}, state=${t}, event=${r}, total=${n.size}`),t===`idle`&&r===`Stop`&&(a=setTimeout(()=>{if(a=null,n.has(e)){let t=n.get(e);t.state=`idle`,t.updatedAt=Date.now()}Or.info(`[StateMachine] doneTimer fired for ${e}, total=${n.size}`),c()},Pr)),c()}function u(e){n.delete(e),c()}function d(){let e=`idle`;for(let[,t]of n)(Ar[t.state]??0)>(Ar[e]??0)&&(e=t.state);return a&&e===`idle`?`done`:e}function f(){return o}function p(){let e=[];for(let[,t]of n)e.push(t);return e}function m(){let e=Date.now(),r=t?t():null,i=!1;for(let[t,a]of n){let o=e-a.updatedAt;a.state===`idle`?o>jr&&(n.delete(t),Or.info(`[StateMachine] cleanStale: removed idle ${t} (age=${Math.round(o/1e3)}s)`),i=!0):r===!1?o>Mr&&(a.state=`idle`,a.updatedAt=e,Or.info(`[StateMachine] cleanStale: reset zombie ${t} to idle (age=${Math.round(o/1e3)}s, no claude running)`),i=!0):r===null&&o>Mr&&(a.state=`idle`,a.updatedAt=e,Or.info(`[StateMachine] cleanStale: reset ${t} to idle (age=${Math.round(o/1e3)}s, no liveness check)`),i=!0)}i&&c()}function h(){r||=setInterval(m,Nr)}function g(){r&&=(clearInterval(r),null),a&&=(clearTimeout(a),null)}return{updateSession:l,dismissSession:u,resolveDisplayState:d,getCurrentState:f,getSessions:p,subscribe:s,cleanStaleSessions:m,start:h,stop:g}}function Ir(e){return e==null?`null`:typeof e==`object`?Array.isArray(e)?`[`+e.map(Ir).join(`,`)+`]`:`{`+Object.keys(e).sort().map(t=>JSON.stringify(t)+`:`+Ir(e[t])).join(`,`)+`}`:JSON.stringify(e)}function Lr(e,t,n){let r=n?.tool_use_id||n?.toolUseId||null,i=n?.tool_name||n?.toolName||null,a=i!=null&&i!==``?Ir(n?.tool_input??n?.toolInput??null):null,o=-1,s=0;for(let n=0;n<e.length;n++){let c=e[n];if(c.kind===`permission`&&c.sessionId===t){if(r&&c.toolUseId&&c.toolUseId===r)return n;if(i!=null&&c.toolName===i){if(a!=null&&Ir(c.toolInput??null)===a)return n;o===-1&&(o=n),s++}}}return s===1?o:-1}A();var Rr=6e4,zr=60019,Br=12e4,Vr=null;function Hr(){return Vr||(Vr=f.join(require(`os`).homedir(),`.erzhi-recording`),Vr)}function Ur(e){let t=null,n=null,r=[],i=null,a=null,o=[`PostToolUse`,`PostToolUseFailure`,`Stop`,`StopFailure`,`SessionEnd`,`ApiError`],s=[`PostToolUse`,`PostToolUseFailure`,`PermissionDenied`],c=[`Stop`,`StopFailure`,`SessionEnd`];class l extends Error{code=`PAYLOAD_TOO_LARGE`}function u(e){return new Promise((t,n)=>{let r=``;e.on(`data`,t=>{if(r+=t,Buffer.byteLength(r)>1048576){try{e.destroy()}catch{}n(new l(`Body exceeds 1MB limit`))}}),e.on(`end`,()=>{try{t(JSON.parse(r))}catch{n(Error(`Invalid JSON`))}}),e.on(`error`,n)})}function d(e,t,n){e.writeHead(t,{"Content-Type":`application/json`}),e.end(JSON.stringify(n))}function p(e,t){try{!e.headersSent&&!e.destroyed&&!e.writableEnded&&(e.writeHead(200,{"Content-Type":`application/json`}),e.end(t))}catch{}}function m(){return r[0]??null}function _(e){let t=m();t&&((t.kind===`permission`||t.answerable)&&t.reject(e),v())}function v(){r.shift(),clearTimeout(i),i=null,y(),b()}function y(){if(i&&clearTimeout(i),!r.length){i=null;return}i=setTimeout(()=>{i=null,_(`timeout`)},Br)}function b(){a&&a(m())}function x(e){let t=r.length,n=[],a=r.filter(t=>t.kind===`question`&&t.sessionId===e?(n.push(t),!1):!0);if(a.length!==t){r=a;for(let e of n)e.kind===`question`&&e.answerable&&e.reject(`completed`);clearTimeout(i),i=null,y(),b()}}function S(e,t){let n=Lr(r,e,t);if(n===-1)return;let[a]=r.splice(n,1);a.reject(`resolved-in-cli`),clearTimeout(i),i=null,y(),b(),k.info(`[AgentServer] permission resolved externally (CLI): session=${e}, tool=${a.toolName}`)}function C(e){let t=r.length,n=[],a=r.filter(t=>t.kind===`permission`&&t.sessionId===e?(n.push(t),!1):!0);if(a.length!==t){r=a;for(let e of n)e.reject(`completed`);clearTimeout(i),i=null,y(),b(),k.info(`[AgentServer] permissions cleared for ended session=${e}, count=${n.length}`)}}function ee(t,n){let r=t.session_id||t.sessionId,i=t.state,a=t.event;if(k.info(`[AgentServer] /state received: session=${r}, state=${i}, event=${a}, tool=${t.tool_name||t.toolName}`),!r||!i||!a){k.warn(`[AgentServer] /state rejected: missing fields (sessionId=${r}, state=${i}, event=${a})`),d(n,400,{error:`Missing required fields: session_id, state, event`});return}e.updateSession(r,i,a,{agentId:t.agent_id||`claude-code`,toolName:t.tool_name||t.toolName,toolInput:t.tool_input||t.toolInput,contextUsage:t.context_usage||t.contextUsage,model:t.model}),o.includes(a)&&x(r),c.includes(a)&&C(r),s.includes(a)&&S(r,t),k.info(`[AgentServer] /state ok, total sessions=${e.getSessions().length}`),d(n,200,{ok:!0,app:`erzhi-recording`})}function te(t,n){let i=t.tool_name||t.toolName||`unknown`,a=t.tool_input||t.toolInput||{},o=t.session_id||t.sessionId||`unknown`;if(i===`AskUserQuestion`){ne(n,o,a);return}e.updateSession(o,`notification`,`PermissionRequest`,{toolName:i,toolInput:a});let s=t.tool_use_id||t.toolUseId||null,c={kind:`permission`,sessionId:o,toolName:i,toolInput:a,suggestions:t.permission_suggestions||null,toolUseId:s,resolve:()=>{},reject:()=>{},createdAt:Date.now()};new Promise((e,t)=>{c.resolve=e,c.reject=t}).then(t=>{e.updateSession(o,`idle`,`PermissionResolved`);let r=t===`always`?`allow`:t,i=JSON.stringify({hookSpecificOutput:{hookEventName:`PermissionRequest`,decision:{behavior:r}}});k.info(`[AgentServer] /permission resolved: behavior=${t} -> ${r}`),p(n,i)}).catch(t=>{e.updateSession(o,`idle`,`PermissionCancelled`);let r=JSON.stringify({hookSpecificOutput:{hookEventName:`PermissionRequest`,decision:{behavior:`cancel`}}});k.info(`[AgentServer] /permission cancelled: ${t}`),p(n,r)}),r.push(c),r.length===1&&y(),b(),k.info(`[AgentServer] /permission queued: session=${o}, queue=${r.length}`)}function ne(t,n,i){let a=Array.isArray(i&&i.questions)&&i.questions||null;e.updateSession(n,`notification`,`AskUserQuestion`,{toolName:`AskUserQuestion`,toolInput:i});let o={kind:`question`,sessionId:n,toolName:`AskUserQuestion`,toolInput:i,questions:a,answerable:!0,resolve:()=>{},reject:()=>{},createdAt:Date.now()};new Promise((e,t)=>{o.resolve=e,o.reject=t}).then(r=>{e.updateSession(n,`idle`,`QuestionAnswered`);let i=JSON.stringify({hookSpecificOutput:{hookEventName:`PermissionRequest`,decision:{behavior:`allow`,updatedInput:{questions:a,answers:r}}}});k.info(`[AgentServer] AskUserQuestion answered via /permission: session=${n}`),p(t,i)}).catch(r=>{e.updateSession(n,`idle`,`QuestionDenied`);let i=JSON.stringify({hookSpecificOutput:{hookEventName:`PermissionRequest`,decision:{behavior:`deny`}}});k.info(`[AgentServer] AskUserQuestion denied: reason=${r}, session=${n}`),p(t,i)}),r.push(o),r.length===1&&y(),b(),k.info(`[AgentServer] AskUserQuestion (answerable) queued: session=${n}, queue=${r.length}`)}function w(t,n){let r=t.session_id||t.sessionId||`unknown`,i=t.tool_name||t.toolName||`AskUserQuestion`,a=t.tool_input||t.toolInput||{};e.updateSession(r,`notification`,`AskUserQuestion`,{toolName:i,toolInput:a}),k.info(`[AgentServer] /question notified (read-only card removed): session=${r}`),d(n,200,{ok:!0,app:`erzhi-recording`})}function T(t){let r=e.getSessions().length;d(t,200,{ok:!0,app:`erzhi-recording`,port:n,sessionCount:r})}function re(e,t){t.setHeader(`Access-Control-Allow-Origin`,`*`),k.info(`[AgentServer] ${e.method} ${e.url}`),e.method===`POST`&&e.url===`/state`?u(e).then(e=>ee(e,t)).catch(e=>{k.error(`[AgentServer] parseBody error:`,e),d(t,e?.code===`PAYLOAD_TOO_LARGE`?413:400,{error:e?.code===`PAYLOAD_TOO_LARGE`?`Payload too large`:`Invalid JSON`})}):e.method===`POST`&&e.url===`/permission`?u(e).then(e=>te(e,t)).catch(e=>{k.error(`[AgentServer] parseBody error:`,e),d(t,e?.code===`PAYLOAD_TOO_LARGE`?413:400,{error:e?.code===`PAYLOAD_TOO_LARGE`?`Payload too large`:`Invalid JSON`})}):e.method===`POST`&&e.url===`/question`?u(e).then(e=>w(e,t)).catch(e=>{k.error(`[AgentServer] parseBody error:`,e),d(t,e?.code===`PAYLOAD_TOO_LARGE`?413:400,{error:e?.code===`PAYLOAD_TOO_LARGE`?`Payload too large`:`Invalid JSON`})}):e.method===`GET`&&e.url===`/health`?T(t):d(t,404,{error:`Not found`})}function E(e){let t=m();t&&t.kind===`permission`&&(t.resolve(e),v())}function ie(){let e=m();e&&e.kind===`question`&&(e.answerable&&e.reject(`dismissed`),v())}function ae(e,t){let n=m();n&&n.kind===`question`&&n.answerable&&n.sessionId===e?(n.resolve(t),v(),k.info(`[AgentServer] submitQuestion accepted: session=${e}`)):k.warn(`[AgentServer] submitQuestion ignored: no matching answerable head for session=${e}`)}function oe(e){a=e}function se(){let e=m();return e?e.kind===`permission`?{kind:`permission`,sessionId:e.sessionId,toolName:e.toolName,toolInput:e.toolInput,suggestions:e.suggestions,createdAt:e.createdAt}:{kind:`question`,sessionId:e.sessionId,toolName:e.toolName,toolInput:e.toolInput,questions:e.questions,answerable:e.answerable,createdAt:e.createdAt}:null}function D(){return new Promise(e=>{let r=Rr,i=null;function a(){if(r>zr){k.error(`Agent server: all ports ${Rr}-${zr} occupied`),e(null);return}i=g.createServer(re),i.on(`error`,t=>{t.code===`EADDRINUSE`?(r++,a()):(k.error(`Agent server error:`,t.message),e(null))}),i.listen(r,`127.0.0.1`,()=>{n=r,t=i;try{let e=Hr();h.mkdirSync(e,{recursive:!0}),h.writeFileSync(f.join(e,`runtime.json`),JSON.stringify({port:r,pid:process.pid}),`utf8`)}catch{}k.info(`Agent server listening on 127.0.0.1:${r}`),e(r)})}a()})}function O(){for(let e of r)e.kind===`permission`&&e.reject(`stopped`);r=[],clearTimeout(i),i=null,a&&a(null),t&&=(t.close(),null),n=null}function ce(){return n}return{start:D,stop:O,getPort:ce,getSafeCurrentCard:se,resolvePendingPermission:E,dismissQuestion:ie,submitQuestion:ae,setOnCardChange:oe}}A();var Wr=f.join(m.homedir(),`.claude`,`settings.json`),Gr=300*1e3,Kr=3,qr=[`SessionStart`,`SessionEnd`,`UserPromptSubmit`,`PreToolUse`,`PostToolUse`,`PostToolUseFailure`,`Stop`,`StopFailure`,`ApiError`,`Notification`,`PermissionRequest`];function Jr(e){let t=null,n=0,r=!1;function i(){try{if(require(`electron`)?.app?.isPackaged)return f.join(process.resourcesPath,`clawd-hook.js`)}catch{}return f.join(__dirname,`clawd-hook.js`)}function a(){try{let{execSync:e}=require(`child_process`),t=e(`where node`,{encoding:`utf8`}).trim().split(`
`)[0];if(t)return t}catch{}return process.execPath.replace(`electron.exe`,`node.exe`)}function o(){try{let e=h.readFileSync(Wr,`utf8`);return JSON.parse(e)}catch{return null}}function s(e){try{return h.writeFileSync(Wr,JSON.stringify(e,null,2),`utf8`),!0}catch(e){return k.error(`Failed to write Claude settings:`,e.message),!1}}function c(e,t){return{command:`& "${a()}" "${t}" ${e}`,shell:`powershell`}}function l(e){let t=e.hooks;return!t||!Array.isArray(t)?!1:t.some(e=>e.name&&e.events&&Array.isArray(e.events))}function u(e){return l(e)?(e.hooks=(e.hooks||[]).filter(e=>!e.name?.startsWith(`erzhi-recording`)),!0):!1}function d(){let t=o();if(!t)return{added:!1,updated:!1};let n=i(),r=t.hooks||{};if(u(t),e(),qr.every(e=>(r[e]||[]).some(t=>t.hooks?.some(t=>e===`PermissionRequest`?t.type===`http`&&t.url?.includes(`/permission`):t.type===`command`&&t.command?.startsWith(`&`)&&t.command?.includes(`clawd-hook.js`)&&t.shell===`powershell`))))return{added:!1,updated:!1};for(let t of qr){let i;if(t===`PermissionRequest`)i={type:`http`,url:`http://127.0.0.1:${e()||6e4}/permission`,timeout:600};else{let{command:e,shell:r}=c(t,n);i={type:`command`,command:e,shell:r,async:!0,timeout:5}}r[t]=[{matcher:``,hooks:[i]}]}return t.hooks=r,s(t),{added:!0,updated:!1}}function p(){let e=o();if(!e)return{removed:!1};let t=!1;if(l(e)){let n=e.hooks.length;e.hooks=e.hooks.filter(e=>!e.name?.startsWith(`erzhi-recording`)),e.hooks.length<n&&(t=!0)}let n=e.hooks||{};for(let e of qr)if(n[e]){let r=n[e].length;n[e]=n[e].filter(e=>!e.hooks?.some(e=>e.command?.includes(`clawd-hook.js`))),n[e].length===0?delete n[e]:n[e].length<r&&(t=!0)}return e.hooks=n,s(e),{removed:t}}function m(){let e=o();return e?((e.hooks||{})[qr[0]]||[]).some(e=>e.hooks?.some(e=>e.command?.includes(`clawd-hook.js`))):!1}function g(){let e=[];if(!o())return e.push(`Claude settings file not found`),{healthy:!1,issues:e};if(!m())return e.push(`Hook entry missing`),{healthy:!1,issues:e};let t=i();return h.existsSync(t)?{healthy:e.length===0,issues:e}:(e.push(`Hook script file missing`),{healthy:!1,issues:e})}function _(){if(r)return!1;if(n>=Kr)return r=!0,!1;let e=d();return(e.added||e.updated)&&g().healthy?(n=0,!0):(n++,!1)}function v(){let e=g();e.healthy?(n>0&&(n=0),r&&=!1):(k.warn(`Claude hook health check failed:`,e.issues.join(`, `)),_())}function y(){t||(v(),t=setInterval(v,Gr),k.info(`Claude hook watcher started`))}function b(){t&&=(clearInterval(t),null)}function x(){let e=g();return{installed:m(),scriptExists:h.existsSync(i()),claudeExists:o()!==null,healthy:e.healthy,repairFailures:n,manualFixRequired:r}}return{install:d,uninstall:p,isInstalled:m,startWatcher:y,stopWatcher:b,getStatus:x,checkHealth:g,repair:_}}var Yr={info:()=>{},warn:()=>{}},Xr=1e4;function Zr(e,t=Xr){let n=new Map;for(let t of e)n.set(t.id,{id:t.id,nameKey:t.nameKey,running:!1,approval:t.approval,working:!1,sessions:[],lastProbed:0,error:!1});let r=null;function i(){for(let t of e){let e=n.get(t.id);try{let n=t.probeRunning(),r=t.fetchSessions();e.running=n,e.sessions=r,e.working=n&&r.some(e=>e.state!==`idle`),e.lastProbed=Date.now(),e.error=!1,Yr.info(`[ToolRegistry] ${t.id} probed: running=${n}, sessions=${r.length}, working=${e.working}`)}catch(n){e.error=!0,e.lastProbed=Date.now(),Yr.warn(`[ToolRegistry] ${t.id} probe failed:`,n?.message??n)}}}function a(){r||=(i(),setInterval(i,t))}function o(){r&&=(clearInterval(r),null)}function s(){return Array.from(n.values())}return{start:a,stop:o,pollOnce:i,getStatus:s}}var Qr=3e4,$r=300*1e3,ei=5,ti=null,ni=0;function ri(){return process.env.CODEX_HOME??(0,u.join)(b.default.homedir(),`.codex`,`sessions`)}function ii(){let e=Date.now();if(ti!==null&&e-ni<Qr)return ti;try{ti=(0,p.execSync)(`tasklist /NH /FI "IMAGENAME eq codex.exe"`,{encoding:`utf8`,timeout:2e3}).includes(`codex.exe`)}catch{ti=!1}return ni=e,ti}function ai(e){try{let t=_.default.readFileSync(e,`utf8`).split(`
`).find(e=>e.trim());if(!t)return``;let n=JSON.parse(t)?.content;return(Array.isArray(n)?n.map(e=>typeof e==`string`?e:e?.text||``).filter(Boolean).join(` `):typeof n==`string`?n:``).trim().slice(0,40)||``}catch{return``}}function oi(){return{id:`codex`,nameKey:`tools.codex`,approval:`none`,probeRunning:ii,fetchSessions(){let e=ri(),t;try{t=_.default.readdirSync(e).filter(e=>e.endsWith(`.jsonl`))}catch{return[]}let n=Date.now(),r=t.map(t=>({file:(0,u.join)(e,t),mtime:_.default.statSync((0,u.join)(e,t),{throwIfNoEntry:!1})?.mtimeMs??0})).filter(e=>e.mtime>0).sort((e,t)=>t.mtime-e.mtime).slice(0,ei);if(r.length===0)return[];let i=ii();return r.map(e=>{let t=e.file.split(/[\\/]/).pop().replace(/\.jsonl$/,``),r=i&&n-e.mtime<$r;return{sessionId:`codex:${t}`,agentId:`codex`,state:r?`working`:`idle`,updatedAt:Math.round(e.mtime),label:ai(e.file)}})}}}A();var si=`agent-settings.json`,ci={autoAllow:!1};function li(){let{app:e}=require(`electron`);return(0,u.join)(e.isPackaged?e.getPath(`userData`):(0,u.join)(__dirname,`..`,`..`),si)}function ui(){try{let e=_.default.readFileSync(li(),`utf-8`),t=JSON.parse(e);return{autoAllow:typeof t.autoAllow==`boolean`?t.autoAllow:ci.autoAllow}}catch{}return{...ci}}function di(e){try{_.default.writeFileSync(li(),JSON.stringify(e),`utf-8`)}catch(e){k.warn(`[AgentBridge] save agent settings failed:`,e?.message??e)}}function fi(e={}){let t=null,n=0;function r(){let e=Date.now();if(t!==null&&e-n<3e4)return t;try{let{execSync:e}=require(`child_process`);t=e(`tasklist /NH /FI "IMAGENAME eq claude.exe"`,{encoding:`utf8`,timeout:2e3}).includes(`claude.exe`)}catch{t=!1}return n=e,t}let i=Fr({isClaudeRunning:r}),a=Ur(i),o=Jr(()=>a.getPort()),s=Zr([oi()]),c=null,l=null,u=ui().autoAllow;i.subscribe((e,t)=>{c&&c(e,t)}),a.setOnCardChange(e=>{if(u&&e&&e.kind===`permission`){k.info(`[AgentBridge] auto-allow permission: tool=${e.toolName}`),a.resolvePendingPermission(`allow`);return}l&&l(e)});async function d(){if(i.start(),s.start(),await a.start()!==null){if(e.autoInstallHooks!==!1){let e=o.install();e.added&&k.info(`Claude Code hooks installed`),e.updated&&k.info(`Claude Code hooks updated`)}e.autoStartWatcher!==!1&&o.isInstalled()&&o.startWatcher()}}function f(){o.stopWatcher(),s.stop(),i.stop(),a.stop()}function p(){return a}function m(){return i}function h(){return o}function g(e){c=e}function _(e){l=e}function v(e){a.resolvePendingPermission(e)}function y(){a.dismissQuestion()}function b(e,t){a.submitQuestion(e,t)}function x(){o.install()}function S(){o.uninstall()}function C(e){u=e,di({autoAllow:u}),k.info(`[AgentBridge] autoAllow=${e} (persisted)`)}function ee(){return u}function te(){let e=i.getSessions(),t=e.length,n=i.getCurrentState(),c=e.map(e=>e.sessionId).join(`,`);k.info(`[AgentBridge] getStatus: real_count=${t}, ids=[${c}], display=${n}`);let l=i.getSessions().length,u=r();return{serverRunning:a.getPort()!==null,port:a.getPort(),hookInstalled:o.isInstalled(),hookManagerStatus:o.getStatus(),displayState:n,currentCard:a.getSafeCurrentCard(),sessionCount:l,claudeRunning:u,tools:[{id:`claude-code`,nameKey:`tools.claudeCode`,running:u,approval:`hook`,working:n!==`idle`,sessions:e.map(e=>({sessionId:e.sessionId,label:e.toolName||``})),error:!1,lastProbed:0},...s.getStatus()]}}return{start:d,stop:f,getServer:p,getStateMachine:m,getHookManager:h,getStatus:te,setStateListener:g,setCardListener:_,resolvePermission:v,dismissQuestion:y,submitQuestion:b,installHooks:x,uninstallHooks:S,setAutoAllow:C,getAutoAllow:ee}}var pi=`local-video`;function mi(){d.protocol.registerSchemesAsPrivileged([{scheme:pi,privileges:{standard:!0,secure:!0,supportFetchAPI:!0,stream:!0}}])}function hi(){d.protocol.handle(pi,e=>{let t=new URL(e.url),n=decodeURIComponent(t.pathname).replace(/^\//,``),r=e.headers.get(`range`),i=0;try{i=(0,_.statSync)(n).size}catch{return new Response(`File not found: `+n,{status:404})}let a=(0,u.extname)(n).toLowerCase(),o=a===`.mp4`?`video/mp4`:a===`.webm`?`video/webm`:`application/octet-stream`;if(r){let e=/bytes=(\d*)-(\d*)/.exec(r),t=e&&e[1]?parseInt(e[1],10):0,a=e&&e[2]?parseInt(e[2],10):i-1,s=Math.min(a,i-1),c=(0,_.createReadStream)(n,{start:t,end:s});return new Response(ee.Readable.toWeb(c),{status:206,headers:{"Content-Range":`bytes ${t}-${s}/${i}`,"Accept-Ranges":`bytes`,"Content-Length":String(s-t+1),"Content-Type":o}})}let s=(0,_.createReadStream)(n);return new Response(ee.Readable.toWeb(s),{status:200,headers:{"Content-Length":String(i),"Content-Type":o,"Accept-Ranges":`bytes`}})})}function gi(e,t){let n=new Date(t).toISOString();return e.filter(e=>!!e.reminder&&!e.reminderFired&&!(e.type===`todo`&&e.done)&&e.reminder<=n)}A();var _i=3e4,vi=null;function yi(){let e=gi(K(),Date.now());if(e.length!==0){for(let t of e){let e=Qn(t.content).trim();qn(t.type===`memo`&&Qn(t.title).trim()?Qn(t.title).trim():e.slice(0,24),e.slice(0,90)),Dn(t.id)}Bn()||Pn(!0)}}function bi(){vi||(yi(),vi=setInterval(yi,_i),k.info(`Todo reminder scheduler started`))}function xi(){vi&&=(clearInterval(vi),null),k.info(`Todo reminder scheduler stopped`)}A(),P(),mi();var Z=null,Q=null,$=null,Si=null,Ci=null,wi=process.env.VITE_DEV_SERVER_URL;function Ti(){let e=d.app.isPackaged?(0,u.join)(process.resourcesPath,`logo.ico`):(0,u.join)(__dirname,`../../public/logo.ico`);return d.nativeImage.createFromPath(e)}function Ei(e){Z=new d.BrowserWindow({icon:Ti(),width:550,height:420,minWidth:420,minHeight:340,show:!1,skipTaskbar:!1,frame:!1,titleBarStyle:`hidden`,title:`二支录制`,backgroundColor:`#eaeaec`,webPreferences:{preload:e,contextIsolation:!0,nodeIntegration:!1,sandbox:!1,backgroundThrottling:!1}}),wi?Z.loadURL(wi):Z.loadFile((0,u.join)(process.env.DIST,`index.html`)),Z.on(`close`,e=>{d.app.isQuitting||(e.preventDefault(),Z?.hide())})}d.app.on(`gpu-process-crashed`,(e,t)=>{k.error(`GPU process crashed:`,JSON.stringify(t))}),d.app.whenReady().then(()=>{process.env.DIST=(0,u.join)(__dirname,`../../dist`),process.env.VITE_PUBLIC=d.app.isPackaged?process.env.DIST:(0,u.join)(__dirname,`../../public`),hi(),xe(),k.info(`App starting...`),Ee(k),Ne(k),kr(k),We(U().locale);let e=(0,u.join)(__dirname,`..`,`preload`,`index.cjs`);try{d.session.defaultSession.clearCache()}catch(e){k.warn(`clearCache() failed:`,e)}Si=fi({autoInstallHooks:!0,autoStartWatcher:!0}),Si.start().catch(e=>{k.error(`Agent bridge start failed:`,e?.message??e)}),fr(Si),Ei(e),(0,Ze.setMainWindow)(Z),(0,$t.createTray)(),hr(Z),Ft(),Er(),In(),bi(),q(),sr();try{let e=U();d.app.setLoginItemSettings({openAtLogin:e.openAtLogin})}catch(e){k.error(`Sync openAtLogin on startup failed:`,e)}d.ipcMain.handle(`show-ai-window`,()=>{Di()}),d.ipcMain.handle(`show-settings-window`,()=>{Oi()}),d.ipcMain.handle(`get-app-i18n`,()=>Ke()),d.ipcMain.handle(`show-main-window`,()=>{Z&&!Z.isDestroyed()&&(Z.show(),Z.focus())}),process.on(`clawd-show-record-window`,()=>{Z&&!Z.isDestroyed()&&(Z.show(),Z.focus())}),process.on(`clawd-show-ai-window`,()=>{Di()}),process.on(`clawd-show-settings-window`,()=>{Oi()}),process.on(`clawd-show-todo-window`,()=>{Rn()}),process.on(`clawd-show-music-window`,()=>{ln()}),Ci=setInterval(Dr,3e4),d.app.on(`activate`,()=>{d.BrowserWindow.getAllWindows().length===0&&Ei(e)})}),d.app.on(`window-all-closed`,()=>{}),d.app.on(`before-quit`,()=>{d.app.isQuitting=!0;for(let e of d.BrowserWindow.getAllWindows())if(!e.isDestroyed())try{e.webContents.send(`app-before-quit`)}catch{}(0,Ze.hideRegionBorder)(),(0,Ze.hideFloatingIsland)(),(0,Ze.hideCameraPreview)(),Bt(),Si?.stop(),ht(),De(),xi(),zn(),Xn(),lr(),un(),gr(),(0,$t.destroyTray)(),Ci&&=(clearInterval(Ci),null),Z=null,Q=null,$=null});function Di(){if(Q&&!Q.isDestroyed()){Q.show(),Q.focus();return}let e=process.env.VITE_DEV_SERVER_URL,t=(0,u.join)(__dirname,`..`,`preload`,`index.cjs`);Q=new d.BrowserWindow({icon:Ti(),width:480,height:540,minWidth:400,minHeight:400,show:!1,skipTaskbar:!1,frame:!1,titleBarStyle:`hidden`,title:`AI 助手`,backgroundColor:`#eaeaec`,webPreferences:{preload:t,contextIsolation:!0,nodeIntegration:!1,sandbox:!1}}),e?Q.loadURL(`${e}#/ai?t=${Date.now()}`):Q.loadFile((0,u.join)(process.env.DIST,`index.html`),{hash:`/ai`}),Q.once(`ready-to-show`,()=>{Q?.show()}),Q.on(`closed`,()=>{Q=null})}function Oi(){if($&&!$.isDestroyed()){$.show(),$.focus();return}let e=(0,u.join)(__dirname,`..`,`preload`,`index.cjs`);$=new d.BrowserWindow({icon:Ti(),width:420,height:480,minWidth:380,minHeight:420,show:!1,skipTaskbar:!1,frame:!1,titleBarStyle:`hidden`,title:`设置`,backgroundColor:`#eaeaec`,webPreferences:{preload:e,contextIsolation:!0,nodeIntegration:!1,sandbox:!1}}),wi?$.loadURL(`${wi}#/settings?t=${Date.now()}`):$.loadFile((0,u.join)(process.env.DIST,`index.html`),{hash:`/settings`}),$.once(`ready-to-show`,()=>{$?.show()}),$.on(`closed`,()=>{$=null})}