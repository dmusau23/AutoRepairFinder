export const signIn = {
  email: async ({ email, password }: { email: string; password: string }) => {
    const response = await fetch('/api/auth/sign-in', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({email,password}) })
    return response.ok ? { data: await response.json(), error: null } : { data: null, error: await response.json().catch(()=>({error:'Unable to sign in'})) }
  }
}
export const signUp = {
  email: async ({ name, email, password, role='customer' }: { name:string; email:string; password:string; role?:'customer'|'shop' }) => {
    const response = await fetch('/api/auth/sign-up', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({name,email,password,role}) })
    return response.ok ? { data: await response.json(), error: null } : { data: null, error: await response.json().catch(()=>({error:'Unable to create account'})) }
  }
}
export async function signOut() {
  await fetch('/api/auth/sign-out', { method:'POST' })
}
