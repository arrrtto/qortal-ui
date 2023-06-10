import { LitElement, html, css } from 'lit'
import { connect } from 'pwa-helpers'
import { store } from '../store.js'
import { Epml } from '../epml.js'
import { addPluginRoutes } from '../plugins/addPluginRoutes.js'
import { repeat } from 'lit/directives/repeat.js';
import ShortUniqueId from 'short-unique-id';

class ShowPlugin extends connect(store)(LitElement) {
    static get properties() {
        return {
            app: { type: Object },
            pluginConfig: { type: Object },
            url: { type: String },
            linkParam: { type: String },
            registeredUrls: { type: Array },
            currentTab: { type: Number },
            tabs: { type: Array }
        }
    }

    static get styles() {
        return css`
            html {
                --scrollbarBG: #a1a1a1;
                --thumbBG: #6a6c75;
            }

            *::-webkit-scrollbar {
                width: 11px;
            }

            * {
                scrollbar-width: thin;
                scrollbar-color: var(--thumbBG) var(--scrollbarBG);
            }

            *::-webkit-scrollbar-track {
                background: var(--scrollbarBG);
            }

            *::-webkit-scrollbar-thumb {
                background-color: var(--thumbBG);
                border-radius: 6px;
                border: 3px solid var(--scrollbarBG);
            }
            

            .hideIframe  {
                visibility: hidden;
                position: absolute;
                zIndex: -10;
                
            }

            .showIframe  {
                zIndex: 1;
                position: relative;
                visibility: visible;
            }

            .tabs {
        display: flex;
        justify-content: flex-start;
        gap: 1em;
        padding: 0.5em;
        background: #F6F8FA;
        border-bottom: 1px solid #E1E4E8;
        box-shadow: 0 1px 2px rgba(0,0,0,0.075);
      }
      .tab {
        padding: 0.5em 1em;
        background: #fafbfc;
        border: 1px solid #E1E4E8;
        border-radius: 3px;
        color: #586069;
        cursor: pointer;
        transition: background 0.3s;
        position: relative;
    width: 120px;
    box-sizing: border-box;
    overflow: hidden;
    text-overflow: ellipsis;
      }
      .tab:hover {
        background: #F3F4F6;
      }
      .tab.active {
        background: #FFFFFF;
        color: #24292E;
        border: 1px solid #E1E4E8;
        box-shadow: 0 2px 5px rgba(0,0,0,0.1);
      }
      .close {
            color: #999;
            font-weight: bold;
            font-size: 20px;
            line-height: 20px;
            position: absolute;
            top: 5px;
            right: 5px;
        }

        .close:hover {
            color: red;
        }
      .add-tab-button {
      background: none;
      border: none;
      color: #586069;
      font-size: 1.5em;
      cursor: pointer;
      transition: color 0.3s;
    }
    .add-tab-button:hover {
      color: #24292E;
    }
        `
    }

    constructor() {
        super()
        this.registeredUrls = []
        this.currentTab = 0
        this.tabs = []
        this.uid = new ShortUniqueId()
    }

    async getUpdateComplete() {
        await super.getUpdateComplete();
        return true;
    }

    async addTab(tab) {

        this.tabs = [...this.tabs, tab]
        await this.getUpdateComplete();
        // add the new tab to the tabs array
        const newIndex = this.tabs.length - 1;

        // render the tab and wait for it to be added to the DOM

        const frame = this.shadowRoot.getElementById(`showPluginFrame${newIndex}`);
        this.createEpmlInstance(frame, newIndex);

    }






    render() {


        const plugSrc = (myPlug) => {
            return myPlug === undefined ? 'about:blank' : `${window.location.origin}/plugin/${myPlug.domain}/${myPlug.page}${this.linkParam}`
        }



        return html`
       
      <div class="tabs">
        ${this.tabs.map((tab, index) => html`
          <div 
          class="tab ${this.currentTab === index ? 'active' : ''}"
            @click=${() => this.currentTab = index}
          >
            ${tab.url}
                    <div class="close" @click=${() => { this.removeTab(index) }}>x</div>
          </div>
        `)}
        <button 
        class="add-tab-button" 
        title="Add Tab"
        @click=${() => this.addTab(
            {
                url: "",
                id: this.uid()
            }
        )}
      >
        ➕
      </button>
      </div>

      ${repeat(this.tabs, (tab) => tab.id, (tab, index) => html`
      <div class=${this.currentTab === index ? "showIframe" : "hideIframe"}>
          <iframe src="${plugSrc(tab.myPlugObj)}" id="showPluginFrame${index}" style="width:100%;
                height:calc(var(--window-height) - 64px);
                border:0;
                padding:0;
                margin:0"></iframe>
        </div>
        `)}
     
       
      
        `
    }

    removeTab(index) {


        // Remove tab from array
        this.tabs = this.tabs.filter((tab, tIndex) => tIndex !== index)


    }

    createEpmlInstance(frame, index) {
        const showingPluginEpml = new Epml({
            type: 'WINDOW',
            source: frame.contentWindow
        });

        addPluginRoutes(showingPluginEpml);
        showingPluginEpml.imReady();

        // store Epml instance in tab for later use
        this.tabs[index].epmlInstance = showingPluginEpml;

        // Register each instance with a unique identifier
        Epml.registerProxyInstance(`visible-plugin-${index}`, showingPluginEpml);
    }

    firstUpdated() {
        this.tabs.forEach((tab, index) => {
            const frame = this.shadowRoot.getElementById(`showPluginFrame${index}`);
            this.createEpmlInstance(frame, index);
        });
    }

    updated(changedProps) {

        if (changedProps.has('url') || changedProps.has('registeredUrls')) {
            const plugArr = []


            this.registeredUrls.forEach(myPlugArr => {
                myPlugArr.menus.length === 0 ? plugArr.push(myPlugArr) : myPlugArr.menus.forEach(i => plugArr.push(myPlugArr, i))
            })

            const myPlugObj = plugArr.find(pagePlug => {
                return pagePlug.url === this.url
            })

            if (this.tabs.length === 0) {

                this.addTab({
                    url: this.url,
                    myPlugObj,
                    id: this.uid()
                })
            } else {

                const copiedTabs = [...this.tabs]
                copiedTabs[this.currentTab] = {
                    ...copiedTabs[this.currentTab],
                    url: this.url,
                    myPlugObj
                }
                this.tabs = copiedTabs



            }

            this.requestUpdate()
        }

        if (changedProps.has('computerUrl')) {
            if (this.computedUrl !== 'about:blank') {
                this.loading = true
            }
        }
    }

    stateChanged(state) {
        const split = state.app.url.split('/')
        const newRegisteredUrls = state.app.registeredUrls

        let newUrl, newLinkParam

        if (newRegisteredUrls !== this.registeredUrls) {
            this.registeredUrls = newRegisteredUrls
        }

        if (split[0] === '' && split[1] === 'app' && split[2] === undefined) {
            newUrl = 'wallet'
            newLinkParam = ''
        } else if (split.length === 5 && split[1] === 'app') {
            newUrl = split[2]
            newLinkParam = split[3] === undefined ? '' : '?' + split[3] + '/' + split[4]
        } else if (split[1] === 'app') {
            newUrl = split[2]
            newLinkParam = ''
        } else {
            newUrl = '404'
            newLinkParam = ''
        }

        if (newUrl !== this.url) {
            this.url = newUrl
        }

        if (newLinkParam !== this.linkParam) {
            this.linkParam = newLinkParam
        }
    }
}

window.customElements.define('show-plugin', ShowPlugin)


