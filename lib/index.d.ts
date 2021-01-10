import { TextInputProps } from 'react-native';
declare type InputProps = {
    renderMention?: (user: User, pos: Selection) => Renderable;
    trigger: string;
};
declare type Selection = {
    start: number;
    end: number;
};
declare type User = {
    id: string;
    name: string;
    username: string;
};
declare type Renderable = string | JSX.Element;
declare type MentionsInputReturn = [TextInputProps & {
    children: Renderable | Renderable[];
}, {
    isMentioning: boolean;
    keyword: string;
    onSuggestionPick: (user: User) => void;
    inputText: string;
    rawText: string;
    setRawText: (t: string) => void;
}];
export declare const useMentionsInput: (props?: InputProps) => MentionsInputReturn;
export {};
