export interface UsersResponse {}
export interface UserObject {
    id: number;
    name: string;
    algoRating: number;
    heuristicRating: number;
    country: string;
    lastContestTime: string;
}
export interface UserDetailResponse {
    id: number;
    name: string;
    algoRating: number;
    heuristicRating: number;
    algoAPerf: number;
    heuristicAPerf: number;
    country: string;
    lastContestTime: string;
}
