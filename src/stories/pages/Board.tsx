import React, {FunctionComponent, ReactElement, useState} from 'react';
import {LineItem} from '../LineItem';
import {TabService} from '../../service/tab.service';
import {LineItem as LItem, LineItemsService, newLineItem} from '../../service/lineItems.service';
import {makeStyles} from '@material-ui/core/styles';
import {BottomBar} from '../BottomBar';
import {Box, Divider} from '@material-ui/core';
import {BottomBarButton} from '../BottomBarButton';

const useStyles = makeStyles((/*theme*/) => ({
    root: {
        // was just manually tested in Chrome, no fancy calculations
        height: '536px',
        '& .lineItemsHolder': {
            // this is just to offset the header and keep the sticky to the bottom if not enough items are added
            minHeight: '468px',
            height: '468px',
            overflowY: 'scroll'
        }
    }
}));

export interface BoardProps {
}

/**
 * Board of line items that we will run against to group Chrome tabs
 */
export const Board: FunctionComponent = (): ReactElement => {
    const classes = useStyles();
    const lineItemsService: LineItemsService = new LineItemsService();
    const tabsService: TabService = new TabService();
    const [state, setState] = useState<{ lineItems: LItem[] }>({
        lineItems: lineItemsService.get(),
    });

    /**
     * Proceed to run grouping
     */
    const run = async () => {
        let lineItems = lineItemsService.get();
        // immediately filter where apply is true, we ignore otherwise
        lineItems = lineItems.filter(i => i.applyChanges);

        for (let item of lineItems) {
            const regex = item.regex;
            const {caseSensitive} = item;
            const returned: chrome.tabs.Tab[] = await new TabService().getTabsWhichMatch(item.text, item.matchType, caseSensitive, regex);
            // if id for some reason is undefined, we return -1
            // not exactly sure what would happen there if an error is thrown or it continues if trying to add
            // -1 tab to a group
            const ids: number[] = returned.map(i => i.id ? i.id : -1);
            if (ids.length) {
                const color = item.color !== '' ? item.color : undefined;
                await tabsService.addTabsToGroup(ids, item.groupTitle, color);
            }
        }
    };

    // proceeds to remove any line items that match the default (aka have not been edited)
    const cleanUp = (): void => {
        const defaultLineItem = newLineItem();

        // delete ID because it's always different
        function sortObjectByKeys<T>(objToSort: T): T {
            return Object.keys(objToSort).sort().reduce(
                (obj: any, key) => {
                    // @ts-ignore
                    obj[key] = objToSort[key];
                    return obj;
                },
                {}
            )
        }

        const sortedStringifiedDefaultLineItem = sortObjectByKeys<LItem>(defaultLineItem);

        const cleanedUpLineItems = state.lineItems.slice().filter((item: LItem) => {
            const sortedClonedLineItem = sortObjectByKeys(item);
            // rename the id, deleting it leads to deleting it in the returned object
            sortedStringifiedDefaultLineItem.id = item.id;
            // we sorted both and then stringify to ensure keys are all alphabetical
            // this is only going to work for shallow objects
            return JSON.stringify(sortedClonedLineItem) !== JSON.stringify(sortedStringifiedDefaultLineItem);
        });

        if (cleanedUpLineItems.length) {
            setState({lineItems: lineItemsService.set(cleanedUpLineItems)});
        } else {
            lineItemsService.reset();
            setState({lineItems: lineItemsService.add()});
        }
    };

    /**
     * Removes all current groups
     */
    const clearGroups = async () => await tabsService.clearGroups();

    const addLineItem = () => {
        setState({lineItems: lineItemsService.add()});
    };

    const deleteLineItem = (lineItemUniqueId: number): void => {
        if (lineItemsService.get().length === 1) {
            lineItemsService.reset();
            setState({lineItems: lineItemsService.add()});
        } else {
            setState({lineItems: lineItemsService.deleteLineItems(lineItemUniqueId)});
        }
    };

    const handleLineItemChange = (lineItemUniqueId: number, lineItemState: LItem) => {
        setState({lineItems: lineItemsService.updateLineItems(lineItemUniqueId, lineItemState)});
    };

    return (
        <Box className={classes.root}>
            <Box className="lineItemsHolder">
                {state.lineItems.map((data, idx) => (
                    <Box key={data.id}>
                        <Box p={2} className="line-item">
                            <LineItem onLineItemChange={(d: LItem) => handleLineItemChange(data.id, d)}
                                      deleteLineItem={deleteLineItem} {...data}/>

                        </Box>
                        {state.lineItems.length - 1 !== idx && <Divider light/>}
                    </Box>
                ))}
            </Box>
            <BottomBar>
                <BottomBarButton onClick={addLineItem} tooltip="Adds a new line item">Add Item</BottomBarButton>
                <BottomBarButton onClick={run} tooltip="Runs one by one through the line items that you have set above">Run</BottomBarButton>
                <BottomBarButton onClick={cleanUp} tooltip="Removes items that are the default for quick removal">Clean up</BottomBarButton>
                <BottomBarButton onClick={clearGroups} tooltip="Clears all groups in your browser">Clear Groups</BottomBarButton>
            </BottomBar>
        </Box>
    );
};

Board.defaultProps = {
    lineItems: [],
};
