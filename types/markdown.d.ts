declare module 'react-native-syntax-highlighter' {
  import * as React from 'react';
  export interface SyntaxHighlighterProps {
    language?: string;
    style?: any;
    highlighter?: 'hljs' | 'prism';
    customStyle?: any;
    children?: string;
  }
  const SyntaxHighlighter: React.ComponentType<SyntaxHighlighterProps>;
  export default SyntaxHighlighter;
}

declare module 'react-syntax-highlighter/styles/hljs' {
  export const atomOneDark: any;
  export const github: any;
}

