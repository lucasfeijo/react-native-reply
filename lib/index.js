"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.useMentionsInput = void 0;
var react_1 = require("react");
var react_native_1 = require("react-native");
var utils_1 = require("./utils");
var defaultProps = {
    trigger: '@',
};
var defaultState = {
    mentionsMap: new Map(),
    formattedText: [],
    inputText: '',
    isTracking: false,
    keyword: '',
    selection: {
        start: 0,
        end: 0,
    },
};
exports.useMentionsInput = function (props) {
    if (props === void 0) { props = defaultProps; }
    var _a = react_1.useState(__assign({}, defaultState)), state = _a[0], setState = _a[1];
    var setRawText = function (t) {
        var newState = __assign({}, defaultState);
        var newMaps = utils_1.default.getMentionsWithInputText(t);
        if (!newMaps) {
            setState(newState);
            return;
        }
        var map = newMaps.map, newValue = newMaps.newValue;
        newState.mentionsMap = map;
        newState.inputText = newValue;
        newState.formattedText = formatText(newState);
        newState.selection = {
            start: t.length - 1,
            end: t.length - 1,
        };
        setState(newState);
    };
    var getInitialAndRemainingStrings = function (inputText, menIndex) {
        /**
         * extractInitialAndRemainingStrings
         * this function extract the initialStr and remainingStr
         * at the point of new Mention string.
         * Also updates the remaining string if there
         * are any adjcent mentions text with the new one.
         */
        var initialStr = inputText.substr(0, menIndex).trim();
        if (!utils_1.default.isEmpty(initialStr)) {
            initialStr = initialStr + " ";
        }
        /**
         * remove the characters adjcent with @ sign
         * and extract the remaining part
         */
        var remStr = inputText
            .substr(menIndex + 1)
            .replace(/\s+/, '\x01')
            .split('\x01')[1] || '';
        /**
         * check if there are any adjecent mentions
         * subtracted in current selection.
         * add the adjcent mentions
         * @tim@nic
         * add nic back
         */
        var adjMentIndexes = {
            start: initialStr.length - 1,
            end: inputText.length - remStr.length - 1,
        };
        var mentionKeys = utils_1.default.getSelectedMentionKeys(state.mentionsMap, adjMentIndexes);
        mentionKeys.forEach(function (key) {
            remStr = "@" + state.mentionsMap.get(key).username + " " + remStr;
        });
        return {
            initialStr: initialStr,
            remStr: remStr,
        };
    };
    var onSuggestionPick = function (user) {
        var _a = getInitialAndRemainingStrings(state.inputText, state.mentionPosition), initialStr = _a.initialStr, remStr = _a.remStr;
        var username = "@" + user.username;
        var text = "" + initialStr + username + " " + remStr;
        // '@[__display__](__id__)' ///find this trigger parsing from react-mentions
        // set the mentions in the map.
        var menStartIndex = initialStr.length;
        var menEndIndex = menStartIndex + (username.length - 1);
        state.mentionsMap.set([menStartIndex, menEndIndex], user);
        // update remaining mentions indexes
        var charAdded = Math.abs(text.length - state.inputText.length);
        var mentionsMap = updatedMentionsMap(state, {
            start: menEndIndex + 1,
            end: text.length,
        }, charAdded, true);
        setState(__assign(__assign({}, state), { mentionsMap: mentionsMap, inputText: text, formattedText: formatText(state), isTracking: false }));
    };
    var updatedMentionsMap = function (currentState, selection, count, shouldAdd) {
        return utils_1.default.updateRemainingMentionsIndexes(currentState.mentionsMap, selection, count, shouldAdd);
    };
    var checkForMention = function (currentState, inputText, selection) {
        var newState = __assign({}, currentState);
        /**
         * Open mentions list if user
         * start typing @ in the string anywhere.
         */
        var mentionIndex = selection.start - 1;
        var lastChar = inputText.substr(mentionIndex, 1);
        if (lastChar === props.trigger) {
            newState.mentionPosition = mentionIndex;
            newState.isTracking = true;
            newState.keyword = '';
        }
        else if (lastChar.trim() === '' && newState.isTracking) {
            newState.isTracking = false;
        }
        /**
         * filter the mentions list
         * according to what user type with
         * @ char e.g. @billroy
         */
        if (newState.isTracking && typeof newState.mentionPosition !== 'undefined') {
            var pattern = new RegExp("\\" + props.trigger + "[a-z0-9_-]+|\\" + props.trigger, 'i');
            var str = inputText.substr(newState.mentionPosition);
            var keywordArray = str.match(pattern);
            if (keywordArray && !!keywordArray.length) {
                var lastKeyword = keywordArray[keywordArray.length - 1];
                newState.keyword = lastKeyword;
            }
        }
        return newState;
    };
    var onSelectionChange = function (_a) {
        var selection = _a.nativeEvent.selection;
        var prevSelc = state.selection;
        var newSelc = __assign({}, selection);
        if (newSelc.start !== newSelc.end) {
            newSelc = utils_1.default.addMenInSelection(newSelc, prevSelc, state.mentionsMap);
        }
        setState(__assign(__assign({}, state), { selection: newSelc }));
    };
    var formatMentionNode = function (user, pos) {
        if (props.renderMention) {
            return props.renderMention(user, pos);
        }
        // Default style:
        return (react_1.default.createElement(react_native_1.Text, { key: pos.start + "-" + user.id + "-" + pos.end, style: styles.mention }, "@" + user.username));
    };
    /**
     * Get current input text with styled mentions.
     * @param state The current state
     * @param renderMention The adapter function to style a mention.
     *  When null, applies some default style.
     */
    var formatText = function (_a, renderMention) {
        var inputText = _a.inputText, mentionsMap = _a.mentionsMap;
        if (renderMention === void 0) { renderMention = formatMentionNode; }
        if (inputText === '' || !mentionsMap.size)
            return [inputText];
        var formattedText = [];
        var lastIndex = 0;
        mentionsMap.forEach(function (user, _a) {
            var start = _a[0], end = _a[1];
            var initialStr = start === 1 ? '' : inputText.substring(lastIndex, start);
            lastIndex = end + 1;
            if (initialStr && initialStr.length > 0)
                formattedText.push(initialStr);
            var formattedMention = renderMention(user, { start: start, end: end });
            formattedText.push(formattedMention);
            if (utils_1.default.isKeysAreSame(utils_1.default.getLastKeyInMap(mentionsMap), [start, end])) {
                var lastStr = inputText.substr(lastIndex); // remaining string
                formattedText.push(lastStr);
            }
        });
        return formattedText;
    };
    var onChangeText = function (text) {
        var newState = __assign({}, state);
        var prevText = newState.inputText;
        var selection = newState.selection;
        if (text.length < prevText.length) {
            /**
             * if user is back pressing and it
             * deletes the mention remove it from
             * actual string.
             */
            var charDeleted = Math.abs(text.length - prevText.length);
            var totalSelection = {
                start: selection.start,
                end: charDeleted > 1 ? selection.start + charDeleted : selection.start,
            };
            /**
             * Remove all the selected mentions
             */
            if (totalSelection.start === totalSelection.end) {
                // single char deleting
                var key = utils_1.default.findMentionKeyInMap(newState.mentionsMap, totalSelection.start);
                if (key && key.length) {
                    newState.mentionsMap.delete(key);
                    /**
                     * don't need to worry about multi-char selection
                     * because our selection automatically select the
                     * whole mention string.
                     */
                    var initial = text.substring(0, key[0]); // mention start index
                    text = initial + text.substr(key[1]); // mentions end index
                    charDeleted = charDeleted + Math.abs(key[0] - key[1]); // 1 is already added in the charDeleted
                    newState.mentionsMap.delete(key);
                }
            }
            else {
                // multi-char deleted
                var mentionKeys = utils_1.default.getSelectedMentionKeys(newState.mentionsMap, totalSelection);
                mentionKeys.forEach(function (key) {
                    newState.mentionsMap.delete(key);
                });
            }
            /**
             * update indexes on charcters remove
             * no need to worry about totalSelection End.
             * We already removed deleted mentions from the actual string.
             */
            newState.mentionsMap = updatedMentionsMap(newState, {
                start: selection.end,
                end: prevText.length,
            }, charDeleted, false);
        }
        else {
            // update indexes on new charcter add
            var charAdded = Math.abs(text.length - prevText.length);
            newState.mentionsMap = updatedMentionsMap(newState, {
                start: selection.end,
                end: text.length,
            }, charAdded, true);
            /**
             * if user type anything on the mention
             * remove the mention from the mentions array
             */
            if (selection.start === selection.end) {
                var key = utils_1.default.findMentionKeyInMap(newState.mentionsMap, selection.start - 1);
                if (key && key.length) {
                    newState.mentionsMap.delete(key);
                }
            }
        }
        newState.inputText = text;
        newState.formattedText = formatText(newState);
        newState = checkForMention(newState, text, selection);
        setState(newState);
    };
    var rawText = formatText(state, function (user) { return "@[" + user.username + "](id:" + user.id + ")"; }).join('');
    return [
        {
            children: state.formattedText,
            onChangeText: onChangeText,
            onSelectionChange: onSelectionChange,
            selection: state.selection,
        },
        {
            isTracking: state.isTracking,
            keyword: state.keyword,
            onSuggestionPick: onSuggestionPick,
            inputText: state.inputText,
            rawText: rawText,
            setRawText: setRawText,
        },
    ];
};
var styles = react_native_1.StyleSheet.create({
    mention: {
        fontSize: 16,
        fontWeight: '400',
        backgroundColor: 'rgba(36, 77, 201, 0.05)',
        color: '#244dc9',
    },
});
