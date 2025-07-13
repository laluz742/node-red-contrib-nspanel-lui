import { IPageHandlerCache, IPageHistory, IPageNode, PageId } from '../types/types'

export class SimplePageHandlerCache implements IPageHandlerCache {
    private history: IPageHistory[] = []

    private allKnownPages: Map<string, IPageNode> = new Map<string, IPageNode>()

    // #region history management
    public getCurrentPage(): IPageHistory | null {
        return this.history.at(-1) ?? null
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

        const lastPageOnHistory = this.findLastPageInHistory()
        if (lastPageOnHistory != null) {
            newHistory.push(lastPageOnHistory)
        }

        this.history = newHistory
    }

    public findLastPageInHistory(): IPageHistory | null {
        for (let i = this.history.length - 1; i >= 0; i -= 1) {
            if (this.history[i].historyType === 'page') {
                return this.history[i]
            }
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
