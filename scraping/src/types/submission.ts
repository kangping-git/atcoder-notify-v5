export enum SubmissionResult {
  AC = 'AC',
  WA = 'WA',
  TLE = 'TLE',
  MLE = 'MLE',
  RE = 'RE',
  CE = 'CE',
  OLE = 'OLE',
  IE = 'IE',
  WR = 'WR',
  Judging = 'Judging',
}
export interface Submission {
  id: string;
  contestId: string;
  problemId: string;
  userId: string;
  language: string;
  score: number;
  code_length: number;
  result: SubmissionResult;
  time: number; // ms
  memory: number; // KB
}
