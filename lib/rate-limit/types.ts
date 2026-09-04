export interface RateLimitResult{allowed:boolean;remaining:number;retryAfterSeconds:number;resetAt:number}
export interface RateLimiter{consume(keyHash:string,limit:number,windowMs:number,now?:number):Promise<RateLimitResult>}
