export async function register(){
 if(process.env.NEXT_RUNTIME==='nodejs'&&process.env.NEXT_PUBLIC_DATA_MODE==='firebase'){
  const { serverEnv }=await import('./lib/config/server-env')
  serverEnv()
 }
}
