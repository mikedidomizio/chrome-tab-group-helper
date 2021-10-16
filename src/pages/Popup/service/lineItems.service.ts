export enum ChromeTabsAttributes {
  title = 'title',
  url = 'url',
}

export interface LineItem {
  /**
   * Whether to apply changes or not
   */
  applyChanges: boolean;
  /**
   * Will group new tabs created automatically
   */
  autoGroup: boolean;
  /**
   * If true, matches will only match case sensitive
   */
  caseSensitive: boolean;
  /**
   * Group color to apply
   */
  color: chrome.tabGroups.ColorEnum | '';
  /**
   * "Random" number (is generated by Date.getTime())
   */
  id: number;
  /**
   * The title to give to the group
   */
  groupTitle: string;
  /**
   * The match type to search in the browser tab
   */
  matchType: ChromeTabsAttributes;
  /**
   * Whether or not to match by regular expression
   */
  regex: boolean;
  /**
   * The text to find matches for in tabs
   */
  text: string;
}

export const newLineItem = (): LineItem => {
  return Object.seal({
    applyChanges: true,
    autoGroup: false,
    caseSensitive: false,
    color: '' as chrome.tabGroups.ColorEnum,
    id: new Date().getTime() + Math.floor(Math.random() * 10000),
    groupTitle: '',
    matchType: ChromeTabsAttributes.url,
    regex: false,
    text: '',
  });
};

/**
 * Maintains the line items between components
 */
export class LineItemsService {
  private lineItems: LineItem[] = [];

  async reset(): Promise<LineItem[]> {
    return this.set([newLineItem()]);
  }

  async get(): Promise<LineItem[]> {
    const lineItems = await this.wrappedGet();
    if (lineItems?.length) {
      return lineItems;
    }

    return this.reset();
  }

  async add(): Promise<LineItem[]> {
    const lineItems = (await this.get()).slice();
    this.lineItems = lineItems.concat([newLineItem()]);
    return this.wrappedSet(this.lineItems);
  }

  async set(lineItemsArr: any[]): Promise<LineItem[]> {
    this.lineItems = lineItemsArr.concat();
    return this.wrappedSet(this.lineItems);
  }

  async updateLineItems(
    lineItemUniqueId: number,
    lineItemState: any
  ): Promise<LineItem[]> {
    let lineItems = (await this.get()).slice();
    this.lineItems = lineItems.map((i) => {
      if (i.id === lineItemUniqueId) {
        i = lineItemState;
      }

      return i;
    });
    return this.wrappedSet(this.lineItems);
  }

  async deleteLineItems(lineItemUniqueId: number): Promise<LineItem[]> {
    const lineItems = (await this.get()).slice();
    // check to see if line item length is 1, if so we just reset it to empty
    if (lineItems.length === 1) {
      return this.reset();
    }

    this.lineItems = lineItems.filter((item) => item.id !== lineItemUniqueId);
    return this.wrappedSet(this.lineItems);
  }

  /**
   * Returns chrome storage or undefined if it has not been set.
   * Should not be called by anything other than the `get` method
   */
  private async wrappedGet(): Promise<LineItem[] | undefined> {
    // todo reject: https://developer.chrome.com/docs/extensions/reference/storage/
    return new Promise((resolve) => {
      chrome.storage.local.get(
        ['lineItems'],
        function (result: { lineItems?: LineItem[] }) {
          if (chrome.runtime.lastError) {
            console.error('Error getting');
          }

          if (result.lineItems) {
            resolve(result.lineItems as LineItem[]);
          }

          resolve([]);
        }
      );
    });
  }

  /**
   * Sets the chrome storage
   * // todo not directly called?
   * @param lineItems
   */
  private async wrappedSet(lineItems: LineItem[]): Promise<LineItem[]> {
    return new Promise((resolve) => {
      // todo is there a scenario where we set incorrectly and it instead resets the storage?
      chrome.storage.local.set({ lineItems: lineItems }, async () => {
        if (chrome.runtime.lastError) {
          console.error('Error setting');
        }

        const lineItems = await this.get();
        resolve(lineItems);
      });
    });
  }
}
