var e=Object.create,t=Object.defineProperty,n=Object.getOwnPropertyDescriptor,r=Object.getOwnPropertyNames,i=Object.getPrototypeOf,a=Object.prototype.hasOwnProperty,o=(e,t)=>()=>(e&&(t=e(e=0)),t),s=(e,t)=>()=>(t||(e((t={exports:{}}).exports,t),e=null),t.exports),c=(e,i,o,s)=>{if(i&&typeof i==`object`||typeof i==`function`)for(var c=r(i),l=0,u=c.length,d;l<u;l++)d=c[l],!a.call(e,d)&&d!==o&&t(e,d,{get:(e=>i[e]).bind(null,d),enumerable:!(s=n(i,d))||s.enumerable});return e},l=(n,r,a)=>(a=n==null?{}:e(i(n)),c(r||!n||!n.__esModule?t(a,`default`,{value:n,enumerable:!0}):a,n));let u=require(`node:path`);u=l(u);let d=require(`electron`),f=require(`path`);f=l(f),require(`child_process`);let p=require(`os`);p=l(p);let m=require(`fs`);m=l(m);let h=require(`http`);h=l(h);let g=require(`node:fs`);g=l(g);let _=require(`fluent-ffmpeg`);_=l(_);let v=require(`@ffmpeg-installer/ffmpeg`);v=l(v);let y=require(`node:os`);y=l(y);let b=require(`node:crypto`),x=require(`node:child_process`),S=require(`node:util`),C=require(`node:stream`);var w=s(((e,t)=>{var n=require(`fs`),r=require(`path`);t.exports={findAndReadPackageJson:i,tryReadJsonAt:a};function i(){return a(c())||a(s())||a(process.resourcesPath,`app.asar`)||a(process.resourcesPath,`app`)||a(process.cwd())||{name:void 0,version:void 0}}function a(...e){if(e[0])try{let t=o(`package.json`,r.join(...e));if(!t)return;let i=JSON.parse(n.readFileSync(t,`utf8`)),a=i?.productName||i?.name;return!a||a.toLowerCase()===`electron`?void 0:a?{name:a,version:i?.version}:void 0}catch{return}}function o(e,t){let i=t;for(;;){let t=r.parse(i),a=t.root,o=t.dir;if(n.existsSync(r.join(i,e)))return r.resolve(r.join(i,e));if(i===a)return null;i=o}}function s(){let e=process.argv.filter(e=>e.indexOf(`--user-data-dir=`)===0);return e.length===0||typeof e[0]!=`string`?null:e[0].replace(`--user-data-dir=`,``)}function c(){try{return require.main?.filename}catch{return}}})),T=s(((e,t)=>{var n=require(`child_process`),r=require(`os`),i=require(`path`),a=w();t.exports=class{appName=void 0;appPackageJson=void 0;platform=process.platform;getAppLogPath(e=this.getAppName()){return this.platform===`darwin`?i.join(this.getSystemPathHome(),`Library/Logs`,e):i.join(this.getAppUserDataPath(e),`logs`)}getAppName(){let e=this.appName||this.getAppPackageJson()?.name;if(!e)throw Error(`electron-log can't determine the app name. It tried these methods:
1. Use \`electron.app.name\`
2. Use productName or name from the nearest package.json\`
You can also set it through log.transports.file.setAppName()`);return e}getAppPackageJson(){return typeof this.appPackageJson!=`object`&&(this.appPackageJson=a.findAndReadPackageJson()),this.appPackageJson}getAppUserDataPath(e=this.getAppName()){return e?i.join(this.getSystemPathAppData(),e):void 0}getAppVersion(){return this.getAppPackageJson()?.version}getElectronLogPath(){return this.getAppLogPath()}getMacOsVersion(){let e=Number(r.release().split(`.`)[0]);return e<=19?`10.${e-4}`:e-9}getOsVersion(){let e=r.type().replace(`_`,` `),t=r.release();return e===`Darwin`&&(e=`macOS`,t=this.getMacOsVersion()),`${e} ${t}`}getPathVariables(){let e=this.getAppName(),t=this.getAppVersion(),n=this;return{appData:this.getSystemPathAppData(),appName:e,appVersion:t,get electronDefaultDir(){return n.getElectronLogPath()},home:this.getSystemPathHome(),libraryDefaultDir:this.getAppLogPath(e),libraryTemplate:this.getAppLogPath(`{appName}`),temp:this.getSystemPathTemp(),userData:this.getAppUserDataPath(e)}}getSystemPathAppData(){let e=this.getSystemPathHome();switch(this.platform){case`darwin`:return i.join(e,`Library/Application Support`);case`win32`:return process.env.APPDATA||i.join(e,`AppData/Roaming`);default:return process.env.XDG_CONFIG_HOME||i.join(e,`.config`)}}getSystemPathHome(){return r.homedir?.()||process.env.HOME}getSystemPathTemp(){return r.tmpdir()}getVersions(){return{app:`${this.getAppName()} ${this.getAppVersion()}`,electron:void 0,os:this.getOsVersion()}}isDev(){return process.env.NODE_ENV===`development`||process.env.ELECTRON_IS_DEV===`1`}isElectron(){return!!process.versions.electron}onAppEvent(e,t){}onAppReady(e){e()}onEveryWebContentsEvent(e,t){}onIpc(e,t){}onIpcInvoke(e,t){}openUrl(e,t=console.error){let r={darwin:`open`,win32:`start`,linux:`xdg-open`}[process.platform]||`xdg-open`;n.exec(`${r} ${e}`,{},e=>{e&&t(e)})}setAppName(e){this.appName=e}setPlatform(e){this.platform=e}setPreloadFileForSessions({filePath:e,includeFutureSession:t=!0,getSessions:n=()=>[]}){}sendIpc(e,t){}showErrorBox(e,t){}}})),E=s(((e,t)=>{var n=require(`path`),r=T();t.exports=class extends r{electron=void 0;constructor({electron:e}={}){super(),this.electron=e}getAppName(){let e;try{e=this.appName||this.electron.app?.name||this.electron.app?.getName()}catch{}return e||super.getAppName()}getAppUserDataPath(e){return this.getPath(`userData`)||super.getAppUserDataPath(e)}getAppVersion(){let e;try{e=this.electron.app?.getVersion()}catch{}return e||super.getAppVersion()}getElectronLogPath(){return this.getPath(`logs`)||super.getElectronLogPath()}getPath(e){try{return this.electron.app?.getPath(e)}catch{return}}getVersions(){return{app:`${this.getAppName()} ${this.getAppVersion()}`,electron:`Electron ${process.versions.electron}`,os:this.getOsVersion()}}getSystemPathAppData(){return this.getPath(`appData`)||super.getSystemPathAppData()}isDev(){return this.electron.app?.isPackaged===void 0?typeof process.execPath==`string`?n.basename(process.execPath).toLowerCase().startsWith(`electron`):super.isDev():!this.electron.app.isPackaged}onAppEvent(e,t){return this.electron.app?.on(e,t),()=>{this.electron.app?.off(e,t)}}onAppReady(e){this.electron.app?.isReady()?e():this.electron.app?.once?this.electron.app?.once(`ready`,e):e()}onEveryWebContentsEvent(e,t){return this.electron.webContents?.getAllWebContents()?.forEach(n=>{n.on(e,t)}),this.electron.app?.on(`web-contents-created`,n),()=>{this.electron.webContents?.getAllWebContents().forEach(n=>{n.off(e,t)}),this.electron.app?.off(`web-contents-created`,n)};function n(n,r){r.on(e,t)}}onIpc(e,t){this.electron.ipcMain?.on(e,t)}onIpcInvoke(e,t){this.electron.ipcMain?.handle?.(e,t)}openUrl(e,t=console.error){this.electron.shell?.openExternal(e).catch(t)}setPreloadFileForSessions({filePath:e,includeFutureSession:t=!0,getSessions:n=()=>[this.electron.session?.defaultSession]}){for(let e of n().filter(Boolean))r(e);t&&this.onAppEvent(`session-created`,e=>{r(e)});function r(t){typeof t.registerPreloadScript==`function`?t.registerPreloadScript({filePath:e,id:`electron-log-preload`,type:`frame`}):t.setPreloads([...t.getPreloads(),e])}}sendIpc(e,t){this.electron.BrowserWindow?.getAllWindows()?.forEach(n=>{n.webContents?.isDestroyed()===!1&&n.webContents?.isCrashed()===!1&&n.webContents.send(e,t)})}showErrorBox(e,t){this.electron.dialog?.showErrorBox(e,t)}}})),D=s(((e,t)=>{var n={};try{n=require(`electron`)}catch{}n.ipcRenderer&&r(n),typeof t==`object`&&(t.exports=r);function r({contextBridge:e,ipcRenderer:t}){if(!t)return;t.on(`__ELECTRON_LOG_IPC__`,(e,t)=>{window.postMessage({cmd:`message`,...t})}),t.invoke(`__ELECTRON_LOG__`,{cmd:`getOptions`}).catch(e=>console.error(Error(`electron-log isn't initialized in the main process. Please call log.initialize() before. ${e.message}`)));let n={sendToMain(e){try{t.send(`__ELECTRON_LOG__`,e)}catch(n){console.error(`electronLog.sendToMain `,n,`data:`,e),t.send(`__ELECTRON_LOG__`,{cmd:`errorHandler`,error:{message:n?.message,stack:n?.stack},errorName:`sendToMain`})}},log(...e){n.sendToMain({data:e,level:`info`})}};for(let e of[`error`,`warn`,`info`,`verbose`,`debug`,`silly`])n[e]=(...t)=>n.sendToMain({data:t,level:e});if(e&&process.contextIsolated)try{e.exposeInMainWorld(`__electronLog`,n)}catch{}typeof window==`object`?window.__electronLog=n:__electronLog=n}})),O=s(((e,t)=>{var n=require(`fs`),r=require(`os`),i=require(`path`),a=D(),o=!1,s=!1;t.exports={initialize({externalApi:e,getSessions:t,includeFutureSession:n,logger:r,preload:i=!0,spyRendererConsole:a=!1}){e.onAppReady(()=>{try{i&&c({externalApi:e,getSessions:t,includeFutureSession:n,logger:r,preloadOption:i}),a&&l({externalApi:e,logger:r})}catch(e){r.warn(e)}})}};function c({externalApi:e,getSessions:t,includeFutureSession:s,logger:c,preloadOption:l}){let u=typeof l==`string`?l:void 0;if(o){c.warn(Error(`log.initialize({ preload }) already called`).stack);return}o=!0;try{u=i.resolve(__dirname,`../renderer/electron-log-preload.js`)}catch{}if(!u||!n.existsSync(u)){u=i.join(e.getAppUserDataPath()||r.tmpdir(),`electron-log-preload.js`);let t=`
      try {
        (${a.toString()})(require('electron'));
      } catch(e) {
        console.error(e);
      }
    `;n.writeFileSync(u,t,`utf8`)}e.setPreloadFileForSessions({filePath:u,includeFutureSession:s,getSessions:t})}function l({externalApi:e,logger:t}){if(s){t.warn(Error(`log.initialize({ spyRendererConsole }) already called`).stack);return}s=!0;let n=[`debug`,`info`,`warn`,`error`];e.onEveryWebContentsEvent(`console-message`,(e,r,i)=>{t.processMessage({data:[i],level:n[r],variables:{processType:`renderer`}})})}})),k=s(((e,t)=>{t.exports=n;function n(e){return Object.defineProperties(t,{defaultLabel:{value:``,writable:!0},labelPadding:{value:!0,writable:!0},maxLabelLength:{value:0,writable:!0},labelLength:{get(){switch(typeof t.labelPadding){case`boolean`:return t.labelPadding?t.maxLabelLength:0;case`number`:return t.labelPadding;default:return 0}}}});function t(n){t.maxLabelLength=Math.max(t.maxLabelLength,n.length);let r={};for(let t of e.levels)r[t]=(...r)=>e.logData(r,{level:t,scope:n});return r.log=r.info,r}}})),ee=s(((e,t)=>{t.exports=class{constructor({processMessage:e}){this.processMessage=e,this.buffer=[],this.enabled=!1,this.begin=this.begin.bind(this),this.commit=this.commit.bind(this),this.reject=this.reject.bind(this)}addMessage(e){this.buffer.push(e)}begin(){this.enabled=[]}commit(){this.enabled=!1,this.buffer.forEach(e=>this.processMessage(e)),this.buffer=[]}reject(){this.enabled=!1,this.buffer=[]}}})),te=s(((e,t)=>{var n=k(),r=ee();t.exports=class e{static instances={};dependencies={};errorHandler=null;eventLogger=null;functions={};hooks=[];isDev=!1;levels=null;logId=null;scope=null;transports={};variables={};constructor({allowUnknownLevel:t=!1,dependencies:i={},errorHandler:a,eventLogger:o,initializeFn:s,isDev:c=!1,levels:l=[`error`,`warn`,`info`,`verbose`,`debug`,`silly`],logId:u,transportFactories:d={},variables:f}={}){this.addLevel=this.addLevel.bind(this),this.create=this.create.bind(this),this.initialize=this.initialize.bind(this),this.logData=this.logData.bind(this),this.processMessage=this.processMessage.bind(this),this.allowUnknownLevel=t,this.buffering=new r(this),this.dependencies=i,this.initializeFn=s,this.isDev=c,this.levels=l,this.logId=u,this.scope=n(this),this.transportFactories=d,this.variables=f||{};for(let e of this.levels)this.addLevel(e,!1);this.log=this.info,this.functions.log=this.log,this.errorHandler=a,a?.setOptions({...i,logFn:this.error}),this.eventLogger=o,o?.setOptions({...i,logger:this});for(let[e,t]of Object.entries(d))this.transports[e]=t(this,i);e.instances[u]=this}static getInstance({logId:e}){return this.instances[e]||this.instances.default}addLevel(e,t=this.levels.length){t!==!1&&this.levels.splice(t,0,e),this[e]=(...t)=>this.logData(t,{level:e}),this.functions[e]=this[e]}catchErrors(e){return this.processMessage({data:[`log.catchErrors is deprecated. Use log.errorHandler instead`],level:`warn`},{transports:[`console`]}),this.errorHandler.startCatching(e)}create(t){return typeof t==`string`&&(t={logId:t}),new e({dependencies:this.dependencies,errorHandler:this.errorHandler,initializeFn:this.initializeFn,isDev:this.isDev,transportFactories:this.transportFactories,variables:{...this.variables},...t})}compareLevels(e,t,n=this.levels){let r=n.indexOf(e),i=n.indexOf(t);return i===-1||r===-1?!0:i<=r}initialize(e={}){this.initializeFn({logger:this,...this.dependencies,...e})}logData(e,t={}){this.buffering.enabled?this.buffering.addMessage({data:e,date:new Date,...t}):this.processMessage({data:e,...t})}processMessage(e,{transports:t=this.transports}={}){if(e.cmd===`errorHandler`){this.errorHandler.handle(e.error,{errorName:e.errorName,processType:`renderer`,showDialog:!!e.showDialog});return}let n=e.level;this.allowUnknownLevel||(n=this.levels.includes(e.level)?e.level:`info`);let r={date:new Date,logId:this.logId,...e,level:n,variables:{...this.variables,...e.variables}};for(let[n,i]of this.transportEntries(t))if(!(typeof i!=`function`||i.level===!1)&&this.compareLevels(i.level,e.level))try{let e=this.hooks.reduce((e,t)=>e&&t(e,i,n),r);e&&i({...e,data:[...e.data]})}catch(e){this.processInternalErrorFn(e)}}processInternalErrorFn(e){}transportEntries(e=this.transports){return(Array.isArray(e)?e:Object.entries(e)).map(e=>{switch(typeof e){case`string`:return this.transports[e]?[e,this.transports[e]]:null;case`function`:return[e.name,e];default:return Array.isArray(e)?e:null}}).filter(Boolean)}}})),ne=s(((e,t)=>{var n=class{externalApi=void 0;isActive=!1;logFn=void 0;onError=void 0;showDialog=!0;constructor({externalApi:e,logFn:t=void 0,onError:n=void 0,showDialog:r=void 0}={}){this.createIssue=this.createIssue.bind(this),this.handleError=this.handleError.bind(this),this.handleRejection=this.handleRejection.bind(this),this.setOptions({externalApi:e,logFn:t,onError:n,showDialog:r}),this.startCatching=this.startCatching.bind(this),this.stopCatching=this.stopCatching.bind(this)}handle(e,{logFn:t=this.logFn,onError:n=this.onError,processType:i=`browser`,showDialog:a=this.showDialog,errorName:o=``}={}){e=r(e);try{if(typeof n==`function`){let t=this.externalApi?.getVersions()||{},r=this.createIssue;if(n({createIssue:r,error:e,errorName:o,processType:i,versions:t})===!1)return}o?t(o,e):t(e),a&&!o.includes(`rejection`)&&this.externalApi&&this.externalApi.showErrorBox(`A JavaScript error occurred in the ${i} process`,e.stack)}catch{console.error(e)}}setOptions({externalApi:e,logFn:t,onError:n,showDialog:r}){typeof e==`object`&&(this.externalApi=e),typeof t==`function`&&(this.logFn=t),typeof n==`function`&&(this.onError=n),typeof r==`boolean`&&(this.showDialog=r)}startCatching({onError:e,showDialog:t}={}){this.isActive||(this.isActive=!0,this.setOptions({onError:e,showDialog:t}),process.on(`uncaughtException`,this.handleError),process.on(`unhandledRejection`,this.handleRejection))}stopCatching(){this.isActive=!1,process.removeListener(`uncaughtException`,this.handleError),process.removeListener(`unhandledRejection`,this.handleRejection)}createIssue(e,t){this.externalApi?.openUrl(`${e}?${new URLSearchParams(t).toString()}`)}handleError(e){this.handle(e,{errorName:`Unhandled`})}handleRejection(e){let t=e instanceof Error?e:Error(JSON.stringify(e));this.handle(t,{errorName:`Unhandled rejection`})}};function r(e){if(e instanceof Error)return e;if(e&&typeof e==`object`){if(e.message)return Object.assign(Error(e.message),e);try{return Error(JSON.stringify(e))}catch(t){return Error(`Couldn't normalize error ${String(e)}: ${t}`)}}return Error(`Can't normalize error ${String(e)}`)}t.exports=n})),re=s(((e,t)=>{t.exports=class{disposers=[];format=`{eventSource}#{eventName}:`;formatters={app:{"certificate-error":({args:e})=>this.arrayToObject(e.slice(1,4),[`url`,`error`,`certificate`]),"child-process-gone":({args:e})=>e.length===1?e[0]:e,"render-process-gone":({args:[e,t]})=>t&&typeof t==`object`?{...t,...this.getWebContentsDetails(e)}:[]},webContents:{"console-message":({args:[e,t,n,r]})=>{if(!(e<3))return{message:t,source:`${r}:${n}`}},"did-fail-load":({args:e})=>this.arrayToObject(e,[`errorCode`,`errorDescription`,`validatedURL`,`isMainFrame`,`frameProcessId`,`frameRoutingId`]),"did-fail-provisional-load":({args:e})=>this.arrayToObject(e,[`errorCode`,`errorDescription`,`validatedURL`,`isMainFrame`,`frameProcessId`,`frameRoutingId`]),"plugin-crashed":({args:e})=>this.arrayToObject(e,[`name`,`version`]),"preload-error":({args:e})=>this.arrayToObject(e,[`preloadPath`,`error`])}};events={app:{"certificate-error":!0,"child-process-gone":!0,"render-process-gone":!0},webContents:{"did-fail-load":!0,"did-fail-provisional-load":!0,"plugin-crashed":!0,"preload-error":!0,unresponsive:!0}};externalApi=void 0;level=`error`;scope=``;constructor(e={}){this.setOptions(e)}setOptions({events:e,externalApi:t,level:n,logger:r,format:i,formatters:a,scope:o}){typeof e==`object`&&(this.events=e),typeof t==`object`&&(this.externalApi=t),typeof n==`string`&&(this.level=n),typeof r==`object`&&(this.logger=r),(typeof i==`string`||typeof i==`function`)&&(this.format=i),typeof a==`object`&&(this.formatters=a),typeof o==`string`&&(this.scope=o)}startLogging(e={}){this.setOptions(e),this.disposeListeners();for(let e of this.getEventNames(this.events.app))this.disposers.push(this.externalApi.onAppEvent(e,(...t)=>{this.handleEvent({eventSource:`app`,eventName:e,handlerArgs:t})}));for(let e of this.getEventNames(this.events.webContents))this.disposers.push(this.externalApi.onEveryWebContentsEvent(e,(...t)=>{this.handleEvent({eventSource:`webContents`,eventName:e,handlerArgs:t})}))}stopLogging(){this.disposeListeners()}arrayToObject(e,t){let n={};return t.forEach((t,r)=>{n[t]=e[r]}),e.length>t.length&&(n.unknownArgs=e.slice(t.length)),n}disposeListeners(){this.disposers.forEach(e=>e()),this.disposers=[]}formatEventLog({eventName:e,eventSource:t,handlerArgs:n}){let[r,...i]=n;if(typeof this.format==`function`)return this.format({args:i,event:r,eventName:e,eventSource:t});let a=this.formatters[t]?.[e],o=i;if(typeof a==`function`&&(o=a({args:i,event:r,eventName:e,eventSource:t})),!o)return;let s={};return Array.isArray(o)?s.args=o:typeof o==`object`&&Object.assign(s,o),t===`webContents`&&Object.assign(s,this.getWebContentsDetails(r?.sender)),[this.format.replace(`{eventSource}`,t===`app`?`App`:`WebContents`).replace(`{eventName}`,e),s]}getEventNames(e){return!e||typeof e!=`object`?[]:Object.entries(e).filter(([e,t])=>t).map(([e])=>e)}getWebContentsDetails(e){if(!e?.loadURL)return{};try{return{webContents:{id:e.id,url:e.getURL()}}}catch{return{}}}handleEvent({eventName:e,eventSource:t,handlerArgs:n}){let r=this.formatEventLog({eventName:e,eventSource:t,handlerArgs:n});r&&(this.scope?this.logger.scope(this.scope):this.logger)?.[this.level]?.(...r)}}})),A=s(((e,t)=>{t.exports={transform:n};function n({logger:e,message:t,transport:n,initialData:r=t?.data||[],transforms:i=n?.transforms}){return i.reduce((r,i)=>typeof i==`function`?i({data:r,logger:e,message:t,transport:n}):r,r)}})),j=s(((e,t)=>{var{transform:n}=A();t.exports={concatFirstStringElements:r,formatScope:a,formatText:s,formatVariables:o,timeZoneFromOffset:i,format({message:e,logger:t,transport:r,data:i=e?.data}){switch(typeof r.format){case`string`:return n({message:e,logger:t,transforms:[o,a,s],transport:r,initialData:[r.format,...i]});case`function`:return r.format({data:i,level:e?.level||`info`,logger:t,message:e,transport:r});default:return i}}};function r({data:e}){return typeof e[0]!=`string`||typeof e[1]!=`string`||e[0].match(/%[1cdfiOos]/)?e:[`${e[0]} ${e[1]}`,...e.slice(2)]}function i(e){let t=Math.abs(e);return`${e>0?`-`:`+`}${Math.floor(t/60).toString().padStart(2,`0`)}:${(t%60).toString().padStart(2,`0`)}`}function a({data:e,logger:t,message:n}){let{defaultLabel:r,labelLength:i}=t?.scope||{},a=e[0],o=n.scope;o||=r;let s;return s=o===``?i>0?``.padEnd(i+3):``:typeof o==`string`?` (${o})`.padEnd(i+3):``,e[0]=a.replace(`{scope}`,s),e}function o({data:e,message:t}){let n=e[0];if(typeof n!=`string`)return e;n=n.replace(`{level}]`,`${t.level}]`.padEnd(6,` `));let r=t.date||new Date;return e[0]=n.replace(/\{(\w+)}/g,(e,n)=>{switch(n){case`level`:return t.level||`info`;case`logId`:return t.logId;case`y`:return r.getFullYear().toString(10);case`m`:return(r.getMonth()+1).toString(10).padStart(2,`0`);case`d`:return r.getDate().toString(10).padStart(2,`0`);case`h`:return r.getHours().toString(10).padStart(2,`0`);case`i`:return r.getMinutes().toString(10).padStart(2,`0`);case`s`:return r.getSeconds().toString(10).padStart(2,`0`);case`ms`:return r.getMilliseconds().toString(10).padStart(3,`0`);case`z`:return i(r.getTimezoneOffset());case`iso`:return r.toISOString();default:return t.variables?.[n]||e}}).trim(),e}function s({data:e}){let t=e[0];if(typeof t!=`string`)return e;if(t.lastIndexOf(`{text}`)===t.length-6)return e[0]=t.replace(/\s?{text}/,``),e[0]===``&&e.shift(),e;let n=t.split(`{text}`),r=[];return n[0]!==``&&r.push(n[0]),r=r.concat(e.slice(1)),n[1]!==``&&r.push(n[1]),r}})),M=s(((e,t)=>{var n=require(`util`);t.exports={serialize:i,maxDepth({data:e,transport:n,depth:r=n?.depth??6}){if(!e)return e;if(r<1)return Array.isArray(e)?`[array]`:typeof e==`object`&&e?`[object]`:e;if(Array.isArray(e))return e.map(e=>t.exports.maxDepth({data:e,depth:r-1}));if(typeof e!=`object`||e&&typeof e.toISOString==`function`)return e;if(e===null)return null;if(e instanceof Error)return e;let i={};for(let n in e)Object.prototype.hasOwnProperty.call(e,n)&&(i[n]=t.exports.maxDepth({data:e[n],depth:r-1}));return i},toJSON({data:e}){return JSON.parse(JSON.stringify(e,r()))},toString({data:e,transport:t}){let i=t?.inspectOptions||{},a=e.map(e=>{if(e!==void 0)try{let t=JSON.stringify(e,r(),`  `);return t===void 0?void 0:JSON.parse(t)}catch{return e}});return n.formatWithOptions(i,...a)}};function r(e={}){let t=new WeakSet;return function(n,r){if(typeof r==`object`&&r){if(t.has(r))return;t.add(r)}return i(n,r,e)}}function i(e,t,n={}){let r=n?.serializeMapAndSet!==!1;return t instanceof Error?t.stack:t&&(typeof t==`function`?`[function] ${t.toString()}`:t instanceof Date?t.toISOString():r&&t instanceof Map&&Object.fromEntries?Object.fromEntries(t):r&&t instanceof Set&&Array.from?Array.from(t):t)}})),N=s(((e,t)=>{t.exports={transformStyles:a,applyAnsiStyles({data:e}){return a(e,r,i)},removeStyles({data:e}){return a(e,()=>``)}};var n={unset:`\x1B[0m`,black:`\x1B[30m`,red:`\x1B[31m`,green:`\x1B[32m`,yellow:`\x1B[33m`,blue:`\x1B[34m`,magenta:`\x1B[35m`,cyan:`\x1B[36m`,white:`\x1B[37m`,gray:`\x1B[90m`};function r(e){return n[e.replace(/color:\s*(\w+).*/,`$1`).toLowerCase()]||``}function i(e){return e+n.unset}function a(e,t,n){let r={};return e.reduce((e,i,a,o)=>{if(r[a])return e;if(typeof i==`string`){let e=a,s=!1;i=i.replace(/%[1cdfiOos]/g,n=>{if(e+=1,n!==`%c`)return n;let a=o[e];return typeof a==`string`?(r[e]=!0,s=!0,t(a,i)):n}),s&&n&&(i=n(i))}return e.push(i),e},[])}})),ie=s(((e,t)=>{var{concatFirstStringElements:n,format:r}=j(),{maxDepth:i,toJSON:a}=M(),{applyAnsiStyles:o,removeStyles:s}=N(),{transform:c}=A(),l={error:console.error,warn:console.warn,info:console.info,verbose:console.info,debug:console.debug,silly:console.debug,log:console.log};t.exports=d;var u=`%c{h}:{i}:{s}.{ms}{scope}%c ${process.platform===`win32`?`>`:`›`} {text}`;Object.assign(d,{DEFAULT_FORMAT:u});function d(e){return Object.assign(t,{colorMap:{error:`red`,warn:`yellow`,info:`cyan`,verbose:`unset`,debug:`gray`,silly:`gray`,default:`unset`},format:u,level:`silly`,transforms:[f,r,m,n,i,a],useStyles:process.env.FORCE_STYLES,writeFn({message:e}){(l[e.level]||l.info)(...e.data)}});function t(n){let r=c({logger:e,message:n,transport:t});t.writeFn({message:{...n,data:r}})}}function f({data:e,message:t,transport:n}){return typeof n.format!=`string`||!n.format.includes(`%c`)?e:[`color:${h(t.level,n)}`,`color:unset`,...e]}function p(e,t){if(typeof e==`boolean`)return e;let n=t===`error`||t===`warn`?process.stderr:process.stdout;return n&&n.isTTY}function m(e){let{message:t,transport:n}=e;return(p(n.useStyles,t.level)?o:s)(e)}function h(e,t){return t.colorMap[e]||t.colorMap.default}})),P=s(((e,t)=>{var n=require(`events`),r=require(`fs`),i=require(`os`);t.exports=class extends n{asyncWriteQueue=[];bytesWritten=0;hasActiveAsyncWriting=!1;path=null;initialSize=void 0;writeOptions=null;writeAsync=!1;constructor({path:e,writeOptions:t={encoding:`utf8`,flag:`a`,mode:438},writeAsync:n=!1}){super(),this.path=e,this.writeOptions=t,this.writeAsync=n}get size(){return this.getSize()}clear(){try{return r.writeFileSync(this.path,``,{mode:this.writeOptions.mode,flag:`w`}),this.reset(),!0}catch(e){return e.code===`ENOENT`?!0:(this.emit(`error`,e,this),!1)}}crop(e){try{let t=a(this.path,e||4096);this.clear(),this.writeLine(`[log cropped]${i.EOL}${t}`)}catch(e){this.emit(`error`,Error(`Couldn't crop file ${this.path}. ${e.message}`),this)}}getSize(){if(this.initialSize===void 0)try{let e=r.statSync(this.path);this.initialSize=e.size}catch{this.initialSize=0}return this.initialSize+this.bytesWritten}increaseBytesWrittenCounter(e){this.bytesWritten+=Buffer.byteLength(e,this.writeOptions.encoding)}isNull(){return!1}nextAsyncWrite(){let e=this;if(this.hasActiveAsyncWriting||this.asyncWriteQueue.length===0)return;let t=this.asyncWriteQueue.join(``);this.asyncWriteQueue=[],this.hasActiveAsyncWriting=!0,r.writeFile(this.path,t,this.writeOptions,n=>{e.hasActiveAsyncWriting=!1,n?e.emit(`error`,Error(`Couldn't write to ${e.path}. ${n.message}`),this):e.increaseBytesWrittenCounter(t),e.nextAsyncWrite()})}reset(){this.initialSize=void 0,this.bytesWritten=0}toString(){return this.path}writeLine(e){if(e+=i.EOL,this.writeAsync){this.asyncWriteQueue.push(e),this.nextAsyncWrite();return}try{r.writeFileSync(this.path,e,this.writeOptions),this.increaseBytesWrittenCounter(e)}catch(e){this.emit(`error`,Error(`Couldn't write to ${this.path}. ${e.message}`),this)}}};function a(e,t){let n=Buffer.alloc(t),i=r.statSync(e),a=Math.min(i.size,t),o=Math.max(0,i.size-t),s=r.openSync(e,`r`),c=r.readSync(s,n,0,a,o);return r.closeSync(s),n.toString(`utf8`,0,c)}})),F=s(((e,t)=>{var n=P();t.exports=class extends n{clear(){}crop(){}getSize(){return 0}isNull(){return!0}writeLine(){}}})),ae=s(((e,t)=>{var n=require(`events`),r=require(`fs`),i=require(`path`),a=P(),o=F();t.exports=class extends n{store={};constructor(){super(),this.emitError=this.emitError.bind(this)}provide({filePath:e,writeOptions:t={},writeAsync:n=!1}){let r;try{if(e=i.resolve(e),this.store[e])return this.store[e];r=this.createFile({filePath:e,writeOptions:t,writeAsync:n})}catch(t){r=new o({path:e}),this.emitError(t,r)}return r.on(`error`,this.emitError),this.store[e]=r,r}createFile({filePath:e,writeOptions:t,writeAsync:n}){return this.testFileWriting({filePath:e,writeOptions:t}),new a({path:e,writeOptions:t,writeAsync:n})}emitError(e,t){this.emit(`error`,e,t)}testFileWriting({filePath:e,writeOptions:t}){r.mkdirSync(i.dirname(e),{recursive:!0}),r.writeFileSync(e,``,{flag:`a`,mode:t.mode})}}})),oe=s(((e,t)=>{var n=require(`fs`),r=require(`os`),i=require(`path`),a=ae(),{transform:o}=A(),{removeStyles:s}=N(),{format:c,concatFirstStringElements:l}=j(),{toString:u}=M();t.exports=f;var d=new a;function f(e,{registry:t=d,externalApi:a}={}){let f;return t.listenerCount(`error`)<1&&t.on(`error`,(e,t)=>{g(`Can't write to ${t}`,e)}),Object.assign(m,{fileName:p(e.variables.processType),format:`[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}]{scope} {text}`,getFile:_,inspectOptions:{depth:5},level:`silly`,maxSize:1024**2,readAllLogs:v,sync:!0,transforms:[s,c,l,u],writeOptions:{flag:`a`,mode:438,encoding:`utf8`},archiveLogFn(e){let t=e.toString(),r=i.parse(t);try{n.renameSync(t,i.join(r.dir,`${r.name}.old${r.ext}`))}catch(t){g(`Could not rotate log`,t);let n=Math.round(m.maxSize/4);e.crop(Math.min(n,256*1024))}},resolvePathFn(e){return i.join(e.libraryDefaultDir,e.fileName)},setAppName(t){e.dependencies.externalApi.setAppName(t)}});function m(t){let n=_(t);m.maxSize>0&&n.size>m.maxSize&&(m.archiveLogFn(n),n.reset());let r=o({logger:e,message:t,transport:m});n.writeLine(r)}function h(){f||(f=Object.create(Object.prototype,{...Object.getOwnPropertyDescriptors(a.getPathVariables()),fileName:{get(){return m.fileName},enumerable:!0}}),typeof m.archiveLog==`function`&&(m.archiveLogFn=m.archiveLog,g(`archiveLog is deprecated. Use archiveLogFn instead`)),typeof m.resolvePath==`function`&&(m.resolvePathFn=m.resolvePath,g(`resolvePath is deprecated. Use resolvePathFn instead`)))}function g(t,n=null,r=`error`){let i=[`electron-log.transports.file: ${t}`];n&&i.push(n),e.transports.console({data:i,date:new Date,level:r})}function _(e){h();let n=m.resolvePathFn(f,e);return t.provide({filePath:n,writeAsync:!m.sync,writeOptions:m.writeOptions})}function v({fileFilter:e=e=>e.endsWith(`.log`)}={}){h();let t=i.dirname(m.resolvePathFn(f));return n.existsSync(t)?n.readdirSync(t).map(e=>i.join(t,e)).filter(e).map(e=>{try{return{path:e,lines:n.readFileSync(e,`utf8`).split(r.EOL)}}catch{return null}}).filter(Boolean):[]}}function p(e=process.type){switch(e){case`renderer`:return`renderer.log`;case`worker`:return`worker.log`;default:return`main.log`}}})),se=s(((e,t)=>{var{maxDepth:n,toJSON:r}=M(),{transform:i}=A();t.exports=a;function a(e,{externalApi:t}){return Object.assign(a,{depth:3,eventId:`__ELECTRON_LOG_IPC__`,level:e.isDev?`silly`:!1,transforms:[r,n]}),t?.isElectron()?a:void 0;function a(n){n?.variables?.processType!==`renderer`&&t?.sendIpc(a.eventId,{...n,data:i({logger:e,message:n,transport:a})})}}})),ce=s(((e,t)=>{var n=require(`http`),r=require(`https`),{transform:i}=A(),{removeStyles:a}=N(),{toJSON:o,maxDepth:s}=M();t.exports=c;function c(e){return Object.assign(t,{client:{name:`electron-application`},depth:6,level:!1,requestOptions:{},transforms:[a,o,s],makeBodyFn({message:e}){return JSON.stringify({client:t.client,data:e.data,date:e.date.getTime(),level:e.level,scope:e.scope,variables:e.variables})},processErrorFn({error:n}){e.processMessage({data:[`electron-log: can't POST ${t.url}`,n],level:`warn`},{transports:[`console`,`file`]})},sendRequestFn({serverUrl:e,requestOptions:t,body:i}){let a=(e.startsWith(`https:`)?r:n).request(e,{method:`POST`,...t,headers:{"Content-Type":`application/json`,"Content-Length":i.length,...t.headers}});return a.write(i),a.end(),a}});function t(n){if(!t.url)return;let r=t.makeBodyFn({logger:e,message:{...n,data:i({logger:e,message:n,transport:t})},transport:t}),a=t.sendRequestFn({serverUrl:t.url,requestOptions:t.requestOptions,body:Buffer.from(r,`utf8`)});a.on(`error`,r=>t.processErrorFn({error:r,logger:e,message:n,request:a,transport:t}))}}})),le=s(((e,t)=>{var n=te(),r=ne(),i=re(),a=ie(),o=oe(),s=se(),c=ce();t.exports=l;function l({dependencies:e,initializeFn:t}){let l=new n({dependencies:e,errorHandler:new r,eventLogger:new i,initializeFn:t,isDev:e.externalApi?.isDev(),logId:`default`,transportFactories:{console:a,file:o,ipc:s,remote:c},variables:{processType:`main`}});return l.default=l,l.Logger=n,l.processInternalErrorFn=e=>{l.transports.console.writeFn({message:{data:[`Unhandled electron-log error`,e],level:`error`}})},l}})),ue=s(((e,t)=>{var n=require(`electron`),r=E(),{initialize:i}=O(),a=le(),o=new r({electron:n}),s=a({dependencies:{externalApi:o},initializeFn:i});t.exports=s,o.onIpc(`__ELECTRON_LOG__`,(e,t)=>{t.scope&&s.Logger.getInstance(t).scope(t.scope);let n=new Date(t.date);c({...t,date:n.getTime()?n:new Date})}),o.onIpcInvoke(`__ELECTRON_LOG__`,(e,{cmd:t=``,logId:n})=>{switch(t){case`getOptions`:return{levels:s.Logger.getInstance({logId:n}).levels,logId:n};default:return c({data:[`Unknown cmd '${t}'`],level:`error`}),{}}});function c(e){s.Logger.getInstance(e)?.processMessage(e)}})),de=s(((e,t)=>{t.exports=ue()}));function fe(){if(me)return;me=!0;let{app:e}=require(`electron`),{join:t,dirname:n}=require(`node:path`),r=e.isPackaged?t(n(e.getPath(`exe`)),`logs`):t(e.getAppPath(),`src`,`log`),i=()=>{let e=new Date;return`${e.getFullYear()}-${String(e.getMonth()+1).padStart(2,`0`)}-${String(e.getDate()).padStart(2,`0`)}`};I.default.transports.file.resolvePathFn=e=>t(r,i()+`.log`)}function pe(){fe()}var I,me,L,R=o((()=>{I=l(de()),I.default.initialize(),I.default.transports.file.maxSize=5*1024*1024,I.default.transports.console.level=`error`,me=!1,L=I.default}));R();var he=new Map,ge={info:()=>{},warn:()=>{}};function _e(e){ge=e}function z(e){let t=(0,b.randomUUID)();return he.set(t,{id:t,kill:e}),t}function B(e){he.delete(e)}function ve(){let e=he.size;if(e===0)return 0;ge.info(`Killing ${e} in-flight conversion(s) on quit`);for(let e of he.values())try{e.kill()}catch(t){ge.warn(`Conversion kill failed for ${e.id}:`,t?.message??t)}return he.clear(),e}var ye=(0,S.promisify)(x.execFile),be=[`h264_nvenc`,`h264_qsv`,`h264_amf`],xe=null,Se=null,Ce={info:()=>{},warn:()=>{}};function we(e){Ce=e}function Te(e){for(let t of be)if(RegExp(`\\b${t}\\b`).test(e))return t;return`libx264`}function Ee(e){return xe?Promise.resolve(xe):Se||(Se=(async()=>{try{let{stdout:t}=await ye(e,[`-hide_banner`,`-encoders`],{timeout:5e3,maxBuffer:2*1024*1024}),n=Te(t);return Ce.info(`H.264 encoder selected: ${n}`),xe=n,n}catch(e){return Ce.warn(`HW encoder probe failed, falling back to libx264:`,e?.message??e),xe=`libx264`,`libx264`}finally{Se=null}})(),Se)}function De(e,t,n){switch(e){case`h264_nvenc`:return[`-c:v`,`h264_nvenc`,`-preset`,`p4`,`-rc`,`vbr`,`-cq`,t,`-b:v`,`0`];case`h264_qsv`:return[`-c:v`,`h264_qsv`,`-preset`,`veryfast`,`-global_quality`,t];case`h264_amf`:return[`-c:v`,`h264_amf`,`-quality`,`balanced`,`-rc`,`cqp`,`-qp_i`,t,`-qp_p`,t];default:return[`-c:v`,`libx264`,`-preset`,`ultrafast`,`-crf`,t,`-threads`,String(n)]}}var Oe=d.app.isPackaged?u.default.join(process.resourcesPath,`ffmpeg.exe`):v.default.path;_.default.setFfmpegPath(Oe);var ke=Math.min(y.default.cpus().length,8);function Ae(e,t,n,r){if(!r)return new Promise(r=>{let i=(0,_.default)(e),a=z(()=>i.kill(`SIGKILL`));i.outputOptions([`-c:v`,`copy`,`-c:a`,`aac`,`-b:a`,`128k`,`-movflags`,`+faststart`]).output(t).on(`progress`,()=>{n?.({percent:80,targetSize:0})}).on(`end`,()=>{B(a),n?.({percent:100,targetSize:0}),r({success:!0,outputPath:t})}).on(`error`,e=>{B(a),L.error(`MP4 remux failed:`,e.message),r({success:!1,outputPath:``,error:e.message})}).run()});let i=t.replace(/\.mp4$/i,`_tmp.mp4`),a=`crop=${Math.round(r.width/2)*2}:${Math.round(r.height/2)*2}:${Math.round(r.x/2)*2}:${Math.round(r.y/2)*2},`;return new Promise(async r=>{let o=await Ee(Oe);function s(t){return new Promise(r=>{let o=(0,_.default)(e),s=z(()=>o.kill(`SIGKILL`));o.outputOptions([...De(t,`23`,ke),`-vf`,`${a}pad=ceil(iw/2)*2:ceil(ih/2)*2,format=yuv420p`,`-an`,`-movflags +faststart`]).output(i).on(`progress`,e=>{n?.({percent:Math.round((e.percent??0)*100)/200,targetSize:e.targetSize??0})}).on(`end`,()=>{B(s),r({success:!0})}).on(`error`,e=>{B(s),L.error(`MP4 pass1 failed (${t}):`,e.message),r({success:!1,error:e.message})}).run()})}let c=await s(o);if(!c.success&&o!==`libx264`&&(L.warn(`MP4 pass1: ${o} failed, retrying with libx264`),await g.default.promises.unlink(i).catch(()=>{}),c=await s(`libx264`)),!c.success){r({success:!1,outputPath:``,error:c.error});return}let l=(0,_.default)(i),u=z(()=>l.kill(`SIGKILL`));l.addInput(e).outputOptions([`-c:v`,`copy`,`-c:a`,`aac`,`-b:a`,`128k`,`-map`,`0:v`,`-map`,`1:a?`,`-shortest`,`-movflags`,`+faststart`]).output(t).on(`progress`,e=>{n?.({percent:Math.round((e.percent??0)*100)/200+50,targetSize:e.targetSize??0})}).on(`end`,()=>{B(u),g.default.promises.unlink(i).catch(()=>{}),r({success:!0,outputPath:t})}).on(`error`,e=>{B(u),L.error(`MP4 audio mux failed:`,e.message),g.default.promises.rename(i,t).then(()=>r({success:!0,outputPath:t})).catch(()=>{g.default.promises.unlink(i).catch(()=>{}),r({success:!1,outputPath:``,error:e.message})})}).run()})}function je(e,t,n,r){let i=Math.round(n.width/2)*2,a=Math.round(n.height/2)*2,o=Math.round(n.x/2)*2,s=Math.round(n.y/2)*2;return new Promise(async n=>{let c=`crop=${i}:${a}:${o}:${s},format=yuv420p`,l=await Ee(Oe);function u(n,i){return new Promise(a=>{let o=(0,_.default)(e),s=z(()=>o.kill(`SIGKILL`));o.outputOptions([...De(n,i,ke),`-vf`,c,`-c:a`,`copy`,`-movflags`,`+faststart`]).output(t).on(`progress`,e=>{r?.({percent:Math.round((e.percent??0)*100),targetSize:e.targetSize??0})}).on(`end`,()=>{B(s),a({success:!0,outputPath:t})}).on(`error`,e=>{B(s),L.error(`Crop failed (${n}):`,e.message),a({success:!1,outputPath:``,error:e.message})}).run()})}let d=await u(l,`18`);!d.success&&l!==`libx264`&&(L.warn(`Crop: ${l} failed, retrying with libx264`),d=await u(`libx264`,`18`)),n(d)})}function Me(e,t,n){return new Promise(r=>{let i=Math.max(...e.map(e=>e.bounds.x+e.bounds.width))-Math.min(...e.map(e=>e.bounds.x)),a=Math.max(...e.map(e=>e.bounds.y+e.bounds.height))-Math.min(...e.map(e=>e.bounds.y)),o=Math.min(...e.map(e=>e.bounds.x)),s=Math.min(...e.map(e=>e.bounds.y)),c=Math.round(i/2)*2,l=Math.round(a/2)*2;L.info(`Merge canvas size:`,c,`x`,l),L.info(`Merge inputs:`,e.map((e,t)=>`[${t}] ${e.filePath} bounds=${JSON.stringify(e.bounds)}`).join(`, `));let u=[],d=e.length;function f(e,t){let n=e.replace(/\.webm$/i,`_remux.mp4`);return new Promise(r=>{let i=(0,_.default)(e),a=z(()=>i.kill(`SIGKILL`));i.outputOptions([`-c`,`copy`]).output(n).on(`end`,()=>{B(a),L.info(`Merge remux ${t+1}/${d} done`),r({success:!0,remuxedPath:n})}).on(`error`,e=>{B(a),L.error(`Merge remux ${t+1} failed:`,e.message),r({success:!1,remuxedPath:n,error:e.message})}).run()})}async function p(){for(let e of u)await g.default.promises.unlink(e).catch(()=>{});for(let t of e)await g.default.promises.unlink(t.filePath).catch(()=>{})}async function m(){let r=await Ee(Oe),i=[`color=c=black:s=${c}x${l}[bg]`],a=`[bg]`;for(let t=0;t<e.length;t++){let n=e[t],r=Math.round((n.bounds.x-o)/2)*2,c=Math.round((n.bounds.y-s)/2)*2,l=Math.round(n.bounds.width/2)*2,u=Math.round(n.bounds.height/2)*2,d=`[s${t}]`,f=t===e.length-1?`[out]`:`[tmp${t}]`;i.push(`[${t}:v]scale=${l}:${u},setsar=1${d}`),i.push(`${a}${d}overlay=${r}:${c}${f}`),a=f}i.push(`[out]format=yuv420p`),L.info(`Merge filter_complex:`,i.join(`;`));function d(r){return new Promise(a=>{let o=(0,_.default)(),s=z(()=>o.kill(`SIGKILL`));for(let e of u)o.addInput(e);o.complexFilter(i).outputOptions([...De(r,`23`,ke),`-movflags`,`+faststart`]).output(t).on(`start`,()=>{L.info(`Merge ffmpeg command started (${r})`)}).on(`progress`,e=>{let t=Math.round(e.percent??0);n?.({percent:Math.min(30+t*.7,100),targetSize:e.targetSize??0})}).on(`end`,()=>{B(s),L.info(`Merge completed successfully`);for(let t of e)g.default.promises.unlink(t.filePath).catch(()=>{});for(let e of u)g.default.promises.unlink(e).catch(()=>{});a({success:!0,outputPath:t})}).on(`error`,t=>{B(s),L.error(`Multi-screen merge failed (${r}):`,t.message);for(let t of e)g.default.promises.unlink(t.filePath).catch(()=>{});for(let e of u)g.default.promises.unlink(e).catch(()=>{});a({success:!1,outputPath:``,error:t.message})}).run()})}let f=await d(r);return!f.success&&r!==`libx264`&&(L.warn(`Merge: ${r} failed, retrying with libx264`),await g.default.promises.unlink(t).catch(()=>{}),f=await d(`libx264`)),f}(async()=>{for(let t=0;t<d;t++){let i=await f(e[t].filePath,t);if(!i.success){L.error(`Merge aborted: remux ${t+1}/${d} failed, short-circuiting`),await g.default.promises.unlink(i.remuxedPath).catch(()=>{}),await p(),r({success:!1,outputPath:``,error:i.error});return}u.push(i.remuxedPath),n?.({percent:Math.round((t+1)/d*30),targetSize:0})}r(await m())})()})}function Ne(e,t,n,r){let{execFile:i}=require(`node:child_process`),a=v.default.path,o=n?.width??480,s=n?.fps??10,c=u.default.join(y.default.tmpdir(),`gif_palette_${Date.now()}.png`);L.info(`GIF conversion - input:`,e,`palette:`,c,`output:`,t);let l=[`-y`,`-i`,e,`-vf`,`fps=${s},scale=${o}:-1:flags=lanczos,palettegen`,c];return new Promise(u=>{let d=``,f=``,p=i(a,l,l=>{if(B(d),l){L.error(`GIF palette gen failed:`,l.message),u({success:!1,outputPath:``,error:l.message});return}L.info(`GIF palette generated successfully`);let p=i(a,[`-y`,`-i`,e,`-i`,c,`-filter_complex`,`[0:v]fps=${s},scale=${o}:-1:flags=lanczos[x];[x][1:v]paletteuse`,t],e=>{B(f),g.default.promises.unlink(c).catch(()=>{}),e?(L.error(`GIF creation failed:`,e.message),u({success:!1,outputPath:``,error:e.message})):u({success:!0,outputPath:t})});f=z(()=>p.kill(`SIGKILL`)),p.stdout&&p.stdout.on(`data`,e=>{let t=e.toString().match(/time=(\d+:\d+:\d+\.\d+)/);if(t&&n?.duration){let e=t[1].split(`:`).map(Number),i=e[0]*3600+e[1]*60+e[2],a=Math.min(Math.round(i/n.duration*100),99);r?.({percent:a+50,targetSize:0})}else r?.({percent:75,targetSize:0})})});d=z(()=>p.kill(`SIGKILL`))})}var Pe=s(((e,t)=>{R();var n=null;function r(e){n=e}function i(e,t){f&&!f.isDestroyed()&&f.webContents.send(`audio-levels`,{micLevel:e,sysLevel:t}),D&&!D.isDestroyed()&&D.webContents.send(`audio-levels`,{micLevel:e,sysLevel:t})}var a=null,o=null;function s(){return new Promise(e=>{o=e,n&&!n.isDestroyed()&&n.minimize();let{x:t,y:r,width:i,height:s}=d.screen.getPrimaryDisplay().bounds;a=new d.BrowserWindow({x:t,y:r,width:i,height:s,frame:!1,transparent:!0,resizable:!1,movable:!1,alwaysOnTop:!0,skipTaskbar:!0,hasShadow:!1,webPreferences:{nodeIntegration:!0,contextIsolation:!1}});let l=(0,u.join)(__dirname,`region-selector.html`);a.loadFile(l).catch(e=>{L.error(`Failed to load region selector:`,e.message),c(null)}),a.setFullScreen(!0),a.setVisibleOnAllWorkspaces(!0),a.setIgnoreMouseEvents(!1),a.on(`closed`,()=>{o&&=(o(null),null)})})}function c(e){a&&!a.isDestroyed()&&a.close(),a=null,o&&=(o(e),null)}var l=null,f=null,p=null,m=null,h=null,g=200,_=150,v=12,y=null,b=0,x=0,S=null;function C(){if(!h||h.isDestroyed())return;let e=d.screen.getCursorScreenPoint(),[t,n]=h.getPosition();b=e.x-t,x=e.y-n;let[r,i]=h.getSize();S=setInterval(()=>{if(!h||h.isDestroyed()){w();return}let e=d.screen.getCursorScreenPoint(),t=e.x-b,n=e.y-x;y&&(t=Math.max(y.x,Math.min(t,y.x+y.width-r)),n=Math.max(y.y,Math.min(n,y.y+y.height-i))),h.setBounds({x:t,y:n,width:r,height:i})},16)}function w(){S&&=(clearInterval(S),null)}function T(e,t){E(),y=e;let n=e.x+e.width-g-v,r=e.y+v;h=new d.BrowserWindow({x:n,y:r,width:g,height:_,frame:!1,transparent:!0,resizable:!1,movable:!1,alwaysOnTop:!0,skipTaskbar:!0,hasShadow:!1,webPreferences:{nodeIntegration:!0,contextIsolation:!1}}),h.setVisibleOnAllWorkspaces(!0),h.setAlwaysOnTop(!0,`screen-saver`);let i=(0,u.join)(__dirname,`camera-preview.html`),a=t?`?deviceId=${encodeURIComponent(t)}`:``;h.loadFile(i+a).catch(e=>{L.error(`Failed to load camera preview:`,e.message)}),L.info(`Camera preview shown at`,n,r)}function E(){h&&!h.isDestroyed()&&(h.close(),h=null)}var D=null,O=null,k=null,ee=`idle`,te=null;function ne(e,t){re(),ee=`idle`;let n=d.screen.getPrimaryDisplay();if(t!=null){let e=d.screen.getAllDisplays().find(e=>e.id===t);e&&(n=e)}let r=n.bounds;te=r,D=new d.BrowserWindow({x:Math.round(r.x+(r.width-340)/2),y:r.y+4,width:340,height:44,frame:!1,transparent:!0,resizable:!0,movable:!1,alwaysOnTop:!0,skipTaskbar:!0,hasShadow:!1,webPreferences:{nodeIntegration:!0,contextIsolation:!1}}),D.setVisibleOnAllWorkspaces(!0),D.setMinimumSize(100,44),D.setAlwaysOnTop(!0,`screen-saver`);let i=`<!DOCTYPE html>
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
</body></html>`;D.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(i)}`),L.info(`Floating island shown`),y=r,e?.cameraEnabled&&T(r,e.cameraDeviceId)}function re(){O&&=(clearInterval(O),null),k&&=(clearTimeout(k),null),D&&!D.isDestroyed()&&(D.close(),D=null),E(),y=null,te=null}function A(e,t){if(ee=e===`idle`?`idle`:e===`recording`?`recording`:e===`paused`?`paused`:ee,e===`show`||e===`hide`){D&&!D.isDestroyed()&&D.webContents.send(`island-state`,e);return}D&&!D.isDestroyed()&&D.webContents.send(`island-state`,e,t),O&&=(clearInterval(O),null),k&&=(clearTimeout(k),null),e===`recording`&&(O=setInterval(()=>{if(!D||D.isDestroyed())return;let e=d.screen.getCursorScreenPoint(),[t,n]=D.getPosition(),[r,i]=D.getSize();e.x>=t&&e.x<=t+r&&e.y>=n-4&&e.y<=n+i?(k&&=(clearTimeout(k),null),D.webContents.send(`island-state`,`show`)):k||=setTimeout(()=>{D&&!D.isDestroyed()&&D.webContents.send(`island-state`,`hide`),k=null},500)},500))}var j=44,M=3;function N(e,t){F();let n=M,r=n+2,i=d.screen.getPrimaryDisplay().bounds,a=e.y-i.y,o=i.y+i.height-(e.y+e.height),s=j+4,c,u,g,_;a>=s?(_=`top`,c=e.x-r,u=e.y-j-r,g=e.width+r*2):o>=s?(_=`bottom`,c=e.x-r,u=e.y+e.height+r,g=e.width+r*2):(_=`inside`,c=e.x,u=e.y,g=Math.min(e.width,500)),p={...e},m=_,f=new d.BrowserWindow({x:c,y:u,width:g,height:j,frame:!1,transparent:!0,resizable:!1,movable:!1,alwaysOnTop:!0,skipTaskbar:!0,hasShadow:!1,webPreferences:{nodeIntegration:!0,contextIsolation:!1}}),f.setVisibleOnAllWorkspaces(!0),f.setAlwaysOnTop(!0,`screen-saver`);let v=`<!DOCTYPE html>
<html><head><style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;overflow:hidden;font-family:'Segoe UI',system-ui,sans-serif}
.toolbar{
  width:100%;height:${j}px;
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
</body></html>`;f.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(v)}`);let b=e.x-r,x=e.y-r,S=e.width+r*2,C=e.height+r*2;l=new d.BrowserWindow({x:b,y:x,width:S,height:C,show:!1,frame:!1,transparent:!0,resizable:!1,movable:!1,alwaysOnTop:!0,skipTaskbar:!0,hasShadow:!1,webPreferences:{nodeIntegration:!0,contextIsolation:!1}}),l.setVisibleOnAllWorkspaces(!0),l.setAlwaysOnTop(!0,`screen-saver`),l.setIgnoreMouseEvents(!0),l.setBounds({x:b,y:x,width:S,height:C}),l.show();let w=`<!DOCTYPE html>
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
</body></html>`;l.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(w)}`),L.info(`Region border+toolbar shown (split windows):`,e),y=e,t?.cameraEnabled&&T(e,t.cameraDeviceId),l&&!l.isDestroyed()&&l.setAlwaysOnTop(!0,`screen-saver`),f&&!f.isDestroyed()&&f.setAlwaysOnTop(!0,`screen-saver`),h&&!h.isDestroyed()&&h.setAlwaysOnTop(!0,`screen-saver`)}function ie(e,t){f&&!f.isDestroyed()&&(f.webContents.send(`toolbar-state`,e,t,m),(e===`recording`||e===`paused`)&&m===`inside`&&p&&f.setBounds({x:p.x+8,y:p.y+8,width:170,height:40}))}function P(){l&&!l.isDestroyed()&&(l.close(),l=null)}function F(){P(),f&&!f.isDestroyed()&&(f.close(),f=null),E(),y=null,L.info(`Region border hidden`)}function ae(){d.ipcMain.on(`region-selected`,(e,t)=>{L.info(`Region selected:`,t),c(t)}),d.ipcMain.on(`region-cancelled`,()=>{L.info(`Region selection cancelled`),c(null)}),d.ipcMain.handle(`show-region-border`,(e,t,n)=>{N(t,n)}),d.ipcMain.handle(`hide-region-border`,()=>{F()}),d.ipcMain.handle(`hide-border-only`,()=>{P()}),d.ipcMain.handle(`update-toolbar-state`,(e,t,n)=>{ie(t,n)}),d.ipcMain.on(`toolbar-action`,(e,t)=>{if(L.info(`Toolbar action:`,t),t===`close`){n&&!n.isDestroyed()&&n.webContents.send(`on-toolbar-action`,`close`),F();return}n&&!n.isDestroyed()&&n.webContents.send(`on-toolbar-action`,t)}),d.ipcMain.removeHandler(`set-mouse-ignore`),d.ipcMain.removeAllListeners(`set-mouse-ignore`),d.ipcMain.handle(`show-floating-island`,(e,t,n)=>{ne(t,n)}),d.ipcMain.handle(`hide-floating-island`,()=>{re()}),d.ipcMain.handle(`hide-camera-preview`,()=>{E()}),d.ipcMain.handle(`toggle-camera-preview`,(e,t,n)=>{t&&y?T(y,n):E()}),d.ipcMain.on(`camera-drag-start`,()=>C()),d.ipcMain.on(`camera-drag-end`,()=>w()),d.ipcMain.handle(`set-island-state`,(e,t,n)=>{A(t,n)}),d.ipcMain.on(`island-action`,(e,t)=>{L.info(`Island action:`,t),n&&!n.isDestroyed()&&n.webContents.send(`on-toolbar-action`,t)}),d.ipcMain.on(`resize-island`,(e,t,n)=>{if(D&&!D.isDestroyed()){if(!Number.isFinite(t))return;let e=te||d.screen.getPrimaryDisplay().bounds,r=t+20,i=Math.round(e.x+(e.width-r)/2),a=Number.isFinite(n)?n:44;D.setBounds({x:i,y:e.y+4,width:r,height:a})}})}t.exports={selectRegion:s,showRegionBorder:N,hideRegionBorder:F,hideBorderOnly:P,updateToolbarState:ie,updateAudioLevels:i,showFloatingIsland:ne,hideFloatingIsland:re,showCameraPreview:T,hideCameraPreview:E,setFloatingIslandState:A,setMainWindow:r,registerRegionSelectorHandlers:ae}})),V=Pe();R();var H=null,U=null,W=null,G=66,K=240,Fe=`floating-ball-pos.json`;function Ie(){return(0,u.join)(d.app.isPackaged?d.app.getPath(`userData`):(0,u.join)(__dirname,`..`,`..`),Fe)}function Le(){try{let e=g.default.readFileSync(Ie(),`utf-8`),t=JSON.parse(e);if(typeof t.x==`number`&&typeof t.y==`number`)return t}catch{}return null}function Re(e){try{g.default.writeFileSync(Ie(),JSON.stringify(e),`utf-8`)}catch{}}var ze=`floating-ball-settings.json`,Be={visible:!0,alwaysOnTop:!0,openAtLogin:!1},Ve=null;function He(){return(0,u.join)(d.app.isPackaged?d.app.getPath(`userData`):(0,u.join)(__dirname,`..`,`..`),ze)}function Ue(){try{let e=g.default.readFileSync(He(),`utf-8`),t=JSON.parse(e);return{visible:typeof t.visible==`boolean`?t.visible:Be.visible,alwaysOnTop:typeof t.alwaysOnTop==`boolean`?t.alwaysOnTop:Be.alwaysOnTop,openAtLogin:typeof t.openAtLogin==`boolean`?t.openAtLogin:Be.openAtLogin}}catch{}return{...Be}}function We(e){try{g.default.writeFileSync(He(),JSON.stringify(e),`utf-8`)}catch{}}function q(){return Ve||(Ve=Ue(),Ve)}function Ge(e){let t={...q(),...e};return We(t),Ve=t,t}function Ke(){U=null;try{g.default.unlinkSync(Ie())}catch{}}function qe(){q().visible&&Xe()}function Je(e){H&&!H.isDestroyed()&&H.setAlwaysOnTop(e,`screen-saver`)}function Ye(e){e.visible?Xe():Ze(),Je(e.alwaysOnTop)}function Xe(){if(H&&!H.isDestroyed()){H.show(),H.focus();return}if(!U){let e=Le();if(e)U=e;else{let e=d.screen.getPrimaryDisplay().bounds;U={x:Math.round(e.x+(e.width-G)/2),y:Math.round(e.y+(e.height-G)/2)}}}H=new d.BrowserWindow({x:U.x,y:U.y,width:G,height:G,frame:!1,transparent:!0,backgroundColor:`#00000000`,resizable:!1,alwaysOnTop:q().alwaysOnTop,skipTaskbar:!0,hasShadow:!1,show:!1,webPreferences:{nodeIntegration:!0,contextIsolation:!1}}),H.setVisibleOnAllWorkspaces(!0),H.setAlwaysOnTop(q().alwaysOnTop,`screen-saver`);let e=rt();H.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(e)}`),H.once(`ready-to-show`,()=>{H?.show(),H&&!H.isDestroyed()&&H.webContents.executeJavaScript(`ensureMenu()`).catch(()=>{})});let t=H;H.on(`closed`,()=>{H===t&&(H=null)}),H.on(`move`,()=>{if(H&&!H.isDestroyed()){let[e,t]=H.getPosition();U={x:e,y:t}}}),H.on(`close`,()=>{U&&Re(U)}),L.info(`Floating ball shown`)}function Ze(){if(H&&!H.isDestroyed()){let[e,t]=H.getPosition();U={x:e,y:t},Re(U);let n=H;H=null,n.destroy(),L.info(`Floating ball hidden`)}}async function Qe(){if(!H||H.isDestroyed())return;let[e,t]=H.getPosition(),n=Math.round(e+G/2),r=Math.round(t+G/2);L.info(`[Ball] expand at`,[e,t],`center`,[n,r]),H.setOpacity(0),H.setBounds({x:n-K/2,y:r-K/2,width:K,height:K});try{await H.webContents.executeJavaScript(`ensureMenu(); document.body.offsetHeight; document.body.classList.add('expanded'); isExpanded=true; void 0;`)}catch{}if(!(!H||H.isDestroyed())){try{await H.capturePage()}catch{}!H||H.isDestroyed()||(H.setOpacity(1),H.webContents.send(`ball-state`,`expanded`))}}async function $e(){if(!H||H.isDestroyed())return;let[e,t]=H.getPosition(),n=Math.round(e+K/2),r=Math.round(t+K/2);L.info(`[Ball] collapse at`,[e,t],`center`,[n,r]),H.setOpacity(0);try{await H.webContents.executeJavaScript(`document.body.classList.remove('expanded');
       var s=document.getElementById('ringSvg');while(s.firstChild){s.removeChild(s.firstChild)}
       menuCreated=false; isExpanded=false; void 0;`)}catch{}if(!H||H.isDestroyed())return;let i=n-G/2,a=r-G/2;H.setBounds({x:i,y:a,width:G,height:G});let[o,s]=H.getPosition();(o!==i||s!==a)&&H.setBounds({x:i+(i-o),y:a+(a-s),width:G,height:G}),H.setOpacity(1)}function et(e){if(e===`record`)process.emit(`clawd-show-record-window`);else if(e===`ai`)process.emit(`clawd-show-ai-window`);else if(e===`settings`)process.emit(`clawd-show-settings-window`);else{let t=d.BrowserWindow.getAllWindows().find(e=>!e.isDestroyed()&&e!==H);t&&!t.isDestroyed()&&t.webContents.send(`on-floating-ball-action`,e)}$e()}var tt=null;function nt(e=48){if(tt)return tt;try{let t=[(0,u.join)(__dirname,`..`,`..`,`public`,`logo.png`),(0,u.join)(__dirname,`..`,`public`,`logo.png`),(0,u.join)(__dirname,`..`,`..`,`resources`,`logo.png`)];for(let n of t)if(g.default.existsSync(n))return tt=d.nativeImage.createFromPath(n).resize({width:e,height:e,quality:`good`}).toDataURL(),tt}catch{}return``}function rt(){return`<!DOCTYPE html>
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
.arc-label .icon{font-size:18px;fill:#e94560;font-weight:700}
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
    <img id="logoImg" class="logo-img" src="${nt(48)}" alt="logo" />
  </button>
</div>

<script>
const {ipcRenderer} = require('electron')

const ITEMS = [
  {label:'录屏',icon:'●',action:'record'},
  {label:'AI助手',icon:'✦',action:'ai'},
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
  const segArc = 360 / total
  const startOff = -90 - segArc / 2

  ITEMS.forEach(function(item, i){
    const sa = startOff + i * segArc
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
</html>`}function it(){d.ipcMain.handle(`show-floating-ball`,()=>{Xe()}),d.ipcMain.handle(`hide-floating-ball`,()=>{Ze()}),d.ipcMain.handle(`toggle-floating-ball`,()=>{Ze()}),d.ipcMain.on(`floating-ball-expand`,()=>{Qe()}),d.ipcMain.on(`floating-ball-collapse`,()=>{$e()}),d.ipcMain.on(`floating-ball-action`,(e,t)=>{L.info(`Floating ball action:`,t),et(t)});let e=null;d.ipcMain.on(`floating-ball-drag-start`,(t,n,r)=>{if(!H||H.isDestroyed())return;let[i,a]=H.getPosition(),[o,s]=H.getSize();W={winX:i,winY:a,scrX:n,scrY:r},e={w:o,h:s}}),d.ipcMain.on(`floating-ball-move`,(t,n,r)=>{if(!H||H.isDestroyed()||!W||!e||!Number.isFinite(n)||!Number.isFinite(r))return;let i=n-W.scrX,a=r-W.scrY,o=Math.round(W.winX+i),s=Math.round(W.winY+a);H.setBounds({x:o,y:s,width:e.w,height:e.h});let[c,l]=H.getPosition();(c!==o||l!==s)&&H.setBounds({x:o+(o-c),y:s+(s-l),width:e.w,height:e.h})}),d.ipcMain.on(`floating-ball-drag-end`,()=>{if(W=null,e=null,H&&!H.isDestroyed()){let[e,t]=H.getPosition(),[n,r]=H.getSize(),i=d.screen.getDisplayMatching(H.getBounds()).bounds,a=e,o=t;if(e-i.x<40?a=i.x:i.x+i.width-(e+n)<40&&(a=i.x+i.width-n),t-i.y<40?o=i.y:i.y+i.height-(t+r)<40&&(o=i.y+i.height-r),a!==e||o!==t){H.setBounds({x:a,y:o,width:n,height:r});let[e,t]=H.getPosition();H.setBounds({x:a+(a-e),y:o+(o-t),width:n,height:r}),U&&(U={x:a,y:o},Re(U)),L.info(`Floating ball snapped to edge:`,[a,o])}}U&&Re(U)}),d.ipcMain.handle(`get-floating-ball-settings`,()=>q()),d.ipcMain.handle(`set-floating-ball-settings`,(e,t)=>{let n=Ge(t);if(Ye(n),t.openAtLogin!==void 0)try{d.app.setLoginItemSettings({openAtLogin:t.openAtLogin})}catch(e){L.error(`setLoginItemSettings failed:`,e)}return n}),d.ipcMain.handle(`reset-floating-ball-position`,()=>{if(Ke(),H&&!H.isDestroyed()){let e=d.screen.getPrimaryDisplay().bounds,t=Math.round(e.x+(e.width-G)/2),n=Math.round(e.y+(e.height-G)/2);try{H.webContents.executeJavaScript(`document.body.classList.remove('expanded'); var s=document.getElementById('ringSvg');if(s){while(s.firstChild){s.removeChild(s.firstChild)}} menuCreated=false; isExpanded=false; void 0;`).catch(()=>{})}catch{}H.setBounds({x:t,y:n,width:G,height:G}),U={x:t,y:n};let[r,i]=H.getPosition();(r!==t||i!==n)&&H.setBounds({x:t+(t-r),y:n+(n-i),width:G,height:G})}})}var at=s(((e,t)=>{R();var n=null;function r(){let e=d.app.isPackaged?(0,u.join)(process.resourcesPath,`logo.ico`):(0,u.join)(__dirname,`../../public/logo.ico`);return d.nativeImage.createFromPath(e).resize({width:16,height:16})}function i(){let e=d.app.isPackaged?(0,u.join)(process.resourcesPath,`logo.png`):(0,u.join)(__dirname,`../../public/logo.png`);return e?d.nativeImage.createFromPath(e).resize({width:64,height:64,quality:`better`}):d.nativeImage.createEmpty()}function a(){if(n&&!n.isDestroyed())return;n=new d.Tray(r()),n.setToolTip(`二支录制`);let e=d.Menu.buildFromTemplate([{label:`显示设置窗口`,click:()=>{process.emit(`clawd-show-settings-window`)}},{type:`separator`},{label:`退出`,click:()=>{let{app:e}=require(`electron`);e.quit()}}]);n.setContextMenu(e),n.on(`click`,()=>{process.emit(`clawd-show-settings-window`)}),L.info(`System tray created`)}function o(e,t){n&&!n.isDestroyed()&&(n.displayBalloon({title:e,content:t,icon:i()}),L.info(`Tray balloon:`,e,t))}function s(){n&&!n.isDestroyed()&&(n.destroy(),n=null)}t.exports={createTray:a,showBalloon:o,destroyTray:s}}))();R();var J=null,Y=null,ot=!1,st=!1;function ct(){return d.app.isPackaged?f.join(process.resourcesPath,`question-card-utils.js`):f.join(__dirname,`question-card-utils.js`)}function lt(){return`<!DOCTYPE html>
<html><head><style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{height:100%;overflow:hidden;font-family:'Segoe UI',system-ui,sans-serif}
.island{
  width:fit-content;height:fit-content;
  background:rgba(20,20,40,0.96);
  border-radius:22px;
  display:flex;flex-direction:column;
  border:1px solid rgba(255,255,255,0.1);
  transition:opacity 0.3s,transform 0.3s;
  overflow:hidden;
}
.island.hidden{opacity:0;transform:translateY(-8px) scaleY(0.5);pointer-events:none}
.island-row{display:flex;align-items:center;gap:8px;height:40px;padding:0 14px;justify-content:center;cursor:grab;-webkit-user-select:none;user-select:none;touch-action:none}
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
/* 权限卡片：宽度按内容自适应，最窄 300 / 最宽 420（超出在 420 内换行） */
.perm-card{width:max-content;min-width:300px;max-width:420px;padding:0;display:none;flex-direction:column;word-break:break-word}
.perm-card.show{display:flex;animation:perm-in 0.22s cubic-bezier(0.4,0,0.2,1)}
@keyframes perm-in{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}
.perm-banner{display:flex;align-items:center;gap:8px;padding:8px 14px;background:rgba(255,255,255,0.04);border-top:1px solid rgba(255,255,255,0.1);border-bottom:1px solid rgba(255,255,255,0.06)}
.perm-banner-dot{width:7px;height:7px;border-radius:50%;background:#e8e8f0;animation:ai-pulse 0.9s ease-in-out infinite;box-shadow:0 0 8px rgba(232,232,240,0.5);flex-shrink:0}
.perm-banner-text{font-size:11px;font-weight:600;color:#e8e8f0;letter-spacing:0.4px}
.perm-body{display:flex;flex-direction:column;gap:10px;padding:12px 14px 10px}
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
/* 提问卡片（AskUserQuestion 只读通知——Claude 的 hook 无法注入答案，答案须回主界面作答）：宽度按内容自适应，最窄 300 / 最宽 420；word-break 继承让长选项在卡宽内换行而非溢出裁剪 */
.question-card{width:max-content;min-width:300px;max-width:420px;padding:0;display:none;flex-direction:column;word-break:break-word}
.question-card.show{display:flex;animation:perm-in 0.22s cubic-bezier(0.4,0,0.2,1)}
.question-banner{display:flex;align-items:center;gap:8px;padding:8px 14px;background:rgba(255,255,255,0.04);border-top:1px solid rgba(255,255,255,0.1);border-bottom:1px solid rgba(255,255,255,0.06)}
.question-banner-dot{width:7px;height:7px;border-radius:50%;background:#fbbf24;animation:ai-breathe 1.2s ease-in-out infinite;box-shadow:0 0 8px rgba(251,191,36,0.6);flex-shrink:0}
.question-banner-text{font-size:11px;font-weight:600;color:#fde68a;letter-spacing:0.4px}
/* 逐题推进的进度：右对齐，单题时隐藏 */
.question-progress{margin-left:auto;font-size:10px;font-weight:600;color:rgba(253,230,138,0.9);letter-spacing:0.3px}
.question-body{display:flex;flex-direction:column;gap:8px;padding:12px 14px 10px}
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
</style></head><body>
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
const __QCU_UTILS_PATH__=${JSON.stringify(ct())}
const quiz=require(__QCU_UTILS_PATH__)
const {resolveQuestionList,toQuestionItem,buttonLabel,progressText,questionKey,multiSelectOf,withOther,toggleOption,buildAnswers}=quiz
const {ipcRenderer}=require('electron')
function resizeIsland(){
  const island=document.getElementById('island')
  const w=island.scrollWidth
  const h=island.scrollHeight
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
ipcRenderer.send('set-ai-island-mouse-mode', true) // 初始视为内容区可交互
resizeIsland()
initStatus()
<\/script>
</body></html>`}function ut(){if(J&&!J.isDestroyed())return;let e=d.screen.getPrimaryDisplay().bounds;J=new d.BrowserWindow({x:Math.round(e.x+(e.width-200)/2),y:e.y+4,width:200,height:44,frame:!1,transparent:!0,resizable:!0,movable:!1,alwaysOnTop:!0,skipTaskbar:!0,hasShadow:!1,webPreferences:{nodeIntegration:!0,contextIsolation:!1}}),J.setVisibleOnAllWorkspaces(!0),J.setMinimumSize(100,44),J.setAlwaysOnTop(!0,`screen-saver`),J.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(lt())}`),L.info(`AI island shown`)}function dt(){J&&!J.isDestroyed()&&(J.close(),J=null,L.info(`AI island hidden`))}function ft(){d.ipcMain.on(`resize-ai-island`,(e,t,n)=>{if(!J||J.isDestroyed()||!Number.isFinite(t))return;let r=t+20,i=Number.isFinite(n)?n:44;if(!(!Number.isFinite(r)||!Number.isFinite(i)))if(ot){let[e,t]=J.getPosition();if(!Number.isFinite(e)||!Number.isFinite(t))return;J.setBounds({x:e,y:t,width:r,height:i})}else{let e=d.screen.getPrimaryDisplay().bounds,t=Math.round(e.x+(e.width-r)/2),n=e.y+4;if(!Number.isFinite(t)||!Number.isFinite(n))return;J.setBounds({x:t,y:n,width:r,height:i})}}),d.ipcMain.on(`ai-island-drag-start`,(e,t,n)=>{if(!J||J.isDestroyed()||!Number.isFinite(t)||!Number.isFinite(n))return;let[r,i]=J.getPosition();Y={winX:r,winY:i,scrX:t,scrY:n}}),d.ipcMain.on(`ai-island-drag-move`,(e,t,n)=>{if(!J||J.isDestroyed()||!Y||!Number.isFinite(t)||!Number.isFinite(Y.scrX)||!Number.isFinite(Y.winX)||!Number.isFinite(Y.winY))return;let r=t-Y.scrX,i=Math.round(Y.winX+r);if(!Number.isFinite(i))return;let[a,o]=J.getSize();J.setBounds({x:i,y:Y.winY,width:a,height:o})}),d.ipcMain.on(`ai-island-drag-end`,()=>{Y=null,ot=!0}),d.ipcMain.on(`set-ai-island-mouse-mode`,(e,t)=>{if(!J||J.isDestroyed())return;let n=!t;n!==st&&(st=n,J.setIgnoreMouseEvents(n,{forward:!0}))})}R();var{updateAudioLevels:pt}=Pe();function mt(){return(0,u.join)(d.app.getPath(`userData`),`recordings.json`)}function ht(e){(0,V.registerRegionSelectorHandlers)(),it(),ft(),d.ipcMain.handle(`show-ai-island`,()=>{ut()}),d.ipcMain.handle(`hide-ai-island`,()=>{dt()}),d.ipcMain.handle(`select-region`,async()=>(0,V.selectRegion)()),d.ipcMain.handle(`get-sources`,async(e,t)=>(await d.desktopCapturer.getSources({types:t??[`screen`,`window`],thumbnailSize:{width:340,height:200},fetchWindowIcons:!0})).map(e=>({id:e.id,name:e.name,display_id:e.display_id,appIcon:e.appIcon?.toDataURL()||null,thumbnail:e.thumbnail.toDataURL()}))),d.ipcMain.handle(`get-system-audio-sources`,async()=>{try{return(await d.desktopCapturer.getSources({types:[`audio`]})).map(e=>({id:e.id,name:e.name}))}catch{return[]}}),d.ipcMain.handle(`show-save-dialog`,async(e,t)=>{let n=d.BrowserWindow.getFocusedWindow();return n?d.dialog.showSaveDialog(n,{title:t?.title??`Save Recording`,defaultPath:t?.defaultPath??`recording-${Date.now()}.webm`,filters:t?.filters??[{name:`WebM Video`,extensions:[`webm`]},{name:`MP4 Video`,extensions:[`mp4`]},{name:`GIF`,extensions:[`gif`]}]}):{canceled:!0,filePath:null}}),d.ipcMain.handle(`show-open-dialog`,async(e,t)=>{let n=d.BrowserWindow.getFocusedWindow();return n?d.dialog.showOpenDialog(n,{title:t?.title??`Select File`,defaultPath:t?.defaultPath,filters:t?.filters??[{name:`Video Files`,extensions:[`webm`,`mp4`,`gif`]}],properties:t?.properties}):{canceled:!0,filePaths:[]}}),d.ipcMain.handle(`get-default-save-dir`,async()=>d.app.getPath(`videos`)||d.app.getPath(`desktop`)),d.ipcMain.handle(`write-file`,async(e,t,n)=>{try{return await g.default.promises.mkdir((0,u.dirname)(n),{recursive:!0}),await g.default.promises.writeFile(n,t),L.info(`保存文件`,n),{success:!0,filePath:n}}catch(e){return L.error(`保存文件失败`,n,e.message),{success:!1,filePath:n,error:e.message}}}),d.ipcMain.handle(`read-file`,async(e,t)=>{try{return(await g.default.promises.readFile(t)).buffer}catch(e){throw Error(`Failed to read file: ${e.message}`)}}),d.ipcMain.handle(`file-exists`,async(e,t)=>{try{return await g.default.promises.access(t),!0}catch{return!1}}),d.ipcMain.handle(`delete-file`,async(e,t)=>{try{return await g.default.promises.unlink(t),!0}catch{return!1}}),d.ipcMain.handle(`get-file-size`,async(e,t)=>{try{return(await g.default.promises.stat(t)).size}catch{return 0}});function t(e,t,...n){if(!(!e||e.isDestroyed()))try{e.webContents.send(t,...n)}catch{}}d.ipcMain.handle(`convert-to-mp4`,async(e,n,r,i)=>{L.info(`转换为 MP4`,n,`->`,r,i?`crop: ${i.width}x${i.height}`:``);let a=d.BrowserWindow.fromWebContents(e.sender);return Ae(n,r,e=>{t(a,`on-conversion-progress`,e)},i)}),d.ipcMain.handle(`crop-video`,async(e,n,r,i)=>{L.info(`裁剪视频`,n,`->`,r,`crop: ${i.width}x${i.height}+${i.x}+${i.y}`);let a=d.BrowserWindow.fromWebContents(e.sender);return je(n,r,i,e=>{t(a,`on-conversion-progress`,e)})}),d.ipcMain.handle(`convert-to-gif`,async(e,n,r,i)=>{L.info(`转换为 GIF`,n,`->`,r);let a=d.BrowserWindow.fromWebContents(e.sender);return Ne(n,r,i,e=>{t(a,`on-conversion-progress`,e)})}),d.ipcMain.handle(`merge-multi-screen`,async(e,n,r)=>{L.info(`合并多屏录制`,n.length,`个屏幕 ->`,r);let i=d.BrowserWindow.fromWebContents(e.sender);return Me(n,r,e=>{t(i,`on-conversion-progress`,e)})}),d.ipcMain.handle(`open-file-location`,async(e,t)=>{d.shell.showItemInFolder(t)}),d.ipcMain.handle(`open-external`,async(e,t)=>{d.shell.openExternal(t)}),d.ipcMain.handle(`open-path`,async(e,t)=>{await d.shell.openPath(t)}),d.ipcMain.handle(`get-app-version`,async()=>d.app.getVersion()),d.ipcMain.handle(`get-screen-scale-factor`,async()=>d.screen.getPrimaryDisplay().scaleFactor),d.ipcMain.handle(`get-screen-bounds`,async()=>{let e=d.screen.getPrimaryDisplay(),t=e.scaleFactor;return{x:Math.round(e.bounds.x/t),y:Math.round(e.bounds.y/t),width:Math.round(e.bounds.width/t),height:Math.round(e.bounds.height/t)}}),d.ipcMain.handle(`take-screenshot`,async e=>{try{let e=await d.desktopCapturer.getSources({types:[`screen`],thumbnailSize:{width:0,height:0}});if(!e.length)throw Error(`未找到屏幕源`);let t=e[0].thumbnail.toPNG(),n=new Date,r=`截图_${n.getFullYear()}${String(n.getMonth()+1).padStart(2,`0`)}${String(n.getDate()).padStart(2,`0`)}_${String(n.getHours()).padStart(2,`0`)}${String(n.getMinutes()).padStart(2,`0`)}${String(n.getSeconds()).padStart(2,`0`)}.png`,i=(0,u.join)(d.app.getPath(`desktop`),r);return await g.default.promises.writeFile(i,t),(0,at.showBalloon)(`二支录制`,`截图已保存到桌面：${r}`),{success:!0,filePath:i}}catch(e){return L.error(`截图失败`,e.message),{success:!1,error:e.message}}}),d.ipcMain.handle(`get-all-displays`,async()=>{let e=d.screen.getAllDisplays(),t=d.screen.getPrimaryDisplay(),n=await d.desktopCapturer.getSources({types:[`screen`],thumbnailSize:{width:340,height:200}});return e.map((e,r)=>{let i=n[r];return{id:e.id,label:e.id===t.id?`主屏幕`:`屏幕 ${r+1}`,bounds:e.bounds,scaleFactor:e.scaleFactor,size:{width:e.size.width,height:e.size.height},isPrimary:e.id===t.id,sourceId:i?.id||null,sourceName:i?.name||``,thumbnail:i?.thumbnail?.toDataURL()||``}})}),d.ipcMain.handle(`minimize-window`,async e=>{d.BrowserWindow.fromWebContents(e.sender)?.minimize()}),d.ipcMain.handle(`show-window`,async e=>{let t=d.BrowserWindow.fromWebContents(e.sender);t&&(t.show(),t.focus())}),d.ipcMain.handle(`maximize-window`,async e=>{let t=d.BrowserWindow.fromWebContents(e.sender);t?.isMaximized()?t.unmaximize():t?.maximize()}),d.ipcMain.handle(`close-window`,async e=>{let t=d.BrowserWindow.fromWebContents(e.sender);t&&t.hide()}),d.ipcMain.on(`notify-conversion-start`,()=>{(0,at.showBalloon)(`二支录制`,`录制完成，正在转换视频格式...`)}),d.ipcMain.on(`show-about-window`,()=>{let e=d.BrowserWindow.getFocusedWindow();if(e){let t=new d.BrowserWindow({width:360,height:400,resizable:!1,skipTaskbar:!0,frame:!1,modal:!0,parent:e,backgroundColor:`#eaeaec`,webPreferences:{preload:(0,u.join)(__dirname,`..`,`preload`,`index.cjs`),contextIsolation:!0,nodeIntegration:!1,sandbox:!1}});d.ipcMain.on(`close-about-window`,()=>{t.close(),d.ipcMain.removeAllListeners(`close-about-window`)}),t.on(`closed`,()=>{d.ipcMain.removeAllListeners(`close-about-window`)});let n=process.env.VITE_DEV_SERVER_URL?`${process.env.VITE_DEV_SERVER_URL}about.html`:(0,u.join)(d.app.getAppPath(),`dist`,`about.html`);n.startsWith(`http`)?t.loadURL(n):t.loadFile(n)}}),d.ipcMain.on(`notify-conversion-done`,()=>{(0,at.showBalloon)(`二支录制`,`视频转换完成！`)}),d.ipcMain.on(`update-audio-levels`,(e,t,n)=>{pt(t,n)}),d.ipcMain.handle(`load-recordings`,async()=>{let e=mt();try{let t=await g.default.promises.readFile(e,`utf-8`),n=JSON.parse(t);return L.info(`加载录制历史`,e,n.length,`条`),n}catch(t){return L.info(`加载录制历史失败（可能首次运行）`,e,t.message),[]}}),d.ipcMain.handle(`save-recordings`,async(e,t)=>{let n=mt();try{return await g.default.promises.writeFile(n,JSON.stringify(t),`utf-8`),L.info(`保存录制历史`,n,t.length,`条`),!0}catch(e){return L.error(`保存录制历史失败`,n,e.message),!1}}),e&&(e.setStateListener((e,t)=>{(e!==`idle`||t&&t.length>0)&&ut();let n=d.BrowserWindow.getAllWindows();for(let r of n)if(!r.isDestroyed())try{r.webContents.send(`agent-state-update`,{state:e,sessions:t})}catch{}}),e.setCardListener(e=>{e&&ut();let t;t=e?e.kind===`permission`?{kind:`permission`,sessionId:e.sessionId,toolName:e.toolName,toolInput:e.toolInput,suggestions:e.suggestions,createdAt:e.createdAt}:{kind:`question`,sessionId:e.sessionId,toolName:e.toolName,toolInput:e.toolInput,questions:e.questions,answerable:e.answerable,createdAt:e.createdAt}:null,L.info(`[IPC] broadcast card: kind=${e?e.kind:`null`}, wins=${d.BrowserWindow.getAllWindows().length}`);let n=d.BrowserWindow.getAllWindows();for(let e of n)if(!e.isDestroyed())try{e.webContents.send(`agent-card-update`,t)}catch(e){L.error(`[IPC] send card to window failed: ${e.message}`)}}),d.ipcMain.handle(`agent-get-status`,()=>{let t=e?.getStatus()??null;return L.info(`[IPC] agentGetStatus: sessionCount=${t?.sessionCount}, displayState=${t?.displayState}, serverRunning=${t?.serverRunning}`),t}),d.ipcMain.handle(`agent-install-hooks`,()=>(e?.installHooks(),e?.getStatus())),d.ipcMain.handle(`agent-uninstall-hooks`,()=>(e?.uninstallHooks(),e?.getStatus())),d.ipcMain.handle(`agent-resolve-permission`,(t,n)=>e?.resolvePermission(n)),d.ipcMain.handle(`agent-dismiss-question`,()=>e?.dismissQuestion()),d.ipcMain.handle(`agent-submit-question`,(t,n,r)=>e?.submitQuestion(n,r)),d.ipcMain.handle(`agent-set-auto-allow`,(t,n)=>e?.setAutoAllow(n)),d.ipcMain.handle(`agent-get-auto-allow`,()=>e?.getAutoAllow()??!1))}R();var gt=null;function _t(e){gt=e,d.globalShortcut.register(`CommandOrControl+Shift+R`,()=>{L.info(`Global shortcut: start/stop recording`),gt?.webContents.send(`on-global-shortcut`,`startStop`)}),d.globalShortcut.register(`CommandOrControl+Shift+P`,()=>{L.info(`Global shortcut: pause/resume recording`),gt?.webContents.send(`on-global-shortcut`,`pauseResume`)}),L.info(`Global shortcuts registered`)}function vt(){d.globalShortcut.unregisterAll()}R();var yt=`http://8.163.43.7:3000/report-ip`;function X(){return(0,u.join)(d.app.getPath(`userData`),`pending-reports.json`)}function bt(e){let t=[];try{g.default.existsSync(X())&&(t=JSON.parse(g.default.readFileSync(X(),`utf-8`)))}catch{}t.push(e),g.default.writeFileSync(X(),JSON.stringify(t,null,2),`utf-8`),L.info(`Saved offline report to local, total pending:`,t.length)}function xt(){try{if(g.default.existsSync(X()))return JSON.parse(g.default.readFileSync(X(),`utf-8`))}catch{}return[]}function St(){try{g.default.unlinkSync(X())}catch{}}async function Ct(e){try{return await fetch(yt,{method:`POST`,headers:{"Content-Type":`application/json`},body:JSON.stringify(e)}),!0}catch{return!1}}async function wt(){let e=xt();if(e.length===0)return!0;let t=[];for(let n of e)await Ct(n)?L.info(`Flushed pending report:`,n.公网IP,n.上报时间):t.push(n);return t.length===0?(St(),L.info(`All pending reports flushed`),!0):(g.default.writeFileSync(X(),JSON.stringify(t,null,2),`utf-8`),!1)}async function Tt(){let e=[async()=>{let e=(await fetch(`https://qifu.baidu.com/opus/api/ip/local`,{headers:{Referer:`https://www.baidu.com`}}).then(e=>e.json()))?.data;if(!e?.ip)throw Error(`empty`);return{公网IP:e.ip,国家:e.country||``,省份:e.province||``,城市:e.city||``,区县:e.district||e.area||``,详细地址:[e.country,e.province,e.city,e.district||e.area].filter(Boolean).join(``),运营商:e.isp||``}},async()=>{let e=await fetch(`http://whois.pconline.com.cn/ipJson.jsp`).then(e=>e.arrayBuffer()),t=new TextDecoder(`gbk`).decode(e),n=JSON.parse(t);if(!n.ip)throw Error(`empty`);return{公网IP:n.ip,国家:`中国`,省份:n.pro||``,城市:n.city||``,区县:n.region||``,详细地址:n.addr||``,运营商:n.addr?.split(` `)?.[1]||``}},async()=>{let e=await fetch(`http://ip-api.com/json/?lang=zh-CN`).then(e=>e.json());if(!e.query)throw Error(`empty`);return{公网IP:e.query,国家:e.country,省份:e.regionName,城市:e.city,区县:``,详细地址:`${e.country}${e.regionName}${e.city}`,运营商:e.isp,纬度:String(e.lat??``),经度:String(e.lon??``)}}];for(let t of e)try{return await t()}catch{continue}return{公网IP:``,国家:``,省份:``,城市:``,区县:``,详细地址:``,运营商:``}}function Et(){let e=(0,y.networkInterfaces)();for(let t of Object.keys(e))for(let n of e[t])if(n.family===`IPv4`&&!n.internal)return n.address;return`127.0.0.1`}async function Dt(){let e=Et(),t={电脑名:(0,y.hostname)(),局域网IP:e,上报时间:new Date().toISOString()},n;try{n=await Tt()}catch{n={公网IP:``,国家:``,省份:``,城市:``,区县:``,详细地址:``,运营商:``}}let r={...t,...n};await Ct(r)?(L.info(`IP reported:`,n.公网IP,n.省份,n.城市),wt()):(L.info(`Network unavailable, saving report locally`),bt(r))}function Ot(){xt().length>0&&wt()}R();var kt={error:4,notification:3,working:2,thinking:1,idle:0},At=600*1e3,jt=300*1e3,Mt=10*1e3,Nt=2e3;function Pt(){let e=new Map,t=null,n=[],r=null,i=`idle`;function a(e){return n.push(e),()=>{n=n.filter(t=>t!==e)}}function o(){let t=l(),r=Array.from(e.values());t!==i&&(i=t);for(let e of n)e(i,r)}function s(t,n,i,a={}){r&&=(clearTimeout(r),null);let s=e.get(t),c={sessionId:t,agentId:a.agentId||`claude-code`,state:n,event:i,updatedAt:Date.now(),toolName:a.toolName||s?.toolName,toolInput:a.toolInput||s?.toolInput,contextUsage:a.contextUsage||s?.contextUsage,model:a.model||s?.model};e.set(t,c),L.info(`[StateMachine] updateSession: id=${t}, state=${n}, event=${i}, total=${e.size}`),n===`idle`&&i===`Stop`&&(r=setTimeout(()=>{if(r=null,e.has(t)){let n=e.get(t);n.state=`idle`,n.updatedAt=Date.now()}L.info(`[StateMachine] doneTimer fired for ${t}, total=${e.size}`),o()},Nt)),o()}function c(t){e.delete(t),o()}function l(){let t=`idle`;for(let[,n]of e)(kt[n.state]??0)>(kt[t]??0)&&(t=n.state);return r&&t===`idle`?`done`:t}function u(){return i}function d(){let t=[];for(let[,n]of e)t.push(n);return t}function f(){let t=Date.now(),n=!1;for(let[r,i]of e){let a=t-i.updatedAt;a>At?(e.delete(r),L.info(`[StateMachine] cleanStale: removed ${r} (age=${Math.round(a/1e3)}s)`),n=!0):i.state!==`idle`&&a>jt&&(i.state=`idle`,i.updatedAt=t,L.info(`[StateMachine] cleanStale: reset ${r} to idle (age=${Math.round(a/1e3)}s)`),n=!0)}n&&o()}function p(){t||=setInterval(f,Mt)}function m(){t&&=(clearInterval(t),null),r&&=(clearTimeout(r),null)}return{updateSession:s,dismissSession:c,resolveDisplayState:l,getCurrentState:u,getSessions:d,subscribe:a,cleanStaleSessions:f,start:p,stop:m}}function Ft(e){return e==null?`null`:typeof e==`object`?Array.isArray(e)?`[`+e.map(Ft).join(`,`)+`]`:`{`+Object.keys(e).sort().map(t=>JSON.stringify(t)+`:`+Ft(e[t])).join(`,`)+`}`:JSON.stringify(e)}function It(e,t,n){let r=n?.tool_use_id||n?.toolUseId||null,i=n?.tool_name||n?.toolName||null,a=i!=null&&i!==``?Ft(n?.tool_input??n?.toolInput??null):null;for(let n=0;n<e.length;n++){let o=e[n];if(o.kind===`permission`&&o.sessionId===t&&(r&&o.toolUseId&&o.toolUseId===r||a!=null&&o.toolName===i&&Ft(o.toolInput??null)===a))return n}return-1}R();var Lt=6e4,Rt=60019,zt=12e4,Bt=null;function Vt(){return Bt||(Bt=f.join(require(`os`).homedir(),`.erzhi-recording`),Bt)}function Ht(e){let t=null,n=null,r=[],i=null,a=null,o=[`PostToolUse`,`PostToolUseFailure`,`Stop`,`StopFailure`,`SessionEnd`,`ApiError`],s=[`PostToolUse`,`PostToolUseFailure`,`PermissionDenied`],c=[`Stop`,`StopFailure`,`SessionEnd`],l=new Set;class u extends Error{code=`PAYLOAD_TOO_LARGE`}function d(e){return new Promise((t,n)=>{let r=``;e.on(`data`,t=>{if(r+=t,Buffer.byteLength(r)>1048576){try{e.destroy()}catch{}n(new u(`Body exceeds 1MB limit`))}}),e.on(`end`,()=>{try{t(JSON.parse(r))}catch{n(Error(`Invalid JSON`))}}),e.on(`error`,n)})}function p(e,t,n){e.writeHead(t,{"Content-Type":`application/json`}),e.end(JSON.stringify(n))}function g(e,t){try{!e.headersSent&&!e.destroyed&&!e.writableEnded&&(e.writeHead(200,{"Content-Type":`application/json`}),e.end(t))}catch{}}function _(){return r[0]??null}function v(e){let t=_();t&&((t.kind===`permission`||t.answerable)&&t.reject(e),y())}function y(){r.shift(),clearTimeout(i),i=null,b(),x()}function b(){if(i&&clearTimeout(i),!r.length){i=null;return}i=setTimeout(()=>{i=null,v(`timeout`)},zt)}function x(){a&&a(_())}function S(e){let t=r.length,n=[],a=r.filter(t=>t.kind===`question`&&t.sessionId===e?(n.push(t),!1):!0);if(a.length!==t){r=a;for(let e of n)e.kind===`question`&&e.answerable&&e.reject(`completed`);l.delete(e),clearTimeout(i),i=null,b(),x()}}function C(e,t){let n=It(r,e,t);if(n===-1)return;let[a]=r.splice(n,1);a.reject(`resolved-in-cli`),clearTimeout(i),i=null,b(),x(),L.info(`[AgentServer] permission resolved externally (CLI): session=${e}, tool=${a.toolName}`)}function w(e){let t=r.length,n=[],a=r.filter(t=>t.kind===`permission`&&t.sessionId===e?(n.push(t),!1):!0);if(a.length!==t){r=a;for(let e of n)e.reject(`completed`);clearTimeout(i),i=null,b(),x(),L.info(`[AgentServer] permissions cleared for ended session=${e}, count=${n.length}`)}}function T(t,n){let r=t.session_id||t.sessionId,i=t.state,a=t.event;if(L.info(`[AgentServer] /state received: session=${r}, state=${i}, event=${a}, tool=${t.tool_name||t.toolName}`),!r||!i||!a){L.warn(`[AgentServer] /state rejected: missing fields (sessionId=${r}, state=${i}, event=${a})`),p(n,400,{error:`Missing required fields: session_id, state, event`});return}e.updateSession(r,i,a,{agentId:t.agent_id||`claude-code`,toolName:t.tool_name||t.toolName,toolInput:t.tool_input||t.toolInput,contextUsage:t.context_usage||t.contextUsage,model:t.model}),o.includes(a)&&(S(r),l.delete(r)),c.includes(a)&&w(r),s.includes(a)&&C(r,t),L.info(`[AgentServer] /state ok, total sessions=${e.getSessions().length}`),p(n,200,{ok:!0,app:`erzhi-recording`})}function E(t,n){let i=t.tool_name||t.toolName||`unknown`,a=t.tool_input||t.toolInput||{},o=t.session_id||t.sessionId||`unknown`;if(i===`AskUserQuestion`){D(n,o,a);return}e.updateSession(o,`notification`,`PermissionRequest`,{toolName:i,toolInput:a});let s=t.tool_use_id||t.toolUseId||null,c={kind:`permission`,sessionId:o,toolName:i,toolInput:a,suggestions:t.permission_suggestions||null,toolUseId:s,resolve:()=>{},reject:()=>{},createdAt:Date.now()};new Promise((e,t)=>{c.resolve=e,c.reject=t}).then(t=>{e.updateSession(o,`idle`,`PermissionResolved`);let r=t===`always`?`allow`:t,i=JSON.stringify({hookSpecificOutput:{hookEventName:`PermissionRequest`,decision:{behavior:r}}});L.info(`[AgentServer] /permission resolved: behavior=${t} -> ${r}`),g(n,i)}).catch(t=>{e.updateSession(o,`idle`,`PermissionCancelled`);let r=JSON.stringify({hookSpecificOutput:{hookEventName:`PermissionRequest`,decision:{behavior:`cancel`}}});L.info(`[AgentServer] /permission cancelled: ${t}`),g(n,r)}),r.push(c),r.length===1&&b(),x(),L.info(`[AgentServer] /permission queued: session=${o}, queue=${r.length}`)}function D(t,n,i){let a=Array.isArray(i&&i.questions)&&i.questions||null;e.updateSession(n,`notification`,`AskUserQuestion`,{toolName:`AskUserQuestion`,toolInput:i}),l.delete(n);let o={kind:`question`,sessionId:n,toolName:`AskUserQuestion`,toolInput:i,questions:a,answerable:!0,resolve:()=>{},reject:()=>{},createdAt:Date.now()};new Promise((e,t)=>{o.resolve=e,o.reject=t}).then(r=>{e.updateSession(n,`idle`,`QuestionAnswered`);let i=JSON.stringify({hookSpecificOutput:{hookEventName:`PermissionRequest`,decision:{behavior:`allow`,updatedInput:{questions:a,answers:r}}}});L.info(`[AgentServer] AskUserQuestion answered via /permission: session=${n}`),g(t,i)}).catch(r=>{e.updateSession(n,`idle`,`QuestionDenied`);let i=JSON.stringify({hookSpecificOutput:{hookEventName:`PermissionRequest`,decision:{behavior:`deny`}}});L.info(`[AgentServer] AskUserQuestion denied: reason=${r}, session=${n}`),g(t,i)}),r.push(o),r.length===1&&b(),x(),L.info(`[AgentServer] AskUserQuestion (answerable) queued: session=${n}, queue=${r.length}`)}function O(t,n){let i=t.session_id||t.sessionId||`unknown`,a=t.tool_name||t.toolName||`AskUserQuestion`,o=t.tool_input||t.toolInput||{},s=Array.isArray(t.questions)?t.questions:null;if(l.has(i)){p(n,200,{ok:!0,app:`erzhi-recording`,skipped:`answered`});return}e.updateSession(i,`notification`,`AskUserQuestion`,{toolName:a,toolInput:o});let c={kind:`question`,sessionId:i,toolName:a,toolInput:o,questions:s,answerable:!1,resolve:()=>{},reject:()=>{},createdAt:Date.now()};r.push(c),r.length===1&&b(),x(),L.info(`[AgentServer] /question (read-only) queued: session=${i}, queue=${r.length}`),p(n,200,{ok:!0,app:`erzhi-recording`})}function k(t){let r=e.getSessions().length;p(t,200,{ok:!0,app:`erzhi-recording`,port:n,sessionCount:r})}function ee(e,t){t.setHeader(`Access-Control-Allow-Origin`,`*`),L.info(`[AgentServer] ${e.method} ${e.url}`),e.method===`POST`&&e.url===`/state`?d(e).then(e=>T(e,t)).catch(e=>{L.error(`[AgentServer] parseBody error:`,e),p(t,e?.code===`PAYLOAD_TOO_LARGE`?413:400,{error:e?.code===`PAYLOAD_TOO_LARGE`?`Payload too large`:`Invalid JSON`})}):e.method===`POST`&&e.url===`/permission`?d(e).then(e=>E(e,t)).catch(e=>{L.error(`[AgentServer] parseBody error:`,e),p(t,e?.code===`PAYLOAD_TOO_LARGE`?413:400,{error:e?.code===`PAYLOAD_TOO_LARGE`?`Payload too large`:`Invalid JSON`})}):e.method===`POST`&&e.url===`/question`?d(e).then(e=>O(e,t)).catch(e=>{L.error(`[AgentServer] parseBody error:`,e),p(t,e?.code===`PAYLOAD_TOO_LARGE`?413:400,{error:e?.code===`PAYLOAD_TOO_LARGE`?`Payload too large`:`Invalid JSON`})}):e.method===`GET`&&e.url===`/health`?k(t):p(t,404,{error:`Not found`})}function te(e){let t=_();t&&t.kind===`permission`&&(t.resolve(e),y())}function ne(){let e=_();e&&e.kind===`question`&&(e.answerable&&e.reject(`dismissed`),y())}function re(e,t){let n=_();n&&n.kind===`question`&&n.answerable&&n.sessionId===e?(n.resolve(t),l.add(e),y(),L.info(`[AgentServer] submitQuestion accepted: session=${e}`)):L.warn(`[AgentServer] submitQuestion ignored: no matching answerable head for session=${e}`)}function A(e){a=e}function j(){let e=_();return e?e.kind===`permission`?{kind:`permission`,sessionId:e.sessionId,toolName:e.toolName,toolInput:e.toolInput,suggestions:e.suggestions,createdAt:e.createdAt}:{kind:`question`,sessionId:e.sessionId,toolName:e.toolName,toolInput:e.toolInput,questions:e.questions,answerable:e.answerable,createdAt:e.createdAt}:null}function M(){return new Promise(e=>{let r=Lt,i=null;function a(){if(r>Rt){L.error(`Agent server: all ports ${Lt}-${Rt} occupied`),e(null);return}i=h.createServer(ee),i.on(`error`,t=>{t.code===`EADDRINUSE`?(r++,a()):(L.error(`Agent server error:`,t.message),e(null))}),i.listen(r,`127.0.0.1`,()=>{n=r,t=i;try{let e=Vt();m.mkdirSync(e,{recursive:!0}),m.writeFileSync(f.join(e,`runtime.json`),JSON.stringify({port:r,pid:process.pid}),`utf8`)}catch{}L.info(`Agent server listening on 127.0.0.1:${r}`),e(r)})}a()})}function N(){for(let e of r)e.kind===`permission`&&e.reject(`stopped`);r=[],clearTimeout(i),i=null,a&&a(null),t&&=(t.close(),null),n=null}function ie(){return n}return{start:M,stop:N,getPort:ie,getSafeCurrentCard:j,resolvePendingPermission:te,dismissQuestion:ne,submitQuestion:re,setOnCardChange:A}}R();var Ut=f.join(p.homedir(),`.claude`,`settings.json`),Wt=300*1e3,Gt=3,Kt=[`SessionStart`,`SessionEnd`,`UserPromptSubmit`,`PreToolUse`,`PostToolUse`,`PostToolUseFailure`,`Stop`,`StopFailure`,`ApiError`,`Notification`,`PermissionRequest`];function qt(e){let t=null,n=0,r=!1;function i(){try{if(require(`electron`)?.app?.isPackaged)return f.join(process.resourcesPath,`clawd-hook.js`)}catch{}return f.join(__dirname,`clawd-hook.js`)}function a(){try{let{execSync:e}=require(`child_process`),t=e(`where node`,{encoding:`utf8`}).trim().split(`
`)[0];if(t)return t}catch{}return process.execPath.replace(`electron.exe`,`node.exe`)}function o(){try{let e=m.readFileSync(Ut,`utf8`);return JSON.parse(e)}catch{return null}}function s(e){try{return m.writeFileSync(Ut,JSON.stringify(e,null,2),`utf8`),!0}catch(e){return L.error(`Failed to write Claude settings:`,e.message),!1}}function c(e,t){return{command:`& "${a()}" "${t}" ${e}`,shell:`powershell`}}function l(e){let t=e.hooks;return!t||!Array.isArray(t)?!1:t.some(e=>e.name&&e.events&&Array.isArray(e.events))}function u(e){return l(e)?(e.hooks=(e.hooks||[]).filter(e=>!e.name?.startsWith(`erzhi-recording`)),!0):!1}function d(){let t=o();if(!t)return{added:!1,updated:!1};let n=i(),r=t.hooks||{};if(u(t),e(),Kt.every(e=>(r[e]||[]).some(t=>t.hooks?.some(t=>e===`PermissionRequest`?t.type===`http`&&t.url?.includes(`/permission`):t.type===`command`&&t.command?.startsWith(`&`)&&t.command?.includes(`clawd-hook.js`)&&t.shell===`powershell`))))return{added:!1,updated:!1};for(let t of Kt){let i;if(t===`PermissionRequest`)i={type:`http`,url:`http://127.0.0.1:${e()||6e4}/permission`,timeout:600};else{let{command:e,shell:r}=c(t,n);i={type:`command`,command:e,shell:r,async:!0,timeout:5}}r[t]=[{matcher:``,hooks:[i]}]}return t.hooks=r,s(t),{added:!0,updated:!1}}function p(){let e=o();if(!e)return{removed:!1};let t=!1;if(l(e)){let n=e.hooks.length;e.hooks=e.hooks.filter(e=>!e.name?.startsWith(`erzhi-recording`)),e.hooks.length<n&&(t=!0)}let n=e.hooks||{};for(let e of Kt)if(n[e]){let r=n[e].length;n[e]=n[e].filter(e=>!e.hooks?.some(e=>e.command?.includes(`clawd-hook.js`))),n[e].length===0?delete n[e]:n[e].length<r&&(t=!0)}return e.hooks=n,s(e),{removed:t}}function h(){let e=o();return e?((e.hooks||{})[Kt[0]]||[]).some(e=>e.hooks?.some(e=>e.command?.includes(`clawd-hook.js`))):!1}function g(){let e=[];if(!o())return e.push(`Claude settings file not found`),{healthy:!1,issues:e};if(!h())return e.push(`Hook entry missing`),{healthy:!1,issues:e};let t=i();return m.existsSync(t)?{healthy:e.length===0,issues:e}:(e.push(`Hook script file missing`),{healthy:!1,issues:e})}function _(){if(r)return!1;if(n>=Gt)return r=!0,!1;let e=d();return(e.added||e.updated)&&g().healthy?(n=0,!0):(n++,!1)}function v(){let e=g();e.healthy?(n>0&&(n=0),r&&=!1):(L.warn(`Claude hook health check failed:`,e.issues.join(`, `)),_())}function y(){t||(v(),t=setInterval(v,Wt),L.info(`Claude hook watcher started`))}function b(){t&&=(clearInterval(t),null)}function x(){let e=g();return{installed:h(),scriptExists:m.existsSync(i()),claudeExists:o()!==null,healthy:e.healthy,repairFailures:n,manualFixRequired:r}}return{install:d,uninstall:p,isInstalled:h,startWatcher:y,stopWatcher:b,getStatus:x,checkHealth:g,repair:_}}R();function Jt(e={}){let t=Pt(),n=Ht(t),r=qt(()=>n.getPort()),i=null,a=null,o=!1;t.subscribe((e,t)=>{i&&i(e,t)}),n.setOnCardChange(e=>{if(o&&e&&e.kind===`permission`){L.info(`[AgentBridge] auto-allow permission: tool=${e.toolName}`),n.resolvePendingPermission(`allow`);return}a&&a(e)});async function s(){if(t.start(),await n.start()!==null){if(e.autoInstallHooks!==!1){let e=r.install();e.added&&L.info(`Claude Code hooks installed`),e.updated&&L.info(`Claude Code hooks updated`)}e.autoStartWatcher!==!1&&r.isInstalled()&&r.startWatcher()}}function c(){r.stopWatcher(),t.stop(),n.stop()}function l(){return n}function u(){return t}function d(){return r}function f(e){i=e}function p(e){a=e}function m(e){n.resolvePendingPermission(e)}function h(){n.dismissQuestion()}function g(e,t){n.submitQuestion(e,t)}function _(){r.install()}function v(){r.uninstall()}function y(e){o=e,L.info(`[AgentBridge] autoAllow=${e}`)}function b(){return o}let x=null,S=0;function C(){let e=Date.now();if(x!==null&&e-S<3e4)return x;try{let{execSync:e}=require(`child_process`);x=e(`tasklist /NH /FI "IMAGENAME eq claude.exe"`,{encoding:`utf8`,timeout:2e3}).includes(`claude.exe`)}catch{x=!1}return S=e,x}function w(){let e=t.getSessions(),i=e.length,a=t.getCurrentState(),o=e.map(e=>e.sessionId).join(`,`);L.info(`[AgentBridge] getStatus: real_count=${i}, ids=[${o}], display=${a}`);let s=t.getSessions().length;return{serverRunning:n.getPort()!==null,port:n.getPort(),hookInstalled:r.isInstalled(),hookManagerStatus:r.getStatus(),displayState:a,currentCard:n.getSafeCurrentCard(),sessionCount:s,claudeRunning:C()}}return{start:s,stop:c,getServer:l,getStateMachine:u,getHookManager:d,getStatus:w,setStateListener:f,setCardListener:p,resolvePermission:m,dismissQuestion:h,submitQuestion:g,installHooks:_,uninstallHooks:v,setAutoAllow:y,getAutoAllow:b}}var Yt=`local-video`;function Xt(){d.protocol.registerSchemesAsPrivileged([{scheme:Yt,privileges:{standard:!0,secure:!0,supportFetchAPI:!0,stream:!0}}])}function Zt(){d.protocol.handle(Yt,e=>{let t=new URL(e.url),n=decodeURIComponent(t.pathname).replace(/^\//,``),r=e.headers.get(`range`),i=0;try{i=(0,g.statSync)(n).size}catch{return new Response(`File not found: `+n,{status:404})}let a=(0,u.extname)(n).toLowerCase(),o=a===`.mp4`?`video/mp4`:a===`.webm`?`video/webm`:`application/octet-stream`;if(r){let e=/bytes=(\d*)-(\d*)/.exec(r),t=e&&e[1]?parseInt(e[1],10):0,a=e&&e[2]?parseInt(e[2],10):i-1,s=Math.min(a,i-1),c=(0,g.createReadStream)(n,{start:t,end:s});return new Response(C.Readable.toWeb(c),{status:206,headers:{"Content-Range":`bytes ${t}-${s}/${i}`,"Accept-Ranges":`bytes`,"Content-Length":String(s-t+1),"Content-Type":o}})}let s=(0,g.createReadStream)(n);return new Response(C.Readable.toWeb(s),{status:200,headers:{"Content-Length":String(i),"Content-Type":o,"Accept-Ranges":`bytes`}})})}R(),Xt();var Z=null,Q=null,$=null,Qt=null,$t=null,en=process.env.VITE_DEV_SERVER_URL;function tn(){let e=d.app.isPackaged?(0,u.join)(process.resourcesPath,`logo.ico`):(0,u.join)(__dirname,`../../public/logo.ico`);return d.nativeImage.createFromPath(e)}function nn(e){Z=new d.BrowserWindow({icon:tn(),width:550,height:420,minWidth:420,minHeight:340,show:!1,skipTaskbar:!0,frame:!1,titleBarStyle:`hidden`,title:`二支录制`,backgroundColor:`#eaeaec`,webPreferences:{preload:e,contextIsolation:!0,nodeIntegration:!1,sandbox:!1,backgroundThrottling:!1}}),en?Z.loadURL(en):Z.loadFile((0,u.join)(process.env.DIST,`index.html`)),Z.on(`close`,e=>{d.app.isQuitting||(e.preventDefault(),Z?.hide())})}d.app.on(`gpu-process-crashed`,(e,t)=>{L.error(`GPU process crashed:`,JSON.stringify(t))}),d.app.whenReady().then(()=>{process.env.DIST=(0,u.join)(__dirname,`../../dist`),process.env.VITE_PUBLIC=d.app.isPackaged?process.env.DIST:(0,u.join)(__dirname,`../../public`),Zt(),pe(),L.info(`App starting...`),_e(L),we(L);let e=(0,u.join)(__dirname,`..`,`preload`,`index.cjs`);Qt=Jt({autoInstallHooks:!0,autoStartWatcher:!0}),Qt.start().catch(e=>{L.error(`Agent bridge start failed:`,e?.message??e)}),ht(Qt),nn(e),(0,V.setMainWindow)(Z),(0,at.createTray)(),_t(Z),qe(),Dt();try{let e=q();d.app.setLoginItemSettings({openAtLogin:e.openAtLogin})}catch(e){L.error(`Sync openAtLogin on startup failed:`,e)}d.ipcMain.handle(`show-ai-window`,()=>{rn()}),d.ipcMain.handle(`show-settings-window`,()=>{an()}),d.ipcMain.handle(`show-main-window`,()=>{Z&&!Z.isDestroyed()&&(Z.show(),Z.focus())}),process.on(`clawd-show-record-window`,()=>{Z&&!Z.isDestroyed()&&(Z.show(),Z.focus())}),process.on(`clawd-show-ai-window`,()=>{rn()}),process.on(`clawd-show-settings-window`,()=>{an()}),$t=setInterval(Ot,3e4),d.app.on(`activate`,()=>{d.BrowserWindow.getAllWindows().length===0&&nn(e)})}),d.app.on(`window-all-closed`,()=>{}),d.app.on(`before-quit`,()=>{d.app.isQuitting=!0;for(let e of d.BrowserWindow.getAllWindows())if(!e.isDestroyed())try{e.webContents.send(`app-before-quit`)}catch{}(0,V.hideRegionBorder)(),(0,V.hideFloatingIsland)(),(0,V.hideCameraPreview)(),Ze(),Qt?.stop(),dt(),ve(),vt(),(0,at.destroyTray)(),$t&&=(clearInterval($t),null),Z=null,Q=null,$=null});function rn(){if(Q&&!Q.isDestroyed()){Q.show(),Q.focus();return}let e=process.env.VITE_DEV_SERVER_URL,t=(0,u.join)(__dirname,`..`,`preload`,`index.cjs`);Q=new d.BrowserWindow({icon:tn(),width:480,height:540,minWidth:400,minHeight:400,show:!1,skipTaskbar:!0,frame:!1,titleBarStyle:`hidden`,title:`AI 助手`,backgroundColor:`#eaeaec`,webPreferences:{preload:t,contextIsolation:!0,nodeIntegration:!1,sandbox:!1}}),e?Q.loadURL(`${e}#/ai?t=${Date.now()}`):Q.loadFile((0,u.join)(process.env.DIST,`index.html`),{hash:`/ai`}),Q.once(`ready-to-show`,()=>{Q?.show()}),Q.on(`closed`,()=>{Q=null})}function an(){if($&&!$.isDestroyed()){$.show(),$.focus();return}let e=(0,u.join)(__dirname,`..`,`preload`,`index.cjs`);$=new d.BrowserWindow({icon:tn(),width:420,height:480,minWidth:380,minHeight:420,show:!1,skipTaskbar:!0,frame:!1,titleBarStyle:`hidden`,title:`设置`,backgroundColor:`#eaeaec`,webPreferences:{preload:e,contextIsolation:!0,nodeIntegration:!1,sandbox:!1}}),en?$.loadURL(`${en}#/settings?t=${Date.now()}`):$.loadFile((0,u.join)(process.env.DIST,`index.html`),{hash:`/settings`}),$.once(`ready-to-show`,()=>{$?.show()}),$.on(`closed`,()=>{$=null})}