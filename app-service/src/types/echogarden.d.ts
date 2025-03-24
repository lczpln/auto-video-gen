declare module "echogarden" {
  export function align(
    audioSource: string,
    text: string,
    options?: any
  ): Promise<any>;
  export function timelineToSubtitles(timeline: any, options?: any): string;
}
