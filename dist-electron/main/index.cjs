var e=Object.create,t=Object.defineProperty,n=Object.getOwnPropertyDescriptor,r=Object.getOwnPropertyNames,i=Object.getPrototypeOf,a=Object.prototype.hasOwnProperty,o=(e,t)=>()=>(e&&(t=e(e=0)),t),s=(e,t)=>()=>(t||(e((t={exports:{}}).exports,t),e=null),t.exports),c=(e,i,o,s)=>{if(i&&typeof i==`object`||typeof i==`function`)for(var c=r(i),l=0,u=c.length,d;l<u;l++)d=c[l],!a.call(e,d)&&d!==o&&t(e,d,{get:(e=>i[e]).bind(null,d),enumerable:!(s=n(i,d))||s.enumerable});return e},l=(n,r,a)=>(a=n==null?{}:e(i(n)),c(r||!n||!n.__esModule?t(a,`default`,{value:n,enumerable:!0}):a,n));let u=require(`node:path`);u=l(u);let d=require(`electron`),f=require(`path`);f=l(f);let p=require(`os`);p=l(p);let m=require(`fs`);m=l(m);let h=require(`http`);h=l(h);let g=require(`node:fs`);g=l(g);let _=require(`fluent-ffmpeg`);_=l(_);let v=require(`@ffmpeg-installer/ffmpeg`);v=l(v);let y=require(`node:os`);y=l(y);var b=s(((e,t)=>{var n=require(`fs`),r=require(`path`);t.exports={findAndReadPackageJson:i,tryReadJsonAt:a};function i(){return a(c())||a(s())||a(process.resourcesPath,`app.asar`)||a(process.resourcesPath,`app`)||a(process.cwd())||{name:void 0,version:void 0}}function a(...e){if(e[0])try{let t=o(`package.json`,r.join(...e));if(!t)return;let i=JSON.parse(n.readFileSync(t,`utf8`)),a=i?.productName||i?.name;return!a||a.toLowerCase()===`electron`?void 0:a?{name:a,version:i?.version}:void 0}catch{return}}function o(e,t){let i=t;for(;;){let t=r.parse(i),a=t.root,o=t.dir;if(n.existsSync(r.join(i,e)))return r.resolve(r.join(i,e));if(i===a)return null;i=o}}function s(){let e=process.argv.filter(e=>e.indexOf(`--user-data-dir=`)===0);return e.length===0||typeof e[0]!=`string`?null:e[0].replace(`--user-data-dir=`,``)}function c(){try{return require.main?.filename}catch{return}}})),x=s(((e,t)=>{var n=require(`child_process`),r=require(`os`),i=require(`path`),a=b();t.exports=class{appName=void 0;appPackageJson=void 0;platform=process.platform;getAppLogPath(e=this.getAppName()){return this.platform===`darwin`?i.join(this.getSystemPathHome(),`Library/Logs`,e):i.join(this.getAppUserDataPath(e),`logs`)}getAppName(){let e=this.appName||this.getAppPackageJson()?.name;if(!e)throw Error(`electron-log can't determine the app name. It tried these methods:
1. Use \`electron.app.name\`
2. Use productName or name from the nearest package.json\`
You can also set it through log.transports.file.setAppName()`);return e}getAppPackageJson(){return typeof this.appPackageJson!=`object`&&(this.appPackageJson=a.findAndReadPackageJson()),this.appPackageJson}getAppUserDataPath(e=this.getAppName()){return e?i.join(this.getSystemPathAppData(),e):void 0}getAppVersion(){return this.getAppPackageJson()?.version}getElectronLogPath(){return this.getAppLogPath()}getMacOsVersion(){let e=Number(r.release().split(`.`)[0]);return e<=19?`10.${e-4}`:e-9}getOsVersion(){let e=r.type().replace(`_`,` `),t=r.release();return e===`Darwin`&&(e=`macOS`,t=this.getMacOsVersion()),`${e} ${t}`}getPathVariables(){let e=this.getAppName(),t=this.getAppVersion(),n=this;return{appData:this.getSystemPathAppData(),appName:e,appVersion:t,get electronDefaultDir(){return n.getElectronLogPath()},home:this.getSystemPathHome(),libraryDefaultDir:this.getAppLogPath(e),libraryTemplate:this.getAppLogPath(`{appName}`),temp:this.getSystemPathTemp(),userData:this.getAppUserDataPath(e)}}getSystemPathAppData(){let e=this.getSystemPathHome();switch(this.platform){case`darwin`:return i.join(e,`Library/Application Support`);case`win32`:return process.env.APPDATA||i.join(e,`AppData/Roaming`);default:return process.env.XDG_CONFIG_HOME||i.join(e,`.config`)}}getSystemPathHome(){return r.homedir?.()||process.env.HOME}getSystemPathTemp(){return r.tmpdir()}getVersions(){return{app:`${this.getAppName()} ${this.getAppVersion()}`,electron:void 0,os:this.getOsVersion()}}isDev(){return process.env.NODE_ENV===`development`||process.env.ELECTRON_IS_DEV===`1`}isElectron(){return!!process.versions.electron}onAppEvent(e,t){}onAppReady(e){e()}onEveryWebContentsEvent(e,t){}onIpc(e,t){}onIpcInvoke(e,t){}openUrl(e,t=console.error){let r={darwin:`open`,win32:`start`,linux:`xdg-open`}[process.platform]||`xdg-open`;n.exec(`${r} ${e}`,{},e=>{e&&t(e)})}setAppName(e){this.appName=e}setPlatform(e){this.platform=e}setPreloadFileForSessions({filePath:e,includeFutureSession:t=!0,getSessions:n=()=>[]}){}sendIpc(e,t){}showErrorBox(e,t){}}})),S=s(((e,t)=>{var n=require(`path`),r=x();t.exports=class extends r{electron=void 0;constructor({electron:e}={}){super(),this.electron=e}getAppName(){let e;try{e=this.appName||this.electron.app?.name||this.electron.app?.getName()}catch{}return e||super.getAppName()}getAppUserDataPath(e){return this.getPath(`userData`)||super.getAppUserDataPath(e)}getAppVersion(){let e;try{e=this.electron.app?.getVersion()}catch{}return e||super.getAppVersion()}getElectronLogPath(){return this.getPath(`logs`)||super.getElectronLogPath()}getPath(e){try{return this.electron.app?.getPath(e)}catch{return}}getVersions(){return{app:`${this.getAppName()} ${this.getAppVersion()}`,electron:`Electron ${process.versions.electron}`,os:this.getOsVersion()}}getSystemPathAppData(){return this.getPath(`appData`)||super.getSystemPathAppData()}isDev(){return this.electron.app?.isPackaged===void 0?typeof process.execPath==`string`?n.basename(process.execPath).toLowerCase().startsWith(`electron`):super.isDev():!this.electron.app.isPackaged}onAppEvent(e,t){return this.electron.app?.on(e,t),()=>{this.electron.app?.off(e,t)}}onAppReady(e){this.electron.app?.isReady()?e():this.electron.app?.once?this.electron.app?.once(`ready`,e):e()}onEveryWebContentsEvent(e,t){return this.electron.webContents?.getAllWebContents()?.forEach(n=>{n.on(e,t)}),this.electron.app?.on(`web-contents-created`,n),()=>{this.electron.webContents?.getAllWebContents().forEach(n=>{n.off(e,t)}),this.electron.app?.off(`web-contents-created`,n)};function n(n,r){r.on(e,t)}}onIpc(e,t){this.electron.ipcMain?.on(e,t)}onIpcInvoke(e,t){this.electron.ipcMain?.handle?.(e,t)}openUrl(e,t=console.error){this.electron.shell?.openExternal(e).catch(t)}setPreloadFileForSessions({filePath:e,includeFutureSession:t=!0,getSessions:n=()=>[this.electron.session?.defaultSession]}){for(let e of n().filter(Boolean))r(e);t&&this.onAppEvent(`session-created`,e=>{r(e)});function r(t){typeof t.registerPreloadScript==`function`?t.registerPreloadScript({filePath:e,id:`electron-log-preload`,type:`frame`}):t.setPreloads([...t.getPreloads(),e])}}sendIpc(e,t){this.electron.BrowserWindow?.getAllWindows()?.forEach(n=>{n.webContents?.isDestroyed()===!1&&n.webContents?.isCrashed()===!1&&n.webContents.send(e,t)})}showErrorBox(e,t){this.electron.dialog?.showErrorBox(e,t)}}})),C=s(((e,t)=>{var n={};try{n=require(`electron`)}catch{}n.ipcRenderer&&r(n),typeof t==`object`&&(t.exports=r);function r({contextBridge:e,ipcRenderer:t}){if(!t)return;t.on(`__ELECTRON_LOG_IPC__`,(e,t)=>{window.postMessage({cmd:`message`,...t})}),t.invoke(`__ELECTRON_LOG__`,{cmd:`getOptions`}).catch(e=>console.error(Error(`electron-log isn't initialized in the main process. Please call log.initialize() before. ${e.message}`)));let n={sendToMain(e){try{t.send(`__ELECTRON_LOG__`,e)}catch(n){console.error(`electronLog.sendToMain `,n,`data:`,e),t.send(`__ELECTRON_LOG__`,{cmd:`errorHandler`,error:{message:n?.message,stack:n?.stack},errorName:`sendToMain`})}},log(...e){n.sendToMain({data:e,level:`info`})}};for(let e of[`error`,`warn`,`info`,`verbose`,`debug`,`silly`])n[e]=(...t)=>n.sendToMain({data:t,level:e});if(e&&process.contextIsolated)try{e.exposeInMainWorld(`__electronLog`,n)}catch{}typeof window==`object`?window.__electronLog=n:__electronLog=n}})),w=s(((e,t)=>{var n=require(`fs`),r=require(`os`),i=require(`path`),a=C(),o=!1,s=!1;t.exports={initialize({externalApi:e,getSessions:t,includeFutureSession:n,logger:r,preload:i=!0,spyRendererConsole:a=!1}){e.onAppReady(()=>{try{i&&c({externalApi:e,getSessions:t,includeFutureSession:n,logger:r,preloadOption:i}),a&&l({externalApi:e,logger:r})}catch(e){r.warn(e)}})}};function c({externalApi:e,getSessions:t,includeFutureSession:s,logger:c,preloadOption:l}){let u=typeof l==`string`?l:void 0;if(o){c.warn(Error(`log.initialize({ preload }) already called`).stack);return}o=!0;try{u=i.resolve(__dirname,`../renderer/electron-log-preload.js`)}catch{}if(!u||!n.existsSync(u)){u=i.join(e.getAppUserDataPath()||r.tmpdir(),`electron-log-preload.js`);let t=`
      try {
        (${a.toString()})(require('electron'));
      } catch(e) {
        console.error(e);
      }
    `;n.writeFileSync(u,t,`utf8`)}e.setPreloadFileForSessions({filePath:u,includeFutureSession:s,getSessions:t})}function l({externalApi:e,logger:t}){if(s){t.warn(Error(`log.initialize({ spyRendererConsole }) already called`).stack);return}s=!0;let n=[`debug`,`info`,`warn`,`error`];e.onEveryWebContentsEvent(`console-message`,(e,r,i)=>{t.processMessage({data:[i],level:n[r],variables:{processType:`renderer`}})})}})),T=s(((e,t)=>{t.exports=n;function n(e){return Object.defineProperties(t,{defaultLabel:{value:``,writable:!0},labelPadding:{value:!0,writable:!0},maxLabelLength:{value:0,writable:!0},labelLength:{get(){switch(typeof t.labelPadding){case`boolean`:return t.labelPadding?t.maxLabelLength:0;case`number`:return t.labelPadding;default:return 0}}}});function t(n){t.maxLabelLength=Math.max(t.maxLabelLength,n.length);let r={};for(let t of e.levels)r[t]=(...r)=>e.logData(r,{level:t,scope:n});return r.log=r.info,r}}})),E=s(((e,t)=>{t.exports=class{constructor({processMessage:e}){this.processMessage=e,this.buffer=[],this.enabled=!1,this.begin=this.begin.bind(this),this.commit=this.commit.bind(this),this.reject=this.reject.bind(this)}addMessage(e){this.buffer.push(e)}begin(){this.enabled=[]}commit(){this.enabled=!1,this.buffer.forEach(e=>this.processMessage(e)),this.buffer=[]}reject(){this.enabled=!1,this.buffer=[]}}})),D=s(((e,t)=>{var n=T(),r=E();t.exports=class e{static instances={};dependencies={};errorHandler=null;eventLogger=null;functions={};hooks=[];isDev=!1;levels=null;logId=null;scope=null;transports={};variables={};constructor({allowUnknownLevel:t=!1,dependencies:i={},errorHandler:a,eventLogger:o,initializeFn:s,isDev:c=!1,levels:l=[`error`,`warn`,`info`,`verbose`,`debug`,`silly`],logId:u,transportFactories:d={},variables:f}={}){this.addLevel=this.addLevel.bind(this),this.create=this.create.bind(this),this.initialize=this.initialize.bind(this),this.logData=this.logData.bind(this),this.processMessage=this.processMessage.bind(this),this.allowUnknownLevel=t,this.buffering=new r(this),this.dependencies=i,this.initializeFn=s,this.isDev=c,this.levels=l,this.logId=u,this.scope=n(this),this.transportFactories=d,this.variables=f||{};for(let e of this.levels)this.addLevel(e,!1);this.log=this.info,this.functions.log=this.log,this.errorHandler=a,a?.setOptions({...i,logFn:this.error}),this.eventLogger=o,o?.setOptions({...i,logger:this});for(let[e,t]of Object.entries(d))this.transports[e]=t(this,i);e.instances[u]=this}static getInstance({logId:e}){return this.instances[e]||this.instances.default}addLevel(e,t=this.levels.length){t!==!1&&this.levels.splice(t,0,e),this[e]=(...t)=>this.logData(t,{level:e}),this.functions[e]=this[e]}catchErrors(e){return this.processMessage({data:[`log.catchErrors is deprecated. Use log.errorHandler instead`],level:`warn`},{transports:[`console`]}),this.errorHandler.startCatching(e)}create(t){return typeof t==`string`&&(t={logId:t}),new e({dependencies:this.dependencies,errorHandler:this.errorHandler,initializeFn:this.initializeFn,isDev:this.isDev,transportFactories:this.transportFactories,variables:{...this.variables},...t})}compareLevels(e,t,n=this.levels){let r=n.indexOf(e),i=n.indexOf(t);return i===-1||r===-1?!0:i<=r}initialize(e={}){this.initializeFn({logger:this,...this.dependencies,...e})}logData(e,t={}){this.buffering.enabled?this.buffering.addMessage({data:e,date:new Date,...t}):this.processMessage({data:e,...t})}processMessage(e,{transports:t=this.transports}={}){if(e.cmd===`errorHandler`){this.errorHandler.handle(e.error,{errorName:e.errorName,processType:`renderer`,showDialog:!!e.showDialog});return}let n=e.level;this.allowUnknownLevel||(n=this.levels.includes(e.level)?e.level:`info`);let r={date:new Date,logId:this.logId,...e,level:n,variables:{...this.variables,...e.variables}};for(let[n,i]of this.transportEntries(t))if(!(typeof i!=`function`||i.level===!1)&&this.compareLevels(i.level,e.level))try{let e=this.hooks.reduce((e,t)=>e&&t(e,i,n),r);e&&i({...e,data:[...e.data]})}catch(e){this.processInternalErrorFn(e)}}processInternalErrorFn(e){}transportEntries(e=this.transports){return(Array.isArray(e)?e:Object.entries(e)).map(e=>{switch(typeof e){case`string`:return this.transports[e]?[e,this.transports[e]]:null;case`function`:return[e.name,e];default:return Array.isArray(e)?e:null}}).filter(Boolean)}}})),O=s(((e,t)=>{var n=class{externalApi=void 0;isActive=!1;logFn=void 0;onError=void 0;showDialog=!0;constructor({externalApi:e,logFn:t=void 0,onError:n=void 0,showDialog:r=void 0}={}){this.createIssue=this.createIssue.bind(this),this.handleError=this.handleError.bind(this),this.handleRejection=this.handleRejection.bind(this),this.setOptions({externalApi:e,logFn:t,onError:n,showDialog:r}),this.startCatching=this.startCatching.bind(this),this.stopCatching=this.stopCatching.bind(this)}handle(e,{logFn:t=this.logFn,onError:n=this.onError,processType:i=`browser`,showDialog:a=this.showDialog,errorName:o=``}={}){e=r(e);try{if(typeof n==`function`){let t=this.externalApi?.getVersions()||{},r=this.createIssue;if(n({createIssue:r,error:e,errorName:o,processType:i,versions:t})===!1)return}o?t(o,e):t(e),a&&!o.includes(`rejection`)&&this.externalApi&&this.externalApi.showErrorBox(`A JavaScript error occurred in the ${i} process`,e.stack)}catch{console.error(e)}}setOptions({externalApi:e,logFn:t,onError:n,showDialog:r}){typeof e==`object`&&(this.externalApi=e),typeof t==`function`&&(this.logFn=t),typeof n==`function`&&(this.onError=n),typeof r==`boolean`&&(this.showDialog=r)}startCatching({onError:e,showDialog:t}={}){this.isActive||(this.isActive=!0,this.setOptions({onError:e,showDialog:t}),process.on(`uncaughtException`,this.handleError),process.on(`unhandledRejection`,this.handleRejection))}stopCatching(){this.isActive=!1,process.removeListener(`uncaughtException`,this.handleError),process.removeListener(`unhandledRejection`,this.handleRejection)}createIssue(e,t){this.externalApi?.openUrl(`${e}?${new URLSearchParams(t).toString()}`)}handleError(e){this.handle(e,{errorName:`Unhandled`})}handleRejection(e){let t=e instanceof Error?e:Error(JSON.stringify(e));this.handle(t,{errorName:`Unhandled rejection`})}};function r(e){if(e instanceof Error)return e;if(e&&typeof e==`object`){if(e.message)return Object.assign(Error(e.message),e);try{return Error(JSON.stringify(e))}catch(t){return Error(`Couldn't normalize error ${String(e)}: ${t}`)}}return Error(`Can't normalize error ${String(e)}`)}t.exports=n})),k=s(((e,t)=>{t.exports=class{disposers=[];format=`{eventSource}#{eventName}:`;formatters={app:{"certificate-error":({args:e})=>this.arrayToObject(e.slice(1,4),[`url`,`error`,`certificate`]),"child-process-gone":({args:e})=>e.length===1?e[0]:e,"render-process-gone":({args:[e,t]})=>t&&typeof t==`object`?{...t,...this.getWebContentsDetails(e)}:[]},webContents:{"console-message":({args:[e,t,n,r]})=>{if(!(e<3))return{message:t,source:`${r}:${n}`}},"did-fail-load":({args:e})=>this.arrayToObject(e,[`errorCode`,`errorDescription`,`validatedURL`,`isMainFrame`,`frameProcessId`,`frameRoutingId`]),"did-fail-provisional-load":({args:e})=>this.arrayToObject(e,[`errorCode`,`errorDescription`,`validatedURL`,`isMainFrame`,`frameProcessId`,`frameRoutingId`]),"plugin-crashed":({args:e})=>this.arrayToObject(e,[`name`,`version`]),"preload-error":({args:e})=>this.arrayToObject(e,[`preloadPath`,`error`])}};events={app:{"certificate-error":!0,"child-process-gone":!0,"render-process-gone":!0},webContents:{"did-fail-load":!0,"did-fail-provisional-load":!0,"plugin-crashed":!0,"preload-error":!0,unresponsive:!0}};externalApi=void 0;level=`error`;scope=``;constructor(e={}){this.setOptions(e)}setOptions({events:e,externalApi:t,level:n,logger:r,format:i,formatters:a,scope:o}){typeof e==`object`&&(this.events=e),typeof t==`object`&&(this.externalApi=t),typeof n==`string`&&(this.level=n),typeof r==`object`&&(this.logger=r),(typeof i==`string`||typeof i==`function`)&&(this.format=i),typeof a==`object`&&(this.formatters=a),typeof o==`string`&&(this.scope=o)}startLogging(e={}){this.setOptions(e),this.disposeListeners();for(let e of this.getEventNames(this.events.app))this.disposers.push(this.externalApi.onAppEvent(e,(...t)=>{this.handleEvent({eventSource:`app`,eventName:e,handlerArgs:t})}));for(let e of this.getEventNames(this.events.webContents))this.disposers.push(this.externalApi.onEveryWebContentsEvent(e,(...t)=>{this.handleEvent({eventSource:`webContents`,eventName:e,handlerArgs:t})}))}stopLogging(){this.disposeListeners()}arrayToObject(e,t){let n={};return t.forEach((t,r)=>{n[t]=e[r]}),e.length>t.length&&(n.unknownArgs=e.slice(t.length)),n}disposeListeners(){this.disposers.forEach(e=>e()),this.disposers=[]}formatEventLog({eventName:e,eventSource:t,handlerArgs:n}){let[r,...i]=n;if(typeof this.format==`function`)return this.format({args:i,event:r,eventName:e,eventSource:t});let a=this.formatters[t]?.[e],o=i;if(typeof a==`function`&&(o=a({args:i,event:r,eventName:e,eventSource:t})),!o)return;let s={};return Array.isArray(o)?s.args=o:typeof o==`object`&&Object.assign(s,o),t===`webContents`&&Object.assign(s,this.getWebContentsDetails(r?.sender)),[this.format.replace(`{eventSource}`,t===`app`?`App`:`WebContents`).replace(`{eventName}`,e),s]}getEventNames(e){return!e||typeof e!=`object`?[]:Object.entries(e).filter(([e,t])=>t).map(([e])=>e)}getWebContentsDetails(e){if(!e?.loadURL)return{};try{return{webContents:{id:e.id,url:e.getURL()}}}catch{return{}}}handleEvent({eventName:e,eventSource:t,handlerArgs:n}){let r=this.formatEventLog({eventName:e,eventSource:t,handlerArgs:n});r&&(this.scope?this.logger.scope(this.scope):this.logger)?.[this.level]?.(...r)}}})),A=s(((e,t)=>{t.exports={transform:n};function n({logger:e,message:t,transport:n,initialData:r=t?.data||[],transforms:i=n?.transforms}){return i.reduce((r,i)=>typeof i==`function`?i({data:r,logger:e,message:t,transport:n}):r,r)}})),j=s(((e,t)=>{var{transform:n}=A();t.exports={concatFirstStringElements:r,formatScope:a,formatText:s,formatVariables:o,timeZoneFromOffset:i,format({message:e,logger:t,transport:r,data:i=e?.data}){switch(typeof r.format){case`string`:return n({message:e,logger:t,transforms:[o,a,s],transport:r,initialData:[r.format,...i]});case`function`:return r.format({data:i,level:e?.level||`info`,logger:t,message:e,transport:r});default:return i}}};function r({data:e}){return typeof e[0]!=`string`||typeof e[1]!=`string`||e[0].match(/%[1cdfiOos]/)?e:[`${e[0]} ${e[1]}`,...e.slice(2)]}function i(e){let t=Math.abs(e);return`${e>0?`-`:`+`}${Math.floor(t/60).toString().padStart(2,`0`)}:${(t%60).toString().padStart(2,`0`)}`}function a({data:e,logger:t,message:n}){let{defaultLabel:r,labelLength:i}=t?.scope||{},a=e[0],o=n.scope;o||=r;let s;return s=o===``?i>0?``.padEnd(i+3):``:typeof o==`string`?` (${o})`.padEnd(i+3):``,e[0]=a.replace(`{scope}`,s),e}function o({data:e,message:t}){let n=e[0];if(typeof n!=`string`)return e;n=n.replace(`{level}]`,`${t.level}]`.padEnd(6,` `));let r=t.date||new Date;return e[0]=n.replace(/\{(\w+)}/g,(e,n)=>{switch(n){case`level`:return t.level||`info`;case`logId`:return t.logId;case`y`:return r.getFullYear().toString(10);case`m`:return(r.getMonth()+1).toString(10).padStart(2,`0`);case`d`:return r.getDate().toString(10).padStart(2,`0`);case`h`:return r.getHours().toString(10).padStart(2,`0`);case`i`:return r.getMinutes().toString(10).padStart(2,`0`);case`s`:return r.getSeconds().toString(10).padStart(2,`0`);case`ms`:return r.getMilliseconds().toString(10).padStart(3,`0`);case`z`:return i(r.getTimezoneOffset());case`iso`:return r.toISOString();default:return t.variables?.[n]||e}}).trim(),e}function s({data:e}){let t=e[0];if(typeof t!=`string`)return e;if(t.lastIndexOf(`{text}`)===t.length-6)return e[0]=t.replace(/\s?{text}/,``),e[0]===``&&e.shift(),e;let n=t.split(`{text}`),r=[];return n[0]!==``&&r.push(n[0]),r=r.concat(e.slice(1)),n[1]!==``&&r.push(n[1]),r}})),M=s(((e,t)=>{var n=require(`util`);t.exports={serialize:i,maxDepth({data:e,transport:n,depth:r=n?.depth??6}){if(!e)return e;if(r<1)return Array.isArray(e)?`[array]`:typeof e==`object`&&e?`[object]`:e;if(Array.isArray(e))return e.map(e=>t.exports.maxDepth({data:e,depth:r-1}));if(typeof e!=`object`||e&&typeof e.toISOString==`function`)return e;if(e===null)return null;if(e instanceof Error)return e;let i={};for(let n in e)Object.prototype.hasOwnProperty.call(e,n)&&(i[n]=t.exports.maxDepth({data:e[n],depth:r-1}));return i},toJSON({data:e}){return JSON.parse(JSON.stringify(e,r()))},toString({data:e,transport:t}){let i=t?.inspectOptions||{},a=e.map(e=>{if(e!==void 0)try{let t=JSON.stringify(e,r(),`  `);return t===void 0?void 0:JSON.parse(t)}catch{return e}});return n.formatWithOptions(i,...a)}};function r(e={}){let t=new WeakSet;return function(n,r){if(typeof r==`object`&&r){if(t.has(r))return;t.add(r)}return i(n,r,e)}}function i(e,t,n={}){let r=n?.serializeMapAndSet!==!1;return t instanceof Error?t.stack:t&&(typeof t==`function`?`[function] ${t.toString()}`:t instanceof Date?t.toISOString():r&&t instanceof Map&&Object.fromEntries?Object.fromEntries(t):r&&t instanceof Set&&Array.from?Array.from(t):t)}})),N=s(((e,t)=>{t.exports={transformStyles:a,applyAnsiStyles({data:e}){return a(e,r,i)},removeStyles({data:e}){return a(e,()=>``)}};var n={unset:`\x1B[0m`,black:`\x1B[30m`,red:`\x1B[31m`,green:`\x1B[32m`,yellow:`\x1B[33m`,blue:`\x1B[34m`,magenta:`\x1B[35m`,cyan:`\x1B[36m`,white:`\x1B[37m`,gray:`\x1B[90m`};function r(e){return n[e.replace(/color:\s*(\w+).*/,`$1`).toLowerCase()]||``}function i(e){return e+n.unset}function a(e,t,n){let r={};return e.reduce((e,i,a,o)=>{if(r[a])return e;if(typeof i==`string`){let e=a,s=!1;i=i.replace(/%[1cdfiOos]/g,n=>{if(e+=1,n!==`%c`)return n;let a=o[e];return typeof a==`string`?(r[e]=!0,s=!0,t(a,i)):n}),s&&n&&(i=n(i))}return e.push(i),e},[])}})),P=s(((e,t)=>{var{concatFirstStringElements:n,format:r}=j(),{maxDepth:i,toJSON:a}=M(),{applyAnsiStyles:o,removeStyles:s}=N(),{transform:c}=A(),l={error:console.error,warn:console.warn,info:console.info,verbose:console.info,debug:console.debug,silly:console.debug,log:console.log};t.exports=d;var u=`%c{h}:{i}:{s}.{ms}{scope}%c ${process.platform===`win32`?`>`:`›`} {text}`;Object.assign(d,{DEFAULT_FORMAT:u});function d(e){return Object.assign(t,{colorMap:{error:`red`,warn:`yellow`,info:`cyan`,verbose:`unset`,debug:`gray`,silly:`gray`,default:`unset`},format:u,level:`silly`,transforms:[f,r,m,n,i,a],useStyles:process.env.FORCE_STYLES,writeFn({message:e}){(l[e.level]||l.info)(...e.data)}});function t(n){let r=c({logger:e,message:n,transport:t});t.writeFn({message:{...n,data:r}})}}function f({data:e,message:t,transport:n}){return typeof n.format!=`string`||!n.format.includes(`%c`)?e:[`color:${h(t.level,n)}`,`color:unset`,...e]}function p(e,t){if(typeof e==`boolean`)return e;let n=t===`error`||t===`warn`?process.stderr:process.stdout;return n&&n.isTTY}function m(e){let{message:t,transport:n}=e;return(p(n.useStyles,t.level)?o:s)(e)}function h(e,t){return t.colorMap[e]||t.colorMap.default}})),F=s(((e,t)=>{var n=require(`events`),r=require(`fs`),i=require(`os`);t.exports=class extends n{asyncWriteQueue=[];bytesWritten=0;hasActiveAsyncWriting=!1;path=null;initialSize=void 0;writeOptions=null;writeAsync=!1;constructor({path:e,writeOptions:t={encoding:`utf8`,flag:`a`,mode:438},writeAsync:n=!1}){super(),this.path=e,this.writeOptions=t,this.writeAsync=n}get size(){return this.getSize()}clear(){try{return r.writeFileSync(this.path,``,{mode:this.writeOptions.mode,flag:`w`}),this.reset(),!0}catch(e){return e.code===`ENOENT`?!0:(this.emit(`error`,e,this),!1)}}crop(e){try{let t=a(this.path,e||4096);this.clear(),this.writeLine(`[log cropped]${i.EOL}${t}`)}catch(e){this.emit(`error`,Error(`Couldn't crop file ${this.path}. ${e.message}`),this)}}getSize(){if(this.initialSize===void 0)try{let e=r.statSync(this.path);this.initialSize=e.size}catch{this.initialSize=0}return this.initialSize+this.bytesWritten}increaseBytesWrittenCounter(e){this.bytesWritten+=Buffer.byteLength(e,this.writeOptions.encoding)}isNull(){return!1}nextAsyncWrite(){let e=this;if(this.hasActiveAsyncWriting||this.asyncWriteQueue.length===0)return;let t=this.asyncWriteQueue.join(``);this.asyncWriteQueue=[],this.hasActiveAsyncWriting=!0,r.writeFile(this.path,t,this.writeOptions,n=>{e.hasActiveAsyncWriting=!1,n?e.emit(`error`,Error(`Couldn't write to ${e.path}. ${n.message}`),this):e.increaseBytesWrittenCounter(t),e.nextAsyncWrite()})}reset(){this.initialSize=void 0,this.bytesWritten=0}toString(){return this.path}writeLine(e){if(e+=i.EOL,this.writeAsync){this.asyncWriteQueue.push(e),this.nextAsyncWrite();return}try{r.writeFileSync(this.path,e,this.writeOptions),this.increaseBytesWrittenCounter(e)}catch(e){this.emit(`error`,Error(`Couldn't write to ${this.path}. ${e.message}`),this)}}};function a(e,t){let n=Buffer.alloc(t),i=r.statSync(e),a=Math.min(i.size,t),o=Math.max(0,i.size-t),s=r.openSync(e,`r`),c=r.readSync(s,n,0,a,o);return r.closeSync(s),n.toString(`utf8`,0,c)}})),I=s(((e,t)=>{var n=F();t.exports=class extends n{clear(){}crop(){}getSize(){return 0}isNull(){return!0}writeLine(){}}})),ee=s(((e,t)=>{var n=require(`events`),r=require(`fs`),i=require(`path`),a=F(),o=I();t.exports=class extends n{store={};constructor(){super(),this.emitError=this.emitError.bind(this)}provide({filePath:e,writeOptions:t={},writeAsync:n=!1}){let r;try{if(e=i.resolve(e),this.store[e])return this.store[e];r=this.createFile({filePath:e,writeOptions:t,writeAsync:n})}catch(t){r=new o({path:e}),this.emitError(t,r)}return r.on(`error`,this.emitError),this.store[e]=r,r}createFile({filePath:e,writeOptions:t,writeAsync:n}){return this.testFileWriting({filePath:e,writeOptions:t}),new a({path:e,writeOptions:t,writeAsync:n})}emitError(e,t){this.emit(`error`,e,t)}testFileWriting({filePath:e,writeOptions:t}){r.mkdirSync(i.dirname(e),{recursive:!0}),r.writeFileSync(e,``,{flag:`a`,mode:t.mode})}}})),L=s(((e,t)=>{var n=require(`fs`),r=require(`os`),i=require(`path`),a=ee(),{transform:o}=A(),{removeStyles:s}=N(),{format:c,concatFirstStringElements:l}=j(),{toString:u}=M();t.exports=f;var d=new a;function f(e,{registry:t=d,externalApi:a}={}){let f;return t.listenerCount(`error`)<1&&t.on(`error`,(e,t)=>{g(`Can't write to ${t}`,e)}),Object.assign(m,{fileName:p(e.variables.processType),format:`[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}]{scope} {text}`,getFile:_,inspectOptions:{depth:5},level:`silly`,maxSize:1024**2,readAllLogs:v,sync:!0,transforms:[s,c,l,u],writeOptions:{flag:`a`,mode:438,encoding:`utf8`},archiveLogFn(e){let t=e.toString(),r=i.parse(t);try{n.renameSync(t,i.join(r.dir,`${r.name}.old${r.ext}`))}catch(t){g(`Could not rotate log`,t);let n=Math.round(m.maxSize/4);e.crop(Math.min(n,256*1024))}},resolvePathFn(e){return i.join(e.libraryDefaultDir,e.fileName)},setAppName(t){e.dependencies.externalApi.setAppName(t)}});function m(t){let n=_(t);m.maxSize>0&&n.size>m.maxSize&&(m.archiveLogFn(n),n.reset());let r=o({logger:e,message:t,transport:m});n.writeLine(r)}function h(){f||(f=Object.create(Object.prototype,{...Object.getOwnPropertyDescriptors(a.getPathVariables()),fileName:{get(){return m.fileName},enumerable:!0}}),typeof m.archiveLog==`function`&&(m.archiveLogFn=m.archiveLog,g(`archiveLog is deprecated. Use archiveLogFn instead`)),typeof m.resolvePath==`function`&&(m.resolvePathFn=m.resolvePath,g(`resolvePath is deprecated. Use resolvePathFn instead`)))}function g(t,n=null,r=`error`){let i=[`electron-log.transports.file: ${t}`];n&&i.push(n),e.transports.console({data:i,date:new Date,level:r})}function _(e){h();let n=m.resolvePathFn(f,e);return t.provide({filePath:n,writeAsync:!m.sync,writeOptions:m.writeOptions})}function v({fileFilter:e=e=>e.endsWith(`.log`)}={}){h();let t=i.dirname(m.resolvePathFn(f));return n.existsSync(t)?n.readdirSync(t).map(e=>i.join(t,e)).filter(e).map(e=>{try{return{path:e,lines:n.readFileSync(e,`utf8`).split(r.EOL)}}catch{return null}}).filter(Boolean):[]}}function p(e=process.type){switch(e){case`renderer`:return`renderer.log`;case`worker`:return`worker.log`;default:return`main.log`}}})),R=s(((e,t)=>{var{maxDepth:n,toJSON:r}=M(),{transform:i}=A();t.exports=a;function a(e,{externalApi:t}){return Object.assign(a,{depth:3,eventId:`__ELECTRON_LOG_IPC__`,level:e.isDev?`silly`:!1,transforms:[r,n]}),t?.isElectron()?a:void 0;function a(n){n?.variables?.processType!==`renderer`&&t?.sendIpc(a.eventId,{...n,data:i({logger:e,message:n,transport:a})})}}})),z=s(((e,t)=>{var n=require(`http`),r=require(`https`),{transform:i}=A(),{removeStyles:a}=N(),{toJSON:o,maxDepth:s}=M();t.exports=c;function c(e){return Object.assign(t,{client:{name:`electron-application`},depth:6,level:!1,requestOptions:{},transforms:[a,o,s],makeBodyFn({message:e}){return JSON.stringify({client:t.client,data:e.data,date:e.date.getTime(),level:e.level,scope:e.scope,variables:e.variables})},processErrorFn({error:n}){e.processMessage({data:[`electron-log: can't POST ${t.url}`,n],level:`warn`},{transports:[`console`,`file`]})},sendRequestFn({serverUrl:e,requestOptions:t,body:i}){let a=(e.startsWith(`https:`)?r:n).request(e,{method:`POST`,...t,headers:{"Content-Type":`application/json`,"Content-Length":i.length,...t.headers}});return a.write(i),a.end(),a}});function t(n){if(!t.url)return;let r=t.makeBodyFn({logger:e,message:{...n,data:i({logger:e,message:n,transport:t})},transport:t}),a=t.sendRequestFn({serverUrl:t.url,requestOptions:t.requestOptions,body:Buffer.from(r,`utf8`)});a.on(`error`,r=>t.processErrorFn({error:r,logger:e,message:n,request:a,transport:t}))}}})),B=s(((e,t)=>{var n=D(),r=O(),i=k(),a=P(),o=L(),s=R(),c=z();t.exports=l;function l({dependencies:e,initializeFn:t}){let l=new n({dependencies:e,errorHandler:new r,eventLogger:new i,initializeFn:t,isDev:e.externalApi?.isDev(),logId:`default`,transportFactories:{console:a,file:o,ipc:s,remote:c},variables:{processType:`main`}});return l.default=l,l.Logger=n,l.processInternalErrorFn=e=>{l.transports.console.writeFn({message:{data:[`Unhandled electron-log error`,e],level:`error`}})},l}})),te=s(((e,t)=>{var n=require(`electron`),r=S(),{initialize:i}=w(),a=B(),o=new r({electron:n}),s=a({dependencies:{externalApi:o},initializeFn:i});t.exports=s,o.onIpc(`__ELECTRON_LOG__`,(e,t)=>{t.scope&&s.Logger.getInstance(t).scope(t.scope);let n=new Date(t.date);c({...t,date:n.getTime()?n:new Date})}),o.onIpcInvoke(`__ELECTRON_LOG__`,(e,{cmd:t=``,logId:n})=>{switch(t){case`getOptions`:return{levels:s.Logger.getInstance({logId:n}).levels,logId:n};default:return c({data:[`Unknown cmd '${t}'`],level:`error`}),{}}});function c(e){s.Logger.getInstance(e)?.processMessage(e)}})),ne=s(((e,t)=>{t.exports=te()}));function re(){if(ae)return;ae=!0;let{app:e}=require(`electron`),{join:t,dirname:n}=require(`node:path`),r=e.isPackaged?t(n(e.getPath(`exe`)),`logs`):t(e.getAppPath(),`src`,`log`),i=()=>{let e=new Date;return`${e.getFullYear()}-${String(e.getMonth()+1).padStart(2,`0`)}-${String(e.getDate()).padStart(2,`0`)}`};V.default.transports.file.resolvePathFn=e=>t(r,i()+`.log`)}function ie(){re()}var V,ae,H,U=o((()=>{V=l(ne()),V.default.initialize(),V.default.transports.file.maxSize=5*1024*1024,V.default.transports.console.level=`error`,ae=!1,H=V.default}));U();var oe=d.app.isPackaged?u.default.join(process.resourcesPath,`ffmpeg.exe`):v.default.path;_.default.setFfmpegPath(oe);var se=Math.min(y.default.cpus().length,8);function ce(e,t,n,r){if(!r)return new Promise(r=>{(0,_.default)(e).outputOptions([`-c:v`,`copy`,`-c:a`,`aac`,`-b:a`,`128k`,`-movflags`,`+faststart`]).output(t).on(`progress`,()=>{n?.({percent:80,targetSize:0})}).on(`end`,()=>{n?.({percent:100,targetSize:0}),r({success:!0,outputPath:t})}).on(`error`,e=>{H.error(`MP4 remux failed:`,e.message),r({success:!1,outputPath:``,error:e.message})}).run()});let i=t.replace(/\.mp4$/i,`_tmp.mp4`),a=`crop=${Math.round(r.width/2)*2}:${Math.round(r.height/2)*2}:${Math.round(r.x/2)*2}:${Math.round(r.y/2)*2},`;return new Promise(r=>{(0,_.default)(e).outputOptions([`-c:v libx264`,`-preset ultrafast`,`-crf 23`,`-threads`,String(se),`-vf`,`${a}pad=ceil(iw/2)*2:ceil(ih/2)*2,format=yuv420p`,`-an`,`-movflags +faststart`]).output(i).on(`progress`,e=>{n?.({percent:Math.round((e.percent??0)*100)/200,targetSize:e.targetSize??0})}).on(`end`,()=>{(0,_.default)(i).addInput(e).outputOptions([`-c:v`,`copy`,`-c:a`,`aac`,`-b:a`,`128k`,`-map`,`0:v`,`-map`,`1:a?`,`-shortest`,`-movflags`,`+faststart`]).output(t).on(`progress`,e=>{n?.({percent:Math.round((e.percent??0)*100)/200+50,targetSize:e.targetSize??0})}).on(`end`,()=>{g.default.promises.unlink(i).catch(()=>{}),r({success:!0,outputPath:t})}).on(`error`,e=>{H.error(`MP4 audio mux failed:`,e.message),g.default.promises.rename(i,t).then(()=>r({success:!0,outputPath:t})).catch(()=>{g.default.promises.unlink(i).catch(()=>{}),r({success:!1,outputPath:``,error:e.message})})}).run()}).on(`error`,e=>{H.error(`MP4 conversion failed:`,e.message),r({success:!1,outputPath:``,error:e.message})}).run()})}function le(e,t,n,r){let i=Math.round(n.width/2)*2,a=Math.round(n.height/2)*2,o=Math.round(n.x/2)*2,s=Math.round(n.y/2)*2;return new Promise(n=>{(0,_.default)(e).outputOptions([`-c:v`,`libx264`,`-preset`,`ultrafast`,`-crf`,`18`,`-threads`,String(se),`-vf`,`crop=${i}:${a}:${o}:${s},format=yuv420p`,`-c:a`,`copy`,`-movflags`,`+faststart`]).output(t).on(`progress`,e=>{r?.({percent:Math.round((e.percent??0)*100),targetSize:e.targetSize??0})}).on(`end`,()=>{n({success:!0,outputPath:t})}).on(`error`,e=>{H.error(`Crop failed:`,e.message),n({success:!1,outputPath:``,error:e.message})}).run()})}function ue(e,t,n){return new Promise(r=>{let i=Math.max(...e.map(e=>e.bounds.x+e.bounds.width))-Math.min(...e.map(e=>e.bounds.x)),a=Math.max(...e.map(e=>e.bounds.y+e.bounds.height))-Math.min(...e.map(e=>e.bounds.y)),o=Math.min(...e.map(e=>e.bounds.x)),s=Math.min(...e.map(e=>e.bounds.y)),c=Math.round(i/2)*2,l=Math.round(a/2)*2;H.info(`Merge canvas size:`,c,`x`,l),H.info(`Merge inputs:`,e.map((e,t)=>`[${t}] ${e.filePath} bounds=${JSON.stringify(e.bounds)}`).join(`, `));let u=[],d=0,f=e.length;for(let t=0;t<f;t++){let n=e[t].filePath.replace(/\.webm$/i,`_remux.mp4`);u.push(n),(0,_.default)(e[t].filePath).outputOptions([`-c`,`copy`]).output(n).on(`end`,()=>{H.info(`Merge remux ${t+1}/${f} done`),d++,d===f&&p()}).on(`error`,e=>{H.error(`Merge remux ${t+1} failed:`,e.message),d++,d===f&&p()}).run()}function p(){let i=(0,_.default)();for(let e of u)i.addInput(e);let a=[];a.push(`color=c=black:s=${c}x${l}[bg]`);let d=`[bg]`;for(let t=0;t<e.length;t++){let n=e[t],r=Math.round((n.bounds.x-o)/2)*2,i=Math.round((n.bounds.y-s)/2)*2,c=Math.round(n.bounds.width/2)*2,l=Math.round(n.bounds.height/2)*2,u=`[s${t}]`,f=t===e.length-1?`[out]`:`[tmp${t}]`;a.push(`[${t}:v]scale=${c}:${l},setsar=1${u}`),a.push(`${d}${u}overlay=${r}:${i}${f}`),d=f}a.push(`[out]format=yuv420p`),H.info(`Merge filter_complex:`,a.join(`;`)),i.complexFilter(a).outputOptions([`-c:v`,`libx264`,`-preset`,`ultrafast`,`-crf`,`23`,`-threads`,String(se),`-movflags`,`+faststart`]).output(t).on(`start`,e=>{H.info(`Merge ffmpeg command started`)}).on(`progress`,e=>{n?.({percent:Math.round(e.percent??0),targetSize:e.targetSize??0})}).on(`end`,()=>{H.info(`Merge completed successfully`);for(let t of e)g.default.promises.unlink(t.filePath).catch(()=>{});for(let e of u)g.default.promises.unlink(e).catch(()=>{});r({success:!0,outputPath:t})}).on(`error`,t=>{H.error(`Multi-screen merge failed:`,t.message);for(let t of e)g.default.promises.unlink(t.filePath).catch(()=>{});for(let e of u)g.default.promises.unlink(e).catch(()=>{});r({success:!1,outputPath:``,error:t.message})}).run()}})}function de(e,t,n,r){let{execFile:i}=require(`node:child_process`),a=v.default.path,o=n?.width??480,s=n?.fps??10,c=u.default.join(y.default.tmpdir(),`gif_palette_${Date.now()}.png`);H.info(`GIF conversion - input:`,e,`palette:`,c,`output:`,t);let l=[`-y`,`-i`,e,`-vf`,`fps=${s},scale=${o}:-1:flags=lanczos,palettegen`,c];return new Promise(u=>{i(a,l,l=>{if(l){H.error(`GIF palette gen failed:`,l.message),u({success:!1,outputPath:``,error:l.message});return}H.info(`GIF palette generated successfully`);let d=i(a,[`-y`,`-i`,e,`-i`,c,`-filter_complex`,`[0:v]fps=${s},scale=${o}:-1:flags=lanczos[x];[x][1:v]paletteuse`,t],e=>{g.default.promises.unlink(c).catch(()=>{}),e?(H.error(`GIF creation failed:`,e.message),u({success:!1,outputPath:``,error:e.message})):u({success:!0,outputPath:t})});d.stdout&&d.stdout.on(`data`,e=>{let t=e.toString().match(/time=(\d+:\d+:\d+\.\d+)/);if(t&&n?.duration){let e=t[1].split(`:`).map(Number),i=e[0]*3600+e[1]*60+e[2],a=Math.min(Math.round(i/n.duration*100),99);r?.({percent:a+50,targetSize:0})}else r?.({percent:75,targetSize:0})})})})}var fe=s(((e,t)=>{U();var n=null;function r(e){n=e}function i(e,t){f&&!f.isDestroyed()&&f.webContents.send(`audio-levels`,{micLevel:e,sysLevel:t}),O&&!O.isDestroyed()&&O.webContents.send(`audio-levels`,{micLevel:e,sysLevel:t})}var a=null,o=null;function s(){return new Promise(e=>{o=e,n&&!n.isDestroyed()&&n.minimize();let{x:t,y:r,width:i,height:s}=d.screen.getPrimaryDisplay().bounds;a=new d.BrowserWindow({x:t,y:r,width:i,height:s,frame:!1,transparent:!0,resizable:!1,movable:!1,alwaysOnTop:!0,skipTaskbar:!0,hasShadow:!1,webPreferences:{nodeIntegration:!0,contextIsolation:!1}});let l=(0,u.join)(__dirname,`region-selector.html`);a.loadFile(l).catch(e=>{H.error(`Failed to load region selector:`,e.message),c(null)}),a.setFullScreen(!0),a.setVisibleOnAllWorkspaces(!0),a.setIgnoreMouseEvents(!1),a.on(`closed`,()=>{o&&=(o(null),null)})})}function c(e){a&&!a.isDestroyed()&&a.close(),a=null,o&&=(o(e),null)}var l=null,f=null,p=null,m=null,h=null,g=null,_=200,v=150,y=12,b=null,x=0,S=0,C=null;function w(){if(!g||g.isDestroyed())return;let e=d.screen.getCursorScreenPoint(),[t,n]=g.getPosition();x=e.x-t,S=e.y-n;let[r,i]=g.getSize();C=setInterval(()=>{if(!g||g.isDestroyed()){T();return}let e=d.screen.getCursorScreenPoint(),t=e.x-x,n=e.y-S;b&&(t=Math.max(b.x,Math.min(t,b.x+b.width-r)),n=Math.max(b.y,Math.min(n,b.y+b.height-i))),g.setBounds({x:t,y:n,width:r,height:i})},16)}function T(){C&&=(clearInterval(C),null)}function E(e,t){D(),b=e;let n=e.x+e.width-_-y,r=e.y+y;g=new d.BrowserWindow({x:n,y:r,width:_,height:v,frame:!1,transparent:!0,resizable:!1,movable:!1,alwaysOnTop:!0,skipTaskbar:!0,hasShadow:!1,webPreferences:{nodeIntegration:!0,contextIsolation:!1}}),g.setVisibleOnAllWorkspaces(!0),g.setAlwaysOnTop(!0,`screen-saver`);let i=(0,u.join)(__dirname,`camera-preview.html`),a=t?`?deviceId=${encodeURIComponent(t)}`:``;g.loadFile(i+a).catch(e=>{H.error(`Failed to load camera preview:`,e.message)}),H.info(`Camera preview shown at`,n,r)}function D(){g&&!g.isDestroyed()&&(g.close(),g=null)}var O=null,k=null,A=null,j=`idle`,M=null;function N(e,t){P(),j=`idle`;let n=d.screen.getPrimaryDisplay();if(t!=null){let e=d.screen.getAllDisplays().find(e=>e.id===t);e&&(n=e)}let r=n.bounds;M=r,O=new d.BrowserWindow({x:Math.round(r.x+(r.width-340)/2),y:r.y+4,width:340,height:44,frame:!1,transparent:!0,resizable:!0,movable:!1,alwaysOnTop:!0,skipTaskbar:!0,hasShadow:!1,webPreferences:{nodeIntegration:!0,contextIsolation:!1}}),O.setVisibleOnAllWorkspaces(!0),O.setMinimumSize(100,44),O.setAlwaysOnTop(!0,`screen-saver`);let i=`<!DOCTYPE html>
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
ipcRenderer.on('agent-permission-request',(e,data)=>{
  document.getElementById('permCard').classList.add('show')
  document.getElementById('permTool').textContent=data.toolName||'未知操作'
  const istr=data.toolInput?JSON.stringify(data.toolInput).slice(0,80):''
  document.getElementById('permTarget').textContent=istr?': '+istr:''
  setTimeout(resizeIsland,50)
})
function doAllow(){resolvePerm('allow')}
function doDeny(){resolvePerm('deny')}
function doAlwaysAllow(){resolvePerm('always')}
function resolvePerm(b){ipcRenderer.invoke('agent-resolve-permission',b);document.getElementById('permCard').classList.remove('show');setTimeout(resizeIsland,50)}
function showAiDetail(){}
<\/script>
</body></html>`;O.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(i)}`),H.info(`Floating island shown`),b=r,e?.cameraEnabled&&E(r,e.cameraDeviceId)}function P(){k&&=(clearInterval(k),null),A&&=(clearTimeout(A),null),O&&!O.isDestroyed()&&(O.close(),O=null),D(),b=null,M=null}function F(e,t){if(j=e===`idle`?`idle`:e===`recording`?`recording`:e===`paused`?`paused`:j,e===`show`||e===`hide`){O&&!O.isDestroyed()&&O.webContents.send(`island-state`,e);return}O&&!O.isDestroyed()&&O.webContents.send(`island-state`,e,t),k&&=(clearInterval(k),null),A&&=(clearTimeout(A),null),e===`recording`&&(k=setInterval(()=>{if(!O||O.isDestroyed())return;let e=d.screen.getCursorScreenPoint(),[t,n]=O.getPosition(),[r,i]=O.getSize();e.x>=t&&e.x<=t+r&&e.y>=n-4&&e.y<=n+i?(A&&=(clearTimeout(A),null),O.webContents.send(`island-state`,`show`)):A||=setTimeout(()=>{O&&!O.isDestroyed()&&O.webContents.send(`island-state`,`hide`),A=null},500)},250))}var I=44,ee=3;function L(e,t){B();let n=ee,r=n+2,i=d.screen.getPrimaryDisplay().bounds,a=e.y-i.y,o=i.y+i.height-(e.y+e.height),s=I+4,c,u,_,v;a>=s?(v=`top`,c=e.x-r,u=e.y-I-r,_=e.width+r*2):o>=s?(v=`bottom`,c=e.x-r,u=e.y+e.height+r,_=e.width+r*2):(v=`inside`,c=e.x,u=e.y,_=Math.min(e.width,500)),m={...e},h=v,f=new d.BrowserWindow({x:c,y:u,width:_,height:I,frame:!1,transparent:!0,resizable:!1,movable:!1,alwaysOnTop:!0,skipTaskbar:!0,hasShadow:!1,webPreferences:{nodeIntegration:!0,contextIsolation:!1}}),f.setVisibleOnAllWorkspaces(!0),f.setAlwaysOnTop(!0,`screen-saver`);let y=`<!DOCTYPE html>
<html><head><style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;overflow:hidden;font-family:'Segoe UI',system-ui,sans-serif}
.toolbar{
  width:100%;height:${I}px;
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
<div class="toolbar" id="toolbar" data-pos="${v}">
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
</body></html>`;f.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(y)}`);let x=e.x-r,S=e.y-r,C=e.width+r*2,w=e.height+r*2;l=new d.BrowserWindow({x,y:S,width:C,height:w,show:!1,frame:!1,transparent:!0,resizable:!1,movable:!1,alwaysOnTop:!0,skipTaskbar:!0,hasShadow:!1,webPreferences:{nodeIntegration:!0,contextIsolation:!1}}),l.setVisibleOnAllWorkspaces(!0),l.setAlwaysOnTop(!0,`screen-saver`),l.setIgnoreMouseEvents(!0),l.setBounds({x,y:S,width:C,height:w}),l.show();let T=`<!DOCTYPE html>
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
</body></html>`;l.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(T)}`),H.info(`Region border+toolbar shown (split windows):`,e),b=e,t?.cameraEnabled&&E(e,t.cameraDeviceId),p&&clearInterval(p),p=setInterval(()=>{l&&!l.isDestroyed()&&l.setAlwaysOnTop(!0,`screen-saver`),f&&!f.isDestroyed()&&f.setAlwaysOnTop(!0,`screen-saver`),g&&!g.isDestroyed()&&g.setAlwaysOnTop(!0,`screen-saver`)},5e3)}function R(e,t){f&&!f.isDestroyed()&&(f.webContents.send(`toolbar-state`,e,t,h),(e===`recording`||e===`paused`)&&h===`inside`&&m&&f.setBounds({x:m.x+8,y:m.y+8,width:170,height:40}))}function z(){l&&!l.isDestroyed()&&(l.close(),l=null)}function B(){p&&=(clearInterval(p),null),z(),f&&!f.isDestroyed()&&(f.close(),f=null),D(),b=null,H.info(`Region border hidden`)}function te(){d.ipcMain.on(`region-selected`,(e,t)=>{H.info(`Region selected:`,t),c(t)}),d.ipcMain.on(`region-cancelled`,()=>{H.info(`Region selection cancelled`),c(null)}),d.ipcMain.handle(`show-region-border`,(e,t,n)=>{L(t,n)}),d.ipcMain.handle(`hide-region-border`,()=>{B()}),d.ipcMain.handle(`hide-border-only`,()=>{z()}),d.ipcMain.handle(`update-toolbar-state`,(e,t,n)=>{R(t,n)}),d.ipcMain.on(`toolbar-action`,(e,t)=>{if(H.info(`Toolbar action:`,t),t===`close`){n&&!n.isDestroyed()&&n.webContents.send(`on-toolbar-action`,`close`),B();return}n&&!n.isDestroyed()&&n.webContents.send(`on-toolbar-action`,t)}),d.ipcMain.removeHandler(`set-mouse-ignore`),d.ipcMain.removeAllListeners(`set-mouse-ignore`),d.ipcMain.handle(`show-floating-island`,(e,t,n)=>{N(t,n)}),d.ipcMain.handle(`hide-floating-island`,()=>{P()}),d.ipcMain.handle(`hide-camera-preview`,()=>{D()}),d.ipcMain.handle(`toggle-camera-preview`,(e,t,n)=>{t&&b?E(b,n):D()}),d.ipcMain.on(`camera-drag-start`,()=>w()),d.ipcMain.on(`camera-drag-end`,()=>T()),d.ipcMain.handle(`set-island-state`,(e,t,n)=>{F(t,n)}),d.ipcMain.on(`island-action`,(e,t)=>{H.info(`Island action:`,t),n&&!n.isDestroyed()&&n.webContents.send(`on-toolbar-action`,t)}),d.ipcMain.on(`resize-island`,(e,t,n)=>{if(O&&!O.isDestroyed()){let e=M||d.screen.getPrimaryDisplay().bounds,r=t+20,i=Math.round(e.x+(e.width-r)/2),a=n||44;O.setBounds({x:i,y:e.y+4,width:r,height:a})}})}t.exports={selectRegion:s,showRegionBorder:L,hideRegionBorder:B,hideBorderOnly:z,updateToolbarState:R,updateAudioLevels:i,showFloatingIsland:N,hideFloatingIsland:P,showCameraPreview:E,hideCameraPreview:D,setFloatingIslandState:F,setMainWindow:r,registerRegionSelectorHandlers:te}})),pe=fe();U();var W=null,G=null,K=null,q=66,J=240,me=`floating-ball-pos.json`;function he(){return(0,u.join)(d.app.isPackaged?d.app.getPath(`userData`):(0,u.join)(__dirname,`..`,`..`),me)}function ge(){try{let e=g.default.readFileSync(he(),`utf-8`),t=JSON.parse(e);if(typeof t.x==`number`&&typeof t.y==`number`)return t}catch{}return null}function _e(e){try{g.default.writeFileSync(he(),JSON.stringify(e),`utf-8`)}catch{}}function ve(){if(W&&!W.isDestroyed()){W.show(),W.focus();return}if(!G){let e=ge();if(e)G=e;else{let e=d.screen.getPrimaryDisplay().bounds;G={x:Math.round(e.x+(e.width-q)/2),y:Math.round(e.y+(e.height-q)/2)}}}W=new d.BrowserWindow({x:G.x,y:G.y,width:q,height:q,frame:!1,transparent:!0,backgroundColor:`#00000000`,resizable:!1,alwaysOnTop:!0,skipTaskbar:!0,hasShadow:!1,show:!1,webPreferences:{nodeIntegration:!0,contextIsolation:!1}}),W.setVisibleOnAllWorkspaces(!0),W.setAlwaysOnTop(!0,`screen-saver`);let e=we();W.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(e)}`),W.once(`ready-to-show`,()=>{W?.show(),W&&!W.isDestroyed()&&W.webContents.executeJavaScript(`ensureMenu()`).catch(()=>{})}),W.on(`closed`,()=>{W=null}),W.on(`move`,()=>{if(W&&!W.isDestroyed()){let[e,t]=W.getPosition();G={x:e,y:t}}}),W.on(`close`,()=>{G&&_e(G)}),H.info(`Floating ball shown`)}function ye(){if(W&&!W.isDestroyed()){let[e,t]=W.getPosition();G={x:e,y:t},_e(G),W.close(),W=null,H.info(`Floating ball hidden`)}}async function be(){if(!W||W.isDestroyed())return;let[e,t]=W.getPosition(),n=Math.round(e+q/2),r=Math.round(t+q/2);H.info(`[Ball] expand at`,[e,t],`center`,[n,r]),W.setOpacity(0),W.setBounds({x:n-J/2,y:r-J/2,width:J,height:J});try{await W.webContents.executeJavaScript(`ensureMenu(); document.body.offsetHeight; document.body.classList.add('expanded'); isExpanded=true; void 0;`)}catch{}if(!(!W||W.isDestroyed())){try{await W.capturePage()}catch{}!W||W.isDestroyed()||(W.setOpacity(1),W.webContents.send(`ball-state`,`expanded`))}}async function xe(){if(!W||W.isDestroyed())return;let[e,t]=W.getPosition(),n=Math.round(e+J/2),r=Math.round(t+J/2);H.info(`[Ball] collapse at`,[e,t],`center`,[n,r]),W.setOpacity(0);try{await W.webContents.executeJavaScript(`document.body.classList.remove('expanded');
       var s=document.getElementById('ringSvg');while(s.firstChild){s.removeChild(s.firstChild)}
       menuCreated=false; isExpanded=false; void 0;`)}catch{}if(!W||W.isDestroyed())return;let i=n-q/2,a=r-q/2;W.setBounds({x:i,y:a,width:q,height:q});let[o,s]=W.getPosition();(o!==i||s!==a)&&W.setBounds({x:i+(i-o),y:a+(a-s),width:q,height:q}),W.setOpacity(1)}function Se(e){let t=d.BrowserWindow.getAllWindows().find(e=>!e.isDestroyed()&&e!==W);t&&!t.isDestroyed()&&t.webContents.send(`on-floating-ball-action`,e),xe()}var Y=null;function Ce(e=48){if(Y)return Y;try{let t=[(0,u.join)(__dirname,`..`,`..`,`public`,`logo.png`),(0,u.join)(__dirname,`..`,`public`,`logo.png`),(0,u.join)(__dirname,`..`,`..`,`resources`,`logo.png`)];for(let n of t)if(g.default.existsSync(n))return Y=d.nativeImage.createFromPath(n).resize({width:e,height:e,quality:`good`}).toDataURL(),Y}catch{}return``}function we(){return`<!DOCTYPE html>
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
    <img id="logoImg" class="logo-img" src="${Ce(48)}" alt="logo" />
  </button>
</div>

<script>
const {ipcRenderer} = require('electron')

const ITEMS = [
  {label:'全屏',icon:'⛶',action:'fullscreen'},
  {label:'区域',icon:'▣',action:'region'},
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
</html>`}function Te(){d.ipcMain.handle(`show-floating-ball`,()=>{ve()}),d.ipcMain.handle(`hide-floating-ball`,()=>{ye()}),d.ipcMain.handle(`toggle-floating-ball`,()=>{ye()}),d.ipcMain.on(`floating-ball-expand`,()=>{be()}),d.ipcMain.on(`floating-ball-collapse`,()=>{xe()}),d.ipcMain.on(`floating-ball-action`,(e,t)=>{H.info(`Floating ball action:`,t),Se(t)});let e=null;d.ipcMain.on(`floating-ball-drag-start`,(t,n,r)=>{if(!W||W.isDestroyed())return;let[i,a]=W.getPosition(),[o,s]=W.getSize();K={winX:i,winY:a,scrX:n,scrY:r},e={w:o,h:s}}),d.ipcMain.on(`floating-ball-move`,(t,n,r)=>{if(!W||W.isDestroyed()||!K||!e)return;let i=n-K.scrX,a=r-K.scrY,o=Math.round(K.winX+i),s=Math.round(K.winY+a);W.setBounds({x:o,y:s,width:e.w,height:e.h});let[c,l]=W.getPosition();(c!==o||l!==s)&&W.setBounds({x:o+(o-c),y:s+(s-l),width:e.w,height:e.h})}),d.ipcMain.on(`floating-ball-drag-end`,()=>{K=null,e=null,G&&_e(G)})}var X=s(((e,t)=>{U();var n=null;function r(){let e=d.app.isPackaged?(0,u.join)(process.resourcesPath,`logo.ico`):(0,u.join)(__dirname,`../../public/logo.ico`);return d.nativeImage.createFromPath(e).resize({width:16,height:16})}function i(){let e=d.app.isPackaged?(0,u.join)(process.resourcesPath,`logo.png`):(0,u.join)(__dirname,`../../public/logo.png`);return e?d.nativeImage.createFromPath(e).resize({width:64,height:64,quality:`better`}):d.nativeImage.createEmpty()}function a(){if(n&&!n.isDestroyed())return;n=new d.Tray(r()),n.setToolTip(`二支录制`);let e=d.Menu.buildFromTemplate([{label:`显示主窗口`,click:()=>{let e=d.BrowserWindow.getAllWindows()[0];e&&(e.show(),e.focus())}},{type:`separator`},{label:`退出`,click:()=>{let{app:e}=require(`electron`);e.quit()}}]);n.setContextMenu(e),n.on(`click`,()=>{let e=d.BrowserWindow.getAllWindows()[0];e&&(e.show(),e.focus())}),H.info(`System tray created`)}function o(e,t){n&&!n.isDestroyed()&&(n.displayBalloon({title:e,content:t,icon:i()}),H.info(`Tray balloon:`,e,t))}function s(){n&&!n.isDestroyed()&&(n.destroy(),n=null)}t.exports={createTray:a,showBalloon:o,destroyTray:s}}))();U();var{updateAudioLevels:Ee}=fe();function De(){return(0,u.join)(d.app.getPath(`userData`),`recordings.json`)}function Oe(e){(0,pe.registerRegionSelectorHandlers)(),Te(),d.ipcMain.handle(`select-region`,async()=>(0,pe.selectRegion)()),d.ipcMain.handle(`get-sources`,async(e,t)=>(await d.desktopCapturer.getSources({types:t??[`screen`,`window`],thumbnailSize:{width:340,height:200},fetchWindowIcons:!0})).map(e=>({id:e.id,name:e.name,display_id:e.display_id,appIcon:e.appIcon?.toDataURL()||null,thumbnail:e.thumbnail.toDataURL()}))),d.ipcMain.handle(`get-system-audio-sources`,async()=>{try{return(await d.desktopCapturer.getSources({types:[`audio`]})).map(e=>({id:e.id,name:e.name}))}catch{return[]}}),d.ipcMain.handle(`show-save-dialog`,async(e,t)=>{let n=d.BrowserWindow.getFocusedWindow();return n?d.dialog.showSaveDialog(n,{title:t?.title??`Save Recording`,defaultPath:t?.defaultPath??`recording-${Date.now()}.webm`,filters:t?.filters??[{name:`WebM Video`,extensions:[`webm`]},{name:`MP4 Video`,extensions:[`mp4`]},{name:`GIF`,extensions:[`gif`]}]}):{canceled:!0,filePath:null}}),d.ipcMain.handle(`show-open-dialog`,async(e,t)=>{let n=d.BrowserWindow.getFocusedWindow();return n?d.dialog.showOpenDialog(n,{title:t?.title??`Select File`,defaultPath:t?.defaultPath,filters:t?.filters??[{name:`Video Files`,extensions:[`webm`,`mp4`,`gif`]}],properties:t?.properties}):{canceled:!0,filePaths:[]}}),d.ipcMain.handle(`get-default-save-dir`,async()=>d.app.getPath(`videos`)||d.app.getPath(`desktop`)),d.ipcMain.handle(`write-file`,async(e,t,n)=>{try{return await g.default.promises.mkdir((0,u.dirname)(n),{recursive:!0}),await g.default.promises.writeFile(n,t),H.info(`保存文件`,n),{success:!0,filePath:n}}catch(e){return H.error(`保存文件失败`,n,e.message),{success:!1,filePath:n,error:e.message}}}),d.ipcMain.handle(`read-file`,async(e,t)=>{try{return(await g.default.promises.readFile(t)).buffer}catch(e){throw Error(`Failed to read file: ${e.message}`)}}),d.ipcMain.handle(`file-exists`,async(e,t)=>{try{return await g.default.promises.access(t),!0}catch{return!1}}),d.ipcMain.handle(`delete-file`,async(e,t)=>{try{return await g.default.promises.unlink(t),!0}catch{return!1}}),d.ipcMain.handle(`get-file-size`,async(e,t)=>{try{return(await g.default.promises.stat(t)).size}catch{return 0}});function t(e,t,...n){if(!(!e||e.isDestroyed()))try{e.webContents.send(t,...n)}catch{}}d.ipcMain.handle(`convert-to-mp4`,async(e,n,r,i)=>{H.info(`转换为 MP4`,n,`->`,r,i?`crop: ${i.width}x${i.height}`:``);let a=d.BrowserWindow.fromWebContents(e.sender);return ce(n,r,e=>{t(a,`on-conversion-progress`,e)},i)}),d.ipcMain.handle(`crop-video`,async(e,n,r,i)=>{H.info(`裁剪视频`,n,`->`,r,`crop: ${i.width}x${i.height}+${i.x}+${i.y}`);let a=d.BrowserWindow.fromWebContents(e.sender);return le(n,r,i,e=>{t(a,`on-conversion-progress`,e)})}),d.ipcMain.handle(`convert-to-gif`,async(e,n,r,i)=>{H.info(`转换为 GIF`,n,`->`,r);let a=d.BrowserWindow.fromWebContents(e.sender);return de(n,r,i,e=>{t(a,`on-conversion-progress`,e)})}),d.ipcMain.handle(`merge-multi-screen`,async(e,n,r)=>{H.info(`合并多屏录制`,n.length,`个屏幕 ->`,r);let i=d.BrowserWindow.fromWebContents(e.sender);return ue(n,r,e=>{t(i,`on-conversion-progress`,e)})}),d.ipcMain.handle(`open-file-location`,async(e,t)=>{d.shell.showItemInFolder(t)}),d.ipcMain.handle(`open-external`,async(e,t)=>{d.shell.openExternal(t)}),d.ipcMain.handle(`open-path`,async(e,t)=>{await d.shell.openPath(t)}),d.ipcMain.handle(`get-app-version`,async()=>d.app.getVersion()),d.ipcMain.handle(`get-screen-scale-factor`,async()=>d.screen.getPrimaryDisplay().scaleFactor),d.ipcMain.handle(`get-screen-bounds`,async()=>{let e=d.screen.getPrimaryDisplay(),t=e.scaleFactor;return{x:Math.round(e.bounds.x/t),y:Math.round(e.bounds.y/t),width:Math.round(e.bounds.width/t),height:Math.round(e.bounds.height/t)}}),d.ipcMain.handle(`take-screenshot`,async e=>{try{let e=await d.desktopCapturer.getSources({types:[`screen`],thumbnailSize:{width:0,height:0}});if(!e.length)throw Error(`未找到屏幕源`);let t=e[0].thumbnail.toPNG(),n=new Date,r=`截图_${n.getFullYear()}${String(n.getMonth()+1).padStart(2,`0`)}${String(n.getDate()).padStart(2,`0`)}_${String(n.getHours()).padStart(2,`0`)}${String(n.getMinutes()).padStart(2,`0`)}${String(n.getSeconds()).padStart(2,`0`)}.png`,i=(0,u.join)(d.app.getPath(`desktop`),r);return await g.default.promises.writeFile(i,t),(0,X.showBalloon)(`二支录制`,`截图已保存到桌面：${r}`),{success:!0,filePath:i}}catch(e){return H.error(`截图失败`,e.message),{success:!1,error:e.message}}}),d.ipcMain.handle(`get-all-displays`,async()=>{let e=d.screen.getAllDisplays(),t=d.screen.getPrimaryDisplay(),n=await d.desktopCapturer.getSources({types:[`screen`],thumbnailSize:{width:340,height:200}});return e.map((e,r)=>{let i=n[r];return{id:e.id,label:e.id===t.id?`主屏幕`:`屏幕 ${r+1}`,bounds:e.bounds,scaleFactor:e.scaleFactor,size:{width:e.size.width,height:e.size.height},isPrimary:e.id===t.id,sourceId:i?.id||null,sourceName:i?.name||``,thumbnail:i?.thumbnail?.toDataURL()||``}})}),d.ipcMain.handle(`minimize-window`,async e=>{d.BrowserWindow.fromWebContents(e.sender)?.minimize()}),d.ipcMain.handle(`show-window`,async e=>{let t=d.BrowserWindow.fromWebContents(e.sender);t&&(t.show(),t.focus())}),d.ipcMain.handle(`maximize-window`,async e=>{let t=d.BrowserWindow.fromWebContents(e.sender);t?.isMaximized()?t.unmaximize():t?.maximize()}),d.ipcMain.handle(`close-window`,async e=>{let t=d.BrowserWindow.fromWebContents(e.sender);t&&t.hide()}),d.ipcMain.on(`notify-conversion-start`,()=>{(0,X.showBalloon)(`二支录制`,`录制完成，正在转换视频格式...`)}),d.ipcMain.on(`show-about-window`,()=>{let e=d.BrowserWindow.getFocusedWindow();if(e){let t=new d.BrowserWindow({width:360,height:400,resizable:!1,frame:!1,modal:!0,parent:e,backgroundColor:`#eaeaec`,webPreferences:{preload:(0,u.join)(__dirname,`..`,`preload`,`index.cjs`),contextIsolation:!0,nodeIntegration:!1,sandbox:!1}});d.ipcMain.on(`close-about-window`,()=>{t.close(),d.ipcMain.removeAllListeners(`close-about-window`)}),t.on(`closed`,()=>{d.ipcMain.removeAllListeners(`close-about-window`)});let n=process.env.VITE_DEV_SERVER_URL?`${process.env.VITE_DEV_SERVER_URL}about.html`:(0,u.join)(d.app.getAppPath(),`dist`,`about.html`);n.startsWith(`http`)?t.loadURL(n):t.loadFile(n)}}),d.ipcMain.on(`notify-conversion-done`,()=>{(0,X.showBalloon)(`二支录制`,`视频转换完成！`)}),d.ipcMain.on(`update-audio-levels`,(e,t,n)=>{Ee(t,n)}),d.ipcMain.handle(`load-recordings`,async()=>{let e=De();try{let t=await g.default.promises.readFile(e,`utf-8`),n=JSON.parse(t);return H.info(`加载录制历史`,e,n.length,`条`),n}catch(t){return H.info(`加载录制历史失败（可能首次运行）`,e,t.message),[]}}),d.ipcMain.handle(`save-recordings`,async(e,t)=>{let n=De();try{return await g.default.promises.writeFile(n,JSON.stringify(t),`utf-8`),H.info(`保存录制历史`,n,t.length,`条`),!0}catch(e){return H.error(`保存录制历史失败`,n,e.message),!1}}),e&&(e.setStateListener((e,t)=>{let n=d.BrowserWindow.getAllWindows();for(let r of n)if(!r.isDestroyed())try{r.webContents.send(`agent-state-update`,{state:e,sessions:t})}catch{}}),e.setPermissionListener(e=>{let t=d.BrowserWindow.getAllWindows();for(let n of t)if(!n.isDestroyed())try{n.webContents.send(`agent-permission-request`,e)}catch{}}),d.ipcMain.handle(`agent-get-status`,()=>e?.getStatus()??null),d.ipcMain.handle(`agent-install-hooks`,()=>(e?.installHooks(),e?.getStatus())),d.ipcMain.handle(`agent-uninstall-hooks`,()=>(e?.uninstallHooks(),e?.getStatus())),d.ipcMain.handle(`agent-set-auto-start`,(t,n)=>e?.setAutoStart(n)),d.ipcMain.handle(`agent-resolve-permission`,(t,n)=>e?.resolvePermission(n)))}U();var ke=null;function Ae(e){ke=e,d.globalShortcut.register(`CommandOrControl+Shift+R`,()=>{H.info(`Global shortcut: start/stop recording`),ke?.webContents.send(`on-global-shortcut`,`startStop`)}),d.globalShortcut.register(`CommandOrControl+Shift+P`,()=>{H.info(`Global shortcut: pause/resume recording`),ke?.webContents.send(`on-global-shortcut`,`pauseResume`)}),H.info(`Global shortcuts registered`)}function je(){d.globalShortcut.unregisterAll()}U();var Me=`http://8.163.43.7:3000/report-ip`;function Z(){return(0,u.join)(d.app.getPath(`userData`),`pending-reports.json`)}function Ne(e){let t=[];try{g.default.existsSync(Z())&&(t=JSON.parse(g.default.readFileSync(Z(),`utf-8`)))}catch{}t.push(e),g.default.writeFileSync(Z(),JSON.stringify(t,null,2),`utf-8`),H.info(`Saved offline report to local, total pending:`,t.length)}function Pe(){try{if(g.default.existsSync(Z()))return JSON.parse(g.default.readFileSync(Z(),`utf-8`))}catch{}return[]}function Fe(){try{g.default.unlinkSync(Z())}catch{}}async function Ie(e){try{return await fetch(Me,{method:`POST`,headers:{"Content-Type":`application/json`},body:JSON.stringify(e)}),!0}catch{return!1}}async function Le(){let e=Pe();if(e.length===0)return!0;let t=[];for(let n of e)await Ie(n)?H.info(`Flushed pending report:`,n.公网IP,n.上报时间):t.push(n);return t.length===0?(Fe(),H.info(`All pending reports flushed`),!0):(g.default.writeFileSync(Z(),JSON.stringify(t,null,2),`utf-8`),H.info(`Some pending reports still failed, remaining:`,t.length),!1)}async function Re(){let e=[async()=>{let e=(await fetch(`https://qifu.baidu.com/opus/api/ip/local`,{headers:{Referer:`https://www.baidu.com`}}).then(e=>e.json()))?.data;if(!e?.ip)throw Error(`empty`);return{公网IP:e.ip,国家:e.country||``,省份:e.province||``,城市:e.city||``,区县:e.district||e.area||``,详细地址:[e.country,e.province,e.city,e.district||e.area].filter(Boolean).join(``),运营商:e.isp||``}},async()=>{let e=await fetch(`http://whois.pconline.com.cn/ipJson.jsp`).then(e=>e.arrayBuffer()),t=new TextDecoder(`gbk`).decode(e),n=JSON.parse(t);if(!n.ip)throw Error(`empty`);return{公网IP:n.ip,国家:`中国`,省份:n.pro||``,城市:n.city||``,区县:n.region||``,详细地址:n.addr||``,运营商:n.addr?.split(` `)?.[1]||``}},async()=>{let e=await fetch(`http://ip-api.com/json/?lang=zh-CN`).then(e=>e.json());if(!e.query)throw Error(`empty`);return{公网IP:e.query,国家:e.country,省份:e.regionName,城市:e.city,区县:``,详细地址:`${e.country}${e.regionName}${e.city}`,运营商:e.isp,纬度:String(e.lat??``),经度:String(e.lon??``)}}];for(let t of e)try{return await t()}catch{continue}return{公网IP:``,国家:``,省份:``,城市:``,区县:``,详细地址:``,运营商:``}}function ze(){let e=(0,y.networkInterfaces)();for(let t of Object.keys(e))for(let n of e[t])if(n.family===`IPv4`&&!n.internal)return n.address;return`127.0.0.1`}async function Be(){let e=ze(),t={电脑名:(0,y.hostname)(),局域网IP:e,上报时间:new Date().toISOString()},n;try{n=await Re()}catch{n={公网IP:``,国家:``,省份:``,城市:``,区县:``,详细地址:``,运营商:``}}let r={...t,...n};await Ie(r)?(H.info(`IP reported:`,n.公网IP,n.省份,n.城市),Le()):(H.info(`Network unavailable, saving report locally`),Ne(r))}function Ve(){let e=Pe();e.length>0&&(H.info(`Retrying pending reports:`,e.length),Le())}var He={error:4,notification:3,working:2,thinking:1,idle:0},Ue=600*1e3,We=300*1e3,Ge=10*1e3,Ke=2e3;function qe(){let e=new Map,t=null,n=[],r=null,i=`idle`;function a(e){return n.push(e),()=>{n=n.filter(t=>t!==e)}}function o(){let t=l();if(t!==i){i=t;let r=Array.from(e.values());for(let e of n)e(t,r)}}function s(t,n,i,a={}){r&&=(clearTimeout(r),null);let s=e.get(t),c={sessionId:t,agentId:a.agentId||`claude-code`,state:n,event:i,updatedAt:Date.now(),toolName:a.toolName||s?.toolName,toolInput:a.toolInput||s?.toolInput,contextUsage:a.contextUsage||s?.contextUsage,model:a.model||s?.model};e.set(t,c),n===`idle`&&i===`Stop`&&(r=setTimeout(()=>{if(r=null,e.has(t)){let n=e.get(t);n.state=`idle`,n.updatedAt=Date.now()}o()},Ke)),o()}function c(t){e.delete(t),o()}function l(){let t=`idle`;for(let[,n]of e)(He[n.state]??0)>(He[t]??0)&&(t=n.state);return r&&t===`idle`?`done`:t}function u(){return i}function d(){return Array.from(e.values())}function f(){let t=Date.now(),n=!1;for(let[r,i]of e){let a=t-i.updatedAt;a>Ue?(e.delete(r),n=!0):i.state!==`idle`&&a>We&&(i.state=`idle`,i.updatedAt=t,n=!0)}n&&o()}function p(){t||=setInterval(f,Ge)}function m(){t&&=(clearInterval(t),null),r&&=(clearTimeout(r),null)}return{updateSession:s,dismissSession:c,resolveDisplayState:l,getCurrentState:u,getSessions:d,subscribe:a,cleanStaleSessions:f,start:p,stop:m}}U();var Je=23338,Ye=23342,Xe=12e4,Ze=null;function Qe(){return Ze||(Ze=f.join(require(`os`).homedir(),`.erzhi-recording`),Ze)}function $e(e){let t=null,n=null,r=null,i=null,a=null;function o(e){return new Promise((t,n)=>{let r=``;e.on(`data`,e=>{r+=e}),e.on(`end`,()=>{try{t(JSON.parse(r))}catch{n(Error(`Invalid JSON`))}}),e.on(`error`,n)})}function s(e,t,n){e.writeHead(t,{"Content-Type":`application/json`}),e.end(JSON.stringify(n))}function c(t,n){let r=t.session_id||t.sessionId,i=t.state,a=t.event;if(!r||!i||!a){s(n,400,{error:`Missing required fields: session_id, state, event`});return}e.updateSession(r,i,a,{agentId:t.agent_id||`claude-code`,toolName:t.tool_name||t.toolName,toolInput:t.tool_input||t.toolInput,contextUsage:t.context_usage||t.contextUsage,model:t.model}),s(n,200,{ok:!0,app:`erzhi-recording`})}function l(t,n){let o=t.tool_name||t.toolName||`unknown`,c=t.tool_input||t.toolInput||{},l=t.session_id||t.sessionId||`unknown`;e.updateSession(l,`notification`,`PermissionRequest`,{toolName:o,toolInput:c}),r&&(r.reject(`superseded`),i&&clearTimeout(i)),new Promise((e,n)=>{r={sessionId:l,toolName:o,toolInput:c,suggestions:t.permission_suggestions||null,resolve:e,reject:n,createdAt:Date.now()},i=setTimeout(()=>{r&&(r.reject(`timeout`),r=null,i=null)},Xe),a&&a(r)}).then(t=>{n.headersSent||(e.updateSession(l,`idle`,`PermissionResolved`),s(n,200,{behavior:t}))}).catch(t=>{n.headersSent||(e.updateSession(l,`idle`,`PermissionCancelled`),s(n,200,{behavior:`cancel`}))})}function u(e){s(e,200,{ok:!0,app:`erzhi-recording`,port:n})}function d(e,t){t.setHeader(`Access-Control-Allow-Origin`,`*`),e.method===`POST`&&e.url===`/state`?o(e).then(e=>c(e,t)).catch(()=>s(t,400,{error:`Invalid JSON`})):e.method===`POST`&&e.url===`/permission`?o(e).then(e=>l(e,t)).catch(()=>s(t,400,{error:`Invalid JSON`})):e.method===`GET`&&e.url===`/health`?u(t):s(t,404,{error:`Not found`})}function p(e){r&&=(i&&clearTimeout(i),i=null,r.resolve(e),null)}function g(){r&&=(i&&clearTimeout(i),i=null,r.reject(`cancelled`),null)}function _(e){a=e}function v(){return new Promise(e=>{t=h.createServer(d);let r=Je,i=()=>{if(r>Ye){H.error(`Agent server: all ports ${Je}-${Ye} occupied`),e(null);return}t.listen(r,`127.0.0.1`,()=>{n=r;try{let e=Qe();m.mkdirSync(e,{recursive:!0}),m.writeFileSync(f.join(e,`runtime.json`),JSON.stringify({port:r,pid:process.pid}),`utf8`)}catch{}H.info(`Agent server listening on 127.0.0.1:${r}`),e(r)}),t.on(`error`,t=>{t.code===`EADDRINUSE`?(r++,i()):(H.error(`Agent server error:`,t.message),e(null))})};i()})}function y(){g(),t&&=(t.close(),null),n=null}function b(){return n}function x(){return r}return{start:v,stop:y,getPort:b,getPendingPermission:x,resolvePendingPermission:p,cancelPendingPermission:g,setOnPermissionRequest:_}}U();var et=f.join(p.homedir(),`.claude`,`settings.json`),Q=`erzhi-recording-state`,tt=`erzhi-recording-auto-start`,nt=300*1e3,rt=3;function it(e){let t=null,n=0,r=!1;function i(){try{if(require(`electron`)?.app?.isPackaged)return f.join(process.resourcesPath,`clawd-hook.js`)}catch{}return f.join(__dirname,`clawd-hook.js`)}function a(){try{let e=m.readFileSync(et,`utf8`);return JSON.parse(e)}catch{return null}}function o(e){try{return m.writeFileSync(et,JSON.stringify(e,null,2),`utf8`),!0}catch(e){return H.error(`Failed to write Claude settings:`,e.message),!1}}function s(t){return{name:Q,script:`${t} ${e()||23338}`,events:[`SessionStart`,`SessionEnd`,`UserPromptSubmit`,`PreToolUse`,`PostToolUse`,`PostToolUseFailure`,`Stop`,`StopFailure`,`ApiError`,`Notification`,`PermissionRequest`]}}function c(){let e=a();if(!e)return{added:!1,updated:!1};let t=e.hooks||[],n=s(i()),r=t.findIndex(e=>e.name===Q);return r>=0?t[r].script===n.script?{added:!1,updated:!1}:(t[r]=n,e.hooks=t,o(e),{added:!1,updated:!0}):(t.push(n),e.hooks=t,o(e),{added:!0,updated:!1})}function l(){let e=a();if(!e)return{removed:!1};let t=e.hooks||[],n=t.filter(e=>e.name!==Q);return n.length===t.length?{removed:!1}:(e.hooks=n,o(e),d(!1),{removed:!0})}function u(){let e=a();return e?(e.hooks||[]).some(e=>e.name===Q):!1}function d(e){let t=a();if(!t)return!1;let n=t.hooks||[],r=n.findIndex(e=>e.name===tt);if(e&&r<0){let e=i();return n.push({name:tt,script:e,events:[`SessionStart`]}),t.hooks=n,o(t)}return!e&&r>=0?(n.splice(r,1),t.hooks=n,o(t)):!0}function p(){let e=[],t=a();if(!t)return e.push(`Claude settings file not found`),{healthy:!1,issues:e};if(!(t.hooks||[]).find(e=>e.name===Q))return e.push(`Hook entry missing`),{healthy:!1,issues:e};let n=i();return m.existsSync(n)?{healthy:e.length===0,issues:e}:(e.push(`Hook script file missing`),{healthy:!1,issues:e})}function h(){if(r)return!1;if(n>=rt)return r=!0,!1;let e=c();return(e.added||e.updated)&&p().healthy?(n=0,!0):(n++,!1)}function g(){let e=p();e.healthy?(n>0&&(n=0),r&&=!1):(H.warn(`Claude hook health check failed:`,e.issues.join(`, `)),h())}function _(){t||(g(),t=setInterval(g,nt),H.info(`Claude hook watcher started`))}function v(){t&&=(clearInterval(t),null)}function y(){let e=p();return{installed:u(),autoStart:(a()?.hooks||[]).some(e=>e.name===tt),scriptExists:m.existsSync(i()),claudeExists:a()!==null,healthy:e.healthy,repairFailures:n,manualFixRequired:r}}return{install:c,uninstall:l,isInstalled:u,setAutoStart:d,startWatcher:_,stopWatcher:v,getStatus:y,checkHealth:p,repair:h}}U();function at(e={}){let t=qe(),n=$e(t),r=it(()=>n.getPort()),i=null,a=null;t.subscribe((e,t)=>{i&&i(e,t)}),n.setOnPermissionRequest(e=>{a&&a(e)});async function o(){if(t.start(),await n.start()!==null){if(e.autoInstallHooks!==!1){let e=r.install();e.added&&H.info(`Claude Code hooks installed`),e.updated&&H.info(`Claude Code hooks updated`)}e.autoStartWatcher!==!1&&r.startWatcher()}}function s(){r.stopWatcher(),t.stop(),n.stop()}function c(){return n}function l(){return t}function u(){return r}function d(e){i=e}function f(e){a=e}function p(e){n.resolvePendingPermission(e)}function m(){r.install()}function h(){r.uninstall()}function g(e){r.setAutoStart(e)}function _(){return{serverRunning:n.getPort()!==null,port:n.getPort(),hookInstalled:r.isInstalled(),hookManagerStatus:r.getStatus(),displayState:t.getCurrentState(),pendingPermission:n.getPendingPermission(),sessionCount:t.getSessions().length}}return{start:o,stop:s,getServer:c,getStateMachine:l,getHookManager:u,getStatus:_,setStateListener:d,setPermissionListener:f,resolvePermission:p,installHooks:m,uninstallHooks:h,setAutoStart:g}}U();var $=null,ot=null,st=process.env.VITE_DEV_SERVER_URL;function ct(){let e=d.app.isPackaged?(0,u.join)(process.resourcesPath,`logo.ico`):(0,u.join)(__dirname,`../../public/logo.ico`);return d.nativeImage.createFromPath(e)}function lt(e){$=new d.BrowserWindow({icon:ct(),width:550,height:420,minWidth:420,minHeight:340,show:!1,frame:!1,titleBarStyle:`hidden`,title:`二支录制`,backgroundColor:`#eaeaec`,webPreferences:{preload:e,contextIsolation:!0,nodeIntegration:!1,sandbox:!1,backgroundThrottling:!1}}),st?$.loadURL(st):$.loadFile((0,u.join)(process.env.DIST,`index.html`)),$.on(`close`,e=>{d.app.isQuitting||(e.preventDefault(),$?.hide())})}d.app.on(`gpu-process-crashed`,(e,t)=>{H.error(`GPU process crashed:`,JSON.stringify(t))}),d.app.whenReady().then(()=>{process.env.DIST=(0,u.join)(__dirname,`../../dist`),process.env.VITE_PUBLIC=d.app.isPackaged?process.env.DIST:(0,u.join)(__dirname,`../../public`),ie(),H.info(`App starting...`);let e=(0,u.join)(__dirname,`..`,`preload`,`index.cjs`);ot=at({autoInstallHooks:!1,autoStartWatcher:!1}),ot.start(),Oe(ot),lt(e),(0,pe.setMainWindow)($),(0,X.createTray)(),Ae($),ve(),Be(),setInterval(Ve,3e4),d.app.on(`activate`,()=>{d.BrowserWindow.getAllWindows().length===0&&lt(e)})}),d.app.on(`window-all-closed`,()=>{}),d.app.on(`before-quit`,()=>{d.app.isQuitting=!0,je(),(0,X.destroyTray)(),$=null});