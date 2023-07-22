"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MentionInput = void 0;
const react_1 = __importStar(require("react"));
const react_native_1 = require("react-native");
const utils_1 = require("../utils");
const helpers_1 = require("../utils/helpers");
const MentionInput = (_a) => {
    var { value, onChange, partTypes = [], inputRef: propInputRef, containerStyle, onSelectionChange } = _a, textInputProps = __rest(_a, ["value", "onChange", "partTypes", "inputRef", "containerStyle", "onSelectionChange"]);
    const textInput = react_1.useRef(null);
    const [height, setHeight] = react_1.useState(null);
    const [selection, setSelection] = react_1.useState({ start: 0, end: 0 });
    const { plainText, parts } = react_1.useMemo(() => helpers_1.parseValue(value, partTypes), [value, partTypes]);
    const handleSelectionChange = (event) => {
        setSelection(event.nativeEvent.selection);
        onSelectionChange && onSelectionChange(event);
    };
    /**
     * Callback that trigger on TextInput text change
     *
     * @param changedText
     */
    const onChangeInput = (changedText) => {
        onChange(utils_1.generateValueFromPartsAndChangedText(parts, plainText, changedText));
    };
    /**
     * We memoize the keyword to know should we show mention suggestions or not
     */
    const keywordByTrigger = react_1.useMemo(() => {
        return utils_1.getMentionPartSuggestionKeywords(parts, plainText, selection, partTypes);
    }, [parts, plainText, selection, partTypes]);
    /**
     * Callback on mention suggestion press. We should:
     * - Get updated value
     * - Trigger onChange callback with new value
     */
    const onSuggestionPress = (mentionType, keyword) => (suggestion) => {
        var _a;
        const newValue = utils_1.generateValueWithAddedSuggestion(parts, mentionType, plainText, selection, suggestion);
        if (!newValue) {
            return;
        }
        onChange(newValue.trimEnd() + " ");
        /**
         * Refocus on the input that was just blurred by a click event on PLATFORM.OS web
         * Not an issue for PLATFORM.OS ios|android because keyboard events are not handled
         */
        if (react_native_1.Platform.OS === 'web') {
            (_a = textInput.current) === null || _a === void 0 ? void 0 : _a.focus();
            /**
             * Move cursor to the end of just added mention - especially important for PLATFORM.OS web:
             * - Previous selection position
             * + Length of mention name
             * - Length of trigger string
             * - Keyword text (i.e. "mi" for @Mike)
             * +? Length of space after mention (1)
             */
            const newCursorPosition = selection.start +
                suggestion.name.length -
                mentionType.trigger.length -
                keyword.length +
                (mentionType.isInsertSpaceAfterMention ? 1 : 0) +
                1;
            setSelection({ start: newCursorPosition, end: newCursorPosition }); //<TextInput selection doesn't seem to work on mobile
        }
    };
    const handleTextInputRef = (ref) => {
        textInput.current = ref;
        if (propInputRef) {
            if (typeof propInputRef === 'function') {
                propInputRef(ref);
            }
            else {
                propInputRef.current =
                    ref;
            }
        }
    };
    const renderMentionSuggestions = (mentionType) => (react_1.default.createElement(react_1.default.Fragment, { key: mentionType.trigger }, mentionType.renderSuggestions &&
        mentionType.renderSuggestions({
            keyword: keywordByTrigger[mentionType.trigger],
            onSuggestionPress: onSuggestionPress(mentionType, keywordByTrigger[mentionType.trigger] || ''),
        })));
    const onHeightChange = (e) => {
        setHeight(e.nativeEvent.contentSize.height);
    };
    return (react_1.default.createElement(react_native_1.View, { style: containerStyle },
        react_1.default.createElement(react_native_1.View, { style: { position: 'absolute' } }, partTypes.filter((one) => utils_1.isMentionPartType(one) && one.renderSuggestions != null).map(renderMentionSuggestions)),
        react_1.default.createElement(react_native_1.View, { style: { maxHeight: 120 } },
            react_1.default.createElement(react_native_1.TextInput, Object.assign({}, textInputProps, { onContentSizeChange: (e) => onHeightChange(e), value: plainText, style: [
                    textInputProps.style,
                    {
                        backgroundColor: 'transparent',
                        height: plainText.length == 0 ? 40 : height,
                    },
                ], ref: handleTextInputRef, multiline: true }, (react_native_1.Platform.OS === 'web' ? { selection } : {}), { onChangeText: onChangeInput, onSelectionChange: handleSelectionChange })))));
};
exports.MentionInput = MentionInput;
