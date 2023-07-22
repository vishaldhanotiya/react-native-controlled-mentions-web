import type { Change } from 'diff';
import type { ReactNode, Ref } from 'react';
import type {
  StyleProp,
  TextInput,
  TextInputProps,
  TextStyle,
  ViewStyle,
} from 'react-native';

type Suggestion = {
  id: string;
  name: string;
};

type MentionData = {
  original: string;
  trigger: string;
  name: string;
  id: string;
};

type CharactersDiffChange = Omit<Change, 'count'> & { count: number };

type RegexMatchResult = string[] & {
  // Matched string
  0: string;

  // original
  1: string;

  // trigger
  2: string;

  // name
  3: string;

  // id
  4: string;

  // Start position of matched text in whole string
  index: number;

  // Group names (duplicates MentionData type)
  groups: MentionData;
};

type RegexMatchResultWeb = string[] & {
  // Matched string
  0: string;

  // original
  1: string;

  // trigger
  2: string;

  // name
  3: string;

  // id
  4: string;

  // Start position of matched text in whole string
  index: number;

  // Group names (duplicates MentionData type)
  groups: TriggerData;
};

// The same as text selection state
type Position = {
  start: number;
  end: number;
};

type MentionSuggestionsProps = {
  keyword: string | undefined;
  onSuggestionPress: (suggestion: Suggestion) => void;
};

type MentionPartType = {
  // single trigger character eg '@' or '#'
  trigger: string;

  // Function for render suggestions
  renderSuggestions?: (props: MentionSuggestionsProps) => ReactNode;

  // How much spaces are allowed for mention keyword
  allowedSpacesCount?: number;

  // Should we add a space after selected mentions if the mention is at the end of row
  isInsertSpaceAfterMention?: boolean;

  // Should we render either at the top or bottom of the input
  isBottomMentionSuggestionsRender?: boolean;

  // Custom mention styles in text input
  textStyle?: StyleProp<TextStyle>;

  // Plain string generator for mention
  getPlainString?: (mention: MentionData) => string;
};

type PatternPartType = {
  // RexExp with global flag
  pattern: RegExp;

  textStyle?: StyleProp<TextStyle>;
};

type PartType = MentionPartType | PatternPartType;

type Part = {
  text: string;
  position: Position;

  partType?: PartType;
  config?: Config | undefined;

  data?: MentionData;
};

type MentionInputProps = Omit<TextInputProps, 'onChange'> & {
  value: string;
  onChange: (value: string) => any;

  partTypes?: PartType[];

  inputRef?: Ref<TextInput>;

  containerStyle?: StyleProp<ViewStyle>;
};

type TriggerData = {
  original: string;
  trigger: string;
  name: string;
  id: string;
};

/**
 * Props that we can provide to the suggestions components
 */
type SuggestionsProvidedProps = {
  // current keyword for the trigger
  keyword?: string;
  // callback for selecting a suggestion
  onSelect: (suggestion: Suggestion) => void;
};

type TriggerConfigBase = {
  // Should be resolved in custom regex feature
  // Trigger characters eg '@', '@@' or '#'
  trigger: string;

  // How many spaces are allowed for mention keyword
  allowedSpacesCount?: number;

  // Should we add a space after selected mentions if the mention is at the end of row
  isInsertSpaceAfterMention?: boolean;

  // Custom mention styles in text input
  textStyle?: StyleProp<TextStyle>;

  // Plain string generator for mention
  getPlainString?: (mention: TriggerData) => string;
};

type DefaultTriggerConfig = TriggerConfigBase;

type CustomTriggerConfig = TriggerConfigBase & {
  pattern: RegExp;

  getTriggerData: (regexMatch: string) => TriggerData;

  getTriggerValue: (suggestion: Suggestion) => string;
};

type TriggerConfig = DefaultTriggerConfig | CustomTriggerConfig;

type PatternConfig = {
  // RexExp with global flag
  pattern: RegExp;

  textStyle?: StyleProp<TextStyle>;
};

type Config = TriggerConfig | PatternConfig;

/**
 * Config of trigger part types
 */
type TriggersConfig<TriggerName extends string> = Record<
  TriggerName,
  TriggerConfig
>;

/**
 * Config of pattern part types that can highlight some matches in the `TextInput`
 */
type PatternsConfig = Record<string, PatternConfig>;

type MentionState = { plainText: string; parts: Part[] };

type Triggers<TriggerName extends string> = Record<
  TriggerName,
  SuggestionsProvidedProps
>;

type UseMentionsConfig<TriggerName extends string> = {
  value: string;
  onChange: (value: string) => void;

  // IMPORTANT! We need to memoize this prop externally
  triggersConfig?: TriggersConfig<TriggerName>;

  // IMPORTANT! We need to memoize this prop externally
  patternsConfig?: PatternsConfig;

  onSelectionChange?: (selection: Position) => void;
};

export type {
  Suggestion,
  MentionData,
  CharactersDiffChange,
  RegexMatchResult,
  RegexMatchResultWeb,
  Position,
  PatternsConfig,
  TriggersConfig,
  Part,
  MentionSuggestionsProps,
  MentionPartType,
  PatternPartType,
  PartType,
  MentionInputProps,
  TriggerData,
  SuggestionsProvidedProps,
  DefaultTriggerConfig,
  CustomTriggerConfig,
  TriggerConfig,
  PatternConfig,
  Config,
  MentionState,
  Triggers,
  UseMentionsConfig,
};
