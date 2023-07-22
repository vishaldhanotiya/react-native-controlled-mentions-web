import React, { FC, MutableRefObject, useMemo, useRef, useState } from 'react';
import {
  NativeSyntheticEvent,
  TextInput,
  TextInputSelectionChangeEventData,
  View,
  Platform,
} from 'react-native';

import { MentionInputProps, MentionPartType, Suggestion } from '../types';
import {
  generateValueFromPartsAndChangedText,
  generateValueWithAddedSuggestion,
  getMentionPartSuggestionKeywords,
  isMentionPartType,
  parseValue,
} from '../utils';

const MentionInput: FC<MentionInputProps> = ({
  value,
  onChange,
  partTypes = [],
  inputRef: propInputRef,
  containerStyle,
  onSelectionChange,
  ...textInputProps
}) => {
  const textInput = useRef<TextInput | null>(null);
  const [height, setHeight] = useState(null);

  const [selection, setSelection] = useState({ start: 0, end: 0 });

  const { plainText, parts } = useMemo(
    () => parseValue(value, partTypes),
    [value, partTypes]
  );

  const handleSelectionChange = (
    event: NativeSyntheticEvent<TextInputSelectionChangeEventData>
  ) => {
    setSelection(event.nativeEvent.selection);
    onSelectionChange && onSelectionChange(event);
  };

  /**
   * Callback that trigger on TextInput text change
   *
   * @param changedText
   */
  const onChangeInput = (changedText: string) => {
    onChange(
      generateValueFromPartsAndChangedText(parts, plainText, changedText)
    );
  };

  /**
   * We memoize the keyword to know should we show mention suggestions or not
   */
  const keywordByTrigger = useMemo(() => {
    return getMentionPartSuggestionKeywords(
      parts,
      plainText,
      selection,
      partTypes
    );
  }, [parts, plainText, selection, partTypes]);

  /**
   * Callback on mention suggestion press. We should:
   * - Get updated value
   * - Trigger onChange callback with new value
   */
  const onSuggestionPress =
    (mentionType: MentionPartType, keyword: string) =>
    (suggestion: Suggestion) => {
      const newValue = generateValueWithAddedSuggestion(
        parts,
        mentionType,
        plainText,
        selection,
        suggestion
      );
      if (!newValue) {
        return;
      }

      onChange(newValue.trimEnd());

      /**
       * Refocus on the input that was just blurred by a click event on PLATFORM.OS web
       * Not an issue for PLATFORM.OS ios|android because keyboard events are not handled
       */
      if (Platform.OS === 'web') {
        textInput.current?.focus();

        /**
         * Move cursor to the end of just added mention - especially important for PLATFORM.OS web:
         * - Previous selection position
         * + Length of mention name
         * - Length of trigger string
         * - Keyword text (i.e. "mi" for @Mike)
         * +? Length of space after mention (1)
         */
        const newCursorPosition =
          selection.start +
          suggestion.name.length -
          mentionType.trigger.length -
          keyword.length +
          (mentionType.isInsertSpaceAfterMention ? 1 : 0) +
          1;

        setSelection({ start: newCursorPosition, end: newCursorPosition }); //<TextInput selection doesn't seem to work on mobile
      }
    };

  const handleTextInputRef = (ref: TextInput) => {
    textInput.current = ref as TextInput;

    if (propInputRef) {
      if (typeof propInputRef === 'function') {
        propInputRef(ref);
      } else {
        (propInputRef as MutableRefObject<TextInput>).current =
          ref as TextInput;
      }
    }
  };

  const renderMentionSuggestions = (mentionType: MentionPartType) => (
    <React.Fragment key={mentionType.trigger}>
      {mentionType.renderSuggestions &&
        mentionType.renderSuggestions({
          keyword: keywordByTrigger[mentionType.trigger],
          onSuggestionPress: onSuggestionPress(
            mentionType,
            keywordByTrigger[mentionType.trigger] || ''
          ),
        })}
    </React.Fragment>
  );

  const onHeightChange = (e: any) => {
    setHeight(e.nativeEvent.contentSize.height);
  };

  return (
    <View style={containerStyle}>
      <View style={{ position: 'absolute' }}>
        {(
          partTypes.filter(
            (one) => isMentionPartType(one) && one.renderSuggestions != null
          ) as MentionPartType[]
        ).map(renderMentionSuggestions)}
      </View>
      <View style={{ maxHeight: 120 }}>
        <TextInput
          {...textInputProps}
          onContentSizeChange={(e) => onHeightChange(e)}
          value={plainText}
          style={[
            textInputProps.style,
            {
              backgroundColor: 'transparent',
              height: plainText.length == 0 ? 40 : height,
            },
          ]}
          ref={handleTextInputRef}
          multiline
          {...(Platform.OS === 'web' ? { selection } : {})}
          onChangeText={onChangeInput}
          onSelectionChange={handleSelectionChange}
        />
      </View>
    </View>
  );
};

export { MentionInput };
