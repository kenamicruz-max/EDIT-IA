// Optional Remotion bridge. The master edit spec is the integration contract.
export type EditSpec = { version:string; duration:number; segments:Array<Record<string,unknown>> };