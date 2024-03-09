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
  autoGroup: string[];
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
    autoGroup: [],
    caseSensitive: false,
    color: '' as chrome.tabGroups.ColorEnum,
    id: new Date().getTime() + Math.floor(Math.random() * 10000),
    groupTitle: '',
    matchType: ChromeTabsAttributes.url,
    regex: false,
    text: '',
  });
};

const cleanUpLineItems = (lineItems: LineItem[]): LineItem[] => {
  const defaultLineItem = newLineItem();

  // delete ID because it's always different
  function sortObjectByKeys<T>(objToSort: T): T {
    // @ts-ignore
    return Object.keys(objToSort)
      .sort()
      .reduce((obj: any, key) => {
        // @ts-ignore
        obj[key] = objToSort[key];
        return obj;
      }, {});
  }

  const sortedStringifiedDefaultLineItem =
    sortObjectByKeys<LineItem>(defaultLineItem);
  return lineItems.slice().filter((item: LineItem) => {
    const sortedClonedLineItem = sortObjectByKeys(item);
    // rename the id, deleting it leads to deleting it in the returned object
    sortedStringifiedDefaultLineItem.id = item.id;
    // we sorted both and then stringify to ensure keys are all alphabetical
    // this is only going to work for shallow objects
    return (
      JSON.stringify(sortedClonedLineItem) !==
      JSON.stringify(sortedStringifiedDefaultLineItem)
    );
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
    this.lineItems = await this.wrappedGet();
    if (this.lineItems?.length) {
      return this.lineItems;
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

  async moveLineItem(lineItemUniqueId: number, direction: 'up' | 'down') {
    const lineItems = await this.get();
    const lineItemIndex = lineItems.findIndex(
      (item) => item.id === lineItemUniqueId
    );

    if (lineItemIndex >= 0) {
      if (direction === 'up' && lineItemIndex > 0) {
        const tmpLineItemToMoveUp: LineItem = lineItems[lineItemIndex];
        lineItems[lineItemIndex] = lineItems[lineItemIndex - 1];
        lineItems[lineItemIndex - 1] = tmpLineItemToMoveUp;
        return this.set(lineItems);
      } else if (direction === 'down' && lineItems[lineItemIndex + 1]) {
        const tmpLineItemToMoveDown: LineItem = lineItems[lineItemIndex];
        lineItems[lineItemIndex] = lineItems[lineItemIndex + 1];
        lineItems[lineItemIndex + 1] = tmpLineItemToMoveDown;
        return this.set(lineItems);
      }
    } else {
      console.warn('Could not find line item by index/id');
    }

    return this.get();
  }

  async deleteLineItemById(lineItemUniqueId: number): Promise<LineItem[]> {
    const lineItems = (await this.get()).slice();
    // check to see if line item length is 1, if so we just reset it to empty
    if (lineItems.length === 1) {
      return this.reset();
    }

    this.lineItems = lineItems.filter((item) => item.id !== lineItemUniqueId);
    return this.wrappedSet(this.lineItems);
  }

  /**
   * Proceeds to move lineItems that match the initial line item state
   */
  async cleanUpLineItems(): Promise<LineItem[]> {
    const lineItems = await this.get();
    const cleanedUpLineItems = cleanUpLineItems(lineItems);
    if (cleanedUpLineItems.length) {
      return this.set(cleanedUpLineItems);
    }
    return this.reset();
  }

  /**
   * Returns chrome storage or undefined if it has not been set.
   * Should not be called by anything other than the `get` method
   */
  private async wrappedGet(): Promise<LineItem[]> {
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
