(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const s of document.querySelectorAll('link[rel="modulepreload"]'))i(s);new MutationObserver(s=>{for(const o of s)if(o.type==="childList")for(const n of o.addedNodes)n.tagName==="LINK"&&n.rel==="modulepreload"&&i(n)}).observe(document,{childList:!0,subtree:!0});function t(s){const o={};return s.integrity&&(o.integrity=s.integrity),s.referrerPolicy&&(o.referrerPolicy=s.referrerPolicy),s.crossOrigin==="use-credentials"?o.credentials="include":s.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function i(s){if(s.ep)return;s.ep=!0;const o=t(s);fetch(s.href,o)}})();/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const N=globalThis,G=N.ShadowRoot&&(N.ShadyCSS===void 0||N.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,V=Symbol(),J=new WeakMap;let pe=class{constructor(e,t,i){if(this._$cssResult$=!0,i!==V)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=e,this.t=t}get styleSheet(){let e=this.o;const t=this.t;if(G&&e===void 0){const i=t!==void 0&&t.length===1;i&&(e=J.get(t)),e===void 0&&((this.o=e=new CSSStyleSheet).replaceSync(this.cssText),i&&J.set(t,e))}return e}toString(){return this.cssText}};const ge=r=>new pe(typeof r=="string"?r:r+"",void 0,V),fe=(r,...e)=>{const t=r.length===1?r[0]:e.reduce((i,s,o)=>i+(n=>{if(n._$cssResult$===!0)return n.cssText;if(typeof n=="number")return n;throw Error("Value passed to 'css' function must be a 'css' function result: "+n+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(s)+r[o+1],r[0]);return new pe(t,r,V)},me=(r,e)=>{if(G)r.adoptedStyleSheets=e.map(t=>t instanceof CSSStyleSheet?t:t.styleSheet);else for(const t of e){const i=document.createElement("style"),s=N.litNonce;s!==void 0&&i.setAttribute("nonce",s),i.textContent=t.cssText,r.appendChild(i)}},Z=G?r=>r:r=>r instanceof CSSStyleSheet?(e=>{let t="";for(const i of e.cssRules)t+=i.cssText;return ge(t)})(r):r;/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const{is:be,defineProperty:xe,getOwnPropertyDescriptor:ye,getOwnPropertyNames:ve,getOwnPropertySymbols:_e,getPrototypeOf:$e}=Object,x=globalThis,Q=x.trustedTypes,we=Q?Q.emptyScript:"",W=x.reactiveElementPolyfillSupport,P=(r,e)=>r,H={toAttribute(r,e){switch(e){case Boolean:r=r?we:null;break;case Object:case Array:r=r==null?r:JSON.stringify(r)}return r},fromAttribute(r,e){let t=r;switch(e){case Boolean:t=r!==null;break;case Number:t=r===null?null:Number(r);break;case Object:case Array:try{t=JSON.parse(r)}catch{t=null}}return t}},Y=(r,e)=>!be(r,e),X={attribute:!0,type:String,converter:H,reflect:!1,useDefault:!1,hasChanged:Y};Symbol.metadata??(Symbol.metadata=Symbol("metadata")),x.litPropertyMetadata??(x.litPropertyMetadata=new WeakMap);let A=class extends HTMLElement{static addInitializer(e){this._$Ei(),(this.l??(this.l=[])).push(e)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(e,t=X){if(t.state&&(t.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(e)&&((t=Object.create(t)).wrapped=!0),this.elementProperties.set(e,t),!t.noAccessor){const i=Symbol(),s=this.getPropertyDescriptor(e,i,t);s!==void 0&&xe(this.prototype,e,s)}}static getPropertyDescriptor(e,t,i){const{get:s,set:o}=ye(this.prototype,e)??{get(){return this[t]},set(n){this[t]=n}};return{get:s,set(n){const l=s==null?void 0:s.call(this);o==null||o.call(this,n),this.requestUpdate(e,l,i)},configurable:!0,enumerable:!0}}static getPropertyOptions(e){return this.elementProperties.get(e)??X}static _$Ei(){if(this.hasOwnProperty(P("elementProperties")))return;const e=$e(this);e.finalize(),e.l!==void 0&&(this.l=[...e.l]),this.elementProperties=new Map(e.elementProperties)}static finalize(){if(this.hasOwnProperty(P("finalized")))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(P("properties"))){const t=this.properties,i=[...ve(t),..._e(t)];for(const s of i)this.createProperty(s,t[s])}const e=this[Symbol.metadata];if(e!==null){const t=litPropertyMetadata.get(e);if(t!==void 0)for(const[i,s]of t)this.elementProperties.set(i,s)}this._$Eh=new Map;for(const[t,i]of this.elementProperties){const s=this._$Eu(t,i);s!==void 0&&this._$Eh.set(s,t)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(e){const t=[];if(Array.isArray(e)){const i=new Set(e.flat(1/0).reverse());for(const s of i)t.unshift(Z(s))}else e!==void 0&&t.push(Z(e));return t}static _$Eu(e,t){const i=t.attribute;return i===!1?void 0:typeof i=="string"?i:typeof e=="string"?e.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){var e;this._$ES=new Promise(t=>this.enableUpdating=t),this._$AL=new Map,this._$E_(),this.requestUpdate(),(e=this.constructor.l)==null||e.forEach(t=>t(this))}addController(e){var t;(this._$EO??(this._$EO=new Set)).add(e),this.renderRoot!==void 0&&this.isConnected&&((t=e.hostConnected)==null||t.call(e))}removeController(e){var t;(t=this._$EO)==null||t.delete(e)}_$E_(){const e=new Map,t=this.constructor.elementProperties;for(const i of t.keys())this.hasOwnProperty(i)&&(e.set(i,this[i]),delete this[i]);e.size>0&&(this._$Ep=e)}createRenderRoot(){const e=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return me(e,this.constructor.elementStyles),e}connectedCallback(){var e;this.renderRoot??(this.renderRoot=this.createRenderRoot()),this.enableUpdating(!0),(e=this._$EO)==null||e.forEach(t=>{var i;return(i=t.hostConnected)==null?void 0:i.call(t)})}enableUpdating(e){}disconnectedCallback(){var e;(e=this._$EO)==null||e.forEach(t=>{var i;return(i=t.hostDisconnected)==null?void 0:i.call(t)})}attributeChangedCallback(e,t,i){this._$AK(e,i)}_$ET(e,t){var o;const i=this.constructor.elementProperties.get(e),s=this.constructor._$Eu(e,i);if(s!==void 0&&i.reflect===!0){const n=(((o=i.converter)==null?void 0:o.toAttribute)!==void 0?i.converter:H).toAttribute(t,i.type);this._$Em=e,n==null?this.removeAttribute(s):this.setAttribute(s,n),this._$Em=null}}_$AK(e,t){var o,n;const i=this.constructor,s=i._$Eh.get(e);if(s!==void 0&&this._$Em!==s){const l=i.getPropertyOptions(s),a=typeof l.converter=="function"?{fromAttribute:l.converter}:((o=l.converter)==null?void 0:o.fromAttribute)!==void 0?l.converter:H;this._$Em=s;const d=a.fromAttribute(t,l.type);this[s]=d??((n=this._$Ej)==null?void 0:n.get(s))??d,this._$Em=null}}requestUpdate(e,t,i,s=!1,o){var n;if(e!==void 0){const l=this.constructor;if(s===!1&&(o=this[e]),i??(i=l.getPropertyOptions(e)),!((i.hasChanged??Y)(o,t)||i.useDefault&&i.reflect&&o===((n=this._$Ej)==null?void 0:n.get(e))&&!this.hasAttribute(l._$Eu(e,i))))return;this.C(e,t,i)}this.isUpdatePending===!1&&(this._$ES=this._$EP())}C(e,t,{useDefault:i,reflect:s,wrapped:o},n){i&&!(this._$Ej??(this._$Ej=new Map)).has(e)&&(this._$Ej.set(e,n??t??this[e]),o!==!0||n!==void 0)||(this._$AL.has(e)||(this.hasUpdated||i||(t=void 0),this._$AL.set(e,t)),s===!0&&this._$Em!==e&&(this._$Eq??(this._$Eq=new Set)).add(e))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(t){Promise.reject(t)}const e=this.scheduleUpdate();return e!=null&&await e,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){var i;if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??(this.renderRoot=this.createRenderRoot()),this._$Ep){for(const[o,n]of this._$Ep)this[o]=n;this._$Ep=void 0}const s=this.constructor.elementProperties;if(s.size>0)for(const[o,n]of s){const{wrapped:l}=n,a=this[o];l!==!0||this._$AL.has(o)||a===void 0||this.C(o,void 0,n,a)}}let e=!1;const t=this._$AL;try{e=this.shouldUpdate(t),e?(this.willUpdate(t),(i=this._$EO)==null||i.forEach(s=>{var o;return(o=s.hostUpdate)==null?void 0:o.call(s)}),this.update(t)):this._$EM()}catch(s){throw e=!1,this._$EM(),s}e&&this._$AE(t)}willUpdate(e){}_$AE(e){var t;(t=this._$EO)==null||t.forEach(i=>{var s;return(s=i.hostUpdated)==null?void 0:s.call(i)}),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(e)),this.updated(e)}_$EM(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(e){return!0}update(e){this._$Eq&&(this._$Eq=this._$Eq.forEach(t=>this._$ET(t,this[t]))),this._$EM()}updated(e){}firstUpdated(e){}};A.elementStyles=[],A.shadowRootOptions={mode:"open"},A[P("elementProperties")]=new Map,A[P("finalized")]=new Map,W==null||W({ReactiveElement:A}),(x.reactiveElementVersions??(x.reactiveElementVersions=[])).push("2.1.2");/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const M=globalThis,ee=r=>r,L=M.trustedTypes,te=L?L.createPolicy("lit-html",{createHTML:r=>r}):void 0,de="$lit$",b=`lit$${Math.random().toFixed(9).slice(2)}$`,ce="?"+b,Ae=`<${ce}>`,$=document,O=()=>$.createComment(""),R=r=>r===null||typeof r!="object"&&typeof r!="function",K=Array.isArray,Se=r=>K(r)||typeof(r==null?void 0:r[Symbol.iterator])=="function",D=`[
\f\r]`,C=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,se=/-->/g,ie=/>/g,y=RegExp(`>|${D}(?:([^\\s"'>=/]+)(${D}*=${D}*(?:[^
\f\r"'\`<>=]|("|')|))|$)`,"g"),re=/'/g,oe=/"/g,he=/^(?:script|style|textarea|title)$/i,Ee=r=>(e,...t)=>({_$litType$:r,strings:e,values:t}),u=Ee(1),S=Symbol.for("lit-noChange"),c=Symbol.for("lit-nothing"),ne=new WeakMap,v=$.createTreeWalker($,129);function ue(r,e){if(!K(r)||!r.hasOwnProperty("raw"))throw Error("invalid template strings array");return te!==void 0?te.createHTML(e):e}const ke=(r,e)=>{const t=r.length-1,i=[];let s,o=e===2?"<svg>":e===3?"<math>":"",n=C;for(let l=0;l<t;l++){const a=r[l];let d,h,p=-1,g=0;for(;g<a.length&&(n.lastIndex=g,h=n.exec(a),h!==null);)g=n.lastIndex,n===C?h[1]==="!--"?n=se:h[1]!==void 0?n=ie:h[2]!==void 0?(he.test(h[2])&&(s=RegExp("</"+h[2],"g")),n=y):h[3]!==void 0&&(n=y):n===y?h[0]===">"?(n=s??C,p=-1):h[1]===void 0?p=-2:(p=n.lastIndex-h[2].length,d=h[1],n=h[3]===void 0?y:h[3]==='"'?oe:re):n===oe||n===re?n=y:n===se||n===ie?n=C:(n=y,s=void 0);const m=n===y&&r[l+1].startsWith("/>")?" ":"";o+=n===C?a+Ae:p>=0?(i.push(d),a.slice(0,p)+de+a.slice(p)+b+m):a+b+(p===-2?l:m)}return[ue(r,o+(r[t]||"<?>")+(e===2?"</svg>":e===3?"</math>":"")),i]};class U{constructor({strings:e,_$litType$:t},i){let s;this.parts=[];let o=0,n=0;const l=e.length-1,a=this.parts,[d,h]=ke(e,t);if(this.el=U.createElement(d,i),v.currentNode=this.el.content,t===2||t===3){const p=this.el.content.firstChild;p.replaceWith(...p.childNodes)}for(;(s=v.nextNode())!==null&&a.length<l;){if(s.nodeType===1){if(s.hasAttributes())for(const p of s.getAttributeNames())if(p.endsWith(de)){const g=h[n++],m=s.getAttribute(p).split(b),I=/([.?@])?(.*)/.exec(g);a.push({type:1,index:o,name:I[2],strings:m,ctor:I[1]==="."?Te:I[1]==="?"?Pe:I[1]==="@"?Me:B}),s.removeAttribute(p)}else p.startsWith(b)&&(a.push({type:6,index:o}),s.removeAttribute(p));if(he.test(s.tagName)){const p=s.textContent.split(b),g=p.length-1;if(g>0){s.textContent=L?L.emptyScript:"";for(let m=0;m<g;m++)s.append(p[m],O()),v.nextNode(),a.push({type:2,index:++o});s.append(p[g],O())}}}else if(s.nodeType===8)if(s.data===ce)a.push({type:2,index:o});else{let p=-1;for(;(p=s.data.indexOf(b,p+1))!==-1;)a.push({type:7,index:o}),p+=b.length-1}o++}}static createElement(e,t){const i=$.createElement("template");return i.innerHTML=e,i}}function E(r,e,t=r,i){var n,l;if(e===S)return e;let s=i!==void 0?(n=t._$Co)==null?void 0:n[i]:t._$Cl;const o=R(e)?void 0:e._$litDirective$;return(s==null?void 0:s.constructor)!==o&&((l=s==null?void 0:s._$AO)==null||l.call(s,!1),o===void 0?s=void 0:(s=new o(r),s._$AT(r,t,i)),i!==void 0?(t._$Co??(t._$Co=[]))[i]=s:t._$Cl=s),s!==void 0&&(e=E(r,s._$AS(r,e.values),s,i)),e}class Ce{constructor(e,t){this._$AV=[],this._$AN=void 0,this._$AD=e,this._$AM=t}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(e){const{el:{content:t},parts:i}=this._$AD,s=((e==null?void 0:e.creationScope)??$).importNode(t,!0);v.currentNode=s;let o=v.nextNode(),n=0,l=0,a=i[0];for(;a!==void 0;){if(n===a.index){let d;a.type===2?d=new j(o,o.nextSibling,this,e):a.type===1?d=new a.ctor(o,a.name,a.strings,this,e):a.type===6&&(d=new ze(o,this,e)),this._$AV.push(d),a=i[++l]}n!==(a==null?void 0:a.index)&&(o=v.nextNode(),n++)}return v.currentNode=$,s}p(e){let t=0;for(const i of this._$AV)i!==void 0&&(i.strings!==void 0?(i._$AI(e,i,t),t+=i.strings.length-2):i._$AI(e[t])),t++}}class j{get _$AU(){var e;return((e=this._$AM)==null?void 0:e._$AU)??this._$Cv}constructor(e,t,i,s){this.type=2,this._$AH=c,this._$AN=void 0,this._$AA=e,this._$AB=t,this._$AM=i,this.options=s,this._$Cv=(s==null?void 0:s.isConnected)??!0}get parentNode(){let e=this._$AA.parentNode;const t=this._$AM;return t!==void 0&&(e==null?void 0:e.nodeType)===11&&(e=t.parentNode),e}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(e,t=this){e=E(this,e,t),R(e)?e===c||e==null||e===""?(this._$AH!==c&&this._$AR(),this._$AH=c):e!==this._$AH&&e!==S&&this._(e):e._$litType$!==void 0?this.$(e):e.nodeType!==void 0?this.T(e):Se(e)?this.k(e):this._(e)}O(e){return this._$AA.parentNode.insertBefore(e,this._$AB)}T(e){this._$AH!==e&&(this._$AR(),this._$AH=this.O(e))}_(e){this._$AH!==c&&R(this._$AH)?this._$AA.nextSibling.data=e:this.T($.createTextNode(e)),this._$AH=e}$(e){var o;const{values:t,_$litType$:i}=e,s=typeof i=="number"?this._$AC(e):(i.el===void 0&&(i.el=U.createElement(ue(i.h,i.h[0]),this.options)),i);if(((o=this._$AH)==null?void 0:o._$AD)===s)this._$AH.p(t);else{const n=new Ce(s,this),l=n.u(this.options);n.p(t),this.T(l),this._$AH=n}}_$AC(e){let t=ne.get(e.strings);return t===void 0&&ne.set(e.strings,t=new U(e)),t}k(e){K(this._$AH)||(this._$AH=[],this._$AR());const t=this._$AH;let i,s=0;for(const o of e)s===t.length?t.push(i=new j(this.O(O()),this.O(O()),this,this.options)):i=t[s],i._$AI(o),s++;s<t.length&&(this._$AR(i&&i._$AB.nextSibling,s),t.length=s)}_$AR(e=this._$AA.nextSibling,t){var i;for((i=this._$AP)==null?void 0:i.call(this,!1,!0,t);e!==this._$AB;){const s=ee(e).nextSibling;ee(e).remove(),e=s}}setConnected(e){var t;this._$AM===void 0&&(this._$Cv=e,(t=this._$AP)==null||t.call(this,e))}}class B{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(e,t,i,s,o){this.type=1,this._$AH=c,this._$AN=void 0,this.element=e,this.name=t,this._$AM=s,this.options=o,i.length>2||i[0]!==""||i[1]!==""?(this._$AH=Array(i.length-1).fill(new String),this.strings=i):this._$AH=c}_$AI(e,t=this,i,s){const o=this.strings;let n=!1;if(o===void 0)e=E(this,e,t,0),n=!R(e)||e!==this._$AH&&e!==S,n&&(this._$AH=e);else{const l=e;let a,d;for(e=o[0],a=0;a<o.length-1;a++)d=E(this,l[i+a],t,a),d===S&&(d=this._$AH[a]),n||(n=!R(d)||d!==this._$AH[a]),d===c?e=c:e!==c&&(e+=(d??"")+o[a+1]),this._$AH[a]=d}n&&!s&&this.j(e)}j(e){e===c?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,e??"")}}class Te extends B{constructor(){super(...arguments),this.type=3}j(e){this.element[this.name]=e===c?void 0:e}}class Pe extends B{constructor(){super(...arguments),this.type=4}j(e){this.element.toggleAttribute(this.name,!!e&&e!==c)}}class Me extends B{constructor(e,t,i,s,o){super(e,t,i,s,o),this.type=5}_$AI(e,t=this){if((e=E(this,e,t,0)??c)===S)return;const i=this._$AH,s=e===c&&i!==c||e.capture!==i.capture||e.once!==i.once||e.passive!==i.passive,o=e!==c&&(i===c||s);s&&this.element.removeEventListener(this.name,this,i),o&&this.element.addEventListener(this.name,this,e),this._$AH=e}handleEvent(e){var t;typeof this._$AH=="function"?this._$AH.call(((t=this.options)==null?void 0:t.host)??this.element,e):this._$AH.handleEvent(e)}}class ze{constructor(e,t,i){this.element=e,this.type=6,this._$AN=void 0,this._$AM=t,this.options=i}get _$AU(){return this._$AM._$AU}_$AI(e){E(this,e)}}const q=M.litHtmlPolyfillSupport;q==null||q(U,j),(M.litHtmlVersions??(M.litHtmlVersions=[])).push("3.3.3");const Oe=(r,e,t)=>{const i=(t==null?void 0:t.renderBefore)??e;let s=i._$litPart$;if(s===void 0){const o=(t==null?void 0:t.renderBefore)??null;i._$litPart$=s=new j(e.insertBefore(O(),o),o,void 0,t??{})}return s._$AI(r),s};/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const _=globalThis;class z extends A{constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){var t;const e=super.createRenderRoot();return(t=this.renderOptions).renderBefore??(t.renderBefore=e.firstChild),e}update(e){const t=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(e),this._$Do=Oe(t,this.renderRoot,this.renderOptions)}connectedCallback(){var e;super.connectedCallback(),(e=this._$Do)==null||e.setConnected(!0)}disconnectedCallback(){var e;super.disconnectedCallback(),(e=this._$Do)==null||e.setConnected(!1)}render(){return S}}var le;z._$litElement$=!0,z.finalized=!0,(le=_.litElementHydrateSupport)==null||le.call(_,{LitElement:z});const F=_.litElementPolyfillSupport;F==null||F({LitElement:z});(_.litElementVersions??(_.litElementVersions=[])).push("4.2.2");/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const Re=r=>(e,t)=>{t!==void 0?t.addInitializer(()=>{customElements.define(r,e)}):customElements.define(r,e)};/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const Ue={attribute:!0,type:String,converter:H,reflect:!1,hasChanged:Y},je=(r=Ue,e,t)=>{const{kind:i,metadata:s}=t;let o=globalThis.litPropertyMetadata.get(s);if(o===void 0&&globalThis.litPropertyMetadata.set(s,o=new Map),i==="setter"&&((r=Object.create(r)).wrapped=!0),o.set(t.name,r),i==="accessor"){const{name:n}=t;return{set(l){const a=e.get.call(this);e.set.call(this,l),this.requestUpdate(n,a,r,!0,l)},init(l){return l!==void 0&&this.C(n,void 0,r,l),l}}}if(i==="setter"){const{name:n}=t;return function(l){const a=this[n];e.call(this,l),this.requestUpdate(n,a,r,!0,l)}}throw Error("Unsupported decorator location: "+i)};function Ie(r){return(e,t)=>typeof t=="object"?je(r,e,t):((i,s,o)=>{const n=s.hasOwnProperty(o);return s.constructor.createProperty(o,i),n?Object.getOwnPropertyDescriptor(s,o):void 0})(r,e,t)}/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function k(r){return Ie({...r,state:!0,attribute:!1})}var Ne=Object.defineProperty,He=Object.getOwnPropertyDescriptor,w=(r,e,t,i)=>{for(var s=i>1?void 0:i?He(e,t):e,o=r.length-1,n;o>=0;o--)(n=r[o])&&(s=(i?n(e,t,s):n(s))||s);return i&&s&&Ne(e,t,s),s};const T=[{id:"technology",label:"Technology",short:"01",field:"technology",description:"AI, software, devices, and the signals shaping what is next.",color:"#8ee5c2",titles:["How AI Search Is Changing SEO Strategies in 2026","The Practical Guide to Building Trustworthy AI Workflows","What Small Teams Need to Know About the Next Wave of Search","A Clear Guide to Choosing an AI Model for Content Operations","Why Structured Data Still Matters in an Answer-First Web"]},{id:"business",label:"Business",short:"02",field:"business and marketing",description:"Strategy, growth, operations, and ideas people can act on.",color:"#f2b36f",titles:["The Lean Content System That Helps Small Teams Grow Organically","How Marketing Teams Can Turn Customer Questions Into Search Traffic","A Modern Framework for Measuring Content That Actually Converts","What Brand Leaders Should Know About Search Visibility in 2026","How to Build a Repeatable Editorial Workflow Without More Meetings"]},{id:"wellness",label:"Wellness",short:"03",field:"health and wellness",description:"Evidence-led habits, sustainable routines, and better living.",color:"#d8b4f8",titles:["The Evidence-Led Morning Routine That Is Easier to Maintain","How to Build a Sustainable Wellness Plan Around Real Life","What Sleep Tracking Can and Cannot Tell You About Recovery","A Beginner Guide to Making Health Research Easier to Understand","The Difference Between a Wellness Trend and a Useful Habit"]},{id:"travel",label:"Travel",short:"04",field:"travel and destinations",description:"Useful planning guides, intelligent itineraries, and local detail.",color:"#91c9f5",titles:["How to Plan a More Flexible City Break Without Overspending","The Best Way to Build a Useful Two-Day Travel Itinerary","What Travelers Should Check Before Booking a Remote Work Trip","A Practical Guide to Finding Less Crowded Destinations This Season","How Local Search Is Changing the Way People Plan Their Trips"]},{id:"finance",label:"Money",short:"05",field:"personal finance",description:"Clear explainers for decisions that deserve context and care.",color:"#f3d27b",titles:["A Simple Framework for Comparing Monthly Subscriptions","How to Read a Personal Finance Product Comparison Before Choosing","The Practical Difference Between Saving More and Spending Better","What New Investors Should Understand About Fees and Risk","How to Build a Financial Content Plan People Can Trust"]},{id:"culture",label:"Culture",short:"06",field:"culture and lifestyle",description:"The products, habits, and communities influencing everyday life.",color:"#f09bb4",titles:["Why Intentional Digital Spaces Are Becoming a Lifestyle Priority","The New Rules of Building Community Around a Shared Interest","How Independent Creators Are Rethinking the Meaning of Sustainable Work","What Makes a Lifestyle Guide Useful Instead of Merely Trendy","How to Turn a Cultural Shift Into a Thoughtful Editorial Series"]}],Le={state:"idle",field:"",titles:[],message:"Choose a category or enter a field to begin.",results:[]},Be=/\*\*\[([^\]]+)\]\(([^)]+)\)\*\*/;let f=class extends z{constructor(){super(...arguments),this._categoryId=T[0].id,this._field=T[0].field,this._titles="",this._job={...Le},this._loading=!0,this._requestError="",this._curationPending=!1}connectedCallback(){super.connectedCallback(),this._refresh(),this._poll=window.setInterval(()=>void this._refresh(),3e3)}disconnectedCallback(){super.disconnectedCallback(),this._poll!==void 0&&(window.clearInterval(this._poll),this._poll=void 0)}get _category(){return T.find(r=>r.id===this._categoryId)??T[0]}get _busy(){return this._job.state==="curating"||this._job.state==="running"}get _titleList(){return this._titles.split(/\r?\n/).map(r=>r.trim()).filter(Boolean)}async _refresh(){try{const r=await fetch("/api/state",{cache:"no-store"});if(!r.ok)throw new Error("The content service is unavailable.");const e=await r.json(),t=Array.isArray(e.titles)?e.titles:this._job.titles;this._job={...this._job,...e,titles:t,results:Array.isArray(e.results)?e.results:this._job.results},this._curationPending&&this._job.state==="ready"&&t.length>0?(this._titles=t.join(`
`),this._curationPending=!1):this._job.state==="error"&&(this._curationPending=!1),this._loading=!1}catch(r){this._loading=!1,(!this._job.message||this._job.state==="idle")&&(this._requestError=r instanceof Error?r.message:"Unable to reach the service.")}}_selectCategory(r){this._categoryId=r.id,this._field=r.field,this._requestError=""}_useIdea(r){const e=this._titleList,t=e.length>0?e:this._job.state==="ready"?this._job.titles:[];t.includes(r)||(this._titles=[...t,r].join(`
`))}_useAllIdeas(){this._titles=this._category.titles.join(`
`)}async _sendAction(r){this._requestError="";const e=this._field.trim(),t=this._titleList,i=t.length>0?t:this._job.state==="ready"?this._job.titles:[];if(!e){this._requestError="Add a field of interest before continuing.";return}if(r==="run_batch"&&i.length===0){this._requestError="Add at least one article title or use a sample idea.";return}r==="curate_titles"&&(this._curationPending=!0);const s=r==="curate_titles"?{field:e}:{field:e,titlesRaw:i.slice(0,10).join(`
`)};try{const o=await fetch("/api/action",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({userAction:{name:r,context:s}})}),n=await o.json().catch(()=>({}));if(!o.ok||n.ok===!1)throw new Error(n.error||"The request could not be started.");await this._refresh()}catch(o){r==="curate_titles"&&(this._curationPending=!1),this._requestError=o instanceof Error?o.message:"The request could not be started."}}_statusClass(){return this._job.state==="error"?"status-error":this._job.state==="complete"?"status-success":this._busy?"status-busy":"status-idle"}_renderResultStatus(r){const e=Be.exec(r||"");return e?u`
        <a class="download-link" href=${e[2]} target="_blank" rel="noopener">
          <span>${e[1]}</span>
          <span class="download-arrow">Download</span>
        </a>
      `:u`<span class="result-error">${(r||"No result").replace(/^x\s*/,"")}</span>`}_renderCategories(){return u`
      <div class="category-grid" role="list" aria-label="Content categories">
        ${T.map(r=>u`
            <button
              class=${"category-card "+(r.id===this._categoryId?"selected":"")}
              style=${"--category-accent: "+r.color}
              aria-pressed=${r.id===this._categoryId}
              @click=${()=>this._selectCategory(r)}
            >
              <span class="category-index">${r.short}</span>
              <span class="category-label">${r.label}</span>
              <span class="category-description">${r.description}</span>
              <span class="category-caret">↗</span>
            </button>
          `)}
      </div>
    `}_renderIdeas(){return u`
      <div class="ideas-heading">
        <div>
          <span class="mini-label">STARTING POINTS</span>
          <h3>Title ideas for ${this._category.label}</h3>
        </div>
        <button class="text-button" @click=${this._useAllIdeas}>Use all</button>
      </div>
      <p class="ideas-intro">Tap an idea to add it to your queue. You can edit every title before running the batch.</p>
      <div class="ideas-list">
        ${this._category.titles.map((r,e)=>u`
            <button class="idea-row" @click=${()=>this._useIdea(r)}>
              <span class="idea-number">0${e+1}</span>
              <span class="idea-title">${r}</span>
              <span class="idea-plus">+</span>
            </button>
          `)}
      </div>
    `}_renderResults(){return this._job.results.length===0?u`
        <div class="empty-results">
          <div class="empty-orbit"><span></span><span></span><span></span></div>
          <div>
            <strong>Your documents will land here.</strong>
            <p>Curate a set of titles, run the batch, and download each finished content kit from this queue.</p>
          </div>
        </div>
      `:u`
      <div class="result-list">
        ${this._job.results.map((r,e)=>u`
            <article class="result-row">
              <span class="result-number">${String(e+1).padStart(2,"0")}</span>
              <div class="result-main">
                <strong>${r.title}</strong>
                <div class="result-status">${this._renderResultStatus(r.status)}</div>
              </div>
            </article>
          `)}
      </div>
    `}render(){const r=this._titleList.length,e=this._loading?"Connecting":this._busy?"Working":this._job.state==="complete"?"Complete":"Ready";return u`
      <div class="page">
        <div class="glow glow-one"></div>
        <div class="glow glow-two"></div>

        <header class="topbar">
          <a class="brand" href="/" aria-label="SEO Studio home">
            <span class="brand-mark"><span></span><span></span><span></span></span>
            <span class="brand-copy">
              <strong>SEO Studio</strong>
              <small>content operations</small>
            </span>
          </a>
          <div class="topbar-right">
            <span class="engine-pill"><span class="engine-dot"></span>AI Router engine</span>
            <a class="github-link" href="https://github.com/singhidivya18-lgtm/seo_v2" target="_blank" rel="noopener">View source <span>↗</span></a>
          </div>
        </header>

        <main class="content">
          <section class="hero">
            <div class="eyebrow"><span></span> research, write, publish</div>
            <h1>From a blank page to a <em>search-ready</em> story.</h1>
            <p class="hero-copy">A focused workspace for turning a field of interest into researched titles, polished articles, social copy, imagery, and downloadable reports.</p>
            <div class="hero-notes">
              <span><b>01</b> choose a lane</span>
              <span><b>02</b> shape the brief</span>
              <span><b>03</b> export the kit</span>
            </div>
          </section>

          <section class="workflow-section">
            <div class="section-heading">
              <span class="section-number">01</span>
              <div>
                <span class="mini-label">EDITORIAL LANE</span>
                <h2>What are you writing about?</h2>
              </div>
              <p>Start with a category to load useful angles, or use it as a creative filter for your own brief.</p>
            </div>
            ${this._renderCategories()}
          </section>

          <section class="studio-grid">
            <div class="panel composer-panel">
              <div class="panel-topline">
                <div>
                  <span class="mini-label">YOUR BRIEF</span>
                  <h2>Shape the next batch</h2>
                </div>
                <span class="step-badge">02 / 03</span>
              </div>

              <label class="field-label" for="field-input">Field of interest <span>required</span></label>
              <div class="input-shell">
                <span class="input-prefix">/</span>
                <input
                  id="field-input"
                  .value=${this._field}
                  placeholder="e.g. sustainable fashion"
                  @input=${t=>{this._field=t.target.value}}
                />
              </div>

              <div class="title-label-row">
                <label class="field-label" for="titles-input">Article titles <span>one per line</span></label>
                <span class=${"title-count "+(r>10?"over-limit":"")}>${r} / 10</span>
              </div>
              <textarea
                id="titles-input"
                rows="7"
                .value=${this._titles}
                placeholder="Paste your own titles, or add ideas from the panel..."
                @input=${t=>{this._titles=t.target.value}}
              ></textarea>

              <div class="composer-bottom">
                <div class="composer-hint"><span class="hint-icon">i</span> Up to 10 titles per batch</div>
                <div class="action-row">
                  <button class="button button-secondary" ?disabled=${this._busy} @click=${()=>void this._sendAction("curate_titles")}>
                    <span class="button-icon">+</span> Find title ideas
                  </button>
                  <button class="button button-primary" ?disabled=${this._busy} @click=${()=>void this._sendAction("run_batch")}>
                    ${this._busy?u`<span class="spinner"></span>`:u`<span class="button-icon">→</span>`}
                    ${this._busy?"Working...":"Generate content kit"}
                  </button>
                </div>
              </div>

              ${this._requestError?u`<div class="inline-error" role="alert">${this._requestError}</div>`:c}
            </div>

            <aside class="panel ideas-panel">
              ${this._renderIdeas()}
            </aside>
          </section>

          <section class="results-section">
            <div class="results-header">
              <div class="results-title">
                <span class="section-number">03</span>
                <div>
                  <span class="mini-label">OUTPUT QUEUE</span>
                  <h2>Content kits</h2>
                </div>
              </div>
              <div class="results-meta">
                <span class=${"live-status "+this._statusClass()}><span></span>${e}</span>
                <span class="result-count">${this._job.results.length} documents</span>
              </div>
            </div>
            <div class="status-strip" aria-live="polite" aria-busy=${this._busy}>
              <span class=${"status-pulse "+this._statusClass()}></span>
              <span>${this._job.message}</span>
              ${this._job.field?u`<span class="status-field">${this._job.field}</span>`:c}
            </div>
            ${this._renderResults()}
          </section>
        </main>

        <footer class="footer">
          <span>SEO Studio <i>·</i> built for deliberate publishing</span>
          <span>AI Router Switzerland <i>·</i> human review recommended</span>
        </footer>
      </div>
    `}};f.styles=fe`
    :host {
      --ink: #f5f2eb;
      --muted: #9aa1b2;
      --faint: #697184;
      --line: rgba(229, 235, 244, 0.12);
      --panel: rgba(25, 31, 46, 0.82);
      --panel-light: rgba(31, 38, 55, 0.72);
      --accent: #8ee5c2;
      display: block;
      min-height: 100vh;
      color: var(--ink);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      -webkit-font-smoothing: antialiased;
    }

    *, *::before, *::after {
      box-sizing: border-box;
    }

    button, input, textarea {
      font: inherit;
    }

    button, a {
      -webkit-tap-highlight-color: transparent;
    }

    .page {
      position: relative;
      min-height: 100vh;
      overflow: hidden;
      background:
        linear-gradient(145deg, rgba(20, 26, 40, 0.96), rgba(13, 17, 28, 0.98)),
        #0d111c;
    }

    .page::before {
      position: absolute;
      inset: 0;
      pointer-events: none;
      content: "";
      opacity: 0.22;
      background-image: linear-gradient(rgba(255, 255, 255, 0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.035) 1px, transparent 1px);
      background-size: 72px 72px;
      mask-image: linear-gradient(to bottom, black, transparent 70%);
    }

    .glow {
      position: absolute;
      width: 420px;
      height: 420px;
      pointer-events: none;
      border-radius: 50%;
      filter: blur(90px);
      opacity: 0.11;
    }

    .glow-one {
      top: -220px;
      right: 4%;
      background: #6cd8b0;
    }

    .glow-two {
      top: 640px;
      left: -280px;
      background: #b589e9;
      opacity: 0.08;
    }

    .topbar, .content, .footer {
      position: relative;
      z-index: 1;
      width: min(1180px, calc(100% - 48px));
      margin: 0 auto;
    }

    .topbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      min-height: 86px;
      border-bottom: 1px solid var(--line);
    }

    .brand, .github-link {
      color: inherit;
      text-decoration: none;
    }

    .brand {
      display: inline-flex;
      align-items: center;
      gap: 12px;
    }

    .brand-mark {
      display: inline-flex;
      align-items: flex-end;
      gap: 3px;
      width: 27px;
      height: 27px;
      padding: 5px;
      border: 1px solid rgba(142, 229, 194, 0.5);
      border-radius: 8px;
      background: rgba(142, 229, 194, 0.08);
    }

    .brand-mark span {
      display: block;
      width: 4px;
      border-radius: 3px;
      background: var(--accent);
    }

    .brand-mark span:nth-child(1) { height: 8px; opacity: 0.55; }
    .brand-mark span:nth-child(2) { height: 13px; opacity: 0.78; }
    .brand-mark span:nth-child(3) { height: 17px; }

    .brand-copy {
      display: grid;
      gap: 2px;
    }

    .brand-copy strong {
      font-size: 14px;
      font-weight: 650;
      letter-spacing: 0.01em;
    }

    .brand-copy small, .github-link, .engine-pill {
      color: var(--muted);
      font-size: 11px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .topbar-right {
      display: flex;
      align-items: center;
      gap: 25px;
    }

    .engine-pill, .github-link {
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }

    .engine-dot, .live-status span, .status-pulse {
      display: inline-block;
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--accent);
      box-shadow: 0 0 0 4px rgba(142, 229, 194, 0.09);
    }

    .github-link {
      transition: color 160ms ease;
    }

    .github-link:hover {
      color: var(--ink);
    }

    .github-link span, .category-caret {
      color: var(--accent);
      font-size: 16px;
    }

    .content {
      padding: 75px 0 90px;
    }

    .hero {
      max-width: 850px;
      padding-bottom: 75px;
    }

    .eyebrow, .mini-label {
      color: var(--accent);
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.18em;
      text-transform: uppercase;
    }

    .eyebrow {
      display: inline-flex;
      align-items: center;
      gap: 9px;
      margin-bottom: 24px;
    }

    .eyebrow span {
      width: 25px;
      height: 1px;
      background: var(--accent);
    }

    h1, h2, h3, p {
      margin: 0;
    }

    h1 {
      max-width: 860px;
      font-family: Georgia, "Times New Roman", serif;
      font-size: clamp(45px, 7vw, 84px);
      font-weight: 400;
      letter-spacing: -0.055em;
      line-height: 0.99;
    }

    h1 em {
      color: var(--accent);
      font-style: italic;
    }

    .hero-copy {
      max-width: 570px;
      margin-top: 29px;
      color: var(--muted);
      font-size: 16px;
      line-height: 1.7;
    }

    .hero-notes {
      display: flex;
      flex-wrap: wrap;
      gap: 25px;
      margin-top: 34px;
      color: var(--faint);
      font-size: 11px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .hero-notes span {
      display: inline-flex;
      align-items: center;
      gap: 9px;
    }

    .hero-notes b {
      color: var(--ink);
      font-size: 10px;
      font-weight: 600;
    }

    .workflow-section {
      padding: 34px 0 49px;
      border-top: 1px solid var(--line);
    }

    .section-heading {
      display: grid;
      grid-template-columns: 40px minmax(240px, 1fr) minmax(260px, 390px);
      gap: 18px;
      align-items: start;
      margin-bottom: 27px;
    }

    .section-number {
      color: var(--accent);
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 12px;
      letter-spacing: 0.08em;
    }

    h2 {
      margin-top: 6px;
      color: var(--ink);
      font-family: Georgia, "Times New Roman", serif;
      font-size: 28px;
      font-weight: 400;
      letter-spacing: -0.025em;
    }

    .section-heading p {
      padding-top: 6px;
      color: var(--muted);
      font-size: 13px;
      line-height: 1.6;
    }

    .category-grid {
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      gap: 9px;
    }

    .category-card {
      position: relative;
      display: flex;
      flex-direction: column;
      min-height: 160px;
      padding: 17px 15px 14px;
      overflow: hidden;
      border: 1px solid var(--line);
      border-radius: 12px;
      color: var(--ink);
      text-align: left;
      background: rgba(27, 34, 49, 0.55);
      cursor: pointer;
      transition: border-color 180ms ease, background 180ms ease, transform 180ms ease;
    }

    .category-card::before {
      position: absolute;
      top: 0;
      right: 0;
      left: 0;
      height: 2px;
      content: "";
      opacity: 0;
      background: var(--category-accent);
      transition: opacity 180ms ease;
    }

    .category-card:hover, .category-card.selected {
      border-color: color-mix(in srgb, var(--category-accent) 47%, transparent);
      background: rgba(35, 44, 63, 0.86);
      transform: translateY(-2px);
    }

    .category-card.selected::before {
      opacity: 1;
    }

    .category-index {
      color: var(--category-accent);
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 10px;
    }

    .category-label {
      margin-top: 27px;
      font-family: Georgia, "Times New Roman", serif;
      font-size: 19px;
    }

    .category-description {
      display: block;
      margin-top: 9px;
      color: var(--muted);
      font-size: 11px;
      line-height: 1.45;
    }

    .category-caret {
      position: absolute;
      right: 13px;
      bottom: 12px;
      opacity: 0.45;
    }

    .studio-grid {
      display: grid;
      grid-template-columns: minmax(0, 1.15fr) minmax(350px, 0.85fr);
      gap: 14px;
    }

    .panel {
      border: 1px solid var(--line);
      border-radius: 15px;
      background: var(--panel);
      box-shadow: 0 18px 55px rgba(0, 0, 0, 0.16);
    }

    .composer-panel {
      padding: 29px;
    }

    .panel-topline, .title-label-row, .composer-bottom, .ideas-heading, .results-header, .results-meta {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .panel-topline {
      margin-bottom: 30px;
    }

    .step-badge {
      padding: 6px 9px;
      border: 1px solid var(--line);
      border-radius: 6px;
      color: var(--faint);
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 10px;
    }

    .field-label {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 9px;
      color: #d8dce5;
      font-size: 12px;
      font-weight: 600;
    }

    .field-label span {
      color: var(--faint);
      font-size: 10px;
      font-weight: 400;
      letter-spacing: 0.03em;
    }

    .input-shell {
      display: flex;
      align-items: center;
      margin-bottom: 24px;
      border: 1px solid rgba(229, 235, 244, 0.15);
      border-radius: 9px;
      background: rgba(10, 14, 24, 0.45);
      transition: border-color 160ms ease, box-shadow 160ms ease;
    }

    .input-shell:focus-within, textarea:focus {
      border-color: rgba(142, 229, 194, 0.7);
      box-shadow: 0 0 0 3px rgba(142, 229, 194, 0.08);
      outline: none;
    }

    .input-prefix {
      padding-left: 14px;
      color: var(--accent);
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 17px;
    }

    input, textarea {
      width: 100%;
      border: 0;
      color: var(--ink);
      background: transparent;
      outline: none;
    }

    input {
      height: 47px;
      padding: 0 14px 0 9px;
      font-size: 14px;
    }

    textarea {
      display: block;
      min-height: 169px;
      padding: 14px;
      resize: vertical;
      border: 1px solid rgba(229, 235, 244, 0.15);
      border-radius: 9px;
      color: var(--ink);
      font-size: 13px;
      line-height: 1.7;
      background: rgba(10, 14, 24, 0.45);
      transition: border-color 160ms ease, box-shadow 160ms ease;
    }

    input::placeholder, textarea::placeholder {
      color: #626b7d;
    }

    .title-label-row {
      align-items: baseline;
    }

    .title-count {
      color: var(--faint);
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 10px;
    }

    .title-count.over-limit {
      color: #ef9ba8;
    }

    .composer-bottom {
      flex-wrap: wrap;
      gap: 17px;
      margin-top: 20px;
    }

    .composer-hint {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      color: var(--faint);
      font-size: 11px;
    }

    .hint-icon {
      display: inline-grid;
      width: 16px;
      height: 16px;
      place-items: center;
      border: 1px solid var(--faint);
      border-radius: 50%;
      font-family: Georgia, serif;
      font-size: 11px;
    }

    .action-row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .button, .text-button {
      border: 0;
      cursor: pointer;
      transition: background 160ms ease, color 160ms ease, border-color 160ms ease, transform 160ms ease;
    }

    .button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      min-height: 39px;
      padding: 0 14px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 650;
    }

    .button:hover:not(:disabled) {
      transform: translateY(-1px);
    }

    .button:disabled {
      cursor: wait;
      opacity: 0.52;
    }

    .button-secondary {
      border: 1px solid var(--line);
      color: #d7dce8;
      background: transparent;
    }

    .button-secondary:hover:not(:disabled) {
      border-color: rgba(142, 229, 194, 0.4);
      background: rgba(142, 229, 194, 0.06);
    }

    .button-primary {
      color: #111923;
      background: var(--accent);
    }

    .button-primary:hover:not(:disabled) {
      background: #b2f1d7;
    }

    .button-icon {
      font-size: 16px;
      font-weight: 400;
      line-height: 1;
    }

    .spinner {
      width: 12px;
      height: 12px;
      border: 2px solid rgba(17, 25, 35, 0.3);
      border-top-color: #111923;
      border-radius: 50%;
      animation: spin 800ms linear infinite;
    }

    @keyframes spin { to { transform: rotate(360deg); } }

    .inline-error {
      margin-top: 16px;
      padding: 10px 12px;
      border: 1px solid rgba(239, 155, 168, 0.28);
      border-radius: 7px;
      color: #f0b0bb;
      font-size: 11px;
      line-height: 1.5;
      background: rgba(131, 49, 69, 0.12);
    }

    .ideas-panel {
      min-height: 100%;
      padding: 26px 24px 19px;
      background: var(--panel-light);
    }

    .ideas-heading {
      align-items: flex-start;
      gap: 15px;
    }

    h3 {
      margin-top: 7px;
      color: var(--ink);
      font-family: Georgia, "Times New Roman", serif;
      font-size: 20px;
      font-weight: 400;
      letter-spacing: -0.02em;
    }

    .text-button {
      padding: 0;
      color: var(--accent);
      font-size: 11px;
      background: transparent;
    }

    .text-button:hover {
      color: #c2f5df;
    }

    .ideas-intro {
      max-width: 330px;
      margin: 12px 0 20px;
      color: var(--muted);
      font-size: 12px;
      line-height: 1.55;
    }

    .ideas-list {
      border-top: 1px solid var(--line);
    }

    .idea-row {
      display: grid;
      grid-template-columns: 27px 1fr 18px;
      gap: 8px;
      align-items: start;
      width: 100%;
      padding: 13px 0;
      border: 0;
      border-bottom: 1px solid var(--line);
      color: var(--muted);
      text-align: left;
      background: transparent;
      cursor: pointer;
      transition: color 160ms ease, padding 160ms ease;
    }

    .idea-row:hover {
      padding-right: 4px;
      padding-left: 4px;
      color: var(--ink);
    }

    .idea-number {
      padding-top: 2px;
      color: var(--faint);
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 10px;
    }

    .idea-title {
      font-size: 12px;
      line-height: 1.48;
    }

    .idea-plus {
      padding-top: 1px;
      color: var(--accent);
      font-size: 17px;
      font-weight: 300;
      text-align: right;
    }

    .results-section {
      margin-top: 14px;
      padding: 30px;
      border: 1px solid var(--line);
      border-radius: 15px;
      background: rgba(18, 24, 37, 0.72);
    }

    .results-title {
      display: flex;
      align-items: flex-start;
      gap: 18px;
    }

    .results-meta {
      gap: 18px;
    }

    .live-status {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      color: var(--muted);
      font-size: 11px;
    }

    .live-status.status-error span, .status-pulse.status-error {
      background: #ef9ba8;
      box-shadow: 0 0 0 4px rgba(239, 155, 168, 0.09);
    }

    .live-status.status-success span, .status-pulse.status-success {
      background: #8ee5c2;
    }

    .live-status.status-busy span, .status-pulse.status-busy {
      animation: breathe 1.2s ease-in-out infinite;
    }

    @keyframes breathe {
      0%, 100% { opacity: 0.4; transform: scale(0.82); }
      50% { opacity: 1; transform: scale(1.15); }
    }

    .result-count {
      color: var(--faint);
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 10px;
    }

    .status-strip {
      display: flex;
      align-items: center;
      gap: 10px;
      min-height: 42px;
      margin-top: 25px;
      padding: 0 12px;
      border: 1px solid var(--line);
      border-radius: 8px;
      color: var(--muted);
      font-size: 11px;
      background: rgba(9, 13, 22, 0.28);
    }

    .status-pulse {
      flex: 0 0 auto;
      width: 6px;
      height: 6px;
    }

    .status-field {
      margin-left: auto;
      overflow: hidden;
      color: var(--faint);
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 10px;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .empty-results {
      display: flex;
      align-items: center;
      gap: 19px;
      min-height: 151px;
      color: var(--muted);
    }

    .empty-results strong {
      display: block;
      margin-bottom: 5px;
      color: #d9dce4;
      font-size: 13px;
      font-weight: 600;
    }

    .empty-results p {
      max-width: 500px;
      font-size: 12px;
      line-height: 1.55;
    }

    .empty-orbit {
      position: relative;
      display: grid;
      width: 49px;
      height: 49px;
      place-items: center;
      border: 1px solid rgba(142, 229, 194, 0.35);
      border-radius: 50%;
    }

    .empty-orbit::before {
      position: absolute;
      inset: 7px;
      border: 1px dashed rgba(142, 229, 194, 0.35);
      border-radius: 50%;
      content: "";
    }

    .empty-orbit span {
      position: absolute;
      width: 4px;
      height: 4px;
      border-radius: 50%;
      background: var(--accent);
    }

    .empty-orbit span:nth-child(1) { top: 3px; }
    .empty-orbit span:nth-child(2) { right: 4px; bottom: 11px; opacity: 0.6; }
    .empty-orbit span:nth-child(3) { bottom: 7px; left: 8px; opacity: 0.4; }

    .result-list {
      margin-top: 17px;
      border-top: 1px solid var(--line);
    }

    .result-row {
      display: grid;
      grid-template-columns: 39px 1fr;
      gap: 12px;
      align-items: start;
      padding: 17px 0;
      border-bottom: 1px solid var(--line);
    }

    .result-number {
      color: var(--faint);
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 11px;
    }

    .result-main strong {
      display: block;
      color: #e4e7ed;
      font-size: 13px;
      font-weight: 500;
      line-height: 1.45;
    }

    .result-status {
      margin-top: 7px;
      font-size: 11px;
    }

    .download-link {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      color: var(--accent);
      text-decoration: none;
    }

    .download-link:hover {
      color: #c2f5df;
    }

    .download-arrow {
      color: var(--faint);
      font-size: 10px;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }

    .result-error {
      color: #eaa5b1;
    }

    .footer {
      display: flex;
      justify-content: space-between;
      padding: 22px 0 29px;
      border-top: 1px solid var(--line);
      color: var(--faint);
      font-size: 10px;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    .footer i {
      padding: 0 5px;
      color: var(--accent);
      font-style: normal;
    }

    @media (max-width: 980px) {
      .category-grid {
        grid-template-columns: repeat(3, 1fr);
      }

      .studio-grid {
        grid-template-columns: 1fr;
      }

      .ideas-panel {
        min-height: auto;
      }
    }

    @media (max-width: 680px) {
      .topbar, .content, .footer {
        width: min(100% - 30px, 560px);
      }

      .topbar {
        min-height: 70px;
      }

      .topbar-right {
        gap: 0;
      }

      .github-link {
        display: none;
      }

      .engine-pill {
        font-size: 9px;
      }

      .content {
        padding-top: 52px;
        padding-bottom: 55px;
      }

      .hero {
        padding-bottom: 53px;
      }

      h1 {
        font-size: clamp(43px, 13vw, 66px);
      }

      .hero-copy {
        font-size: 14px;
      }

      .hero-notes {
        gap: 13px;
        line-height: 1.4;
      }

      .section-heading {
        grid-template-columns: 31px 1fr;
      }

      .section-heading p {
        grid-column: 2;
        padding-top: 0;
      }

      .category-grid {
        grid-template-columns: repeat(2, 1fr);
      }

      .category-card {
        min-height: 145px;
      }

      .category-description {
        font-size: 10px;
      }

      .composer-panel, .results-section {
        padding: 21px 17px;
      }

      .panel-topline {
        margin-bottom: 24px;
      }

      .composer-bottom {
        align-items: flex-start;
        flex-direction: column;
      }

      .action-row, .button {
        width: 100%;
      }

      .button {
        min-height: 43px;
      }

      .results-header {
        align-items: flex-start;
        gap: 12px;
      }

      .results-meta {
        align-items: flex-end;
        flex-direction: column;
        gap: 6px;
      }

      .status-field {
        max-width: 48%;
      }

      .empty-results {
        align-items: flex-start;
        flex-direction: column;
        justify-content: center;
        gap: 12px;
      }

      .footer {
        align-items: flex-start;
        flex-direction: column;
        gap: 9px;
        line-height: 1.5;
      }
    }
  `;w([k()],f.prototype,"_categoryId",2);w([k()],f.prototype,"_field",2);w([k()],f.prototype,"_titles",2);w([k()],f.prototype,"_job",2);w([k()],f.prototype,"_loading",2);w([k()],f.prototype,"_requestError",2);f=w([Re("seo-app")],f);const ae=document.querySelector("#app");ae?ae.appendChild(document.createElement("seo-app")):document.body.appendChild(document.createElement("seo-app"));
