var e=Object.create,t=Object.defineProperty,n=Object.getOwnPropertyDescriptor,r=Object.getOwnPropertyNames,i=Object.getPrototypeOf,a=Object.prototype.hasOwnProperty,o=(e,t)=>()=>(e&&(t=e(e=0)),t),s=(e,t)=>()=>(t||(e((t={exports:{}}).exports,t),e=null),t.exports),c=(e,i,o,s)=>{if(i&&typeof i==`object`||typeof i==`function`)for(var c=r(i),l=0,u=c.length,d;l<u;l++)d=c[l],!a.call(e,d)&&d!==o&&t(e,d,{get:(e=>i[e]).bind(null,d),enumerable:!(s=n(i,d))||s.enumerable});return e},l=(n,r,a)=>(a=n==null?{}:e(i(n)),c(r||!n||!n.__esModule?t(a,`default`,{value:n,enumerable:!0}):a,n));let u=require(`node:path`);u=l(u);let d=require(`electron`),f=require(`path`);f=l(f),require(`child_process`);let p=require(`os`);p=l(p);let m=require(`fs`);m=l(m);let h=require(`http`);h=l(h);let g=require(`node:fs`);g=l(g);let _=require(`fluent-ffmpeg`);_=l(_);let v=require(`@ffmpeg-installer/ffmpeg`);v=l(v);let y=require(`node:os`);y=l(y);let b=require(`node:crypto`),x=require(`node:child_process`),S=require(`node:util`),C=require(`node:stream`);var ee=s(((e,t)=>{var n=require(`fs`),r=require(`path`);t.exports={findAndReadPackageJson:i,tryReadJsonAt:a};function i(){return a(c())||a(s())||a(process.resourcesPath,`app.asar`)||a(process.resourcesPath,`app`)||a(process.cwd())||{name:void 0,version:void 0}}function a(...e){if(e[0])try{let t=o(`package.json`,r.join(...e));if(!t)return;let i=JSON.parse(n.readFileSync(t,`utf8`)),a=i?.productName||i?.name;return!a||a.toLowerCase()===`electron`?void 0:a?{name:a,version:i?.version}:void 0}catch{return}}function o(e,t){let i=t;for(;;){let t=r.parse(i),a=t.root,o=t.dir;if(n.existsSync(r.join(i,e)))return r.resolve(r.join(i,e));if(i===a)return null;i=o}}function s(){let e=process.argv.filter(e=>e.indexOf(`--user-data-dir=`)===0);return e.length===0||typeof e[0]!=`string`?null:e[0].replace(`--user-data-dir=`,``)}function c(){try{return require.main?.filename}catch{return}}})),te=s(((e,t)=>{var n=require(`child_process`),r=require(`os`),i=require(`path`),a=ee();t.exports=class{appName=void 0;appPackageJson=void 0;platform=process.platform;getAppLogPath(e=this.getAppName()){return this.platform===`darwin`?i.join(this.getSystemPathHome(),`Library/Logs`,e):i.join(this.getAppUserDataPath(e),`logs`)}getAppName(){let e=this.appName||this.getAppPackageJson()?.name;if(!e)throw Error(`electron-log can't determine the app name. It tried these methods:
1. Use \`electron.app.name\`
2. Use productName or name from the nearest package.json\`
You can also set it through log.transports.file.setAppName()`);return e}getAppPackageJson(){return typeof this.appPackageJson!=`object`&&(this.appPackageJson=a.findAndReadPackageJson()),this.appPackageJson}getAppUserDataPath(e=this.getAppName()){return e?i.join(this.getSystemPathAppData(),e):void 0}getAppVersion(){return this.getAppPackageJson()?.version}getElectronLogPath(){return this.getAppLogPath()}getMacOsVersion(){let e=Number(r.release().split(`.`)[0]);return e<=19?`10.${e-4}`:e-9}getOsVersion(){let e=r.type().replace(`_`,` `),t=r.release();return e===`Darwin`&&(e=`macOS`,t=this.getMacOsVersion()),`${e} ${t}`}getPathVariables(){let e=this.getAppName(),t=this.getAppVersion(),n=this;return{appData:this.getSystemPathAppData(),appName:e,appVersion:t,get electronDefaultDir(){return n.getElectronLogPath()},home:this.getSystemPathHome(),libraryDefaultDir:this.getAppLogPath(e),libraryTemplate:this.getAppLogPath(`{appName}`),temp:this.getSystemPathTemp(),userData:this.getAppUserDataPath(e)}}getSystemPathAppData(){let e=this.getSystemPathHome();switch(this.platform){case`darwin`:return i.join(e,`Library/Application Support`);case`win32`:return process.env.APPDATA||i.join(e,`AppData/Roaming`);default:return process.env.XDG_CONFIG_HOME||i.join(e,`.config`)}}getSystemPathHome(){return r.homedir?.()||process.env.HOME}getSystemPathTemp(){return r.tmpdir()}getVersions(){return{app:`${this.getAppName()} ${this.getAppVersion()}`,electron:void 0,os:this.getOsVersion()}}isDev(){return process.env.NODE_ENV===`development`||process.env.ELECTRON_IS_DEV===`1`}isElectron(){return!!process.versions.electron}onAppEvent(e,t){}onAppReady(e){e()}onEveryWebContentsEvent(e,t){}onIpc(e,t){}onIpcInvoke(e,t){}openUrl(e,t=console.error){let r={darwin:`open`,win32:`start`,linux:`xdg-open`}[process.platform]||`xdg-open`;n.exec(`${r} ${e}`,{},e=>{e&&t(e)})}setAppName(e){this.appName=e}setPlatform(e){this.platform=e}setPreloadFileForSessions({filePath:e,includeFutureSession:t=!0,getSessions:n=()=>[]}){}sendIpc(e,t){}showErrorBox(e,t){}}})),w=s(((e,t)=>{var n=require(`path`),r=te();t.exports=class extends r{electron=void 0;constructor({electron:e}={}){super(),this.electron=e}getAppName(){let e;try{e=this.appName||this.electron.app?.name||this.electron.app?.getName()}catch{}return e||super.getAppName()}getAppUserDataPath(e){return this.getPath(`userData`)||super.getAppUserDataPath(e)}getAppVersion(){let e;try{e=this.electron.app?.getVersion()}catch{}return e||super.getAppVersion()}getElectronLogPath(){return this.getPath(`logs`)||super.getElectronLogPath()}getPath(e){try{return this.electron.app?.getPath(e)}catch{return}}getVersions(){return{app:`${this.getAppName()} ${this.getAppVersion()}`,electron:`Electron ${process.versions.electron}`,os:this.getOsVersion()}}getSystemPathAppData(){return this.getPath(`appData`)||super.getSystemPathAppData()}isDev(){return this.electron.app?.isPackaged===void 0?typeof process.execPath==`string`?n.basename(process.execPath).toLowerCase().startsWith(`electron`):super.isDev():!this.electron.app.isPackaged}onAppEvent(e,t){return this.electron.app?.on(e,t),()=>{this.electron.app?.off(e,t)}}onAppReady(e){this.electron.app?.isReady()?e():this.electron.app?.once?this.electron.app?.once(`ready`,e):e()}onEveryWebContentsEvent(e,t){return this.electron.webContents?.getAllWebContents()?.forEach(n=>{n.on(e,t)}),this.electron.app?.on(`web-contents-created`,n),()=>{this.electron.webContents?.getAllWebContents().forEach(n=>{n.off(e,t)}),this.electron.app?.off(`web-contents-created`,n)};function n(n,r){r.on(e,t)}}onIpc(e,t){this.electron.ipcMain?.on(e,t)}onIpcInvoke(e,t){this.electron.ipcMain?.handle?.(e,t)}openUrl(e,t=console.error){this.electron.shell?.openExternal(e).catch(t)}setPreloadFileForSessions({filePath:e,includeFutureSession:t=!0,getSessions:n=()=>[this.electron.session?.defaultSession]}){for(let e of n().filter(Boolean))r(e);t&&this.onAppEvent(`session-created`,e=>{r(e)});function r(t){typeof t.registerPreloadScript==`function`?t.registerPreloadScript({filePath:e,id:`electron-log-preload`,type:`frame`}):t.setPreloads([...t.getPreloads(),e])}}sendIpc(e,t){this.electron.BrowserWindow?.getAllWindows()?.forEach(n=>{n.webContents?.isDestroyed()===!1&&n.webContents?.isCrashed()===!1&&n.webContents.send(e,t)})}showErrorBox(e,t){this.electron.dialog?.showErrorBox(e,t)}}})),T=s(((e,t)=>{var n={};try{n=require(`electron`)}catch{}n.ipcRenderer&&r(n),typeof t==`object`&&(t.exports=r);function r({contextBridge:e,ipcRenderer:t}){if(!t)return;t.on(`__ELECTRON_LOG_IPC__`,(e,t)=>{window.postMessage({cmd:`message`,...t})}),t.invoke(`__ELECTRON_LOG__`,{cmd:`getOptions`}).catch(e=>console.error(Error(`electron-log isn't initialized in the main process. Please call log.initialize() before. ${e.message}`)));let n={sendToMain(e){try{t.send(`__ELECTRON_LOG__`,e)}catch(n){console.error(`electronLog.sendToMain `,n,`data:`,e),t.send(`__ELECTRON_LOG__`,{cmd:`errorHandler`,error:{message:n?.message,stack:n?.stack},errorName:`sendToMain`})}},log(...e){n.sendToMain({data:e,level:`info`})}};for(let e of[`error`,`warn`,`info`,`verbose`,`debug`,`silly`])n[e]=(...t)=>n.sendToMain({data:t,level:e});if(e&&process.contextIsolated)try{e.exposeInMainWorld(`__electronLog`,n)}catch{}typeof window==`object`?window.__electronLog=n:__electronLog=n}})),E=s(((e,t)=>{var n=require(`fs`),r=require(`os`),i=require(`path`),a=T(),o=!1,s=!1;t.exports={initialize({externalApi:e,getSessions:t,includeFutureSession:n,logger:r,preload:i=!0,spyRendererConsole:a=!1}){e.onAppReady(()=>{try{i&&c({externalApi:e,getSessions:t,includeFutureSession:n,logger:r,preloadOption:i}),a&&l({externalApi:e,logger:r})}catch(e){r.warn(e)}})}};function c({externalApi:e,getSessions:t,includeFutureSession:s,logger:c,preloadOption:l}){let u=typeof l==`string`?l:void 0;if(o){c.warn(Error(`log.initialize({ preload }) already called`).stack);return}o=!0;try{u=i.resolve(__dirname,`../renderer/electron-log-preload.js`)}catch{}if(!u||!n.existsSync(u)){u=i.join(e.getAppUserDataPath()||r.tmpdir(),`electron-log-preload.js`);let t=`
      try {
        (${a.toString()})(require('electron'));
      } catch(e) {
        console.error(e);
      }
    `;n.writeFileSync(u,t,`utf8`)}e.setPreloadFileForSessions({filePath:u,includeFutureSession:s,getSessions:t})}function l({externalApi:e,logger:t}){if(s){t.warn(Error(`log.initialize({ spyRendererConsole }) already called`).stack);return}s=!0;let n=[`debug`,`info`,`warn`,`error`];e.onEveryWebContentsEvent(`console-message`,(e,r,i)=>{t.processMessage({data:[i],level:n[r],variables:{processType:`renderer`}})})}})),D=s(((e,t)=>{t.exports=n;function n(e){return Object.defineProperties(t,{defaultLabel:{value:``,writable:!0},labelPadding:{value:!0,writable:!0},maxLabelLength:{value:0,writable:!0},labelLength:{get(){switch(typeof t.labelPadding){case`boolean`:return t.labelPadding?t.maxLabelLength:0;case`number`:return t.labelPadding;default:return 0}}}});function t(n){t.maxLabelLength=Math.max(t.maxLabelLength,n.length);let r={};for(let t of e.levels)r[t]=(...r)=>e.logData(r,{level:t,scope:n});return r.log=r.info,r}}})),ne=s(((e,t)=>{t.exports=class{constructor({processMessage:e}){this.processMessage=e,this.buffer=[],this.enabled=!1,this.begin=this.begin.bind(this),this.commit=this.commit.bind(this),this.reject=this.reject.bind(this)}addMessage(e){this.buffer.push(e)}begin(){this.enabled=[]}commit(){this.enabled=!1,this.buffer.forEach(e=>this.processMessage(e)),this.buffer=[]}reject(){this.enabled=!1,this.buffer=[]}}})),re=s(((e,t)=>{var n=D(),r=ne();t.exports=class e{static instances={};dependencies={};errorHandler=null;eventLogger=null;functions={};hooks=[];isDev=!1;levels=null;logId=null;scope=null;transports={};variables={};constructor({allowUnknownLevel:t=!1,dependencies:i={},errorHandler:a,eventLogger:o,initializeFn:s,isDev:c=!1,levels:l=[`error`,`warn`,`info`,`verbose`,`debug`,`silly`],logId:u,transportFactories:d={},variables:f}={}){this.addLevel=this.addLevel.bind(this),this.create=this.create.bind(this),this.initialize=this.initialize.bind(this),this.logData=this.logData.bind(this),this.processMessage=this.processMessage.bind(this),this.allowUnknownLevel=t,this.buffering=new r(this),this.dependencies=i,this.initializeFn=s,this.isDev=c,this.levels=l,this.logId=u,this.scope=n(this),this.transportFactories=d,this.variables=f||{};for(let e of this.levels)this.addLevel(e,!1);this.log=this.info,this.functions.log=this.log,this.errorHandler=a,a?.setOptions({...i,logFn:this.error}),this.eventLogger=o,o?.setOptions({...i,logger:this});for(let[e,t]of Object.entries(d))this.transports[e]=t(this,i);e.instances[u]=this}static getInstance({logId:e}){return this.instances[e]||this.instances.default}addLevel(e,t=this.levels.length){t!==!1&&this.levels.splice(t,0,e),this[e]=(...t)=>this.logData(t,{level:e}),this.functions[e]=this[e]}catchErrors(e){return this.processMessage({data:[`log.catchErrors is deprecated. Use log.errorHandler instead`],level:`warn`},{transports:[`console`]}),this.errorHandler.startCatching(e)}create(t){return typeof t==`string`&&(t={logId:t}),new e({dependencies:this.dependencies,errorHandler:this.errorHandler,initializeFn:this.initializeFn,isDev:this.isDev,transportFactories:this.transportFactories,variables:{...this.variables},...t})}compareLevels(e,t,n=this.levels){let r=n.indexOf(e),i=n.indexOf(t);return i===-1||r===-1?!0:i<=r}initialize(e={}){this.initializeFn({logger:this,...this.dependencies,...e})}logData(e,t={}){this.buffering.enabled?this.buffering.addMessage({data:e,date:new Date,...t}):this.processMessage({data:e,...t})}processMessage(e,{transports:t=this.transports}={}){if(e.cmd===`errorHandler`){this.errorHandler.handle(e.error,{errorName:e.errorName,processType:`renderer`,showDialog:!!e.showDialog});return}let n=e.level;this.allowUnknownLevel||(n=this.levels.includes(e.level)?e.level:`info`);let r={date:new Date,logId:this.logId,...e,level:n,variables:{...this.variables,...e.variables}};for(let[n,i]of this.transportEntries(t))if(!(typeof i!=`function`||i.level===!1)&&this.compareLevels(i.level,e.level))try{let e=this.hooks.reduce((e,t)=>e&&t(e,i,n),r);e&&i({...e,data:[...e.data]})}catch(e){this.processInternalErrorFn(e)}}processInternalErrorFn(e){}transportEntries(e=this.transports){return(Array.isArray(e)?e:Object.entries(e)).map(e=>{switch(typeof e){case`string`:return this.transports[e]?[e,this.transports[e]]:null;case`function`:return[e.name,e];default:return Array.isArray(e)?e:null}}).filter(Boolean)}}})),ie=s(((e,t)=>{var n=class{externalApi=void 0;isActive=!1;logFn=void 0;onError=void 0;showDialog=!0;constructor({externalApi:e,logFn:t=void 0,onError:n=void 0,showDialog:r=void 0}={}){this.createIssue=this.createIssue.bind(this),this.handleError=this.handleError.bind(this),this.handleRejection=this.handleRejection.bind(this),this.setOptions({externalApi:e,logFn:t,onError:n,showDialog:r}),this.startCatching=this.startCatching.bind(this),this.stopCatching=this.stopCatching.bind(this)}handle(e,{logFn:t=this.logFn,onError:n=this.onError,processType:i=`browser`,showDialog:a=this.showDialog,errorName:o=``}={}){e=r(e);try{if(typeof n==`function`){let t=this.externalApi?.getVersions()||{},r=this.createIssue;if(n({createIssue:r,error:e,errorName:o,processType:i,versions:t})===!1)return}o?t(o,e):t(e),a&&!o.includes(`rejection`)&&this.externalApi&&this.externalApi.showErrorBox(`A JavaScript error occurred in the ${i} process`,e.stack)}catch{console.error(e)}}setOptions({externalApi:e,logFn:t,onError:n,showDialog:r}){typeof e==`object`&&(this.externalApi=e),typeof t==`function`&&(this.logFn=t),typeof n==`function`&&(this.onError=n),typeof r==`boolean`&&(this.showDialog=r)}startCatching({onError:e,showDialog:t}={}){this.isActive||(this.isActive=!0,this.setOptions({onError:e,showDialog:t}),process.on(`uncaughtException`,this.handleError),process.on(`unhandledRejection`,this.handleRejection))}stopCatching(){this.isActive=!1,process.removeListener(`uncaughtException`,this.handleError),process.removeListener(`unhandledRejection`,this.handleRejection)}createIssue(e,t){this.externalApi?.openUrl(`${e}?${new URLSearchParams(t).toString()}`)}handleError(e){this.handle(e,{errorName:`Unhandled`})}handleRejection(e){let t=e instanceof Error?e:Error(JSON.stringify(e));this.handle(t,{errorName:`Unhandled rejection`})}};function r(e){if(e instanceof Error)return e;if(e&&typeof e==`object`){if(e.message)return Object.assign(Error(e.message),e);try{return Error(JSON.stringify(e))}catch(t){return Error(`Couldn't normalize error ${String(e)}: ${t}`)}}return Error(`Can't normalize error ${String(e)}`)}t.exports=n})),ae=s(((e,t)=>{t.exports=class{disposers=[];format=`{eventSource}#{eventName}:`;formatters={app:{"certificate-error":({args:e})=>this.arrayToObject(e.slice(1,4),[`url`,`error`,`certificate`]),"child-process-gone":({args:e})=>e.length===1?e[0]:e,"render-process-gone":({args:[e,t]})=>t&&typeof t==`object`?{...t,...this.getWebContentsDetails(e)}:[]},webContents:{"console-message":({args:[e,t,n,r]})=>{if(!(e<3))return{message:t,source:`${r}:${n}`}},"did-fail-load":({args:e})=>this.arrayToObject(e,[`errorCode`,`errorDescription`,`validatedURL`,`isMainFrame`,`frameProcessId`,`frameRoutingId`]),"did-fail-provisional-load":({args:e})=>this.arrayToObject(e,[`errorCode`,`errorDescription`,`validatedURL`,`isMainFrame`,`frameProcessId`,`frameRoutingId`]),"plugin-crashed":({args:e})=>this.arrayToObject(e,[`name`,`version`]),"preload-error":({args:e})=>this.arrayToObject(e,[`preloadPath`,`error`])}};events={app:{"certificate-error":!0,"child-process-gone":!0,"render-process-gone":!0},webContents:{"did-fail-load":!0,"did-fail-provisional-load":!0,"plugin-crashed":!0,"preload-error":!0,unresponsive:!0}};externalApi=void 0;level=`error`;scope=``;constructor(e={}){this.setOptions(e)}setOptions({events:e,externalApi:t,level:n,logger:r,format:i,formatters:a,scope:o}){typeof e==`object`&&(this.events=e),typeof t==`object`&&(this.externalApi=t),typeof n==`string`&&(this.level=n),typeof r==`object`&&(this.logger=r),(typeof i==`string`||typeof i==`function`)&&(this.format=i),typeof a==`object`&&(this.formatters=a),typeof o==`string`&&(this.scope=o)}startLogging(e={}){this.setOptions(e),this.disposeListeners();for(let e of this.getEventNames(this.events.app))this.disposers.push(this.externalApi.onAppEvent(e,(...t)=>{this.handleEvent({eventSource:`app`,eventName:e,handlerArgs:t})}));for(let e of this.getEventNames(this.events.webContents))this.disposers.push(this.externalApi.onEveryWebContentsEvent(e,(...t)=>{this.handleEvent({eventSource:`webContents`,eventName:e,handlerArgs:t})}))}stopLogging(){this.disposeListeners()}arrayToObject(e,t){let n={};return t.forEach((t,r)=>{n[t]=e[r]}),e.length>t.length&&(n.unknownArgs=e.slice(t.length)),n}disposeListeners(){this.disposers.forEach(e=>e()),this.disposers=[]}formatEventLog({eventName:e,eventSource:t,handlerArgs:n}){let[r,...i]=n;if(typeof this.format==`function`)return this.format({args:i,event:r,eventName:e,eventSource:t});let a=this.formatters[t]?.[e],o=i;if(typeof a==`function`&&(o=a({args:i,event:r,eventName:e,eventSource:t})),!o)return;let s={};return Array.isArray(o)?s.args=o:typeof o==`object`&&Object.assign(s,o),t===`webContents`&&Object.assign(s,this.getWebContentsDetails(r?.sender)),[this.format.replace(`{eventSource}`,t===`app`?`App`:`WebContents`).replace(`{eventName}`,e),s]}getEventNames(e){return!e||typeof e!=`object`?[]:Object.entries(e).filter(([e,t])=>t).map(([e])=>e)}getWebContentsDetails(e){if(!e?.loadURL)return{};try{return{webContents:{id:e.id,url:e.getURL()}}}catch{return{}}}handleEvent({eventName:e,eventSource:t,handlerArgs:n}){let r=this.formatEventLog({eventName:e,eventSource:t,handlerArgs:n});r&&(this.scope?this.logger.scope(this.scope):this.logger)?.[this.level]?.(...r)}}})),O=s(((e,t)=>{t.exports={transform:n};function n({logger:e,message:t,transport:n,initialData:r=t?.data||[],transforms:i=n?.transforms}){return i.reduce((r,i)=>typeof i==`function`?i({data:r,logger:e,message:t,transport:n}):r,r)}})),k=s(((e,t)=>{var{transform:n}=O();t.exports={concatFirstStringElements:r,formatScope:a,formatText:s,formatVariables:o,timeZoneFromOffset:i,format({message:e,logger:t,transport:r,data:i=e?.data}){switch(typeof r.format){case`string`:return n({message:e,logger:t,transforms:[o,a,s],transport:r,initialData:[r.format,...i]});case`function`:return r.format({data:i,level:e?.level||`info`,logger:t,message:e,transport:r});default:return i}}};function r({data:e}){return typeof e[0]!=`string`||typeof e[1]!=`string`||e[0].match(/%[1cdfiOos]/)?e:[`${e[0]} ${e[1]}`,...e.slice(2)]}function i(e){let t=Math.abs(e);return`${e>0?`-`:`+`}${Math.floor(t/60).toString().padStart(2,`0`)}:${(t%60).toString().padStart(2,`0`)}`}function a({data:e,logger:t,message:n}){let{defaultLabel:r,labelLength:i}=t?.scope||{},a=e[0],o=n.scope;o||=r;let s;return s=o===``?i>0?``.padEnd(i+3):``:typeof o==`string`?` (${o})`.padEnd(i+3):``,e[0]=a.replace(`{scope}`,s),e}function o({data:e,message:t}){let n=e[0];if(typeof n!=`string`)return e;n=n.replace(`{level}]`,`${t.level}]`.padEnd(6,` `));let r=t.date||new Date;return e[0]=n.replace(/\{(\w+)}/g,(e,n)=>{switch(n){case`level`:return t.level||`info`;case`logId`:return t.logId;case`y`:return r.getFullYear().toString(10);case`m`:return(r.getMonth()+1).toString(10).padStart(2,`0`);case`d`:return r.getDate().toString(10).padStart(2,`0`);case`h`:return r.getHours().toString(10).padStart(2,`0`);case`i`:return r.getMinutes().toString(10).padStart(2,`0`);case`s`:return r.getSeconds().toString(10).padStart(2,`0`);case`ms`:return r.getMilliseconds().toString(10).padStart(3,`0`);case`z`:return i(r.getTimezoneOffset());case`iso`:return r.toISOString();default:return t.variables?.[n]||e}}).trim(),e}function s({data:e}){let t=e[0];if(typeof t!=`string`)return e;if(t.lastIndexOf(`{text}`)===t.length-6)return e[0]=t.replace(/\s?{text}/,``),e[0]===``&&e.shift(),e;let n=t.split(`{text}`),r=[];return n[0]!==``&&r.push(n[0]),r=r.concat(e.slice(1)),n[1]!==``&&r.push(n[1]),r}})),oe=s(((e,t)=>{var n=require(`util`);t.exports={serialize:i,maxDepth({data:e,transport:n,depth:r=n?.depth??6}){if(!e)return e;if(r<1)return Array.isArray(e)?`[array]`:typeof e==`object`&&e?`[object]`:e;if(Array.isArray(e))return e.map(e=>t.exports.maxDepth({data:e,depth:r-1}));if(typeof e!=`object`||e&&typeof e.toISOString==`function`)return e;if(e===null)return null;if(e instanceof Error)return e;let i={};for(let n in e)Object.prototype.hasOwnProperty.call(e,n)&&(i[n]=t.exports.maxDepth({data:e[n],depth:r-1}));return i},toJSON({data:e}){return JSON.parse(JSON.stringify(e,r()))},toString({data:e,transport:t}){let i=t?.inspectOptions||{},a=e.map(e=>{if(e!==void 0)try{let t=JSON.stringify(e,r(),`  `);return t===void 0?void 0:JSON.parse(t)}catch{return e}});return n.formatWithOptions(i,...a)}};function r(e={}){let t=new WeakSet;return function(n,r){if(typeof r==`object`&&r){if(t.has(r))return;t.add(r)}return i(n,r,e)}}function i(e,t,n={}){let r=n?.serializeMapAndSet!==!1;return t instanceof Error?t.stack:t&&(typeof t==`function`?`[function] ${t.toString()}`:t instanceof Date?t.toISOString():r&&t instanceof Map&&Object.fromEntries?Object.fromEntries(t):r&&t instanceof Set&&Array.from?Array.from(t):t)}})),se=s(((e,t)=>{t.exports={transformStyles:a,applyAnsiStyles({data:e}){return a(e,r,i)},removeStyles({data:e}){return a(e,()=>``)}};var n={unset:`\x1B[0m`,black:`\x1B[30m`,red:`\x1B[31m`,green:`\x1B[32m`,yellow:`\x1B[33m`,blue:`\x1B[34m`,magenta:`\x1B[35m`,cyan:`\x1B[36m`,white:`\x1B[37m`,gray:`\x1B[90m`};function r(e){return n[e.replace(/color:\s*(\w+).*/,`$1`).toLowerCase()]||``}function i(e){return e+n.unset}function a(e,t,n){let r={};return e.reduce((e,i,a,o)=>{if(r[a])return e;if(typeof i==`string`){let e=a,s=!1;i=i.replace(/%[1cdfiOos]/g,n=>{if(e+=1,n!==`%c`)return n;let a=o[e];return typeof a==`string`?(r[e]=!0,s=!0,t(a,i)):n}),s&&n&&(i=n(i))}return e.push(i),e},[])}})),ce=s(((e,t)=>{var{concatFirstStringElements:n,format:r}=k(),{maxDepth:i,toJSON:a}=oe(),{applyAnsiStyles:o,removeStyles:s}=se(),{transform:c}=O(),l={error:console.error,warn:console.warn,info:console.info,verbose:console.info,debug:console.debug,silly:console.debug,log:console.log};t.exports=d;var u=`%c{h}:{i}:{s}.{ms}{scope}%c ${process.platform===`win32`?`>`:`›`} {text}`;Object.assign(d,{DEFAULT_FORMAT:u});function d(e){return Object.assign(t,{colorMap:{error:`red`,warn:`yellow`,info:`cyan`,verbose:`unset`,debug:`gray`,silly:`gray`,default:`unset`},format:u,level:`silly`,transforms:[f,r,m,n,i,a],useStyles:process.env.FORCE_STYLES,writeFn({message:e}){(l[e.level]||l.info)(...e.data)}});function t(n){let r=c({logger:e,message:n,transport:t});t.writeFn({message:{...n,data:r}})}}function f({data:e,message:t,transport:n}){return typeof n.format!=`string`||!n.format.includes(`%c`)?e:[`color:${h(t.level,n)}`,`color:unset`,...e]}function p(e,t){if(typeof e==`boolean`)return e;let n=t===`error`||t===`warn`?process.stderr:process.stdout;return n&&n.isTTY}function m(e){let{message:t,transport:n}=e;return(p(n.useStyles,t.level)?o:s)(e)}function h(e,t){return t.colorMap[e]||t.colorMap.default}})),le=s(((e,t)=>{var n=require(`events`),r=require(`fs`),i=require(`os`);t.exports=class extends n{asyncWriteQueue=[];bytesWritten=0;hasActiveAsyncWriting=!1;path=null;initialSize=void 0;writeOptions=null;writeAsync=!1;constructor({path:e,writeOptions:t={encoding:`utf8`,flag:`a`,mode:438},writeAsync:n=!1}){super(),this.path=e,this.writeOptions=t,this.writeAsync=n}get size(){return this.getSize()}clear(){try{return r.writeFileSync(this.path,``,{mode:this.writeOptions.mode,flag:`w`}),this.reset(),!0}catch(e){return e.code===`ENOENT`?!0:(this.emit(`error`,e,this),!1)}}crop(e){try{let t=a(this.path,e||4096);this.clear(),this.writeLine(`[log cropped]${i.EOL}${t}`)}catch(e){this.emit(`error`,Error(`Couldn't crop file ${this.path}. ${e.message}`),this)}}getSize(){if(this.initialSize===void 0)try{let e=r.statSync(this.path);this.initialSize=e.size}catch{this.initialSize=0}return this.initialSize+this.bytesWritten}increaseBytesWrittenCounter(e){this.bytesWritten+=Buffer.byteLength(e,this.writeOptions.encoding)}isNull(){return!1}nextAsyncWrite(){let e=this;if(this.hasActiveAsyncWriting||this.asyncWriteQueue.length===0)return;let t=this.asyncWriteQueue.join(``);this.asyncWriteQueue=[],this.hasActiveAsyncWriting=!0,r.writeFile(this.path,t,this.writeOptions,n=>{e.hasActiveAsyncWriting=!1,n?e.emit(`error`,Error(`Couldn't write to ${e.path}. ${n.message}`),this):e.increaseBytesWrittenCounter(t),e.nextAsyncWrite()})}reset(){this.initialSize=void 0,this.bytesWritten=0}toString(){return this.path}writeLine(e){if(e+=i.EOL,this.writeAsync){this.asyncWriteQueue.push(e),this.nextAsyncWrite();return}try{r.writeFileSync(this.path,e,this.writeOptions),this.increaseBytesWrittenCounter(e)}catch(e){this.emit(`error`,Error(`Couldn't write to ${this.path}. ${e.message}`),this)}}};function a(e,t){let n=Buffer.alloc(t),i=r.statSync(e),a=Math.min(i.size,t),o=Math.max(0,i.size-t),s=r.openSync(e,`r`),c=r.readSync(s,n,0,a,o);return r.closeSync(s),n.toString(`utf8`,0,c)}})),ue=s(((e,t)=>{var n=le();t.exports=class extends n{clear(){}crop(){}getSize(){return 0}isNull(){return!0}writeLine(){}}})),de=s(((e,t)=>{var n=require(`events`),r=require(`fs`),i=require(`path`),a=le(),o=ue();t.exports=class extends n{store={};constructor(){super(),this.emitError=this.emitError.bind(this)}provide({filePath:e,writeOptions:t={},writeAsync:n=!1}){let r;try{if(e=i.resolve(e),this.store[e])return this.store[e];r=this.createFile({filePath:e,writeOptions:t,writeAsync:n})}catch(t){r=new o({path:e}),this.emitError(t,r)}return r.on(`error`,this.emitError),this.store[e]=r,r}createFile({filePath:e,writeOptions:t,writeAsync:n}){return this.testFileWriting({filePath:e,writeOptions:t}),new a({path:e,writeOptions:t,writeAsync:n})}emitError(e,t){this.emit(`error`,e,t)}testFileWriting({filePath:e,writeOptions:t}){r.mkdirSync(i.dirname(e),{recursive:!0}),r.writeFileSync(e,``,{flag:`a`,mode:t.mode})}}})),fe=s(((e,t)=>{var n=require(`fs`),r=require(`os`),i=require(`path`),a=de(),{transform:o}=O(),{removeStyles:s}=se(),{format:c,concatFirstStringElements:l}=k(),{toString:u}=oe();t.exports=f;var d=new a;function f(e,{registry:t=d,externalApi:a}={}){let f;return t.listenerCount(`error`)<1&&t.on(`error`,(e,t)=>{g(`Can't write to ${t}`,e)}),Object.assign(m,{fileName:p(e.variables.processType),format:`[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}]{scope} {text}`,getFile:_,inspectOptions:{depth:5},level:`silly`,maxSize:1024**2,readAllLogs:v,sync:!0,transforms:[s,c,l,u],writeOptions:{flag:`a`,mode:438,encoding:`utf8`},archiveLogFn(e){let t=e.toString(),r=i.parse(t);try{n.renameSync(t,i.join(r.dir,`${r.name}.old${r.ext}`))}catch(t){g(`Could not rotate log`,t);let n=Math.round(m.maxSize/4);e.crop(Math.min(n,256*1024))}},resolvePathFn(e){return i.join(e.libraryDefaultDir,e.fileName)},setAppName(t){e.dependencies.externalApi.setAppName(t)}});function m(t){let n=_(t);m.maxSize>0&&n.size>m.maxSize&&(m.archiveLogFn(n),n.reset());let r=o({logger:e,message:t,transport:m});n.writeLine(r)}function h(){f||(f=Object.create(Object.prototype,{...Object.getOwnPropertyDescriptors(a.getPathVariables()),fileName:{get(){return m.fileName},enumerable:!0}}),typeof m.archiveLog==`function`&&(m.archiveLogFn=m.archiveLog,g(`archiveLog is deprecated. Use archiveLogFn instead`)),typeof m.resolvePath==`function`&&(m.resolvePathFn=m.resolvePath,g(`resolvePath is deprecated. Use resolvePathFn instead`)))}function g(t,n=null,r=`error`){let i=[`electron-log.transports.file: ${t}`];n&&i.push(n),e.transports.console({data:i,date:new Date,level:r})}function _(e){h();let n=m.resolvePathFn(f,e);return t.provide({filePath:n,writeAsync:!m.sync,writeOptions:m.writeOptions})}function v({fileFilter:e=e=>e.endsWith(`.log`)}={}){h();let t=i.dirname(m.resolvePathFn(f));return n.existsSync(t)?n.readdirSync(t).map(e=>i.join(t,e)).filter(e).map(e=>{try{return{path:e,lines:n.readFileSync(e,`utf8`).split(r.EOL)}}catch{return null}}).filter(Boolean):[]}}function p(e=process.type){switch(e){case`renderer`:return`renderer.log`;case`worker`:return`worker.log`;default:return`main.log`}}})),pe=s(((e,t)=>{var{maxDepth:n,toJSON:r}=oe(),{transform:i}=O();t.exports=a;function a(e,{externalApi:t}){return Object.assign(a,{depth:3,eventId:`__ELECTRON_LOG_IPC__`,level:e.isDev?`silly`:!1,transforms:[r,n]}),t?.isElectron()?a:void 0;function a(n){n?.variables?.processType!==`renderer`&&t?.sendIpc(a.eventId,{...n,data:i({logger:e,message:n,transport:a})})}}})),me=s(((e,t)=>{var n=require(`http`),r=require(`https`),{transform:i}=O(),{removeStyles:a}=se(),{toJSON:o,maxDepth:s}=oe();t.exports=c;function c(e){return Object.assign(t,{client:{name:`electron-application`},depth:6,level:!1,requestOptions:{},transforms:[a,o,s],makeBodyFn({message:e}){return JSON.stringify({client:t.client,data:e.data,date:e.date.getTime(),level:e.level,scope:e.scope,variables:e.variables})},processErrorFn({error:n}){e.processMessage({data:[`electron-log: can't POST ${t.url}`,n],level:`warn`},{transports:[`console`,`file`]})},sendRequestFn({serverUrl:e,requestOptions:t,body:i}){let a=(e.startsWith(`https:`)?r:n).request(e,{method:`POST`,...t,headers:{"Content-Type":`application/json`,"Content-Length":i.length,...t.headers}});return a.write(i),a.end(),a}});function t(n){if(!t.url)return;let r=t.makeBodyFn({logger:e,message:{...n,data:i({logger:e,message:n,transport:t})},transport:t}),a=t.sendRequestFn({serverUrl:t.url,requestOptions:t.requestOptions,body:Buffer.from(r,`utf8`)});a.on(`error`,r=>t.processErrorFn({error:r,logger:e,message:n,request:a,transport:t}))}}})),he=s(((e,t)=>{var n=re(),r=ie(),i=ae(),a=ce(),o=fe(),s=pe(),c=me();t.exports=l;function l({dependencies:e,initializeFn:t}){let l=new n({dependencies:e,errorHandler:new r,eventLogger:new i,initializeFn:t,isDev:e.externalApi?.isDev(),logId:`default`,transportFactories:{console:a,file:o,ipc:s,remote:c},variables:{processType:`main`}});return l.default=l,l.Logger=n,l.processInternalErrorFn=e=>{l.transports.console.writeFn({message:{data:[`Unhandled electron-log error`,e],level:`error`}})},l}})),ge=s(((e,t)=>{var n=require(`electron`),r=w(),{initialize:i}=E(),a=he(),o=new r({electron:n}),s=a({dependencies:{externalApi:o},initializeFn:i});t.exports=s,o.onIpc(`__ELECTRON_LOG__`,(e,t)=>{t.scope&&s.Logger.getInstance(t).scope(t.scope);let n=new Date(t.date);c({...t,date:n.getTime()?n:new Date})}),o.onIpcInvoke(`__ELECTRON_LOG__`,(e,{cmd:t=``,logId:n})=>{switch(t){case`getOptions`:return{levels:s.Logger.getInstance({logId:n}).levels,logId:n};default:return c({data:[`Unknown cmd '${t}'`],level:`error`}),{}}});function c(e){s.Logger.getInstance(e)?.processMessage(e)}})),_e=s(((e,t)=>{t.exports=ge()}));function ve(){if(xe)return;xe=!0;let{app:e}=require(`electron`),{join:t,dirname:n}=require(`node:path`),r=e.isPackaged?t(n(e.getPath(`exe`)),`logs`):t(e.getAppPath(),`src`,`log`),i=()=>{let e=new Date;return`${e.getFullYear()}-${String(e.getMonth()+1).padStart(2,`0`)}-${String(e.getDate()).padStart(2,`0`)}`};be.default.transports.file.resolvePathFn=e=>t(r,i()+`.log`)}function ye(){ve()}var be,xe,A,j=o((()=>{be=l(_e()),be.default.initialize(),be.default.transports.file.maxSize=5*1024*1024,be.default.transports.console.level=`error`,xe=!1,A=be.default}));j();var Se=new Map,Ce={info:()=>{},warn:()=>{}};function we(e){Ce=e}function M(e){let t=(0,b.randomUUID)();return Se.set(t,{id:t,kill:e}),t}function N(e){Se.delete(e)}function Te(){let e=Se.size;if(e===0)return 0;Ce.info(`Killing ${e} in-flight conversion(s) on quit`);for(let e of Se.values())try{e.kill()}catch(t){Ce.warn(`Conversion kill failed for ${e.id}:`,t?.message??t)}return Se.clear(),e}var Ee=(0,S.promisify)(x.execFile),De=[`h264_nvenc`,`h264_qsv`,`h264_amf`],Oe=null,ke=null,Ae={info:()=>{},warn:()=>{}};function je(e){Ae=e}function Me(e){for(let t of De)if(RegExp(`\\b${t}\\b`).test(e))return t;return`libx264`}function Ne(e){return Oe?Promise.resolve(Oe):ke||(ke=(async()=>{try{let{stdout:t}=await Ee(e,[`-hide_banner`,`-encoders`],{timeout:5e3,maxBuffer:2*1024*1024}),n=Me(t);return Ae.info(`H.264 encoder selected: ${n}`),Oe=n,n}catch(e){return Ae.warn(`HW encoder probe failed, falling back to libx264:`,e?.message??e),Oe=`libx264`,`libx264`}finally{ke=null}})(),ke)}function Pe(e,t,n){switch(e){case`h264_nvenc`:return[`-c:v`,`h264_nvenc`,`-preset`,`p4`,`-rc`,`vbr`,`-cq`,t,`-b:v`,`0`];case`h264_qsv`:return[`-c:v`,`h264_qsv`,`-preset`,`veryfast`,`-global_quality`,t];case`h264_amf`:return[`-c:v`,`h264_amf`,`-quality`,`balanced`,`-rc`,`cqp`,`-qp_i`,t,`-qp_p`,t];default:return[`-c:v`,`libx264`,`-preset`,`ultrafast`,`-crf`,t,`-threads`,String(n)]}}var Fe=d.app.isPackaged?u.default.join(process.resourcesPath,`ffmpeg.exe`):v.default.path;_.default.setFfmpegPath(Fe);var Ie=Math.min(y.default.cpus().length,8);function Le(e,t,n,r){if(!r)return new Promise(r=>{let i=(0,_.default)(e),a=M(()=>i.kill(`SIGKILL`));i.outputOptions([`-c:v`,`copy`,`-c:a`,`aac`,`-b:a`,`128k`,`-movflags`,`+faststart`]).output(t).on(`progress`,()=>{n?.({percent:80,targetSize:0})}).on(`end`,()=>{N(a),n?.({percent:100,targetSize:0}),r({success:!0,outputPath:t})}).on(`error`,e=>{N(a),A.error(`MP4 remux failed:`,e.message),r({success:!1,outputPath:``,error:e.message})}).run()});let i=t.replace(/\.mp4$/i,`_tmp.mp4`),a=`crop=${Math.round(r.width/2)*2}:${Math.round(r.height/2)*2}:${Math.round(r.x/2)*2}:${Math.round(r.y/2)*2},`;return new Promise(async r=>{let o=await Ne(Fe);function s(t){return new Promise(r=>{let o=(0,_.default)(e),s=M(()=>o.kill(`SIGKILL`));o.outputOptions([...Pe(t,`23`,Ie),`-vf`,`${a}pad=ceil(iw/2)*2:ceil(ih/2)*2,format=yuv420p`,`-an`,`-movflags +faststart`]).output(i).on(`progress`,e=>{n?.({percent:Math.round((e.percent??0)*100)/200,targetSize:e.targetSize??0})}).on(`end`,()=>{N(s),r({success:!0})}).on(`error`,e=>{N(s),A.error(`MP4 pass1 failed (${t}):`,e.message),r({success:!1,error:e.message})}).run()})}let c=await s(o);if(!c.success&&o!==`libx264`&&(A.warn(`MP4 pass1: ${o} failed, retrying with libx264`),await g.default.promises.unlink(i).catch(()=>{}),c=await s(`libx264`)),!c.success){r({success:!1,outputPath:``,error:c.error});return}let l=(0,_.default)(i),u=M(()=>l.kill(`SIGKILL`));l.addInput(e).outputOptions([`-c:v`,`copy`,`-c:a`,`aac`,`-b:a`,`128k`,`-map`,`0:v`,`-map`,`1:a?`,`-shortest`,`-movflags`,`+faststart`]).output(t).on(`progress`,e=>{n?.({percent:Math.round((e.percent??0)*100)/200+50,targetSize:e.targetSize??0})}).on(`end`,()=>{N(u),g.default.promises.unlink(i).catch(()=>{}),r({success:!0,outputPath:t})}).on(`error`,e=>{N(u),A.error(`MP4 audio mux failed:`,e.message),g.default.promises.rename(i,t).then(()=>r({success:!0,outputPath:t})).catch(()=>{g.default.promises.unlink(i).catch(()=>{}),r({success:!1,outputPath:``,error:e.message})})}).run()})}function Re(e,t,n,r){let i=Math.round(n.width/2)*2,a=Math.round(n.height/2)*2,o=Math.round(n.x/2)*2,s=Math.round(n.y/2)*2;return new Promise(async n=>{let c=`crop=${i}:${a}:${o}:${s},format=yuv420p`,l=await Ne(Fe);function u(n,i){return new Promise(a=>{let o=(0,_.default)(e),s=M(()=>o.kill(`SIGKILL`));o.outputOptions([...Pe(n,i,Ie),`-vf`,c,`-c:a`,`copy`,`-movflags`,`+faststart`]).output(t).on(`progress`,e=>{r?.({percent:Math.round((e.percent??0)*100),targetSize:e.targetSize??0})}).on(`end`,()=>{N(s),a({success:!0,outputPath:t})}).on(`error`,e=>{N(s),A.error(`Crop failed (${n}):`,e.message),a({success:!1,outputPath:``,error:e.message})}).run()})}let d=await u(l,`18`);!d.success&&l!==`libx264`&&(A.warn(`Crop: ${l} failed, retrying with libx264`),d=await u(`libx264`,`18`)),n(d)})}function ze(e,t,n){return new Promise(r=>{let i=Math.max(...e.map(e=>e.bounds.x+e.bounds.width))-Math.min(...e.map(e=>e.bounds.x)),a=Math.max(...e.map(e=>e.bounds.y+e.bounds.height))-Math.min(...e.map(e=>e.bounds.y)),o=Math.min(...e.map(e=>e.bounds.x)),s=Math.min(...e.map(e=>e.bounds.y)),c=Math.round(i/2)*2,l=Math.round(a/2)*2;A.info(`Merge canvas size:`,c,`x`,l),A.info(`Merge inputs:`,e.map((e,t)=>`[${t}] ${e.filePath} bounds=${JSON.stringify(e.bounds)}`).join(`, `));let u=[],d=e.length;function f(e,t){let n=e.replace(/\.webm$/i,`_remux.mp4`);return new Promise(r=>{let i=(0,_.default)(e),a=M(()=>i.kill(`SIGKILL`));i.outputOptions([`-c`,`copy`]).output(n).on(`end`,()=>{N(a),A.info(`Merge remux ${t+1}/${d} done`),r({success:!0,remuxedPath:n})}).on(`error`,e=>{N(a),A.error(`Merge remux ${t+1} failed:`,e.message),r({success:!1,remuxedPath:n,error:e.message})}).run()})}async function p(){for(let e of u)await g.default.promises.unlink(e).catch(()=>{});for(let t of e)await g.default.promises.unlink(t.filePath).catch(()=>{})}async function m(){let r=await Ne(Fe),i=[`color=c=black:s=${c}x${l}[bg]`],a=`[bg]`;for(let t=0;t<e.length;t++){let n=e[t],r=Math.round((n.bounds.x-o)/2)*2,c=Math.round((n.bounds.y-s)/2)*2,l=Math.round(n.bounds.width/2)*2,u=Math.round(n.bounds.height/2)*2,d=`[s${t}]`,f=t===e.length-1?`[out]`:`[tmp${t}]`;i.push(`[${t}:v]scale=${l}:${u},setsar=1${d}`),i.push(`${a}${d}overlay=${r}:${c}${f}`),a=f}i.push(`[out]format=yuv420p`),A.info(`Merge filter_complex:`,i.join(`;`));function d(r){return new Promise(a=>{let o=(0,_.default)(),s=M(()=>o.kill(`SIGKILL`));for(let e of u)o.addInput(e);o.complexFilter(i).outputOptions([...Pe(r,`23`,Ie),`-movflags`,`+faststart`]).output(t).on(`start`,()=>{A.info(`Merge ffmpeg command started (${r})`)}).on(`progress`,e=>{let t=Math.round(e.percent??0);n?.({percent:Math.min(30+t*.7,100),targetSize:e.targetSize??0})}).on(`end`,()=>{N(s),A.info(`Merge completed successfully`);for(let t of e)g.default.promises.unlink(t.filePath).catch(()=>{});for(let e of u)g.default.promises.unlink(e).catch(()=>{});a({success:!0,outputPath:t})}).on(`error`,t=>{N(s),A.error(`Multi-screen merge failed (${r}):`,t.message);for(let t of e)g.default.promises.unlink(t.filePath).catch(()=>{});for(let e of u)g.default.promises.unlink(e).catch(()=>{});a({success:!1,outputPath:``,error:t.message})}).run()})}let f=await d(r);return!f.success&&r!==`libx264`&&(A.warn(`Merge: ${r} failed, retrying with libx264`),await g.default.promises.unlink(t).catch(()=>{}),f=await d(`libx264`)),f}(async()=>{for(let t=0;t<d;t++){let i=await f(e[t].filePath,t);if(!i.success){A.error(`Merge aborted: remux ${t+1}/${d} failed, short-circuiting`),await g.default.promises.unlink(i.remuxedPath).catch(()=>{}),await p(),r({success:!1,outputPath:``,error:i.error});return}u.push(i.remuxedPath),n?.({percent:Math.round((t+1)/d*30),targetSize:0})}r(await m())})()})}function Be(e,t,n,r){let{execFile:i}=require(`node:child_process`),a=v.default.path,o=n?.width??480,s=n?.fps??10,c=u.default.join(y.default.tmpdir(),`gif_palette_${Date.now()}.png`);A.info(`GIF conversion - input:`,e,`palette:`,c,`output:`,t);let l=[`-y`,`-i`,e,`-vf`,`fps=${s},scale=${o}:-1:flags=lanczos,palettegen`,c];return new Promise(u=>{let d=``,f=``,p=i(a,l,l=>{if(N(d),l){A.error(`GIF palette gen failed:`,l.message),u({success:!1,outputPath:``,error:l.message});return}A.info(`GIF palette generated successfully`);let p=i(a,[`-y`,`-i`,e,`-i`,c,`-filter_complex`,`[0:v]fps=${s},scale=${o}:-1:flags=lanczos[x];[x][1:v]paletteuse`,t],e=>{N(f),g.default.promises.unlink(c).catch(()=>{}),e?(A.error(`GIF creation failed:`,e.message),u({success:!1,outputPath:``,error:e.message})):u({success:!0,outputPath:t})});f=M(()=>p.kill(`SIGKILL`)),p.stdout&&p.stdout.on(`data`,e=>{let t=e.toString().match(/time=(\d+:\d+:\d+\.\d+)/);if(t&&n?.duration){let e=t[1].split(`:`).map(Number),i=e[0]*3600+e[1]*60+e[2],a=Math.min(Math.round(i/n.duration*100),99);r?.({percent:a+50,targetSize:0})}else r?.({percent:75,targetSize:0})})});d=M(()=>p.kill(`SIGKILL`))})}var Ve=s(((e,t)=>{j();var n=null;function r(e){n=e}function i(e,t){f&&!f.isDestroyed()&&f.webContents.send(`audio-levels`,{micLevel:e,sysLevel:t}),T&&!T.isDestroyed()&&T.webContents.send(`audio-levels`,{micLevel:e,sysLevel:t})}var a=null,o=null;function s(){return new Promise(e=>{o=e,n&&!n.isDestroyed()&&n.minimize();let{x:t,y:r,width:i,height:s}=d.screen.getPrimaryDisplay().bounds;a=new d.BrowserWindow({x:t,y:r,width:i,height:s,frame:!1,transparent:!0,resizable:!1,movable:!1,alwaysOnTop:!0,skipTaskbar:!0,hasShadow:!1,webPreferences:{nodeIntegration:!0,contextIsolation:!1}});let l=(0,u.join)(__dirname,`region-selector.html`);a.loadFile(l).catch(e=>{A.error(`Failed to load region selector:`,e.message),c(null)}),a.setFullScreen(!0),a.setVisibleOnAllWorkspaces(!0),a.setIgnoreMouseEvents(!1),a.on(`closed`,()=>{o&&=(o(null),null)})})}function c(e){a&&!a.isDestroyed()&&a.close(),a=null,o&&=(o(e),null)}var l=null,f=null,p=null,m=null,h=null,g=200,_=150,v=12,y=null,b=0,x=0,S=null;function C(){if(!h||h.isDestroyed())return;let e=d.screen.getCursorScreenPoint(),[t,n]=h.getPosition();b=e.x-t,x=e.y-n;let[r,i]=h.getSize();S=setInterval(()=>{if(!h||h.isDestroyed()){ee();return}let e=d.screen.getCursorScreenPoint(),t=e.x-b,n=e.y-x;y&&(t=Math.max(y.x,Math.min(t,y.x+y.width-r)),n=Math.max(y.y,Math.min(n,y.y+y.height-i))),h.setBounds({x:t,y:n,width:r,height:i})},16)}function ee(){S&&=(clearInterval(S),null)}function te(e,t){w(),y=e;let n=e.x+e.width-g-v,r=e.y+v;h=new d.BrowserWindow({x:n,y:r,width:g,height:_,frame:!1,transparent:!0,resizable:!1,movable:!1,alwaysOnTop:!0,skipTaskbar:!0,hasShadow:!1,webPreferences:{nodeIntegration:!0,contextIsolation:!1}}),h.setVisibleOnAllWorkspaces(!0),h.setAlwaysOnTop(!0,`screen-saver`);let i=(0,u.join)(__dirname,`camera-preview.html`),a=t?`?deviceId=${encodeURIComponent(t)}`:``;h.loadFile(i+a).catch(e=>{A.error(`Failed to load camera preview:`,e.message)}),A.info(`Camera preview shown at`,n,r)}function w(){h&&!h.isDestroyed()&&(h.close(),h=null)}var T=null,E=null,D=null,ne=`idle`,re=null;function ie(e,t){ae(),ne=`idle`;let n=d.screen.getPrimaryDisplay();if(t!=null){let e=d.screen.getAllDisplays().find(e=>e.id===t);e&&(n=e)}let r=n.bounds;re=r,T=new d.BrowserWindow({x:Math.round(r.x+(r.width-340)/2),y:r.y+4,width:340,height:44,frame:!1,transparent:!0,resizable:!0,movable:!1,alwaysOnTop:!0,skipTaskbar:!0,hasShadow:!1,webPreferences:{nodeIntegration:!0,contextIsolation:!1}}),T.setVisibleOnAllWorkspaces(!0),T.setMinimumSize(100,44),T.setAlwaysOnTop(!0,`screen-saver`);let i=`<!DOCTYPE html>
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
<div class="sep" id="aiSep" style="display:none"></div>
<div class="ai-indicator" id="aiIndicator" style="display:none" onclick="showAiDetail()" title="点击查看详情">
  <span class="ai-dot idle" id="aiDot"></span>
  <span class="ai-label" id="aiLabel">AI 待机</span>
</div>
<div class="perm-card" id="permCard">
  <div class="perm-header">
    <span>🤖</span>
    <span>Claude Code 请求权限</span>
  </div>
  <div class="perm-detail">
    <span class="perm-tool" id="permTool">工具名</span>
    <span id="permTarget">目标信息</span>
  </div>
  <div class="perm-actions">
    <button class="perm-btn allow" onclick="doAllow()">✅ 允许</button>
    <button class="perm-btn deny" onclick="doDeny()">❌ 拒绝</button>
    <button class="perm-btn always" onclick="doAlwaysAllow()">📌 始终允许</button>
  </div>
</div>
<script>
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
const aiLabels={idle:'AI 待机',thinking:'AI 思考中',working:'AI 工作中',error:'AI 出错了',notification:'等待审批',done:'任务完成'}
ipcRenderer.on('agent-state-update',(e,data)=>{
  const ind=document.getElementById('aiIndicator'),dot=document.getElementById('aiDot'),lb=document.getElementById('aiLabel'),sp=document.getElementById('aiSep')
  if(!data||(data.state==='idle'&&(!data.sessions||!data.sessions.length))){ind.style.display='none';sp.style.display='none';return}
  ind.style.display='flex';sp.style.display='block';currentAiState=data.state
  dot.className='ai-dot '+data.state;lb.textContent=aiLabels[data.state]||'AI '+data.state;lb.classList.toggle('active',data.state!=='idle')
  setTimeout(resizeIsland,50)
})
// 录制悬浮岛也展示权限卡：只关心队首为权限卡的情况（提问卡无对应 UI，忽略）
ipcRenderer.on('agent-card-update',(e,card)=>{
  if(!card||card.kind!=='permission'){ document.getElementById('permCard').classList.remove('show'); setTimeout(resizeIsland,50); return }
  document.getElementById('permCard').classList.add('show')
  document.getElementById('permTool').textContent=card.toolName||'未知操作'
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
</body></html>`;T.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(i)}`),A.info(`Floating island shown`),y=r,e?.cameraEnabled&&te(r,e.cameraDeviceId)}function ae(){E&&=(clearInterval(E),null),D&&=(clearTimeout(D),null),T&&!T.isDestroyed()&&(T.close(),T=null),w(),y=null,re=null}function O(e,t){if(ne=e===`idle`?`idle`:e===`recording`?`recording`:e===`paused`?`paused`:ne,e===`show`||e===`hide`){T&&!T.isDestroyed()&&T.webContents.send(`island-state`,e);return}T&&!T.isDestroyed()&&T.webContents.send(`island-state`,e,t),E&&=(clearInterval(E),null),D&&=(clearTimeout(D),null),e===`recording`&&(E=setInterval(()=>{if(!T||T.isDestroyed())return;let e=d.screen.getCursorScreenPoint(),[t,n]=T.getPosition(),[r,i]=T.getSize();e.x>=t&&e.x<=t+r&&e.y>=n-4&&e.y<=n+i?(D&&=(clearTimeout(D),null),T.webContents.send(`island-state`,`show`)):D||=setTimeout(()=>{T&&!T.isDestroyed()&&T.webContents.send(`island-state`,`hide`),D=null},500)},500))}var k=44,oe=3;function se(e,t){ue();let n=oe,r=n+2,i=d.screen.getPrimaryDisplay().bounds,a=e.y-i.y,o=i.y+i.height-(e.y+e.height),s=k+4,c,u,g,_;a>=s?(_=`top`,c=e.x-r,u=e.y-k-r,g=e.width+r*2):o>=s?(_=`bottom`,c=e.x-r,u=e.y+e.height+r,g=e.width+r*2):(_=`inside`,c=e.x,u=e.y,g=Math.min(e.width,500)),p={...e},m=_,f=new d.BrowserWindow({x:c,y:u,width:g,height:k,frame:!1,transparent:!0,resizable:!1,movable:!1,alwaysOnTop:!0,skipTaskbar:!0,hasShadow:!1,webPreferences:{nodeIntegration:!0,contextIsolation:!1}}),f.setVisibleOnAllWorkspaces(!0),f.setAlwaysOnTop(!0,`screen-saver`);let v=`<!DOCTYPE html>
<html><head><style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;overflow:hidden;font-family:'Segoe UI',system-ui,sans-serif}
.toolbar{
  width:100%;height:${k}px;
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
<div class="toolbar" id="toolbar" data-pos="${_}">
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
  <span class="size-label" id="sizeLabel">${e.width}×${e.height}</span>
  <button class="close-btn" onclick="doClose()" title="关闭并停止录制">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>
  </button>
</div>
<script>
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
</body></html>`;f.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(v)}`);let b=e.x-r,x=e.y-r,S=e.width+r*2,C=e.height+r*2;l=new d.BrowserWindow({x:b,y:x,width:S,height:C,show:!1,frame:!1,transparent:!0,resizable:!1,movable:!1,alwaysOnTop:!0,skipTaskbar:!0,hasShadow:!1,webPreferences:{nodeIntegration:!0,contextIsolation:!1}}),l.setVisibleOnAllWorkspaces(!0),l.setAlwaysOnTop(!0,`screen-saver`),l.setIgnoreMouseEvents(!0),l.setBounds({x:b,y:x,width:S,height:C}),l.show();let ee=`<!DOCTYPE html>
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
</body></html>`;l.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(ee)}`),A.info(`Region border+toolbar shown (split windows):`,e),y=e,t?.cameraEnabled&&te(e,t.cameraDeviceId),l&&!l.isDestroyed()&&l.setAlwaysOnTop(!0,`screen-saver`),f&&!f.isDestroyed()&&f.setAlwaysOnTop(!0,`screen-saver`),h&&!h.isDestroyed()&&h.setAlwaysOnTop(!0,`screen-saver`)}function ce(e,t){f&&!f.isDestroyed()&&(f.webContents.send(`toolbar-state`,e,t,m),(e===`recording`||e===`paused`)&&m===`inside`&&p&&f.setBounds({x:p.x+8,y:p.y+8,width:170,height:40}))}function le(){l&&!l.isDestroyed()&&(l.close(),l=null)}function ue(){le(),f&&!f.isDestroyed()&&(f.close(),f=null),w(),y=null,A.info(`Region border hidden`)}function de(){d.ipcMain.on(`region-selected`,(e,t)=>{A.info(`Region selected:`,t),c(t)}),d.ipcMain.on(`region-cancelled`,()=>{A.info(`Region selection cancelled`),c(null)}),d.ipcMain.handle(`show-region-border`,(e,t,n)=>{se(t,n)}),d.ipcMain.handle(`hide-region-border`,()=>{ue()}),d.ipcMain.handle(`hide-border-only`,()=>{le()}),d.ipcMain.handle(`update-toolbar-state`,(e,t,n)=>{ce(t,n)}),d.ipcMain.on(`toolbar-action`,(e,t)=>{if(A.info(`Toolbar action:`,t),t===`close`){n&&!n.isDestroyed()&&n.webContents.send(`on-toolbar-action`,`close`),ue();return}n&&!n.isDestroyed()&&n.webContents.send(`on-toolbar-action`,t)}),d.ipcMain.removeHandler(`set-mouse-ignore`),d.ipcMain.removeAllListeners(`set-mouse-ignore`),d.ipcMain.handle(`show-floating-island`,(e,t,n)=>{ie(t,n)}),d.ipcMain.handle(`hide-floating-island`,()=>{ae()}),d.ipcMain.handle(`hide-camera-preview`,()=>{w()}),d.ipcMain.handle(`toggle-camera-preview`,(e,t,n)=>{t&&y?te(y,n):w()}),d.ipcMain.on(`camera-drag-start`,()=>C()),d.ipcMain.on(`camera-drag-end`,()=>ee()),d.ipcMain.handle(`set-island-state`,(e,t,n)=>{O(t,n)}),d.ipcMain.on(`island-action`,(e,t)=>{A.info(`Island action:`,t),n&&!n.isDestroyed()&&n.webContents.send(`on-toolbar-action`,t)}),d.ipcMain.on(`resize-island`,(e,t,n)=>{if(T&&!T.isDestroyed()){if(!Number.isFinite(t))return;let e=re||d.screen.getPrimaryDisplay().bounds,r=t+20,i=Math.round(e.x+(e.width-r)/2),a=Number.isFinite(n)?n:44;T.setBounds({x:i,y:e.y+4,width:r,height:a})}})}t.exports={selectRegion:s,showRegionBorder:se,hideRegionBorder:ue,hideBorderOnly:le,updateToolbarState:ce,updateAudioLevels:i,showFloatingIsland:ie,hideFloatingIsland:ae,showCameraPreview:te,hideCameraPreview:w,setFloatingIslandState:O,setMainWindow:r,registerRegionSelectorHandlers:de}})),He=Ve(),Ue=new Map;function We(e=32){let t=Ue.get(e);if(t)return t;try{let t=[(0,u.join)(__dirname,`..`,`..`,`public`,`logo.png`),(0,u.join)(__dirname,`..`,`public`,`logo.png`),(0,u.join)(__dirname,`..`,`..`,`resources`,`logo.png`)];for(let n of t)if(g.default.existsSync(n)){let t=d.nativeImage.createFromPath(n).resize({width:e,height:e,quality:`good`}).toDataURL();return Ue.set(e,t),t}}catch{}return``}j();var P=null,F=null,I=null,L=66,R=240,Ge=`floating-ball-pos.json`;function Ke(){return(0,u.join)(d.app.isPackaged?d.app.getPath(`userData`):(0,u.join)(__dirname,`..`,`..`),Ge)}function qe(){try{let e=g.default.readFileSync(Ke(),`utf-8`),t=JSON.parse(e);if(typeof t.x==`number`&&typeof t.y==`number`)return t}catch{}return null}function Je(e){try{g.default.writeFileSync(Ke(),JSON.stringify(e),`utf-8`)}catch{}}function z(e){if(!(!P||P.isDestroyed())){if(!Number.isFinite(e.x)||!Number.isFinite(e.y)||!Number.isFinite(e.width)||!Number.isFinite(e.height)){A.warn(`Floating ball setBounds skipped (non-finite):`,e);return}P.setBounds(e)}}var Ye=`floating-ball-settings.json`,Xe=[{key:`record`,label:`录屏`,icon:`●`,action:`record`},{key:`music`,label:`音乐`,icon:`♪`,action:`music`},{key:`ai`,label:`AI助手`,icon:`✦`,action:`ai`},{key:`todo`,label:`待办便签`,icon:`☑`,action:`todo`},{key:`settings`,label:`设置`,icon:`⚙`,action:`settings`}],Ze=Xe.map(e=>e.key),Qe={record:!0,music:!0,ai:!0,todo:!0,settings:!0},$e={visible:!0,alwaysOnTop:!0,openAtLogin:!1,menuItems:{...Qe}},et=null;function tt(){return(0,u.join)(d.app.isPackaged?d.app.getPath(`userData`):(0,u.join)(__dirname,`..`,`..`),Ye)}function nt(){try{let e=g.default.readFileSync(tt(),`utf-8`),t=JSON.parse(e),n={...Qe};for(let e of Ze)typeof t?.menuItems?.[e]==`boolean`&&(n[e]=t.menuItems[e]);return{visible:typeof t.visible==`boolean`?t.visible:$e.visible,alwaysOnTop:typeof t.alwaysOnTop==`boolean`?t.alwaysOnTop:$e.alwaysOnTop,openAtLogin:typeof t.openAtLogin==`boolean`?t.openAtLogin:$e.openAtLogin,menuItems:n}}catch{}return{...$e}}function rt(e){try{g.default.writeFileSync(tt(),JSON.stringify(e),`utf-8`)}catch{}}function B(){return et||(et=nt(),et)}function it(e){let t={...B(),...e};return rt(t),et=t,t}function at(){let e=B();return Xe.filter(t=>e.menuItems[t.key])}function ot(){P&&!P.isDestroyed()&&P.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(yt())}`).catch(()=>{})}function st(){F=null;try{g.default.unlinkSync(Ke())}catch{}}function ct(){B().visible&&ft()}function lt(e){P&&!P.isDestroyed()&&P.setAlwaysOnTop(e,`screen-saver`)}function ut(e,t,n){!P||P.isDestroyed()||P.webContents.executeJavaScript(`if(window.updateBadge) updateBadge(${Number(e)||0}, ${!!t}, ${!!n})`).catch(()=>{})}function dt(e){e.visible?ft():pt(),lt(e.alwaysOnTop)}function ft(){if(P&&!P.isDestroyed()){P.show(),P.focus();return}if(!F){let e=qe();if(e)F=e;else{let e=d.screen.getPrimaryDisplay().bounds;F={x:Math.round(e.x+(e.width-L)/2),y:Math.round(e.y+(e.height-L)/2)}}}P=new d.BrowserWindow({x:F.x,y:F.y,width:L,height:L,frame:!1,transparent:!0,backgroundColor:`#00000000`,resizable:!1,alwaysOnTop:B().alwaysOnTop,skipTaskbar:!0,hasShadow:!1,show:!1,webPreferences:{nodeIntegration:!0,contextIsolation:!1}}),P.setVisibleOnAllWorkspaces(!0),P.setAlwaysOnTop(B().alwaysOnTop,`screen-saver`);let e=yt();P.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(e)}`),P.once(`ready-to-show`,()=>{P?.show(),P&&!P.isDestroyed()&&P.webContents.executeJavaScript(`ensureMenu()`).catch(()=>{})});let t=P;P.on(`closed`,()=>{P===t&&(P=null)}),P.on(`move`,()=>{if(!P||P.isDestroyed())return;let[e,t]=P.getPosition(),[n,r]=P.getSize();F={x:Math.round(e+n/2-L/2),y:Math.round(t+r/2-L/2)}}),P.on(`close`,()=>{F&&Je(F)}),P.on(`blur`,()=>{mt&&_t()}),A.info(`Floating ball shown`)}function pt(){if(P&&!P.isDestroyed()){let[e,t]=P.getPosition(),[n,r]=P.getSize();F={x:Math.round(e+n/2-L/2),y:Math.round(t+r/2-L/2)},Je(F);let i=P;P=null,i.destroy(),A.info(`Floating ball hidden`)}}var mt=!1,ht=null;async function gt(){if(!P||P.isDestroyed())return;ht&&=(clearTimeout(ht),null);let[e,t]=P.getPosition(),n=F?F.x:e,r=F?F.y:t,i=Math.round(n+L/2),a=Math.round(r+L/2);A.info(`[Ball] expand at`,[e,t],`center`,[i,a]);let[o]=P.getSize(),s=o!==R;s&&(P.setOpacity(0),z({x:i-R/2,y:a-R/2,width:R,height:R}));try{await P.webContents.executeJavaScript(`restartBloom(); void 0;`)}catch{}if(!(!P||P.isDestroyed())){if(s){try{await P.capturePage()}catch{}if(!P||P.isDestroyed())return;P.setOpacity(1)}mt=!0,P.webContents.send(`ball-state`,`expanded`)}}async function _t(){if(mt=!1,!P||P.isDestroyed())return;if(!F){let[e,t]=P.getPosition();F={x:Math.round(e+R/2-L/2),y:Math.round(t+R/2-L/2)}}let e=F.x,t=F.y;A.info(`[Ball] collapse at`,[e,t]);try{await P.webContents.executeJavaScript(`document.body.classList.remove('expanded'); isExpanded=false; void 0;`)}catch{}!P||P.isDestroyed()||(ht&&clearTimeout(ht),ht=setTimeout(()=>{if(ht=null,!(!P||P.isDestroyed())&&!mt){try{P.webContents.executeJavaScript(`var s=document.getElementById('ringSvg');while(s.firstChild){s.removeChild(s.firstChild)} menuCreated=false; void 0;`)}catch{}!P||P.isDestroyed()||(P.setOpacity(0),z({x:e,y:t,width:L,height:L}),P.setOpacity(1))}},920))}function vt(e){if(e===`record`)process.emit(`clawd-show-record-window`);else if(e===`ai`)process.emit(`clawd-show-ai-window`);else if(e===`todo`)process.emit(`clawd-show-todo-window`);else if(e===`settings`)process.emit(`clawd-show-settings-window`);else{let t=d.BrowserWindow.getAllWindows().find(e=>!e.isDestroyed()&&e!==P);t&&!t.isDestroyed()&&t.webContents.send(`on-floating-ball-action`,e)}_t()}function yt(){return`<!DOCTYPE html>
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
      <img id="logoImg" class="logo-img" src="${We(48)}" alt="logo" />
    </button>
    <!-- 待办数量气泡：悬浮球右上角红色数字胶囊。放在恒 66px 的 .core 内（始终贴球心居中），
         锚点是球而非随展开放大的容器 ⇒ 展开菜单时不偏移；top/right=0 落在窗口内，不会被裁切 -->
    <span id="ballBadge"></span>
  </div>
</div>

<script>
const {ipcRenderer} = require('electron')

const ITEMS = ${JSON.stringify(at())};

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
</html>`}function bt(){d.ipcMain.handle(`show-floating-ball`,()=>{ft()}),d.ipcMain.handle(`hide-floating-ball`,()=>{pt()}),d.ipcMain.handle(`toggle-floating-ball`,()=>{pt()}),d.ipcMain.on(`floating-ball-expand`,()=>{gt()}),d.ipcMain.on(`floating-ball-collapse`,()=>{_t()}),d.ipcMain.on(`floating-ball-action`,(e,t)=>{A.info(`Floating ball action:`,t),vt(t)});let e=null;d.ipcMain.on(`floating-ball-drag-start`,(t,n,r)=>{if(!P||P.isDestroyed())return;let[i,a]=P.getPosition(),[o,s]=P.getSize();I={winX:i,winY:a,scrX:n,scrY:r},e={w:o,h:s}}),d.ipcMain.on(`floating-ball-move`,(t,n,r)=>{if(!P||P.isDestroyed()||!I||!e||!Number.isFinite(n)||!Number.isFinite(r))return;let i=n-I.scrX,a=r-I.scrY,o=Math.round(I.winX+i),s=Math.round(I.winY+a);z({x:o,y:s,width:e.w,height:e.h});let[c,l]=P.getPosition();(c!==o||l!==s)&&z({x:o+(o-c),y:s+(s-l),width:e.w,height:e.h})}),d.ipcMain.on(`floating-ball-drag-end`,()=>{if(I=null,e=null,P&&!P.isDestroyed()){let[e,t]=P.getPosition(),[n,r]=P.getSize(),i=d.screen.getDisplayMatching(P.getBounds()).bounds,a=e,o=t;if(e-i.x<40?a=i.x:i.x+i.width-(e+n)<40&&(a=i.x+i.width-n),t-i.y<40?o=i.y:i.y+i.height-(t+r)<40&&(o=i.y+i.height-r),a!==e||o!==t){z({x:a,y:o,width:n,height:r});let[e,t]=P.getPosition();z({x:a+(a-e),y:o+(o-t),width:n,height:r}),F&&(F={x:a,y:o},Je(F)),A.info(`Floating ball snapped to edge:`,[a,o])}}F&&Je(F)}),d.ipcMain.handle(`get-floating-ball-settings`,()=>B()),d.ipcMain.handle(`set-floating-ball-settings`,(e,t)=>{let n={...B()},r=it(t);if(dt(r),t.openAtLogin!==void 0)try{d.app.setLoginItemSettings({openAtLogin:t.openAtLogin})}catch(e){A.error(`setLoginItemSettings failed:`,e)}return t.menuItems&&JSON.stringify(n.menuItems)!==JSON.stringify(r.menuItems)&&ot(),r}),d.ipcMain.handle(`reset-floating-ball-position`,()=>{if(st(),P&&!P.isDestroyed()){let e=d.screen.getPrimaryDisplay().bounds,t=Math.round(e.x+(e.width-L)/2),n=Math.round(e.y+(e.height-L)/2);mt=!1;try{P.webContents.executeJavaScript(`document.body.classList.remove('expanded'); var s=document.getElementById('ringSvg');if(s){while(s.firstChild){s.removeChild(s.firstChild)}} menuCreated=false; isExpanded=false; void 0;`).catch(()=>{})}catch{}z({x:t,y:n,width:L,height:L}),F={x:t,y:n};let[r,i]=P.getPosition();(r!==t||i!==n)&&z({x:t+(t-r),y:n+(n-i),width:L,height:L})}})}var xt=s(((e,t)=>{j();var n=null;function r(){let e=d.app.isPackaged?(0,u.join)(process.resourcesPath,`logo.ico`):(0,u.join)(__dirname,`../../public/logo.ico`);return d.nativeImage.createFromPath(e).resize({width:16,height:16})}function i(){let e=d.app.isPackaged?(0,u.join)(process.resourcesPath,`logo.png`):(0,u.join)(__dirname,`../../public/logo.png`);return e?d.nativeImage.createFromPath(e).resize({width:64,height:64,quality:`better`}):d.nativeImage.createEmpty()}function a(){if(n&&!n.isDestroyed())return;n=new d.Tray(r()),n.setToolTip(`二支录制`);let e=d.Menu.buildFromTemplate([{label:`显示设置窗口`,click:()=>{process.emit(`clawd-show-settings-window`)}},{type:`separator`},{label:`退出`,click:()=>{let{app:e}=require(`electron`);e.quit()}}]);n.setContextMenu(e),n.on(`click`,()=>{process.emit(`clawd-show-settings-window`)}),A.info(`System tray created`)}function o(e,t){n&&!n.isDestroyed()&&(n.displayBalloon({title:e,content:t,icon:i()}),A.info(`Tray balloon:`,e,t))}function s(){n&&!n.isDestroyed()&&(n.destroy(),n=null)}t.exports={createTray:a,showBalloon:o,destroyTray:s}}))();j();var V=null,H=null,St=!1,Ct=!1,wt=`ai-island-settings.json`,Tt={flat:!1},Et=null;function Dt(){return(0,u.join)(d.app.isPackaged?d.app.getPath(`userData`):(0,u.join)(__dirname,`..`,`..`),wt)}function Ot(){try{let e=g.default.readFileSync(Dt(),`utf-8`),t=JSON.parse(e);return{flat:typeof t.flat==`boolean`?t.flat:Tt.flat}}catch{}return{...Tt}}function kt(e){try{g.default.writeFileSync(Dt(),JSON.stringify(e),`utf-8`)}catch{}}function At(e){V&&!V.isDestroyed()&&V.webContents.send(`ai-island-set-flat`,e.flat)}function jt(){return Et||(Et=Ot(),Et)}function Mt(e){let t={...jt()};return typeof e.flat==`boolean`&&(t.flat=e.flat),kt(t),Et=t,At(t),t}function Nt(){return d.app.isPackaged?f.join(process.resourcesPath,`question-card-utils.js`):f.join(__dirname,`question-card-utils.js`)}function Pt(){return`<!DOCTYPE html>
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
</style></head><body${jt().flat?` class="flat"`:``}>
<div class="island" id="island">
  <div class="island-row" id="islandRow">
    <div class="ai-indicator" id="aiIndicator" onclick="showAiDetail()" title="点击查看详情">
      <span class="ai-dot idle" id="aiDot"></span>
      <span class="ai-label" id="aiLabel">AI 待机</span>
    </div>
  </div>
  <div class="perm-card" id="permCard">
    <div class="perm-banner">
      <span class="perm-banner-dot"></span>
      <span class="perm-banner-text">权限请求</span>
    </div>
    <div class="perm-body">
      <div class="perm-row">
        <span class="perm-row-label">工具</span>
        <span class="perm-tool" id="permTool">—</span>
      </div>
      <div class="perm-row" id="permInputRow" style="display:none">
        <span class="perm-row-label">参数</span>
        <div class="perm-input" id="permInput"></div>
      </div>
    </div>
    <div class="perm-actions">
      <button class="perm-btn allow" onclick="doAllow()">允许</button>
      <button class="perm-btn always" onclick="doAlwaysAllow()">始终允许</button>
      <button class="perm-btn deny" onclick="doDeny()">拒绝</button>
    </div>
  </div>
  <div class="question-card" id="questionCard">
    <div class="question-banner">
      <span class="question-banner-dot"></span>
      <span class="question-banner-text">AI 正在提问</span>
      <span class="question-progress" id="questionProgress"></span>
      <span class="question-close" id="questionClose" onclick="closeQuestion()" title="关闭">✕</span>
    </div>
    <div class="question-body" id="questionBody"></div>
    <div class="question-actions">
      <button class="question-btn" id="questionPrevBtn" onclick="prevQuestion()">上一题</button>
      <button class="question-btn" id="questionBtn" onclick="stepQuestion()">知道了</button>
    </div>
  </div>
</div>
<script>
const __QCU_UTILS_PATH__=${JSON.stringify(Nt())}
const quiz=require(__QCU_UTILS_PATH__)
const {resolveQuestionList,toQuestionItem,buttonLabel,progressText,questionKey,multiSelectOf,withOther,toggleOption,buildAnswers}=quiz
const {ipcRenderer}=require('electron')
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
const aiLabels={idle:'AI 待机',thinking:'AI 思考中',working:'AI 工作中',error:'AI 出错了',notification:'等待审批',done:'任务完成'}
function applyState(data){
  const ind=document.getElementById('aiIndicator'),dot=document.getElementById('aiDot'),lb=document.getElementById('aiLabel')
  if(!data||(data.state==='idle'&&(!data.sessions||!data.sessions.length))){ind.style.display='flex';dot.className='ai-dot idle';lb.textContent='AI 待机';lb.classList.remove('active');setTimeout(resizeIsland,50);return}
  ind.style.display='flex';dot.className='ai-dot '+data.state;lb.textContent=aiLabels[data.state]||'AI '+data.state;lb.classList.toggle('active',data.state!=='idle')
  setTimeout(resizeIsland,50)
}
function applyPermission(data){
  // 权限卡与提问卡互斥：展示权限时收起提问卡，同一时刻只显示一张卡
  document.getElementById('questionCard').classList.remove('show')
  try{
    document.getElementById('permCard').classList.add('show')
    document.getElementById('permTool').textContent=data.toolName||'未知操作'
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
  // 进度：单题隐藏，多题显示「第 X/N 题」
  const prog=document.getElementById('questionProgress')
  const pt=progressText(qIndex,total)
  prog.style.display=pt?'inline':'none'; prog.textContent=pt||''
  const closeEl=document.getElementById('questionClose')
  // 当前题标题
  const t=document.createElement('div');t.className='question-text';t.textContent=view.text
  body.appendChild(t)
  if(answerable){
    // 可作答：选项可点选，末尾按需追加「其他」自由输入；单选/多选依据 multiSelect
    const item=qList[qIndex]
    const multi=multiSelectOf(item)
    const opts=withOther(view.options)
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
        const r=toggleOption(draft.selected,opt.label,multi)
        draft.selected=r.selected
        renderCurrentQuestion()
      })
      body.appendChild(row)
      if(opt.isOther&&draft.selected.has('其他')){
        const inp=document.createElement('input');inp.className='question-other';inp.placeholder='输入其他内容…';inp.value=draft.otherText||''
        inp.addEventListener('click',function(e){e.stopPropagation()})
        inp.addEventListener('input',function(){draft.otherText=inp.value})
        body.appendChild(inp)
        if(multi){
          const h=document.createElement('div');h.className='question-hint';h.textContent='可与其他选项同时选择。'
          body.appendChild(h)
        }
      }
    })
    if(closeEl) closeEl.style.display='inline-block'
    // 末题「提交答案」（回 allow+answers）；非末题「下一题」仅本地推进
    document.getElementById('questionBtn').textContent=(qIndex<total-1)?'下一题':'提交答案'
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
    hint.textContent='请到 Claude Code 界面作答，这里仅作提醒。'
    body.appendChild(hint)
    if(closeEl) closeEl.style.display='none'
    document.getElementById('questionBtn').textContent=buttonLabel(qIndex,total)
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
    const payload=buildAnswers(qList,qDrafts)
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
</body></html>`}function Ft(){if(V&&!V.isDestroyed())return;let e=d.screen.getPrimaryDisplay().bounds;V=new d.BrowserWindow({x:Math.round(e.x+(e.width-200)/2),y:e.y+4,width:200,height:44,frame:!1,transparent:!0,resizable:!1,movable:!1,alwaysOnTop:!0,skipTaskbar:!0,hasShadow:!1,webPreferences:{nodeIntegration:!0,contextIsolation:!1}}),V.setVisibleOnAllWorkspaces(!0),V.setMinimumSize(100,12),V.setAlwaysOnTop(!0,`screen-saver`),V.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(Pt())}`),A.info(`AI island shown`)}function It(){V&&!V.isDestroyed()&&(V.close(),V=null,A.info(`AI island hidden`))}function Lt(){d.ipcMain.handle(`get-ai-island-settings`,()=>jt()),d.ipcMain.handle(`set-ai-island-settings`,(e,t)=>Mt(t)),d.ipcMain.on(`resize-ai-island`,(e,t,n)=>{if(!V||V.isDestroyed()||!Number.isFinite(t))return;let r=t+20,i=Number.isFinite(n)?n:44;if(!(!Number.isFinite(r)||!Number.isFinite(i)))if(jt().flat){let e=d.screen.getDisplayMatching(V.getBounds()).bounds,n=Math.round(e.x+(e.width-t)/2);if(!Number.isFinite(n))return;V.setBounds({x:n,y:e.y,width:t,height:i})}else if(St){let[e,t]=V.getPosition();if(!Number.isFinite(e)||!Number.isFinite(t))return;V.setBounds({x:e,y:t,width:r,height:i})}else{let e=d.screen.getPrimaryDisplay().bounds,t=Math.round(e.x+(e.width-r)/2),n=e.y+4;if(!Number.isFinite(t)||!Number.isFinite(n))return;V.setBounds({x:t,y:n,width:r,height:i})}}),d.ipcMain.on(`ai-island-drag-start`,(e,t,n)=>{if(!V||V.isDestroyed()||!Number.isFinite(t)||!Number.isFinite(n))return;let[r,i]=V.getPosition();H={winX:r,winY:i,scrX:t,scrY:n}}),d.ipcMain.on(`ai-island-drag-move`,(e,t,n)=>{if(!V||V.isDestroyed()||!H||!Number.isFinite(t)||!Number.isFinite(H.scrX)||!Number.isFinite(H.winX)||!Number.isFinite(H.winY))return;let r=t-H.scrX,i=Math.round(H.winX+r);if(!Number.isFinite(i))return;let[a,o]=V.getSize();V.setBounds({x:i,y:H.winY,width:a,height:o})}),d.ipcMain.on(`ai-island-drag-end`,()=>{H=null,jt().flat||(St=!0)}),d.ipcMain.on(`set-ai-island-mouse-mode`,(e,t)=>{if(!V||V.isDestroyed())return;let n=!t;n!==Ct&&(Ct=n,V.setIgnoreMouseEvents(n,{forward:!0}))})}var Rt={info:()=>{},warn:()=>{},error:()=>{}},zt=null,Bt=`todo-notes.json`,Vt=`todo-settings.json`;function Ht(){if(zt)return zt;let{app:e}=require(`electron`);return e.getPath(`userData`)}function Ut(){return(0,u.join)(Ht(),Bt)}function Wt(){return(0,u.join)(Ht(),Vt)}function Gt(){try{let e=g.readFileSync(Ut(),`utf-8`),t=JSON.parse(e);if(Array.isArray(t.items))return{items:t.items.filter(e=>e&&typeof e.id==`string`),meta:{schemaVersion:t.meta?.schemaVersion??1}}}catch{}return{items:[],meta:{schemaVersion:1}}}function U(){return Gt().items}function Kt(e){let t=Ut(),n=t+`.tmp`;try{g.writeFileSync(n,JSON.stringify(e,null,2),`utf-8`),g.renameSync(n,t)}catch{try{g.writeFileSync(t,JSON.stringify(e,null,2),`utf-8`)}catch(e){Rt.error(`todo store save failed:`,e?.message??e)}}}function qt(e){Kt({items:e,meta:{schemaVersion:1}})}function Jt(e){let t=U(),n=Date.now(),r={id:(0,b.randomUUID)(),type:e.type,title:e.title??``,content:e.content??``,priority:e.priority??`medium`,reminder:e.reminder??null,reminderFired:!1,done:e.done??!1,pinned:!1,pinX:null,pinY:null,createdAt:n,updatedAt:n};return t.unshift(r),qt(t),t}function Yt(e,t){let n=U(),r=n.find(t=>t.id===e);return r?(Object.assign(r,t,{updatedAt:Date.now()}),qt(n),n):n}function Xt(e,t){let n=U(),r=n.find(t=>t.id===e);return r?(t.reminder!==void 0&&t.reminder!==r.reminder&&(r.reminderFired=!1),Object.assign(r,t,{updatedAt:Date.now()}),qt(n),n):n}function Zt(e){let t=U().filter(t=>t.id!==e);return qt(t),t}function Qt(e){let t=U(),n=t.find(t=>t.id===e);return n&&n.type===`todo`&&(n.done=!n.done,n.updatedAt=Date.now(),qt(t)),t}function $t(e){return Yt(e,{reminderFired:!0})}function en(e,t){let n=U(),r=n.find(t=>t.id===e);return r?(r.pinned=!r.pinned,r.pinned&&t&&(r.pinX=Math.round(t.x),r.pinY=Math.round(t.y)),r.updatedAt=Date.now(),qt(n),n):n}function tn(e){return e.filter(e=>e.type===`todo`&&!e.done).length}var nn={badgeVisible:!0,windowAlwaysOnTop:!0,stickyBoardPos:null};function rn(){try{let e=JSON.parse(g.readFileSync(Wt(),`utf-8`));return{badgeVisible:typeof e.badgeVisible==`boolean`?e.badgeVisible:nn.badgeVisible,windowAlwaysOnTop:typeof e.windowAlwaysOnTop==`boolean`?e.windowAlwaysOnTop:nn.windowAlwaysOnTop,stickyBoardPos:e.stickyBoardPos&&typeof e.stickyBoardPos.x==`number`&&typeof e.stickyBoardPos.y==`number`?{x:e.stickyBoardPos.x,y:e.stickyBoardPos.y}:null}}catch{return{...nn}}}function an(e){let t={...rn(),...e};try{g.writeFileSync(Wt(),JSON.stringify(t,null,2),`utf-8`)}catch(e){Rt.error(`todo settings save failed:`,e?.message??e)}return t}var on=!1;function W(){let e=tn(U()),t=rn().badgeVisible;ut(e,on,t)}function sn(e){on=e,W()}function cn(){sn(!1)}function ln(){d.ipcMain.on(`floating-ball-badge-ready`,()=>{W()})}j();var G=null;function un(){let e=d.app.isPackaged?(0,u.join)(process.resourcesPath,`logo.ico`):(0,u.join)(__dirname,`..`,`..`,`public`,`logo.ico`);return d.nativeImage.createFromPath(e)}function dn(){if(G&&!G.isDestroyed()){G.show(),G.focus(),cn();return}let e=process.env.VITE_DEV_SERVER_URL,t=(0,u.join)(__dirname,`..`,`preload`,`index.cjs`);G=new d.BrowserWindow({icon:un(),width:525,height:450,minWidth:320,minHeight:360,show:!1,skipTaskbar:!1,frame:!1,titleBarStyle:`hidden`,title:`待办便签`,backgroundColor:`#eaeaec`,webPreferences:{preload:t,contextIsolation:!0,nodeIntegration:!1,sandbox:!1}}),G.setAlwaysOnTop(rn().windowAlwaysOnTop,`normal`),e?G.loadURL(`${e}#/todo?t=${Date.now()}`):G.loadFile((0,u.join)(process.env.DIST,`index.html`),{hash:`/todo`}),G.once(`ready-to-show`,()=>{G?.show()}),G.on(`closed`,()=>{G=null}),cn(),A.info(`Todo window shown`)}function fn(){G&&!G.isDestroyed()&&G.close(),G=null}function pn(){return!!(G&&!G.isDestroyed())}function mn(){let e=!rn().windowAlwaysOnTop;return an({windowAlwaysOnTop:e}),G&&!G.isDestroyed()&&G.setAlwaysOnTop(e,`normal`),e}function hn(e){if(dn(),!G||G.isDestroyed())return;let t=()=>{G&&!G.isDestroyed()&&G.webContents.send(`todo-focus-item`,e)};G.webContents.isLoading()?G.webContents.once(`did-finish-load`,t):t()}function gn(e){if(!G||G.isDestroyed())return;let t=()=>{G&&!G.isDestroyed()&&G.webContents.send(`todo-data-changed`,e)};G.webContents.isLoading()?G.webContents.once(`did-finish-load`,t):t()}j();var K=null;function _n(e,t){let n=We(32);return`<!DOCTYPE html><html><head><meta charset="utf-8"><style>
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
      <div class="ring">到点了</div>
      <button class="close" title="关闭" onclick="ipc.send('todo-reminder-close')">✕</button>
    </div>
  </div>
  <div class="body">
    <div class="t">${vn(e)||`待办提醒`}</div>
    <div class="b">${vn(t)||`到时间了，记得处理一下。`}</div>
    <div class="foot"><button class="open" onclick="ipc.send('todo-reminder-open')">打开待办</button></div>
  </div>
</div>
<script>
const {ipcRenderer} = require('electron')
window.ipc = ipcRenderer
<\/script></body></html>`}function vn(e){return String(e).replace(/&/g,`&amp;`).replace(/</g,`&lt;`).replace(/>/g,`&gt;`).replace(/"/g,`&quot;`)}var yn=[];function bn(e,t){yn.push({title:e,body:t}),xn()}function xn(){if(K&&!K.isDestroyed())return;let e=yn.shift();e&&Sn(e.title,e.body)}function Sn(e,t){let n=d.screen.getPrimaryDisplay().workArea;K=new d.BrowserWindow({x:n.x+n.width-300-16,y:n.y+n.height-150-16,width:300,height:150,frame:!1,transparent:!0,backgroundColor:`#00000000`,resizable:!1,movable:!1,alwaysOnTop:!0,skipTaskbar:!0,hasShadow:!1,show:!1,webPreferences:{nodeIntegration:!0,contextIsolation:!1}}),K.setAlwaysOnTop(!0,`screen-saver`),K.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(_n(e,t))}`),K.once(`ready-to-show`,()=>K?.show()),K.on(`closed`,()=>{K=null,xn()}),A.info(`Todo reminder popup shown`)}function Cn(){K&&!K.isDestroyed()&&K.destroy()}function wn(){yn.length=0,K&&!K.isDestroyed()&&K.destroy(),K=null}function Tn(e){return e?String(e).replace(/<img[^>]*alt=["']([^"']*)["'][^>]*>/gi,(e,t)=>t||`[图]`).replace(/<img[^>]*>/gi,`[图]`).replace(/<br\s*\/?>/gi,` `).replace(/<\/(p|div|h[1-6]|li|blockquote)>/gi,` `).replace(/<[^>]+>/gi,``).replace(/&nbsp;/g,` `).replace(/&amp;/g,`&`).replace(/&lt;/g,`<`).replace(/&gt;/g,`>`).replace(/&quot;/g,`"`).replace(/&#39;/g,`'`).replace(/\s+/g,` `).trim():``}var En=208,Dn=120,q=null,On=0;function kn(){return U().filter(e=>e.pinned).map(e=>{let t=Tn(e.content).trim(),n=e.type===`memo`?Tn(e.title).trim():``;return{id:e.id,type:e.type,title:n||t,body:n?t:``,done:e.done,priority:e.priority}})}function An(){let e=d.screen.getPrimaryDisplay().workArea;return{x:e.x+e.width-En-16,y:e.y+e.height-Dn-16}}function jn(){return`<!DOCTYPE html><html><head><meta charset="utf-8"><style>
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
    <img class="logo" src="${We(28)}">
    <div class="brand">MUERZHI</div>
    <div class="counter" id="counter"></div>
    <button class="close" title="取消贴屏" onclick="act('unpin')">✕</button>
  </div>
  <div class="note" id="note" onclick="act('open')">
    <div class="accent" id="accent"></div>
    <div class="in">
      <div class="t" id="t"></div>
      <div class="b" id="b"></div>
      <div class="open-hint">点击打开</div>
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
  t.textContent = n.title || '（无内容）'
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
<\/script></body></html>`}function Mn(){let e=rn().stickyBoardPos??An();q=new d.BrowserWindow({x:e.x,y:e.y,width:En,height:Dn,frame:!1,transparent:!0,backgroundColor:`#00000000`,resizable:!1,alwaysOnTop:!0,skipTaskbar:!0,hasShadow:!1,show:!1,webPreferences:{nodeIntegration:!0,contextIsolation:!1}}),q.setAlwaysOnTop(!0,`screen-saver`),q.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(jn())}`),q.once(`ready-to-show`,()=>{q&&!q.isDestroyed()&&(q.show(),Nn())}),q.on(`move`,()=>{if(!q||q.isDestroyed())return;let[e,t]=q.getPosition();J&&clearTimeout(J),J=setTimeout(()=>{J=null,an({stickyBoardPos:{x:e,y:t}})},300)}),q.on(`closed`,()=>{q=null})}var J=null;function Y(){let e=kn();if(e.length===0){q&&!q.isDestroyed()&&q.destroy(),q=null;return}On=Math.max(0,Math.min(On,e.length-1)),!q||q.isDestroyed()?Mn():Nn()}function Nn(){let e=kn();!q||q.isDestroyed()||q.webContents.executeJavaScript(`if(window.renderNotes) renderNotes(${JSON.stringify(e)}, ${On})`).catch(()=>{})}function Pn(){J&&=(clearTimeout(J),null),q&&!q.isDestroyed()&&q.destroy(),q=null}j();var{updateAudioLevels:Fn}=Ve();function In(){return(0,u.join)(d.app.getPath(`userData`),`recordings.json`)}function Ln(e){(0,He.registerRegionSelectorHandlers)(),bt(),Lt(),d.ipcMain.handle(`show-ai-island`,()=>{Ft()}),d.ipcMain.handle(`hide-ai-island`,()=>{It()}),d.ipcMain.handle(`select-region`,async()=>(0,He.selectRegion)()),d.ipcMain.handle(`get-sources`,async(e,t)=>(await d.desktopCapturer.getSources({types:t??[`screen`,`window`],thumbnailSize:{width:340,height:200},fetchWindowIcons:!0})).map(e=>({id:e.id,name:e.name,display_id:e.display_id,appIcon:e.appIcon?.toDataURL()||null,thumbnail:e.thumbnail.toDataURL()}))),d.ipcMain.handle(`get-system-audio-sources`,async()=>{try{return(await d.desktopCapturer.getSources({types:[`audio`]})).map(e=>({id:e.id,name:e.name}))}catch{return[]}}),d.ipcMain.handle(`show-save-dialog`,async(e,t)=>{let n=d.BrowserWindow.getFocusedWindow();return n?d.dialog.showSaveDialog(n,{title:t?.title??`Save Recording`,defaultPath:t?.defaultPath??`recording-${Date.now()}.webm`,filters:t?.filters??[{name:`WebM Video`,extensions:[`webm`]},{name:`MP4 Video`,extensions:[`mp4`]},{name:`GIF`,extensions:[`gif`]}]}):{canceled:!0,filePath:null}}),d.ipcMain.handle(`show-open-dialog`,async(e,t)=>{let n=d.BrowserWindow.getFocusedWindow();return n?d.dialog.showOpenDialog(n,{title:t?.title??`Select File`,defaultPath:t?.defaultPath,filters:t?.filters??[{name:`Video Files`,extensions:[`webm`,`mp4`,`gif`]}],properties:t?.properties}):{canceled:!0,filePaths:[]}}),d.ipcMain.handle(`get-default-save-dir`,async()=>d.app.getPath(`videos`)||d.app.getPath(`desktop`)),d.ipcMain.handle(`write-file`,async(e,t,n)=>{try{return await g.default.promises.mkdir((0,u.dirname)(n),{recursive:!0}),await g.default.promises.writeFile(n,t),A.info(`保存文件`,n),{success:!0,filePath:n}}catch(e){return A.error(`保存文件失败`,n,e.message),{success:!1,filePath:n,error:e.message}}}),d.ipcMain.handle(`read-file`,async(e,t)=>{try{return(await g.default.promises.readFile(t)).buffer}catch(e){throw Error(`Failed to read file: ${e.message}`)}}),d.ipcMain.handle(`file-exists`,async(e,t)=>{try{return await g.default.promises.access(t),!0}catch{return!1}}),d.ipcMain.handle(`delete-file`,async(e,t)=>{try{return await g.default.promises.unlink(t),!0}catch{return!1}}),d.ipcMain.handle(`get-file-size`,async(e,t)=>{try{return(await g.default.promises.stat(t)).size}catch{return 0}});function t(e,t,...n){if(!(!e||e.isDestroyed()))try{e.webContents.send(t,...n)}catch{}}d.ipcMain.handle(`convert-to-mp4`,async(e,n,r,i)=>{A.info(`转换为 MP4`,n,`->`,r,i?`crop: ${i.width}x${i.height}`:``);let a=d.BrowserWindow.fromWebContents(e.sender);return Le(n,r,e=>{t(a,`on-conversion-progress`,e)},i)}),d.ipcMain.handle(`crop-video`,async(e,n,r,i)=>{A.info(`裁剪视频`,n,`->`,r,`crop: ${i.width}x${i.height}+${i.x}+${i.y}`);let a=d.BrowserWindow.fromWebContents(e.sender);return Re(n,r,i,e=>{t(a,`on-conversion-progress`,e)})}),d.ipcMain.handle(`convert-to-gif`,async(e,n,r,i)=>{A.info(`转换为 GIF`,n,`->`,r);let a=d.BrowserWindow.fromWebContents(e.sender);return Be(n,r,i,e=>{t(a,`on-conversion-progress`,e)})}),d.ipcMain.handle(`merge-multi-screen`,async(e,n,r)=>{A.info(`合并多屏录制`,n.length,`个屏幕 ->`,r);let i=d.BrowserWindow.fromWebContents(e.sender);return ze(n,r,e=>{t(i,`on-conversion-progress`,e)})}),d.ipcMain.handle(`open-file-location`,async(e,t)=>{d.shell.showItemInFolder(t)}),d.ipcMain.handle(`open-external`,async(e,t)=>{d.shell.openExternal(t)}),d.ipcMain.handle(`open-path`,async(e,t)=>{await d.shell.openPath(t)}),d.ipcMain.handle(`get-app-version`,async()=>d.app.getVersion()),d.ipcMain.handle(`get-screen-scale-factor`,async()=>d.screen.getPrimaryDisplay().scaleFactor),d.ipcMain.handle(`get-screen-bounds`,async()=>{let e=d.screen.getPrimaryDisplay(),t=e.scaleFactor;return{x:Math.round(e.bounds.x/t),y:Math.round(e.bounds.y/t),width:Math.round(e.bounds.width/t),height:Math.round(e.bounds.height/t)}}),d.ipcMain.handle(`take-screenshot`,async e=>{try{let e=await d.desktopCapturer.getSources({types:[`screen`],thumbnailSize:{width:0,height:0}});if(!e.length)throw Error(`未找到屏幕源`);let t=e[0].thumbnail.toPNG(),n=new Date,r=`截图_${n.getFullYear()}${String(n.getMonth()+1).padStart(2,`0`)}${String(n.getDate()).padStart(2,`0`)}_${String(n.getHours()).padStart(2,`0`)}${String(n.getMinutes()).padStart(2,`0`)}${String(n.getSeconds()).padStart(2,`0`)}.png`,i=(0,u.join)(d.app.getPath(`desktop`),r);return await g.default.promises.writeFile(i,t),(0,xt.showBalloon)(`二支录制`,`截图已保存到桌面：${r}`),{success:!0,filePath:i}}catch(e){return A.error(`截图失败`,e.message),{success:!1,error:e.message}}}),d.ipcMain.handle(`get-all-displays`,async()=>{let e=d.screen.getAllDisplays(),t=d.screen.getPrimaryDisplay(),n=await d.desktopCapturer.getSources({types:[`screen`],thumbnailSize:{width:340,height:200}});return e.map((e,r)=>{let i=n[r];return{id:e.id,label:e.id===t.id?`主屏幕`:`屏幕 ${r+1}`,bounds:e.bounds,scaleFactor:e.scaleFactor,size:{width:e.size.width,height:e.size.height},isPrimary:e.id===t.id,sourceId:i?.id||null,sourceName:i?.name||``,thumbnail:i?.thumbnail?.toDataURL()||``}})}),d.ipcMain.handle(`minimize-window`,async e=>{d.BrowserWindow.fromWebContents(e.sender)?.minimize()}),d.ipcMain.handle(`show-window`,async e=>{let t=d.BrowserWindow.fromWebContents(e.sender);t&&(t.show(),t.focus())}),d.ipcMain.handle(`maximize-window`,async e=>{let t=d.BrowserWindow.fromWebContents(e.sender);t?.isMaximized()?t.unmaximize():t?.maximize()}),d.ipcMain.handle(`close-window`,async e=>{let t=d.BrowserWindow.fromWebContents(e.sender);t&&t.hide()}),d.ipcMain.on(`notify-conversion-start`,()=>{(0,xt.showBalloon)(`二支录制`,`录制完成，正在转换视频格式...`)}),d.ipcMain.on(`show-about-window`,()=>{let e=d.BrowserWindow.getFocusedWindow();if(e){let t=new d.BrowserWindow({width:360,height:400,resizable:!1,skipTaskbar:!0,frame:!1,modal:!0,parent:e,backgroundColor:`#eaeaec`,webPreferences:{preload:(0,u.join)(__dirname,`..`,`preload`,`index.cjs`),contextIsolation:!0,nodeIntegration:!1,sandbox:!1}});d.ipcMain.on(`close-about-window`,()=>{t.close(),d.ipcMain.removeAllListeners(`close-about-window`)}),t.on(`closed`,()=>{d.ipcMain.removeAllListeners(`close-about-window`)});let n=process.env.VITE_DEV_SERVER_URL?`${process.env.VITE_DEV_SERVER_URL}about.html`:(0,u.join)(d.app.getAppPath(),`dist`,`about.html`);n.startsWith(`http`)?t.loadURL(n):t.loadFile(n)}}),d.ipcMain.on(`notify-conversion-done`,()=>{(0,xt.showBalloon)(`二支录制`,`视频转换完成！`)}),d.ipcMain.on(`update-audio-levels`,(e,t,n)=>{Fn(t,n)}),d.ipcMain.handle(`load-recordings`,async()=>{let e=In();try{let t=await g.default.promises.readFile(e,`utf-8`),n=JSON.parse(t);return A.info(`加载录制历史`,e,n.length,`条`),n}catch(t){return A.info(`加载录制历史失败（可能首次运行）`,e,t.message),[]}}),d.ipcMain.handle(`save-recordings`,async(e,t)=>{let n=In();try{return await g.default.promises.writeFile(n,JSON.stringify(t),`utf-8`),A.info(`保存录制历史`,n,t.length,`条`),!0}catch(e){return A.error(`保存录制历史失败`,n,e.message),!1}}),e&&(e.setStateListener((e,t)=>{(e!==`idle`||t&&t.length>0)&&Ft();let n=d.BrowserWindow.getAllWindows();for(let r of n)if(!r.isDestroyed())try{r.webContents.send(`agent-state-update`,{state:e,sessions:t})}catch{}}),e.setCardListener(e=>{e&&Ft();let t;t=e?e.kind===`permission`?{kind:`permission`,sessionId:e.sessionId,toolName:e.toolName,toolInput:e.toolInput,suggestions:e.suggestions,createdAt:e.createdAt}:{kind:`question`,sessionId:e.sessionId,toolName:e.toolName,toolInput:e.toolInput,questions:e.questions,answerable:e.answerable,createdAt:e.createdAt}:null,A.info(`[IPC] broadcast card: kind=${e?e.kind:`null`}, wins=${d.BrowserWindow.getAllWindows().length}`);let n=d.BrowserWindow.getAllWindows();for(let e of n)if(!e.isDestroyed())try{e.webContents.send(`agent-card-update`,t)}catch(e){A.error(`[IPC] send card to window failed: ${e.message}`)}}),d.ipcMain.handle(`agent-get-status`,()=>{let t=e?.getStatus()??null;return A.info(`[IPC] agentGetStatus: sessionCount=${t?.sessionCount}, displayState=${t?.displayState}, serverRunning=${t?.serverRunning}`),t}),d.ipcMain.handle(`agent-install-hooks`,()=>(e?.installHooks(),e?.getStatus())),d.ipcMain.handle(`agent-uninstall-hooks`,()=>(e?.uninstallHooks(),e?.getStatus())),d.ipcMain.handle(`agent-resolve-permission`,(t,n)=>e?.resolvePermission(n)),d.ipcMain.handle(`agent-dismiss-question`,()=>e?.dismissQuestion()),d.ipcMain.handle(`agent-submit-question`,(t,n,r)=>e?.submitQuestion(n,r)),d.ipcMain.handle(`agent-set-auto-allow`,(t,n)=>e?.setAutoAllow(n)),d.ipcMain.handle(`agent-get-auto-allow`,()=>e?.getAutoAllow()??!1)),Rn()}function Rn(){d.ipcMain.handle(`todo-get`,()=>U()),d.ipcMain.handle(`todo-create`,(e,t)=>{let n=Jt(t);return W(),Y(),n}),d.ipcMain.handle(`todo-update`,(e,t,n)=>{let r=Xt(t,n);return W(),Y(),r}),d.ipcMain.handle(`todo-delete`,(e,t)=>{let n=Zt(t);return W(),Y(),n}),d.ipcMain.handle(`todo-toggle-done`,(e,t)=>{let n=Qt(t);return W(),Y(),n}),d.ipcMain.handle(`todo-toggle-pin`,(e,t)=>{let n=en(t);return Y(),W(),n}),d.ipcMain.handle(`todo-show-window`,()=>{dn()}),d.ipcMain.handle(`todo-close-window`,()=>{fn()}),d.ipcMain.handle(`todo-window-visible`,()=>pn()),d.ipcMain.handle(`todo-toggle-always-on-top`,()=>mn()),d.ipcMain.handle(`todo-get-settings`,()=>rn()),d.ipcMain.handle(`todo-set-settings`,(e,t)=>{let n=an(t);return W(),n}),d.ipcMain.on(`todo-reminder-close`,()=>{Cn()}),d.ipcMain.on(`todo-reminder-open`,()=>{wn(),dn()}),d.ipcMain.on(`todo-sticky-open`,(e,t)=>{hn(t)}),d.ipcMain.on(`todo-sticky-unpin`,(e,t)=>{en(t),Y(),W(),gn(U())})}j();var zn=null;function Bn(e){zn=e,d.globalShortcut.register(`CommandOrControl+Shift+R`,()=>{A.info(`Global shortcut: start/stop recording`),zn?.webContents.send(`on-global-shortcut`,`startStop`)}),d.globalShortcut.register(`CommandOrControl+Shift+P`,()=>{A.info(`Global shortcut: pause/resume recording`),zn?.webContents.send(`on-global-shortcut`,`pauseResume`)}),A.info(`Global shortcuts registered`)}function Vn(){d.globalShortcut.unregisterAll()}j();var Hn=`http://8.163.43.7:3000/report-ip`;function X(){return(0,u.join)(d.app.getPath(`userData`),`pending-reports.json`)}function Un(e){let t=[];try{g.default.existsSync(X())&&(t=JSON.parse(g.default.readFileSync(X(),`utf-8`)))}catch{}t.push(e),g.default.writeFileSync(X(),JSON.stringify(t,null,2),`utf-8`),A.info(`Saved offline report to local, total pending:`,t.length)}function Wn(){try{if(g.default.existsSync(X()))return JSON.parse(g.default.readFileSync(X(),`utf-8`))}catch{}return[]}function Gn(){try{g.default.unlinkSync(X())}catch{}}async function Kn(e){try{return await fetch(Hn,{method:`POST`,headers:{"Content-Type":`application/json`},body:JSON.stringify(e)}),!0}catch{return!1}}async function qn(){let e=Wn();if(e.length===0)return!0;let t=[];for(let n of e)await Kn(n)?A.info(`Flushed pending report:`,n.公网IP,n.上报时间):t.push(n);return t.length===0?(Gn(),A.info(`All pending reports flushed`),!0):(g.default.writeFileSync(X(),JSON.stringify(t,null,2),`utf-8`),!1)}async function Jn(){let e=[async()=>{let e=(await fetch(`https://qifu.baidu.com/opus/api/ip/local`,{headers:{Referer:`https://www.baidu.com`}}).then(e=>e.json()))?.data;if(!e?.ip)throw Error(`empty`);return{公网IP:e.ip,国家:e.country||``,省份:e.province||``,城市:e.city||``,区县:e.district||e.area||``,详细地址:[e.country,e.province,e.city,e.district||e.area].filter(Boolean).join(``),运营商:e.isp||``}},async()=>{let e=await fetch(`http://whois.pconline.com.cn/ipJson.jsp`).then(e=>e.arrayBuffer()),t=new TextDecoder(`gbk`).decode(e),n=JSON.parse(t);if(!n.ip)throw Error(`empty`);return{公网IP:n.ip,国家:`中国`,省份:n.pro||``,城市:n.city||``,区县:n.region||``,详细地址:n.addr||``,运营商:n.addr?.split(` `)?.[1]||``}},async()=>{let e=await fetch(`http://ip-api.com/json/?lang=zh-CN`).then(e=>e.json());if(!e.query)throw Error(`empty`);return{公网IP:e.query,国家:e.country,省份:e.regionName,城市:e.city,区县:``,详细地址:`${e.country}${e.regionName}${e.city}`,运营商:e.isp,纬度:String(e.lat??``),经度:String(e.lon??``)}}];for(let t of e)try{return await t()}catch{continue}return{公网IP:``,国家:``,省份:``,城市:``,区县:``,详细地址:``,运营商:``}}function Yn(){let e=(0,y.networkInterfaces)();for(let t of Object.keys(e))for(let n of e[t])if(n.family===`IPv4`&&!n.internal)return n.address;return`127.0.0.1`}async function Xn(){let e=Yn(),t={电脑名:(0,y.hostname)(),局域网IP:e,上报时间:new Date().toISOString()},n;try{n=await Jn()}catch{n={公网IP:``,国家:``,省份:``,城市:``,区县:``,详细地址:``,运营商:``}}let r={...t,...n};await Kn(r)?(A.info(`IP reported:`,n.公网IP,n.省份,n.城市),qn()):(A.info(`Network unavailable, saving report locally`),Un(r))}function Zn(){Wn().length>0&&qn()}j();var Qn={error:4,notification:3,working:2,thinking:1,idle:0},$n=600*1e3,er=300*1e3,tr=10*1e3,nr=2e3;function rr(){let e=new Map,t=null,n=[],r=null,i=`idle`;function a(e){return n.push(e),()=>{n=n.filter(t=>t!==e)}}function o(){let t=l(),r=Array.from(e.values());t!==i&&(i=t);for(let e of n)e(i,r)}function s(t,n,i,a={}){r&&=(clearTimeout(r),null);let s=e.get(t),c={sessionId:t,agentId:a.agentId||`claude-code`,state:n,event:i,updatedAt:Date.now(),toolName:a.toolName||s?.toolName,toolInput:a.toolInput||s?.toolInput,contextUsage:a.contextUsage||s?.contextUsage,model:a.model||s?.model};e.set(t,c),A.info(`[StateMachine] updateSession: id=${t}, state=${n}, event=${i}, total=${e.size}`),n===`idle`&&i===`Stop`&&(r=setTimeout(()=>{if(r=null,e.has(t)){let n=e.get(t);n.state=`idle`,n.updatedAt=Date.now()}A.info(`[StateMachine] doneTimer fired for ${t}, total=${e.size}`),o()},nr)),o()}function c(t){e.delete(t),o()}function l(){let t=`idle`;for(let[,n]of e)(Qn[n.state]??0)>(Qn[t]??0)&&(t=n.state);return r&&t===`idle`?`done`:t}function u(){return i}function d(){let t=[];for(let[,n]of e)t.push(n);return t}function f(){let t=Date.now(),n=!1;for(let[r,i]of e){let a=t-i.updatedAt;a>$n?(e.delete(r),A.info(`[StateMachine] cleanStale: removed ${r} (age=${Math.round(a/1e3)}s)`),n=!0):i.state!==`idle`&&a>er&&(i.state=`idle`,i.updatedAt=t,A.info(`[StateMachine] cleanStale: reset ${r} to idle (age=${Math.round(a/1e3)}s)`),n=!0)}n&&o()}function p(){t||=setInterval(f,tr)}function m(){t&&=(clearInterval(t),null),r&&=(clearTimeout(r),null)}return{updateSession:s,dismissSession:c,resolveDisplayState:l,getCurrentState:u,getSessions:d,subscribe:a,cleanStaleSessions:f,start:p,stop:m}}function ir(e){return e==null?`null`:typeof e==`object`?Array.isArray(e)?`[`+e.map(ir).join(`,`)+`]`:`{`+Object.keys(e).sort().map(t=>JSON.stringify(t)+`:`+ir(e[t])).join(`,`)+`}`:JSON.stringify(e)}function ar(e,t,n){let r=n?.tool_use_id||n?.toolUseId||null,i=n?.tool_name||n?.toolName||null,a=i!=null&&i!==``?ir(n?.tool_input??n?.toolInput??null):null;for(let n=0;n<e.length;n++){let o=e[n];if(o.kind===`permission`&&o.sessionId===t&&(r&&o.toolUseId&&o.toolUseId===r||a!=null&&o.toolName===i&&ir(o.toolInput??null)===a))return n}return-1}j();var or=6e4,sr=60019,cr=12e4,lr=null;function ur(){return lr||(lr=f.join(require(`os`).homedir(),`.erzhi-recording`),lr)}function dr(e){let t=null,n=null,r=[],i=null,a=null,o=[`PostToolUse`,`PostToolUseFailure`,`Stop`,`StopFailure`,`SessionEnd`,`ApiError`],s=[`PostToolUse`,`PostToolUseFailure`,`PermissionDenied`],c=[`Stop`,`StopFailure`,`SessionEnd`];class l extends Error{code=`PAYLOAD_TOO_LARGE`}function u(e){return new Promise((t,n)=>{let r=``;e.on(`data`,t=>{if(r+=t,Buffer.byteLength(r)>1048576){try{e.destroy()}catch{}n(new l(`Body exceeds 1MB limit`))}}),e.on(`end`,()=>{try{t(JSON.parse(r))}catch{n(Error(`Invalid JSON`))}}),e.on(`error`,n)})}function d(e,t,n){e.writeHead(t,{"Content-Type":`application/json`}),e.end(JSON.stringify(n))}function p(e,t){try{!e.headersSent&&!e.destroyed&&!e.writableEnded&&(e.writeHead(200,{"Content-Type":`application/json`}),e.end(t))}catch{}}function g(){return r[0]??null}function _(e){let t=g();t&&((t.kind===`permission`||t.answerable)&&t.reject(e),v())}function v(){r.shift(),clearTimeout(i),i=null,y(),b()}function y(){if(i&&clearTimeout(i),!r.length){i=null;return}i=setTimeout(()=>{i=null,_(`timeout`)},cr)}function b(){a&&a(g())}function x(e){let t=r.length,n=[],a=r.filter(t=>t.kind===`question`&&t.sessionId===e?(n.push(t),!1):!0);if(a.length!==t){r=a;for(let e of n)e.kind===`question`&&e.answerable&&e.reject(`completed`);clearTimeout(i),i=null,y(),b()}}function S(e,t){let n=ar(r,e,t);if(n===-1)return;let[a]=r.splice(n,1);a.reject(`resolved-in-cli`),clearTimeout(i),i=null,y(),b(),A.info(`[AgentServer] permission resolved externally (CLI): session=${e}, tool=${a.toolName}`)}function C(e){let t=r.length,n=[],a=r.filter(t=>t.kind===`permission`&&t.sessionId===e?(n.push(t),!1):!0);if(a.length!==t){r=a;for(let e of n)e.reject(`completed`);clearTimeout(i),i=null,y(),b(),A.info(`[AgentServer] permissions cleared for ended session=${e}, count=${n.length}`)}}function ee(t,n){let r=t.session_id||t.sessionId,i=t.state,a=t.event;if(A.info(`[AgentServer] /state received: session=${r}, state=${i}, event=${a}, tool=${t.tool_name||t.toolName}`),!r||!i||!a){A.warn(`[AgentServer] /state rejected: missing fields (sessionId=${r}, state=${i}, event=${a})`),d(n,400,{error:`Missing required fields: session_id, state, event`});return}e.updateSession(r,i,a,{agentId:t.agent_id||`claude-code`,toolName:t.tool_name||t.toolName,toolInput:t.tool_input||t.toolInput,contextUsage:t.context_usage||t.contextUsage,model:t.model}),o.includes(a)&&x(r),c.includes(a)&&C(r),s.includes(a)&&S(r,t),A.info(`[AgentServer] /state ok, total sessions=${e.getSessions().length}`),d(n,200,{ok:!0,app:`erzhi-recording`})}function te(t,n){let i=t.tool_name||t.toolName||`unknown`,a=t.tool_input||t.toolInput||{},o=t.session_id||t.sessionId||`unknown`;if(i===`AskUserQuestion`){w(n,o,a);return}e.updateSession(o,`notification`,`PermissionRequest`,{toolName:i,toolInput:a});let s=t.tool_use_id||t.toolUseId||null,c={kind:`permission`,sessionId:o,toolName:i,toolInput:a,suggestions:t.permission_suggestions||null,toolUseId:s,resolve:()=>{},reject:()=>{},createdAt:Date.now()};new Promise((e,t)=>{c.resolve=e,c.reject=t}).then(t=>{e.updateSession(o,`idle`,`PermissionResolved`);let r=t===`always`?`allow`:t,i=JSON.stringify({hookSpecificOutput:{hookEventName:`PermissionRequest`,decision:{behavior:r}}});A.info(`[AgentServer] /permission resolved: behavior=${t} -> ${r}`),p(n,i)}).catch(t=>{e.updateSession(o,`idle`,`PermissionCancelled`);let r=JSON.stringify({hookSpecificOutput:{hookEventName:`PermissionRequest`,decision:{behavior:`cancel`}}});A.info(`[AgentServer] /permission cancelled: ${t}`),p(n,r)}),r.push(c),r.length===1&&y(),b(),A.info(`[AgentServer] /permission queued: session=${o}, queue=${r.length}`)}function w(t,n,i){let a=Array.isArray(i&&i.questions)&&i.questions||null;e.updateSession(n,`notification`,`AskUserQuestion`,{toolName:`AskUserQuestion`,toolInput:i});let o={kind:`question`,sessionId:n,toolName:`AskUserQuestion`,toolInput:i,questions:a,answerable:!0,resolve:()=>{},reject:()=>{},createdAt:Date.now()};new Promise((e,t)=>{o.resolve=e,o.reject=t}).then(r=>{e.updateSession(n,`idle`,`QuestionAnswered`);let i=JSON.stringify({hookSpecificOutput:{hookEventName:`PermissionRequest`,decision:{behavior:`allow`,updatedInput:{questions:a,answers:r}}}});A.info(`[AgentServer] AskUserQuestion answered via /permission: session=${n}`),p(t,i)}).catch(r=>{e.updateSession(n,`idle`,`QuestionDenied`);let i=JSON.stringify({hookSpecificOutput:{hookEventName:`PermissionRequest`,decision:{behavior:`deny`}}});A.info(`[AgentServer] AskUserQuestion denied: reason=${r}, session=${n}`),p(t,i)}),r.push(o),r.length===1&&y(),b(),A.info(`[AgentServer] AskUserQuestion (answerable) queued: session=${n}, queue=${r.length}`)}function T(t,n){let r=t.session_id||t.sessionId||`unknown`,i=t.tool_name||t.toolName||`AskUserQuestion`,a=t.tool_input||t.toolInput||{};e.updateSession(r,`notification`,`AskUserQuestion`,{toolName:i,toolInput:a}),A.info(`[AgentServer] /question notified (read-only card removed): session=${r}`),d(n,200,{ok:!0,app:`erzhi-recording`})}function E(t){let r=e.getSessions().length;d(t,200,{ok:!0,app:`erzhi-recording`,port:n,sessionCount:r})}function D(e,t){t.setHeader(`Access-Control-Allow-Origin`,`*`),A.info(`[AgentServer] ${e.method} ${e.url}`),e.method===`POST`&&e.url===`/state`?u(e).then(e=>ee(e,t)).catch(e=>{A.error(`[AgentServer] parseBody error:`,e),d(t,e?.code===`PAYLOAD_TOO_LARGE`?413:400,{error:e?.code===`PAYLOAD_TOO_LARGE`?`Payload too large`:`Invalid JSON`})}):e.method===`POST`&&e.url===`/permission`?u(e).then(e=>te(e,t)).catch(e=>{A.error(`[AgentServer] parseBody error:`,e),d(t,e?.code===`PAYLOAD_TOO_LARGE`?413:400,{error:e?.code===`PAYLOAD_TOO_LARGE`?`Payload too large`:`Invalid JSON`})}):e.method===`POST`&&e.url===`/question`?u(e).then(e=>T(e,t)).catch(e=>{A.error(`[AgentServer] parseBody error:`,e),d(t,e?.code===`PAYLOAD_TOO_LARGE`?413:400,{error:e?.code===`PAYLOAD_TOO_LARGE`?`Payload too large`:`Invalid JSON`})}):e.method===`GET`&&e.url===`/health`?E(t):d(t,404,{error:`Not found`})}function ne(e){let t=g();t&&t.kind===`permission`&&(t.resolve(e),v())}function re(){let e=g();e&&e.kind===`question`&&(e.answerable&&e.reject(`dismissed`),v())}function ie(e,t){let n=g();n&&n.kind===`question`&&n.answerable&&n.sessionId===e?(n.resolve(t),v(),A.info(`[AgentServer] submitQuestion accepted: session=${e}`)):A.warn(`[AgentServer] submitQuestion ignored: no matching answerable head for session=${e}`)}function ae(e){a=e}function O(){let e=g();return e?e.kind===`permission`?{kind:`permission`,sessionId:e.sessionId,toolName:e.toolName,toolInput:e.toolInput,suggestions:e.suggestions,createdAt:e.createdAt}:{kind:`question`,sessionId:e.sessionId,toolName:e.toolName,toolInput:e.toolInput,questions:e.questions,answerable:e.answerable,createdAt:e.createdAt}:null}function k(){return new Promise(e=>{let r=or,i=null;function a(){if(r>sr){A.error(`Agent server: all ports ${or}-${sr} occupied`),e(null);return}i=h.createServer(D),i.on(`error`,t=>{t.code===`EADDRINUSE`?(r++,a()):(A.error(`Agent server error:`,t.message),e(null))}),i.listen(r,`127.0.0.1`,()=>{n=r,t=i;try{let e=ur();m.mkdirSync(e,{recursive:!0}),m.writeFileSync(f.join(e,`runtime.json`),JSON.stringify({port:r,pid:process.pid}),`utf8`)}catch{}A.info(`Agent server listening on 127.0.0.1:${r}`),e(r)})}a()})}function oe(){for(let e of r)e.kind===`permission`&&e.reject(`stopped`);r=[],clearTimeout(i),i=null,a&&a(null),t&&=(t.close(),null),n=null}function se(){return n}return{start:k,stop:oe,getPort:se,getSafeCurrentCard:O,resolvePendingPermission:ne,dismissQuestion:re,submitQuestion:ie,setOnCardChange:ae}}j();var fr=f.join(p.homedir(),`.claude`,`settings.json`),pr=300*1e3,mr=3,hr=[`SessionStart`,`SessionEnd`,`UserPromptSubmit`,`PreToolUse`,`PostToolUse`,`PostToolUseFailure`,`Stop`,`StopFailure`,`ApiError`,`Notification`,`PermissionRequest`];function gr(e){let t=null,n=0,r=!1;function i(){try{if(require(`electron`)?.app?.isPackaged)return f.join(process.resourcesPath,`clawd-hook.js`)}catch{}return f.join(__dirname,`clawd-hook.js`)}function a(){try{let{execSync:e}=require(`child_process`),t=e(`where node`,{encoding:`utf8`}).trim().split(`
`)[0];if(t)return t}catch{}return process.execPath.replace(`electron.exe`,`node.exe`)}function o(){try{let e=m.readFileSync(fr,`utf8`);return JSON.parse(e)}catch{return null}}function s(e){try{return m.writeFileSync(fr,JSON.stringify(e,null,2),`utf8`),!0}catch(e){return A.error(`Failed to write Claude settings:`,e.message),!1}}function c(e,t){return{command:`& "${a()}" "${t}" ${e}`,shell:`powershell`}}function l(e){let t=e.hooks;return!t||!Array.isArray(t)?!1:t.some(e=>e.name&&e.events&&Array.isArray(e.events))}function u(e){return l(e)?(e.hooks=(e.hooks||[]).filter(e=>!e.name?.startsWith(`erzhi-recording`)),!0):!1}function d(){let t=o();if(!t)return{added:!1,updated:!1};let n=i(),r=t.hooks||{};if(u(t),e(),hr.every(e=>(r[e]||[]).some(t=>t.hooks?.some(t=>e===`PermissionRequest`?t.type===`http`&&t.url?.includes(`/permission`):t.type===`command`&&t.command?.startsWith(`&`)&&t.command?.includes(`clawd-hook.js`)&&t.shell===`powershell`))))return{added:!1,updated:!1};for(let t of hr){let i;if(t===`PermissionRequest`)i={type:`http`,url:`http://127.0.0.1:${e()||6e4}/permission`,timeout:600};else{let{command:e,shell:r}=c(t,n);i={type:`command`,command:e,shell:r,async:!0,timeout:5}}r[t]=[{matcher:``,hooks:[i]}]}return t.hooks=r,s(t),{added:!0,updated:!1}}function p(){let e=o();if(!e)return{removed:!1};let t=!1;if(l(e)){let n=e.hooks.length;e.hooks=e.hooks.filter(e=>!e.name?.startsWith(`erzhi-recording`)),e.hooks.length<n&&(t=!0)}let n=e.hooks||{};for(let e of hr)if(n[e]){let r=n[e].length;n[e]=n[e].filter(e=>!e.hooks?.some(e=>e.command?.includes(`clawd-hook.js`))),n[e].length===0?delete n[e]:n[e].length<r&&(t=!0)}return e.hooks=n,s(e),{removed:t}}function h(){let e=o();return e?((e.hooks||{})[hr[0]]||[]).some(e=>e.hooks?.some(e=>e.command?.includes(`clawd-hook.js`))):!1}function g(){let e=[];if(!o())return e.push(`Claude settings file not found`),{healthy:!1,issues:e};if(!h())return e.push(`Hook entry missing`),{healthy:!1,issues:e};let t=i();return m.existsSync(t)?{healthy:e.length===0,issues:e}:(e.push(`Hook script file missing`),{healthy:!1,issues:e})}function _(){if(r)return!1;if(n>=mr)return r=!0,!1;let e=d();return(e.added||e.updated)&&g().healthy?(n=0,!0):(n++,!1)}function v(){let e=g();e.healthy?(n>0&&(n=0),r&&=!1):(A.warn(`Claude hook health check failed:`,e.issues.join(`, `)),_())}function y(){t||(v(),t=setInterval(v,pr),A.info(`Claude hook watcher started`))}function b(){t&&=(clearInterval(t),null)}function x(){let e=g();return{installed:h(),scriptExists:m.existsSync(i()),claudeExists:o()!==null,healthy:e.healthy,repairFailures:n,manualFixRequired:r}}return{install:d,uninstall:p,isInstalled:h,startWatcher:y,stopWatcher:b,getStatus:x,checkHealth:g,repair:_}}j();var _r=`agent-settings.json`,vr={autoAllow:!1};function yr(){let{app:e}=require(`electron`);return(0,u.join)(e.isPackaged?e.getPath(`userData`):(0,u.join)(__dirname,`..`,`..`),_r)}function br(){try{let e=g.default.readFileSync(yr(),`utf-8`),t=JSON.parse(e);return{autoAllow:typeof t.autoAllow==`boolean`?t.autoAllow:vr.autoAllow}}catch{}return{...vr}}function xr(e){try{g.default.writeFileSync(yr(),JSON.stringify(e),`utf-8`)}catch(e){A.warn(`[AgentBridge] save agent settings failed:`,e?.message??e)}}function Sr(e={}){let t=rr(),n=dr(t),r=gr(()=>n.getPort()),i=null,a=null,o=br().autoAllow;t.subscribe((e,t)=>{i&&i(e,t)}),n.setOnCardChange(e=>{if(o&&e&&e.kind===`permission`){A.info(`[AgentBridge] auto-allow permission: tool=${e.toolName}`),n.resolvePendingPermission(`allow`);return}a&&a(e)});async function s(){if(t.start(),await n.start()!==null){if(e.autoInstallHooks!==!1){let e=r.install();e.added&&A.info(`Claude Code hooks installed`),e.updated&&A.info(`Claude Code hooks updated`)}e.autoStartWatcher!==!1&&r.isInstalled()&&r.startWatcher()}}function c(){r.stopWatcher(),t.stop(),n.stop()}function l(){return n}function u(){return t}function d(){return r}function f(e){i=e}function p(e){a=e}function m(e){n.resolvePendingPermission(e)}function h(){n.dismissQuestion()}function g(e,t){n.submitQuestion(e,t)}function _(){r.install()}function v(){r.uninstall()}function y(e){o=e,xr({autoAllow:o}),A.info(`[AgentBridge] autoAllow=${e} (persisted)`)}function b(){return o}let x=null,S=0;function C(){let e=Date.now();if(x!==null&&e-S<3e4)return x;try{let{execSync:e}=require(`child_process`);x=e(`tasklist /NH /FI "IMAGENAME eq claude.exe"`,{encoding:`utf8`,timeout:2e3}).includes(`claude.exe`)}catch{x=!1}return S=e,x}function ee(){let e=t.getSessions(),i=e.length,a=t.getCurrentState(),o=e.map(e=>e.sessionId).join(`,`);A.info(`[AgentBridge] getStatus: real_count=${i}, ids=[${o}], display=${a}`);let s=t.getSessions().length;return{serverRunning:n.getPort()!==null,port:n.getPort(),hookInstalled:r.isInstalled(),hookManagerStatus:r.getStatus(),displayState:a,currentCard:n.getSafeCurrentCard(),sessionCount:s,claudeRunning:C()}}return{start:s,stop:c,getServer:l,getStateMachine:u,getHookManager:d,getStatus:ee,setStateListener:f,setCardListener:p,resolvePermission:m,dismissQuestion:h,submitQuestion:g,installHooks:_,uninstallHooks:v,setAutoAllow:y,getAutoAllow:b}}var Cr=`local-video`;function wr(){d.protocol.registerSchemesAsPrivileged([{scheme:Cr,privileges:{standard:!0,secure:!0,supportFetchAPI:!0,stream:!0}}])}function Tr(){d.protocol.handle(Cr,e=>{let t=new URL(e.url),n=decodeURIComponent(t.pathname).replace(/^\//,``),r=e.headers.get(`range`),i=0;try{i=(0,g.statSync)(n).size}catch{return new Response(`File not found: `+n,{status:404})}let a=(0,u.extname)(n).toLowerCase(),o=a===`.mp4`?`video/mp4`:a===`.webm`?`video/webm`:`application/octet-stream`;if(r){let e=/bytes=(\d*)-(\d*)/.exec(r),t=e&&e[1]?parseInt(e[1],10):0,a=e&&e[2]?parseInt(e[2],10):i-1,s=Math.min(a,i-1),c=(0,g.createReadStream)(n,{start:t,end:s});return new Response(C.Readable.toWeb(c),{status:206,headers:{"Content-Range":`bytes ${t}-${s}/${i}`,"Accept-Ranges":`bytes`,"Content-Length":String(s-t+1),"Content-Type":o}})}let s=(0,g.createReadStream)(n);return new Response(C.Readable.toWeb(s),{status:200,headers:{"Content-Length":String(i),"Content-Type":o,"Accept-Ranges":`bytes`}})})}function Er(e,t){let n=new Date(t).toISOString();return e.filter(e=>!!e.reminder&&!e.reminderFired&&!(e.type===`todo`&&e.done)&&e.reminder<=n)}j();var Dr=3e4,Or=null;function kr(){let e=Er(U(),Date.now());if(e.length!==0){for(let t of e){let e=Tn(t.content).trim();bn(t.type===`memo`&&Tn(t.title).trim()?Tn(t.title).trim():e.slice(0,24),e.slice(0,90)),$t(t.id)}pn()||sn(!0)}}function Ar(){Or||(kr(),Or=setInterval(kr,Dr),A.info(`Todo reminder scheduler started`))}function jr(){Or&&=(clearInterval(Or),null),A.info(`Todo reminder scheduler stopped`)}j(),wr();var Z=null,Q=null,$=null,Mr=null,Nr=null,Pr=process.env.VITE_DEV_SERVER_URL;function Fr(){let e=d.app.isPackaged?(0,u.join)(process.resourcesPath,`logo.ico`):(0,u.join)(__dirname,`../../public/logo.ico`);return d.nativeImage.createFromPath(e)}function Ir(e){Z=new d.BrowserWindow({icon:Fr(),width:550,height:420,minWidth:420,minHeight:340,show:!1,skipTaskbar:!1,frame:!1,titleBarStyle:`hidden`,title:`二支录制`,backgroundColor:`#eaeaec`,webPreferences:{preload:e,contextIsolation:!0,nodeIntegration:!1,sandbox:!1,backgroundThrottling:!1}}),Pr?Z.loadURL(Pr):Z.loadFile((0,u.join)(process.env.DIST,`index.html`)),Z.on(`close`,e=>{d.app.isQuitting||(e.preventDefault(),Z?.hide())})}d.app.on(`gpu-process-crashed`,(e,t)=>{A.error(`GPU process crashed:`,JSON.stringify(t))}),d.app.whenReady().then(()=>{process.env.DIST=(0,u.join)(__dirname,`../../dist`),process.env.VITE_PUBLIC=d.app.isPackaged?process.env.DIST:(0,u.join)(__dirname,`../../public`),Tr(),ye(),A.info(`App starting...`),we(A),je(A);let e=(0,u.join)(__dirname,`..`,`preload`,`index.cjs`);try{d.session.defaultSession.clearCache()}catch(e){A.warn(`clearCache() failed:`,e)}Mr=Sr({autoInstallHooks:!0,autoStartWatcher:!0}),Mr.start().catch(e=>{A.error(`Agent bridge start failed:`,e?.message??e)}),Ln(Mr),Ir(e),(0,He.setMainWindow)(Z),(0,xt.createTray)(),Bn(Z),ct(),Xn(),ln(),Ar(),W(),Y();try{let e=B();d.app.setLoginItemSettings({openAtLogin:e.openAtLogin})}catch(e){A.error(`Sync openAtLogin on startup failed:`,e)}d.ipcMain.handle(`show-ai-window`,()=>{Lr()}),d.ipcMain.handle(`show-settings-window`,()=>{Rr()}),d.ipcMain.handle(`show-main-window`,()=>{Z&&!Z.isDestroyed()&&(Z.show(),Z.focus())}),process.on(`clawd-show-record-window`,()=>{Z&&!Z.isDestroyed()&&(Z.show(),Z.focus())}),process.on(`clawd-show-ai-window`,()=>{Lr()}),process.on(`clawd-show-settings-window`,()=>{Rr()}),process.on(`clawd-show-todo-window`,()=>{dn()}),Nr=setInterval(Zn,3e4),d.app.on(`activate`,()=>{d.BrowserWindow.getAllWindows().length===0&&Ir(e)})}),d.app.on(`window-all-closed`,()=>{}),d.app.on(`before-quit`,()=>{d.app.isQuitting=!0;for(let e of d.BrowserWindow.getAllWindows())if(!e.isDestroyed())try{e.webContents.send(`app-before-quit`)}catch{}(0,He.hideRegionBorder)(),(0,He.hideFloatingIsland)(),(0,He.hideCameraPreview)(),pt(),Mr?.stop(),It(),Te(),jr(),fn(),Cn(),Pn(),Vn(),(0,xt.destroyTray)(),Nr&&=(clearInterval(Nr),null),Z=null,Q=null,$=null});function Lr(){if(Q&&!Q.isDestroyed()){Q.show(),Q.focus();return}let e=process.env.VITE_DEV_SERVER_URL,t=(0,u.join)(__dirname,`..`,`preload`,`index.cjs`);Q=new d.BrowserWindow({icon:Fr(),width:480,height:540,minWidth:400,minHeight:400,show:!1,skipTaskbar:!1,frame:!1,titleBarStyle:`hidden`,title:`AI 助手`,backgroundColor:`#eaeaec`,webPreferences:{preload:t,contextIsolation:!0,nodeIntegration:!1,sandbox:!1}}),e?Q.loadURL(`${e}#/ai?t=${Date.now()}`):Q.loadFile((0,u.join)(process.env.DIST,`index.html`),{hash:`/ai`}),Q.once(`ready-to-show`,()=>{Q?.show()}),Q.on(`closed`,()=>{Q=null})}function Rr(){if($&&!$.isDestroyed()){$.show(),$.focus();return}let e=(0,u.join)(__dirname,`..`,`preload`,`index.cjs`);$=new d.BrowserWindow({icon:Fr(),width:420,height:480,minWidth:380,minHeight:420,show:!1,skipTaskbar:!1,frame:!1,titleBarStyle:`hidden`,title:`设置`,backgroundColor:`#eaeaec`,webPreferences:{preload:e,contextIsolation:!0,nodeIntegration:!1,sandbox:!1}}),Pr?$.loadURL(`${Pr}#/settings?t=${Date.now()}`):$.loadFile((0,u.join)(process.env.DIST,`index.html`),{hash:`/settings`}),$.once(`ready-to-show`,()=>{$?.show()}),$.on(`closed`,()=>{$=null})}