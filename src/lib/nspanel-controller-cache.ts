import { IControllerCache, IPageHistory, IPageNode, PageId } from '../types'

export class SimpleControllerCache implements IControllerCache {
    private history: IPageHistory[] = []
    private allKnownPages: Map<string, IPageNode> = new Map<string, IPageNode>()

    // #region history management
    public getCurrentPage(): IPageHistory | null {
        return this.history.length == 0 ? null : this.history.slice(-1)[0] ?? null
    }

    public addToHistory(pageHistory: IPageHistory): void {
        this.history.push(pageHistory)
    }

    public removeLastFromHistory(): void {
        this.history.pop()
    }

    public getLastFromHistory(): IPageHistory {
        const lastEntry: IPageHistory = this.history[this.history.length - 1]
        return lastEntry
    }

    public resetHistory(): void {
        const newHistory: IPageHistory[] = []

        const lastPageOnHistory: IPageHistory = this.findLastPageInHistory()
        if (lastPageOnHistory !== null) {
            newHistory.push(lastPageOnHistory)
        }

        this.history = newHistory
    }

    public findLastPageInHistory(): IPageHistory {
        if (this.history.length > 0) {
            const currentHistory: IPageHistory[] = this.history.map((x) => x)

            var lastHistoryOfTypePage: IPageHistory = null
            for (var i = currentHistory.length - 1; i >= 0; i--) {
                if (currentHistory[i].historyType == 'page') {
                    lastHistoryOfTypePage = currentHistory[i]
                    break
                }
            }

            return lastHistoryOfTypePage
        }

        return null
    }
    // #endregion history management

    // #region page management
    public getAllKnownPages(): IPageNode[] {
        return [...this.allKnownPages.values()]
    }

    public isPageKnown(pageId: PageId): boolean {
        return this.allKnownPages.has(pageId)
    }

    public getPage(pageId: PageId): IPageNode | null {
        return this.allKnownPages.get(pageId) ?? null
    }

    public addPage(pageId: PageId, pageNode: IPageNode): void {
        this.allKnownPages.set(pageId, pageNode)
    }

    public removePage(pageNode: IPageNode): void {
        this.allKnownPages.delete(pageNode.id)
    }
    // #endregion page management
}