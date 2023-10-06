import { ILogger, Logger } from './logger'
import { NodeBase } from '../lib/node-base'
import {
    IPanelNode,
    IPageNode,
    IPageConfig,
    NodeRedOnErrorCallback,
    NodeRedSendCallback,
    EventArgs,
    EventMapping,
    ConfiguredEventsMap,
    PageInputMessage,
    PageEntityData,
    IPageOptions,
    PageData,
    NodeAPI,
} from '../types'
import { DEFAULT_HMI_COLOR } from './nspanel-constants'
import { NSPanelMessageUtils } from './nspanel-message-utils'
import { NSPanelUtils } from './nspanel-utils'

export class PageNode<TConfig extends IPageConfig> extends NodeBase<TConfig> implements IPageNode {
    private panelNode: IPanelNode = null
    private pageNodeConfig: IPageConfig
    protected options: IPageOptions = null
    private __log: ILogger = null
    protected pageData: PageData = {
        entities: [],
    }

    private configuredEvents: ConfiguredEventsMap = new Map()

    private isActive = false

    constructor(config: TConfig, RED: NodeAPI, options: IPageOptions) {
        super(config, RED)
        this.pageNodeConfig = config
        this.options = options

        this.__log = Logger(this.constructor.name)

        this.initPageNode(config, options)

        const panelNode = <IPanelNode>(<unknown>RED.nodes.getNode(config.nsPanel))

        if (!panelNode || panelNode.type !== 'nspanel-panel') {
            this.warn('Panel configuration is wrong or missing, please review the node settings') //FIXME i18n panel missing
            this.status({
                fill: 'red',
                shape: 'dot',
                text: 'Panel not configured', //TODO: i18n
            })
        } else {
            this.panelNode = panelNode
            this.registerAtPanel()
        }

        this.on('close', (done: () => void) => this._onClose(done))
        this.on('input', (msg, send, done) => this._onInput(msg, send, done))
    }

    public getTimeout(): number | null {
        if (
            this.pageNodeConfig.timeout === null ||
            this.pageNodeConfig.timeout === undefined ||
            this.pageNodeConfig.timeout == ''
        )
            return null

        const num = Number(this.pageNodeConfig.timeout)
        return isNaN(num) ? null : num
    }

    public getPageType() {
        return this.options.pageType
    }

    public generatePage(): string | string[] {
        return ''
    }

    public generatePopupDetails(type: string, entityId: string): string | string[] {
        return null
    }

    protected generateTitleNav() {
        //TODO: icons
        var navPrev = NSPanelUtils.makeEntity('delete')
        var navNext = NSPanelUtils.makeEntity('delete')

        this.pageNodeConfig.events.forEach((item) => {
            switch (item.event) {
                case 'nav.prev':
                    navPrev = NSPanelUtils.makeEntity(
                        'button',
                        'nav.prev',
                        NSPanelUtils.getIcon(item.icon ?? ''),
                        NSPanelUtils.toHmiIconColor(item.iconColor ?? DEFAULT_HMI_COLOR)
                    )
                    break
                case 'nav.next':
                    navNext = NSPanelUtils.makeEntity(
                        'button',
                        'nav.next',
                        NSPanelUtils.getIcon(item.icon ?? ''),
                        NSPanelUtils.toHmiIconColor(item.iconColor ?? DEFAULT_HMI_COLOR)
                    )
                    break
            }
        })

        return navPrev + '~' + navNext
    }

    protected requestUpdate() {
        if (this.isActive) {
            this.emit('page:update', this)
        }
    }

    protected sendToPanel(data) {
        this.emit('ctrl:send', { page: this, data: data })
    }

    public isScreenSaver() {
        return false
    }

    public setActive(state: boolean) {
        this.isActive = state
        if (state) {
            this.status({ fill: 'green', shape: 'dot', text: this.type + '.label.active' })
        } else {
            this.status({})
        }
    }

    public getPanel() {
        return this.panelNode
    }

    protected handleInput(msg: PageInputMessage, send: NodeRedSendCallback): boolean {
        return false
    }

    protected prePageNavigationEvent(eventArgs: EventArgs, eventConfig: EventMapping) {
        return true
    }

    private handlePageNavigationEvent(eventArgs: EventArgs, eventConfig: EventMapping) {
        //FIXME: better naming
        this.emit('nav:pageId', eventConfig.value)
    }

    private handlePageMessageEvent(eventArgs: EventArgs, eventConfig: EventMapping, send: NodeRedSendCallback) {
        //FIXME: better naming
        var outMsg = {}
        var data: any

        switch (eventConfig.dataType) {
            case 'str':
                data = eventConfig.data
                break

            case 'json':
                try {
                    data = JSON.parse(eventConfig.data)
                } catch (err: unknown) {
                    this.warn('Data not JSON compliant, sending as string') //TODO i18n
                    data = eventConfig.data
                }
                break
        }

        //TODO: handle other data
        outMsg[eventConfig.value] = data
        send(outMsg)
    }

    private initPageNode(config: TConfig, options: IPageOptions) {
        this.status({})

        // build event mapping index
        const allEventsMappings = config.events ?? []
        const cfgEvents: ConfiguredEventsMap = new Map()
        allEventsMappings.forEach((eventMapping) => {
            cfgEvents.set(eventMapping.event, eventMapping)
        })

        this.configuredEvents = cfgEvents
    }

    private _onInput(msg: PageInputMessage, send: NodeRedSendCallback, done: NodeRedOnErrorCallback) {
        // forward message to node output
        send(msg) // TODO: really? or just consume?

        if (NSPanelMessageUtils.hasProperty(msg, 'topic', true)) {
            switch (msg.topic) {
                case 'event':
                    const eventArgs = <EventArgs>msg.payload
                    this._handleUiEventInput(eventArgs, send)
                    break

                default:
                    const handled: boolean = this._handleInput(msg, send)
                    if (handled) {
                        this.requestUpdate()
                    }
                    break
            }
        }

        done()
    }

    private _handleInput(msg: PageInputMessage, send: NodeRedSendCallback): boolean {
        var handled: boolean = false

        try {
            handled = this.handleInput(msg, send)
        } catch (err: unknown) {
            if (err instanceof Error) {
                this.__log.error('Error handling input: ' + err.message)
            }
        }

        if (handled === false) {
            switch (msg.topic) {
                case 'data':
                    handled = this._handleDataInputInternal(msg, send)
                    break
            }
        }

        return handled
    }

    private _handleDataInputInternal(msg: PageInputMessage, send: NodeRedSendCallback): boolean {
        var result: PageEntityData[] = []

        //TODO: take msg.parts or index into account to allow to set specific status
        const entityInputData = Array.isArray(msg.payload) ? msg.payload : [msg.payload]

        if (Array.isArray(entityInputData)) {
            entityInputData.forEach((item, _idx) => {
                var conversionResult = NSPanelMessageUtils.convertToEntityItemData(item)
                result.push(conversionResult)
            })
        }

        this.pageData.entities = result.slice(0, this.options.maxEntities ?? 0)
        return true
    }

    private _handleUiEventInput(eventArgs: EventArgs, send: NodeRedSendCallback): void {
        // event mapped in config?
        if (this.configuredEvents.has(eventArgs.event2)) {
            const cfgEvent = this.configuredEvents.get(eventArgs.event2)

            switch (cfgEvent.t) {
                // mapped to navigation action
                case 'page':
                    const preHandleResult = this.prePageNavigationEvent(eventArgs, cfgEvent)
                    if (preHandleResult !== false) {
                        this.handlePageNavigationEvent(eventArgs, cfgEvent)
                    }
                    break

                // mapped to out msg
                case 'msg':
                    this.handlePageMessageEvent(eventArgs, cfgEvent, send)
                    break
            }
        }
    }

    private registerAtPanel() {
        this.panelNode.registerPage(this)
    }

    private _onClose(done: () => void) {
        this.panelNode.deregisterPage(this)
        done()
    }
}
