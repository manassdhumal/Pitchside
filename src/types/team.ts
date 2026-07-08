export type Formation =
  | '4-3-3' | '4-4-2' | '4-2-3-1' | '4-5-1' | '3-4-3' | '3-5-2' | '5-4-1'
  | '4-1-2-1-2' | '4-4-1-1' | '5-3-2' | '3-4-1-2' | '4-2-2-2';

export interface CrestConfig {
  shape: string;
  primaryColor: string;
  secondaryColor: string;
  icon: string;
}

export interface Team {
  id: string;
  name: string;
  shortName: string;
  country: string;
  crest: CrestConfig;
  colors: { primary: string; secondary: string };
  founded?: number;
  squad: string[];
  formation: Formation;
  isUserCreated: boolean;
  isProcedural: boolean;
}
