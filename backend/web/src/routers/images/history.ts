import { BaseHistoryGraph } from './baseHistoryGraph';
import { PerformanceGraphFeature } from './features/PerformanceGraphFeature';
import { SubmissionGraphFeature } from './features/SubmissionGraphFeature';

export async function getHistoryImage(
    userName: string,
    isHeuristic: boolean,
    withPerformance = false,
    withSubmissions = false,
) {
    const graph = new BaseHistoryGraph({ userName, isHeuristic });

    if (withPerformance) graph.addFeature(new PerformanceGraphFeature(graph));
    if (withSubmissions) graph.addFeature(new SubmissionGraphFeature(graph));

    return graph.buildHistorySVG();
}

export async function getUserRatingImage(
    userName: string,
    isHeuristic: boolean,
    withPerformance = false,
    withSubmissions = false,
) {
    const graph = new BaseHistoryGraph({ userName, isHeuristic, includeHeader: true });

    if (withPerformance) graph.addFeature(new PerformanceGraphFeature(graph));
    if (withSubmissions) graph.addFeature(new SubmissionGraphFeature(graph));

    return graph.buildRatingSummarySVG();
}
