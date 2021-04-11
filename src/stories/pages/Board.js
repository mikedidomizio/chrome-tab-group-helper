import React, {useState} from 'react';
import Button from '@material-ui/core/Button';
import PropTypes from 'prop-types';
import {LineItem} from "../LineItem";
import Box from '@material-ui/core/Box';
import Divider from '@material-ui/core/Divider';
import {TabService} from "../../service/tab.service";
import {LineItemsService} from "../../service/lineItems.service";
import {makeStyles} from "@material-ui/core/styles";

const useStyles = makeStyles((theme) => ({
    root: {
        '& .line-item:nth-child(even)': {
            backgroundColor: '#fcfcfc'
        },
        '& .MuiFormGroup-root:not(:last-child)': {
            marginBottom: theme.spacing(2)
        }
    }
}));

/**
 * Board of line items that we will run against to group Chrome tabs
 */
export const Board = (/*{lineItems}*/) => {
    const classes = useStyles();
    const lineItemsService = new LineItemsService();
    const [state, setState] = useState({
        lineItems: lineItemsService.get(),
    });

    /**
     * Proceed to run grouping
     */
    const run = async () => {
        let lineItems = lineItemsService.get();
        // immediately filter where apply is true, we ignore otherwise
        // todo work with other options
        lineItems = lineItems.filter(i => i.applyChanges);

        for (let item of lineItems) {
            const regex = item.matchType.toLowerCase().includes("regex");
            const matchTitle = item.matchType.includes("title") ? "title" : "url";
            const returned = await new TabService().getTabsWhichMatch(item.text, matchTitle, regex);
            const ids = returned.map(i => i.id);
            if (ids) {
                await new TabService().addTabsToGroup(ids, item.groupTitle, item.color);
            }
        }
    };

    const addLineItem = () => {
        setState({lineItems: lineItemsService.add()});
    };

    const deleteLineItem = (lineItemUniqueId) => {
        if (lineItemsService.get().length === 1) {
            lineItemsService.reset();
            setState({lineItems: lineItemsService.add()});
        } else {
            setState({lineItems: lineItemsService.deleteLineItems(lineItemUniqueId)});
        }
    };

    const handleLineItemChange = (lineItemUniqueId, lineItemState) => {
        setState({lineItems: lineItemsService.updateLineItems(lineItemUniqueId, lineItemState)});
    };

    return (
        <Box className={classes.root}>
            {state.lineItems.map((data) => (
                <Box>
                    <Box p={2} className="line-item" key={data.id}>
                        <LineItem onLineItemChange={(d) => handleLineItemChange(data.id, d)}
                                  deleteLineItem={deleteLineItem} {...data}/>

                    </Box>
                    <Divider light />
                </Box>
            ))}
            <Box mt={2}>
                <Button variant="contained"
                        onClick={addLineItem}
                        color="primary">
                    Add Item
                </Button>
                <Box component="span" ml={1}>
                    <Button ml={1} variant="contained" onClick={run} color="primary">
                        Run
                    </Button>
                </Box>
            </Box>
        </Box>
    );
};

Board.propTypes = {
    /**
     * Array of line items to possibly apply grouping changes
     */
    lineItems: PropTypes.arrayOf(PropTypes.exact({
        applyChanges: PropTypes.bool,
        color: PropTypes.string,
        id: PropTypes.number,
        groupTitle: PropTypes.string,
        matchType: PropTypes.string,
        text: PropTypes.string
    }))
};

Board.defaultProps = {
    lineItems: [],
};
