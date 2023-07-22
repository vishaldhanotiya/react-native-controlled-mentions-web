"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.replaceTriggerValues = exports.getValueFromParts = exports.parseValue = exports.getTriggerValue = exports.generateTriggerPart = exports.generatePlainTextPart = exports.generateValueWithAddedSuggestion = exports.generateValueFromMentionStateAndChangedText = exports.getTriggerPartSuggestionKeywords = exports.getKeyword = exports.getPartsInterval = exports.getConfigsArray = exports.getTypedKeys = exports.getTextLength = exports.isTriggerConfig = void 0;
const diff_1 = require("diff");
const constraints_1 = require("./constraints");
const isCustomTriggerConfig = (config) => {
    return config.pattern != null;
};
const isTriggerConfig = (config) => {
    return config.trigger != null;
};
exports.isTriggerConfig = isTriggerConfig;
const getRegexFromConfig = (config) => {
    if (isCustomTriggerConfig(config)) {
        return config.pattern;
    }
    if (isTriggerConfig(config)) {
        return constraints_1.singleGroupTriggerRegEx;
    }
    return config.pattern;
};
const getTextLength = (text) => text.length;
exports.getTextLength = getTextLength;
const getTextSubstring = (text, start, end) => text.slice(start, end);
const getPartIndexByCursor = (parts, cursor, isIncludeEnd) => {
    return parts.findIndex((one) => cursor >= one.position.start && isIncludeEnd
        ? cursor <= one.position.end
        : cursor < one.position.end);
};
/**
 * Helper that returns typed array of object's keys
 *
 * @param obj
 */
const getTypedKeys = (obj) => Object.keys(obj);
exports.getTypedKeys = getTypedKeys;
/**
 * Combines object configs into array
 *
 * @param triggersConfig
 * @param patternsConfig
 */
const getConfigsArray = (triggersConfig, patternsConfig) => {
    const triggersArray = triggersConfig
        ? getTypedKeys(triggersConfig).map((trigger) => triggersConfig[trigger])
        : [];
    const patternsArray = patternsConfig
        ? getTypedKeys(patternsConfig).map((pattern) => patternsConfig[pattern])
        : [];
    return [...triggersArray, ...patternsArray];
};
exports.getConfigsArray = getConfigsArray;
/**
 * The method for getting parts between two cursor positions.
 * ```
 * | part1 |   part2   |   part3   |
 *  a b c|d e f g h i j h k|l m n o
 *  ```
 *  We will get 3 parts here:
 *  1. Part included 'd'
 *  2. Part included 'efghij'
 *  3. Part included 'hk'
 *  Cursor will move to position after 'k'
 *
 * @param parts full part list
 * @param cursor current cursor position
 * @param count count of characters that didn't change
 */
const getPartsInterval = (parts, cursor, count) => {
    const newCursor = cursor + count;
    const currentPartIndex = getPartIndexByCursor(parts, cursor);
    const currentPart = parts[currentPartIndex];
    const newPartIndex = getPartIndexByCursor(parts, newCursor, true);
    const newPart = parts[newPartIndex];
    let partsInterval = [];
    if (!currentPart || !newPart) {
        return partsInterval;
    }
    // Push whole first affected part or sub-part of the first affected part
    if (currentPart.position.start === cursor &&
        currentPart.position.end <= newCursor) {
        partsInterval.push(currentPart);
    }
    else {
        partsInterval.push(generatePlainTextPart(getTextSubstring(currentPart.text, cursor - currentPart.position.start, cursor - currentPart.position.start + count)));
    }
    if (newPartIndex > currentPartIndex) {
        // Concat fully included parts
        partsInterval = partsInterval.concat(parts.slice(currentPartIndex + 1, newPartIndex));
        // Push whole last affected part or sub-part of the last affected part
        if (newPart.position.end === newCursor &&
            newPart.position.start >= cursor) {
            partsInterval.push(newPart);
        }
        else {
            partsInterval.push(generatePlainTextPart(getTextSubstring(newPart.text, 0, newCursor - newPart.position.start)));
        }
    }
    return partsInterval;
};
exports.getPartsInterval = getPartsInterval;
/**
 * We need to be sure, that before trigger we have at least a space or beginning of row.
 * This helper allows us to check this.
 *
 * @param text
 */
const getIsPrevPartTextSliceAcceptableForTrigger = (text) => {
    return !text || /[\s\n]/gi.test(text[text.length - 1]);
};
const getKeyword = ({ mentionState, selection, config, }) => {
    var _a, _b;
    // Check if we don't have selection range
    if (selection.end != selection.start) {
        return;
    }
    // Find the part with the cursor
    const part = mentionState.parts.find((one) => selection.end > one.position.start && selection.end <= one.position.end);
    // Check if the cursor is not in mention type part
    if (part == null || part.data != null) {
        return;
    }
    const partTextDividedByTrigger = part.text.split(config.trigger);
    // If we didn't have trigger in the part with cursor
    if (partTextDividedByTrigger.length === 0) {
        return undefined;
    }
    const cursor = selection.end;
    const firstPartTextSlice = (_a = partTextDividedByTrigger.shift()) !== null && _a !== void 0 ? _a : '';
    // We don't need to search for a keyword in the first part (before first trigger)
    // So we shifting it and calculating initial local cursor
    let localCursor = part.position.start + getTextLength(firstPartTextSlice + config.trigger);
    let keyword = undefined;
    let isPrevPartTextSliceAcceptableForTrigger = getIsPrevPartTextSliceAcceptableForTrigger(firstPartTextSlice);
    while (localCursor <= cursor) {
        const nextPartTextSlice = partTextDividedByTrigger.shift();
        if (nextPartTextSlice != null) {
            const nextPlainTextPartLength = getTextLength(nextPartTextSlice);
            localCursor += nextPlainTextPartLength;
            if (localCursor >= cursor) {
                // If we don't have space or beginning of row before string
                if (!isPrevPartTextSliceAcceptableForTrigger) {
                    return undefined;
                }
                const difference = localCursor - cursor;
                const charactersAfterTriggerLength = nextPlainTextPartLength - difference;
                const nextPartTextDividedBySpaces = getTextSubstring(nextPartTextSlice, 0, charactersAfterTriggerLength).split(' ');
                // Check if we don't have too mach spaces between trigger and cursor
                if (nextPartTextDividedBySpaces.length <=
                    ((_b = config.allowedSpacesCount) !== null && _b !== void 0 ? _b : constraints_1.DEFAULT_ALLOWED_SPACES_COUNT) + 1) {
                    keyword = getTextSubstring(nextPartTextSlice, 0, charactersAfterTriggerLength);
                }
            }
            localCursor += getTextLength(config.trigger);
            isPrevPartTextSliceAcceptableForTrigger =
                getIsPrevPartTextSliceAcceptableForTrigger(nextPartTextSlice);
        }
    }
    return keyword;
};
exports.getKeyword = getKeyword;
/**
 * Function for getting object with keyword for each mention part type
 *
 * If keyword is undefined then we don't tracking mention typing and shouldn't show suggestions.
 * If keyword is not undefined (even empty string '') then we are tracking mention typing.
 *
 * Examples where @name is just plain text yet, not mention:
 * '|abc @name dfg' - keyword is undefined
 * 'abc @| dfg' - keyword is ''
 * 'abc @name| dfg' - keyword is 'name'
 * 'abc @na|me dfg' - keyword is 'na'
 * 'abc @|name dfg' - keyword is against ''
 * 'abc @name |dfg' - keyword is 'name '
 * 'abc @name dfg|' - keyword is 'name dfg'
 * 'abc @name dfg |' - keyword is undefined (we have more than one space)
 * 'abc @name dfg he|' - keyword is undefined (we have more than one space)
 *
 * // ToDo — refactor to object params
 */
const getTriggerPartSuggestionKeywords = (mentionState, selection, triggersConfig, onChange = () => { }) => {
    const keywordByTrigger = {};
    getTypedKeys(triggersConfig).forEach((triggerName) => {
        const config = triggersConfig[triggerName];
        keywordByTrigger[triggerName] = {
            keyword: undefined,
            /**
             * Callback on mention suggestion press. We should:
             * - Get updated value
             * - Trigger onChange callback with new value
             *
             * @param suggestion
             */
            onSelect: (suggestion) => {
                const newValue = generateValueWithAddedSuggestion(mentionState, selection, config, suggestion);
                if (!newValue) {
                    return;
                }
                onChange(newValue);
                /**
                 * ToDo — test is this still not working
                 *
                 * Move cursor to the end of just added mention starting from trigger string and including:
                 * - Length of trigger string
                 * - Length of mention name
                 * - Length of space after mention (1)
                 *
                 * Not working now due to the RN bug
                 */
                // const newCursorPosition = currentPart.position.start + triggerPartIndex + trigger.length +
                // suggestion.name.length + 1;
                // textInput.current?.setNativeProps({selection: {start: newCursorPosition, end: newCursorPosition}});
            },
        };
        keywordByTrigger[triggerName].keyword = getKeyword({
            mentionState,
            selection,
            config,
        });
    });
    return keywordByTrigger;
};
exports.getTriggerPartSuggestionKeywords = getTriggerPartSuggestionKeywords;
/**
 * Generates new value when we are changing text.
 *
 * @param mentionState
 * @param changedText changed plain text
 */
const generateValueFromMentionStateAndChangedText = (mentionState, changedText) => {
    const { parts, plainText } = mentionState;
    const changes = diff_1.diffChars(plainText, changedText);
    let newParts = [];
    let cursor = 0;
    changes.forEach((change) => {
        switch (true) {
            /**
             * We should:
             * - Move cursor forward on the changed text length
             */
            case change.removed: {
                cursor += change.count;
                break;
            }
            /**
             * We should:
             * - Push new part to the parts with that new text
             */
            case change.added: {
                newParts.push(generatePlainTextPart(change.value));
                break;
            }
            /**
             * We should concat parts that didn't change.
             * - In case when we have only one affected part we should push only that one sub-part
             * - In case we have two affected parts we should push first
             */
            default: {
                if (change.count !== 0) {
                    newParts = newParts.concat(getPartsInterval(parts, cursor, change.count));
                    cursor += change.count;
                }
                break;
            }
        }
    });
    return getValueFromParts(newParts);
};
exports.generateValueFromMentionStateAndChangedText = generateValueFromMentionStateAndChangedText;
/**
 * Method for adding suggestion to the parts and generating value. We should:
 * - Find part with plain text where we were tracking mention typing using selection state
 * - Split the part to next parts:
 * -* Before new mention
 * -* With new mention
 * -* After mention with space at the beginning
 * - Generate new parts array and convert it to value
 *
 * @param mentionState - current mention state with parts and plainText
 * @param selection - current selection
 * @param triggerConfig - actually the mention type
 * @param suggestion - suggestion that should be added
 */
const generateValueWithAddedSuggestion = (mentionState, selection, triggerConfig, suggestion) => {
    var _a;
    const { parts, plainText } = mentionState;
    const currentPartIndex = parts.findIndex((one) => selection.end >= one.position.start && selection.end <= one.position.end);
    const currentPart = parts[currentPartIndex];
    if (!currentPart) {
        return;
    }
    const triggerPartIndex = currentPart.text.lastIndexOf(triggerConfig.trigger, selection.end - currentPart.position.start);
    const newMentionPartPosition = {
        start: triggerPartIndex,
        end: selection.end - currentPart.position.start,
    };
    const isInsertSpaceToNextPart = triggerConfig.isInsertSpaceAfterMention &&
        // Cursor is at the very end of parts or text row
        (getTextLength(plainText) === selection.end || ((_a = parts[currentPartIndex]) === null || _a === void 0 ? void 0 : _a.text.startsWith('\n', newMentionPartPosition.end)));
    return getValueFromParts([
        ...parts.slice(0, currentPartIndex),
        // Create part with string before mention
        generatePlainTextPart(getTextSubstring(currentPart.text, 0, newMentionPartPosition.start)),
        generateTriggerPart(triggerConfig, Object.assign({ original: getTriggerValue(triggerConfig, suggestion), trigger: triggerConfig.trigger }, suggestion)),
        // Create part with rest of string after mention and add a space if needed
        generatePlainTextPart(`${isInsertSpaceToNextPart ? ' ' : ''}${getTextSubstring(currentPart.text, newMentionPartPosition.end)}`),
        ...parts.slice(currentPartIndex + 1),
    ]);
};
exports.generateValueWithAddedSuggestion = generateValueWithAddedSuggestion;
/**
 * Method for generating part for plain text
 *
 * @param text - plain text that will be added to the part
 * @param positionOffset - position offset from the very beginning of text
 */
const generatePlainTextPart = (text, positionOffset = 0) => ({
    text,
    position: {
        start: positionOffset,
        end: positionOffset + getTextLength(text),
    },
});
exports.generatePlainTextPart = generatePlainTextPart;
/**
 * Method for generating part for mention
 *
 * @param triggerConfig
 * @param triggerData - mention data
 * @param positionOffset - position offset from the very beginning of text
 */
const generateTriggerPart = (triggerConfig, triggerData, positionOffset = 0) => {
    const text = getTriggerPlainString(triggerConfig, triggerData);
    return {
        text,
        position: {
            start: positionOffset,
            end: positionOffset + getTextLength(text),
        },
        config: triggerConfig,
        data: triggerData,
    };
};
exports.generateTriggerPart = generateTriggerPart;
/**
 * Generates part for matched regex result
 *
 * @param config - current part type (pattern or mention)
 * @param matchPlainText
 * @param positionOffset - position offset from the very beginning of text
 */
const generateRegexResultPart = (config, matchPlainText, positionOffset = 0) => ({
    text: matchPlainText,
    position: {
        start: positionOffset,
        end: positionOffset + getTextLength(matchPlainText),
    },
    config,
});
/**
 * Method for generation mention value that accepts mention regex
 *
 * @param triggerConfig
 * @param suggestion
 */
const getTriggerValue = (triggerConfig, suggestion) => {
    if (isCustomTriggerConfig(triggerConfig)) {
        return triggerConfig.getTriggerValue(suggestion);
    }
    return `{${triggerConfig.trigger}}[${suggestion.name}](${suggestion.id})`;
};
exports.getTriggerValue = getTriggerValue;
const getTriggerPlainString = (config, triggerData) => {
    if (config.getPlainString != null) {
        return config.getPlainString(triggerData);
    }
    return `${config.trigger}${triggerData.name}`;
};
const getMentionDataFromRegExMatchResult = ([, original, trigger, name, id,]) => ({
    original,
    trigger,
    name,
    id,
});
// ToDo – write own logic for parsing mention match
const getMentionDataFromRegExMatch = (matchPlainText) => {
    const regexExecResult = constraints_1.triggerRegEx.exec(matchPlainText);
    return regexExecResult
        ? getMentionDataFromRegExMatchResult(regexExecResult)
        : null;
};
/**
 * Recursive function for deep parse MentionInput's value and get plainText with parts
 *
 * ToDo – move all utility helpers to a class
 * @param value - the MentionInput's value
 * @param configs - All provided part types
 * @param positionOffset - offset from the very beginning of plain text
 */
const parseValue = (value, configs, positionOffset = 0) => {
    if (value == null) {
        value = '';
    }
    let plainText = '';
    let parts = [];
    // We don't have any part types so adding just plain text part
    if (configs.length === 0) {
        plainText += value;
        parts.push(generatePlainTextPart(value, positionOffset));
    }
    else {
        const [config, ...restConfigs] = configs;
        // It's important to use regex with one group that includes complete mention part
        const regex = getRegexFromConfig(config);
        // We are dividing value by regex with one whole mention group
        // Each odd item will be matching value
        const dividedValueByRegex = value.split(regex);
        // In case when we have only one element in array – matches are not present in this text
        // So continue parsing value with rest part types
        if (dividedValueByRegex.length === 1) {
            return parseValue(value, restConfigs, positionOffset);
        }
        const textBeforeFirstMatch = dividedValueByRegex[0];
        // In case when we have some text before matched part parsing the text with rest part types
        if (textBeforeFirstMatch) {
            const plainTextAndParts = parseValue(textBeforeFirstMatch, restConfigs, positionOffset);
            parts = parts.concat(plainTextAndParts.parts);
            plainText += plainTextAndParts.plainText;
        }
        for (let i = 1; i < dividedValueByRegex.length; i += 2) {
            const nextMatchValue = dividedValueByRegex[i];
            if (isTriggerConfig(config)) {
                const getTriggerData = isCustomTriggerConfig(config)
                    ? config.getTriggerData
                    : getMentionDataFromRegExMatch;
                const triggerData = getTriggerData(nextMatchValue);
                // We are generating trigger part:
                // - When we have parsed mention data
                // - When this data relates to needed trigger
                if (triggerData != null && triggerData.trigger === config.trigger) {
                    const part = generateTriggerPart(config, triggerData, positionOffset + getTextLength(plainText));
                    parts.push(part);
                    plainText += part.text;
                    // In other cases we should parse the mention with rest part types
                }
                else {
                    const plainTextAndParts = parseValue(nextMatchValue, restConfigs, positionOffset + getTextLength(plainText));
                    parts = parts.concat(plainTextAndParts.parts);
                    plainText += plainTextAndParts.plainText;
                }
            }
            else {
                const part = generateRegexResultPart(config, nextMatchValue, positionOffset + getTextLength(plainText));
                parts.push(part);
                plainText += part.text;
            }
            const textAfterMatch = dividedValueByRegex[i + 1];
            // Check if we have a text after last matched part
            // We should parse the text with rest part types
            if (textAfterMatch) {
                const plainTextAndParts = parseValue(textAfterMatch, restConfigs, positionOffset + getTextLength(plainText));
                parts = parts.concat(plainTextAndParts.parts);
                plainText += plainTextAndParts.plainText;
            }
        }
    }
    // Exiting from parseValue
    return {
        plainText,
        parts,
    };
};
exports.parseValue = parseValue;
/**
 * Function for generation value from parts array
 *
 * @param parts
 */
const getValueFromParts = (parts) => parts.map((item) => (item.data ? item.data.original : item.text)).join('');
exports.getValueFromParts = getValueFromParts;
/**
 * Replace all mention values in value to some specified format
 *
 * @param value - value that is generated by MentionInput component
 * @param replacer - function that takes mention object as parameter and returns string
 */
const replaceTriggerValues = (value, replacer) => value.replace(RegExp(constraints_1.triggerRegEx, 'g'), (fullMatch, original, trigger, name, id) => replacer({
    original,
    trigger,
    name,
    id,
}));
exports.replaceTriggerValues = replaceTriggerValues;
