
export type IResolverFunc = (root: any, args: any, context: any, info: any) => any|Promise<any>;

export interface IResolvers {
  [key: string]: {
    [key: string]: IResolverFunc
  }
}